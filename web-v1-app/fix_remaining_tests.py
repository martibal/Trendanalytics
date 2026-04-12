from pathlib import Path

ROOT = Path.cwd()

def must_replace_once(path_str: str, old: str, new: str):
    path = ROOT / path_str
    raw = path.read_text(encoding="utf-8")
    count = raw.count(old)
    if count != 1:
        raise RuntimeError(f"{path_str}: expected exactly 1 occurrence of {old!r}, found {count}")
    updated = raw.replace(old, new, 1)
    path.write_text(updated, encoding="utf-8", newline="")
    print(f"Changed: {path_str}")

def must_replace_twice(path_str: str, old: str, new: str):
    path = ROOT / path_str
    raw = path.read_text(encoding="utf-8")
    count = raw.count(old)
    if count != 2:
        raise RuntimeError(f"{path_str}: expected exactly 2 occurrences of {old!r}, found {count}")
    updated = raw.replace(old, new)
    path.write_text(updated, encoding="utf-8", newline="")
    print(f"Changed: {path_str}")

# 1) status route test
must_replace_once(
    "src/app/api/v1/status/route.test.ts",
    'expected_delay_days: 0,',
    'expected_delay_days: 1,',
)

must_replace_once(
    "src/app/api/v1/status/route.test.ts",
    '''    expect(bitcoin).toMatchObject({
      chain: "bitcoin",
      as_of: "2026-03-19",
      lag_days: 3,
      status: "fail",
    });''',
    '''    expect(bitcoin).toMatchObject({
      chain: "bitcoin",
      as_of: "2026-03-19",
      lag_days: 3,
      status: "warn",
    });''',
)

# 2) track-record page test
must_replace_twice(
    "src/app/track-record/page.test.tsx",
    r'/expected delay:\s*0d/i',
    r'/expected delay:\s*1d/i',
)

# 3) chain history page test
must_replace_twice(
    "src/app/chains/[chain]/history/page.test.tsx",
    r'/expected delay:\s*0d/i',
    r'/expected delay:\s*1d/i',
)

print("Done.")