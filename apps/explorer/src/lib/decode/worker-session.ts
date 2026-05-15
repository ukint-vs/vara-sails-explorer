import { DECODE_TIMEOUTS } from "./constants";
import type { DecodeFailureResult, DecodeTraceStep } from "./types";
import type { DecodeWorkerLike, DecodeWorkerRequest, DecodeWorkerResponse } from "./worker-protocol";

type PendingJob = {
  resolve: (response: DecodeWorkerResponse) => void;
  timer: ReturnType<typeof setTimeout>;
};

export class DecodeWorkerSession {
  private worker: DecodeWorkerLike | undefined;
  private nextJobId = 1;
  private pending = new Map<number, PendingJob>();
  private idleTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly workerFactory: () => DecodeWorkerLike = defaultWorkerFactory) {}

  inspectIdl(request: Omit<Extract<DecodeWorkerRequest, { kind: "inspect-idl" }>, "jobId">): Promise<DecodeWorkerResponse> {
    return this.run({ ...request, jobId: this.nextJobId++ }, DECODE_TIMEOUTS.decodeMs);
  }

  extractIdl(request: Omit<Extract<DecodeWorkerRequest, { kind: "extract-idl" }>, "jobId">): Promise<DecodeWorkerResponse> {
    return this.run({ ...request, jobId: this.nextJobId++ }, DECODE_TIMEOUTS.extractMs, [request.wasmBytes.buffer]);
  }

  decode(request: Omit<Extract<DecodeWorkerRequest, { kind: "decode" }>, "jobId">): Promise<DecodeWorkerResponse> {
    return this.run({ ...request, jobId: this.nextJobId++ }, DECODE_TIMEOUTS.decodeMs);
  }

  terminate(): void {
    for (const [jobId, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.resolve(timeoutResponse(jobId, "decode"));
    }
    this.pending.clear();
    this.worker?.terminate();
    this.worker = undefined;
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = undefined;
    }
  }

  private run(request: DecodeWorkerRequest, timeoutMs: number, transfer?: Transferable[]): Promise<DecodeWorkerResponse> {
    const worker = this.ensureWorker();
    this.bumpIdleTimer();

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(request.jobId);
        this.worker?.terminate();
        this.worker = undefined;
        resolve(timeoutResponse(request.jobId, request.kind));
      }, timeoutMs);
      this.pending.set(request.jobId, { resolve, timer });
      worker.postMessage(request, transfer);
    });
  }

  private ensureWorker(): DecodeWorkerLike {
    if (this.worker) {
      return this.worker;
    }

    const worker = this.workerFactory();
    worker.addEventListener("message", (event) => {
      const response = event.data;
      const pending = this.pending.get(response.jobId);
      if (!pending) {
        return;
      }
      clearTimeout(pending.timer);
      this.pending.delete(response.jobId);
      pending.resolve(response);
      this.bumpIdleTimer();
    });
    this.worker = worker;
    return worker;
  }

  private bumpIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    this.idleTimer = setTimeout(() => {
      if (this.pending.size === 0) {
        this.worker?.terminate();
        this.worker = undefined;
      }
    }, DECODE_TIMEOUTS.workerIdleMs);
  }
}

function defaultWorkerFactory(): DecodeWorkerLike {
  return new Worker(new URL("./decode.worker.ts", import.meta.url), { type: "module" });
}

function timeoutResponse(jobId: number, kind: DecodeWorkerRequest["kind"]): DecodeWorkerResponse {
  const trace: DecodeTraceStep[] = [
    {
      at: Date.now(),
      label: "Worker timeout",
      detail: "Decode worker did not respond before the timeout.",
      status: "error"
    }
  ];
  const result: DecodeFailureResult = {
    ok: false,
    category: "timeout",
    status: "worker_timeout",
    message: "Decode worker timed out.",
    trace
  };

  if (kind === "decode") {
    return { kind, jobId, result };
  }

  return { kind, jobId, ok: false, result };
}
