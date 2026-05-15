import type { ExplorerBlock } from "../../data/types";
import { useExplorerSnapshot } from "../../lib/live-explorer/singleton";
import ConnectionBanner from "./ConnectionBanner";
import LiveBlockTable from "./LiveBlockTable";

type Props = {
  initialBlocks: ExplorerBlock[];
};

export default function LiveOverviewBlocksPanel({ initialBlocks }: Props) {
  const snapshot = useExplorerSnapshot(initialBlocks);

  return (
    <div className="live-panel">
      <ConnectionBanner status={snapshot.status} />
      <LiveBlockTable blocks={snapshot.blocks.slice(0, 8)} compact />
    </div>
  );
}
