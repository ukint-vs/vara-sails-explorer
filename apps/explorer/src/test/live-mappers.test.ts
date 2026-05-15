import { describe, expect, it } from "vitest";
import {
  blockNumberValue,
  compactHash,
  countFailedExtrinsics,
  extractObservedObjects,
  formatAge,
  formatBlockNumber,
  formatBlockNumberPlain,
  formatEventPhase,
  mapBlockSummary,
  mapRpcEvent,
  mapRpcExtrinsic,
  mergeBlocks,
  normalizeTimestampMs,
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

  it("normalizes timestamp codec values before formatting age/time", () => {
    expect(normalizeTimestampMs("1,778,850,690,000")).toBe(1778850690000);
    expect(normalizeTimestampMs({ toHuman: () => "1,778,850,690,000" })).toBe(1778850690000);
    expect(normalizeTimestampMs({ value: 1_778_850_690_000, toNumber(this: { value: number }) { return this.value; } })).toBe(1778850690000);
    expect(normalizeTimestampMs(1778850690)).toBe(1778850690000);
    expect(mapBlockSummary({ number: 1, hash: "0x1", timestampMs: { toHuman: () => "1,778,850,690,000" }, extrinsics: 1, events: 1 }).age).not.toBe("unknown");
  });

  it("formats RPC event phases and keeps summaries concise", () => {
    const event = mapRpcEvent(
      {
        phase: { toHuman: () => ({ ApplyExtrinsic: "2" }) },
        event: {
          section: "gear",
          method: "MessageQueued",
          data: { toHuman: () => ({ messageId: "0x1234567890abcdef" }) }
        },
        toHuman: () => ({ event: { data: { messageId: "0x1234567890abcdef" } } })
      },
      0
    );

    expect(formatEventPhase({ toHuman: () => ({ ApplyExtrinsic: "2" }) })).toBe("ApplyExtrinsic(2)");
    expect(event.phase).toBe("ApplyExtrinsic(2)");
    expect(event.summary).toBe("gear.MessageQueued");
  });

  it("extracts only explicit observed objects from event and extrinsic data", () => {
    const events = [
      {
        id: "0-gear.MessageQueued",
        index: 0,
        phase: "ApplyExtrinsic(1)",
        section: "gear",
        method: "MessageQueued",
        summary: "gear.MessageQueued",
        raw: { event: { data: { messageId: "0x1234567890abcdef", programId: "0xabcdef1234567890" } } }
      },
      {
        id: "1-system.ExtrinsicSuccess",
        index: 1,
        phase: "ApplyExtrinsic(1)",
        section: "system",
        method: "ExtrinsicSuccess",
        summary: "system.ExtrinsicSuccess",
        raw: { event: { data: { id: "0xnotaclassifiedid" } } }
      }
    ];

    const objects = extractObservedObjects(events, [], 42);
    expect(objects.map((object) => `${object.kind}:${object.id}`)).toEqual([
      "program:0xabcdef1234567890",
      "message:0x1234567890abcdef",
      "event:gear.MessageQueued"
    ]);
  });

  it("matches extrinsic result events by exact phase index", () => {
    const events = [
      {
        id: "10-system.ExtrinsicFailed",
        index: 10,
        phase: "ApplyExtrinsic(10)",
        section: "system",
        method: "ExtrinsicFailed",
        summary: "system.ExtrinsicFailed",
        raw: {}
      },
      {
        id: "1-system.ExtrinsicSuccess",
        index: 1,
        phase: "ApplyExtrinsic(1)",
        section: "system",
        method: "ExtrinsicSuccess",
        summary: "system.ExtrinsicSuccess",
        raw: {}
      }
    ];

    const extrinsic = mapRpcExtrinsic(
      {
        hash: { toString: () => "0xextrinsic" },
        method: { section: "gear", method: "sendMessage" },
        isSigned: false
      },
      1,
      events
    );

    expect(extrinsic.success).toBe(true);
    expect(countFailedExtrinsics(events)).toBe(1);
  });

  it("calls RPC codec string methods with their object receiver", () => {
    const hash = { value: "0xboundhash", toString(this: { value: string }) { return this.value; } } as unknown as {
      toString: () => string;
    };
    const signer = { value: "0xsigner", toString(this: { value: string }) { return this.value; } } as unknown as {
      toString: () => string;
    };
    const extrinsic = mapRpcExtrinsic(
      {
        hash,
        method: { section: "gear", method: "sendMessage" },
        signer,
        isSigned: true
      },
      0,
      []
    );

    expect(extrinsic.hash).toBe("0xboundhash");
    expect(extrinsic.signer).toBe("0xsigner");
  });

  it("merges blocks by number and sorts newest first", () => {
    const older = mapBlockSummary({ number: 1, hash: "0x1", timestampMs: 1, extrinsics: 1, events: 1 });
    const newer = mapBlockSummary({ number: 2, hash: "0x2", timestampMs: 2, extrinsics: 1, events: 1 });

    expect(mergeBlocks([older], [newer], 2).map((block) => block.number)).toEqual(["#2", "#1"]);
  });

  it("keeps number/hash helpers stable for UI links", () => {
    expect(formatBlockNumber(18427057)).toBe("#18,427,057");
    expect(formatBlockNumberPlain("#18,427,057")).toBe("18427057");
    expect(blockNumberValue("#18,427,057")).toBe(18427057);
    expect(compactHash("0x1234567890abcdef")).toBe("0x123456...cdef");
    expect(formatAge(Date.now(), Date.now())).toBe("0s ago");
  });
});
