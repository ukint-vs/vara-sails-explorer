import { statusMeta } from "../../lib/decode/status";
import type { DecodeResult } from "../../lib/decode/types";

type ResultPanelProps = {
  result: DecodeResult | undefined;
};

export function ResultPanel({ result }: ResultPanelProps) {
  if (!result) {
    return (
      <div className="decode-result empty">
        <div className="decode-result-head">
          <span>No result</span>
          <strong>idle</strong>
        </div>
        <pre>{`{
  "status": "waiting_for_decode"
}`}</pre>
      </div>
    );
  }

  const meta = statusMeta(result.status);
  return (
    <div className={`decode-result ${meta.tone}`}>
      <div className="decode-result-head">
        <span>{meta.label}</span>
        <strong>{result.ok ? result.kind : result.reason ?? result.status}</strong>
      </div>
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
    detail: result.detail
  };
}
