import type { CachedIdlResolution, DecodeAliasRecord, DecodeAliasType, DecodeProvenance, IdlRecord } from "./types";

const DB_NAME = "sails-explorer-decode";
const DB_VERSION = 1;
const IDL_STORE = "idls";
const ALIAS_STORE = "aliases";

type StorageLike = typeof indexedDB;

export class DecodeIdlCache {
  private dbPromise: Promise<IDBDatabase | undefined> | undefined;
  private memoryIdls = new Map<string, IdlRecord>();
  private memoryAliases = new Map<string, DecodeAliasRecord>();

  constructor(private readonly storage: StorageLike | undefined = getIndexedDb()) {}

  async readByHash(idlHash: string): Promise<CachedIdlResolution> {
    const memory = this.memoryIdls.get(idlHash);
    if (memory) {
      return { ok: true, record: memory };
    }

    const db = await this.openDb();
    if (!db) {
      return { ok: false, status: "missing_idl", message: "IDL is not cached in this session." };
    }

    try {
      const record = await requestResult<IdlRecord | undefined>(
        db.transaction(IDL_STORE, "readonly").objectStore(IDL_STORE).get(idlHash)
      );
      if (!record) {
        return { ok: false, status: "missing_idl", message: "IDL hash was not found in cache." };
      }
      this.memoryIdls.set(record.idlHash, record);
      return { ok: true, record };
    } catch (error) {
      return cacheFailure(error);
    }
  }

  async readByAlias(aliasType: DecodeAliasType, aliasId: string): Promise<CachedIdlResolution> {
    const key = aliasKey(aliasType, aliasId);
    const memoryAlias = this.memoryAliases.get(key);
    if (memoryAlias) {
      const memoryRecord = this.memoryIdls.get(memoryAlias.idlHash);
      if (memoryRecord) {
        return { ok: true, record: memoryRecord, alias: memoryAlias };
      }
    }

    const db = await this.openDb();
    if (!db) {
      return { ok: false, status: "missing_idl", message: "Alias is not cached in this session." };
    }

    try {
      const alias = await requestResult<DecodeAliasRecord | undefined>(
        db.transaction(ALIAS_STORE, "readonly").objectStore(ALIAS_STORE).get(key)
      );
      if (!alias) {
        return { ok: false, status: "missing_idl", message: "Alias was not found in cache." };
      }

      this.memoryAliases.set(alias.key, alias);
      const record = await this.readByHash(alias.idlHash);
      if (!record.ok) {
        return record;
      }
      return { ok: true, record: record.record, alias };
    } catch (error) {
      return cacheFailure(error);
    }
  }

  async writeIdl(record: IdlRecord, aliases: Array<Omit<DecodeAliasRecord, "key" | "idlHash" | "updatedAt">> = []): Promise<void> {
    const safeRecord = stripTransientFields(record);
    this.memoryIdls.set(safeRecord.idlHash, safeRecord);

    const aliasRecords = aliases.map((alias) => ({
      ...alias,
      key: aliasKey(alias.aliasType, alias.aliasId),
      idlHash: safeRecord.idlHash,
      updatedAt: Date.now()
    }));
    for (const alias of aliasRecords) {
      this.memoryAliases.set(alias.key, alias);
    }

    const db = await this.openDb();
    if (!db) {
      return;
    }

    try {
      const transaction = db.transaction([IDL_STORE, ALIAS_STORE], "readwrite");
      const done = transactionDone(transaction);
      transaction.objectStore(IDL_STORE).put(safeRecord);
      const aliasStore = transaction.objectStore(ALIAS_STORE);
      for (const alias of aliasRecords) {
        aliasStore.put(alias);
      }
      await done;
    } catch {
      // Memory fallback already contains the IDL and aliases for this session.
    }
  }

  async clear(): Promise<void> {
    this.memoryIdls.clear();
    this.memoryAliases.clear();

    const db = await this.openDb();
    if (!db) {
      return;
    }

    try {
      const transaction = db.transaction([IDL_STORE, ALIAS_STORE], "readwrite");
      const done = transactionDone(transaction);
      transaction.objectStore(IDL_STORE).clear();
      transaction.objectStore(ALIAS_STORE).clear();
      await done;
    } catch {
      // Memory has already been cleared.
    }
  }

  async close(): Promise<void> {
    const db = await this.dbPromise;
    db?.close();
    this.dbPromise = undefined;
  }

  memorySnapshotForTest(): { idls: IdlRecord[]; aliases: DecodeAliasRecord[] } {
    return {
      idls: [...this.memoryIdls.values()],
      aliases: [...this.memoryAliases.values()]
    };
  }

  private async openDb(): Promise<IDBDatabase | undefined> {
    if (!this.storage) {
      return undefined;
    }

    this.dbPromise ??= new Promise((resolve) => {
      const storage = this.storage;
      if (!storage) {
        resolve(undefined);
        return;
      }
      const request = storage.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDL_STORE)) {
          db.createObjectStore(IDL_STORE, { keyPath: "idlHash" });
        }
        if (!db.objectStoreNames.contains(ALIAS_STORE)) {
          const store = db.createObjectStore(ALIAS_STORE, { keyPath: "key" });
          store.createIndex("idlHash", "idlHash", { unique: false });
          store.createIndex("aliasType", "aliasType", { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(undefined);
      request.onblocked = () => resolve(undefined);
    });

    return this.dbPromise;
  }
}

export function aliasKey(aliasType: DecodeAliasType, aliasId: string): string {
  return `${aliasType}:${aliasId.trim().toLowerCase()}`;
}

export function makeIdlRecord(idlHash: string, idlText: string, provenance: DecodeProvenance): IdlRecord {
  const updatedAt = Date.now();
  return {
    idlHash,
    idlText,
    provenance: {
      ...provenance,
      idlHash,
      updatedAt
    },
    updatedAt
  };
}

function stripTransientFields(record: IdlRecord): IdlRecord {
  return {
    idlHash: record.idlHash,
    idlText: record.idlText,
    updatedAt: record.updatedAt,
    provenance: {
      source: record.provenance.source,
      trust: record.provenance.trust,
      label: record.provenance.label,
      idlHash: record.provenance.idlHash,
      programId: record.provenance.programId,
      codeId: record.provenance.codeId,
      endpointLabel: record.provenance.endpointLabel,
      cacheHit: record.provenance.cacheHit,
      warnings: record.provenance.warnings,
      updatedAt: record.provenance.updatedAt
    }
  };
}

function cacheFailure(error: unknown): CachedIdlResolution {
  return {
    ok: false,
    status: "cache_failure",
    message: error instanceof Error ? error.message : "Decode cache failed."
  };
}

function getIndexedDb(): StorageLike | undefined {
  return typeof indexedDB === "undefined" ? undefined : indexedDB;
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
