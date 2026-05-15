import { indexedDB as fakeIndexedDb } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { DecodeIdlCache, makeIdlRecord } from "../lib/decode/cache";
import { hashIdl } from "../lib/decode/bytes";
import { SAMPLE_IDL } from "../lib/decode/sample";

describe("decode IDL cache", () => {
  it("persists IDL text, provenance, and aliases without raw payload or code bytes", async () => {
    const cache = new DecodeIdlCache(fakeIndexedDb);
    const idlHash = await hashIdl(SAMPLE_IDL);
    const record = makeIdlRecord(idlHash, SAMPLE_IDL, {
      source: "program_id",
      trust: "chain_embedded",
      label: "Resolved from program ID",
      programId: "0x1111111111111111111111111111111111111111111111111111111111111111",
      codeId: "0x2222222222222222222222222222222222222222222222222222222222222222",
      updatedAt: Date.now()
    });

    await cache.writeIdl(record, [
      {
        aliasType: "program",
        aliasId: record.provenance.programId!,
        codeId: record.provenance.codeId
      },
      {
        aliasType: "code",
        aliasId: record.provenance.codeId!
      }
    ]);

    await expect(cache.readByHash(idlHash)).resolves.toMatchObject({ ok: true });
    await expect(cache.readByAlias("program", record.provenance.programId!)).resolves.toMatchObject({
      ok: true,
      alias: { codeId: record.provenance.codeId }
    });

    const serialized = JSON.stringify(cache.memorySnapshotForTest());
    expect(serialized).toContain("service Counter");
    expect(serialized).not.toContain("rawPayload");
    expect(serialized).not.toContain("wasmBytes");
    expect(serialized).not.toContain("codeBytes");

    await cache.clear();
    await cache.close();
  });

  it("uses memory fallback when IndexedDB is unavailable", async () => {
    const cache = new DecodeIdlCache(undefined);
    const idlHash = await hashIdl(SAMPLE_IDL);
    const record = makeIdlRecord(idlHash, SAMPLE_IDL, {
      source: "pasted_idl",
      trust: "user_supplied",
      label: "Pasted IDL",
      updatedAt: Date.now()
    });

    await cache.writeIdl(record);
    await expect(cache.readByHash(idlHash)).resolves.toMatchObject({
      ok: true,
      record: { idlHash }
    });
  });
});
