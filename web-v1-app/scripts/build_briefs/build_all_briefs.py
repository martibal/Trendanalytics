from __future__ import annotations

import argparse

from briefs_common import resolve_published_root
from build_chain_7d_briefs import build_all_chain_briefs
from build_cross_chain_map import write_cross_chain_map
from build_briefs_manifest import write_manifest
from build_site_brief_bundle import write_site_bundle


def main() -> int:
    parser = argparse.ArgumentParser(description="Build all Urd Atlas Regime Brief outputs.")
    parser.add_argument("--root", default=None, help="Published v1 root. Defaults to public/data/published/v1 or data/published/v1.")
    args = parser.parse_args()
    root = resolve_published_root(args.root)
    print(f"Published root: {root}")

    print("Building chain 7-day briefs...")
    for path in build_all_chain_briefs(root):
        print(path)

    print("Building site bundle from chain briefs...")
    print(write_site_bundle(root))

    print("Building cross-chain regime map...")
    for path in write_cross_chain_map(root):
        print(path)

    print("Refreshing site bundle with cross-chain summary...")
    print(write_site_bundle(root))

    print("Building briefs manifest...")
    print(write_manifest(root))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
