from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any

from briefs_common import BRIEF_VERSION, CHAINS, now_utc_iso, read_json, resolve_published_root, write_json


def _exists(root: Path, rel: str) -> bool:
    return (root / rel).is_file()


def build_manifest(root: Path) -> dict[str, Any]:
    chains = {
        chain: {
            "latest": f"data/published/v1/briefs/chains/{chain}/latest.json",
            "available": _exists(root, f"briefs/chains/{chain}/latest.json"),
        }
        for chain in CHAINS
    }
    return {
        "schema": "urd_atlas.briefs_manifest.v1",
        "briefs_version": BRIEF_VERSION,
        "published_at": now_utc_iso(),
        "available_outputs": {
            "chain_briefs": all(item["available"] for item in chains.values()),
            "cross_chain_map": _exists(root, "briefs/cross-chain/latest.json"),
            "site_bundle": _exists(root, "briefs/site/latest.json"),
        },
        "chains": chains,
        "cross_chain": {
            "latest": "data/published/v1/briefs/cross-chain/latest.json",
            "available": _exists(root, "briefs/cross-chain/latest.json"),
        },
        "site": {
            "latest": "data/published/v1/briefs/site/latest.json",
            "available": _exists(root, "briefs/site/latest.json"),
        },
    }


def write_manifest(root: Path) -> Path:
    path = root / "briefs" / "manifest.json"
    write_json(path, build_manifest(root))
    return path


def main() -> int:
    parser = argparse.ArgumentParser(description="Build Urd Atlas briefs manifest.")
    parser.add_argument("--root", default=None)
    args = parser.parse_args()
    root = resolve_published_root(args.root)
    print(write_manifest(root))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
