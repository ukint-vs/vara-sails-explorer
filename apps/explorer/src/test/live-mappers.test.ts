import { describe, expect, it } from "vitest";
import {
  blockNumberValue,
  compactHash,
  formatAge,
  formatBlockNumber,
  mapBlockSummary,
  mergeBlocks,
  parseBlockIdentifier
} from "../lib/live-explorer/mappers";

describe("live explorer mappers", () => {
  it("normalizes block identifiers", () => {
    expect(parseBlockIdentifier("#18,427,057")).toBe(18427057);
    expect(parseBlockIdentifier("0xabc")).toBe("0xabc");
  });

  it("formats block summaries as serializable explorer DTOs", () => {
    expect(
      mapBlockSummary({
        number: 18427057,
        hash: "0x1234567890abcdef",
        timestampMs: Date.now(),
        author: "0xauthor123456",
        finality: "finalized",
        extrinsics: 3,
        events: 8,
        gearMessages: 2,
        failures: 1
      })
    ).toMatchObject({
      number: "#18,427,057",
      hash: "0x123456...cdef",
      author: "0xauthor123456",
      finality: "finalized",
      extrinsics: 3,
      events: 8,
      gearMessages: 2,
      decodedSails: 0,
      failures: 1
    });
  });

  it("merges blocks by number and sorts newest first", () => {
    const older = mapBlockSummary({ number: 1, hash: "0x1", timestampMs: 1, extrinsics: 1, events: 1 });
    const newer = mapBlockSummary({ number: 2, hash: "0x2", timestampMs: 2, extrinsics: 1, events: 1 });

    expect(mergeBlocks([older], [newer], 2).map((block) => block.number)).toEqual(["#2", "#1"]);
  });

  it("keeps number/hash helpers stable for UI links", () => {
    expect(formatBlockNumber(18427057)).toBe("#18,427,057");
    expect(blockNumberValue("#18,427,057")).toBe(18427057);
    expect(compactHash("0x1234567890abcdef")).toBe("0x123456...cdef");
    expect(formatAge(Date.now(), Date.now())).toBe("0s ago");
  });
});
