#!/usr/bin/env python3
import io, json, re, unicodedata, requests, pandas as pd
from pathlib import Path

API='https://dados.gov.pt/api/1/datasets/'
OUT=Path('/tmp/funded_procurement_diagnostic.json')
s=requests.Session(); s.headers['User-Agent']='Funded-Procurement-Diagnostic/1.0'

FORBIDDEN=('email','e mail','telefone','telemovel','contacto','morada','nome pessoa','primeiro nome','apelido','data nascimento')
CAT={
 'DIGITAL_IT':['software','sistema','digital','informat','tecnolog','dados','cloud','ciber','cyber','plataforma','aplicacao','interoperab','rede','network'],
 'CONSTRUCTION':['obra','construc','reabilit','edificio','empreitada','infraestrutura'],
 'EQUIPMENT':['equipamento','hardware','mobiliario','veiculo','maquina'],
 'CONSULTING_AUDIT':['consult','assessoria','auditor','estudo','assessment'],
 'TRAINING':['formacao','capacitacao','treino','training'],
}

def norm(x):
    x=unicodedata.normalize('NFKD',str(x)).encode('ascii','ignore').decode().lower().strip()
    return re.sub(r'[^a-z0-9]+',' ',x).strip()

def cats(text):
    z=norm(text); return {k for k,ws in CAT.items() if any(norm(w) in z for w in ws)}

def search(title):
    r=s.get(API,params={'q':title,'page_size':50},timeout=30); r.raise_for_status(); j=r.json()
    items=j.get('data') or j.get('results') or j.get('items') or []
    exact=[x for x in items if norm(x.get('title'))==norm(title)]
    if not exact:
        toks=[t for t in norm(title).split() if len(t)>3]
        exact=[x for x in items if all(t in norm(x.get('title')) for t in toks)]
    if not exact: raise RuntimeError(f'not found: {title}')
    return exact[0]

def resource(ds):
    rs=ds.get('resources') or []
    xs=[r for r in rs if str(r.get('format','')).lower() in ('xlsx','xls')]
    if not xs: raise RuntimeError('no xlsx')
    xs.sort(key=lambda x:str(x.get('last_modified') or x.get('created_at') or ''),reverse=True)
    return xs[0]

def load(title):
    ds=search(title); res=resource(ds); rr=s.get(res['url'],timeout=120); rr.raise_for_status()
    xf=pd.ExcelFile(io.BytesIO(rr.content)); best=None
    for sh in xf.sheet_names:
        df=pd.read_excel(xf,sheet_name=sh)
        if best is None or len(df)>len(best[1]): best=(sh,df)
    sh,df=best
    cols=[str(c) for c in df.columns]
    bad=[c for c in cols if any(t in norm(c) for t in FORBIDDEN)]
    if bad: raise RuntimeError(f'forbidden-looking columns in {title}: {bad}')
    return df, {'title':ds.get('title'),'resource_title':res.get('title'),'rows':int(len(df)),'sheet':sh,'columns':cols}

def col(df,names,required=True):
    m={c:norm(c) for c in df.columns}
    for x in names:
        nx=norm(x)
        for c,nc in m.items():
            if nc==nx:return c
    if required: raise KeyError(names)
    return None

def code_pattern(x):
    x=str(x).strip()
    if re.fullmatch(r'C\d{2}-i[^/]+',x,re.I): return 'TOP_LEVEL_Cxx_i'
    if '/' in x: return 'OPERATION_WITH_SLASH'
    return 'OTHER'

projects,mp=load('Dataset Estrutura de Missão PRR - Projetos')
contracts,mc=load('Dataset Estrutura de Missão PRR - Contratos Públicos')
investments,mi=load('Dataset Estrutura de Missão PRR - Investimentos')

p_code=col(projects,['cd_projeto']); p_inv=col(projects,['cd_investimento'],False)
p_name=col(projects,['ds_projeto'],False); p_sum=col(projects,['sumario'],False)
c_code=col(contracts,['cd_projeto'])
i_code=col(investments,['cd_investimento','codigo do investimento','codigo investimento'],False)

P=set(projects[p_code].dropna().astype(str).str.strip())
C=set(contracts[c_code].dropna().astype(str).str.strip())
I=set(projects[p_inv].dropna().astype(str).str.strip()) if p_inv else set()
II=set(investments[i_code].dropna().astype(str).str.strip()) if i_code else set()

project_cat={}
for _,r in projects[[p_code]+([p_name] if p_name else [])+([p_sum] if p_sum else [])].iterrows():
    code=str(r[p_code]).strip(); txt=' '.join(str(r[x]) for x in ([p_name] if p_name else [])+([p_sum] if p_sum else []))
    project_cat[code]=cats(txt)
cat_projects={k for k,v in project_cat.items() if v}

result={
 'status':'DIAGNOSTIC_ONLY_NO_NEW_GATE',
 'metadata':{'projects':mp,'contracts':mc,'investments':mi},
 'counts':{
   'unique_project_codes':len(P),
   'unique_contract_project_codes':len(C),
   'unique_project_investment_codes':len(I),
   'unique_investment_dataset_codes':len(II),
   'contract_codes_matching_project_code':len(C & P),
   'contract_codes_matching_project_investment_code':len(C & I),
   'contract_codes_matching_investment_dataset_code':len(C & II),
   'contract_codes_matching_neither_project_nor_investment':len(C - (P|I|II)),
   'projects_with_preexisting_category_signal':len(cat_projects),
   'category_signal_projects_also_in_contract_codes':len(cat_projects & C),
 },
 'rates':{
   'contract_code_match_project_rate':len(C&P)/len(C) if C else None,
   'contract_code_match_project_investment_rate':len(C&I)/len(C) if C else None,
   'contract_code_match_investment_dataset_rate':len(C&II)/len(C) if C else None,
   'category_signal_project_link_rate':len(cat_projects&C)/len(cat_projects) if cat_projects else None,
 },
 'contract_code_patterns':pd.Series([code_pattern(x) for x in C]).value_counts().to_dict(),
 'project_code_patterns':pd.Series([code_pattern(x) for x in P]).value_counts().to_dict(),
 'safe_contract_code_examples':sorted(C)[:20],
 'safe_investment_code_examples':sorted(II)[:20],
 'timing_or_publication_candidate_columns':{
   'projects':[c for c in projects.columns if any(t in norm(c) for t in ['data','dt ','inicio','aprov','decis','public','referencia'])],
   'investments':[c for c in investments.columns if any(t in norm(c) for t in ['data','dt ','inicio','aprov','decis','public','referencia'])],
 },
 'interpretation_guard':'Do not infer GO/NO-GO from this diagnostic. It only identifies the correct unit of analysis and whether a historical public-observability timestamp exists.'
}
OUT.write_text(json.dumps(result,indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps(result,indent=2,ensure_ascii=False))
