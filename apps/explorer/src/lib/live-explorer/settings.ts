import type { EndpointValidationResult, RpcEndpoint, RpcEndpointSettings } from "./types";

export const TEST_MODE_STORAGE_KEY = "sails-explorer:test-source";
export const SETTINGS_STORAGE_KEY = "sails-explorer:rpc-settings";
export const RPC_SETTINGS_CHANGED_EVENT = "sails-explorer:rpc-settings-changed";
export const DEFAULT_ENDPOINT_ID = "vara-testnet";
export const DEFAULT_CUSTOM_ENDPOINT = "ws://127.0.0.1:9944";

export const RPC_ENDPOINTS: RpcEndpoint[] = [
  {
    id: DEFAULT_ENDPOINT_ID,
    label: "Vara testnet",
    url: "wss://testnet.vara.network",
    kind: "vara",
    readonly: true
  },
  {
    id: "vara-mainnet",
    label: "Vara mainnet",
    url: "wss://rpc.vara.network",
    kind: "vara",
    readonly: true
  },
  {
    id: "local",
    label: "Local node",
    url: DEFAULT_CUSTOM_ENDPOINT,
    kind: "local",
    readonly: true
  },
  {
    id: "custom",
    label: "Custom endpoint",
    url: DEFAULT_CUSTOM_ENDPOINT,
    kind: "custom"
  }
];

export const DEFAULT_RPC_SETTINGS: RpcEndpointSettings = {
  selectedEndpointId: DEFAULT_ENDPOINT_ID,
  customEndpointUrl: DEFAULT_CUSTOM_ENDPOINT
};

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function validateRpcUrl(value: string): EndpointValidationResult {
  const trimmed = value.trim();

  if (!trimmed) {
    return { valid: false, error: "Endpoint is required." };
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "ws:" && url.protocol !== "wss:") {
      return { valid: false, error: "Use a ws:// or wss:// endpoint." };
    }
    return { valid: true, value: trimmed };
  } catch {
    return { valid: false, error: "Endpoint must be a valid WebSocket URL." };
  }
}

export function getEndpointById(endpointId: string, customEndpointUrl = DEFAULT_CUSTOM_ENDPOINT): RpcEndpoint {
  const endpoint = RPC_ENDPOINTS.find((candidate) => candidate.id === endpointId) ?? RPC_ENDPOINTS[0];

  if (endpoint.id !== "custom") {
    return endpoint;
  }

  return {
    ...endpoint,
    url: customEndpointUrl
  };
}

export function endpointKey(endpoint: RpcEndpoint): string {
  return `${endpoint.id}:${endpoint.url}`;
}

export function loadRpcSettings(storage: StorageLike | undefined = getBrowserStorage()): RpcEndpointSettings {
  if (!storage) {
    return DEFAULT_RPC_SETTINGS;
  }

  const raw = storage.getItem(SETTINGS_STORAGE_KEY);
  if (!raw) {
    return DEFAULT_RPC_SETTINGS;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<RpcEndpointSettings>;
    const selectedEndpointId =
      typeof parsed.selectedEndpointId === "string" &&
      RPC_ENDPOINTS.some((endpoint) => endpoint.id === parsed.selectedEndpointId)
        ? parsed.selectedEndpointId
        : DEFAULT_ENDPOINT_ID;
    const customEndpointUrl = validateRpcUrl(parsed.customEndpointUrl ?? "").valid
      ? parsed.customEndpointUrl ?? DEFAULT_CUSTOM_ENDPOINT
      : DEFAULT_CUSTOM_ENDPOINT;

    return {
      selectedEndpointId,
      customEndpointUrl
    };
  } catch {
    return DEFAULT_RPC_SETTINGS;
  }
}

export function saveRpcSettings(
  settings: RpcEndpointSettings,
  storage: StorageLike | undefined = getBrowserStorage()
): RpcEndpointSettings {
  const selectedEndpointId = RPC_ENDPOINTS.some((endpoint) => endpoint.id === settings.selectedEndpointId)
    ? settings.selectedEndpointId
    : DEFAULT_ENDPOINT_ID;
  const customValidation = validateRpcUrl(settings.customEndpointUrl);
  const customEndpointUrl = customValidation.valid ? customValidation.value : DEFAULT_CUSTOM_ENDPOINT;
  const nextSettings = { selectedEndpointId, customEndpointUrl };

  storage?.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
  dispatchRpcSettingsChanged(nextSettings);
  return nextSettings;
}

export function clearRpcSettings(storage: StorageLike | undefined = getBrowserStorage()): void {
  storage?.removeItem(SETTINGS_STORAGE_KEY);
}

export function isForcedFixtureMode(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  return params.get("source") === "fixture" || window.localStorage.getItem(TEST_MODE_STORAGE_KEY) === "fixture";
}

function getBrowserStorage(): StorageLike | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.localStorage;
}

function dispatchRpcSettingsChanged(settings: RpcEndpointSettings): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent<RpcEndpointSettings>(RPC_SETTINGS_CHANGED_EVENT, { detail: settings }));
}
