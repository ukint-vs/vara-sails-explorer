export const DECODE_LIMITS = {
  payloadBytes: 256 * 1024,
  idlBytes: 1024 * 1024,
  wasmBytes: 8 * 1024 * 1024,
  codeBytes: 8 * 1024 * 1024
} as const;

export const DECODE_TIMEOUTS = {
  parserInitMs: 5_000,
  decodeMs: 10_000,
  extractMs: 10_000,
  rpcMs: 10_000,
  workerIdleMs: 90_000
} as const;

export const LOCAL_SAILS_SOURCE = {
  path: "/Users/ukintvs/Documents/projects/sails",
  commit: "9077b7d04322d098b96379c904380d0a445c5e04",
  tag: "js/v1.0.0-beta.2",
  tarball: "../sails/js/sails-js-0.5.1.tgz"
} as const;
