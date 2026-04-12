from pathlib import Path

FILES = [
    'LAUNCH_CHECKLIST.md',
    '.env.production.template',
    '.env.example.txt',
    'README.md',
    'tests/e2e/smoke.spec.ts',
    'src/app/layout.tsx',
    'src/app/track-record/page.tsx',
    'src/lib/db.ts',
    'src/app/page.tsx',
    'src/app/glossary/page.tsx',
    'src/components/landing/MobileLanding.tsx',
    'src/app/thresholds/page.tsx',
    'src/app/methodology/versions.ts',
    'src/lib/content/landingExplanations_v2.tsx',
    'src/app/terms/page.tsx',
    'src/components/landing/LandingHero.tsx',
    'src/components/landing/Hero.tsx',
    'src/lib/content/landingExplanations.tsx',
    'src/components/landing/DataContractDetails.tsx',
    'src/components/mobile/MobileLanding.tsx',
    'src/lib/qa.ts',
    'src/app/methodology/page.tsx',
    'src/app/privacy/page.tsx',
    'src/components/site/SiteNavbar.tsx',
    'src/components/site/SiteFooter.tsx',
    'src/app/about/page.tsx',
    'src/app/api-docs/page.tsx',
]

REPLACEMENTS = [
    ('whatIsTrendAnalyticsExplanation', 'whatIsUrdAtlasExplanation'),
    ('What is TrendAnalytics', 'What is Urd Atlas'),
    ('TrendAnalytics', 'Urd Atlas'),
    ('trendanalytics', 'urdatlas'),
    ('https://urdatlas.io', 'https://urdatlas.com'),
    ('contact@urdatlas.invalid', 'contact@urdatlas.com'),
]

ACTIVE_SCAN_TARGETS = [
    'src/app',
    'src/components',
    'src/lib',
    'tests',
    'README.md',
    'LAUNCH_CHECKLIST.md',
    '.env.production.template',
    '.env.example.txt',
]


def detect_newline(raw: bytes) -> str:
    if b'\r\n' in raw:
        return '\r\n'
    return '\n'


def rewrite_file(path: Path) -> bool:
    raw = path.read_bytes()
    newline = detect_newline(raw)
    text = raw.decode('utf-8')
    normalized = text.replace('\r\n', '\n').replace('\r', '\n')

    updated = normalized
    for old, new in REPLACEMENTS:
        updated = updated.replace(old, new)

    if updated == normalized:
        return False

    path.write_bytes(newline.join(updated.split('\n')).encode('utf-8'))
    return True


def scan_for_legacy_brand(root: Path) -> list[str]:
    hits: list[str] = []
    patterns = ('TrendAnalytics', 'trendanalytics')

    for target in ACTIVE_SCAN_TARGETS:
        p = root / target
        if not p.exists():
            continue

        if p.is_file():
            files = [p]
        else:
            files = [f for f in p.rglob('*') if f.is_file()]

        for file_path in files:
            try:
                text = file_path.read_text(encoding='utf-8', errors='ignore')
            except Exception:
                continue
            if any(pattern in text for pattern in patterns):
                hits.append(str(file_path.relative_to(root)))

    return hits


def main() -> None:
    root = Path.cwd()
    changed: list[str] = []
    missing: list[str] = []

    for rel in FILES:
        path = root / rel
        if not path.exists():
            missing.append(rel)
            continue
        if rewrite_file(path):
            changed.append(rel)

    print('Changed files:')
    for rel in changed:
        print(f' - {rel}')

    if missing:
        print('\nMissing files:')
        for rel in missing:
            print(f' - {rel}')

    leftovers = scan_for_legacy_brand(root)
    if leftovers:
        print('\nLegacy brand strings still found in these active paths:')
        for rel in leftovers:
            print(f' - {rel}')
    else:
        print('\nNo TrendAnalytics/trendanalytics strings remain in active app/docs/test paths.')


if __name__ == '__main__':
    main()
