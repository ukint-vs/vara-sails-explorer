import type { DecodeKind, DecodeProvenance, DecodeResult, IdlInspection } from "./types";

export type DecodeWorkerRequest =
  | {
      kind: "inspect-idl";
      jobId: number;
      idlHash: string;
      idlText: string;
      provenance: DecodeProvenance;
    }
  | {
      kind: "extract-idl";
      jobId: number;
      wasmBytes: Uint8Array;
      provenance: DecodeProvenance;
    }
  | {
      kind: "decode";
      jobId: number;
      idlHash: string;
      idlText: string;
      payloadHex: string;
      decodeKind: DecodeKind;
      provenance: DecodeProvenance;
    };

export type DecodeWorkerResponse =
  | {
      kind: "inspect-idl";
      jobId: number;
      ok: true;
      idlHash: string;
      inspection: IdlInspection;
      trace: DecodeResult["trace"];
    }
  | {
      kind: "extract-idl";
      jobId: number;
      ok: true;
      idlText: string;
      trace: DecodeResult["trace"];
    }
  | {
      kind: "decode";
      jobId: number;
      result: DecodeResult;
    }
  | {
      kind: "inspect-idl" | "extract-idl";
      jobId: number;
      ok: false;
      result: DecodeResult;
    };

export type DecodeWorkerLike = {
  postMessage(message: DecodeWorkerRequest, transfer?: Transferable[]): void;
  addEventListener(type: "message", listener: (event: MessageEvent<DecodeWorkerResponse>) => void): void;
  removeEventListener(type: "message", listener: (event: MessageEvent<DecodeWorkerResponse>) => void): void;
  terminate(): void;
};
