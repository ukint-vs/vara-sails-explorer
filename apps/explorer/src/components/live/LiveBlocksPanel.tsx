import { useMemo, useState } from "react";
import type { ExplorerBlock } from "../../data/types";
import { useExplorerSnapshot } from "../../lib/live-explorer/singleton";
import ConnectionBanner from "./ConnectionBanner";
import LiveBlockTable from "./LiveBlockTable";

type Props = {
  initialBlocks: ExplorerBlock[];
};

export default function LiveBlocksPanel({ initialBlocks }: Props) {
  const snapshot = useExplorerSnapshot(initialBlocks);
  const [query, setQuery] = useState("");
  const [finality, setFinality] = useState("all");
  const visibleBlocks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return snapshot.blocks
      .slice(0, 50)
      .filter((block) => {
        const matchesQuery = !normalizedQuery || Object.values(block).join(" ").toLowerCase().includes(normalizedQuery);
        const matchesFinality = finality === "all" || block.finality === finality;
        return matchesQuery && matchesFinality;
      });
  }, [snapshot.blocks, query, finality]);

  return (
    <div className="stack">
      <section className="filter-bar" aria-label="Block filters">
        <div className="explorer-search compact">
          <label className="explorer-search-row">
            <span className="visually-hidden">Filter blocks</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Filter block number, hash, author, finality, or message count"
            />
            <span className="kbd-hint">/</span>
          </label>
        </div>
        <select className="select" aria-label="Finality filter" value={finality} onChange={(event) => setFinality(event.currentTarget.value)}>
          <option value="all">All finality states</option>
          <option value="best_block">Best block</option>
          <option value="finalized">Finalized</option>
        </select>
        <button className="btn small" type="button" disabled>
          Watch head
        </button>
        <a className="btn small" href="/messages">
          Open messages
        </a>
      </section>

      <section className="data-card">
        <div className="data-card-head">
          <div>
            <h3>Block stream</h3>
            <p>Rows keep block production, finality, message volume, failures, and decode coverage separate.</p>
          </div>
          <span className="chip info">
            <span className="dot" aria-hidden="true" />
            <span className="chip-label">{snapshot.status.endpoint.label}</span>
          </span>
        </div>
        <div className="data-card-body">
          <ConnectionBanner status={snapshot.status} />
          <LiveBlockTable blocks={visibleBlocks} />
        </div>
        <div className="pagination-v2">
          <button className="btn small" type="button" disabled>
            Prev
          </button>
          <span>
            Showing {visibleBlocks.length} of {Math.min(snapshot.blocks.length, 50)} live/cache rows
          </span>
          <input className="input" placeholder="Jump to block" aria-label="Jump to block" />
          <button className="btn small" type="button" disabled>
            Next
          </button>
        </div>
      </section>
    </div>
  );
}
