import { useState } from "react";
import { statusMeta } from "../../lib/decode/status";
import type { DecodeResult, DecodeTraceStep } from "../../lib/decode/types";

type DiagnosticsTraceProps = {
  trace: DecodeTraceStep[];
  result: DecodeResult | undefined;
  onCopy: () => void | Promise<void>;
  onSaveJson?: () => void;
};

export function DiagnosticsTrace({ trace, result, onCopy, onSaveJson }: DiagnosticsTraceProps) {
  const [open, setOpen] = useState(false);
  const meta = result ? statusMeta(result.status) : undefined;
  const summary = trace.at(-1);
  const empty = trace.length === 0 && !result;

  return (
    <section className="decode-panel decode-trace" aria-labelledby="decode-trace-title">
      <div className="decode-panel-head tight">
        <div>
          <p className="decode-kicker">Trace</p>
          <h2 id="decode-trace-title">Diagnostics</h2>
        </div>
        <div className="decode-head-actions">
          <button type="button" className="btn small" disabled={empty} onClick={() => void onCopy()}>
            Copy
          </button>
          {onSaveJson && (
            <button
              type="button"
              className="btn small"
              disabled={empty}
              onClick={onSaveJson}
              title="Save provenance, result, and trace as a JSON file."
            >
              Save .json
            </button>
          )}
        </div>
      </div>

      <button
        type="button"
        className="trace-summary"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        disabled={empty}
      >
        <span>{meta?.label ?? "No trace yet"}</span>
        <strong>{summary?.durationMs ? `${summary.durationMs}ms` : summary?.status ?? "idle"}</strong>
      </button>

      {open && trace.length > 0 && (
        <ol className="trace-list">
          {trace.map((step, index) => (
            <li className={step.status} key={`${step.at}-${index}`}>
              <span>{new Date(step.at).toLocaleTimeString()}</span>
              <strong>{step.label}</strong>
              <p>{step.detail}</p>
            </li>
          ))}
        </ol>
      )}

      {trace.length === 0 && !result && (
        <p className="decode-empty">No trace yet. Resolve a source or decode a payload to populate.</p>
      )}
    </section>
  );
}
