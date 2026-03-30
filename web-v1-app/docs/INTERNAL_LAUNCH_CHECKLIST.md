# Internal Launch Checklist (Web-Only)

This checklist is intentionally limited to code and web-surface quality.
It does not replace external validation of Stripe, Vercel, Supabase, webhooks, or production entitlement flows.

## Required green commands

```bash
npm run check:repo-hygiene
npm run check:route-docs-sync
npm run check:launch-readiness
npm run check:public-copy-guard
npm run lint
npm run typecheck
npm run test
npm run build
```

## What these checks prove

- Repo does not contain known artifact folders and accidental duplicate source files.
- Required public pages and support API routes exist.
- API docs mention the required public/support routes.
- Public copy does not drift into forecasting or advisory phrasing.
- Major public surfaces required for launch are still present.
- Hard-coded localhost self-fetch does not exist in `src/app` or `src/lib`.
- Methodology-version context still appears on core public trust surfaces.

## Still requires human verification

- Mobile/responsive behavior
- Keyboard/focus behavior in browser
- Modal behavior
- Lighthouse / real browser performance
- Production data freshness
- Billing and entitlement flows
