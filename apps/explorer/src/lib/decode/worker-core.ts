import { SailsProgram } from "sails-js";
import { extractIdlFromWasm, InterfaceId, SailsIdlParser, SailsMessageHeader } from "sails-js/parser";
import type { DecodedUnknown, IIdlDoc, ResolvedEntry } from "sails-js/types";
import { bytesToHex, enforceIdlLimit, enforcePayloadLimit, enforceWasmLimit, hashIdl, parseHexBytes } from "./bytes";
import type { DecodeWorkerRequest, DecodeWorkerResponse } from "./worker-protocol";
import type {
  DecodeEntryView,
  DecodeFailureResult,
  DecodeKind,
  DecodeHeaderView,
  DecodeProvenance,
  DecodeResult,
  DecodeTraceStep,
  IdlInspection,
  SailsUnknownReason
} from "./types";

type ProgramCacheEntry = {
  program: SailsProgram;
  doc: IIdlDoc;
  inspection: IdlInspection;
};

type SailsDecoded =
  | { kind: "call"; entry: ResolvedEntry; args: Record<string, unknown> }
  | { kind: "reply"; entry: ResolvedEntry; result: unknown }
  | { kind: "error"; entry: ResolvedEntry; error: unknown }
  | { kind: "event"; entry: ResolvedEntry; data: unknown }
  | { kind: "ctor-call"; entry: ResolvedEntry; args: Record<string, unknown> }
  | DecodedUnknown;

let parserPromise: Promise<SailsIdlParser> | undefined;
const programCache = new Map<string, ProgramCacheEntry>();

export async function handleDecodeWorkerRequest(request: DecodeWorkerRequest): Promise<DecodeWorkerResponse> {
  if (request.kind === "inspect-idl") {
    const started = performance.now();
    const trace = [traceStep("Parse IDL", "Parser worker received IDL text.", "info")];
    try {
      const entry = await getProgram(request.idlHash, request.idlText);
      trace.push(traceStep("IDL parsed", `${entry.inspection.candidates.length} route entries indexed.`, "success", started));
      return {
        kind: "inspect-idl",
        jobId: request.jobId,
        ok: true,
        idlHash: request.idlHash,
        inspection: entry.inspection,
        trace
      };
    } catch (error) {
      return {
        kind: "inspect-idl",
        jobId: request.jobId,
        ok: false,
        result: failure("invalid_idl", "idl_failure", "IDL parser rejected the source.", error, request.provenance, trace)
      };
    }
  }

  if (request.kind === "extract-idl") {
    const started = performance.now();
    const trace = [traceStep("Read Wasm", `${request.wasmBytes.byteLength} bytes received for sails:idl extraction.`, "info")];
    try {
      enforceWasmLimit(request.wasmBytes);
      const idlText = await extractIdlFromWasm(request.wasmBytes);
      if (!idlText) {
        return {
          kind: "extract-idl",
          jobId: request.jobId,
          ok: false,
          result: failure(
            "no_embedded_idl",
            "idl_failure",
            "No sails:idl custom section was found.",
            undefined,
            request.provenance,
            trace
          )
        };
      }
      enforceIdlLimit(idlText);
      trace.push(traceStep("Extracted IDL", "Embedded sails:idl section decoded.", "success", started));
      return {
        kind: "extract-idl",
        jobId: request.jobId,
        ok: true,
        idlText,
        trace
      };
    } catch (error) {
      return {
        kind: "extract-idl",
        jobId: request.jobId,
        ok: false,
        result: failure("invalid_wasm", "idl_failure", "Wasm IDL extraction failed.", error, request.provenance, trace)
      };
    }
  }

  return decodePayload(request);
}

async function decodePayload(request: Extract<DecodeWorkerRequest, { kind: "decode" }>): Promise<DecodeWorkerResponse> {
  const started = performance.now();
  const trace = [traceStep("Decode requested", `${request.decodeKind} decode path selected.`, "info")];

  try {
    enforceIdlLimit(request.idlText);
    const payload = parseHexBytes(request.payloadHex);
    if (!payload.ok) {
      return {
        kind: "decode",
        jobId: request.jobId,
        result: failure("sails_unknown", "sails_unknown", payload.message, "too-short", request.provenance, trace)
      };
    }
    enforcePayloadLimit(payload.bytes);

    const entry = await getProgram(request.idlHash, request.idlText);
    trace.push(traceStep("IDL ready", `idlHash ${request.idlHash.slice(0, 14)}...`, "success"));

    const header = readHeader(payload.bytes);
    const decoded = runDecode(entry.program, payload.bytes, request.decodeKind);

    if (decoded.kind === "unknown") {
      const candidates = header?.header
        ? entry.program.resolveEntryCandidates(header.header.interfaceId).map(mapEntry)
        : undefined;
      return {
        kind: "decode",
        jobId: request.jobId,
        result: {
          ok: false,
          category: "sails_unknown",
          status: "sails_unknown",
          message: `Sails could not decode this payload: ${decoded.reason}.`,
          reason: decoded.reason as SailsUnknownReason,
          detail: decoded.detail,
          header: header?.view,
          candidates,
          provenance: request.provenance,
          trace: [
            ...trace,
            traceStep("Decode incomplete", decoded.detail ?? decoded.reason, "warning", started)
          ]
        }
      };
    }

    const result: DecodeResult = {
      ok: true,
      category: "success",
      status: "decoded",
      kind: decoded.kind,
      entry: mapEntry(decoded.entry),
      header: header?.view,
      value: decodedValue(decoded),
      candidates: header?.header ? entry.program.resolveEntryCandidates(header.header.interfaceId).map(mapEntry) : undefined,
      provenance: request.provenance,
      trace: [...trace, traceStep("Decoded", decoded.kind, "success", started)]
    };

    return {
      kind: "decode",
      jobId: request.jobId,
      result
    };
  } catch (error) {
    const status = String(error).includes("exceeds") ? "oversized_payload" : "worker_failure";
    return {
      kind: "decode",
      jobId: request.jobId,
      result: failure(status, status === "worker_failure" ? "worker_failure" : "idl_failure", "Decode worker failed.", error, request.provenance, trace)
    };
  }
}

async function getProgram(idlHash: string, idlText: string): Promise<ProgramCacheEntry> {
  const existing = programCache.get(idlHash);
  if (existing) {
    return existing;
  }

  enforceIdlLimit(idlText);
  const parser = await getParser();
  const doc = parser.parse(idlText);
  const program = new SailsProgram(doc);
  const inspection = buildInspection(doc, program);
  const entry = { program, doc, inspection };
  programCache.set(idlHash, entry);
  return entry;
}

async function getParser(): Promise<SailsIdlParser> {
  parserPromise ??= (async () => {
    const parser = new SailsIdlParser();
    await parser.init();
    return parser;
  })();

  return parserPromise;
}

function runDecode(program: SailsProgram, bytes: Uint8Array, kind: DecodeKind): SailsDecoded {
  if (kind === "auto") {
    let parsed: ReturnType<typeof SailsMessageHeader.tryReadBytes>;
    try {
      parsed = SailsMessageHeader.tryReadBytes(bytes);
    } catch {
      return program.decodeCall(bytes);
    }
    const header = parsed.header;
    if (header.interfaceId.asU64() === 0n) {
      return program.decodeCtor(bytes);
    }

    const resolved = program.resolveEntry(header);
    if (resolved.kind === "unknown") {
      return resolved;
    }
    if (resolved.kind === "event") {
      return program.decodeEvent(bytes);
    }
    return program.decodeCall(bytes, resolved);
  }

  if (kind === "call") return program.decodeCall(bytes);
  if (kind === "reply") return program.decodeReply(bytes);
  if (kind === "error") return program.decodeError(bytes);
  if (kind === "event") return program.decodeEvent(bytes);
  return program.decodeCtor(bytes);
}

function buildInspection(doc: IIdlDoc, program: SailsProgram): IdlInspection {
  const services =
    doc.services?.map((service) => ({
      name: service.name,
      interfaceId: interfaceIdToString(service.interface_id),
      routeIdx: doc.program?.services?.find((expo) => expo.name === service.name)?.route_idx,
      functions:
        service.funcs?.map((func) => ({
          name: func.name,
          entryId: func.entry_id ?? 0,
          kind: func.kind
        })) ?? [],
      events:
        service.events?.map((event) => ({
          name: event.name,
          entryId: event.entry_id ?? 0
        })) ?? []
    })) ?? [];

  const candidates = [];
  for (const service of doc.services ?? []) {
    if (!service.interface_id) continue;
    try {
      candidates.push(...program.resolveEntryCandidates(InterfaceId.from(service.interface_id)).map(mapEntry));
    } catch {
      // Inspection still succeeds if an experimental IDL carries an unusual interface ID shape.
    }
  }

  return {
    services,
    constructors:
      doc.program?.ctors?.map((ctor) => ({
        name: ctor.name,
        entryId: ctor.entry_id ?? 0
      })) ?? [],
    candidates
  };
}

function readHeader(bytes: Uint8Array): { header: SailsMessageHeader; view: DecodeHeaderView } | undefined {
  try {
    const { header } = SailsMessageHeader.tryReadBytes(bytes);
    return {
      header,
      view: {
        version: header.version,
        hlen: header.hlen,
        interfaceId: header.interfaceId.toString(),
        entryId: header.entryId,
        routeIdx: header.routeIdx,
        bytes: bytesToHex(bytes.slice(0, header.hlen))
      }
    };
  } catch {
    return undefined;
  }
}

function mapEntry(entry: ResolvedEntry): DecodeEntryView {
  return {
    kind: entry.kind,
    service: "service" in entry ? entry.service : undefined,
    fn: "fn" in entry ? entry.fn : undefined,
    event: "event" in entry ? entry.event : undefined,
    ctor: "ctor" in entry ? entry.ctor : undefined,
    route: "route" in entry ? entry.route : undefined,
    interfaceId: interfaceIdToString(entry.interfaceId),
    entryId: entry.entryId,
    routeIdx: entry.routeIdx
  };
}

function interfaceIdToString(value: unknown): string {
  if (!value) return "0x0000000000000000";
  if (typeof value === "string") return value;
  if (value instanceof Uint8Array) return bytesToHex(value);
  if (typeof value === "object" && "bytes" in value && value.bytes instanceof Uint8Array) {
    return bytesToHex(value.bytes);
  }
  if (typeof value === "object" && "toString" in value && typeof value.toString === "function") {
    const str = value.toString();
    if (str !== "[object Object]") return str;
  }
  return String(value);
}

function decodedValue(decoded: Exclude<SailsDecoded, DecodedUnknown>): unknown {
  if (decoded.kind === "call" || decoded.kind === "ctor-call") return sanitize(decoded.args);
  if (decoded.kind === "reply") return sanitize(decoded.result);
  if (decoded.kind === "error") return sanitize(decoded.error);
  return sanitize(decoded.data);
}

function sanitize(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Uint8Array) return bytesToHex(value);
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitize(item)]));
  }
  return value;
}

function failure(
  status: DecodeFailureResult["status"],
  category: DecodeFailureResult["category"],
  message: string,
  error: unknown,
  provenance: DecodeProvenance | undefined,
  trace: DecodeTraceStep[]
): DecodeFailureResult {
  return {
    ok: false,
    category,
    status,
    message,
    detail: error instanceof Error ? error.message : typeof error === "string" ? error : undefined,
    provenance,
    trace: [...trace, traceStep("Failed", error instanceof Error ? error.message : message, "error")]
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

export async function computeIdlHashForWorker(text: string): Promise<string> {
  return hashIdl(text);
}

export const __test__ = { sanitize, interfaceIdToString };
