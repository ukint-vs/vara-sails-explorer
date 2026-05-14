import { describe, expect, it } from "vitest";
import { decodeStatusMeta, executionStatusMeta, labelForDecodeStatus, toneClass } from "../lib/status";

describe("status metadata", () => {
  it("covers the Milestone 0 decode taxonomy", () => {
    expect(Object.keys(decodeStatusMeta).sort()).toEqual(
      [
        "bad_header",
        "codec_mismatch",
        "decode_failure",
        "decoded",
        "missing_idl",
        "not_sails_payload",
        "trailing_bytes",
        "unknown_interface"
      ].sort()
    );
  });

  it("keeps status labels semantic instead of generic", () => {
    expect(labelForDecodeStatus("missing_idl")).toBe("Missing IDL");
    expect(executionStatusMeta.failed.tone).toBe("danger");
    expect(toneClass("brand")).toBe("chip brand");
  });
});
