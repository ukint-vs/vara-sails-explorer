import type { DecodeEntryView } from "./types";

export type DecodeReplaySnippetInput = {
  entry: DecodeEntryView;
  payloadHex: string;
  idlHash?: string;
};

export function buildDecodeReplaySnippet({ entry, payloadHex, idlHash }: DecodeReplaySnippetInput): string {
  const label = formatEntryLabel(entry);
  const idlComment = idlHash ? ` // idlHash: ${idlHash}` : "";
  return [
    "// Replay this Sails decode against your own IDL.",
    "// Requires sails-js ^0.5.1 and the matching IDL text.",
    "",
    "import { SailsIdlParser, SailsProgram } from \"sails-js/parser\";",
    "",
    "async function replayDecode() {",
    `  const idlText = \`...paste your IDL here...\`;${idlComment}`,
    "  const parser = new SailsIdlParser();",
    "  await parser.init();",
    "  const doc = parser.parse(idlText);",
    "  const program = new SailsProgram(doc);",
    "",
    `  const payloadHex = "${payloadHex}";`,
    "  const bytes = hexToBytes(payloadHex);",
    `  const decoded = program.decode${decodeMethod(entry)}(bytes);`,
    `  // Expected entry: ${label}`,
    "  console.log(decoded);",
    "}",
    "",
    "function hexToBytes(hex: string): Uint8Array {",
    "  const clean = hex.startsWith(\"0x\") ? hex.slice(2) : hex;",
    "  const out = new Uint8Array(clean.length / 2);",
    "  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);",
    "  return out;",
    "}"
  ].join("\n");
}

function decodeMethod(entry: DecodeEntryView): "Call" | "Reply" | "Error" | "Event" | "Ctor" {
  switch (entry.kind) {
    case "query":
    case "command":
      return "Call";
    case "event":
      return "Event";
    case "ctor":
      return "Ctor";
    default:
      return "Call";
  }
}

function formatEntryLabel(entry: DecodeEntryView): string {
  if (entry.fn) return entry.service ? `${entry.service}.${entry.fn}` : entry.fn;
  if (entry.event) return entry.service ? `${entry.service}.${entry.event}` : entry.event;
  if (entry.ctor) return `ctor ${entry.ctor}`;
  if (entry.service) return entry.service;
  return `${entry.kind} entry (entryId ${entry.entryId})`;
}
