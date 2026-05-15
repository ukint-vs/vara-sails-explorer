import type { ExplorerConnectionStatus } from "../../lib/live-explorer/types";

type Props = {
  status: ExplorerConnectionStatus;
};

const phaseTone: Record<ExplorerConnectionStatus["phase"], string> = {
  idle: "neutral",
  connecting: "info",
  live: "success",
  degraded: "warn",
  cache_only: "warn",
  error: "danger"
};

export default function ConnectionBanner({ status }: Props) {
  if (status.phase === "live") {
    return (
      <div className="live-banner compact" role="status">
        <span className={`chip ${phaseTone[status.phase]}`}>
          <span className="dot" aria-hidden="true" />
          <span className="chip-label">Live</span>
        </span>
        <span>{status.message}</span>
      </div>
    );
  }

  return (
    <div className={`live-banner ${phaseTone[status.phase]}`} role={status.phase === "error" ? "alert" : "status"}>
      <span className={`chip ${phaseTone[status.phase]}`}>
        <span className="dot" aria-hidden="true" />
        <span className="chip-label">{status.phase.replace("_", " ")}</span>
      </span>
      <span>{status.message}</span>
      {status.error && <span className="cell-sub mono">{status.error}</span>}
    </div>
  );
}
