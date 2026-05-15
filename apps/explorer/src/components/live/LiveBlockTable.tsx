import type { ExplorerBlock, FinalityStatus } from "../../data/types";
import { finalityStatusMeta } from "../../lib/status";
import { blockNumberValue } from "../../lib/live-explorer/mappers";
import LiveCopyButton from "./LiveCopyButton";

type Props = {
  blocks: ExplorerBlock[];
  compact?: boolean;
};

export default function LiveBlockTable({ blocks, compact = false }: Props) {
  return (
    <div className={["table", "blocks", compact ? "compact" : ""].filter(Boolean).join(" ")}>
      <div className="table-head">
        <span>Block</span>
        <span>Age</span>
        <span>Hash</span>
        <span>Author</span>
        <span>Finality</span>
        <span>Extrinsics / events</span>
        <span>Gear msgs</span>
        <span>Sails decoded</span>
      </div>
      {blocks.map((block) => (
        <div className="table-row" data-searchable key={`${block.number}-${block.hash}`}>
          <CopyHash
            value={block.number}
            label={block.number}
            href={`/block-detail?block=${encodeURIComponent(String(blockNumberValue(block.number)))}`}
            name="block number"
          />
          <div className="cell-stack">
            <span className="cell-main mono">{block.age}</span>
            <span className="cell-sub mono">{block.timestamp}</span>
          </div>
          <CopyHash value={block.hash} label={block.hash} name="block hash" />
          <CopyHash value={block.author} label={block.author} name="block author" />
          <div>
            <FinalityChip value={block.finality} />
          </div>
          <div className="cell-stack">
            <span className="cell-main">{block.extrinsics}</span>
            <span className="cell-sub">{block.events} events</span>
          </div>
          <div className="cell-stack">
            <span className="cell-main">{block.gearMessages}</span>
            <span className="cell-sub">{block.failures} failed</span>
          </div>
          <div className="cell-main">
            {block.decodedSails}/{block.gearMessages}
          </div>
        </div>
      ))}
    </div>
  );
}

function CopyHash({ value, label, href, name }: { value: string; label: string; href?: string; name: string }) {
  return (
    <span className="copy-hash">
      {href ? (
        <a className="hash" href={href} title={value}>
          {label}
        </a>
      ) : (
        <span className="hash" title={value}>
          {label}
        </span>
      )}
      <LiveCopyButton value={value} name={name} />
    </span>
  );
}

function FinalityChip({ value }: { value: FinalityStatus }) {
  const meta = finalityStatusMeta[value] ?? { label: value, tone: "neutral" };

  return (
    <span className={`chip ${meta.tone} compact`}>
      <span className="dot" aria-hidden="true" />
      <span className="chip-label">{meta.label}</span>
    </span>
  );
}
