import type { IdlRecord, IdlSourceMode } from "../../lib/decode/types";
import { CopyableHex } from "./CopyableHex";

type SourceRailProps = {
  sourceMode: IdlSourceMode;
  onSourceModeChange: (mode: IdlSourceMode) => void;
  idlText: string;
  onIdlTextChange: (value: string) => void;
  chainId: string;
  onChainIdChange: (value: string) => void;
  endpointLabel: string;
  record: IdlRecord | undefined;
  busy: string | undefined;
  onUseIdl: () => void | Promise<void>;
  onLoadSample: () => void | Promise<void>;
  onIdlFile: (file: File) => void | Promise<void>;
  onWasmFile: (file: File) => void | Promise<void>;
  onResolve: () => void | Promise<void>;
  onClear: () => void;
};

const sourceOptions: Array<{ value: IdlSourceMode; label: string; description: string }> = [
  { value: "pasted_idl", label: "Paste IDL text", description: "Use an IDL you already have." },
  { value: "uploaded_idl", label: "Upload .idl file", description: "Load an IDL file from this browser session." },
  { value: "uploaded_wasm", label: "Extract from Wasm", description: "Read embedded sails:idl from original Wasm/code bytes." },
  { value: "program_id", label: "Resolve program ID", description: "Ask the selected RPC endpoint for the program code ID and embedded IDL." },
  { value: "code_id", label: "Resolve code ID", description: "Ask the selected RPC endpoint for original code bytes and embedded IDL." }
];

export function SourceRail(props: SourceRailProps) {
  const chainMode = props.sourceMode === "program_id" || props.sourceMode === "code_id";
  const textMode = props.sourceMode === "pasted_idl" || props.sourceMode === "uploaded_idl";
  const idlFileMode = props.sourceMode === "uploaded_idl";
  const wasmFileMode = props.sourceMode === "uploaded_wasm";
  const activeSource = sourceOptions.find((option) => option.value === props.sourceMode) ?? sourceOptions[0];

  return (
    <section className="decode-panel decode-source-rail" aria-labelledby="decode-source-title">
      <div className="decode-panel-head">
        <div>
          <p className="decode-kicker">Source</p>
          <h2 id="decode-source-title">IDL provenance</h2>
        </div>
        <span className={`decode-dot ${props.record ? "ok" : "warn"}`} aria-hidden="true" />
      </div>

      <div className="decode-source-picker">
        <label htmlFor="decode-source-mode">IDL source</label>
        <select
          id="decode-source-mode"
          className="select"
          value={props.sourceMode}
          onChange={(event) => props.onSourceModeChange(event.currentTarget.value as IdlSourceMode)}
        >
          {sourceOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p>{activeSource.description}</p>
      </div>

      {textMode && (
        <div className="decode-field">
          <label htmlFor="decode-idl-text">{idlFileMode ? "Loaded IDL" : "IDL text"}</label>
          <textarea
            id="decode-idl-text"
            value={props.idlText}
            onChange={(event) => props.onIdlTextChange(event.target.value)}
            spellCheck={false}
            rows={8}
          />
        </div>
      )}

      {idlFileMode && (
        <label className="file-action">
          <span>Choose IDL file</span>
          <input
            type="file"
            accept=".idl,.txt,text/plain"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) void props.onIdlFile(file);
              event.currentTarget.value = "";
            }}
          />
        </label>
      )}

      {wasmFileMode && (
        <label className="file-action">
          <span>Choose Wasm file</span>
          <input
            type="file"
            accept=".wasm,application/wasm"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) void props.onWasmFile(file);
              event.currentTarget.value = "";
            }}
          />
        </label>
      )}

      {chainMode && (
        <div className="decode-field">
          <label htmlFor="decode-chain-id">{props.sourceMode === "program_id" ? "Program ID" : "Code ID"}</label>
          <input
            id="decode-chain-id"
            className="input mono"
            value={props.chainId}
            onChange={(event) => props.onChainIdChange(event.target.value)}
            placeholder="0x..."
          />
          <div className="decode-mini-row">
            <span>Endpoint</span>
            <strong>{props.endpointLabel}</strong>
          </div>
        </div>
      )}

      <div className="decode-actions">
        {textMode && (
          <button type="button" className="btn" disabled={!props.idlText.trim() || Boolean(props.busy)} onClick={() => void props.onUseIdl()}>
            Reparse IDL
          </button>
        )}
        {chainMode && (
          <button type="button" className="btn primary" disabled={!props.chainId.trim() || Boolean(props.busy)} onClick={() => void props.onResolve()}>
            Resolve
          </button>
        )}
        <button type="button" className="btn" disabled={Boolean(props.busy)} onClick={() => void props.onLoadSample()}>
          Sample
        </button>
        <button type="button" className="btn" disabled={Boolean(props.busy)} onClick={props.onClear}>
          Clear
        </button>
      </div>

      <dl className="decode-kv">
        <div>
          <dt>Trust</dt>
          <dd>{props.record?.provenance.trust ?? "none"}</dd>
        </div>
        <div>
          <dt>idlHash</dt>
          <dd>
            <CopyableHex value={props.record?.idlHash} name="IDL hash" chars={14} />
          </dd>
        </div>
        <div>
          <dt>Program</dt>
          <dd>
            <CopyableHex value={props.record?.provenance.programId} name="program ID" chars={12} />
          </dd>
        </div>
        <div>
          <dt>Code</dt>
          <dd>
            <CopyableHex value={props.record?.provenance.codeId} name="code ID" chars={12} />
          </dd>
        </div>
        <div>
          <dt>Cache</dt>
          <dd>{props.record?.provenance.cacheHit ? "hit" : props.record ? "ready" : "empty"}</dd>
        </div>
      </dl>
    </section>
  );
}
