import type { FinalityStatus, ExplorerBlock } from "../../data/types";
import type { ExplorerEvent, ExplorerExtrinsic } from "./types";

type RpcEventRecord = {
  phase?: unknown;
  event?: {
    section?: string;
    method?: string;
    data?: unknown;
  };
  toHuman?: () => unknown;
};

type RpcExtrinsic = {
  hash?: { toHex?: () => string; toString?: () => string };
  method?: {
    section?: string;
    method?: string;
    args?: unknown;
  };
  signer?: { toString?: () => string };
  isSigned?: boolean;
  toHuman?: () => unknown;
};

export function parseBlockIdentifier(block: string | number): string | number {
  if (typeof block === "number") {
    return block;
  }

  const normalized = block.trim();
  if (normalized.startsWith("0x")) {
    return normalized;
  }

  const numeric = Number(normalized.replaceAll("#", "").replaceAll(",", ""));
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : normalized;
}

export function formatBlockNumber(value: number): string {
  return `#${value.toLocaleString("en-US")}`;
}

export function formatTimestamp(timestampMs: number): string {
  if (!Number.isFinite(timestampMs) || timestampMs <= 0) {
    return "--:--:--";
  }

  return new Date(timestampMs).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

export function formatAge(timestampMs: number, now = Date.now()): string {
  if (!Number.isFinite(timestampMs) || timestampMs <= 0) {
    return "unknown";
  }

  const seconds = Math.max(0, Math.floor((now - timestampMs) / 1000));
  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function compactHash(value: string, head = 8, tail = 4): string {
  if (!value || value.length <= head + tail + 3) {
    return value || "unknown";
  }

  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

export function mapBlockSummary(input: {
  number: number;
  hash: string;
  timestampMs: number;
  author?: string;
  finality?: FinalityStatus;
  extrinsics: number;
  events: number;
  gearMessages?: number;
  failures?: number;
}): ExplorerBlock {
  const gearMessages = input.gearMessages ?? countUnknownGearMessages(input.events);

  return {
    number: formatBlockNumber(input.number),
    hash: compactHash(input.hash, 8, 4),
    timestamp: formatTimestamp(input.timestampMs),
    age: formatAge(input.timestampMs),
    author: compactHash(input.author ?? "unknown", 8, 4),
    finality: input.finality ?? "best_block",
    extrinsics: input.extrinsics,
    events: input.events,
    gearMessages,
    decodedSails: 0,
    failures: input.failures ?? 0
  };
}

export function mapRpcEvent(record: RpcEventRecord, index: number): ExplorerEvent {
  const section = record.event?.section ?? "system";
  const method = record.event?.method ?? "Event";
  const data = stringifyHuman(record.event?.data ?? toHuman(record));

  return {
    id: `${index}-${section}.${method}`,
    index,
    phase: stringifyHuman(record.phase ?? "unknown"),
    section,
    method,
    summary: `${section}.${method}${data ? ` ${data}` : ""}`,
    raw: toHuman(record)
  };
}

export function mapRpcExtrinsic(extrinsic: RpcExtrinsic, index: number, events: ExplorerEvent[]): ExplorerExtrinsic {
  const section = extrinsic.method?.section ?? "unknown";
  const method = extrinsic.method?.method ?? "call";
  const hash = callToString(extrinsic.hash?.toHex) ?? callToString(extrinsic.hash?.toString) ?? `${section}-${method}-${index}`;
  const relatedEvents = events.filter((event) => event.phase.includes(`ApplyExtrinsic`) && event.phase.includes(String(index)));
  const success = inferExtrinsicSuccess(relatedEvents);

  return {
    id: `${index}-${hash}`,
    index,
    hash,
    section,
    method,
    signer: extrinsic.isSigned ? callToString(extrinsic.signer?.toString) ?? "signed" : "unsigned",
    success,
    summary: `${section}.${method}`,
    raw: toHuman(extrinsic)
  };
}

export function sortBlocksDesc(blocks: ExplorerBlock[]): ExplorerBlock[] {
  return [...blocks].sort((a, b) => blockNumberValue(b.number) - blockNumberValue(a.number));
}

export function mergeBlocks(existing: ExplorerBlock[], incoming: ExplorerBlock[], limit: number): ExplorerBlock[] {
  const byNumber = new Map<string, ExplorerBlock>();

  for (const block of [...incoming, ...existing]) {
    byNumber.set(block.number, block);
  }

  return sortBlocksDesc([...byNumber.values()]).slice(0, limit);
}

export function blockNumberValue(value: string): number {
  const numeric = Number(value.replaceAll("#", "").replaceAll(",", ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

export function countGearEvents(events: ExplorerEvent[]): number {
  return events.filter((event) => event.section.toLowerCase().includes("gear")).length;
}

function countUnknownGearMessages(eventCount: number): number {
  return eventCount > 0 ? 0 : 0;
}

function inferExtrinsicSuccess(events: ExplorerEvent[]): boolean | null {
  if (events.some((event) => event.section === "system" && event.method === "ExtrinsicSuccess")) {
    return true;
  }

  if (events.some((event) => event.section === "system" && event.method === "ExtrinsicFailed")) {
    return false;
  }

  return null;
}

function toHuman(value: unknown): unknown {
  if (value && typeof value === "object" && "toHuman" in value && typeof value.toHuman === "function") {
    return value.toHuman();
  }

  return value;
}

function stringifyHuman(value: unknown): string {
  const human = toHuman(value);
  if (human == null) {
    return "";
  }

  if (typeof human === "string") {
    return human;
  }

  try {
    return JSON.stringify(human);
  } catch {
    return String(human);
  }
}

function callToString(callback: (() => string) | undefined): string | undefined {
  if (!callback) {
    return undefined;
  }

  try {
    return callback();
  } catch {
    return undefined;
  }
}
