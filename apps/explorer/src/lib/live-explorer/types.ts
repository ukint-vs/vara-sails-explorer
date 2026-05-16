import type { ExplorerBlock, NetStat } from "../../data/types";

export type RpcEndpointKind = "vara" | "gear" | "local" | "custom";

export type RpcEndpoint = {
  id: string;
  label: string;
  url: string;
  kind: RpcEndpointKind;
  readonly?: boolean;
};

export type RpcEndpointSettings = {
  selectedEndpointId: string;
  customEndpointUrl: string;
};

export type ExplorerConnectionPhase = "idle" | "connecting" | "live" | "degraded" | "cache_only" | "error";

export type ExplorerBlockRef = {
  number?: number;
  hash?: string;
};

export type ExplorerHeads = {
  best?: ExplorerBlockRef;
  finalized?: ExplorerBlockRef;
  updatedAt: number;
};

export type ExplorerConnectionStatus = {
  phase: ExplorerConnectionPhase;
  endpoint: RpcEndpoint;
  message: string;
  usingCache: boolean;
  lastUpdated?: number;
  connectedAt?: number;
  bestBlock?: number;
  finalizedBlock?: number;
  error?: string;
};

export type ExplorerEvent = {
  id: string;
  index: number;
  phase: string;
  section: string;
  method: string;
  summary: string;
  raw: unknown;
};

export type ExplorerExtrinsic = {
  id: string;
  index: number;
  hash: string;
  section: string;
  method: string;
  signer: string;
  success: boolean | null;
  summary: string;
  raw: unknown;
};

export type ExplorerObservedObject = {
  kind: "program" | "message" | "code" | "event";
  id: string;
  label: string;
  source: "rpc_event" | "rpc_extrinsic" | "fixture";
  blockNumber: number;
  confidence: "explicit" | "derived";
};

export type ExplorerBlockDetail = {
  block: ExplorerBlock;
  blockNumber: number;
  blockHash: string;
  observedObjects: ExplorerObservedObject[];
  events: ExplorerEvent[];
  extrinsics: ExplorerExtrinsic[];
  fetchedAt: number;
  source: "rpc" | "cache" | "fixture";
};

export type ExplorerRuntimeSnapshot = {
  status: ExplorerConnectionStatus;
  blocks: ExplorerBlock[];
  stats: NetStat[];
  updatedAt: number;
};

export type ExplorerRuntimeListener = (snapshot: ExplorerRuntimeSnapshot) => void;

export type Unsubscribe = () => void | Promise<void>;

export type EndpointValidationResult =
  | { valid: true; value: string }
  | { valid: false; error: string };

export type CachedBlockSummaries = {
  endpointKey: string;
  blocks: ExplorerBlock[];
  updatedAt: number;
};

export type CachedBlockDetail = {
  endpointKey: string;
  blockId: string;
  detail: ExplorerBlockDetail;
  updatedAt: number;
};
