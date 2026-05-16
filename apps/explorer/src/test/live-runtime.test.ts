import { afterEach, describe, expect, it, vi } from "vitest";
import { blocks } from "../data/fixtures";
import type { ExplorerBlock } from "../data/types";
import { ExplorerCache } from "../lib/live-explorer/cache";
import type { ExplorerDataSource } from "../lib/live-explorer/data-source";
import { ExplorerRuntime } from "../lib/live-explorer/runtime";
import { RPC_ENDPOINTS } from "../lib/live-explorer/settings";
import type { ExplorerBlockDetail, ExplorerConnectionStatus, ExplorerHeads, RpcEndpoint, Unsubscribe } from "../lib/live-explorer/types";

describe("live explorer runtime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("connects, emits live state, and merges queued head summaries", async () => {
    const source = new FakeDataSource([
      makeBlock(10),
      makeBlock(9),
      makeBlock(8)
    ]);
    const runtime = new ExplorerRuntime({
      cache: new ExplorerCache(),
      dataSourceFactory: () => source,
      fixtureDataSource: source,
      initialBlocks: []
    });
    const snapshots: string[] = [];
    runtime.subscribe((snapshot) => snapshots.push(snapshot.status.phase));

    await runtime.start();
    await source.emitHeads({ best: { number: 11 }, finalized: { number: 9 }, updatedAt: Date.now() });
    await waitForMicrotasks();

    expect(snapshots).toContain("live");
    expect(runtime.snapshot().blocks[0].number).toBe("#11");
    expect(runtime.snapshot().status.finalizedBlock).toBe(9);
    expect(runtime.snapshot().stats.map((stat) => stat.label)).toContain("Gear events");
    expect(runtime.snapshot().stats.map((stat) => stat.label)).not.toContain("Decode coverage");
  });

  it("uses cached data when the RPC connection fails", async () => {
    const cache = new ExplorerCache();
    await cache.writeBlocks("vara-testnet:wss://testnet.vara.network", [makeBlock(88)]);
    const runtime = new ExplorerRuntime({
      cache,
      dataSourceFactory: () => new RejectingDataSource(),
      fixtureDataSource: new FakeDataSource([makeBlock(1)]),
      initialBlocks: []
    });

    await runtime.start();

    expect(runtime.snapshot().status.phase).toBe("cache_only");
    expect(runtime.snapshot().blocks[0].number).toBe("#88");
  });

  it("falls back visibly when there is no cache", async () => {
    const runtime = new ExplorerRuntime({
      cache: new ExplorerCache(),
      dataSourceFactory: () => new RejectingDataSource(),
      fixtureDataSource: new FakeDataSource([makeBlock(7)]),
      initialBlocks: []
    });

    await runtime.start();

    expect(runtime.snapshot().status.phase).toBe("error");
    expect(runtime.snapshot().blocks[0].number).toBe("#7");
  });

  it("ignores stale head updates after reconnect", async () => {
    const oldSource = new FakeDataSource([makeBlock(10)]);
    const nextSource = new FakeDataSource([makeBlock(20)]);
    let calls = 0;
    const runtime = new ExplorerRuntime({
      cache: new ExplorerCache(),
      dataSourceFactory: () => {
        calls += 1;
        return calls === 1 ? oldSource : nextSource;
      },
      fixtureDataSource: nextSource,
      initialBlocks: []
    });

    await runtime.start();
    await runtime.reconnect(RPC_ENDPOINTS[1]);
    await oldSource.emitHeads({ best: { number: 99 }, updatedAt: Date.now() });
    await nextSource.emitHeads({ best: { number: 21 }, updatedAt: Date.now() });
    await waitForMicrotasks();

    expect(runtime.snapshot().blocks[0].number).toBe("#21");
    expect(runtime.snapshot().blocks.every((block) => block.number !== "#99")).toBe(true);
  });

  it("loads block detail through the active datasource", async () => {
    const source = new FakeDataSource([makeBlock(12)]);
    const runtime = new ExplorerRuntime({
      cache: new ExplorerCache(),
      dataSourceFactory: () => source,
      fixtureDataSource: source,
      initialBlocks: []
    });

    await runtime.start();

    await expect(runtime.loadBlockDetail("12")).resolves.toMatchObject({
      blockNumber: 12,
      source: "rpc"
    });
  });

  it("does not fabricate fixture block detail after live RPC detail failure", async () => {
    const runtime = new ExplorerRuntime({
      cache: new ExplorerCache(),
      dataSourceFactory: () => new RejectingDataSource(),
      fixtureDataSource: new FakeDataSource([makeBlock(7)]),
      initialBlocks: []
    });

    await runtime.start();

    await expect(runtime.loadBlockDetail("7")).rejects.toThrow("Block detail unavailable until the RPC endpoint connects");
  });

  it("allows fixture block detail only when fixture mode is explicit", async () => {
    const fixtureSource = new FakeDataSource([makeBlock(7)]);
    const runtime = new ExplorerRuntime({
      cache: new ExplorerCache(),
      dataSourceFactory: () => new RejectingDataSource(),
      fixtureDataSource: fixtureSource,
      initialBlocks: []
    });

    await runtime.start({ forceFixture: true });

    await expect(runtime.loadBlockDetail("7")).resolves.toMatchObject({
      blockNumber: 7,
      source: "rpc"
    });
  });

  it("disconnects a source that loses the connection timeout race", async () => {
    vi.useFakeTimers();
    const source = new HangingDataSource();
    const runtime = new ExplorerRuntime({
      cache: new ExplorerCache(),
      dataSourceFactory: () => source,
      fixtureDataSource: new FakeDataSource([makeBlock(1)]),
      initialBlocks: []
    });

    const start = runtime.start();
    await vi.advanceTimersByTimeAsync(12_000);
    await start;

    expect(source.disconnects).toBeGreaterThan(0);
    expect(runtime.snapshot().status.phase).toBe("error");
  });
});

class FakeDataSource implements ExplorerDataSource {
  private endpoint = RPC_ENDPOINTS[0];
  private callback: ((heads: ExplorerHeads) => void) | undefined;
  disconnects = 0;

  constructor(private readonly sourceBlocks: ExplorerBlock[]) {}

  async connect(endpoint: RpcEndpoint): Promise<void> {
    this.endpoint = endpoint;
  }

  async disconnect(): Promise<void> {
    this.disconnects += 1;
    this.callback = undefined;
  }

  async subscribeHeads(onUpdate: (heads: ExplorerHeads) => void): Promise<Unsubscribe> {
    this.callback = onUpdate;
    return () => {
      this.callback = undefined;
    };
  }

  async emitHeads(heads: ExplorerHeads): Promise<void> {
    this.callback?.(heads);
    await waitForMicrotasks();
  }

  async getRecentBlocks(): Promise<ExplorerBlock[]> {
    return this.sourceBlocks;
  }

  async getBlockSummary(block: string | number): Promise<ExplorerBlock> {
    const number = Number(block);
    return this.sourceBlocks.find((candidate) => candidate.number === `#${number}`) ?? makeBlock(number);
  }

  async getBlockDetail(block: string | number): Promise<ExplorerBlockDetail> {
    const summary = await this.getBlockSummary(block);
    const blockNumber = Number(block);
    return {
      block: summary,
      blockNumber,
      blockHash: `0x${blockNumber}`,
      observedObjects: [],
      events: [],
      extrinsics: [],
      fetchedAt: Date.now(),
      source: "rpc"
    };
  }

  getStatus(): ExplorerConnectionStatus {
    return {
      phase: "live",
      endpoint: this.endpoint,
      message: "Fake source connected.",
      usingCache: false
    };
  }
}

class HangingDataSource extends FakeDataSource {
  constructor() {
    super([]);
  }

  async connect(): Promise<void> {
    await new Promise(() => undefined);
  }
}

class RejectingDataSource extends FakeDataSource {
  constructor() {
    super([]);
  }

  async connect(): Promise<void> {
    throw new Error("connect rejected");
  }
}

function makeBlock(number: number): ExplorerBlock {
  return {
    ...blocks[0],
    number: `#${number}`,
    hash: `0x${number}`,
    finality: number % 2 === 0 ? "finalized" : "best_block"
  };
}

function waitForMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
