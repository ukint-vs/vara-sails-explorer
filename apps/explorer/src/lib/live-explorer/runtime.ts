import { blocks as fixtureBlocks, netStats as fixtureStats } from "../../data/fixtures";
import type { ExplorerBlock, NetStat } from "../../data/types";
import { ExplorerCache } from "./cache";
import type { ExplorerDataSource, ExplorerDataSourceFactory } from "./data-source";
import { FixtureDataSource } from "./fixture-source";
import { GearJsVaraDataSource } from "./gear-source";
import { blockNumberValue, mergeBlocks, sortBlocksDesc } from "./mappers";
import { endpointKey, getEndpointById, loadRpcSettings, RPC_ENDPOINTS } from "./settings";
import type {
  ExplorerBlockDetail,
  ExplorerBlockRef,
  ExplorerConnectionStatus,
  ExplorerRuntimeListener,
  ExplorerRuntimeSnapshot,
  RpcEndpoint,
  Unsubscribe
} from "./types";

const SUMMARY_CACHE_LIMIT = 512;
const OVERVIEW_RENDER_LIMIT = 8;
const BLOCKS_RENDER_LIMIT = 50;
const CONNECT_TIMEOUT_MS = 12_000;

export type ExplorerRuntimeOptions = {
  cache?: ExplorerCache;
  dataSourceFactory?: ExplorerDataSourceFactory;
  fixtureDataSource?: ExplorerDataSource;
  initialBlocks?: ExplorerBlock[];
  initialStats?: NetStat[];
};

type QueueItem = {
  ref: ExplorerBlockRef;
  generation: number;
};

export class ExplorerRuntime {
  private cache: ExplorerCache;
  private dataSourceFactory: ExplorerDataSourceFactory;
  private fixtureDataSource: ExplorerDataSource;
  private dataSource: ExplorerDataSource | undefined;
  private listeners = new Set<ExplorerRuntimeListener>();
  private blocks: ExplorerBlock[];
  private stats: NetStat[];
  private currentEndpoint: RpcEndpoint;
  private status: ExplorerConnectionStatus;
  private headUnsubscribe: Unsubscribe | undefined;
  private started = false;
  private generation = 0;
  private queue: QueueItem[] = [];
  private queuedKeys = new Set<string>();
  private activeFetches = 0;

  constructor(options: ExplorerRuntimeOptions = {}) {
    this.cache = options.cache ?? new ExplorerCache();
    this.dataSourceFactory = options.dataSourceFactory ?? ((endpoint) => new GearJsVaraDataSource(endpoint));
    this.fixtureDataSource = options.fixtureDataSource ?? new FixtureDataSource();
    this.blocks = options.initialBlocks ?? fixtureBlocks;
    this.stats = options.initialStats ?? fixtureStats;
    this.currentEndpoint = RPC_ENDPOINTS[0];
    this.status = {
      phase: "idle",
      endpoint: this.currentEndpoint,
      message: "Live explorer is idle.",
      usingCache: false
    };
  }

  subscribe(listener: ExplorerRuntimeListener): Unsubscribe {
    this.listeners.add(listener);
    listener(this.snapshot());

    return () => {
      this.listeners.delete(listener);
    };
  }

  snapshot(): ExplorerRuntimeSnapshot {
    return {
      status: this.status,
      blocks: this.blocks,
      stats: this.stats,
      updatedAt: Date.now()
    };
  }

  async start(options: { forceFixture?: boolean } = {}): Promise<void> {
    if (this.started) {
      return;
    }
    this.started = true;

    const settings = loadRpcSettings();
    const endpoint = options.forceFixture ? { ...RPC_ENDPOINTS[0], id: "fixture", label: "Fixture stream" } : getEndpointById(
      settings.selectedEndpointId,
      settings.customEndpointUrl
    );

    await this.connect(endpoint, options.forceFixture);
  }

  async reconnect(endpoint: RpcEndpoint, options: { forceFixture?: boolean } = {}): Promise<void> {
    this.started = true;
    await this.connect(endpoint, options.forceFixture);
  }

  async stop(): Promise<void> {
    this.generation += 1;
    this.queue = [];
    this.queuedKeys.clear();
    await this.headUnsubscribe?.();
    this.headUnsubscribe = undefined;
    await this.dataSource?.disconnect();
    this.dataSource = undefined;
    this.status = {
      ...this.status,
      phase: "idle",
      message: "Live explorer stopped."
    };
    this.emit();
  }

  getRenderBlocks(limit = BLOCKS_RENDER_LIMIT): ExplorerBlock[] {
    return this.blocks.slice(0, limit);
  }

  getOverviewBlocks(): ExplorerBlock[] {
    return this.blocks.slice(0, OVERVIEW_RENDER_LIMIT);
  }

  async loadBlockDetail(blockId: string): Promise<ExplorerBlockDetail> {
    const key = endpointKey(this.currentEndpoint);
    const cached = await this.cache.readDetail(key, blockId);
    if (cached) {
      return cached;
    }

    const source = this.dataSource ?? this.fixtureDataSource;

    try {
      const detail = await source.getBlockDetail(blockId);
      await this.cache.writeDetail(key, blockId, detail);
      return detail;
    } catch (error) {
      const detail = await this.fixtureDataSource.getBlockDetail(blockId);
      return {
        ...detail,
        source: "fixture",
        block: {
          ...detail.block,
          age: "fixture"
        }
      };
    }
  }

  private async connect(endpoint: RpcEndpoint, forceFixture = false): Promise<void> {
    /*
     * State machine:
     * idle -> connecting -> live
     *             |          |
     *             |          +-> degraded when head fetches fail after a live connect
     *             +----------+-> cache_only/error when initial connect fails
     *
     * Every reconnect increments generation so queued fetches and old subscriptions
     * cannot write stale rows into the active endpoint snapshot.
     */
    this.generation += 1;
    const generation = this.generation;
    await this.headUnsubscribe?.();
    this.headUnsubscribe = undefined;
    await this.dataSource?.disconnect();
    this.dataSource = forceFixture ? this.fixtureDataSource : this.dataSourceFactory(endpoint);
    this.currentEndpoint = endpoint;
    this.queue = [];
    this.queuedKeys.clear();
    this.activeFetches = 0;

    this.status = {
      phase: "connecting",
      endpoint,
      message: `Connecting to ${endpoint.label}.`,
      usingCache: false
    };
    this.emit();

    const cachedBlocks = await this.cache.readBlocks(endpointKey(endpoint));
    if (cachedBlocks.length > 0) {
      this.blocks = sortBlocksDesc(cachedBlocks);
      this.stats = statsFromBlocks(this.blocks, this.status);
      this.emit();
    }

    try {
      await withTimeout(this.dataSource.connect(endpoint), CONNECT_TIMEOUT_MS, "RPC connection timed out.");
      if (generation !== this.generation) {
        return;
      }

      const recentBlocks = await this.dataSource.getRecentBlocks(BLOCKS_RENDER_LIMIT);
      this.blocks = mergeBlocks(this.blocks, recentBlocks, SUMMARY_CACHE_LIMIT);
      await this.cache.writeBlocks(endpointKey(endpoint), this.blocks);
      this.status = {
        ...this.dataSource.getStatus(),
        phase: "live",
        endpoint,
        message: `Connected to ${endpoint.label}.`,
        usingCache: false,
        lastUpdated: Date.now()
      };
      this.stats = statsFromBlocks(this.blocks, this.status);
      this.emit();

      this.headUnsubscribe = await this.dataSource.subscribeHeads((heads) => {
        if (generation !== this.generation) {
          return;
        }
        this.status = {
          ...this.status,
          bestBlock: heads.best?.number ?? this.status.bestBlock,
          finalizedBlock: heads.finalized?.number ?? this.status.finalizedBlock,
          lastUpdated: heads.updatedAt
        };
        for (const ref of [heads.best, heads.finalized]) {
          if (ref) {
            this.enqueueHead(ref, generation);
          }
        }
        this.stats = statsFromBlocks(this.blocks, this.status);
        this.emit();
      });
    } catch (error) {
      await this.useFallback(endpoint, error);
    }
  }

  private enqueueHead(ref: ExplorerBlockRef, generation: number): void {
    const key = ref.hash ?? String(ref.number);
    if (!key || this.queuedKeys.has(key)) {
      return;
    }

    this.queuedKeys.add(key);
    this.queue.push({ ref, generation });
    void this.processQueue();
  }

  private async processQueue(): Promise<void> {
    while (this.activeFetches < 2 && this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item || item.generation !== this.generation || !this.dataSource) {
        continue;
      }

      this.activeFetches += 1;
      const key = item.ref.hash ?? String(item.ref.number);
      void this.fetchQueuedSummary(item)
        .catch((error) => {
          if (item.generation !== this.generation) {
            return;
          }
          this.status = {
            ...this.status,
            phase: this.blocks.length > 0 ? "degraded" : "error",
            message: "Live head arrived, but block summary fetch failed.",
            error: error instanceof Error ? error.message : String(error),
            usingCache: this.blocks.length > 0
          };
          this.emit();
        })
        .finally(() => {
          this.activeFetches -= 1;
          this.queuedKeys.delete(key);
          void this.processQueue();
        });
    }
  }

  private async fetchQueuedSummary(item: QueueItem): Promise<void> {
    if (!this.dataSource) {
      return;
    }

    const blockId = item.ref.hash ?? item.ref.number;
    if (!blockId) {
      return;
    }

    const summary = await this.dataSource.getBlockSummary(blockId);
    if (item.generation !== this.generation) {
      return;
    }

    this.blocks = mergeBlocks(this.blocks, [summary], SUMMARY_CACHE_LIMIT);
    await this.cache.writeBlocks(endpointKey(this.currentEndpoint), this.blocks);
    this.status = {
      ...this.status,
      phase: "live",
      message: `Connected to ${this.currentEndpoint.label}.`,
      usingCache: false,
      lastUpdated: Date.now()
    };
    this.stats = statsFromBlocks(this.blocks, this.status);
    this.emit();
  }

  private async useFallback(endpoint: RpcEndpoint, error: unknown): Promise<void> {
    const cachedBlocks = await this.cache.readBlocks(endpointKey(endpoint));
    this.blocks = cachedBlocks.length > 0 ? sortBlocksDesc(cachedBlocks) : await this.fixtureDataSource.getRecentBlocks(
      BLOCKS_RENDER_LIMIT
    );
    this.status = {
      phase: cachedBlocks.length > 0 ? "cache_only" : "error",
      endpoint,
      message: cachedBlocks.length > 0
        ? "RPC unavailable. Showing cached blocks."
        : "RPC unavailable. Showing fixture blocks.",
      usingCache: cachedBlocks.length > 0,
      error: error instanceof Error ? error.message : String(error),
      lastUpdated: Date.now()
    };
    this.stats = statsFromBlocks(this.blocks, this.status);
    this.emit();
  }

  private emit(): void {
    const snapshot = this.snapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}

export function createInitialSnapshot(
  blocks: ExplorerBlock[] = fixtureBlocks,
  stats: NetStat[] = fixtureStats
): ExplorerRuntimeSnapshot {
  return {
    status: {
      phase: "idle",
      endpoint: RPC_ENDPOINTS[0],
      message: "Live explorer is idle.",
      usingCache: false
    },
    blocks,
    stats,
    updatedAt: Date.now()
  };
}

function statsFromBlocks(blocks: ExplorerBlock[], status: ExplorerConnectionStatus): NetStat[] {
  const best = status.bestBlock ?? blockNumberValue(blocks[0]?.number ?? "#0");
  const finalized = status.finalizedBlock ?? blockNumberValue(blocks.find((block) => block.finality === "finalized")?.number ?? "#0");
  const bestBlock = blocks[0];
  const totalGearMessages = blocks.reduce((sum, block) => sum + block.gearMessages, 0);
  const totalDecoded = blocks.reduce((sum, block) => sum + block.decodedSails, 0);
  const coverage = totalGearMessages > 0 ? `${Math.round((totalDecoded / totalGearMessages) * 100)}%` : "pending";

  return [
    {
      label: "Best block",
      value: best > 0 ? `#${best.toLocaleString("en-US")}` : bestBlock?.number ?? "pending",
      note: `${bestBlock?.age ?? "pending"} · ${status.phase}`,
      tone: status.phase === "live" ? "brand" : "warn",
      live: status.phase === "live"
    },
    {
      label: "Finalized",
      value: finalized > 0 ? `#${finalized.toLocaleString("en-US")}` : "pending",
      note: best && finalized ? `lag ${Math.max(0, best - finalized)} blocks` : "awaiting head",
      tone: "success"
    },
    {
      label: "RPC",
      value: status.endpoint.label,
      note: status.usingCache ? "cache fallback" : "direct mode",
      tone: status.phase === "error" ? "danger" : "info"
    },
    {
      label: "Cached blocks",
      value: String(blocks.length),
      note: "bounded local window",
      tone: "neutral"
    },
    {
      label: "Gear msgs",
      value: String(totalGearMessages),
      note: "from current window",
      tone: "steel"
    },
    {
      label: "Decode coverage",
      value: coverage,
      note: "M2 decoder pending",
      tone: "success"
    }
  ];
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timer = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timer]).finally(() => {
    if (timeout) {
      clearTimeout(timeout);
    }
  });
}
