# Security

This repository is a Next.js web application. The runtime surface area is primarily the Node.js dependency graph.

## Current status (npm audit)

You may see output like:

- vulnerabilities: X (high/critical)
- recommendation: `npm audit fix --force`

Important:
- `--force` can introduce breaking dependency upgrades.
- This product prioritizes stability and deterministic behavior over aggressive upgrades.

## Recommended workflow

### 1) Inspect first
Run:
```bash
npm audit