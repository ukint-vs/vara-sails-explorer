export type ChipTone = "brand" | "success" | "info" | "warn" | "danger" | "steel" | "neutral";

export type ExecutionStatus = "queued" | "included" | "executed" | "replied" | "failed" | "expired";
export type DecodeStatus =
  | "decoded"
  | "missing_idl"
  | "unknown_interface"
  | "bad_header"
  | "codec_mismatch"
  | "not_sails_payload"
  | "decode_failure"
  | "trailing_bytes";
export type FinalityStatus = "best_block" | "finalized" | "pre_confirmed" | "l1_final" | "superseded";
export type DataSourceStatus = "direct_rpc" | "local_cache" | "static_registry" | "indexed" | "mixed";
export type TrustStatus = "verified_source" | "embedded_idl" | "registry_idl" | "user_idl" | "unknown";
export type ProgramHealth = "active" | "low_executable_balance" | "halted" | "exited" | "unknown";

export type StatusMeta = {
  label: string;
  tone: ChipTone;
  description?: string;
};

export type ExplorerMessage = {
  id: string;
  time: string;
  age: string;
  execution: ExecutionStatus;
  decode: DecodeStatus;
  finality: FinalityStatus;
  dataSource: DataSourceStatus;
  trust: TrustStatus;
  program: string;
  programId: string;
  codeId: string;
  caller: string;
  activity: string;
  result: string;
  block: string;
  payload: string;
};

export type ExplorerBlock = {
  number: string;
  hash: string;
  timestamp: string;
  finality: FinalityStatus;
  extrinsics: number;
  events: number;
  gearMessages: number;
  decodedSails: number;
};

export type ExplorerProgram = {
  name: string;
  programId: string;
  codeId: string;
  idlHash: string;
  health: ProgramHealth;
  trust: TrustStatus;
  decodeCoverage: string;
  messages24h: string;
};

export type Metric = {
  label: string;
  value: string;
  note: string;
  tone: ChipTone;
  badge: string;
  progress: number;
};

export type Variant = {
  slug: string;
  name: string;
  caption: string;
  route: string;
  role: string;
};
