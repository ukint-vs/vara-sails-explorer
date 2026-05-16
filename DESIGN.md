# Design System - Vara Sails Explorer

## Product Context

- What this is: a static Astro Vara/Sails explorer for live blocks, messages, programs, code IDs, and local Sails decode workflows.
- Who it is for: developers and operators inspecting real Vara/Sails data, debugging raw payloads, and validating IDL provenance.
- Project type: developer web app, explorer, debugging workbench.
- Memorable thing: precise, trustworthy software for inspecting real Vara/Sails data.

## Aesthetic Direction

- Direction: hybrid workbench.
- Mode: search-first entry, operator-grade explorer pages, documentarian Sails explanations only where the protocol needs teaching, and trust-first Decode Lab.
- Decoration level: minimal-functional. Thin borders, restrained surface tint, small status dots, and rare accent lines.
- First viewport rule: show actual controls and status data. Do not lead with slogan text, marketing claims, or design-system explanation.

## Typography

- Display and page titles: Poppins 600, used sparingly for page identity and major workspace labels.
- Body and UI labels: Poppins 400/500/700. Labels are uppercase for controls, status, and table headers.
- Data, tables, hashes, bytes, and traces: Roboto Mono 400/500/700 with tabular numbers.
- Rule: human hierarchy uses Poppins; inspectable data uses Roboto Mono.

## Color

- Canvas: `#040706`.
- Surfaces: `#090f0d`, `#101815`, `#17231e`.
- Primary accent: `#a8f593` for Vara identity, live/ready/success, and focused primary data.
- Info: `#7dbbcf` for resolving and informational state.
- Warning: `#f6c893` for partial, unverified, and cache-only states.
- Danger: `#e06c6c` for decode, RPC, and worker failures.
- Rule: provenance and trust badges stay calmer than decode success/failure.

## Layout

- Navigation: sticky topbar with bracketed nav, global search, endpoint/settings, and wallet action.
- Explorer pages: dense tables and inspector panels. Tables are first-class; cards frame actual tools or repeated objects only.
- Decode Lab: desktop three-zone workbench: source/provenance rail, payload/result workspace, route/trace rail.
- First viewport: active source, payload input, and primary decode action must be visible together on desktop.

## Components

- Bracket syntax `[…]` is reserved for chips and nav items only. Buttons, segmented controls, and tabs rely on shape, weight, and fill — not bracket pseudo-elements.
- Chips: bracketed, compact, uppercase, semantic color only for state.
- Buttons: primary action is brand-green high-contrast fill; secondary actions are plain compact controls with a thin border.
- Inputs: visible labels; placeholders never replace labels.
- Provenance cards: show source, idlHash, codeId/programId aliases, cache state, trust label, and timestamp.
- Diagnostics trace: collapsed by default, always copyable after every attempt.
- Route inspector: visible by default on desktop; shows header, routeIdx, candidates, consumed length, and uncertainty.

## Responsive And Accessibility

- M2 posture: desktop-first.
- Mobile minimum: single-column readable flow, no clipped controls, no overlapping text, reachable primary actions, visible source state, and copyable diagnostics.
- Accessibility: visible labels, focus-visible states, logical keyboard order, live-region announcements for async resolve/decode completion, 44px touch targets, body contrast at 4.5:1 or better, and no placeholder-only labels.

## Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-05-15 | Hybrid workbench direction | Merges search, operator, documentarian, and Decode Lab needs without turning the app into marketing. |
| 2026-05-15 | No marketing first viewport | First screen must contain usable controls and live/status data. |
| 2026-05-15 | Desktop-first Decode Lab | Mobile minimum remains required; richer mobile tabs/accordions are tracked as follow-up. |
| 2026-05-16 | Brackets reserved for chips and nav | Operator buttons stopped reading as primary actions when every control wore the same bracket costume. Buttons and segmented controls now rely on fill, weight, and border. |
| 2026-05-16 | Decode-page H1 shrinks to 20px | First-viewport rule says the workbench should lead with controls and status data, not slogan-sized hero type. Scoped to `.decode-head h1`; other page heads stay at 32px until a separate audit. |
| 2026-05-16 | Primary button = brand-green fill | DESIGN.md already promised "high contrast primary action"; implementation used white-on-black with a floating shadow. Aligned both. Disabled state is 40% opacity, no border. |
