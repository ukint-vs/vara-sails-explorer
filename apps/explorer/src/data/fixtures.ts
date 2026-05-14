import type { ExplorerBlock, ExplorerMessage, ExplorerProgram, Metric, Variant } from "./types";

export const statusStrip = {
  dataSource: "Direct RPC",
  heads: "#18,427,057 / #18,427,054",
  nodeHealth: "38 ms",
  cache: "512 blocks · 10k msgs"
};

export const metrics: Metric[] = [
  {
    label: "Live messages",
    value: "20,416",
    note: "local session · last 512 blocks",
    tone: "success",
    badge: "+487/s",
    progress: 72
  },
  {
    label: "Decode coverage",
    value: "91.6%",
    note: "decoded with embedded, registry, or user IDL",
    tone: "brand",
    badge: "Sails",
    progress: 92
  },
  {
    label: "Active programs",
    value: "1,284",
    note: "12 newly seen in local cache",
    tone: "info",
    badge: "24h",
    progress: 58
  },
  {
    label: "Finality lag",
    value: "3",
    note: "best to finalized blocks",
    tone: "success",
    badge: "Normal",
    progress: 24
  }
];

export const messages: ExplorerMessage[] = [
  {
    id: "0xb8a4e9f3c6729180a41b92ef",
    time: "14:08:56",
    age: "4s ago",
    execution: "executed",
    decode: "decoded",
    finality: "pre_confirmed",
    dataSource: "direct_rpc",
    trust: "embedded_idl",
    program: "CLOB OrderBook",
    programId: "0x4f8c8f...a241",
    codeId: "0x91be77...7bd2",
    caller: "0xdA17...1ec7",
    activity: "place_limit_order(side: Buy, qty: 2.4)",
    result: "OrderAccepted · 1 partial fill",
    block: "#18,427,057",
    payload: "0x5341494c01108b7d9c110701000102a4010000c8b1a0f4..."
  },
  {
    id: "0x4f11ab18dc249178d00c44e0",
    time: "14:08:53",
    age: "7s ago",
    execution: "replied",
    decode: "decoded",
    finality: "finalized",
    dataSource: "local_cache",
    trust: "registry_idl",
    program: "Counter",
    programId: "0x91bb72...c008",
    codeId: "0xa173de...ce22",
    caller: "0x71c3...ad90",
    activity: "increment(delta: 1)",
    result: "Reply Ok(new_value: 42)",
    block: "#18,427,056",
    payload: "0x5341494c01107416b0e701000101"
  },
  {
    id: "0xa6302e55dd9209b1d64c27aa",
    time: "14:08:49",
    age: "11s ago",
    execution: "included",
    decode: "decoded",
    finality: "best_block",
    dataSource: "direct_rpc",
    trust: "user_idl",
    program: "Vault",
    programId: "0xa81047...902b",
    codeId: "0x77e342...441c",
    caller: "0x9c71...d4a0",
    activity: "withdraw(token: USDC, amount: 500)",
    result: "Pending finality gate",
    block: "#18,427,057",
    payload: "0x5341494c01104df0a6aa090100ffe0..."
  },
  {
    id: "0xd770910f151e2040a10cf179",
    time: "14:08:44",
    age: "16s ago",
    execution: "failed",
    decode: "missing_idl",
    finality: "finalized",
    dataSource: "local_cache",
    trust: "unknown",
    program: "Unknown program",
    programId: "0xc1195e...d034",
    codeId: "0x000000...0000",
    caller: "0xd3a1...b160",
    activity: "raw payload",
    result: "IDL not found for code ID",
    block: "#18,427,055",
    payload: "0x9f004101aabbccdd..."
  }
];

export const blocks: ExplorerBlock[] = [
  {
    number: "#18,427,057",
    hash: "0x441bd7...13c9",
    timestamp: "14:08:57",
    finality: "best_block",
    extrinsics: 84,
    events: 211,
    gearMessages: 49,
    decodedSails: 45
  },
  {
    number: "#18,427,056",
    hash: "0x870b41...a9e0",
    timestamp: "14:08:51",
    finality: "finalized",
    extrinsics: 77,
    events: 196,
    gearMessages: 42,
    decodedSails: 42
  },
  {
    number: "#18,427,055",
    hash: "0x1883a2...0fd1",
    timestamp: "14:08:45",
    finality: "finalized",
    extrinsics: 68,
    events: 177,
    gearMessages: 36,
    decodedSails: 29
  },
  {
    number: "#18,427,054",
    hash: "0x7e140d...b621",
    timestamp: "14:08:39",
    finality: "finalized",
    extrinsics: 81,
    events: 205,
    gearMessages: 52,
    decodedSails: 48
  }
];

export const programs: ExplorerProgram[] = [
  {
    name: "CLOB OrderBook / ETH-USDC",
    programId: "0x4f8c8f...a241",
    codeId: "0x91be77...7bd2",
    idlHash: "0xf13a44...9c02",
    health: "active",
    trust: "verified_source",
    decodeCoverage: "99.1%",
    messages24h: "42,890"
  },
  {
    name: "Counter",
    programId: "0x91bb72...c008",
    codeId: "0xa173de...ce22",
    idlHash: "0x6ef342...b119",
    health: "active",
    trust: "registry_idl",
    decodeCoverage: "100%",
    messages24h: "8,114"
  },
  {
    name: "Vault",
    programId: "0xa81047...902b",
    codeId: "0x77e342...441c",
    idlHash: "0x2b4c90...ae88",
    health: "low_executable_balance",
    trust: "user_idl",
    decodeCoverage: "87.4%",
    messages24h: "1,982"
  }
];

export const variants: Variant[] = [
  {
    slug: "terminal",
    name: "A · Terminal",
    caption: "Brutalist, mono-heavy, precise for protocol readers.",
    route: "/variants/terminal",
    role: "Raw debugging"
  },
  {
    slug: "operator",
    name: "B · Operator",
    caption: "Dense console for block tails, health, decode failures, and throughput.",
    route: "/variants/operator",
    role: "Live monitoring"
  },
  {
    slug: "documentarian",
    name: "C · Documentarian",
    caption: "Explains programs, Sails IDL, interface IDs, entries, and routes.",
    route: "/variants/documentarian",
    role: "Onboarding"
  },
  {
    slug: "search-first",
    name: "D · Search-first",
    caption: "For users who arrive with a hash, account, code ID, or raw payload.",
    route: "/variants/search-first",
    role: "Object lookup"
  }
];

export const serviceEntries = [
  ["place_limit_order", "Command", "SCALE", "iface 0x8b7d9c11 · entry 7 · route 1"],
  ["cancel_order", "Command", "SCALE", "iface 0x8b7d9c11 · entry 8 · route 1"],
  ["best_bid_ask", "Query", "SCALE", "iface 0x8b7d9c11 · entry 2 · route 1"],
  ["TradeExecuted", "Event", "SCALE", "iface 0x8b7d9c11 · entry 22 · route 1"]
] as const;
