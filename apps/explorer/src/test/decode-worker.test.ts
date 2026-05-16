import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

  it("surfaces DecodedUnknown.consumedLen on trailing-bytes failures", async () => {
    const idlHash = await hashIdl(SAMPLE_IDL);
    const source = await provenance();
    const result = await handleDecodeWorkerRequest({
      kind: "decode",
      jobId: 30,
      idlHash,
      idlText: SAMPLE_IDL,
      payloadHex: `${SAMPLE_PAYLOAD_HEX}deadbeef`,
      decodeKind: "auto",
      provenance: source
    });
    if (result.kind !== "decode" || result.result.ok) {
      throw new Error("expected a decode failure result");
    }
    expect(result.result.reason).toBe("trailing-bytes");
    expect(typeof result.result.consumedLen).toBe("number");
    expect(result.result.consumedLen).toBeGreaterThan(0);
  });

  it("rejects payload when expectedEntry disagrees with the resolved entry", async () => {
    const idlHash = await hashIdl(SAMPLE_IDL);
    const source = await provenance();
    const result = await handleDecodeWorkerRequest({
      kind: "decode",
      jobId: 31,
      idlHash,
      idlText: SAMPLE_IDL,
      payloadHex: SAMPLE_PAYLOAD_HEX,
      decodeKind: "auto",
      expectedEntry: { service: "Counter", fn: "Get" },
      provenance: source
    });
    expect(result).toMatchObject({
      kind: "decode",
      result: {
        ok: false,
        category: "sails_unknown",
        status: "sails_unknown",
        reason: "entry-mismatch"
      }
    });
    if (result.kind === "decode" && !result.result.ok) {
      expect(result.result.detail).toContain("Counter.Get");
      expect(result.result.detail).toContain("Counter.Add");
    }
  });

  it("accepts the decode when expectedEntry matches the resolved entry", async () => {
    const idlHash = await hashIdl(SAMPLE_IDL);
    const source = await provenance();
    const result = await handleDecodeWorkerRequest({
      kind: "decode",
      jobId: 32,
      idlHash,
      idlText: SAMPLE_IDL,
      payloadHex: SAMPLE_PAYLOAD_HEX,
      decodeKind: "auto",
      expectedEntry: { service: "Counter", fn: "Add" },
      provenance: source
    });
    expect(result).toMatchObject({
      kind: "decode",
      result: {
        ok: true,
        status: "decoded",
        entry: { service: "Counter", fn: "Add" }
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

  describe("withParserInitTimeout", () => {
    const { withParserInitTimeout } = __test__;

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("rejects with a 5000ms detail when parser.init() never resolves", async () => {
      const pending = new Promise<void>(() => {
        // Never resolves — simulates a hung wasm fetch on a flaky proxy.
      });
      const wrapped = withParserInitTimeout(pending, 5000);
      const assertion = expect(wrapped).rejects.toThrow(/5000ms/);
      await vi.advanceTimersByTimeAsync(5000);
      await assertion;
    });

    it("resolves with the inner value when parser.init() succeeds before the timeout", async () => {
      const wrapped = withParserInitTimeout(Promise.resolve("ok" as const), 5000);
      await expect(wrapped).resolves.toBe("ok");
    });
  });

  describe("resolvedEntryCodec", () => {
    const { resolvedEntryCodec } = __test__;

    it("surfaces a hypothetical ethabi codec field for spec 8.1.5 routing", () => {
      // sails-js@0.5.1 ResolvedEntry has no codec field. This mock proves the
      // guard in decodePayload will fire once upstream surfaces entry.codec.
      const entry = { kind: "command", codec: "ethabi" } as unknown as Parameters<typeof resolvedEntryCodec>[0];
      expect(resolvedEntryCodec(entry)).toBe("ethabi");
    });

    it("returns undefined for current sails-js entries without a codec field", () => {
      const entry = { kind: "command" } as unknown as Parameters<typeof resolvedEntryCodec>[0];
      expect(resolvedEntryCodec(entry)).toBeUndefined();
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
