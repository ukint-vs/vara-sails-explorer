import { describe, expect, it } from "vitest";
import { hashIdl } from "../lib/decode/bytes";
import { SAMPLE_IDL, SAMPLE_PAYLOAD_HEX } from "../lib/decode/sample";
import type { DecodeProvenance } from "../lib/decode/types";
import { __test__, handleDecodeWorkerRequest } from "../lib/decode/worker-core";

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

  describe("sanitize", () => {
    const { sanitize } = __test__;

    it("converts Uint8Array to hex instead of indexed-byte object", () => {
      const bytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
      expect(sanitize(bytes)).toBe("0xdeadbeef");
    });

    it("converts nested Uint8Array fields inside decoded args", () => {
      const value = {
        actorId: new Uint8Array([0x01, 0x23, 0x45, 0x67]),
        amount: 42n,
        nested: { hash: new Uint8Array([0xaa, 0xbb]) }
      };
      expect(sanitize(value)).toEqual({
        actorId: "0x01234567",
        amount: "42",
        nested: { hash: "0xaabb" }
      });
    });

    it("stringifies bigints, leaves primitives, recurses into arrays", () => {
      expect(sanitize({ items: [1n, "x", { id: new Uint8Array([0xff]) }] })).toEqual({
        items: ["1", "x", { id: "0xff" }]
      });
    });
  });

  describe("interfaceIdToString", () => {
    const { interfaceIdToString } = __test__;

    it("renders raw Uint8Array interface IDs as hex, not comma-joined bytes", () => {
      const id = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0]);
      expect(interfaceIdToString(id)).toBe("0x123456789abcdef0");
    });

    it("renders { bytes } shape as hex", () => {
      expect(interfaceIdToString({ bytes: new Uint8Array([0xab, 0xcd]) })).toBe("0xabcd");
    });

    it("returns string values unchanged", () => {
      expect(interfaceIdToString("0xabcd")).toBe("0xabcd");
    });

    it("falls back to default for nullish values", () => {
      expect(interfaceIdToString(undefined)).toBe("0x0000000000000000");
      expect(interfaceIdToString(null)).toBe("0x0000000000000000");
    });

    it("uses custom toString when available", () => {
      const id = { toString: () => "0xfeedface" };
      expect(interfaceIdToString(id)).toBe("0xfeedface");
    });
  });
});
