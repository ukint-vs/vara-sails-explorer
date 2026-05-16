import { describe, expect, it, vi } from "vitest";
import { DecodeResolverClient, type GearApiFactory } from "../lib/decode/resolver-client";
import { RPC_ENDPOINTS } from "../lib/live-explorer/settings";

const programId = "0x1111111111111111111111111111111111111111111111111111111111111111";
const codeId = "0x2222222222222222222222222222222222222222222222222222222222222222";

describe("decode resolver client", () => {
  it("resolves program ID to code bytes without using ExplorerRuntime", async () => {
    const disconnect = vi.fn();
    const client = new DecodeResolverClient(async () => ({
      program: {
        exists: async () => true,
        codeId: async () => codeId
      },
      code: {
        exists: async () => true
      },
      query: {
        gearProgram: {
          originalCodeStorage: async () => ({
            isNone: false,
            unwrap: () => ({
              toU8a: () => new Uint8Array([0, 97, 115, 109])
            })
          })
        }
      },
      disconnect
    }));

    const result = await client.resolve({ source: "program_id", id: programId, endpoint: RPC_ENDPOINTS[0] });

    expect(result).toMatchObject({
      ok: true,
      programId,
      codeId,
      byteLength: 4
    });
    await client.close();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it("returns missing program and missing code statuses", async () => {
    const client = new DecodeResolverClient(async () => ({
      program: {
        exists: async () => false,
        codeId: async () => codeId
      },
      code: {
        exists: async () => false
      },
      disconnect: vi.fn()
    }));

    await expect(client.resolve({ source: "program_id", id: programId, endpoint: RPC_ENDPOINTS[0] })).resolves.toMatchObject({
      ok: false,
      status: "program_not_found"
    });
    await expect(client.resolve({ source: "code_id", id: codeId, endpoint: RPC_ENDPOINTS[0] })).resolves.toMatchObject({
      ok: false,
      status: "code_not_found"
    });
  });

  it("normalizes RPC timeout", async () => {
    const factory: GearApiFactory = async () => ({
      program: {
        exists: () => new Promise<boolean>(() => undefined),
        codeId: async () => codeId
      },
      code: {
        exists: async () => true
      },
      disconnect: vi.fn()
    });
    const client = new DecodeResolverClient(factory);

    await expect(
      client.resolve({ source: "program_id", id: programId, endpoint: RPC_ENDPOINTS[0], timeoutMs: 1 })
    ).resolves.toMatchObject({
      ok: false,
      status: "rpc_timeout",
      category: "timeout"
    });
  });
});
