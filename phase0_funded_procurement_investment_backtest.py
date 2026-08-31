#!/usr/bin/env python3
import io
import json
import re
import subprocess
import tempfile
import unicodedata
from collections import defaultdict
from pathlib import Path

import pandas as pd
import requests

OUT = Path('/tmp/funded_procurement_investment_backtest.json')
API = 'https://dados.gov.pt/api/1/datasets/'
s = requests.Session()
s.headers['User-Agent'] = 'Funded-Procurement-Investment-Backtest/1.1'

FORB = (
    'email', 'e mail', 'telefone', 'telemovel', 'contacto', 'morada',
    'nome pessoa', 'primeiro nome', 'apelido', 'data nascimento'
)

DOCS = [
    'ST-10149-2021-ADD-1-REV-1',
    'ST-13351-2023-ADD-1-REV-1',
    'ST-13497-2024-ADD-1',
    'ST-8055-2025-ADD-1',
    'ST-12491-2025-ADD-1',
    'ST-15796-2025-ADD-1',
    'ST-9419-2026-ADD-1',
    'ST-12314-2026-ADD-1',
]

CAT = {
    'DIGITAL_IT': [
        'software', 'sistema', 'digital', 'informat', 'tecnolog', 'dados',
        'cloud', 'ciber', 'cyber', 'plataforma', 'aplicacao', 'interoperab',
        'rede', 'network'
    ],
    'CONSTRUCTION': [
        'obra', 'construc', 'reabilit', 'edificio', 'empreitada',
        'infraestrutura'
    ],
    'EQUIPMENT': ['equipamento', 'hardware', 'mobiliario', 'veiculo', 'maquina'],
    'CONSULTING_AUDIT': ['consult', 'assessoria', 'auditor', 'estudo', 'assessment'],
    'TRAINING': ['formacao', 'capacitacao', 'treino', 'training'],
}

# These are the pre-existing thresholds from the previous Portugal test.
MIN_LINKED_UNITS = 30
MEDIAN_LEAD_MIN_DAYS = 90
SHARE_FIRST_CONTRACT_GE_90D_MIN = 0.60
CATEGORY_EVALUABLE_MIN = 100
CATEGORY_OVERLAP_MIN = 0.60


def norm(x):
    x = unicodedata.normalize('NFKD', str(x)).encode('ascii', 'ignore').decode()
    x = x.lower().strip()
    return re.sub(r'[^a-z0-9]+', ' ', x).strip()


def cats(x):
    z = norm(x)
    return {k for k, ws in CAT.items() if any(norm(w) in z for w in ws)}


def search(title):
    r = s.get(API, params={'q': title, 'page_size': 50}, timeout=30)
    r.raise_for_status()
    j = r.json()
    items = j.get('data') or j.get('results') or j.get('items') or []
    exact = [x for x in items if norm(x.get('title')) == norm(title)]
    if not exact:
        toks = [t for t in norm(title).split() if len(t) > 3]
        exact = [x for x in items if all(t in norm(x.get('title')) for t in toks)]
    if not exact:
        raise RuntimeError('dataset not found: ' + title)
    return exact[0]


def resource(ds):
    xs = [
        r for r in (ds.get('resources') or [])
        if str(r.get('format', '')).lower() in ('xlsx', 'xls')
    ]
    xs.sort(
        key=lambda x: str(x.get('last_modified') or x.get('created_at') or ''),
        reverse=True,
    )
    if not xs:
        raise RuntimeError('no xlsx resource')
    return xs[0]


def load(title):
    ds = search(title)
    res = resource(ds)
    rr = s.get(res['url'], timeout=120)
    rr.raise_for_status()
    xf = pd.ExcelFile(io.BytesIO(rr.content))
    best = max(
        ((sh, pd.read_excel(xf, sheet_name=sh)) for sh in xf.sheet_names),
        key=lambda z: len(z[1]),
    )
    sh, df = best
    cols = [str(c) for c in df.columns]
    bad = [c for c in cols if any(t in norm(c) for t in FORB)]
    if bad:
        raise RuntimeError(f'privacy schema fail {title}: {bad}')
    return df, {
        'title': ds.get('title'),
        'resource': res.get('title'),
        'checksum': res.get('checksum'),
        'rows': len(df),
        'sheet': sh,
        'columns': cols,
    }


def col(df, name):
    for c in df.columns:
        if norm(c) == norm(name):
            return c
    raise KeyError(name)


def clean_code(x):
    return (
        str(x).upper()
        .replace('–', '-')
        .replace('—', '-')
        .replace(' ', '')
        .strip()
    )


def parse_investment_code(x):
    """Parse either full RE-/TC- codes or bare Cxx-i... source codes.

    Returns only structural identity. It never fuzzy-matches text.
    """
    z = clean_code(x)
    m = re.search(
        r'(?:(RE|TC)-)?(C\d{2}-I\d+(?:\.\d+)?)(?:-(RAM|RAA))?',
        z,
        flags=re.I,
    )
    if not m:
        return None
    prefix = m.group(1).upper() if m.group(1) else None
    core = m.group(2).upper().replace('-I', '-i')
    region = m.group(3).upper() if m.group(3) else None
    full = None
    if prefix:
        full = f'{prefix}-{core}' + (f'-{region}' if region else '')
    return {'prefix': prefix, 'core': core, 'region': region, 'full': full}


def build_investment_lookup(invest, ic):
    exact = {}
    by_core_region = defaultdict(list)
    by_core = defaultdict(list)
    parsed_rows = 0
    for raw in invest[ic].dropna().astype(str):
        p = parse_investment_code(raw)
        if not p or not p['full']:
            continue
        parsed_rows += 1
        exact[p['full']] = p['full']
        by_core_region[(p['core'], p['region'])].append(p['full'])
        by_core[p['core']].append(p['full'])
    # make candidate lists unique and deterministic
    by_core_region = {k: sorted(set(v)) for k, v in by_core_region.items()}
    by_core = {k: sorted(set(v)) for k, v in by_core.items()}
    return exact, by_core_region, by_core, parsed_rows


def resolve_project_investment(raw, exact, by_core_region, by_core):
    p = parse_investment_code(raw)
    if not p:
        return None, 'UNPARSEABLE'

    if p['full'] and p['full'] in exact:
        return p['full'], 'EXACT_FULL_CODE'

    if p['region'] is not None:
        candidates = by_core_region.get((p['core'], p['region']), [])
        if len(candidates) == 1:
            return candidates[0], 'UNIQUE_CORE_REGION'
        if len(candidates) > 1:
            return None, 'AMBIGUOUS_CORE_REGION'

    candidates = by_core.get(p['core'], [])
    if len(candidates) == 1:
        return candidates[0], 'UNIQUE_CORE'
    if len(candidates) > 1:
        return None, 'AMBIGUOUS_CORE'
    return None, 'NO_CURRENT_INVESTMENT_MATCH'


def pdf_info(doc):
    url = f'https://data.consilium.europa.eu/doc/document/{doc}/en/pdf'
    r = s.get(url, timeout=120)
    r.raise_for_status()
    with tempfile.TemporaryDirectory() as td:
        p = Path(td) / 'x.pdf'
        t = Path(td) / 'x.txt'
        p.write_bytes(r.content)
        subprocess.run(['pdftotext', '-layout', str(p), str(t)], check=True)
        text = t.read_text(errors='ignore')

    head = text[:6000]
    m = re.search(r'Brussels,\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})', head, re.I)
    if not m:
        raise RuntimeError('cannot parse document date ' + doc)
    date = pd.to_datetime(m.group(1), dayfirst=True).date()

    z = text.upper().replace('–', '-').replace('—', '-')
    z = re.sub(r'\s*-\s*', '-', z)
    codes = set()
    for q in re.finditer(
        r'((?:RE|TC)-C\d{2}-I\d+(?:\.\d+)?(?:-(?:RAM|RAA))?)',
        z,
        re.I,
    ):
        parsed = parse_investment_code(q.group(1))
        if parsed and parsed['full']:
            codes.add(parsed['full'])
    return {
        'doc': doc,
        'url': url,
        'date': str(date),
        'codes': sorted(codes),
        'code_count': len(codes),
    }


projects, mp = load('Dataset Estrutura de Missão PRR - Projetos')
contracts, mc = load('Dataset Estrutura de Missão PRR - Contratos Públicos')
invest, mi = load('Dataset Estrutura de Missão PRR - Investimentos')

pc = col(projects, 'cd_projeto')
pi = col(projects, 'cd_investimento')
cc = col(contracts, 'cd_projeto')
cd = col(contracts, 'dt_assinatura_contrato')
co = col(contracts, 'ds_contrato')
ic = col(invest, 'Código do Investimento')
ides = col(invest, 'Descrição detalhada do Investimento')
iname = col(invest, 'Designação do Investimento')

exact, by_core_region, by_core, parsed_investment_rows = build_investment_lookup(invest, ic)

# The prior diagnostic established that top-level project rows are the rows whose
# cd_projeto has no '/'. We keep that source-defined unit and resolve its explicit
# cd_investimento field only by unique structural identity in the Investments table.
p = projects[[pc, pi]].copy()
p['_project'] = p[pc].astype(str).str.strip()
p = p.loc[~p['_project'].str.contains('/', regex=False)].drop_duplicates('_project')

resolved = p[pi].map(lambda x: resolve_project_investment(x, exact, by_core_region, by_core))
p['_inv'] = resolved.map(lambda x: x[0])
p['_map_reason'] = resolved.map(lambda x: x[1])
map_reason_counts = p['_map_reason'].value_counts(dropna=False).to_dict()
raw_investment_code_examples = sorted(set(p[pi].dropna().astype(str)))[:20]
unmapped_project_examples = p.loc[p['_inv'].isna(), [pc, pi, '_map_reason']].head(20).to_dict('records')

p_mapped = p.loc[p['_inv'].notna()].copy()

# If the source schema cannot map enough top-level units to evaluate the existing
# minimum-30 gate, this is DATA_MAPPING_INSUFFICIENT, not a mechanism NO-GO.
if p_mapped['_project'].nunique() < MIN_LINKED_UNITS:
    result = {
        'verdict': 'DATA_MAPPING_INSUFFICIENT',
        'confirmatory_status': 'NO_MECHANISM_OUTCOME_EVALUATED',
        'mapping': {
            'top_level_project_rows': int(p['_project'].nunique()),
            'mapped_top_level_project_rows': int(p_mapped['_project'].nunique()),
            'map_reason_counts': {str(k): int(v) for k, v in map_reason_counts.items()},
            'safe_raw_cd_investimento_examples': raw_investment_code_examples,
            'safe_unmapped_examples': unmapped_project_examples,
            'parsed_current_investment_rows': int(parsed_investment_rows),
        },
        'thresholds_preserved': {
            'min_linked_units': MIN_LINKED_UNITS,
            'median_lead_days_min': MEDIAN_LEAD_MIN_DAYS,
            'share_first_contract_ge_90d_min': SHARE_FIRST_CONTRACT_GE_90D_MIN,
            'category_evaluable_min': CATEGORY_EVALUABLE_MIN,
            'category_overlap_min': CATEGORY_OVERLAP_MIN,
        },
    }
    OUT.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding='utf-8')
    print(json.dumps(result, indent=2, ensure_ascii=False))
    raise SystemExit(3)

# Join contracts to the corrected top-level project→investment mapping.
c = contracts[[cc, cd, co]].copy()
c['_project'] = c[cc].astype(str).str.strip()
c['_date'] = pd.to_datetime(c[cd], errors='coerce')
c = c.loc[c['_date'].notna()].merge(
    p_mapped[['_project', '_inv']], on='_project', how='inner'
)

i = invest[[ic, iname, ides]].copy()
i['_inv'] = i[ic].map(lambda x: (parse_investment_code(x) or {}).get('full'))
i = i.loc[i['_inv'].notna()].drop_duplicates('_inv')

# Official full-plan versions; first appearance is the conservative public timestamp.
versions = []
for d in DOCS:
    try:
        versions.append(pdf_info(d))
    except Exception as e:
        versions.append({
            'doc': d,
            'error': repr(e),
            'codes': [],
            'code_count': 0,
            'date': None,
        })
valid = [v for v in versions if v.get('date')]
valid.sort(key=lambda v: v['date'])
first_public = {}
for v in valid:
    for code in v['codes']:
        first_public.setdefault(code, pd.Timestamp(v['date']))

c['_public'] = c['_inv'].map(first_public)
observable = c.loc[c['_public'].notna()].copy()
observable['_lead'] = (observable['_date'] - observable['_public']).dt.days
post = observable.loc[observable['_lead'] >= 0].copy()
first = post.groupby('_inv')['_lead'].min().sort_values()

# Category prediction from the investment description available in the public plan
# taxonomy to the subsequent contract object. Thresholds are unchanged.
idict = {
    r['_inv']: cats(str(r[iname]) + ' ' + str(r[ides]))
    for _, r in i.iterrows()
}
evaln = 0
hits = 0
for _, r in post.iterrows():
    pcats = idict.get(r['_inv'], set())
    ccats = cats(r[co])
    if pcats and ccats:
        evaln += 1
        hits += int(bool(pcats & ccats))
catrate = hits / evaln if evaln else None

share90 = float((first >= 90).mean()) if len(first) else None
med = float(first.median()) if len(first) else None
lead_ok = bool(
    len(first) >= MIN_LINKED_UNITS
    and med is not None
    and med >= MEDIAN_LEAD_MIN_DAYS
    and share90 is not None
    and share90 >= SHARE_FIRST_CONTRACT_GE_90D_MIN
)
cat_ok = bool(
    evaln >= CATEGORY_EVALUABLE_MIN
    and catrate is not None
    and catrate >= CATEGORY_OVERLAP_MIN
)
coverage_ok = bool(len(first) >= MIN_LINKED_UNITS)
mechanism_pass = bool(lead_ok and cat_ok and coverage_ok)

result = {
    'verdict': (
        'PORTUGAL_MECHANISM_PASS_OOS_CONFIRMATION_REQUIRED'
        if mechanism_pass else 'PORTUGAL_MECHANISM_FAIL'
    ),
    'confirmatory_status': (
        'REPAIRED_BACKTEST_NOT_PRISTINE_CONFIRMATORY_BECAUSE_PORTUGAL_AGGREGATES_'
        'WERE_SEEN_BEFORE_UNIT_CORRECTION'
    ),
    'hard_checks': {
        'lead_ok': lead_ok,
        'category_ok': cat_ok,
        'coverage_min_30_linked_investments': coverage_ok,
    },
    'thresholds_preserved': {
        'min_linked_units': MIN_LINKED_UNITS,
        'median_lead_days_min': MEDIAN_LEAD_MIN_DAYS,
        'share_first_contract_ge_90d_min': SHARE_FIRST_CONTRACT_GE_90D_MIN,
        'category_evaluable_min': CATEGORY_EVALUABLE_MIN,
        'category_overlap_min': CATEGORY_OVERLAP_MIN,
    },
    'mapping': {
        'top_level_project_rows': int(p['_project'].nunique()),
        'mapped_top_level_project_rows': int(p_mapped['_project'].nunique()),
        'map_reason_counts': {str(k): int(v) for k, v in map_reason_counts.items()},
        'safe_raw_cd_investimento_examples': raw_investment_code_examples,
        'safe_unmapped_examples': unmapped_project_examples,
        'parsed_current_investment_rows': int(parsed_investment_rows),
    },
    'metrics': {
        'contract_top_level_project_count': int(c['_project'].nunique()),
        'current_investment_count': int(i['_inv'].nunique()),
        'investments_found_in_official_plan_versions': int(
            sum(x in first_public for x in i['_inv'])
        ),
        'linked_investments_with_public_timestamp_and_post_contract': int(len(first)),
        'median_days_public_plan_to_first_contract': med,
        'p25_days': float(first.quantile(.25)) if len(first) else None,
        'p75_days': float(first.quantile(.75)) if len(first) else None,
        'share_first_contract_at_least_90d': share90,
        'share_first_contract_at_least_180d': (
            float((first >= 180).mean()) if len(first) else None
        ),
        'contracts_before_first_public_plan_appearance': int(
            (observable['_lead'] < 0).sum()
        ),
        'post_public_contracts': int(len(post)),
        'category_evaluable_contracts': int(evaln),
        'category_overlap_rate': catrate,
    },
    'official_plan_versions': [
        {k: v for k, v in x.items() if k != 'codes'} for x in versions
    ],
    'unresolved_current_investment_codes': sorted(set(i['_inv']) - set(first_public)),
    'metadata': {'projects': mp, 'contracts': mc, 'investments': mi},
    'method_note': (
        'Top-level project→investment mapping uses only the explicit cd_investimento '
        'field and unique structural code identity. No fuzzy mapping. Council full-plan '
        'annex dates are the public-observability timestamps. No project-start date and '
        'no new outcome threshold are used.'
    ),
}

OUT.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding='utf-8')
print(json.dumps(result, indent=2, ensure_ascii=False))
raise SystemExit(0 if mechanism_pass else 2)
