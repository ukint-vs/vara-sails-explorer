import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { blocks } from "../data/fixtures";
import { ExplorerCache } from "../lib/live-explorer/cache";
import type { ExplorerBlockDetail } from "../lib/live-explorer/types";

const endpointKey = "testnet:wss://testnet.vara.network";

describe("live explorer cache", () => {
  let cache: ExplorerCache | undefined;

  beforeEach(async () => {
    await deleteDb("sails-explorer-live");
  });

  afterEach(async () => {
    await cache?.close();
    cache = undefined;
    vi.unstubAllGlobals();
  });

  it("stores and reads block summaries in IndexedDB", async () => {
    cache = new ExplorerCache();

    await cache.writeBlocks(endpointKey, blocks);

    expect(await cache.readBlocks(endpointKey)).toEqual(blocks);
  });

  it("returns cached block detail with cache source", async () => {
    cache = new ExplorerCache();
    const detail = makeDetail(1);

    await cache.writeDetail(endpointKey, "1", detail);

    expect(await cache.readDetail(endpointKey, "1")).toMatchObject({
      blockNumber: 1,
      source: "cache"
    });
  });

  it("keeps a memory fallback when IndexedDB is unavailable", async () => {
    vi.stubGlobal("indexedDB", undefined);
    cache = new ExplorerCache();

    await cache.writeBlocks(endpointKey, blocks.slice(0, 2));

    expect(await cache.readBlocks(endpointKey)).toEqual(blocks.slice(0, 2));
  });

  it("bounds detail retention to the latest 50 records per endpoint", async () => {
    cache = new ExplorerCache();

    for (let index = 0; index < 55; index += 1) {
      await cache.writeDetail(endpointKey, String(index), makeDetail(index));
    }

    expect(await cache.readDetail(endpointKey, "0")).toBeUndefined();
    expect(await cache.readDetail(endpointKey, "54")).toMatchObject({ blockNumber: 54 });
  });
});

function makeDetail(blockNumber: number): ExplorerBlockDetail {
  return {
    block: {
      ...blocks[0],
      number: `#${blockNumber}`
    },
    blockNumber,
    blockHash: `0x${blockNumber}`,
    observedObjects: [],
    events: [],
    extrinsics: [],
    fetchedAt: Date.now(),
    source: "rpc"
  };
}

function deleteDb(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}
