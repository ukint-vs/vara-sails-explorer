import { describe, expect, it } from "vitest";
import {
  DEFAULT_CUSTOM_ENDPOINT,
  DEFAULT_ENDPOINT_ID,
  getEndpointById,
  loadRpcSettings,
  saveRpcSettings,
  validateRpcUrl
} from "../lib/live-explorer/settings";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

describe("live explorer endpoint settings", () => {
  it("accepts only websocket RPC URLs", () => {
    expect(validateRpcUrl("wss://testnet.vara.network")).toEqual({
      valid: true,
      value: "wss://testnet.vara.network"
    });
    expect(validateRpcUrl("ws://127.0.0.1:9944")).toEqual({
      valid: true,
      value: "ws://127.0.0.1:9944"
    });
    expect(validateRpcUrl("https://rpc.vara.network")).toEqual({
      valid: false,
      error: "Use a ws:// or wss:// endpoint."
    });
  });

  it("does not persist invalid custom endpoints", () => {
    const storage = new MemoryStorage();

    const saved = saveRpcSettings(
      {
        selectedEndpointId: "custom",
        customEndpointUrl: "https://not-websocket.example"
      },
      storage
    );

    expect(saved).toEqual({
      selectedEndpointId: "custom",
      customEndpointUrl: DEFAULT_CUSTOM_ENDPOINT
    });
    expect(loadRpcSettings(storage)).toEqual(saved);
  });

  it("falls back to the testnet preset for corrupted settings", () => {
    const storage = new MemoryStorage();
    storage.setItem("sails-explorer:rpc-settings", "{");

    expect(loadRpcSettings(storage)).toEqual({
      selectedEndpointId: DEFAULT_ENDPOINT_ID,
      customEndpointUrl: DEFAULT_CUSTOM_ENDPOINT
    });
  });

  it("returns a custom endpoint object with the saved URL", () => {
    expect(getEndpointById("custom", "wss://custom.vara.example")).toMatchObject({
      id: "custom",
      label: "Custom endpoint",
      url: "wss://custom.vara.example",
      kind: "custom"
    });
  });
});
