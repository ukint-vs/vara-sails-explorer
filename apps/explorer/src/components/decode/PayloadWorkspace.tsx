import type { DecodeKind, DecodeResult } from "../../lib/decode/types";
import LiveCopyButton from "../live/LiveCopyButton";
import { ResultPanel } from "./ResultPanel";

type PayloadWorkspaceProps = {
  payloadHex: string;
  onPayloadHexChange: (value: string) => void;
  decodeKind: DecodeKind;
  onDecodeKindChange: (value: DecodeKind) => void;
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
          <button type="button" className="btn" disabled={!props.ready} onClick={() => void props.onDecode()}>
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

      <ResultPanel result={props.result} />
    </section>
  );
}
