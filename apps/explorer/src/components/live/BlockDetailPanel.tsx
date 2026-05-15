import { useEffect, useMemo, useState } from "react";
import type { ExplorerBlockDetail } from "../../lib/live-explorer/types";
import { getExplorerRuntime, useExplorerSnapshot } from "../../lib/live-explorer/singleton";
import ConnectionBanner from "./ConnectionBanner";
import LiveBlockTable from "./LiveBlockTable";
import LiveCopyButton from "./LiveCopyButton";

type LoadState =
  | { kind: "idle" | "loading"; blockId: string }
  | { kind: "loaded"; blockId: string; detail: ExplorerBlockDetail }
  | { kind: "error"; blockId: string; message: string };

export default function BlockDetailPanel() {
  const snapshot = useExplorerSnapshot();
  const blockId = useMemo(() => readBlockQuery(), []);
  const [state, setState] = useState<LoadState>(() => ({ kind: blockId ? "loading" : "idle", blockId }));

  useEffect(() => {
    if (!blockId) {
      setState({ kind: "error", blockId, message: "Add ?block=number or ?block=0xhash to inspect a block." });
      return;
    }
    if (!isValidBlockQuery(blockId)) {
      setState({ kind: "error", blockId, message: "Use a block number or 0x hash to inspect a block." });
      return;
    }

    let active = true;
    setState({ kind: "loading", blockId });
    void getExplorerRuntime()
      .loadBlockDetail(blockId)
      .then((detail) => {
        if (active) {
          setState({ kind: "loaded", blockId, detail });
        }
      })
      .catch((error) => {
        if (active) {
          setState({
            kind: "error",
            blockId,
            message: error instanceof Error ? error.message : String(error)
          });
        }
      });

    return () => {
      active = false;
    };
  }, [blockId]);

  return (
    <div className="stack">
      <ConnectionBanner status={snapshot.status} />
      {state.kind === "loaded" ? <LoadedDetail detail={state.detail} /> : <PendingDetail state={state} />}
    </div>
  );
}

function LoadedDetail({ detail }: { detail: ExplorerBlockDetail }) {
  return (
    <>
      <section className="object-actions">
        <span className="copy-hash">
          <span className="hash" title={detail.blockHash}>{detail.blockHash}</span>
          <LiveCopyButton value={detail.blockHash} name="block hash" />
        </span>
        <span className="chip info">
          <span className="chip-label">{detail.source}</span>
        </span>
        <a className="btn small" href="/blocks">Back to blocks</a>
      </section>

      <section className="data-card">
        <div className="data-card-head">
          <div>
            <h3>Block summary</h3>
            <p>Block production, finality, event volume, and message counts.</p>
          </div>
        </div>
        <div className="data-card-body">
          <LiveBlockTable blocks={[detail.block]} />
        </div>
      </section>

      <section className="grid two detail-grid">
        <DetailTable
          title="Events"
          description="Raw runtime events for this block. Sails decode arrives in M2."
          rows={detail.events.map((event) => ({
            key: event.id,
            left: `${event.index}`,
            main: `${event.section}.${event.method}`,
            sub: event.phase,
            right: event.summary
          }))}
        />
        <DetailTable
          title="Extrinsics"
          description="Extrinsic calls included in this block."
          rows={detail.extrinsics.map((extrinsic) => ({
            key: extrinsic.id,
            left: `${extrinsic.index}`,
            main: `${extrinsic.section}.${extrinsic.method}`,
            sub: extrinsic.signer,
            right: extrinsic.success == null ? "unknown" : extrinsic.success ? "success" : "failed"
          }))}
        />
      </section>
    </>
  );
}

function PendingDetail({ state }: { state: LoadState }) {
  return (
    <section className={`state-panel ${state.kind === "error" ? "error" : ""}`} role={state.kind === "error" ? "alert" : "status"}>
      <div className="state-kicker">{state.kind === "error" ? "Block detail unavailable" : "Loading block detail"}</div>
      <h2>{state.blockId || "No block selected"}</h2>
      <p>{state.kind === "error" ? state.message : "Fetching block events and extrinsics from the selected endpoint."}</p>
      <div className="skeleton-stack" aria-hidden="true">
        <span className="skeleton-line wide" />
        <span className="skeleton-line" />
      </div>
    </section>
  );
}

function DetailTable({
  title,
  description,
  rows
}: {
  title: string;
  description: string;
  rows: { key: string; left: string; main: string; sub: string; right: string }[];
}) {
  return (
    <section className="data-card detail-table">
      <div className="data-card-head">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      <div className="mini-list">
        {rows.length === 0 ? (
          <div className="callout">No rows returned for this block.</div>
        ) : (
          rows.map((row) => (
            <div className="mini-row og detail-row" key={row.key}>
              <span className="cell-sub mono">{row.left}</span>
              <div className="cell-stack">
                <span className="cell-main">{row.main}</span>
                <span className="cell-sub mono">{row.sub}</span>
              </div>
              <span className="cell-sub">{row.right}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function readBlockQuery(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return new URLSearchParams(window.location.search).get("block")?.trim() ?? "";
}

function isValidBlockQuery(value: string): boolean {
  return /^0x[0-9a-fA-F]+$/.test(value) || /^#?[\d,]+$/.test(value);
}
