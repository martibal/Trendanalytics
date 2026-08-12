from pathlib import Path

changes = {
    "web-v1-app/src/app/methodology/reference/page.tsx": [
        ("Confidence v2 uses raw scorecard/regime evidence to evaluate label confidence.",
         "Confidence v3 uses raw scorecard/regime evidence to evaluate label confidence."),
    ],
    "web-v1-app/src/app/methodology/page.tsx": [
        ("Field-level definitions and warnings, including Confidence v2 fields.",
         "Field-level definitions and warnings, including current Confidence v3 fields."),
    ],
}

for filename, replacements in changes.items():
    p = Path(filename)
    text = p.read_text(encoding="utf-8")
    for old, new in replacements:
        if old not in text:
            raise SystemExit(f"Expected text not found in {filename}: {old}")
        text = text.replace(old, new, 1)
    p.write_text(text, encoding="utf-8")

print("Remaining active Confidence v2 wording corrected.")
