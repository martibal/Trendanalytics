from pathlib import Path

p = Path('.github/workflows/agent-ethereum-history-rebuild.yml')
s = p.read_text(encoding='utf-8')

old = """              $_ -match '^(data/calculated/(gold_json|derived|meta)/(bitcoin|arbitrum|base)/)' -or\n              $_ -match '^(data/published/v1/(gold|derived|meta)/(bitcoin|arbitrum|base)/)' -or\n              $_ -match '^(web-v1-app/\\.private-data/published/v1/(gold|derived|meta)/(bitcoin|arbitrum|base)/)'\n"""
new = """              $_ -match '^(data/calculated/(gold_json|derived|meta)/(bitcoin|arbitrum|base)/)' -or\n              $_ -match '^(data/published/v1/(gold|derived|meta)/(bitcoin|arbitrum|base)/)'\n"""
if old not in s:
    raise SystemExit('non-Ethereum invariant block not found')
s = s.replace(old, new, 1)

old2 = "git add -- data/calculated/gold_json/ethereum data/calculated/derived/ethereum data/calculated/meta/ethereum data/published/v1 web-v1-app/.private-data/published/v1"
new2 = "git add -- data/calculated/gold_json/ethereum data/calculated/derived/ethereum data/calculated/meta/ethereum data/published/v1 web-v1-app/.private-data/published/v1/gold/ethereum web-v1-app/.private-data/published/v1/derived/ethereum web-v1-app/.private-data/published/v1/meta/ethereum"
if old2 not in s:
    raise SystemExit('git add line not found')
s = s.replace(old2, new2, 1)

p.write_text(s, encoding='utf-8')
print('Patched Ethereum rebuild invariant and staging scope')
