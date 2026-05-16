import type { DecodeEntryView, DecodeExpectedEntry, DecodeKind, DecodeResult, IdlInspection } from "../../lib/decode/types";
import LiveCopyButton from "../live/LiveCopyButton";
import { ResultPanel } from "./ResultPanel";

type PayloadWorkspaceProps = {
  payloadHex: string;
  onPayloadHexChange: (value: string) => void;
  decodeKind: DecodeKind;
  onDecodeKindChange: (value: DecodeKind) => void;
  inspection: IdlInspection | undefined;
  expectedEntry: DecodeExpectedEntry | undefined;
  onExpectedEntryChange: (value: DecodeExpectedEntry | undefined) => void;
  ready: boolean;
  busy: string | undefined;
  result: DecodeResult | undefined;
  onDecode: () => void | Promise<void>;
};

const decodeKinds: Array<{ value: DecodeKind; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "call", label: "Call" },
  { value: "reply", label: "Reply" },
  { value: "error", label: "Error" },
  { value: "event", label: "Event" },
  { value: "constructor", label: "Ctor" }
];

export function PayloadWorkspace(props: PayloadWorkspaceProps) {
  const payload = props.payloadHex.trim();

  return (
    <section className="decode-panel decode-workspace" aria-labelledby="decode-payload-title">
      <div className="decode-panel-head">
        <div>
          <p className="decode-kicker">Payload</p>
          <h2 id="decode-payload-title">Decode workspace</h2>
        </div>
        <div className="decode-head-actions">
          {payload && <LiveCopyButton value={payload} name="payload hex" />}
          <button type="button" className="btn primary" disabled={!props.ready} onClick={() => void props.onDecode()}>
            {props.busy === "Decoding payload" ? "Decoding" : "Decode now"}
          </button>
        </div>
      </div>

      <div className="decode-field">
        <label htmlFor="decode-payload">Raw bytes</label>
        <textarea
          id="decode-payload"
          className="decode-payload-input"
          value={props.payloadHex}
          onChange={(event) => props.onPayloadHexChange(event.target.value)}
          spellCheck={false}
          rows={8}
        />
      </div>

      <div className="decode-control-row">
        <div className="segmented compact" role="radiogroup" aria-label="Decode kind">
          {decodeKinds.map((kind) => (
            <button
              key={kind.value}
              className={props.decodeKind === kind.value ? "active" : ""}
              type="button"
              aria-pressed={props.decodeKind === kind.value}
              onClick={() => props.onDecodeKindChange(kind.value)}
            >
              {kind.label}
            </button>
          ))}
        </div>
        <span className="decode-ready">{props.ready ? "auto decode on" : props.busy ?? "needs IDL + payload"}</span>
      </div>

      <ExpectedEntryPicker
        inspection={props.inspection}
        expectedEntry={props.expectedEntry}
        onChange={props.onExpectedEntryChange}
      />

      <ResultPanel result={props.result} />
    </section>
  );
}

type ExpectedEntryPickerProps = {
  inspection: IdlInspection | undefined;
  expectedEntry: DecodeExpectedEntry | undefined;
  onChange: (value: DecodeExpectedEntry | undefined) => void;
};

function ExpectedEntryPicker({ inspection, expectedEntry, onChange }: ExpectedEntryPickerProps) {
  const candidates = inspection?.candidates ?? [];
  const disabled = candidates.length === 0;
  const selectedIndex = findExpectedEntryIndex(expectedEntry, candidates);
  const value = selectedIndex >= 0 ? String(selectedIndex) : "";
  return (
    <div className="decode-field decode-field-inline">
      <label htmlFor="decode-expected-entry">Expected entry</label>
      <select
        id="decode-expected-entry"
        className="decode-expected-entry"
        value={value}
        disabled={disabled}
        title={disabled ? "Decode the IDL first to enable entry validation." : "Optional. Worker will fail with entry-mismatch if the payload resolves to a different entry."}
        onChange={(event) => onChange(decodeExpectedEntryKey(event.target.value, candidates))}
      >
        <option value="">(none — accept whatever resolves)</option>
        {candidates.map((candidate, index) => (
          <option key={`${candidate.interfaceId}-${candidate.entryId}-${index}`} value={String(index)}>
            {entryOptionLabel(candidate)}
          </option>
        ))}
      </select>
    </div>
  );
}

function entryOptionLabel(entry: DecodeEntryView): string {
  const tag = entry.kind === "event" ? "event " : entry.kind === "ctor" ? "ctor " : "";
  if (entry.fn) return `${tag}${entry.service ? `${entry.service}.${entry.fn}` : entry.fn} (r${entry.routeIdx})`;
  if (entry.event) return `${tag}${entry.service ? `${entry.service}.${entry.event}` : entry.event} (r${entry.routeIdx})`;
  if (entry.ctor) return `${tag}${entry.ctor} (r${entry.routeIdx})`;
  return `${entry.kind} entry (r${entry.routeIdx})`;
}

function findExpectedEntryIndex(hint: DecodeExpectedEntry | undefined, candidates: DecodeEntryView[]): number {
  if (!hint) return -1;
  return candidates.findIndex(
    (candidate) =>
      hint.service === candidate.service &&
      hint.fn === candidate.fn &&
      hint.event === candidate.event &&
      hint.ctor === candidate.ctor
  );
}

function decodeExpectedEntryKey(raw: string, candidates: DecodeEntryView[]): DecodeExpectedEntry | undefined {
  if (!raw) return undefined;
  const index = Number(raw);
  if (!Number.isInteger(index) || index < 0 || index >= candidates.length) return undefined;
  const entry = candidates[index]!;
  const hint: DecodeExpectedEntry = {};
  if (entry.service) hint.service = entry.service;
  if (entry.fn) hint.fn = entry.fn;
  if (entry.event) hint.event = entry.event;
  if (entry.ctor) hint.ctor = entry.ctor;
  return hint;
}
