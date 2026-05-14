Vara Sails Explorer Spec

0. Product decision

Build the explorer as a client-first direct RPC explorer, with the backend/indexer designed as a second data source, not as the core product dependency.

The first version should feel closer to Polkadot.js Apps + Sails Decode Lab than Etherscan. The user opens a static Astro app, selects a Vara RPC endpoint, watches live blocks/messages, inspects programs, decodes Sails payloads locally, uploads or extracts IDL, and optionally connects a wallet.

The second version should add an indexed historical mode for Etherscan/Solscan-grade expectations: arbitrary message search, program history, account history, analytics, shareable canonical URLs, event search, and API access.

The architectural rule:

The UI must never care whether data came from live RPC, local cache, static manifest, or hosted indexer. It talks to an ExplorerDataSource.

This keeps the product decentralized and fast to ship, while preserving the path to a production explorer.

⸻

1. Product scope

1.1 Phase 1 — Client-first explorer

Name suggestion:

Vara Sails Explorer — Direct RPC Mode

Positioning:

Connect directly to a Vara node. Browse live blocks, messages, programs, code IDs, and Sails-decoded payloads in your browser.

This is realistic because Gear-JS is the official JavaScript API for interacting with Vara programs through a Vara node, and the Vara docs specifically recommend Sails-JS for Sails apps because it uses Gear-JS for low-level communication. Vara docs also recommend dedicated VaraApi / VaraTestnetApi classes for Vara mainnet/testnet compatibility.  ￼

Client-first mode should support:

Capability	Direct RPC support
Connect to mainnet/testnet/custom RPC	Yes
Subscribe to live blocks	Yes
Fetch block data	Yes
Fetch block events	Yes
Fetch block extrinsics	Yes
Watch recent Gear messages	Yes
Decode Sails payloads in browser	Yes
Inspect known program ID	Yes
Inspect code ID if retrievable	Partial
Extract embedded sails:idl from Wasm	Yes, if code bytes available
Search recent/local messages	Yes
Search all historical messages	No
Search all programs ever deployed	No
Full account/program history	No
Network-wide analytics	No

Gear-JS already exposes block-level primitives needed for this: get block data, timestamp, block hash, events, and extrinsics.  ￼

1.2 Phase 2 — Hosted indexed explorer

Name suggestion:

Vara Sails Explorer — Indexed Mode

Positioning:

Full historical Sails-aware search, program history, account activity, analytics, and APIs.

Indexed mode should support:

Capability	Hosted backend support
Arbitrary message ID lookup	Yes
All messages for a program	Yes
All decoded events for a program	Yes
Function/event search	Yes
Account activity	Yes
Code ID → all programs	Yes
Program → all code versions	Yes
Top programs/events/errors	Yes
Decode coverage metrics	Yes
Shareable permanent URLs	Yes
Public REST/GraphQL/WebSocket API	Yes

The Vara docs describe indexers as tools that create structured indexes for efficient access to transaction histories, smart contract states, and event logs; this is exactly the role of phase 2, not a prerequisite for phase 1.  ￼

⸻

2. Design goals

2.1 Primary user journeys

Journey A — New user with a hash

User lands on explorer, pastes a message ID, block hash, program ID, code ID, account, or raw payload.

In direct RPC mode:

* block number/hash opens directly;
* message ID opens if it exists in local cache;
* program ID opens if current state/code can be queried;
* raw bytes open Decode Lab;
* unknown historical message explains: “Not in local cache. Use Indexed Mode for full history.”

In indexed mode:

* any known historical object resolves globally.

Journey B — Developer inspecting a program

Developer opens a program page and sees:

* program ID;
* code ID;
* IDL status;
* embedded sails:idl status;
* services;
* constructors;
* commands;
* queries;
* events;
* errors;
* route map;
* decoded recent calls;
* raw bytes and annotated Sails header;
* copyable SDK snippets.

Journey C — Operator watching live network

Operator opens live console and sees:

* best head;
* finalized head;
* RPC status;
* blocks per second;
* messages per block;
* decode success rate;
* error rate;
* top active programs;
* indexer lag only if indexed mode is enabled.

Journey D — Learner/onboarding

User does not understand Gear/Sails. Explorer teaches through inline explanations:

* “What is a program?”
* “What is code ID?”
* “What is Sails IDL?”
* “What is interface_id?”
* “What is entry_id?”
* “What is route_idx?”
* “Why is this payload undecoded?”

Your mocks already have all four ingredients: search-first landing, operator console, documentarian mode, and detailed decoded message pages. The final product should merge them instead of choosing only one.

⸻

3. Information architecture

3.1 Routes

For a static client-first Astro deployment, prefer clean routes with SPA fallback:

/
  Static landing + search
/explorer
  Client-side live explorer shell
/explorer/blocks
/explorer/blocks/:blockRef
/explorer/messages
/explorer/messages/:messageId
/explorer/programs
/explorer/programs/:programId
/explorer/codes
/explorer/codes/:codeId
/explorer/accounts/:accountId
/decode
  Standalone Sails Decode Lab
/docs/*
  Static MDX documentation
/settings
  RPC endpoints, wallet, cache, IDL registry, theme

If you want IPFS-compatible static hosting, use hash routing for the dynamic explorer shell:

/explorer#/messages/:messageId
/explorer#/programs/:programId
/explorer#/blocks/:blockRef

3.2 Global header

The header should always show:

Vara Sails Explorer
Mode: Direct RPC | Indexed
Network: Vara Mainnet | Vara Testnet | Local | Custom
RPC: wss://...
Best: #...
Finalized: #...
Cache: last N blocks
Wallet: disconnected / account

In direct mode, be explicit:

Direct RPC mode can search live and local data only. Full historical search requires indexed mode.

3.3 Home page

Use the search-first mock as the public default.

Main search placeholder:

Paste message ID, block hash, program ID, code ID, account, function name, event name, or raw Sails bytes

Below search:

* live head;
* finalized head;
* RPC health;
* recently active programs;
* recent decoded messages;
* decode coverage for local cache;
* “Try Decode Lab” callout;
* “How Sails decoding works” short explanation.

Avoid making dashboard metrics look global in direct mode. Label them:

Local cache · last 500 blocks

In indexed mode, label them:

Network · indexed historical data

⸻

4. Page specs

4.1 Blocks list

Direct mode:

* live block tail;
* block number;
* hash;
* timestamp;
* finalized/pending;
* extrinsic count;
* event count;
* Gear message count;
* decoded Sails count;
* decode failures.

Indexed mode adds:

* pagination;
* date filtering;
* validators/authors;
* block analytics;
* CSV export.

4.2 Block detail

Sections:

1. Summary
    block number, hash, parent hash, timestamp, finalized status.
2. Extrinsics
    pallet, call, signer, status, hash.
3. Events
    pallet, event, phase, raw data.
4. Gear/Sails messages
    message ID, source, destination, program, decoded function/event, status.
5. Raw view
    JSON and hex.

4.3 Messages list

Direct mode:

* live stream;
* local cache filters;
* kind: call, reply, event, error, constructor, unknown;
* decode status;
* program;
* function/event;
* source;
* block.

Indexed mode adds:

* full date filters;
* account filter;
* program filter;
* service/function/event filter;
* export;
* saved query links.

4.4 Message detail

This is the most important page.

Top summary

Show a human-readable sentence first:

0xdA17...1ec7 called Counter::Increment(delta: 5) on Counter and received u32(42).

Then show trust/finality badges:

Execution: Success
Decode: Decoded
Finality: Finalized
Source: Direct RPC / Indexed

Lifecycle timeline

For Vara Network:

Submitted → Included → Executed → Reply/Event emitted → Finalized

For Vara.eth later:

Ethereum tx submitted → Mirror queued → Pre-confirmed → Router batch committed → Mirror state updated → Ethereum finality

Vara.eth has no L2 blocks or shared ledger; it works through per-program state roots mirrored on L1, with Router/Mirror contracts and executor-signed transitions.  ￼

Decoded panels

Show:

* decoded call;
* decoded reply;
* decoded error;
* decoded events;
* args;
* result;
* thrown/business error;
* raw header;
* raw payload;
* related messages.

Decode status taxonomy

Every message must have a decode status:

type DecodeStatus =
  | 'decoded'
  | 'not_sails_payload'
  | 'legacy_unheadered'
  | 'bad_header_magic'
  | 'bad_header_version'
  | 'bad_header_length'
  | 'reserved_byte_nonzero'
  | 'missing_idl'
  | 'unknown_interface'
  | 'unknown_entry'
  | 'ambiguous_route'
  | 'codec_mismatch'
  | 'decode_failure'
  | 'trailing_bytes';

Never show a generic “unknown” without reason.

4.5 Program detail

Primary sections:

Overview
Services
Functions
Events
Messages
IDL
Code
Read / Query
Send Message
Raw

Overview fields:

* program ID / actor ID;
* code ID;
* name, if known;
* status;
* created block;
* init message;
* IDL source;
* IDL hash;
* embedded IDL status;
* decode coverage;
* latest message;
* wallet interaction status.

Services tab:

* service name;
* interface ID;
* route name;
* route index;
* commands;
* queries;
* events;
* errors;
* codec availability.

Important correction to the mocks:

route_idx is not the function position. The header spec defines interface_id, entry_id, and route_idx; entry_id identifies an interface entry, while route_idx selects the route/service instance, with 0x00 meaning route inference only when exactly one matching interface instance exists.  ￼

4.6 Code ID detail

Fields:

* code ID;
* Wasm hash;
* Wasm size;
* upload block;
* uploader;
* all locally known programs using this code;
* embedded sails:idl;
* IDL hash;
* IDL parse status;
* source verification status;
* raw custom sections;
* download IDL;
* open Decode Lab with this code.

In direct mode, “all programs using this code” only means local cache + static manifest. In indexed mode, it becomes global.

4.7 Decode Lab

Keep this as a first-class route.

Inputs:

* raw bytes;
* program ID;
* code ID;
* Wasm upload;
* IDL upload;
* expected decode kind;
* expected entry, optional.

Actions:

* decode call;
* decode reply;
* decode error;
* decode event;
* decode constructor;
* extract IDL from Wasm;
* annotate bytes;
* export JSON;
* copy TypeScript snippet.

Output:

* decode status;
* header;
* service;
* route;
* entry;
* codec;
* args/result/error;
* bytes consumed;
* trailing bytes;
* IDL source and hash;
* warnings.

Security copy:

Decoded data is untrusted until tied to a verified code ID, verified IDL, and finalized chain data.

⸻

5. UX rules

5.1 Direct mode honesty

Do not imitate Etherscan in direct mode. Use language like:

Local cache only
Live RPC
Not in local cache
Try indexed mode
Pin program to retain history

5.2 Two independent statuses

Each row/detail page should show both:

Execution status:
  queued | executed | replied | failed | expired | finalized
Decode status:
  decoded | missing_idl | malformed_header | ambiguous_route | codec_mismatch | unknown_entry

This prevents users from confusing “program failed” with “explorer could not decode.”

5.3 Finality language

For Vara Network:

Pending
Best block
Finalized

For Vara.eth later:

Pre-confirmed
Batch committed
Ethereum-final
Superseded by reorg

Vara.eth pre-confirmations are signed execution results fetched over RPC before the later Router batch finalizes them on Ethereum L1.  ￼

5.4 Explorer should teach

Use compact inline definitions:

programId
A deployed Gear actor.
codeId
Hash of uploaded Wasm code. Multiple programs can share one code ID.
IDL
Typed Sails interface used to decode calls, replies, errors, constructors, and events.
interface_id
Structural fingerprint of a Sails service/interface.
entry_id
Identifier of a function/event/constructor entry.
route_idx
Selector for a service instance/route inside a program.

⸻

6. Frontend architecture using Astro

Astro is a good fit because most of the site should be static documentation and shell, while only explorer widgets need hydration. Astro renders components to static HTML by default, and client-side JavaScript is loaded only for components marked with client:* directives.  ￼

6.1 Recommended stack

Astro
React islands
TypeScript
Tailwind or CSS variables based on your current styles.css
Radix UI primitives
TanStack Query
TanStack Table
Zustand or Jotai
Dexie / IndexedDB
Comlink
Web Workers
CodeMirror or Monaco
uPlot or lightweight-charts
Vitest
Playwright

Use React islands because Gear/Vara examples and wallet/web3 UI libraries are more likely to fit React. Astro still allows mixing frameworks later.

6.2 Monorepo layout

apps/
  explorer/
    astro.config.mjs
    package.json
    src/
      pages/
        index.astro
        explorer.astro
        decode.astro
        settings.astro
        docs/
          sails-idl.mdx
          direct-rpc-mode.mdx
          decode-statuses.mdx
          vara-eth.mdx
      layouts/
        BaseLayout.astro
        DocsLayout.astro
        ExplorerLayout.astro
      components/
        Header.astro
        Footer.astro
        Badge.astro
        CopyButtonShell.astro
        Tooltip.astro
      islands/
        ExplorerApp.tsx
        GlobalSearch.tsx
        RpcStatusBar.tsx
        WalletConnector.tsx
        RecentMessages.tsx
        ProgramInspector.tsx
        MessageDetail.tsx
        DecodeLab.tsx
        SettingsPanel.tsx
packages/
  explorer-core/
    src/
      types.ts
      ExplorerDataSource.ts
      search.ts
      routes.ts
      format.ts
  chain-gear-js/
    src/
      GearJsVaraDataSource.ts
      blockMapping.ts
      eventMapping.ts
      messageExtraction.ts
  chain-papi/
    src/
      PapiReadOnlyDataSource.ts
      descriptor.ts
      lightClient.ts
  chain-indexed/
    src/
      IndexedDataSource.ts
      apiClient.ts
  sails-decode/
    src/
      decodeWorker.ts
      decodeTypes.ts
      idlResolver.ts
      wasmIdl.ts
      status.ts
  local-cache/
    src/
      db.ts
      schema.ts
      retention.ts
      searchIndex.ts
  ui/
    src/
      table/
      timeline/
      cards/
      status/
      hex-viewer/
      code-viewer/
  idl-registry/
    registry.json
    idls/

6.3 Astro pages and hydration

Use Astro pages for structure and documentation. Hydrate only interactive parts.

---
import BaseLayout from '../layouts/BaseLayout.astro';
import ExplorerApp from '../islands/ExplorerApp';
---
<BaseLayout title="Vara Sails Explorer">
  <ExplorerApp client:only="react" />
</BaseLayout>

Recommended hydration rules:

Header search             client:load
RPC status bar            client:load
Explorer app shell        client:only="react"
Decode Lab                client:only="react"
Recent messages widget    client:idle
Charts                    client:visible
Docs pages                no hydration unless needed

6.4 Core data abstraction

All UI data must flow through this interface:

export interface ExplorerDataSource {
  mode: 'direct-rpc' | 'indexed' | 'hybrid';
  connect(input: ConnectInput): Promise<void>;
  disconnect(): Promise<void>;
  getChainInfo(): Promise<ChainInfo>;
  subscribeBestHead(cb: (head: ChainHead) => void): Promise<Unsubscribe>;
  subscribeFinalizedHead(cb: (head: ChainHead) => void): Promise<Unsubscribe>;
  getBlock(ref: BlockRef): Promise<BlockView | null>;
  getBlockEvents(ref: BlockRef): Promise<ChainEvent[]>;
  getBlockExtrinsics(ref: BlockRef): Promise<ExtrinsicView[]>;
  getMessage(query: MessageLookup): Promise<MessageView | null>;
  getProgram(programId: string): Promise<ProgramView | null>;
  getCode(codeId: string): Promise<CodeView | null>;
  search(query: string, scope?: SearchScope): Promise<SearchResult[]>;
  decode(input: DecodeInput): Promise<DecodeResult>;
}

Implementations:

GearJsVaraDataSource
  production direct-RPC adapter
PapiReadOnlyDataSource
  experimental read-only adapter
IndexedDataSource
  hosted backend adapter
HybridDataSource
  direct RPC for live data + indexed API for history

6.5 Direct RPC pipeline

Vara WSS node
  ↓
GearJsVaraDataSource
  ↓
subscribe best/finalized heads
  ↓
fetch block events + extrinsics
  ↓
extract Gear messages/replies/events
  ↓
resolve program/code/IDL
  ↓
decode in Web Worker
  ↓
store recent rows in IndexedDB
  ↓
render live explorer

6.6 Local cache

Use IndexedDB via Dexie.

blocks:
  number
  hash
  parentHash
  timestamp
  finalized
  source
extrinsics:
  blockNumber
  blockHash
  index
  hash
  signer
  pallet
  call
  success
  raw
events:
  blockNumber
  blockHash
  index
  pallet
  variant
  phase
  raw
messages:
  messageId
  blockNumber
  blockHash
  extrinsicHash
  source
  destination
  programId
  codeId
  kind
  payloadHex
  status
  finalized
decodedMessages:
  messageId
  decodeStatus
  kind
  service
  entry
  route
  argsJson
  resultJson
  errorJson
  headerJson
  idlHash
  decoderVersion
programs:
  programId
  codeId
  firstSeenBlock
  lastSeenBlock
  name
  idlStatus
  pinned
codes:
  codeId
  wasmHash
  wasmSize
  idlHash
  idlSource
  firstSeenBlock
idls:
  idlHash
  codeId
  source
  text
  parsedAt

Default retention:

recent blocks: 500–2,000
recent decoded messages: 10,000–50,000
pinned programs: retain until user clears
uploaded IDLs: persistent
embedded IDLs: persistent

6.7 Workers

Use Web Workers for heavy work.

rpc.worker.ts
  Optional. Owns long-lived RPC subscription if it proves stable.
decode.worker.ts
  Parses Sails header.
  Resolves IDL.
  Decodes payload.
  Extracts embedded IDL from Wasm.
  Returns DecodeResult.
cache.worker.ts
  Optional. Batches IndexedDB writes.

The decode worker is mandatory. Do not parse large Wasm blobs or decode high-volume payload streams on the main thread.

6.8 State management

Use:

TanStack Query
  async data fetching, cache, retries
Zustand/Jotai
  UI state: network, mode, selected wallet, filters, panels
RxJS or simple event emitter
  live block/message stream
Dexie
  persistent local cache

6.9 Gear-JS vs PAPI

For MVP, use Gear-JS/Sails-JS as the production adapter.

Add PAPI only as a read-only experiment. PAPI is attractive because it is light-client-first, type-safe from metadata, supports storage reads, constants, transactions, events, and runtime calls, and can use Smoldot or WebSocket providers.  ￼

Do not make PAPI migration a prerequisite. The Polkadot docs say @polkadot/api is maintenance-only and recommend Dedot or Polkadot API for new projects, but Vara’s own integration path still uses Gear-JS/Sails-JS for Gear-specific operations.  ￼

Use this split:

Gear-JS / Sails-JS:
  program operations
  send message
  calculate gas
  read state
  mailbox
  Gear events
  Sails typed calls
  production direct RPC mode
PAPI:
  experimental block/event/storage reads
  metadata explorer
  light-client/smoldot mode
  future migration path

⸻

7. Backend historical solution — phase 2

7.1 Principle

The backend must use the same shared decoding package as the frontend.

packages/sails-decode
  browser worker build
  node/indexer build

No duplicate decoder logic.

7.2 Backend architecture

Indexer workers
  ├─ block ingestor
  ├─ event/extrinsic ingestor
  ├─ Gear message extractor
  ├─ IDL resolver
  ├─ Sails decoder
  ├─ finality/reorg reconciler
  └─ metrics producer
Storage
  ├─ Postgres for canonical chain/program/message data
  ├─ ClickHouse or Timescale for analytics
  ├─ Meilisearch/Typesense/OpenSearch for search
  └─ S3/R2 for Wasm, IDL, raw payload archives
API
  ├─ REST
  ├─ GraphQL optional
  ├─ WebSocket/SSE live feed
  └─ decode endpoint
Frontend
  └─ IndexedDataSource adapter

7.3 Indexed database tables

blocks
  number, hash, parent_hash, timestamp, finalized_at, status
extrinsics
  id, block_number, index, hash, signer, pallet, call, success, raw_json
events
  id, block_number, extrinsic_id, index, pallet, variant, phase, raw_json
gear_messages
  message_id, block_number, extrinsic_id, source, destination,
  program_id, code_id, payload_hex, value, gas_limit, gas_used,
  reply_to, reply_code, status, finalized
programs
  program_id, code_id, owner, init_message_id, created_block,
  status, verified_name, latest_message_block
codes
  code_id, wasm_hash, wasm_size, upload_block, uploader,
  embedded_idl_found, idl_hash, idl_source, source_status
idls
  idl_hash, code_id, source, text, version, parsed_json, created_at
sails_interfaces
  code_id, interface_id, route_idx, route_name, service_name
sails_entries
  code_id, interface_id, route_idx, entry_id,
  kind, name, signature, return_type, throws_type, codec
decoded_messages
  message_id, decode_kind, decode_status, service_name, entry_name,
  route_idx, interface_id, entry_id, args_json, result_json,
  error_json, header_json, decoder_version, idl_hash
accounts
  account_id, first_seen_block, last_seen_block
account_activity
  account_id, block_number, message_id, role, program_id

7.4 REST API

GET /api/v1/status
GET /api/v1/search?q=
GET /api/v1/blocks
GET /api/v1/blocks/:blockRef
GET /api/v1/messages/:messageId
GET /api/v1/programs/:programId
GET /api/v1/programs/:programId/messages
GET /api/v1/programs/:programId/events
GET /api/v1/codes/:codeId
GET /api/v1/codes/:codeId/programs
GET /api/v1/accounts/:accountId
GET /api/v1/accounts/:accountId/activity
GET /api/v1/idls/:idlHash
POST /api/v1/decode

7.5 WebSocket/SSE streams

blocks.best
blocks.finalized
messages.new
messages.decoded
programs.created
codes.uploaded
decode.failures

7.6 Search index

Search should support:

message ID
block number/hash
extrinsic hash
program ID
code ID
account
service name
function name
event name
interface_id
entry_id
route_idx
raw payload prefix

7.7 Backend finality/reorg model

For Vara Network:

best block records: provisional
finalized block records: canonical

For Vara.eth later:

pre-confirmed: provisional
Router batch committed: canonical protocol state
Ethereum finalized: final-final
superseded: retained, not deleted

Vara.eth pre-confirmations are useful for instant UX, but final settlement comes later via Router commitBatch, where signatures, chaining, and state transitions are verified and applied.  ￼

⸻

8. Sails-JS implementation requirements

PR #1352 is directly aligned with this explorer. As of May 14, 2026, it is an open PR titled “feat: Add header-first Sails decode APIs”. Its goal is to let JS SDK consumers decode calls, replies, errors, constructors, and events from raw bytes using the v1 Sails header as dispatch key, and to expose malformed/unknown payloads as structured results instead of stream-breaking failures.  ￼

8.1 Required in Sails-JS for explorer MVP

1. Header-first decode APIs

Required API shape:

class SailsProgram {
  decodeCall(bytes: Uint8Array, opts?: DecodeOptions): DecodeResult;
  decodeReply(bytes: Uint8Array, opts?: DecodeOptions): DecodeResult;
  decodeError(bytes: Uint8Array, opts?: DecodeOptions): DecodeResult;
  decodeEvent(bytes: Uint8Array, opts?: DecodeOptions): DecodeResult;
  decodeConstructor(bytes: Uint8Array, opts?: DecodeOptions): DecodeResult;
  tryReadHeader(bytes: Uint8Array): SailsHeaderResult;
  resolveEntry(header: SailsMessageHeader): ResolvedEntry | UnknownEntry;
  listRoutes(): RouteMeta[];
  listEntries(): EntryMeta[];
}

The Sails header is a 16-byte userspace envelope containing magic, version, header length, interface_id, entry_id, route_idx, and a reserved byte. It enables off-chain tooling to decode payloads without executing Wasm.  ￼

2. Structured unknown results

Do not throw for ordinary decode misses.

Required result:

type DecodeResult =
  | {
      status: 'decoded';
      kind: 'call' | 'reply' | 'error' | 'event' | 'constructor';
      header: SailsMessageHeader;
      entry: ResolvedEntry;
      value: unknown;
      bytesConsumed: number;
      trailingBytes: number;
      codec: 'scale' | 'ethabi';
      idlHash?: string;
    }
  | {
      status: DecodeStatus;
      reason: string;
      header?: Partial<SailsMessageHeader>;
      rawPayload: Uint8Array;
      idlHash?: string;
    };

3. Embedded IDL extraction

Required:

extractIdlFromWasm(wasm: Uint8Array, opts?: {
  maxSectionBytes?: number;
  maxDecompressedBytes?: number;
}): ExtractedIdlResult

PR #1352 already adds extractIdlFromWasm for sails:idl custom sections, supports raw and deflate-raw IDL text, and hardens parsing with typed errors, size limits, ULEB128 handling, and reduced copies.  ￼

4. Browser-safe ESM build

Explorer needs:

No Node-only dependencies in decode path
ESM build
Worker-compatible bundle
Tree-shakeable submodules
No Buffer requirement unless polyfilled intentionally
No filesystem dependency

Example imports:

import { SailsProgram } from 'sails-js/program';
import { extractIdlFromWasm } from 'sails-js/wasm-idl';
import { decodeHeader } from 'sails-js/header';

5. Codec-aware decode

Do not silently decode ethabi entries as SCALE.

The PR discussion notes current codec tokens are scale and ethabi, and tools implementing only header-first Sails dispatch must not decode ethabi-only entries as SCALE.  ￼

Required behavior:

if (entry.codec === 'ethabi' && requestedPath === 'scale-header') {
  return {
    status: 'codec_mismatch',
    reason: 'Entry is ethabi-only and cannot be decoded through SCALE header dispatch'
  };
}

6. Route manifest/introspection

Explorer needs a public route/entry index:

type RouteMeta = {
  route: string;
  routeIdx: number;
  service: string;
  interfaceId: string;
};
type EntryMeta = {
  service: string;
  route: string;
  routeIdx: number;
  interfaceId: string;
  entryId: number;
  kind: 'command' | 'query' | 'event' | 'constructor';
  name: string;
  args: TypeMeta[];
  result?: TypeMeta;
  throws?: TypeMeta;
  codec: ('scale' | 'ethabi')[];
};

7. IDL hash utility

Required:

canonicalizeIdl(idl: string): string;
hashIdl(idl: string): string;

This is needed for:

* local cache;
* code ID → IDL mapping;
* verification;
* decoder reproducibility;
* comparing embedded vs uploaded IDL.

8. Friendly error classes

Required:

WasmParseError
WasmSectionNotFoundError
WasmSectionTooLargeError
IdlParseError
HeaderParseError
DecodeError
CodecMismatchError

The explorer should map these to user-facing statuses.

8.2 Strongly recommended Sails improvements

A. Preserve docs in IDL

For onboarding, Sails IDL should optionally include Rust doc comments:

/// Increments the counter by `delta`.
#[export]
pub fn increment(&mut self, delta: u32) -> u32

IDL metadata:

{
  "name": "Increment",
  "docs": ["Increments the counter by `delta`."]
}

This enables the “documentarian” UI.

B. Stable entry/route lockfile

Because entry_id is deterministic and can shift when interfaces change, production programs need optional lockfiles:

sails.lock
  interface_id
  route_idx
  entry_id
  entry_name
  signature_hash

Header spec says implementations may freeze assignment externally for backward compatibility.  ￼

C. Program manifest

Explorer needs more than IDL in some cases:

{
  "programName": "Counter",
  "codeId": "0x...",
  "idlHash": "0x...",
  "routes": [
    {
      "route": "counter",
      "routeIdx": 1,
      "service": "Counter",
      "interfaceId": "0x..."
    }
  ],
  "docsUrl": "...",
  "sourceUrl": "...",
  "repository": "...",
  "build": {
    "sailsVersion": "...",
    "rustc": "...",
    "profile": "release"
  }
}

This could be embedded separately or distributed through a static registry.

D. Decode benchmarking hooks

The explorer should show decode timing only if cheap:

decodeCall(bytes, { includeTiming: true })

E. Pre-confirmation decode support for Vara.eth

For Vara.eth, Sails-JS or a sibling SDK should expose:

decodePreconfirmation(attestation, programId, idl): DecodedPreconfirmation
verifyPreconfirmation(attestation, routerPublicKey): boolean
subscribePreconfirmations(programId, cb): Unsubscribe

This may belong in a Vara.eth SDK package rather than core Sails-JS, but the explorer will need it later.

⸻

9. IDL resolution strategy

In client-first mode:

1. Embedded sails:idl custom section from Wasm
2. Locally cached IDL for codeId
3. User-uploaded IDL
4. Static registry bundled with app
5. Raw/unknown

Static registry example:

{
  "programs": {
    "0x4a3f...": {
      "name": "Counter",
      "codeId": "0x91be...",
      "idlHash": "0xabcd...",
      "idlUrl": "/idls/counter.idl",
      "docsUrl": "https://..."
    }
  },
  "codes": {
    "0x91be...": {
      "name": "Counter",
      "idlHash": "0xabcd...",
      "idlUrl": "/idls/counter.idl"
    }
  }
}

In indexed mode:

1. Verified source + reproducible build IDL
2. Embedded IDL
3. Official registry IDL
4. User-submitted unverified IDL
5. Raw/unknown

⸻

10. Security and trust model

10.1 Browser decode safety

The explorer must never execute Wasm. It may only parse custom sections.

Rules:

Cap Wasm size
Cap custom-section size
Cap decompressed IDL size
Reject malformed ULEB128
Reject invalid UTF-8
Reject bad header length
Reject non-zero reserved byte for v1
Skip unknown TLV extensions safely
Do not trust interface_id until validated against IDL
Do not trust decoded data for security decisions

The header spec requires validating magic, version, header length, reserved byte, extensions, and route inference, and says tooling should treat identifiers as untrusted until cross-checked against a known manifest.  ￼

10.2 User-facing trust badges

IDL source:
  embedded | uploaded | static registry | indexed registry | verified source | unknown
Data source:
  direct RPC | local cache | indexed | mixed
Finality:
  pending | finalized | pre-confirmed | batch committed | Ethereum finalized | superseded
Decode:
  decoded | partial | failed | missing IDL

⸻

11. Implementation milestones

Milestone 0 — Design system extraction

Deliver:

Astro app shell
theme tokens from current mocks
header/nav
status badges
tables
hex viewer
copy buttons
empty states
tooltips

Acceptance:

* static routes render without JS;
* dark/light theme works;
* mock pages converted to Astro/React components.

Milestone 1 — Direct RPC live explorer

Deliver:

GearJsVaraDataSource
RPC endpoint selector
best/finalized head subscription
block list
block detail
event/extrinsic fetch
local cache
settings page

Acceptance:

* user can connect to Vara testnet;
* live blocks update;
* block detail loads events and extrinsics;
* app works without wallet.

Milestone 2 — Sails decode engine

Deliver:

decode worker
IDL upload
embedded IDL extraction
SailsProgram cache by idlHash/codeId
decode statuses
Decode Lab
message raw/decoded panels

Acceptance:

* raw Sails payload decodes in browser;
* malformed payload produces structured status;
* route ambiguity is displayed correctly;
* ethabi-only entries are not decoded as SCALE.

Milestone 3 — Program explorer

Deliver:

program detail page
code detail page
services/functions/events tab
local recent messages
pin program
static registry support
copy SDK snippets

Acceptance:

* known program displays Sails services;
* recent local messages decode against program IDL;
* user can pin program and retain local history.

Milestone 4 — Search and onboarding

Deliver:

search-first landing
local search
docs pages
decode status docs
story-style message explanation
operator console variant

Acceptance:

* search clearly distinguishes local/direct from indexed/global;
* unknown historical messages do not look like app failures.

Milestone 5 — Indexed mode adapter

Deliver:

IndexedDataSource
REST API client
global search
program history
message permanent pages
account activity

Acceptance:

* same UI routes work with indexed backend;
* direct/indexed mode can be toggled;
* historical pages hydrate from backend but can still verify/decode locally where possible.

⸻

12. Final architecture summary

Build the first product as:

Astro static app
  + React explorer island
  + Gear-JS/Sails-JS direct RPC adapter
  + Sails decode worker
  + IndexedDB local cache
  + static IDL/program registry
  + optional PAPI read-only prototype

Build the second product as:

Same Astro frontend
  + IndexedDataSource
  + Sails-aware historical backend
  + Postgres/ClickHouse/search
  + REST/WebSocket APIs

The key product line:

Client-first does not mean backend-never. It means the browser is the first-class explorer, and the backend is an acceleration/history layer.

The key Sails-JS line:

Sails-JS should become the canonical browser-safe decoder for raw Sails messages, embedded IDL, route/entry introspection, and structured unknown results.

That is the differentiator: a Vara explorer where a Gear program is not just a hash, but a typed, inspectable application.
