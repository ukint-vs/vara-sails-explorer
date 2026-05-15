import type { RpcEndpoint } from "../live-explorer/types";

export type DecodeKind = "auto" | "call" | "reply" | "error" | "event" | "constructor";

export type IdlSourceMode = "pasted_idl" | "uploaded_idl" | "uploaded_wasm" | "program_id" | "code_id" | "cache";

export type IdlTrustLevel = "chain_embedded" | "user_supplied" | "cache" | "unverified" | "none";

export type DecodeStatusCategory =
  | "success"
  | "sails_unknown"
  | "idl_failure"
  | "rpc_failure"
  | "timeout"
  | "cache_failure"
  | "worker_failure";

export type DecodeStatusCode =
  | "decoded"
  | "missing_idl"
  | "invalid_idl"
  | "no_embedded_idl"
  | "invalid_wasm"
  | "oversized_payload"
  | "oversized_idl"
  | "oversized_wasm"
  | "oversized_code"
  | "program_not_found"
  | "code_not_found"
  | "original_code_missing"
  | "rpc_timeout"
  | "rpc_failure"
  | "cache_failure"
  | "worker_timeout"
  | "worker_failure"
  | "sails_unknown";

export type SailsUnknownReason =
  | "too-short"
  | "no-magic"
  | "bad-version"
  | "bad-reserved"
  | "bad-hlen"
  | "no-service"
  | "no-entry"
  | "ambiguous-route"
  | "decode-failed"
  | "trailing-bytes"
  | "entry-mismatch"
  | "no-throws-type";

export type DecodeHeaderView = {
  version: number;
  hlen: number;
  interfaceId: string;
  entryId: number;
  routeIdx: number;
  bytes: string;
};

export type DecodeEntryView = {
  kind: "command" | "query" | "event" | "ctor";
  service?: string;
  fn?: string;
  event?: string;
  ctor?: string;
  route?: string;
  interfaceId: string;
  entryId: number;
  routeIdx: number;
};

export type DecodeProvenance = {
  source: IdlSourceMode;
  trust: IdlTrustLevel;
  label: string;
  idlHash?: string;
  programId?: string;
  codeId?: string;
  endpointLabel?: string;
  cacheHit?: boolean;
  warnings?: string[];
  updatedAt: number;
};

export type DecodeTraceStep = {
  at: number;
  label: string;
  detail?: string;
  status: "info" | "success" | "warning" | "error";
  durationMs?: number;
};

export type DecodeSuccessResult = {
  ok: true;
  category: "success";
  status: "decoded";
  kind: Exclude<DecodeKind, "auto"> | "ctor-call";
  entry?: DecodeEntryView;
  header?: DecodeHeaderView;
  value: unknown;
  consumedLen?: number;
  candidates?: DecodeEntryView[];
  provenance: DecodeProvenance;
  trace: DecodeTraceStep[];
};

export type DecodeFailureResult = {
  ok: false;
  category: Exclude<DecodeStatusCategory, "success">;
  status: Exclude<DecodeStatusCode, "decoded">;
  message: string;
  reason?: SailsUnknownReason | string;
  detail?: string;
  header?: DecodeHeaderView;
  candidates?: DecodeEntryView[];
  provenance?: DecodeProvenance;
  trace: DecodeTraceStep[];
};

export type DecodeResult = DecodeSuccessResult | DecodeFailureResult;

export type IdlRecord = {
  idlHash: string;
  idlText: string;
  provenance: DecodeProvenance;
  updatedAt: number;
};

export type DecodeAliasType = "program" | "code";

export type DecodeAliasRecord = {
  key: string;
  aliasType: DecodeAliasType;
  aliasId: string;
  idlHash: string;
  codeId?: string;
  updatedAt: number;
};

export type CachedIdlResolution =
  | {
      ok: true;
      record: IdlRecord;
      alias?: DecodeAliasRecord;
    }
  | {
      ok: false;
      status: "missing_idl" | "cache_failure";
      message: string;
    };

export type ChainResolveRequest = {
  source: "program_id" | "code_id";
  id: string;
  endpoint: RpcEndpoint;
  timeoutMs?: number;
};

export type ChainResolveSuccess = {
  ok: true;
  source: "program_id" | "code_id";
  programId?: string;
  codeId: string;
  endpoint: RpcEndpoint;
  codeBytes: Uint8Array;
  byteLength: number;
  trace: DecodeTraceStep[];
};

export type ChainResolveFailure = {
  ok: false;
  category: "rpc_failure" | "timeout" | "idl_failure";
  status:
    | "program_not_found"
    | "code_not_found"
    | "original_code_missing"
    | "oversized_code"
    | "rpc_timeout"
    | "rpc_failure";
  message: string;
  detail?: string;
  trace: DecodeTraceStep[];
};

export type ChainResolveResult = ChainResolveSuccess | ChainResolveFailure;

export type IdlInspection = {
  services: Array<{
    name: string;
    interfaceId: string;
    routeIdx?: number;
    functions: Array<{ name: string; entryId: number; kind: "command" | "query" }>;
    events: Array<{ name: string; entryId: number }>;
  }>;
  constructors: Array<{ name: string; entryId: number }>;
  candidates: DecodeEntryView[];
};
