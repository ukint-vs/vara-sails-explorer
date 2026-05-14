# Vara Sails Explorer — production mock refactor v2

This bundle refactors the original terminal-heavy static mocks into a production-grade explorer direction.

## What changed

- Replaced neon/terminal-first styling with a calmer explorer palette.
- Replaced bracket navigation with product navigation.
- Replaced unlabeled status dots with labeled semantic chips.
- Separated execution, decode, finality, data source, and trust states.
- Made Direct RPC limitations explicit instead of implying global historical search.
- Moved raw hex/header data below decoded meaning.
- Used system UI typography and reserved monospace only for hashes, code, and bytes.
- Added responsive layouts and accessible focus states.

## Files

- `index.html` — search-first overview and live message stream.
- `messages.html` — direct RPC/local-cache message stream.
- `message-detail.html` — production message detail UX.
- `program-detail.html` — program profile and Sails interface UX.
- `blocks.html` — block list with Sails-specific decode context.
- `decode-tool.html` — Sails decode lab.
- `settings.html` — direct RPC/cache settings placeholder.
- `styles.css` — production token system and components.
- `app.js` — theme toggle, copy buttons, local table filter.
- `design-spec.md` — UX/UI refactor specification.

## Product stance

This is still a static mock, but it models the real product architecture:

1. Direct RPC mode first.
2. Local IndexedDB cache second.
3. Static program/IDL registry for known programs.
4. Hosted historical indexer later.

The UI is designed so the same components can be implemented as Astro layouts plus React islands.
