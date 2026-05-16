import { handleDecodeWorkerRequest } from "./worker-core";
import type { DecodeWorkerRequest, DecodeWorkerResponse } from "./worker-protocol";

installMinimalBufferShim();

self.addEventListener("message", (event: MessageEvent<DecodeWorkerRequest>) => {
  void handleDecodeWorkerRequest(event.data)
    .then((response) => {
      self.postMessage(response);
    })
    .catch((error) => {
      const response: DecodeWorkerResponse = {
        kind: event.data.kind === "decode" ? "decode" : event.data.kind,
        jobId: event.data.jobId,
        result: {
          ok: false,
          category: "worker_failure",
          status: "worker_failure",
          message: "Decode worker failed before it could normalize the result.",
          detail: error instanceof Error ? error.message : String(error),
          trace: [
            {
              at: Date.now(),
              label: "Worker failure",
              detail: error instanceof Error ? error.message : String(error),
              status: "error"
            }
          ]
        }
      } as DecodeWorkerResponse;
      self.postMessage(response);
    });
});

function installMinimalBufferShim(): void {
  const target = globalThis as unknown as {
    Buffer?: { from(value: string, encoding?: string): Uint8Array };
  };

  target.Buffer ??= {
    from(value: string, encoding?: string): Uint8Array {
      if (encoding && encoding !== "base64") {
        throw new Error(`Unsupported Buffer.from encoding in decode worker: ${encoding}`);
      }

      const binary = atob(value);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      return bytes;
    }
  };
}
