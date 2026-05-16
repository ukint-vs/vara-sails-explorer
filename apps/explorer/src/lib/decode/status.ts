import type { DecodeStatusCategory, DecodeStatusCode, SailsUnknownReason } from "./types";

export type DecodeStatusMeta = {
  label: string;
  category: DecodeStatusCategory;
  tone: "success" | "info" | "warning" | "danger" | "neutral";
  recovery: string;
};

export const sailsReasonLabels: Record<SailsUnknownReason, string> = {
  "too-short": "Payload is shorter than the 16-byte Sails header.",
  "no-magic": "Payload does not start with the Sails header magic bytes.",
  "bad-version": "Payload uses an unsupported Sails header version.",
  "bad-reserved": "Sails v1 reserved header byte must be zero.",
  "bad-hlen": "Sails v1 header length must be exactly 16 bytes.",
  "no-service": "Header interface_id does not match any service in this IDL.",
  "no-entry": "Header entry_id does not match any function, event, or constructor.",
  "ambiguous-route": "routeIdx is 0 and more than one route can match.",
  "decode-failed": "SCALE bytes could not decode against the resolved IDL type.",
  "trailing-bytes": "Payload has bytes remaining after the decoded value.",
  "entry-mismatch": "The selected decode kind does not match the resolved entry.",
  "no-throws-type": "This function does not declare a throws type."
};

export const decodeStatusRegistry: Record<DecodeStatusCode, DecodeStatusMeta> = {
  decoded: {
    label: "Decoded",
    category: "success",
    tone: "success",
    recovery: "Decoded output is available with provenance and route details."
  },
  missing_idl: {
    label: "Missing IDL",
    category: "idl_failure",
    tone: "warning",
    recovery: "Paste an IDL, upload Wasm with embedded sails:idl, or resolve a program/code ID."
  },
  invalid_idl: {
    label: "Invalid IDL",
    category: "idl_failure",
    tone: "danger",
    recovery: "Check the IDL syntax and parser error details."
  },
  no_embedded_idl: {
    label: "No embedded IDL",
    category: "idl_failure",
    tone: "warning",
    recovery: "Use another Wasm/code artifact or paste the matching IDL."
  },
  invalid_wasm: {
    label: "Invalid Wasm",
    category: "idl_failure",
    tone: "danger",
    recovery: "Upload the original program Wasm/code bytes containing the sails:idl custom section."
  },
  oversized_payload: {
    label: "Payload too large",
    category: "idl_failure",
    tone: "danger",
    recovery: "Use a payload at or below the Decode Lab byte cap."
  },
  oversized_idl: {
    label: "IDL too large",
    category: "idl_failure",
    tone: "danger",
    recovery: "Use an IDL at or below the Decode Lab IDL cap."
  },
  oversized_wasm: {
    label: "Wasm too large",
    category: "idl_failure",
    tone: "danger",
    recovery: "Use Wasm/code bytes at or below the Decode Lab cap."
  },
  oversized_code: {
    label: "Code too large",
    category: "idl_failure",
    tone: "danger",
    recovery: "Use a smaller code artifact or paste the IDL directly."
  },
  program_not_found: {
    label: "Program not found",
    category: "rpc_failure",
    tone: "warning",
    recovery: "Check the program ID and selected endpoint."
  },
  code_not_found: {
    label: "Code not found",
    category: "rpc_failure",
    tone: "warning",
    recovery: "Check the code ID and selected endpoint."
  },
  original_code_missing: {
    label: "Original code missing",
    category: "rpc_failure",
    tone: "warning",
    recovery: "The code exists, but original code bytes were not available from this endpoint."
  },
  rpc_timeout: {
    label: "RPC timeout",
    category: "timeout",
    tone: "danger",
    recovery: "Retry or switch endpoint."
  },
  rpc_failure: {
    label: "RPC failure",
    category: "rpc_failure",
    tone: "danger",
    recovery: "Check endpoint health and retry."
  },
  cache_failure: {
    label: "Cache failure",
    category: "cache_failure",
    tone: "warning",
    recovery: "The current session can continue with memory-only cache."
  },
  worker_timeout: {
    label: "Worker timeout",
    category: "timeout",
    tone: "danger",
    recovery: "Retry after clearing the source or reducing input size."
  },
  worker_failure: {
    label: "Worker failure",
    category: "worker_failure",
    tone: "danger",
    recovery: "Retry after resetting the Decode Lab worker."
  },
  sails_unknown: {
    label: "Sails unknown",
    category: "sails_unknown",
    tone: "warning",
    recovery: "Inspect header fields, route candidates, and the selected decode kind."
  },
  codec_mismatch: {
    label: "Codec mismatch",
    category: "idl_failure",
    tone: "warning",
    recovery: "Entry is ethabi-only and cannot be decoded through the SCALE header path. Use the Vara.eth toolchain instead."
  }
};

export function statusMeta(status: DecodeStatusCode): DecodeStatusMeta {
  return decodeStatusRegistry[status];
}
