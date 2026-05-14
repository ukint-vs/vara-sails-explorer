# Web explorer UX/UI refactor spec

## Product frame

The explorer should not look like an internal terminal or blockchain node dashboard. It should look like a trustworthy web3 product that can explain Gear programs to non-expert users while still giving developers raw protocol depth.

The primary object model is:

```text
Code ID → Program → Sails IDL → Message → Decoded call/reply/event/error
```

## Visual direction

### Palette

Use a restrained neutral explorer palette with Vara green as an accent, not as the whole UI.

- Background: graphite/navy black.
- Surfaces: layered blue-gray panels.
- Borders: cool gray, visible but not high contrast.
- Primary accent: Vara green for Sails/decode/product trust.
- Info blue: direct RPC, pre-confirmation, best head.
- Success green: finalized/executed/healthy.
- Warning amber: missing IDL, pending, degraded, low executable balance.
- Danger red: failed execution, malformed header, offline.
- Violet: query/read-only or route/service metadata.

### Typography

- Use system sans for product UI.
- Use mono only for hashes, code, bytes, IDs, and snippets.
- Avoid mono everywhere; it makes the product feel like a debug console.

### Indicators

Do not use color-only indicators. Every indicator must include text.

Required indicator families:

```text
Execution: queued | included | executed | replied | failed | expired
Decode: decoded | missing_idl | unknown_interface | bad_header | codec_mismatch | not_sails_payload
Finality: best_block | finalized | pre_confirmed | l1_final | superseded
Data source: direct_rpc | local_cache | static_registry | indexed | mixed
Trust: verified_source | embedded_idl | registry_idl | user_idl | unknown
Program health: active | low_executable_balance | halted | exited | unknown
```

## Layout model

### Global header

Show identity, primary nav, RPC/network, theme, wallet.

### Status strip

Always show:

- data source;
- best/finalized head;
- node health/latency;
- local cache window.

This prevents users from confusing direct RPC mode with indexed historical mode.

### Home

Search first. Then live context and direct-mode limitations.

### Messages

Table rows must show execution, decode, finality, program, decoded activity, and block.

### Message detail

Show a natural language summary first:

> Account X called Program.method(args) and received Result.

Then show lifecycle, decoded call/reply/events, identifiers, trust, and raw bytes.

### Program detail

Program pages should read like app profiles, not hash dumps:

- identity;
- health;
- executable balance;
- decode coverage;
- services/functions/events;
- recent activity;
- developer actions;
- IDL/source trust.

### Decode lab

The decode lab should be strict and explain failures. It should never return generic “unknown.”

## Astro mapping

Suggested component split:

```text
layouts/BaseLayout.astro
components/Topbar.astro
components/StatusStrip.astro
components/Card.astro
components/Chip.astro
components/TableShell.astro
islands/ExplorerSearch.tsx
islands/MessageStream.tsx
islands/DecodeLab.tsx
islands/ProgramInspector.tsx
islands/RpcStatusBar.tsx
```

Use Astro for static shell/docs and React islands for RPC subscriptions, local cache, wallet connection, and decode lab.
