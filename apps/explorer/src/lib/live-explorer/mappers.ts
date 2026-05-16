import type { FinalityStatus, ExplorerBlock } from "../../data/types";
import type { ExplorerEvent, ExplorerExtrinsic, ExplorerObservedObject } from "./types";

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

  const numeric = Number(normalizeBlockNumberText(normalized));
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : normalized;
}

export function formatBlockNumber(value: number): string {
  return `#${value.toLocaleString("en-US")}`;
}

export function formatBlockNumberPlain(value: string | number): string {
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(Math.trunc(value)) : String(value);
  }

  const normalized = normalizeBlockNumberText(value);
  const numeric = Number(normalized);
  return Number.isFinite(numeric) && numeric >= 0 ? String(Math.trunc(numeric)) : value;
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

export function normalizeTimestampMs(value: unknown): number {
  const numeric = readNumericLike(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0;
  }

  return numeric < 10_000_000_000 ? numeric * 1000 : numeric;
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
  timestampMs: unknown;
  author?: string;
  finality?: FinalityStatus;
  extrinsics: number;
  events: number;
  gearMessages?: number;
  failures?: number;
}): ExplorerBlock {
  const gearMessages = input.gearMessages ?? 0;
  const timestampMs = normalizeTimestampMs(input.timestampMs);

  return {
    number: formatBlockNumber(input.number),
    hash: compactHash(input.hash, 8, 4),
    timestamp: formatTimestamp(timestampMs),
    age: formatAge(timestampMs),
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

  return {
    id: `${index}-${section}.${method}`,
    index,
    phase: formatEventPhase(record.phase ?? "unknown"),
    section,
    method,
    summary: `${section}.${method}`,
    raw: toHuman(record)
  };
}

export function mapRpcExtrinsic(extrinsic: RpcExtrinsic, index: number, events: ExplorerEvent[]): ExplorerExtrinsic {
  const section = extrinsic.method?.section ?? "unknown";
  const method = extrinsic.method?.method ?? "call";
  const hash = callMethod<string>(extrinsic.hash, "toHex") ?? callMethod<string>(extrinsic.hash, "toString") ?? `${section}-${method}-${index}`;
  const success = inferExtrinsicSuccess(events, index);

  return {
    id: `${index}-${hash}`,
    index,
    hash,
    section,
    method,
    signer: extrinsic.isSigned ? callMethod<string>(extrinsic.signer, "toString") ?? "signed" : "unsigned",
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

  for (const block of incoming) {
    byNumber.set(block.number, block);
  }
  for (const block of existing) {
    byNumber.set(block.number, block);
  }

  return sortBlocksDesc([...byNumber.values()]).slice(0, limit);
}

export function blockNumberValue(value: string): number {
  const numeric = Number(normalizeBlockNumberText(value));
  return Number.isFinite(numeric) ? numeric : 0;
}

export function countGearEvents(events: ExplorerEvent[]): number {
  let count = 0;
  for (const event of events) {
    if (event.section.toLowerCase().includes("gear")) {
      count += 1;
    }
  }
  return count;
}

export function countFailedExtrinsics(events: ExplorerEvent[]): number {
  let count = 0;
  for (const event of events) {
    if (event.section === "system" && event.method === "ExtrinsicFailed") {
      count += 1;
    }
  }
  return count;
}

export function extractObservedObjects(
  events: ExplorerEvent[],
  extrinsics: ExplorerExtrinsic[],
  blockNumber: number,
  source: ExplorerObservedObject["source"] = "rpc_event"
): ExplorerObservedObject[] {
  const byKey = new Map<string, ExplorerObservedObject>();

  function push(object: ExplorerObservedObject): void {
    byKey.set(`${object.kind}:${object.id}`, object);
  }

  for (const event of events) {
    const isGearEvent = event.section.toLowerCase().includes("gear");
    if (isGearEvent) {
      push({
        kind: "event",
        id: `${event.section}.${event.method}`,
        label: `${event.section}.${event.method}`,
        source,
        blockNumber,
        confidence: "derived"
      });
    }
    collectObservedIds(event.raw, {
      blockNumber,
      confidence: "explicit",
      method: event.method,
      section: event.section,
      source,
      push
    });
  }

  for (const extrinsic of extrinsics) {
    if (extrinsic.section.toLowerCase().includes("gear")) {
      push({
        kind: "event",
        id: `${extrinsic.section}.${extrinsic.method}`,
        label: `${extrinsic.section}.${extrinsic.method}`,
        source: source === "fixture" ? "fixture" : "rpc_extrinsic",
        blockNumber,
        confidence: "derived"
      });
    }
    collectObservedIds(extrinsic.raw, {
      blockNumber,
      confidence: "explicit",
      method: extrinsic.method,
      section: extrinsic.section,
      source: source === "fixture" ? "fixture" : "rpc_extrinsic",
      push
    });
  }

  return [...byKey.values()].sort((a, b) => kindRank(a.kind) - kindRank(b.kind) || a.label.localeCompare(b.label));
}

export function formatEventPhase(value: unknown): string {
  const phase = readPhaseVariant(value);
  if (phase) {
    return phase;
  }

  const human = toHuman(value);
  if (typeof human === "string") {
    return human || "unknown";
  }

  const serialized = stringifyHuman(human);
  return serialized || "unknown";
}

function inferExtrinsicSuccess(events: ExplorerEvent[], index: number): boolean | null {
  let failed = false;
  for (const event of events) {
    if (!phaseMatchesExtrinsic(event.phase, index) || event.section !== "system") {
      continue;
    }
    if (event.method === "ExtrinsicSuccess") {
      return true;
    }
    if (event.method === "ExtrinsicFailed") {
      failed = true;
    }
  }

  return failed ? false : null;
}

function phaseMatchesExtrinsic(phase: string, index: number): boolean {
  return phase === `ApplyExtrinsic(${index})`;
}

function normalizeBlockNumberText(value: string): string {
  return value.trim().replaceAll("#", "").replaceAll(",", "");
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

function readNumericLike(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (typeof value === "string") {
    const numeric = Number(value.replaceAll(",", "").replaceAll("_", ""));
    return Number.isFinite(numeric) ? numeric : 0;
  }

  if (Array.isArray(value)) {
    return readNumericLike(value[0]);
  }

  if (value && typeof value === "object") {
    const toNumber = callMethod<number>(value, "toNumber");
    if (typeof toNumber === "number" && Number.isFinite(toNumber)) {
      return toNumber;
    }

    const toBigInt = callMethod<bigint>(value, "toBigInt");
    if (typeof toBigInt === "bigint") {
      return Number(toBigInt);
    }

    const human = toHuman(value);
    if (human !== value) {
      const humanNumber = readNumericLike(human);
      if (Number.isFinite(humanNumber) && humanNumber > 0) {
        return humanNumber;
      }
    }

    const stringValue = callMethod<string>(value, "toString");
    if (stringValue && stringValue !== "[object Object]") {
      return readNumericLike(stringValue);
    }
  }

  return 0;
}

function readPhaseVariant(value: unknown): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const maybePhase = value as {
    asApplyExtrinsic?: unknown;
    isApplyExtrinsic?: boolean;
    isFinalization?: boolean;
    isInitialization?: boolean;
  };
  if (maybePhase.isApplyExtrinsic) {
    return `ApplyExtrinsic(${scalarLabel(maybePhase.asApplyExtrinsic)})`;
  }
  if (maybePhase.isFinalization) {
    return "Finalization";
  }
  if (maybePhase.isInitialization) {
    return "Initialization";
  }

  const human = toHuman(value);
  if (human !== value) {
    const phase = readPhaseVariant(human);
    if (phase) {
      return phase;
    }
  }

  if (Array.isArray(human) || !human || typeof human !== "object") {
    return undefined;
  }

  const entries = Object.entries(human as Record<string, unknown>);
  if (entries.length !== 1) {
    return undefined;
  }

  const [key, entryValue] = entries[0];
  const normalized = key.toLowerCase();
  if (normalized === "applyextrinsic" || normalized === "apply_extrinsic") {
    return `ApplyExtrinsic(${scalarLabel(entryValue)})`;
  }
  if (normalized === "finalization") {
    return "Finalization";
  }
  if (normalized === "initialization") {
    return "Initialization";
  }

  return undefined;
}

type ObservedCollector = {
  blockNumber: number;
  confidence: ExplorerObservedObject["confidence"];
  method: string;
  section: string;
  source: ExplorerObservedObject["source"];
  push: (object: ExplorerObservedObject) => void;
};

function collectObservedIds(value: unknown, collector: ObservedCollector, path: string[] = []): void {
  if (path.length > 8 || value == null) {
    return;
  }

  if (typeof value === "string") {
    const key = path[path.length - 1] ?? "";
    const kind = classifyObservedId(key, collector, value);
    if (kind) {
      collector.push({
        kind,
        id: value,
        label: `${labelForKind(kind)} ${compactHash(value, 8, 4)}`,
        source: collector.source,
        blockNumber: collector.blockNumber,
        confidence: collector.confidence
      });
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectObservedIds(entry, collector, [...path, String(index)]));
    return;
  }

  if (typeof value === "object") {
    const human = toHuman(value);
    if (human !== value) {
      collectObservedIds(human, collector, path);
      return;
    }

    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      collectObservedIds(entry, collector, [...path, key]);
    }
  }
}

function classifyObservedId(
  key: string,
  collector: Pick<ObservedCollector, "method" | "section">,
  value: string
): ExplorerObservedObject["kind"] | undefined {
  if (!/^0x[0-9a-fA-F]{8,}$/.test(value)) {
    return undefined;
  }

  const normalizedKey = key.toLowerCase();
  if (normalizedKey.includes("code") || normalizedKey.includes("wasm")) {
    return "code";
  }
  if (normalizedKey.includes("program") || normalizedKey.includes("destination") || normalizedKey === "dest") {
    return "program";
  }
  if (
    normalizedKey.includes("message") ||
    (normalizedKey === "id" &&
      collector.section.toLowerCase().includes("gear") &&
      collector.method.toLowerCase().includes("message"))
  ) {
    return "message";
  }

  return undefined;
}

function kindRank(kind: ExplorerObservedObject["kind"]): number {
  return { program: 0, code: 1, message: 2, event: 3 }[kind];
}

function labelForKind(kind: ExplorerObservedObject["kind"]): string {
  return { program: "Program", code: "Code", message: "Message", event: "Event" }[kind];
}

function scalarLabel(value: unknown): string {
  const numeric = readNumericLike(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return String(numeric);
  }

  const human = toHuman(value);
  if (typeof human === "string") {
    return human;
  }

  return stringifyHuman(human) || "unknown";
}

function callMethod<T>(value: unknown, methodName: string): T | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const method = (value as Record<string, unknown>)[methodName];
  if (typeof method !== "function") {
    return undefined;
  }

  try {
    return (method as () => T).call(value);
  } catch {
    return undefined;
  }
}
