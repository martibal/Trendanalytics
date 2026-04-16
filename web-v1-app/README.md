# Urd Atlas — Mobile PWA

## What this is

A mobile-optimised PWA built on top of the existing urdatlas.com Next.js codebase.
Accessible at `/mobile` on the same domain. No separate infrastructure required.

---

## File structure

```
src/
  app/mobile/
    layout.tsx              ← PWA meta tags, safe area shell
    page.tsx                ← Overview screen (all 4 chains)
    mobile.css              ← Safe areas, touch, scroll
    chain/[chain]/page.tsx  ← Chain detail with history chart
    wiki/page.tsx           ← Wiki shell page

  components/mobile/
    MobileChainChart.tsx    ← Recharts history + confidence chart (client)
    MobileWikiClient.tsx    ← Wiki search + entry detail (client)
    PwaRegister.tsx         ← Service worker registration + install prompt

  lib/mobile/
    data.ts                 ← Types, parsers, color tokens
    wiki.ts                 ← All wiki entries (35+ terms)

public/
  manifest.json             ← PWA manifest
  sw.js                     ← Service worker (network-first, cache fallback)
  icons/                    ← icon-192.png and icon-512.png (ADD THESE)
```

---

## Integration steps

### 1. Copy files into your repo

Copy all files maintaining the directory structure shown above.

### 2. Add icons

Create `public/icons/icon-192.png` and `public/icons/icon-512.png`.
Dark background `#0A0E1A`, "UA" in cyan `#22d3ee`.

### 3. Import mobile CSS

In `src/app/mobile/layout.tsx`, add:
```tsx
import "./mobile.css";
```

### 4. Add recharts (if not already installed)

```bash
npm install recharts
```

recharts is already available as a CDN import in the artifact environment.

### 5. Add redirect (optional)

To auto-redirect mobile browsers from `/` to `/mobile`, add to `middleware.ts`:

```ts
if (isMobile && pathname === "/") {
  return NextResponse.redirect(new URL("/mobile", req.url));
}
```

Use a UA check or the `user-agent` header to detect mobile.

### 6. Test PWA install

- Open `/mobile` on a real Android device in Chrome
- After 2 visits, "Add to home screen" banner appears
- On iOS Safari: Share → Add to Home Screen

---

## Data access

All data is read from the same published artifacts as desktop:

| Source | Path |
|--------|------|
| Latest state | `data/published/v1/meta/<chain>/latest.json` |
| History bundle | `data/published/v1/meta/<chain>/last{N}d.json` |

No new API endpoints required.

---

## Access gating

| User | History depth |
|------|--------------|
| Anonymous | 30d |
| Basic subscriber | 90d (entitled chain only) |
| Pro subscriber | 365d (all chains) |

Gating is enforced in `chain/[chain]/page.tsx` via Clerk `auth()`.

---

## Navigation

Five tabs in bottom nav:
- **Overview** — `/mobile`
- **BTC** — `/mobile/chain/bitcoin`
- **ETH** — `/mobile/chain/ethereum`
- **L2s** — `/mobile/chain/arbitrum` (tabs to BASE within page)
- **Wiki** — `/mobile/wiki`

---

## Desktop bridges

Placed at strategic points throughout the mobile app:

- Overview footer: `Full analysis and API → urdatlas.com`
- Chain detail footer: `Get JSON access → urdatlas.com/plans`
- Wiki footer: `Full methodology → urdatlas.com/methodology`
