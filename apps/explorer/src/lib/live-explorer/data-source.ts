import type { ExplorerBlock } from "../../data/types";
import type {
  ExplorerBlockDetail,
  ExplorerConnectionStatus,
  ExplorerHeads,
  RpcEndpoint,
  Unsubscribe
} from "./types";

export interface ExplorerDataSource {
  connect(endpoint: RpcEndpoint): Promise<void>;
  disconnect(): Promise<void>;
  subscribeHeads(onUpdate: (heads: ExplorerHeads) => void): Promise<Unsubscribe>;
  getRecentBlocks(limit: number): Promise<ExplorerBlock[]>;
  getBlockSummary(block: string | number): Promise<ExplorerBlock>;
  getBlockDetail(block: string | number): Promise<ExplorerBlockDetail>;
  getStatus(): ExplorerConnectionStatus;
}

export type ExplorerDataSourceFactory = (endpoint: RpcEndpoint) => ExplorerDataSource;
