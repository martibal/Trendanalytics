#!/usr/bin/env python3
import io, json, re, unicodedata, requests, pandas as pd, numpy as np
from pathlib import Path

API='https://dados.gov.pt/api/1/datasets/'
OUT=Path('/tmp/funded_procurement_result.json')
session=requests.Session(); session.headers['User-Agent']='Funded-Procurement-Falsification/2.0'

def norm(s):
    s=unicodedata.normalize('NFKD',str(s)).encode('ascii','ignore').decode().lower().strip()
    return re.sub(r'[^a-z0-9]+',' ',s).strip()

def fail(verdict, reason, meta=None, schemas=None, mapping=None, extra=None, code=2):
    result={'verdict':verdict,'reason':reason,'metadata':meta or {},'schemas':schemas or {},'column_mapping':mapping or {}}
    if extra: result.update(extra)
    OUT.write_text(json.dumps(result,indent=2,ensure_ascii=False),encoding='utf-8')
    print(json.dumps(result,indent=2,ensure_ascii=False))
    raise SystemExit(code)

def search_dataset(title):
    r=session.get(API,params={'q':title,'page_size':50},timeout=30); r.raise_for_status(); j=r.json()
    items=j.get('data') or j.get('results') or j.get('items') or []
    exact=[x for x in items if norm(x.get('title'))==norm(title)]
    if not exact:
        toks=[t for t in norm(title).split() if len(t)>3]
        exact=[x for x in items if all(t in norm(x.get('title')) for t in toks)]
    if not exact: raise RuntimeError(f'Dataset not found: {title}')
    return exact[0]

def resource(ds):
    rs=ds.get('resources') or []
    xlsx=[r for r in rs if str(r.get('format','')).lower() in ('xlsx','xls')]
    if not xlsx: raise RuntimeError(f'No XLSX resource for {ds.get("title")}')
    xlsx.sort(key=lambda x:str(x.get('last_modified') or x.get('created_at') or ''),reverse=True)
    return xlsx[0]

def find_col(df, alternatives, required=True):
    nc={c:norm(c) for c in df.columns}
    for alt in alternatives:
        a=norm(alt)
        hit=[c for c,n in nc.items() if n==a]
        if hit:return hit[0]
    for alt in alternatives:
        toks=norm(alt).split()
        hit=[c for c,n in nc.items() if all(t in n for t in toks)]
        if hit:return hit[0]
    if required: raise KeyError(f'column alternatives not found: {alternatives}')
    return None

titles={
 'projects':'Dataset Estrutura de Missão PRR - Projetos',
 'contracts':'Dataset Estrutura de Missão PRR - Contratos Públicos',
 'contractualisation':'Dataset Estrutura de Missão PRR - Contratualização',
}
meta={}; frames={}; schemas={}
forbidden=('email','e mail','telefone','telemovel','contacto','morada','nome pessoa','primeiro nome','apelido','data nascimento')
try:
    for key,title in titles.items():
        ds=search_dataset(title); res=resource(ds)
        meta[key]={'dataset_title':ds.get('title'),'dataset_id':ds.get('id'),'license':ds.get('license'),
                   'organization':(ds.get('organization') or {}).get('name'),'resource_title':res.get('title'),
                   'resource_url':res.get('url'),'resource_checksum':res.get('checksum')}
        rr=session.get(res['url'],timeout=120); rr.raise_for_status(); b=rr.content
        xf=pd.ExcelFile(io.BytesIO(b)); best=None
        for sh in xf.sheet_names:
            df=pd.read_excel(xf,sheet_name=sh)
            if best is None or len(df)>len(best[1]): best=(sh,df)
        sh,df=best; cols=[str(c) for c in df.columns]
        bad=[c for c in cols if any(t in norm(c) for t in forbidden)]
        schemas[key]={'sheet':sh,'rows':int(len(df)),'columns':cols,'forbidden_header_hits':bad}
        if bad: fail('NO-GO_PRIVACY_SCHEMA',f'Forbidden-looking columns in {key}',meta,schemas,code=2)
        frames[key]=df
except SystemExit: raise
except Exception as e:
    fail('NO-GO_DATA_ACCESS',repr(e),meta,schemas,code=2)

p=frames['projects'].copy(); c=frames['contracts'].copy()
try:
    p_code=find_col(p,['cd_projeto','codigo de operacao','codigo operacao','codigo projeto','id projeto','codigo'])
    p_start=find_col(p,['dt_inicio','data de inicio','data inicio','inicio do projeto','data inicio projeto'])
    p_name=find_col(p,['ds_projeto','nome do projeto','nome projeto','designacao projeto','designacao','nome'],False)
    p_summary=find_col(p,['sumario','resumo','descricao projeto','descricao'],False)

    c_code=find_col(c,['cd_projeto','codigo de operacao','codigo operacao','codigo projeto','id projeto','codigo'])
    c_date=find_col(c,['dt_contrato','dt_celebracao','dt_publicacao','data de celebracao do contrato','data celebracao contrato','data do contrato','data contrato','data publicacao'],False)
    c_obj=find_col(c,['ds_objeto','ds_contrato','objeto do contrato','objecto do contrato','objeto contrato','descricao contrato','descricao','objeto'],False)
    c_cpv=find_col(c,['cd_cpv','cpv','codigo cpv'],False)
    c_value=find_col(c,['vl_contrato','valor_contrato','valor contratado','preco contratual','valor contrato','montante contrato'],False)
except Exception as e:
    fail('NO-GO_DATA_SCHEMA',repr(e),meta,schemas,code=2)

mapping={'project_code':p_code,'project_start':p_start,'project_name':p_name,'project_summary':p_summary,
         'contract_project_code':c_code,'contract_date':c_date,'contract_object':c_obj,'contract_cpv':c_cpv,'contract_value':c_value}
if c_date is None:
    fail('NO-GO_DATA','Contract dataset lacks a date field required for commercial lead.',meta,schemas,mapping,code=2)

p['_code']=p[p_code].astype(str).str.strip(); c['_code']=c[c_code].astype(str).str.strip()
p['_start']=pd.to_datetime(p[p_start],errors='coerce',dayfirst=True); c['_date']=pd.to_datetime(c[c_date],errors='coerce',dayfirst=True)
p=p.loc[p['_code'].ne('') & p['_start'].notna()].drop_duplicates('_code',keep='first')
c=c.loc[c['_code'].ne('') & c['_date'].notna()]
keep=['_code','_start']+([p_name] if p_name else [])+([p_summary] if p_summary else [])
joined=c.merge(p[keep],on='_code',how='inner')
joined['_lead_days']=(joined['_date']-joined['_start']).dt.days
linked_projects=int(joined['_code'].nunique()); total_projects=int(p['_code'].nunique()); linked_contracts=int(len(joined))
first=joined.groupby('_code')['_lead_days'].min(); post=first[first>=0]

CAT={
 'DIGITAL_IT':['software','sistema','digital','informat','tecnolog','dados','cloud','ciber','cyber','plataforma','aplicacao','interoperab','rede','network'],
 'CONSTRUCTION':['obra','construc','reabilit','edificio','empreitada','infraestrutura'],
 'EQUIPMENT':['equipamento','hardware','mobiliario','veiculo','maquina'],
 'CONSULTING_AUDIT':['consult','assessoria','auditor','estudo','assessment'],
 'TRAINING':['formacao','capacitacao','treino','training'],
}
def cats(text):
    s=norm(text); return {k for k,ws in CAT.items() if any(norm(w) in s for w in ws)}
category_metrics=None
if c_obj and (p_name or p_summary):
    pp=p.set_index('_code'); project_cat={}
    for code in pp.index:
        vals=[]
        for col in (p_name,p_summary):
            if col: vals.append(str(pp.loc[code,col]))
        project_cat[code]=cats(' '.join(vals))
    contract_cat=joined[c_obj].fillna('').map(cats)
    evaluable=0; hits=0
    for code,cc in zip(joined['_code'],contract_cat):
        pc=project_cat.get(code,set())
        if pc and cc:
            evaluable+=1; hits+=int(bool(pc & cc))
    category_metrics={'contracts_total_joined':linked_contracts,'contracts_evaluable':evaluable,
                      'broad_category_overlap_rate':(hits/evaluable if evaluable else None)}

metrics={
 'total_projects_with_valid_start':total_projects,
 'projects_linked_to_dated_procurement':linked_projects,
 'linked_contracts_with_dates':linked_contracts,
 'project_link_rate':(linked_projects/total_projects if total_projects else None),
 'projects_with_first_contract_on_or_after_start':int(len(post)),
 'median_days_start_to_first_contract':(float(post.median()) if len(post) else None),
 'p25_days':(float(post.quantile(.25)) if len(post) else None),
 'p75_days':(float(post.quantile(.75)) if len(post) else None),
 'share_first_contract_at_least_90d':(float((post>=90).mean()) if len(post) else None),
 'share_first_contract_at_least_180d':(float((post>=180).mean()) if len(post) else None),
 'contracts_before_project_start':int((joined['_lead_days']<0).sum()),
 'category_metrics':category_metrics,
}
lead_ok=bool(len(post)>=30 and metrics['share_first_contract_at_least_90d'] is not None and metrics['share_first_contract_at_least_90d']>=0.60 and metrics['median_days_start_to_first_contract']>=90)
cat_ok=bool(category_metrics is not None and category_metrics['contracts_evaluable']>=100 and category_metrics['broad_category_overlap_rate'] is not None and category_metrics['broad_category_overlap_rate']>=0.60)
linkage_ok=bool(linked_projects>=30 and metrics['project_link_rate'] is not None and metrics['project_link_rate']>=0.10)
verdict='CONDITIONAL_GO_PUBLICATION_TIMESTAMP_REQUIRED' if (lead_ok and cat_ok and linkage_ok) else 'NO-GO'
result={'verdict':verdict,'hard_checks':{'lead_ok':lead_ok,'category_ok':cat_ok,'linkage_ok':linkage_ok},
        'publication_timestamp_gate':'UNRESOLVED: project start is not proof that the project/funding record was publicly observable on that date.',
        'metrics':metrics,'metadata':meta,'schemas':schemas,'column_mapping':mapping}
OUT.write_text(json.dumps(result,indent=2,ensure_ascii=False),encoding='utf-8')
print(json.dumps(result,indent=2,ensure_ascii=False))
raise SystemExit(0 if verdict.startswith('CONDITIONAL_GO') else 2)
