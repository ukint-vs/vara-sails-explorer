import { statusMeta } from "../../lib/decode/status";
import type { DecodeResult } from "../../lib/decode/types";

type ResultPanelProps = {
  result: DecodeResult | undefined;
};

export function ResultPanel({ result }: ResultPanelProps) {
  if (!result) {
    return (
      <div className="decode-result empty">
        <p className="decode-empty">Paste a payload to decode. Auto-decode runs once the IDL is ready.</p>
      </div>
    );
  }

  const meta = statusMeta(result.status);
  const consumedLine = !result.ok && typeof result.consumedLen === "number" ? `Consumed ${result.consumedLen} byte${result.consumedLen === 1 ? "" : "s"}.` : undefined;
  return (
    <div className={`decode-result ${meta.tone}`}>
      <div className="decode-result-head">
        <span>{meta.label}</span>
        <strong>{result.ok ? result.kind : result.reason ?? result.status}</strong>
      </div>
      {consumedLine && <p className="decode-result-meta">{consumedLine}</p>}
      <pre>{JSON.stringify(result.ok ? result.value : failureJson(result), null, 2)}</pre>
    </div>
  );
}

function failureJson(result: Exclude<DecodeResult, { ok: true }>): Record<string, unknown> {
  return {
    status: result.status,
    category: result.category,
    reason: result.reason,
    message: result.message,
    detail: result.detail,
    ...(typeof result.consumedLen === "number" ? { consumedLen: result.consumedLen } : {})
  };
}
