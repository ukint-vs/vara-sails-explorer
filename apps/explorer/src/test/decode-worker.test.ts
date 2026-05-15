import { describe, expect, it } from "vitest";
import { hashIdl } from "../lib/decode/bytes";
import { SAMPLE_IDL, SAMPLE_PAYLOAD_HEX } from "../lib/decode/sample";
import type { DecodeProvenance } from "../lib/decode/types";
import { handleDecodeWorkerRequest } from "../lib/decode/worker-core";

const provenance = async (): Promise<DecodeProvenance> => ({
  source: "pasted_idl",
  trust: "user_supplied",
  label: "Test IDL",
  idlHash: await hashIdl(SAMPLE_IDL),
  updatedAt: Date.now()
});

describe("decode worker core", () => {
  it("inspects an IDL and decodes a valid Sails call payload", async () => {
    const idlHash = await hashIdl(SAMPLE_IDL);
    const source = await provenance();

    const inspect = await handleDecodeWorkerRequest({
      kind: "inspect-idl",
      jobId: 1,
      idlHash,
      idlText: SAMPLE_IDL,
      provenance: source
    });
    expect(inspect).toMatchObject({
      kind: "inspect-idl",
      ok: true,
      inspection: {
        services: [{ name: "Counter" }]
      }
    });

    const decode = await handleDecodeWorkerRequest({
      kind: "decode",
      jobId: 2,
      idlHash,
      idlText: SAMPLE_IDL,
      payloadHex: SAMPLE_PAYLOAD_HEX,
      decodeKind: "auto",
      provenance: source
    });

    expect(decode).toMatchObject({
      kind: "decode",
      result: {
        ok: true,
        status: "decoded",
        kind: "call",
        entry: { service: "Counter", fn: "Add", entryId: 1, routeIdx: 1 },
        value: { value: 7 }
      }
    });
  });

  it("normalizes malformed payloads to Sails unknown results", async () => {
    const idlHash = await hashIdl(SAMPLE_IDL);
    const source = await provenance();
    const result = await handleDecodeWorkerRequest({
      kind: "decode",
      jobId: 3,
      idlHash,
      idlText: SAMPLE_IDL,
      payloadHex: "0x000102",
      decodeKind: "auto",
      provenance: source
    });

    expect(result).toMatchObject({
      kind: "decode",
      result: {
        ok: false,
        category: "sails_unknown",
        status: "sails_unknown"
      }
    });
  });

  it("rejects invalid IDL through the worker result union", async () => {
    const source = await provenance();
    const result = await handleDecodeWorkerRequest({
      kind: "inspect-idl",
      jobId: 4,
      idlHash: "0xdead",
      idlText: "not idl",
      provenance: source
    });

    expect(result).toMatchObject({
      ok: false,
      result: {
        ok: false,
        status: "invalid_idl",
        category: "idl_failure"
      }
    });
  });
});
