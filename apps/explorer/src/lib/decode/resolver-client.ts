import { DECODE_LIMITS, DECODE_TIMEOUTS } from "./constants";
import { isHexId, parseHexBytes } from "./bytes";
import type { RpcEndpoint } from "../live-explorer/types";
import type { ChainResolveRequest, ChainResolveResult, DecodeTraceStep } from "./types";

type GearApiInstance = {
  program: {
    exists: (id: string) => Promise<boolean>;
    codeId: (id: string) => Promise<string>;
  };
  code: {
    exists: (id: string) => Promise<boolean>;
  };
  query?: {
    gearProgram?: {
      originalCodeStorage?: (codeId: string) => Promise<unknown>;
    };
  };
  disconnect?: () => Promise<void> | void;
};

type GearApiModule = {
  GearApi: { create: (options: { providerAddress: string }) => Promise<GearApiInstance> };
  VaraApiV1010?: { create: (options: { providerAddress: string }) => Promise<GearApiInstance> };
};

export type GearApiFactory = (endpoint: RpcEndpoint) => Promise<GearApiInstance>;

export class DecodeResolverClient {
  private api: GearApiInstance | undefined;
  private endpointKey: string | undefined;

  constructor(private readonly apiFactory: GearApiFactory = defaultApiFactory) {}

  async resolve(request: ChainResolveRequest): Promise<ChainResolveResult> {
    const started = performance.now();
    const trace = [
      traceStep(
        "RPC resolve",
        `${request.source === "program_id" ? "Program" : "Code"} ${request.id} on ${request.endpoint.label}.`,
        "info"
      )
    ];

    if (!isHexId(request.id)) {
      return {
        ok: false,
        category: "rpc_failure",
        status: request.source === "program_id" ? "program_not_found" : "code_not_found",
        message: "Expected a 32-byte hex ID.",
        trace
      };
    }

    try {
      const result = await withTimeout(
        this.resolveInner(request, trace, started),
        request.timeoutMs ?? DECODE_TIMEOUTS.rpcMs,
        request.source === "program_id" ? "program_not_found" : "code_not_found"
      );
      return result;
    } catch (error) {
      if (error instanceof TimeoutError) {
        await this.close();
        return {
          ok: false,
          category: "timeout",
          status: "rpc_timeout",
          message: "Program/code ID resolution timed out.",
          detail: error.message,
          trace: [...trace, traceStep("RPC timeout", error.message, "error", started)]
        };
      }

      return {
        ok: false,
        category: "rpc_failure",
        status: "rpc_failure",
        message: "Program/code ID resolution failed.",
        detail: error instanceof Error ? error.message : String(error),
        trace: [...trace, traceStep("RPC failure", error instanceof Error ? error.message : String(error), "error", started)]
      };
    }
  }

  async close(): Promise<void> {
    await this.api?.disconnect?.();
    this.api = undefined;
    this.endpointKey = undefined;
  }

  private async resolveInner(
    request: ChainResolveRequest,
    trace: DecodeTraceStep[],
    started: number
  ): Promise<ChainResolveResult> {
    const api = await this.getApi(request.endpoint);

    let codeId = request.id;
    const programId = request.source === "program_id" ? request.id : undefined;

    if (request.source === "program_id") {
      const exists = await api.program.exists(request.id);
      if (!exists) {
        return failure("program_not_found", "Program ID does not exist on the selected endpoint.", trace, started);
      }
      codeId = await api.program.codeId(request.id);
      trace.push(traceStep("Program resolved", `codeId ${codeId}`, "success", started));
    } else {
      const exists = await api.code.exists(request.id);
      if (!exists) {
        return failure("code_not_found", "Code ID does not exist on the selected endpoint.", trace, started);
      }
      trace.push(traceStep("Code found", codeId, "success", started));
    }

    const originalCode = await api.query?.gearProgram?.originalCodeStorage?.(codeId);
    const codeBytes = unwrapCodeBytes(originalCode);
    if (!codeBytes) {
      return failure("original_code_missing", "Original code bytes were not available.", trace, started);
    }
    if (codeBytes.byteLength > DECODE_LIMITS.codeBytes) {
      return failure("oversized_code", `Original code is ${codeBytes.byteLength} bytes.`, trace, started, "idl_failure");
    }

    trace.push(traceStep("Original code loaded", `${codeBytes.byteLength} bytes.`, "success", started));
    return {
      ok: true,
      source: request.source,
      programId,
      codeId,
      endpoint: request.endpoint,
      codeBytes,
      byteLength: codeBytes.byteLength,
      trace
    };
  }

  private async getApi(endpoint: RpcEndpoint): Promise<GearApiInstance> {
    const key = `${endpoint.id}:${endpoint.url}`;
    if (this.api && this.endpointKey === key) {
      return this.api;
    }

    await this.close();
    this.api = await this.apiFactory(endpoint);
    this.endpointKey = key;
    return this.api;
  }
}

async function defaultApiFactory(endpoint: RpcEndpoint): Promise<GearApiInstance> {
  const module = (await import("@gear-js/api")) as unknown as GearApiModule;
  const ApiClass = endpoint.kind === "vara" ? module.VaraApiV1010 ?? module.GearApi : module.GearApi;
  return ApiClass.create({ providerAddress: endpoint.url });
}

function unwrapCodeBytes(value: unknown): Uint8Array | undefined {
  if (!value) {
    return undefined;
  }

  if (typeof value === "object" && "isNone" in value && value.isNone === true) {
    return undefined;
  }

  const unwrapped =
    typeof value === "object" && "unwrap" in value && typeof value.unwrap === "function" ? value.unwrap() : value;

  if (unwrapped instanceof Uint8Array) {
    return unwrapped;
  }
  if (typeof unwrapped === "object" && unwrapped && "toU8a" in unwrapped && typeof unwrapped.toU8a === "function") {
    return new Uint8Array(unwrapped.toU8a(true));
  }
  if (typeof unwrapped === "object" && unwrapped && "toHex" in unwrapped && typeof unwrapped.toHex === "function") {
    const parsed = parseHexBytes(unwrapped.toHex());
    return parsed.ok ? parsed.bytes : undefined;
  }

  return undefined;
}

function failure(
  status: Exclude<ChainResolveResult, { ok: true }>["status"],
  message: string,
  trace: DecodeTraceStep[],
  started: number,
  category: Exclude<ChainResolveResult, { ok: true }>["category"] = "rpc_failure"
): ChainResolveResult {
  return {
    ok: false,
    category,
    status,
    message,
    trace: [...trace, traceStep("Resolve failed", message, status === "oversized_code" ? "warning" : "error", started)]
  };
}

function traceStep(
  label: string,
  detail: string,
  status: DecodeTraceStep["status"],
  startedAt?: number
): DecodeTraceStep {
  return {
    at: Date.now(),
    label,
    detail,
    status,
    durationMs: typeof startedAt === "number" ? Math.round(performance.now() - startedAt) : undefined
  };
}

class TimeoutError extends Error {}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, notFoundStatus: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new TimeoutError(`${notFoundStatus} did not complete within ${timeoutMs}ms.`));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}
