import type { ExplorerBlock } from "../../data/types";
import type { ExplorerDataSource } from "./data-source";
import {
  compactHash,
  countGearEvents,
  mapBlockSummary,
  mapRpcEvent,
  mapRpcExtrinsic,
  parseBlockIdentifier
} from "./mappers";
import type { ExplorerBlockDetail, ExplorerConnectionStatus, ExplorerHeads, RpcEndpoint, Unsubscribe } from "./types";

type GearApiInstance = {
  blocks: {
    get: (block: string | number) => Promise<unknown>;
    getBlockHash: (blockNumber: number) => Promise<unknown>;
    getBlockNumber: (blockHash: string) => Promise<unknown>;
    getBlockTimestamp: (blockNumber: number) => Promise<number>;
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
      const best = mapHeaderRef(header);
      this.bestBlock = best.number ?? this.bestBlock;
      this.status = {
        ...this.status,
        phase: "live",
        bestBlock: this.bestBlock,
        finalizedBlock: this.finalizedBlock,
        lastUpdated: Date.now()
      };
      onUpdate({ best, finalized: this.finalizedBlock ? { number: this.finalizedBlock } : undefined, updatedAt: Date.now() });
    });

    const finalizedUnsub = await api.rpc.chain.subscribeFinalizedHeads((header) => {
      const finalized = mapHeaderRef(header);
      this.finalizedBlock = finalized.number ?? this.finalizedBlock;
      this.status = {
        ...this.status,
        phase: "live",
        bestBlock: this.bestBlock,
        finalizedBlock: this.finalizedBlock,
        lastUpdated: Date.now()
      };
      onUpdate({ best: this.bestBlock ? { number: this.bestBlock } : undefined, finalized, updatedAt: Date.now() });
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
    const numbers = Array.from({ length: Math.max(0, limit) }, (_, index) => latest - index).filter((number) => number >= 0);

    return mapWithConcurrency(numbers, 2, (number) => this.getBlockSummary(number));
  }

  async getBlockSummary(block: string | number): Promise<ExplorerBlock> {
    const api = this.requireApi();
    const parsed = parseBlockIdentifier(block);
    const blockNumber = typeof parsed === "number" ? parsed : toNumber(await api.blocks.getBlockNumber(parsed));
    const blockHash = typeof parsed === "string" ? parsed : toHex(await api.blocks.getBlockHash(blockNumber));

    return this.mapBlockForHash(blockNumber, blockHash);
  }

  async getBlockDetail(block: string | number): Promise<ExplorerBlockDetail> {
    const api = this.requireApi();
    const parsed = parseBlockIdentifier(block);
    const blockNumber = typeof parsed === "number" ? parsed : toNumber(await api.blocks.getBlockNumber(parsed));
    const blockHash = typeof parsed === "string" ? parsed : toHex(await api.blocks.getBlockHash(blockNumber));

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

    return {
      block: {
        ...summary,
        gearMessages: countGearEvents(events),
        failures: extrinsics.filter((extrinsic) => extrinsic.success === false).length
      },
      blockNumber,
      blockHash,
      events,
      extrinsics,
      fetchedAt: Date.now(),
      source: "rpc"
    };
  }

  getStatus(): ExplorerConnectionStatus {
    return this.status;
  }

  private async mapBlockForHash(blockNumber: number, blockHash: string): Promise<ExplorerBlock> {
    const api = this.requireApi();
    const [block, timestampMs, events] = await Promise.all([
      api.blocks.get(blockHash),
      api.blocks.getBlockTimestamp(blockNumber).catch(() => 0),
      api.blocks.getEvents(blockHash).catch(() => [])
    ]);
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
      gearMessages: countGearEvents(events.map((event, index) => mapRpcEvent(event as Parameters<typeof mapRpcEvent>[0], index)))
    });
  }

  private requireApi(): GearApiInstance {
    if (!this.api) {
      throw new Error("RPC endpoint is not connected.");
    }

    return this.api;
  }
}

function mapHeaderRef(header: unknown) {
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

  const engineLog = logs.find((log) => String(log).includes("0x"));
  return compactHash(String(engineLog ?? "unknown"));
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
  if (value && typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
    return value.toNumber();
  }
  const numeric = Number(value);
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
