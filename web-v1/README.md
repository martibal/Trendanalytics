# web-v1

Next.js (App Router) frontend for the price-agnostic blockchain trend analytics platform.

## Dev
```bash
npm install
npm run dev
```

## Data
Published JSON is served from:
- `public/data/published/v1/dataset.json`
- `public/data/published/v1/meta/<chain>/<date>.json`
- `public/data/published/v1/derived/<chain>/<date>.json`
- `public/data/published/v1/gold/<chain>/<date>.json`

The UI uses `dataset.json` to discover the latest *as-of* date per chain/genre.
