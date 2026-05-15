import type { DecodeEntryView, DecodeProvenance, DecodeResult, IdlInspection } from "../../lib/decode/types";
import { CopyableHex } from "./CopyableHex";

type RouteInspectorProps = {
  result: DecodeResult | undefined;
  inspection: IdlInspection | undefined;
  provenance: DecodeProvenance | undefined;
};

export function RouteInspector({ result, inspection, provenance }: RouteInspectorProps) {
  const header = result?.header;
  const entry = result?.ok ? result.entry : undefined;
  const candidates = result?.candidates ?? inspection?.candidates ?? [];

  return (
    <section className="decode-panel decode-inspector" aria-labelledby="decode-inspector-title">
      <div className="decode-panel-head tight">
        <div>
          <p className="decode-kicker">Route</p>
          <h2 id="decode-inspector-title">Header inspector</h2>
        </div>
        <span>{candidates.length}</span>
      </div>

      <dl className="decode-kv">
        <div>
          <dt>interface_id</dt>
          <dd>
            <CopyableHex value={header?.interfaceId} name="interface ID" chars={14} empty="pending" />
          </dd>
        </div>
        <div>
          <dt>entry_id</dt>
          <dd>{header?.entryId ?? "pending"}</dd>
        </div>
        <div>
          <dt>routeIdx</dt>
          <dd>{header?.routeIdx ?? "pending"}</dd>
        </div>
        <div>
          <dt>kind</dt>
          <dd>{entry?.kind ?? "unknown"}</dd>
        </div>
        <div>
          <dt>entry</dt>
          <dd>{entryLabel(entry)}</dd>
        </div>
        <div>
          <dt>idlHash</dt>
          <dd>
            <CopyableHex value={provenance?.idlHash} name="IDL hash" chars={14} />
          </dd>
        </div>
      </dl>

      <div className="candidate-list" aria-label="Route candidates">
        {candidates.slice(0, 8).map((candidate, index) => (
          <div className="candidate-row" key={`${candidate.interfaceId}-${candidate.entryId}-${candidate.routeIdx}-${index}`}>
            <span>{candidate.kind}</span>
            <strong>{entryLabel(candidate)}</strong>
            <em>r{candidate.routeIdx}</em>
          </div>
        ))}
        {candidates.length === 0 && <div className="candidate-empty">No candidates indexed.</div>}
      </div>
    </section>
  );
}

function entryLabel(entry: DecodeEntryView | undefined): string {
  if (!entry) return "pending";
  return entry.fn ?? entry.event ?? entry.ctor ?? entry.service ?? "entry";
}
