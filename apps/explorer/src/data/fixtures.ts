import type {
  AccountSummary,
  CodeSummary,
  EventMetric,
  ExplorerBlock,
  ExplorerMessage,
  ExplorerProgram,
  Metric,
  NetStat,
  Variant
} from "./types";

export const statusStrip = {
  dataSource: "Direct RPC",
  heads: "#18,427,057 / #18,427,054",
  nodeHealth: "38 ms",
  cache: "512 blocks · 10k msgs"
};

export const netStats: NetStat[] = [
  { label: "Best block", value: "#18,427,057", note: "4s ago · 3.0s block time", tone: "brand", live: true },
  { label: "Finalized", value: "#18,427,054", note: "lag 3 blocks", tone: "neutral" },
  { label: "Data source", value: "Preview", note: "static rows until live RPC connects", tone: "info" },
  { label: "Cached blocks", value: "512", note: "bounded local window", tone: "neutral" },
  { label: "Gear events", value: "189", note: "observed in fixture window", tone: "steel" },
  { label: "Failed ext.", value: "18", note: "fixture window", tone: "warn" }
];

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
    label: "IDL readiness",
    value: "91.6%",
    note: "fixture preview for later decode work",
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
    kind: "call",
    execution: "executed",
    decode: "decoded",
    finality: "pre_confirmed",
    dataSource: "direct_rpc",
    trust: "embedded_idl",
    program: "CLOB OrderBook",
    programId: "0x4f8c8f...a241",
    codeId: "0x91be77...7bd2",
    caller: "0xdA17...1ec7",
    activity: "OrderBook.place_limit_order(side: Buy, qty: 2.4)",
    result: "OrderAccepted · 1 partial fill",
    block: "#18,427,057",
    payload: "0x5341494c01108b7d9c110701000102a4010000c8b1a0f4...",
    fee: "0.018 [V]"
  },
  {
    id: "0x4f11ab18dc249178d00c44e0",
    time: "14:08:53",
    age: "7s ago",
    kind: "call",
    execution: "replied",
    decode: "decoded",
    finality: "finalized",
    dataSource: "local_cache",
    trust: "registry_idl",
    program: "Counter",
    programId: "0x91bb72...c008",
    codeId: "0xa173de...ce22",
    caller: "0x71c3...ad90",
    activity: "Counter.increment(delta: 1)",
    result: "Reply Ok(new_value: 42)",
    block: "#18,427,056",
    payload: "0x5341494c01107416b0e701000101",
    fee: "0.006 [V]"
  },
  {
    id: "0xa6302e55dd9209b1d64c27aa",
    time: "14:08:49",
    age: "11s ago",
    kind: "call",
    execution: "included",
    decode: "decoded",
    finality: "best_block",
    dataSource: "direct_rpc",
    trust: "user_idl",
    program: "Vault",
    programId: "0xa81047...902b",
    codeId: "0x77e342...441c",
    caller: "0x9c71...d4a0",
    activity: "Vault.withdraw(token: USDC, amount: 500)",
    result: "Pending finality gate",
    block: "#18,427,057",
    payload: "0x5341494c01104df0a6aa090100ffe0...",
    fee: "0.021 [V]"
  },
  {
    id: "0xd770910f151e2040a10cf179",
    time: "14:08:44",
    age: "16s ago",
    kind: "call",
    execution: "failed",
    decode: "missing_idl",
    finality: "finalized",
    dataSource: "local_cache",
    trust: "unknown",
    program: "Unknown program",
    programId: "0xc1195e...d034",
    codeId: "0x000000...0000",
    caller: "0xd3a1...b160",
    activity: "entry_id=0x812f · route_idx=1",
    result: "IDL not found for code ID",
    block: "#18,427,055",
    payload: "0x9f004101aabbccdd...",
    fee: "0.004 [V]"
  },
  {
    id: "0xcc4f88aa01192e2040a10cf8e22",
    time: "14:08:41",
    age: "19s ago",
    kind: "event",
    execution: "executed",
    decode: "decoded",
    finality: "finalized",
    dataSource: "local_cache",
    trust: "embedded_idl",
    program: "Rmrk-Resource",
    programId: "0xdc8e64...19a3",
    codeId: "0x2bce90...c819",
    caller: "0xcc4f...8e22",
    activity: "ResourceAdded(id: 881)",
    result: "Event emitted",
    block: "#18,427,052",
    payload: "0x5341494c0110d12e...",
    fee: "0.011 [V]"
  },
  {
    id: "0x7a2200112233445566778899c5ff",
    time: "14:08:38",
    age: "22s ago",
    kind: "query",
    execution: "replied",
    decode: "decoded",
    finality: "best_block",
    dataSource: "direct_rpc",
    trust: "registry_idl",
    program: "Vft-Manager",
    programId: "0xb2014a...4f7a",
    codeId: "0xd80144...d572",
    caller: "0x7a22...c5ff",
    activity: "Vft.balanceOf(account)",
    result: "124,882 units",
    block: "#18,427,051",
    payload: "0x5341494c0110ff10...",
    fee: "0.002 [V]"
  },
  {
    id: "0x66a2001122334455667788997700",
    time: "14:08:35",
    age: "25s ago",
    kind: "call",
    execution: "included",
    decode: "trailing_bytes",
    finality: "pre_confirmed",
    dataSource: "local_cache",
    trust: "embedded_idl",
    program: "Counter",
    programId: "0x91bb72...c008",
    codeId: "0xa173de...ce22",
    caller: "0x66a2...7700",
    activity: "Counter.increment(delta: 5)",
    result: "Decoded with trailing bytes preserved",
    block: "#18,427,050",
    payload: "0x5341494c01107416b0e7050000ff",
    fee: "0.006 [V]"
  }
];

export const blocks: ExplorerBlock[] = [
  {
    number: "#18,427,057",
    hash: "0x441bd7...13c9",
    timestamp: "14:08:57",
    age: "4s ago",
    author: "0x9aE2...41bb",
    finality: "best_block",
    extrinsics: 84,
    events: 211,
    gearMessages: 49,
    decodedSails: 45,
    failures: 4
  },
  {
    number: "#18,427,056",
    hash: "0x870b41...a9e0",
    timestamp: "14:08:51",
    age: "7s ago",
    author: "0x3cF0...8d12",
    finality: "finalized",
    extrinsics: 77,
    events: 196,
    gearMessages: 42,
    decodedSails: 42,
    failures: 0
  },
  {
    number: "#18,427,055",
    hash: "0x1883a2...0fd1",
    timestamp: "14:08:45",
    age: "10s ago",
    author: "0xb1aD...5cc2",
    finality: "finalized",
    extrinsics: 68,
    events: 177,
    gearMessages: 36,
    decodedSails: 29,
    failures: 7
  },
  {
    number: "#18,427,054",
    hash: "0x7e140d...b621",
    timestamp: "14:08:39",
    age: "13s ago",
    author: "0xCE91...22a0",
    finality: "finalized",
    extrinsics: 81,
    events: 205,
    gearMessages: 52,
    decodedSails: 48,
    failures: 4
  },
  {
    number: "#18,427,053",
    hash: "0x2810ad...e7e0",
    timestamp: "14:08:34",
    age: "18s ago",
    author: "0x2810...e7e0",
    finality: "finalized",
    extrinsics: 55,
    events: 144,
    gearMessages: 31,
    decodedSails: 30,
    failures: 1
  },
  {
    number: "#18,427,052",
    hash: "0x77f22a...ab09",
    timestamp: "14:08:28",
    age: "24s ago",
    author: "0x77f2...ab09",
    finality: "finalized",
    extrinsics: 61,
    events: 155,
    gearMessages: 27,
    decodedSails: 24,
    failures: 3
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
    messages24h: "42,890",
    executableBalance: "2.8k [V]",
    deployedAt: "#18,201,443"
  },
  {
    name: "Vft-Manager",
    programId: "0xb2014a...4f7a",
    codeId: "0xd80144...d572",
    idlHash: "0x51ec12...a600",
    health: "active",
    trust: "embedded_idl",
    decodeCoverage: "98.4%",
    messages24h: "18,927",
    executableBalance: "9.4k [V]",
    deployedAt: "#18,199,810"
  },
  {
    name: "Counter",
    programId: "0x91bb72...c008",
    codeId: "0xa173de...ce22",
    idlHash: "0x6ef342...b119",
    health: "active",
    trust: "registry_idl",
    decodeCoverage: "100%",
    messages24h: "8,114",
    executableBalance: "1.2k [V]",
    deployedAt: "#18,402,194"
  },
  {
    name: "Dex-Pool",
    programId: "0x6f1c0a...e21b",
    codeId: "0xe491c0...82f4",
    idlHash: "0x14b68e...3490",
    health: "active",
    trust: "verified_source",
    decodeCoverage: "96.8%",
    messages24h: "3,108",
    executableBalance: "5.6k [V]",
    deployedAt: "#18,177,020"
  },
  {
    name: "Vault",
    programId: "0xa81047...902b",
    codeId: "0x77e342...441c",
    idlHash: "0x2b4c90...ae88",
    health: "low_executable_balance",
    trust: "user_idl",
    decodeCoverage: "87.4%",
    messages24h: "1,982",
    executableBalance: "114 [V]",
    deployedAt: "#18,303,884"
  }
];

export const topEvents: EventMetric[] = [
  { name: "Transfer", program: "Vft-Manager", count: "8,214", trend: [30, 55, 42, 70, 82, 65, 90] },
  { name: "OrderAccepted", program: "CLOB OrderBook", count: "4,881", trend: [48, 52, 39, 68, 73, 77, 88] },
  { name: "Swapped", program: "Dex-Pool", count: "2,904", trend: [22, 38, 60, 45, 72, 80, 55] },
  { name: "Incremented", program: "Counter", count: "1,908", trend: [40, 52, 46, 61, 59, 66, 70] }
];

export const codeSummaries: CodeSummary[] = [
  {
    codeId: "0x91be77...7bd2",
    wasmHash: "0x91be77b7d2f13a44",
    size: "286 KB",
    uploadedAt: "#18,201,021",
    programs: "4 local programs",
    idlStatus: "embedded sails:idl",
    trust: "verified_source"
  },
  {
    codeId: "0xa173de...ce22",
    wasmHash: "0xa173de6ef342b119",
    size: "142 KB",
    uploadedAt: "#18,402,194",
    programs: "2 local programs",
    idlStatus: "registry IDL",
    trust: "registry_idl"
  },
  {
    codeId: "0x77e342...441c",
    wasmHash: "0x77e3422b4c90ae88",
    size: "311 KB",
    uploadedAt: "#18,303,884",
    programs: "1 pinned program",
    idlStatus: "user IDL",
    trust: "user_idl"
  }
];

export const accountSummaries: AccountSummary[] = [
  { accountId: "0xdA17...1ec7", label: "Order flow sender", messages24h: "1,744", lastSeen: "4s ago", role: "caller" },
  { accountId: "0x71c3...ad90", label: "Counter tester", messages24h: "422", lastSeen: "7s ago", role: "caller" },
  { accountId: "0x9c71...d4a0", label: "Vault operator", messages24h: "88", lastSeen: "11s ago", role: "caller" }
];

export const variants: Variant[] = [
  {
    slug: "terminal",
    name: "A · Terminal",
    caption: "Raw IDs, headers, bytes, and decode flags for protocol debugging.",
    route: "/variants/terminal",
    role: "Raw debugging"
  },
  {
    slug: "operator",
    name: "B · Operator",
    caption: "Block tails, health, decode failures, lag, and throughput.",
    route: "/variants/operator",
    role: "Live monitoring"
  },
  {
    slug: "documentarian",
    name: "C · Documentarian",
    caption: "Program IDs, code IDs, IDL hashes, interfaces, entries, and routes.",
    route: "/variants/documentarian",
    role: "Onboarding"
  },
  {
    slug: "search-first",
    name: "D · Search-first",
    caption: "Lookup flow for hash, account, code ID, function, event, or payload.",
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
