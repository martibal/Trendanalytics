# Chain page depth upgrade — patch manifest

This bundle is a **research-backed implementation bundle** for the next major upgrade of the chain page.

It is **not** a one-file cosmetic tweak. The user feedback implies a content-model problem and an interaction-model problem at the same time.

## Why these files

The current chain page already renders the published contract correctly enough, but it underserves two reader types:

- **Basic** readers do not get enough plain-language explanation of what the page is saying or why they should care.
- **Advanced** readers do not get enough methodological depth about regime rules, confidence semantics, score construction, driver selection, and chain-specific caveats.

To solve that, the page needs:

1. a reusable explanation card pattern,
2. a central content registry for chain-specific and concept-specific copy,
3. richer tooltip / info-box behavior,
4. richer chain configuration metadata,
5. targeted integration into `src/app/chains/[chain]/page.tsx`.

## Files in this bundle

### Full code files
- `src/config/chains.ts`
- `src/lib/content/chainExplainers.ts`
- `src/components/ui/ExplainableCard.tsx`
- `src/components/MetricTooltip.tsx`
- `src/components/MetricInfoBox.tsx`
- `src/components/DriverExplanation.tsx`

### Integration / redesign notes
- `src/app/chains/[chain]/CHAIN_PAGE_REDESIGN_NOTES.md`
- `RESEARCH_NOTES.md`

## What this bundle is intended to unlock

After these files are in place, the chain page can be upgraded so that:

- the chain header includes a usable primer about the chain itself,
- regime / confidence / determinism all have a short visible explanation plus a deeper expandable one,
- scorecard and drivers stop reading like thin traceability blocks,
- metric-level explanation can become much more pedagogical,
- the page can support **More → Basic / Advanced** in a consistent way,
- BTC / ETH / Arbitrum / Base can each explain what actually makes them different.

## Important implementation note

The page file `src/app/chains/[chain]/page.tsx` is intentionally **not** replaced in full here, because it is large and tightly coupled to the current rendering logic. The included redesign notes tell you exactly where the new content system should be wired in.

That is the safest way to avoid introducing regressions while still moving the page from “thin shell” to “deep explanatory surface”.
