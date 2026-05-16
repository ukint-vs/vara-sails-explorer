import type { ExplorerBlock } from "../../data/types";
import type { ExplorerDataSource } from "./data-source";
import {
  countFailedExtrinsics,
  countGearEvents,
  extractObservedObjects,
  mapBlockSummary,
  mapRpcEvent,
  mapRpcExtrinsic,
  parseBlockIdentifier
} from "./mappers";
import type { ExplorerBlockDetail, ExplorerBlockRef, ExplorerConnectionStatus, ExplorerHeads, RpcEndpoint, Unsubscribe } from "./types";

type GearApiInstance = {
  blocks: {
    get: (block: string | number) => Promise<unknown>;
    getBlockHash: (blockNumber: number) => Promise<unknown>;
    getBlockNumber: (blockHash: string) => Promise<unknown>;
    getBlockTimestamp: (blockNumber: number) => Promise<unknown>;
    getEvents: (blockHash: string) => Promise<unknown[]>;
    getExtrinsics: (blockHash: string) => Promise<unknown[]>;
  };
  rpc: {
    chain: {
      getHeader: () => Promise<unknown>;
      subscribeNewHeads: (callback: (header: unknown) => void) => Promise<Unsubscribe> | Unsubscribe;
      subscribeFinalizedHeads: (callback: (header: unknown) => void) => Promise<Unsubscribe> | Unsubscribe;
    };
  };
  disconnect?: () => Promise<void> | void;
  specName?: string;
};

type GearApiModule = {
  GearApi: { create: (options: { providerAddress: string }) => Promise<GearApiInstance> };
  VaraApiV1010?: { create: (options: { providerAddress: string }) => Promise<GearApiInstance> };
};

export class GearJsVaraDataSource implements ExplorerDataSource {
  private api: GearApiInstance | undefined;
  private unsubs: Unsubscribe[] = [];
  private bestBlock: number | undefined;
  private finalizedBlock: number | undefined;
  private status: ExplorerConnectionStatus;

  constructor(endpoint: RpcEndpoint) {
    this.status = {
      phase: "idle",
      endpoint,
      message: "RPC data source ready.",
      usingCache: false
    };
  }

  async connect(endpoint: RpcEndpoint): Promise<void> {
    this.status = {
      phase: "connecting",
      endpoint,
      message: "Connecting to RPC endpoint.",
      usingCache: false
    };

    const module = (await import("@gear-js/api")) as unknown as GearApiModule;
    const ApiClass = endpoint.kind === "vara" ? module.VaraApiV1010 ?? module.GearApi : module.GearApi;
    this.api = await ApiClass.create({ providerAddress: endpoint.url });
    this.status = {
      phase: "live",
      endpoint,
      message: `Connected to ${endpoint.label}.`,
      usingCache: false,
      connectedAt: Date.now(),
      lastUpdated: Date.now()
    };
  }

  async disconnect(): Promise<void> {
    for (const unsub of this.unsubs.splice(0)) {
      await unsub();
    }

    await this.api?.disconnect?.();
    this.api = undefined;
    this.status = {
      ...this.status,
      phase: "idle",
      message: "Disconnected."
    };
  }

  async subscribeHeads(onUpdate: (heads: ExplorerHeads) => void): Promise<Unsubscribe> {
    const api = this.requireApi();

    const bestUnsub = await api.rpc.chain.subscribeNewHeads((header) => {
      const updatedAt = Date.now();
      const best = mapHeaderRef(header);
      this.bestBlock = best.number ?? this.bestBlock;
      this.status = {
        ...this.status,
        phase: "live",
        bestBlock: this.bestBlock,
        finalizedBlock: this.finalizedBlock,
        lastUpdated: updatedAt
      };
      onUpdate({ best, finalized: this.finalizedBlock ? { number: this.finalizedBlock } : undefined, updatedAt });
    });

    const finalizedUnsub = await api.rpc.chain.subscribeFinalizedHeads((header) => {
      const updatedAt = Date.now();
      const finalized = mapHeaderRef(header);
      this.finalizedBlock = finalized.number ?? this.finalizedBlock;
      this.status = {
        ...this.status,
        phase: "live",
        bestBlock: this.bestBlock,
        finalizedBlock: this.finalizedBlock,
        lastUpdated: updatedAt
      };
      onUpdate({ best: this.bestBlock ? { number: this.bestBlock } : undefined, finalized, updatedAt });
    });

    this.unsubs.push(bestUnsub, finalizedUnsub);

    return async () => {
      await bestUnsub();
      await finalizedUnsub();
      this.unsubs = this.unsubs.filter((unsub) => unsub !== bestUnsub && unsub !== finalizedUnsub);
    };
  }

  async getRecentBlocks(limit: number): Promise<ExplorerBlock[]> {
    const api = this.requireApi();
    const latestHeader = await api.rpc.chain.getHeader();
    const latest = headerNumber(latestHeader);
    const count = Math.min(Math.max(0, limit), Number.isFinite(latest) ? latest + 1 : 0);
    const numbers = Array.from({ length: count }, (_, index) => latest - index);

    return mapWithConcurrency(numbers, 2, (number) => this.getBlockSummary(number));
  }

  async getBlockSummary(block: string | number): Promise<ExplorerBlock> {
    const { blockNumber, blockHash } = await this.resolveBlockRef(block);

    return this.mapBlockForHash(blockNumber, blockHash);
  }

  async getBlockDetail(block: string | number): Promise<ExplorerBlockDetail> {
    const api = this.requireApi();
    const { blockNumber, blockHash } = await this.resolveBlockRef(block);

    /*
     * Detail pipeline:
     * query block hash/number -> fetch block shell -> fetch events + extrinsics
     * -> convert every SDK object into serializable DTOs before UI/cache access.
     */
    const [summary, eventRecords, extrinsicRecords] = await Promise.all([
      this.mapBlockForHash(blockNumber, blockHash),
      api.blocks.getEvents(blockHash),
      api.blocks.getExtrinsics(blockHash)
    ]);
    const events = eventRecords.map((event, index) => mapRpcEvent(event as Parameters<typeof mapRpcEvent>[0], index));
    const extrinsics = extrinsicRecords.map((extrinsic, index) =>
      mapRpcExtrinsic(extrinsic as Parameters<typeof mapRpcExtrinsic>[0], index, events)
    );
    const observedObjects = extractObservedObjects(events, extrinsics, blockNumber);

    return {
      block: {
        ...summary,
        gearMessages: countGearEvents(events),
        failures: extrinsics.filter((extrinsic) => extrinsic.success === false).length
      },
      blockNumber,
      blockHash,
      observedObjects,
      events,
      extrinsics,
      fetchedAt: Date.now(),
      source: "rpc"
    };
  }

  getStatus(): ExplorerConnectionStatus {
    return this.status;
  }

  private async resolveBlockRef(block: string | number): Promise<{ blockNumber: number; blockHash: string }> {
    const api = this.requireApi();
    const parsed = parseBlockIdentifier(block);
    const blockNumber = typeof parsed === "number" ? parsed : toNumber(await api.blocks.getBlockNumber(parsed));
    const blockHash = typeof parsed === "string" ? parsed : toHex(await api.blocks.getBlockHash(blockNumber));

    return { blockNumber, blockHash };
  }

  private async mapBlockForHash(blockNumber: number, blockHash: string): Promise<ExplorerBlock> {
    const api = this.requireApi();
    const [block, timestampMs, eventRecords] = await Promise.all([
      api.blocks.get(blockHash),
      api.blocks.getBlockTimestamp(blockNumber).catch(() => 0),
      api.blocks.getEvents(blockHash).catch(() => [])
    ]);
    const events = eventRecords.map((event, index) => mapRpcEvent(event as Parameters<typeof mapRpcEvent>[0], index));
    const extrinsics = blockExtrinsicCount(block);
    const finality = this.finalizedBlock && blockNumber <= this.finalizedBlock ? "finalized" : "best_block";

    return mapBlockSummary({
      number: blockNumber,
      hash: blockHash,
      timestampMs,
      author: blockAuthor(block),
      finality,
      extrinsics,
      events: events.length,
      gearMessages: countGearEvents(events),
      failures: countFailedExtrinsics(events)
    });
  }

  private requireApi(): GearApiInstance {
    if (!this.api) {
      throw new Error("RPC endpoint is not connected.");
    }

    return this.api;
  }
}

function mapHeaderRef(header: unknown): ExplorerBlockRef {
  return {
    number: headerNumber(header),
    hash: headerHash(header)
  };
}

function headerNumber(header: unknown): number {
  const value = readPath(header, ["number"]);
  return toNumber(value);
}

function headerHash(header: unknown): string | undefined {
  const value = readPath(header, ["hash"]);
  const hash = toHex(value);
  return hash === "unknown" ? undefined : hash;
}

function blockExtrinsicCount(block: unknown): number {
  const extrinsics = readPath(block, ["block", "extrinsics"]);
  return Array.isArray(extrinsics) ? extrinsics.length : 0;
}

function blockAuthor(block: unknown): string {
  const logs = readPath(block, ["block", "header", "digest", "logs"]);
  if (!Array.isArray(logs)) {
    return "unknown";
  }

  for (const log of logs) {
    const label = consensusLabel(log);
    if (label) {
      return label;
    }
  }

  return "unknown";
}

function readPath(value: unknown, path: string[]): unknown {
  let current = value;
  for (const segment of path) {
    if (!current || typeof current !== "object" || !(segment in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (value && typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
    return value.toNumber();
  }
  const numeric = Number(String(value).replaceAll(",", ""));
  if (Number.isFinite(numeric)) {
    return numeric;
  }
  throw new Error("Unable to read block number from RPC response.");
}

function toHex(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object" && "toHex" in value && typeof value.toHex === "function") {
    return value.toHex();
  }
  if (value && typeof value === "object" && "toString" in value && typeof value.toString === "function") {
    return value.toString();
  }
  return "unknown";
}

function consensusLabel(value: unknown): string | undefined {
  const human = toHumanValue(value);
  const direct = consensusLabelFromText(typeof human === "string" ? human : stringifySafe(human));
  if (direct) {
    return direct;
  }

  if (!human || typeof human !== "object" || Array.isArray(human)) {
    return undefined;
  }

  for (const [key, entry] of Object.entries(human as Record<string, unknown>)) {
    const label = consensusLabelFromText(key) ?? consensusLabelFromText(stringifySafe(entry));
    if (label) {
      return label;
    }
  }

  return undefined;
}

function consensusLabelFromText(value: string): string | undefined {
  const match = value.match(/\b(BABE|AURA|GRPA|FRNK)\b/i);
  return match?.[1]?.toUpperCase();
}

function toHumanValue(value: unknown): unknown {
  if (value && typeof value === "object" && "toHuman" in value && typeof value.toHuman === "function") {
    return value.toHuman();
  }

  return value;
}

function stringifySafe(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}
