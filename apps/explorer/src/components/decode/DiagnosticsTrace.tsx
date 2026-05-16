import { useState } from "react";
import { statusMeta } from "../../lib/decode/status";
import type { DecodeResult, DecodeTraceStep } from "../../lib/decode/types";

type DiagnosticsTraceProps = {
  trace: DecodeTraceStep[];
  result: DecodeResult | undefined;
  onCopy: () => void | Promise<void>;
};

export function DiagnosticsTrace({ trace, result, onCopy }: DiagnosticsTraceProps) {
  const [open, setOpen] = useState(false);
  const meta = result ? statusMeta(result.status) : undefined;
  const summary = trace.at(-1);

  return (
    <section className="decode-panel decode-trace" aria-labelledby="decode-trace-title">
      <div className="decode-panel-head tight">
        <div>
          <p className="decode-kicker">Trace</p>
          <h2 id="decode-trace-title">Diagnostics</h2>
        </div>
        <button type="button" className="btn small" disabled={trace.length === 0 && !result} onClick={() => void onCopy()}>
          Copy
        </button>
      </div>

      <button
        type="button"
        className="trace-summary"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        disabled={trace.length === 0 && !result}
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
