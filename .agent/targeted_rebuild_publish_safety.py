from pathlib import Path

# 1) Scope META export to explicitly selected chains.
meta_path = Path('pipeline/tools/export_meta_json_history.py')
meta = meta_path.read_text(encoding='utf-8')

old = '''    ap.add_argument("--windows", default="7,30,90,180,365", help="Comma-separated window sizes to materialize as lastXd.json")
    args = ap.parse_args()

    mode = str(args.mode)
'''
new = '''    ap.add_argument("--windows", default="7,30,90,180,365", help="Comma-separated window sizes to materialize as lastXd.json")
    ap.add_argument("--chains", default="", help="Optional comma-separated chain subset; defaults to api.main.SUPPORTED_CHAINS")
    args = ap.parse_args()

    mode = str(args.mode)
'''
if meta.count(old) != 1:
    raise SystemExit(f'Unexpected META argparse anchor count: {meta.count(old)}')
meta = meta.replace(old, new)

old = '''    out_root.mkdir(parents=True, exist_ok=True)

    for chain in SUPPORTED_CHAINS:
        gs = _load_gold_status(chain)
'''
new = '''    out_root.mkdir(parents=True, exist_ok=True)

    requested_chains = [x.strip().lower() for x in str(args.chains or "").split(",") if x.strip()]
    chains = requested_chains or list(SUPPORTED_CHAINS)
    unsupported = [chain for chain in chains if chain not in SUPPORTED_CHAINS]
    if unsupported:
        raise SystemExit(f"Unsupported chain(s) in --chains: {','.join(unsupported)}")

    for chain in chains:
        gs = _load_gold_status(chain)
'''
if meta.count(old) != 1:
    raise SystemExit(f'Unexpected META loop anchor count: {meta.count(old)}')
meta = meta.replace(old, new)
meta_path.write_text(meta, encoding='utf-8')

# 2) Keep recompute scope selected, but publish/validate the complete supported dataset.
full_path = Path('pipeline/tools/full_pipeline.ps1')
full = full_path.read_text(encoding='utf-8')

old = '''  $chainsCsv = ($chains -join ',')
  Write-Log ("Chains: " + $chainsCsv)
  $windowsCsv = '7,30,90,180,365'
'''
new = '''  $chainsCsv = ($chains -join ',')
  $publishChainsCsv = ($allowedChains -join ',')
  Write-Log ("Recompute chains: " + $chainsCsv)
  Write-Log ("Global publish chains: " + $publishChainsCsv)
  $windowsCsv = '7,30,90,180,365'
'''
if full.count(old) != 1:
    raise SystemExit(f'Unexpected full pipeline chain anchor count: {full.count(old)}')
full = full.replace(old, new)

old = '''      & $PY -u $PY_EXPORT_META --root $MAIN_ROOT --out-root $META_JSON_ROOT --start $startIso --mode $modeIncRebuild --windows $windowsCsv
'''
new = '''      & $PY -u $PY_EXPORT_META --root $MAIN_ROOT --out-root $META_JSON_ROOT --start $startIso --mode $modeIncRebuild --windows $windowsCsv --chains $activeChainsCsv
'''
if full.count(old) != 1:
    raise SystemExit(f'Unexpected META invocation anchor count: {full.count(old)}')
full = full.replace(old, new)

old = '''    & $PY -u $PY_PUBLISH --root $MAIN_ROOT --calculated-root $CALC_ROOT --published-root $PUBLISHED_ROOT --chains $chainsCsv --genres 'gold,meta,derived' --windows $windowsCsv
'''
new = '''    & $PY -u $PY_PUBLISH --root $MAIN_ROOT --calculated-root $CALC_ROOT --published-root $PUBLISHED_ROOT --chains $publishChainsCsv --genres 'gold,meta,derived' --windows $windowsCsv
'''
if full.count(old) != 1:
    raise SystemExit(f'Unexpected publisher invocation anchor count: {full.count(old)}')
full = full.replace(old, new)

old = '''    & $PY -u $PY_VALIDATE_PUBLISHED --published-root $PUBLISHED_ROOT --chains $chainsCsv --genres 'gold,meta,derived' --windows $windowsCsv
'''
new = '''    & $PY -u $PY_VALIDATE_PUBLISHED --published-root $PUBLISHED_ROOT --chains $publishChainsCsv --genres 'gold,meta,derived' --windows $windowsCsv
'''
if full.count(old) != 1:
    raise SystemExit(f'Unexpected validator invocation anchor count: {full.count(old)}')
full = full.replace(old, new)
full_path.write_text(full, encoding='utf-8')

# Invariants.
meta_check = meta_path.read_text(encoding='utf-8')
full_check = full_path.read_text(encoding='utf-8')
assert 'ap.add_argument("--chains"' in meta_check
assert 'requested_chains or list(SUPPORTED_CHAINS)' in meta_check
assert '--chains $activeChainsCsv' in full_check
assert '--chains $publishChainsCsv' in full_check
assert '$publishChainsCsv = ($allowedChains -join ' in full_check
print('Targeted rebuild publish-safety patch applied.')
