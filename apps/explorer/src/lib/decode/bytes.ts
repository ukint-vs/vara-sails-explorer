import { DECODE_LIMITS } from "./constants";

export type ByteParseResult = { ok: true; bytes: Uint8Array; hex: string } | { ok: false; message: string };

const HEX_RE = /^[0-9a-fA-F]*$/;

export function parseHexBytes(value: string): ByteParseResult {
  const normalized = value.trim().replace(/\s+/g, "").replace(/^0x/i, "");
  if (!normalized) {
    return { ok: false, message: "Paste a hex payload first." };
  }
  if (normalized.length % 2 !== 0) {
    return { ok: false, message: "Hex input must contain an even number of digits." };
  }
  if (!HEX_RE.test(normalized)) {
    return { ok: false, message: "Hex input contains non-hex characters." };
  }

  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
  }

  return { ok: true, bytes, hex: `0x${normalized.toLowerCase()}` };
}

export function bytesToHex(bytes: Uint8Array): string {
  let out = "0x";
  for (const byte of bytes) {
    out += byte.toString(16).padStart(2, "0");
  }
  return out;
}

export function enforceByteLimit(bytes: Uint8Array | string, limit: number, label: string): void {
  const size = typeof bytes === "string" ? new TextEncoder().encode(bytes).byteLength : bytes.byteLength;
  if (size > limit) {
    throw new Error(`${label} exceeds ${formatBytes(limit)} limit.`);
  }
}

export function enforcePayloadLimit(bytes: Uint8Array): void {
  enforceByteLimit(bytes, DECODE_LIMITS.payloadBytes, "Payload");
}

export function enforceIdlLimit(text: string): void {
  enforceByteLimit(text, DECODE_LIMITS.idlBytes, "IDL");
}

export function enforceWasmLimit(bytes: Uint8Array, label = "Wasm/code bytes"): void {
  enforceByteLimit(bytes, DECODE_LIMITS.wasmBytes, label);
}

export async function hashIdl(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const crypto = globalThis.crypto;
  if (!crypto?.subtle) {
    throw new Error("Web Crypto SHA-256 is not available.");
  }

  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return bytesToHex(new Uint8Array(digest));
}

export function shortHash(value: string | undefined, chars = 10): string {
  if (!value) return "none";
  if (value.length <= chars + 2) return value;
  return `${value.slice(0, chars)}...${value.slice(-4)}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

export function isHexId(value: string): boolean {
  const normalized = value.trim();
  return /^0x[0-9a-fA-F]{64}$/.test(normalized);
}
