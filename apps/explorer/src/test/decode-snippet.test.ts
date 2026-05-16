import { describe, expect, it } from "vitest";
import { buildDecodeReplaySnippet } from "../lib/decode/snippet";
import type { DecodeEntryView } from "../lib/decode/types";

const callEntry: DecodeEntryView = {
  kind: "command",
  service: "Counter",
  fn: "Add",
  interfaceId: "0x0000000000000001",
  entryId: 1,
  routeIdx: 1
};

const eventEntry: DecodeEntryView = {
  kind: "event",
  service: "Counter",
  event: "Added",
  interfaceId: "0x0000000000000001",
  entryId: 7,
  routeIdx: 1
};

const ctorEntry: DecodeEntryView = {
  kind: "ctor",
  ctor: "Init",
  interfaceId: "0x0000000000000000",
  entryId: 0,
  routeIdx: 0
};

describe("buildDecodeReplaySnippet", () => {
  it("renders a runnable replay snippet for a command entry", () => {
    const snippet = buildDecodeReplaySnippet({
      entry: callEntry,
      payloadHex: "0x12345678",
      idlHash: "0xabcdef0123456789"
    });
    expect(snippet).toContain('const payloadHex = "0x12345678";');
    expect(snippet).toContain("program.decodeCall(bytes)");
    expect(snippet).toContain("Expected entry: Counter.Add");
    expect(snippet).toContain("idlHash: 0xabcdef0123456789");
  });

  it("uses decodeEvent for event entries", () => {
    const snippet = buildDecodeReplaySnippet({ entry: eventEntry, payloadHex: "0xfeedface" });
    expect(snippet).toContain("program.decodeEvent(bytes)");
    expect(snippet).toContain("Counter.Added");
  });

  it("uses decodeCtor for constructor entries", () => {
    const snippet = buildDecodeReplaySnippet({ entry: ctorEntry, payloadHex: "0x00" });
    expect(snippet).toContain("program.decodeCtor(bytes)");
    expect(snippet).toContain("Expected entry: ctor Init");
  });

  it("omits the idlHash comment when none is supplied", () => {
    const snippet = buildDecodeReplaySnippet({ entry: callEntry, payloadHex: "0x01" });
    expect(snippet).not.toContain("idlHash:");
  });
});
