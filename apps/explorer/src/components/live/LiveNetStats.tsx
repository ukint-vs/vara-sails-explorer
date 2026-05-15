import type { ExplorerBlock, NetStat } from "../../data/types";
import { useExplorerSnapshot } from "../../lib/live-explorer/singleton";

type Props = {
  initialBlocks?: ExplorerBlock[];
  initialStats?: NetStat[];
  compact?: boolean;
};

export default function LiveNetStats({ initialBlocks, initialStats, compact = false }: Props) {
  const snapshot = useExplorerSnapshot(initialBlocks, initialStats);

  return (
    <section className={["netstats", compact ? "compact" : ""].filter(Boolean).join(" ")} aria-label="Network stats">
      {snapshot.stats.map((stat) => (
        <div className={["netstat", stat.tone || "neutral"].join(" ")} key={stat.label}>
          <div className="netstat-label">
            {stat.live && <span className="live-dot" aria-hidden="true" />}
            <span>{stat.label}</span>
          </div>
          <div className="netstat-value">{stat.value}</div>
          <div className="netstat-note">{stat.note}</div>
        </div>
      ))}
    </section>
  );
}
