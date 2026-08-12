from pathlib import Path

p = Path('web-v1-app/src/app/methodology/fields/page.tsx')
s = p.read_text(encoding='utf-8')

# Move the three delivered-but-non-CANON L2 fields out of GOLD_FIELDS.
extension_blocks = []
for field in ["capacity_util_pct", "arbitrum_l1_gas_used_daily", "base_l1_gas_used_daily"]:
    marker = f'    field: "{field}",'
    idx = s.find(marker)
    if idx < 0:
        raise SystemExit(f'{field} block not found')
    start = s.rfind('  {\n', 0, idx)
    end = s.find('\n  },', idx)
    if start < 0 or end < 0:
        raise SystemExit(f'could not bound {field} block')
    end += len('\n  },')
    extension_blocks.append(s[start:end])
    s = s[:start] + s[end:]

# Move DERIVED_FIELDS after META_FIELDS so the legacy/safety parser that slices
# GOLD_FIELDS -> META_FIELDS only sees canonical Gold entries.
derived_start = s.find('const DERIVED_FIELDS: FieldEntry[] = [')
meta_start = s.find('const META_FIELDS: FieldEntry[] = [')
if derived_start < 0 or meta_start < 0 or derived_start > meta_start:
    raise SystemExit('expected DERIVED_FIELDS before META_FIELDS')
derived_end = s.find('\n\nconst META_FIELDS', derived_start)
if derived_end < 0:
    raise SystemExit('could not bound DERIVED_FIELDS')
derived_block = s[derived_start:derived_end]
s = s[:derived_start] + s[derived_end+2:]

# META_FIELDS now starts where the derived block used to be. Insert extension and
# derived arrays after META_FIELDS ends, before BRIEF_FIELDS.
brief_start = s.find('const BRIEF_FIELDS: FieldEntry[] = [')
if brief_start < 0:
    raise SystemExit('BRIEF_FIELDS marker not found')

extension_array = 'const CHAIN_EXTENSION_FIELDS: FieldEntry[] = [\n' + '\n'.join(extension_blocks) + '\n];\n\n'
insert = extension_array + derived_block + '\n\n'
s = s[:brief_start] + insert + s[brief_start:]

# Rename the section so the contract distinction is explicit to readers.
old = '''              <Section title="Key Derived fields">
                <p>Derived is deliberately simpler than Gold: it publishes reusable rolling features only for the metric set declared in each artifact&apos;s source metadata.</p>
                <FieldGrid entries={DERIVED_FIELDS} />
              </Section>'''
new = '''              <Section title="Chain-specific delivered extension fields">
                <p>These fields can appear in published Gold artifacts but are produced outside the canonical <FieldCode>CANON_COLS</FieldCode> aggregation surface. They are documented separately so the distinction remains explicit and auditable.</p>
                <FieldGrid entries={CHAIN_EXTENSION_FIELDS} />
              </Section>

              <Section title="Key Derived fields">
                <p>Derived is deliberately simpler than Gold: it publishes reusable rolling features only for the metric set declared in each artifact&apos;s source metadata.</p>
                <FieldGrid entries={DERIVED_FIELDS} />
              </Section>'''
if old not in s:
    raise SystemExit('Derived section anchor not found')
s = s.replace(old, new, 1)

p.write_text(s, encoding='utf-8')
print('fixed field dictionary sync structure')
