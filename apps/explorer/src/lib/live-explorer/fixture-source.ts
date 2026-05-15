import { blocks } from "../../data/fixtures";
import type { ExplorerBlock } from "../../data/types";
import type { ExplorerDataSource } from "./data-source";
import { blockNumberValue, formatBlockNumber, mergeBlocks } from "./mappers";
import { RPC_ENDPOINTS } from "./settings";
import type { ExplorerBlockDetail, ExplorerConnectionStatus, ExplorerHeads, RpcEndpoint, Unsubscribe } from "./types";

const DEFAULT_ENDPOINT = RPC_ENDPOINTS[0];

export class FixtureDataSource implements ExplorerDataSource {
  private endpoint: RpcEndpoint = DEFAULT_ENDPOINT;
  private connected = false;
  private status: ExplorerConnectionStatus = {
    phase: "idle",
    endpoint: DEFAULT_ENDPOINT,
    message: "Fixture data ready.",
    usingCache: false
  };

  async connect(endpoint: RpcEndpoint): Promise<void> {
    this.endpoint = endpoint;
    this.connected = true;
    this.status = {
      phase: "live",
      endpoint,
      message: "Fixture stream connected.",
      usingCache: false,
      connectedAt: Date.now(),
      lastUpdated: Date.now(),
      bestBlock: blockNumberValue(blocks[0]?.number ?? "#0"),
      finalizedBlock: blockNumberValue(blocks[1]?.number ?? "#0")
    };
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.status = {
      ...this.status,
      phase: "idle",
      message: "Fixture stream disconnected."
    };
  }

  async subscribeHeads(onUpdate: (heads: ExplorerHeads) => void): Promise<Unsubscribe> {
    let offset = 0;
    const emit = () => {
      const best = blockNumberValue(blocks[offset % blocks.length]?.number ?? "#0");
      const finalized = Math.max(0, best - 2);
      onUpdate({
        best: { number: best },
        finalized: { number: finalized },
        updatedAt: Date.now()
      });
      offset += 1;
    };

    emit();
    const interval = globalThis.setInterval(emit, 12_000);
    return () => globalThis.clearInterval(interval);
  }

  async getRecentBlocks(limit: number): Promise<ExplorerBlock[]> {
    return blocks.slice(0, limit);
  }

  async getBlockSummary(block: string | number): Promise<ExplorerBlock> {
    const blockNumber = typeof block === "number" ? block : blockNumberValue(String(block));
    return blocks.find((candidate) => blockNumberValue(candidate.number) === blockNumber) ?? blocks[0];
  }

  async getBlockDetail(block: string | number): Promise<ExplorerBlockDetail> {
    const summary = await this.getBlockSummary(block);
    const blockNumber = blockNumberValue(summary.number);
    const hash = summary.hash.startsWith("0x") ? summary.hash : `0xfixture${blockNumber.toString(16)}`;

    return {
      block: summary,
      blockNumber,
      blockHash: hash,
      events: [
        {
          id: "0-gear.MessageQueued",
          index: 0,
          phase: "ApplyExtrinsic(1)",
          section: "gear",
          method: "MessageQueued",
          summary: "gear.MessageQueued fixture event",
          raw: { section: "gear", method: "MessageQueued" }
        },
        {
          id: "1-system.ExtrinsicSuccess",
          index: 1,
          phase: "ApplyExtrinsic(1)",
          section: "system",
          method: "ExtrinsicSuccess",
          summary: "system.ExtrinsicSuccess fixture event",
          raw: { section: "system", method: "ExtrinsicSuccess" }
        }
      ],
      extrinsics: [
        {
          id: "0-timestamp.set",
          index: 0,
          hash: `${hash}-0`,
          section: "timestamp",
          method: "set",
          signer: "unsigned",
          success: true,
          summary: "timestamp.set",
          raw: { section: "timestamp", method: "set" }
        },
        {
          id: "1-gear.sendMessage",
          index: 1,
          hash: `${hash}-1`,
          section: "gear",
          method: "sendMessage",
          signer: "0xfixture",
          success: true,
          summary: "gear.sendMessage",
          raw: { section: "gear", method: "sendMessage" }
        }
      ],
      fetchedAt: Date.now(),
      source: "fixture"
    };
  }

  getStatus(): ExplorerConnectionStatus {
    return this.connected
      ? this.status
      : {
          ...this.status,
          endpoint: this.endpoint
        };
  }
}

export function fixtureBlocksWithIncoming(existing: ExplorerBlock[], block: ExplorerBlock, limit: number): ExplorerBlock[] {
  const number = blockNumberValue(block.number);
  const synthetic = {
    ...block,
    number: formatBlockNumber(number + 1),
    age: "0s ago"
  };

  return mergeBlocks(existing, [synthetic], limit);
}
