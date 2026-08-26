import json
from pathlib import Path

from pipeline.tools.export_meta_json_history import _seed_incremental_staging_from_published


def _write(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload), encoding="utf-8")


def test_incremental_seed_preserves_inactive_chain_canonical_meta(tmp_path: Path) -> None:
    """A skipped chain must be canonical-seeded before the global publisher runs."""
    repo_root = tmp_path / "repo"
    out_root = repo_root / "data" / "calculated" / "meta"

    canonical_eth = repo_root / "data" / "published" / "v1" / "meta" / "ethereum"
    stale_eth = out_root / "ethereum"

    _write(
        canonical_eth / "2024-12-01.json",
        {"chain": "ethereum", "regime": {"ruleset_id": "eth_l1_v2"}},
    )
    _write(
        canonical_eth / "latest.json",
        {"chain": "ethereum", "regime": {"ruleset_id": "eth_l1_v2"}},
    )
    _write(
        stale_eth / "2024-12-01.json",
        {"chain": "ethereum", "regime": {"ruleset_id": "eth_l1_v1"}},
    )
    _write(
        stale_eth / "latest.json",
        {"chain": "ethereum", "regime": {"ruleset_id": "eth_l1_v1"}},
    )

    copied = _seed_incremental_staging_from_published(
        repo_root,
        out_root,
        ["bitcoin", "ethereum", "arbitrum", "base"],
    )

    assert copied["ethereum"] == 2
    seeded_day = json.loads((stale_eth / "2024-12-01.json").read_text(encoding="utf-8"))
    seeded_latest = json.loads((stale_eth / "latest.json").read_text(encoding="utf-8"))
    assert seeded_day["regime"]["ruleset_id"] == "eth_l1_v2"
    assert seeded_latest["regime"]["ruleset_id"] == "eth_l1_v2"
