import { shortHash } from "./bytes";
import type { DecodeEntryView, DecodeProvenance, DecodeResult, DecodeTraceStep } from "./types";

export function appendTrace(existing: DecodeTraceStep[], next: DecodeTraceStep[]): DecodeTraceStep[] {
  return [...existing, ...next].slice(-80);
}

export function provenanceSummary(provenance: DecodeProvenance | undefined): string {
  if (!provenance) return "No IDL source selected.";
  const parts = [
    `source=${provenance.source}`,
    `trust=${provenance.trust}`,
    provenance.idlHash ? `idlHash=${shortHash(provenance.idlHash, 14)}` : undefined,
    provenance.programId ? `programId=${shortHash(provenance.programId, 12)}` : undefined,
    provenance.codeId ? `codeId=${shortHash(provenance.codeId, 12)}` : undefined,
    provenance.endpointLabel ? `endpoint=${provenance.endpointLabel}` : undefined,
    provenance.cacheHit === undefined ? undefined : `cacheHit=${provenance.cacheHit ? "yes" : "no"}`
  ].filter(Boolean);
  return parts.join(" | ");
}

export function formatDiagnostics(result: DecodeResult | undefined, trace: DecodeTraceStep[]): string {
  const lines = ["Vara Sails Explorer Decode Diagnostics"];
  if (result) {
    lines.push(`status=${result.status}`);
    lines.push(`category=${result.category}`);
    lines.push(`ok=${result.ok ? "true" : "false"}`);
    if (result.ok) {
      lines.push(`kind=${result.kind}`);
      lines.push(`entry=${entryLabel(result.entry)}`);
      lines.push(`provenance=${provenanceSummary(result.provenance)}`);
    } else {
      lines.push(`message=${result.message}`);
      if (result.reason) lines.push(`reason=${result.reason}`);
      if (result.detail) lines.push(`detail=${result.detail}`);
      lines.push(`provenance=${provenanceSummary(result.provenance)}`);
    }
    if (result.header) {
      lines.push(
        `header=version:${result.header.version} hlen:${result.header.hlen} interfaceId:${result.header.interfaceId} entryId:${result.header.entryId} routeIdx:${result.header.routeIdx}`
      );
    }
  } else {
    lines.push("status=idle");
  }

  lines.push("trace:");
  for (const step of trace) {
    lines.push(
      `- ${new Date(step.at).toISOString()} [${step.status}] ${step.label}${step.durationMs ? ` (${step.durationMs}ms)` : ""}: ${step.detail ?? ""}`
    );
  }
  return lines.join("\n");
}

function entryLabel(entry: DecodeEntryView | undefined): string {
  if (!entry) return "none";
  const maybe = entry;
  return [maybe.service, maybe.fn ?? maybe.event ?? maybe.ctor, maybe.route, `entryId:${maybe.entryId}`, `routeIdx:${maybe.routeIdx}`]
    .filter(Boolean)
    .join("/");
}
