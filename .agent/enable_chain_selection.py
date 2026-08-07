from pathlib import Path

path = Path('pipeline/tools/full_pipeline.ps1')
text = path.read_text(encoding='utf-8')
old = """  $chains = @('bitcoin','ethereum','arbitrum','base')
  $chainsCsv = 'bitcoin,ethereum,arbitrum,base'
  $windowsCsv = '7,30,90,180,365'
"""
new = """  $allowedChains = @('bitcoin','ethereum','arbitrum','base')
  $chainsRaw = Get-EnvOrDefault -Name 'CSS_CHAINS' -DefaultValue ($allowedChains -join ',')
  $chains = @(
    $chainsRaw.Split(',') |
      ForEach-Object { $_.Trim().ToLowerInvariant() } |
      Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
      Select-Object -Unique
  )

  if ($chains.Length -eq 0) {
    throw 'CSS_CHAINS resolved to an empty chain set.'
  }

  foreach ($c in $chains) {
    if ($allowedChains -notcontains $c) {
      throw \"Unsupported chain in CSS_CHAINS: $c. Allowed: $($allowedChains -join ',')\"
    }
  }

  $chainsCsv = ($chains -join ',')
  Write-Log (\"Chains: \" + $chainsCsv)
  $windowsCsv = '7,30,90,180,365'
"""
if text.count(old) != 1:
    raise SystemExit(f'Expected exactly one hard-coded chains block, found {text.count(old)}')
text = text.replace(old, new)
path.write_text(text, encoding='utf-8')

updated = path.read_text(encoding='utf-8')
assert "Get-EnvOrDefault -Name 'CSS_CHAINS'" in updated
assert "$chainsCsv = ($chains -join ',')" in updated
assert "Unsupported chain in CSS_CHAINS" in updated
print('CSS_CHAINS chain-selection patch applied.')
