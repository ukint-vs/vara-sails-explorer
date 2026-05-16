import { useEffect, useRef, useState } from "react";
import { hashIdl, shortHash } from "../../lib/decode/bytes";
import { DecodeIdlCache, makeIdlRecord } from "../../lib/decode/cache";
import { DecodeResolverClient } from "../../lib/decode/resolver-client";
import { SAMPLE_IDL, SAMPLE_PAYLOAD_HEX } from "../../lib/decode/sample";
import { statusMeta } from "../../lib/decode/status";
import { appendTrace, formatDiagnostics } from "../../lib/decode/trace";
import type {
  DecodeKind,
  DecodeProvenance,
  DecodeResult,
  DecodeTraceStep,
  IdlInspection,
  IdlRecord,
  IdlSourceMode
} from "../../lib/decode/types";
import { DecodeWorkerSession } from "../../lib/decode/worker-session";
import { copyText } from "../../lib/live-explorer/copy";
import { getEndpointById, loadRpcSettings, RPC_SETTINGS_CHANGED_EVENT } from "../../lib/live-explorer/settings";
import { CopyableHex } from "./CopyableHex";
import { DiagnosticsTrace } from "./DiagnosticsTrace";
import { PayloadWorkspace } from "./PayloadWorkspace";
import { RouteInspector } from "./RouteInspector";
import { SourceRail } from "./SourceRail";

const sourceLabels: Record<IdlSourceMode, string> = {
  pasted_idl: "Pasted IDL",
  uploaded_idl: "Uploaded IDL",
  uploaded_wasm: "Uploaded Wasm",
  program_id: "Program ID",
  code_id: "Code ID",
  cache: "Cache"
};

function readSelectedEndpoint() {
  const settings = loadRpcSettings();
  return getEndpointById(settings.selectedEndpointId, settings.customEndpointUrl);
}

export function DecodeLab() {
  const [sourceMode, setSourceMode] = useState<IdlSourceMode>("pasted_idl");
  const [idlText, setIdlText] = useState("");
  const [payloadHex, setPayloadHex] = useState("");
  const [chainId, setChainId] = useState("");
  const [decodeKind, setDecodeKind] = useState<DecodeKind>("auto");
  const [record, setRecord] = useState<IdlRecord | undefined>();
  const [inspection, setInspection] = useState<IdlInspection | undefined>();
  const [result, setResult] = useState<DecodeResult | undefined>();
  const [trace, setTrace] = useState<DecodeTraceStep[]>([]);
  const [busy, setBusy] = useState<string | undefined>();
  const [announcement, setAnnouncement] = useState("Decode Lab ready.");

  const cacheRef = useRef<DecodeIdlCache | undefined>(undefined);
  const workerRef = useRef<DecodeWorkerSession | undefined>(undefined);
  const resolverRef = useRef<DecodeResolverClient | undefined>(undefined);
  const idlJobRef = useRef(0);
  const decodeJobRef = useRef(0);

  const [endpoint, setEndpoint] = useState(readSelectedEndpoint);

  useEffect(() => {
    cacheRef.current = new DecodeIdlCache();
    workerRef.current = new DecodeWorkerSession();
    resolverRef.current = new DecodeResolverClient();

    const params = new URLSearchParams(window.location.search);
    const programId = params.get("programId");
    const codeId = params.get("codeId");
    const payload = params.get("payload");
    if (programId) {
      setSourceMode("program_id");
      setChainId(programId);
    } else if (codeId) {
      setSourceMode("code_id");
      setChainId(codeId);
    }
    if (payload) {
      setPayloadHex(payload);
    }

    return () => {
      workerRef.current?.terminate();
      void resolverRef.current?.close();
      void cacheRef.current?.close();
    };
  }, []);

  useEffect(() => {
    function refreshEndpoint(): void {
      setEndpoint(readSelectedEndpoint());
    }

    window.addEventListener(RPC_SETTINGS_CHANGED_EVENT, refreshEndpoint);
    window.addEventListener("storage", refreshEndpoint);

    return () => {
      window.removeEventListener(RPC_SETTINGS_CHANGED_EVENT, refreshEndpoint);
      window.removeEventListener("storage", refreshEndpoint);
    };
  }, []);

  const activeMeta = result ? statusMeta(result.status) : record ? statusMeta("decoded") : statusMeta("missing_idl");
  const ready = Boolean(record && payloadHex.trim() && !busy);

  useEffect(() => {
    if (sourceMode !== "pasted_idl") {
      return;
    }

    const text = idlText.trim();
    if (!text) {
      idlJobRef.current += 1;
      decodeJobRef.current += 1;
      setRecord(undefined);
      setInspection(undefined);
      setResult(undefined);
      setBusy(undefined);
      return;
    }

    const timer = window.setTimeout(() => {
      void acceptIdl(text, {
        source: "pasted_idl",
        trust: "user_supplied",
        label: sourceLabels.pasted_idl,
        updatedAt: Date.now()
      });
    }, 450);

    return () => window.clearTimeout(timer);
  }, [idlText, sourceMode]);

  useEffect(() => {
    const activeRecord = record;
    const activePayload = payloadHex;
    const activeKind = decodeKind;

    if (!activeRecord || !activePayload.trim()) {
      return;
    }

    const timer = window.setTimeout(() => {
      void decodePayload(activeRecord, activePayload, activeKind);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [record?.idlHash, payloadHex, decodeKind]);

  async function loadSample(): Promise<void> {
    idlJobRef.current += 1;
    decodeJobRef.current += 1;
    setSourceMode("pasted_idl");
    setIdlText(SAMPLE_IDL);
    setPayloadHex(SAMPLE_PAYLOAD_HEX);
    setAnnouncement("Sample loaded. IDL and payload will decode automatically.");
  }

  async function acceptPastedIdl(): Promise<void> {
    await acceptIdl(idlText, {
      source: sourceMode === "uploaded_idl" ? "uploaded_idl" : "pasted_idl",
      trust: "user_supplied",
      label: sourceLabels[sourceMode],
      updatedAt: Date.now()
    });
  }

  async function acceptIdl(text: string, provenance: DecodeProvenance, aliases: Parameters<DecodeIdlCache["writeIdl"]>[1] = []) {
    const worker = workerRef.current;
    const cache = cacheRef.current;
    if (!worker || !cache) return;

    const job = ++idlJobRef.current;
    setBusy("Parsing IDL");
    setResult(undefined);
    try {
      const idlHash = await hashIdl(text);
      const nextRecord = makeIdlRecord(idlHash, text, { ...provenance, idlHash });
      const response = await worker.inspectIdl({
        kind: "inspect-idl",
        idlHash,
        idlText: text,
        provenance: nextRecord.provenance
      });

      if (job !== idlJobRef.current) {
        return;
      }

      if (response.kind === "inspect-idl" && response.ok) {
        await cache.writeIdl(nextRecord, aliases);
        setRecord(nextRecord);
        setInspection(response.inspection);
        setTrace((current) => appendTrace(current, response.trace));
        setAnnouncement("IDL source ready.");
      } else if ("result" in response) {
        setResult(response.result);
        setTrace((current) => appendTrace(current, response.result.trace));
        setAnnouncement(resultMessage(response.result));
      }
    } finally {
      if (job === idlJobRef.current) {
        setBusy(undefined);
      }
    }
  }

  async function handleIdlFile(file: File): Promise<void> {
    const text = await file.text();
    setIdlText(text);
    setSourceMode("uploaded_idl");
    await acceptIdl(text, {
      source: "uploaded_idl",
      trust: "user_supplied",
      label: file.name,
      updatedAt: Date.now()
    });
  }

  async function handleWasmFile(file: File): Promise<void> {
    const worker = workerRef.current;
    if (!worker) return;

    setBusy("Extracting IDL");
    setSourceMode("uploaded_wasm");
    try {
      const wasmBytes = new Uint8Array(await file.arrayBuffer());
      const provenance: DecodeProvenance = {
        source: "uploaded_wasm",
        trust: "user_supplied",
        label: file.name,
        updatedAt: Date.now()
      };
      const response = await worker.extractIdl({ kind: "extract-idl", wasmBytes, provenance });
      if (response.kind === "extract-idl" && response.ok) {
        setTrace((current) => appendTrace(current, response.trace));
        setIdlText(response.idlText);
        await acceptIdl(response.idlText, provenance);
      } else if ("result" in response) {
        setResult(response.result);
        setTrace((current) => appendTrace(current, response.result.trace));
        setAnnouncement(resultMessage(response.result));
      }
    } finally {
      setBusy(undefined);
    }
  }

  async function resolveChainSource(): Promise<void> {
    const cache = cacheRef.current;
    const worker = workerRef.current;
    const resolver = resolverRef.current;
    if (!cache || !worker || !resolver) return;

    const job = ++idlJobRef.current;
    decodeJobRef.current += 1;
    const activeSourceMode = sourceMode === "program_id" ? "program_id" : "code_id";
    const activeChainId = chainId.trim();
    const activeEndpoint = endpoint;
    const aliasType = activeSourceMode === "program_id" ? "program" : "code";

    setBusy(activeSourceMode === "program_id" ? "Resolving program" : "Resolving code");
    setResult(undefined);

    try {
      const cached = await cache.readByAlias(aliasType, activeChainId);
      if (job !== idlJobRef.current) {
        return;
      }
      if (cached.ok) {
        const next = {
          ...cached.record,
          provenance: {
            ...cached.record.provenance,
            cacheHit: true,
            source: "cache" as const,
            trust: "cache" as const,
            label: `Cached ${aliasType} IDL`
          }
        };
        setIdlText(next.idlText);
        await acceptIdl(next.idlText, next.provenance);
        return;
      }

      const resolved = await resolver.resolve({
        source: activeSourceMode,
        id: activeChainId,
        endpoint: activeEndpoint
      });
      if (job !== idlJobRef.current) {
        return;
      }
      setTrace((current) => appendTrace(current, resolved.trace));
      if (!resolved.ok) {
        const failure: DecodeResult = {
          ok: false,
          category: resolved.category,
          status: resolved.status,
          message: resolved.message,
          detail: resolved.detail,
          trace: resolved.trace
        };
        setResult(failure);
        setAnnouncement(resolved.message);
        return;
      }

      const provenance: DecodeProvenance = {
        source: activeSourceMode,
        trust: "chain_embedded",
        label: activeSourceMode === "program_id" ? "Resolved program ID" : "Resolved code ID",
        programId: resolved.programId,
        codeId: resolved.codeId,
        endpointLabel: resolved.endpoint.label,
        cacheHit: false,
        updatedAt: Date.now()
      };
      const extracted = await worker.extractIdl({ kind: "extract-idl", wasmBytes: resolved.codeBytes, provenance });
      if (job !== idlJobRef.current) {
        return;
      }
      if (extracted.kind === "extract-idl" && extracted.ok) {
        setTrace((current) => appendTrace(current, extracted.trace));
        setIdlText(extracted.idlText);
        await acceptIdl(extracted.idlText, provenance, [
          ...(resolved.programId ? [{ aliasType: "program" as const, aliasId: resolved.programId, codeId: resolved.codeId }] : []),
          { aliasType: "code" as const, aliasId: resolved.codeId }
        ]);
      } else if ("result" in extracted) {
        setResult(extracted.result);
        setTrace((current) => appendTrace(current, extracted.result.trace));
        setAnnouncement(resultMessage(extracted.result));
      }
    } finally {
      if (job === idlJobRef.current) {
        setBusy(undefined);
      }
    }
  }

  async function decodePayload(activeRecord = record, activePayload = payloadHex, activeKind = decodeKind): Promise<void> {
    const worker = workerRef.current;
    if (!worker || !activeRecord || !activePayload.trim()) return;

    const job = ++decodeJobRef.current;
    setBusy("Decoding payload");
    try {
      const response = await worker.decode({
        kind: "decode",
        idlHash: activeRecord.idlHash,
        idlText: activeRecord.idlText,
        payloadHex: activePayload,
        decodeKind: activeKind,
        provenance: activeRecord.provenance
      });
      if (job !== decodeJobRef.current) {
        return;
      }
      if (response.kind === "decode") {
        setResult(response.result);
        setTrace((current) => appendTrace(current, response.result.trace));
        setAnnouncement(response.result.ok ? "Payload decoded." : response.result.message);
      }
    } finally {
      if (job === decodeJobRef.current) {
        setBusy(undefined);
      }
    }
  }

  async function copyDiagnostics(): Promise<void> {
    const ok = await copyText(formatDiagnostics(result, trace));
    setAnnouncement(ok ? "Diagnostics copied." : "Copy failed.");
  }

  function clearSource(): void {
    idlJobRef.current += 1;
    decodeJobRef.current += 1;
    setRecord(undefined);
    setInspection(undefined);
    setResult(undefined);
    setTrace([]);
    setBusy(undefined);
    setAnnouncement("Source cleared.");
    workerRef.current?.terminate();
    workerRef.current = new DecodeWorkerSession();
  }

  function changeSourceMode(mode: IdlSourceMode): void {
    invalidateActiveSource("IDL source changed.");
    setSourceMode(mode);
  }

  function changeIdlText(value: string): void {
    setIdlText(value);
    invalidateActiveSource(value.trim() ? "IDL text changed. Re-parsing." : "IDL text cleared.");
  }

  function changeChainId(value: string): void {
    setChainId(value);
    invalidateActiveSource(value.trim() ? "Chain source changed. Resolve again." : "Chain source cleared.");
  }

  function invalidateActiveSource(message: string): void {
    idlJobRef.current += 1;
    decodeJobRef.current += 1;
    setRecord(undefined);
    setInspection(undefined);
    setResult(undefined);
    setBusy(undefined);
    setAnnouncement(message);
  }

  return (
    <div className="decode-lab" aria-busy={Boolean(busy)}>
      <div className="decode-lab-status" role="status" aria-live="polite">
        {announcement}
      </div>

      <SourceRail
        sourceMode={sourceMode}
        onSourceModeChange={changeSourceMode}
        idlText={idlText}
        onIdlTextChange={changeIdlText}
        chainId={chainId}
        onChainIdChange={changeChainId}
        endpointLabel={endpoint.label}
        record={record}
        busy={busy}
        onUseIdl={acceptPastedIdl}
        onLoadSample={loadSample}
        onIdlFile={handleIdlFile}
        onWasmFile={handleWasmFile}
        onResolve={resolveChainSource}
        onClear={clearSource}
      />

      <PayloadWorkspace
        payloadHex={payloadHex}
        onPayloadHexChange={setPayloadHex}
        decodeKind={decodeKind}
        onDecodeKindChange={setDecodeKind}
        ready={ready}
        busy={busy}
        result={result}
        onDecode={() => decodePayload()}
      />

      <aside className="decode-side-rail">
        <div className={`decode-health ${activeMeta.tone}`}>
          <span>{activeMeta.label}</span>
          {record ? <CopyableHex value={record.idlHash} name="IDL hash" chars={14} /> : <strong>no-idl</strong>}
        </div>
        <RouteInspector result={result} inspection={inspection} provenance={record?.provenance} />
        <DiagnosticsTrace trace={trace} result={result} onCopy={copyDiagnostics} />
      </aside>

      <DecodeProvenanceLine provenance={record?.provenance} />
    </div>
  );
}

function resultMessage(result: DecodeResult): string {
  return result.ok ? "Payload decoded." : result.message;
}

function DecodeProvenanceLine({ provenance }: { provenance: DecodeProvenance | undefined }) {
  if (!provenance) {
    return null;
  }

  return (
    <div className="decode-provenance-line">
      <span>{provenance.label}</span>
      <span>source={provenance.source}</span>
      <span>trust={provenance.trust}</span>
      {provenance.idlHash && (
        <CopyableHex value={provenance.idlHash} name="IDL hash" label={`idlHash=${shortHash(provenance.idlHash, 14)}`} />
      )}
      {provenance.programId && (
        <CopyableHex value={provenance.programId} name="program ID" label={`programId=${shortHash(provenance.programId, 12)}`} />
      )}
      {provenance.codeId && <CopyableHex value={provenance.codeId} name="code ID" label={`codeId=${shortHash(provenance.codeId, 12)}`} />}
    </div>
  );
}
