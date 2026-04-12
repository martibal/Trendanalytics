from pathlib import Path

ROOT = Path.cwd()

def replace_once(text: str, old: str, new: str, file_label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{file_label}: expected exactly 1 occurrence of {old!r}, found {count}")
    return text.replace(old, new, 1)

def replace_n(text: str, old: str, new: str, expected_count: int, file_label: str) -> str:
    count = text.count(old)
    if count != expected_count:
        raise RuntimeError(f"{file_label}: expected {expected_count} occurrence(s) of {old!r}, found {count}")
    return text.replace(old, new)

def update_file(rel_path: str, transform) -> None:
    path = ROOT / rel_path
    raw = path.read_text(encoding="utf-8")
    updated = transform(raw, rel_path)
    if updated != raw:
        path.write_text(updated, encoding="utf-8", newline="")
        print(f"Changed: {rel_path}")
    else:
        print(f"No change: {rel_path}")

def fix_landing(raw: str, label: str) -> str:
    raw = replace_n(raw, 'expected_delay_days: 0,', 'expected_delay_days: 1,', 2, label)
    raw = replace_once(
        raw,
        'source_path: "data/published/v1/meta/bitcoin/latest.json",',
        'source_path: "data/published/v1/meta/bitcoin/latest.json + data/published/v1/landing/bitcoin/hero.json",',
        label,
    )
    raw = replace_once(
        raw,
        'source_field: "latest landing card fields derived from published meta latest",',
        'source_field: "landing date uses hero.display_asof when available; regime/confidence remain from published meta latest",',
        label,
    )
    return raw

def fix_status(raw: str, label: str) -> str:
    raw = replace_n(raw, 'expected_delay_days: 0,', 'expected_delay_days: 1,', 2, label)

    old_block = '''    expect(bitcoin).toMatchObject({
      chain: "bitcoin",
      as_of: "2026-03-19",
      lag_days: 3,
      status: "fail",
    });'''
    new_block = '''    expect(bitcoin).toMatchObject({
      chain: "bitcoin",
      as_of: "2026-03-19",
      lag_days: 3,
      status: "warn",
    });'''
    raw = replace_once(raw, old_block, new_block, label)
    return raw

def fix_track_record(raw: str, label: str) -> str:
    return replace_n(raw, r'/expected delay:\s*0d/i', r'/expected delay:\s*1d/i', 2, label)

def fix_history(raw: str, label: str) -> str:
    return replace_n(raw, r'/expected delay:\s*0d/i', r'/expected delay:\s*1d/i', 2, label)

update_file("src/app/api/v1/landing/route.test.ts", fix_landing)
update_file("src/app/api/v1/status/route.test.ts", fix_status)
update_file("src/app/track-record/page.test.tsx", fix_track_record)
update_file("src/app/chains/[chain]/history/page.test.tsx", fix_history)

print("Done.")