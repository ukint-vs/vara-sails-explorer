import { describe, expect, it } from "vitest";
import { decodeStatusRegistry, sailsReasonLabels } from "../lib/decode/status";

describe("decode status registry", () => {
  it("maps Sails, IDL, RPC, cache, timeout, and worker statuses", () => {
    expect(decodeStatusRegistry.decoded.category).toBe("success");
    expect(decodeStatusRegistry.sails_unknown.category).toBe("sails_unknown");
    expect(decodeStatusRegistry.invalid_idl.category).toBe("idl_failure");
    expect(decodeStatusRegistry.rpc_failure.category).toBe("rpc_failure");
    expect(decodeStatusRegistry.rpc_timeout.category).toBe("timeout");
    expect(decodeStatusRegistry.cache_failure.category).toBe("cache_failure");
    expect(decodeStatusRegistry.worker_failure.category).toBe("worker_failure");
    expect(decodeStatusRegistry.codec_mismatch.category).toBe("idl_failure");
    expect(decodeStatusRegistry.codec_mismatch.tone).toBe("warning");
  });

  it("covers current Sails JS unknown reasons", () => {
    expect(Object.keys(sailsReasonLabels).sort()).toEqual(
      [
        "ambiguous-route",
        "bad-hlen",
        "bad-reserved",
        "bad-version",
        "decode-failed",
        "entry-mismatch",
        "no-entry",
        "no-magic",
        "no-service",
        "no-throws-type",
        "too-short",
        "trailing-bytes"
      ].sort()
    );
  });
});
