import type {
  ChipTone,
  DataSourceStatus,
  DecodeStatus,
  ExecutionStatus,
  FinalityStatus,
  ProgramHealth,
  StatusMeta,
  TrustStatus
} from "../data/types";

export const executionStatusMeta: Record<ExecutionStatus, StatusMeta> = {
  queued: { label: "Queued", tone: "warn" },
  included: { label: "Included", tone: "info" },
  executed: { label: "Executed", tone: "success" },
  replied: { label: "Replied", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  expired: { label: "Expired", tone: "neutral" }
};

export const decodeStatusMeta: Record<DecodeStatus, StatusMeta> = {
  decoded: { label: "Decoded", tone: "steel" },
  missing_idl: { label: "Missing IDL", tone: "warn" },
  unknown_interface: { label: "Unknown interface", tone: "warn" },
  bad_header: { label: "Bad header", tone: "danger" },
  codec_mismatch: { label: "Codec mismatch", tone: "warn" },
  not_sails_payload: { label: "Not Sails", tone: "neutral" },
  decode_failure: { label: "Decode failed", tone: "danger" },
  trailing_bytes: { label: "Trailing bytes", tone: "warn" }
};

export const finalityStatusMeta: Record<FinalityStatus, StatusMeta> = {
  best_block: { label: "Best block", tone: "info" },
  finalized: { label: "Finalized", tone: "success" },
  pre_confirmed: { label: "Pre-confirmed", tone: "info" },
  l1_final: { label: "L1 final", tone: "success" },
  superseded: { label: "Superseded", tone: "danger" }
};

export const dataSourceMeta: Record<DataSourceStatus, StatusMeta> = {
  direct_rpc: { label: "Direct RPC", tone: "info" },
  local_cache: { label: "Local cache", tone: "neutral" },
  static_registry: { label: "Static registry", tone: "steel" },
  indexed: { label: "Indexed", tone: "success" },
  mixed: { label: "Mixed", tone: "brand" }
};

export const trustStatusMeta: Record<TrustStatus, StatusMeta> = {
  verified_source: { label: "Verified source", tone: "steel" },
  embedded_idl: { label: "Embedded IDL", tone: "steel" },
  registry_idl: { label: "Registry IDL", tone: "steel" },
  user_idl: { label: "User IDL", tone: "warn" },
  unknown: { label: "Unknown", tone: "neutral" }
};

export const programHealthMeta: Record<ProgramHealth, StatusMeta> = {
  active: { label: "Active", tone: "success" },
  low_executable_balance: { label: "Balance watch", tone: "warn" },
  halted: { label: "Halted", tone: "danger" },
  exited: { label: "Exited", tone: "neutral" },
  unknown: { label: "Unknown", tone: "neutral" }
};

export function toneClass(tone: ChipTone): string {
  return `chip ${tone}`;
}

export function labelForDecodeStatus(status: DecodeStatus): string {
  return decodeStatusMeta[status].label;
}
