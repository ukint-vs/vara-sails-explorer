import { useState } from "react";
import { copyText } from "../../lib/live-explorer/copy";

type Props = {
  value: string;
  name?: string;
};

export default function LiveCopyButton({ value, name = "value" }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const ok = await copyText(value);
    if (!ok) {
      return;
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1000);
  }

  return (
    <button className="copy copy-ic" type="button" onClick={handleCopy} aria-label={`Copy ${name}`}>
      {copied ? "COPIED" : "COPY"}
    </button>
  );
}
