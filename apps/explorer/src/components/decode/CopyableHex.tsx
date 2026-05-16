import { shortHash } from "../../lib/decode/bytes";
import LiveCopyButton from "../live/LiveCopyButton";

type CopyableHexProps = {
  value: string | undefined;
  name: string;
  label?: string;
  chars?: number;
  empty?: string;
};

export function CopyableHex({ value, name, label, chars = 12, empty = "none" }: CopyableHexProps) {
  if (!value) {
    return <span>{empty}</span>;
  }

  return (
    <span className="copy-hash decode-copy-hex">
      <span className="hash" title={value}>
        {label ?? shortHash(value, chars)}
      </span>
      <LiveCopyButton value={value} name={name} />
    </span>
  );
}
