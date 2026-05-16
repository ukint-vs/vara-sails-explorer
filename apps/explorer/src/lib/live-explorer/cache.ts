import type { ExplorerBlock } from "../../data/types";
import type { CachedBlockDetail, CachedBlockSummaries, ExplorerBlockDetail } from "./types";

const DB_NAME = "sails-explorer-live";
const DB_VERSION = 1;
const BLOCK_STORE = "blockSummaries";
const DETAIL_STORE = "blockDetails";
const SUMMARY_LIMIT = 512;
const DETAIL_LIMIT = 50;

type DetailRecord = CachedBlockDetail & {
  key: string;
};

export class ExplorerCache {
  private dbPromise: Promise<IDBDatabase | undefined> | undefined;
  private memoryBlocks = new Map<string, CachedBlockSummaries>();
  private memoryDetails = new Map<string, DetailRecord>();

  async readBlocks(endpointKey: string): Promise<ExplorerBlock[]> {
    const memory = this.memoryBlocks.get(endpointKey);
    if (memory) {
      return memory.blocks;
    }

    const db = await this.openDb();
    if (!db) {
      return [];
    }

    try {
      const record = await requestResult<CachedBlockSummaries | undefined>(
        db.transaction(BLOCK_STORE, "readonly").objectStore(BLOCK_STORE).get(endpointKey)
      );
      if (record) {
        this.memoryBlocks.set(endpointKey, record);
      }
      return record?.blocks ?? [];
    } catch {
      return [];
    }
  }

  async writeBlocks(endpointKey: string, blocks: ExplorerBlock[]): Promise<void> {
    const record = {
      endpointKey,
      blocks: blocks.slice(0, SUMMARY_LIMIT),
      updatedAt: Date.now()
    };
    this.memoryBlocks.set(endpointKey, record);

    const db = await this.openDb();
    if (!db) {
      return;
    }

    try {
      await requestResult(db.transaction(BLOCK_STORE, "readwrite").objectStore(BLOCK_STORE).put(record));
    } catch {
      // Memory already has the current snapshot, so quota/private-mode failures remain usable.
    }
  }

  async readDetail(endpointKey: string, blockId: string): Promise<ExplorerBlockDetail | undefined> {
    const key = detailKey(endpointKey, blockId);
    const memory = this.memoryDetails.get(key);
    if (memory) {
      return cachedDetail(memory.detail);
    }

    const db = await this.openDb();
    if (!db) {
      return undefined;
    }

    try {
      const record = await requestResult<DetailRecord | undefined>(
        db.transaction(DETAIL_STORE, "readonly").objectStore(DETAIL_STORE).get(key)
      );
      if (record) {
        this.memoryDetails.set(key, record);
      }
      return record ? cachedDetail(record.detail) : undefined;
    } catch {
      return undefined;
    }
  }

  async writeDetail(endpointKey: string, blockId: string, detail: ExplorerBlockDetail): Promise<void> {
    const record: DetailRecord = {
      key: detailKey(endpointKey, blockId),
      endpointKey,
      blockId,
      detail,
      updatedAt: Date.now()
    };
    this.memoryDetails.set(record.key, record);
    pruneMemoryDetails(this.memoryDetails, endpointKey);

    const db = await this.openDb();
    if (!db) {
      return;
    }

    try {
      const transaction = db.transaction(DETAIL_STORE, "readwrite");
      const done = transactionDone(transaction);
      const store = transaction.objectStore(DETAIL_STORE);
      store.put(record);
      await pruneIndexedDetails(store, endpointKey);
      await done;
    } catch {
      // Memory fallback remains valid if IndexedDB cannot persist the detail.
    }
  }

  async clearEndpoint(endpointKey: string): Promise<void> {
    this.memoryBlocks.delete(endpointKey);
    for (const key of this.memoryDetails.keys()) {
      if (key.startsWith(`${endpointKey}:`)) {
        this.memoryDetails.delete(key);
      }
    }

    const db = await this.openDb();
    if (!db) {
      return;
    }

    try {
      const transaction = db.transaction([BLOCK_STORE, DETAIL_STORE], "readwrite");
      const done = transactionDone(transaction);
      transaction.objectStore(BLOCK_STORE).delete(endpointKey);
      const details = transaction.objectStore(DETAIL_STORE);
      const endpointRecords = await requestResult<DetailRecord[]>(details.index("endpointKey").getAll(endpointKey));
      for (const record of endpointRecords) {
        details.delete(record.key);
      }
      await done;
    } catch {
      // Clearing memory is enough to keep the current session honest.
    }
  }

  async close(): Promise<void> {
    const db = await this.dbPromise;
    db?.close();
    this.dbPromise = undefined;
  }

  private async openDb(): Promise<IDBDatabase | undefined> {
    if (typeof indexedDB === "undefined") {
      return undefined;
    }

    this.dbPromise ??= new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(BLOCK_STORE)) {
          db.createObjectStore(BLOCK_STORE, { keyPath: "endpointKey" });
        }
        if (!db.objectStoreNames.contains(DETAIL_STORE)) {
          const store = db.createObjectStore(DETAIL_STORE, { keyPath: "key" });
          store.createIndex("endpointKey", "endpointKey", { unique: false });
          store.createIndex("updatedAt", "updatedAt", { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(undefined);
      request.onblocked = () => resolve(undefined);
    });

    return this.dbPromise;
  }
}

export function detailKey(endpointKey: string, blockId: string): string {
  return `${endpointKey}:${blockId}`;
}

function cachedDetail(detail: ExplorerBlockDetail): ExplorerBlockDetail {
  return {
    ...detail,
    observedObjects: detail.observedObjects ?? [],
    source: "cache"
  };
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function pruneMemoryDetails(records: Map<string, DetailRecord>, endpointKey: string): void {
  for (const stale of staleDetailRecords([...records.values()], endpointKey)) {
    records.delete(stale.key);
  }
}

async function pruneIndexedDetails(store: IDBObjectStore, endpointKey: string): Promise<void> {
  const endpointRecords = await requestResult<DetailRecord[]>(store.index("endpointKey").getAll(endpointKey));
  for (const stale of staleDetailRecords(endpointRecords, endpointKey)) {
    store.delete(stale.key);
  }
}

function staleDetailRecords(records: DetailRecord[], endpointKey: string): DetailRecord[] {
  return records
    .filter((record) => record.endpointKey === endpointKey)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(DETAIL_LIMIT);
}
