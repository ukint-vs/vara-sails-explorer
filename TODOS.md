# TODOs

## Post-M1 Explorer UX, Content, and Visual Pass

What: Rework the explorer's visual density, color range, and wording against the OG `docs/*.html`, the visual feedback document, and common explorer patterns from Etherscan, Solscan, Near Explorer, and related daily-use chain tools.

Why: Milestone 1 intentionally keeps visual churn out of the live RPC implementation. The current app still needs a focused pass so it reads as an ecosystem tool for daily operators, builders, and analysts rather than as a marketing page.

Pros: Improves scan speed, trust, and daily-use ergonomics after the app has real live states to design around.

Cons: Likely touches many pages/components and should not be mixed with the live RPC data-layer work.

Context: Start from `docs/index.html`, `docs/messages.html`, `docs/blocks.html`, and the current Astro pages. Preserve the strong parts of the OG explorer UX while reducing meaningless wording and adding a less mono/sad visual range.

Depends on / blocked by: Best done after M1 live RPC lands so the redesign can respond to real connected, degraded, cache-only, and block-detail states.
