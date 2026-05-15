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

export const SAILS_JS_SOURCE = {
  packageName: "sails-js",
  packageVersion: "0.5.1",
  releaseTag: "js/v1.0.0-beta.2",
  tarball: "https://github.com/gear-tech/sails/releases/download/js/v1.0.0-beta.2/sails-js.tgz"
} as const;
