import { describe, expect, it, vi } from "vitest";
import { DecodeWorkerSession } from "../lib/decode/worker-session";
import type { DecodeWorkerLike, DecodeWorkerRequest, DecodeWorkerResponse } from "../lib/decode/worker-protocol";

describe("decode worker session", () => {
  it("matches responses by job ID", async () => {
    const worker = new FakeWorker((request) => ({
      kind: "decode",
      jobId: request.jobId,
      result: {
        ok: false,
        category: "sails_unknown",
        status: "sails_unknown",
        message: "fake",
        trace: []
      }
    }));
    const session = new DecodeWorkerSession(() => worker);

    const response = await session.decode({
      kind: "decode",
      idlHash: "0x1",
      idlText: "idl",
      payloadHex: "0x00",
      decodeKind: "auto",
      provenance: {
        source: "pasted_idl",
        trust: "user_supplied",
        label: "fake",
        updatedAt: Date.now()
      }
    });

    expect(response).toMatchObject({ kind: "decode", result: { status: "sails_unknown" } });
    session.terminate();
    expect(worker.terminated).toBe(true);
  });

  it("normalizes worker timeout and terminates stale workers", async () => {
    vi.useFakeTimers();
    const worker = new FakeWorker(undefined);
    const session = new DecodeWorkerSession(() => worker);
    const pending = session.inspectIdl({
      kind: "inspect-idl",
      idlHash: "0x1",
      idlText: "idl",
      provenance: {
        source: "pasted_idl",
        trust: "user_supplied",
        label: "fake",
        updatedAt: Date.now()
      }
    });

    await vi.advanceTimersByTimeAsync(10_000);
    await expect(pending).resolves.toMatchObject({
      ok: false,
      result: { status: "worker_timeout" }
    });
    expect(worker.terminated).toBe(true);
    vi.useRealTimers();
  });
});

class FakeWorker implements DecodeWorkerLike {
  private listener: ((event: MessageEvent<DecodeWorkerResponse>) => void) | undefined;
  terminated = false;

  constructor(private readonly respond?: (request: DecodeWorkerRequest) => DecodeWorkerResponse) {}

  postMessage(message: DecodeWorkerRequest): void {
    if (!this.respond) {
      return;
    }
    queueMicrotask(() => {
      this.listener?.({ data: this.respond!(message) } as MessageEvent<DecodeWorkerResponse>);
    });
  }

  addEventListener(_type: "message", listener: (event: MessageEvent<DecodeWorkerResponse>) => void): void {
    this.listener = listener;
  }

  removeEventListener(): void {
    this.listener = undefined;
  }

  terminate(): void {
    this.terminated = true;
  }
}
