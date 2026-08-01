# Urd Atlas 2.0 build checklist

Before merging this branch:

- [ ] Run `npm run lint` in `web-v1-app`.
- [ ] Run `npm run typecheck` in `web-v1-app`.
- [ ] Run `npm run build` in `web-v1-app`.
- [ ] Verify `/` renders latest chain rows.
- [ ] Verify `/explorer` renders last-30-day paths.
- [ ] Verify `/analyst-kit` renders without auth.
- [ ] Verify `/workflows` renders without auth.
- [ ] Verify `/validation` renders last-365-day diagnostics where data exists.
- [ ] Review whether primary nav has too many desktop items on narrow laptop widths.
- [ ] Decide whether Track Record, Thresholds, Glossary and FAQ should move into a More menu on desktop.
- [ ] Add real downloads/notebooks before calling Analyst Kit complete.
- [ ] Add explicit point-in-time fields before calling the data contract production-grade for backtesting.
