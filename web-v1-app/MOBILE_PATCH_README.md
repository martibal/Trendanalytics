# Urd Atlas mobile UX patch

Unpack this zip in the project root so the included `src/` and `public/` folders overwrite the existing files.

What this patch does:

- Hides the global desktop navbar and footer on `/mobile/*` routes.
- Replaces the mobile bottom nav with mobile-only links: Home, BTC, ETH, ARB, BASE, Plans, Dash.
- Adds a reusable mobile dropdown menu with only mobile routes.
- Reworks `/mobile` into a compact mobile landing page: hero, workflow, chain labels, terms, JSON pipeline, plans.
- Replaces workflow image assets with the high-resolution 1448×1086 images.
- Allows pinch zoom on mobile by fixing the mobile viewport settings.
- Removes desktop escape links from mobile pages.
- Adds `/mobile/dashboard` and redirects mobile `/dashboard` traffic there.
- Removes inactive full-history package messaging from mobile plans/API docs.

After unpacking, run:

```bash
npm run dev
```

Then test:

```text
/mobile
/mobile/plans
/mobile/dashboard
/mobile/chain/bitcoin
/mobile/chain/ethereum
/mobile/chain/arbitrum
/mobile/chain/base
/mobile/api-docs
/mobile/methodology
/mobile/wiki
```

Also test on a physical phone or Chrome DevTools mobile mode:

- Menu dropdown should only show mobile pages.
- Bottom nav should only use mobile routes plus mobile dashboard.
- The desktop navbar/footer should not appear on `/mobile/*`.
- Workflow images should open large and pan horizontally.
