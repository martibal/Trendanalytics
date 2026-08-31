#!/usr/bin/env python3
import io,json,re,subprocess,tempfile,unicodedata,requests,pandas as pd
from pathlib import Path

OUT=Path('/tmp/funded_procurement_investment_backtest.json')
API='https://dados.gov.pt/api/1/datasets/'
s=requests.Session();s.headers['User-Agent']='Funded-Procurement-Investment-Backtest/1.0'
FORB=('email','e mail','telefone','telemovel','contacto','morada','nome pessoa','primeiro nome','apelido','data nascimento')
DOCS=[
 'ST-10149-2021-ADD-1-REV-1','ST-13351-2023-ADD-1-REV-1','ST-13497-2024-ADD-1',
 'ST-8055-2025-ADD-1','ST-12491-2025-ADD-1','ST-15796-2025-ADD-1',
 'ST-9419-2026-ADD-1','ST-12314-2026-ADD-1']
CAT={
'DIGITAL_IT':['software','sistema','digital','informat','tecnolog','dados','cloud','ciber','cyber','plataforma','aplicacao','interoperab','rede','network'],
'CONSTRUCTION':['obra','construc','reabilit','edificio','empreitada','infraestrutura'],
'EQUIPMENT':['equipamento','hardware','mobiliario','veiculo','maquina'],
'CONSULTING_AUDIT':['consult','assessoria','auditor','estudo','assessment'],
'TRAINING':['formacao','capacitacao','treino','training']}

def norm(x):
 x=unicodedata.normalize('NFKD',str(x)).encode('ascii','ignore').decode().lower().strip();return re.sub(r'[^a-z0-9]+',' ',x).strip()
def cats(x):
 z=norm(x);return {k for k,ws in CAT.items() if any(norm(w) in z for w in ws)}
def search(title):
 r=s.get(API,params={'q':title,'page_size':50},timeout=30);r.raise_for_status();j=r.json();it=j.get('data') or j.get('results') or j.get('items') or []
 ex=[x for x in it if norm(x.get('title'))==norm(title)]
 if not ex:
  toks=[t for t in norm(title).split() if len(t)>3];ex=[x for x in it if all(t in norm(x.get('title')) for t in toks)]
 if not ex:raise RuntimeError('dataset not found '+title)
 return ex[0]
def resource(ds):
 xs=[r for r in (ds.get('resources') or []) if str(r.get('format','')).lower() in ('xlsx','xls')];xs.sort(key=lambda x:str(x.get('last_modified') or x.get('created_at') or ''),reverse=True)
 if not xs:raise RuntimeError('no xlsx');return xs[0]
def load(title):
 ds=search(title);res=resource(ds);rr=s.get(res['url'],timeout=120);rr.raise_for_status();xf=pd.ExcelFile(io.BytesIO(rr.content));best=max(((sh,pd.read_excel(xf,sheet_name=sh)) for sh in xf.sheet_names),key=lambda z:len(z[1]));sh,df=best
 cols=[str(c) for c in df.columns];bad=[c for c in cols if any(t in norm(c) for t in FORB)]
 if bad:raise RuntimeError(f'privacy schema fail {title}: {bad}')
 return df,{'title':ds.get('title'),'resource':res.get('title'),'checksum':res.get('checksum'),'rows':len(df),'columns':cols}
def col(df,name):
 for c in df.columns:
  if norm(c)==norm(name):return c
 raise KeyError(name)
def invnorm(x):
 x=str(x).upper().replace('–','-').replace('—','-').replace(' ','')
 m=re.search(r'([A-Z]{2}-C\d{2}-I\d+(?:\.\d+)?(?:-[A-Z0-9]+)?)',x)
 return m.group(1).replace('-I','-i') if m else None
def pdf_info(doc):
 url=f'https://data.consilium.europa.eu/doc/document/{doc}/en/pdf';r=s.get(url,timeout=120);r.raise_for_status()
 with tempfile.TemporaryDirectory() as td:
  p=Path(td)/'x.pdf';t=Path(td)/'x.txt';p.write_bytes(r.content);subprocess.run(['pdftotext','-layout',str(p),str(t)],check=True);text=t.read_text(errors='ignore')
 head=text[:6000];m=re.search(r'Brussels,\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})',head,re.I)
 if not m:raise RuntimeError('cannot parse document date '+doc)
 date=pd.to_datetime(m.group(1),dayfirst=True).date()
 # normalize whitespace/dash variants before code extraction
 z=text.upper().replace('–','-').replace('—','-');z=re.sub(r'\s*[-]\s*','-',z)
 codes=set()
 for q in re.finditer(r'([A-Z]{2}-C\d{2}-I\d+(?:\.\d+)?(?:-[A-Z0-9]+)?)',z):
  codes.add(q.group(1).replace('-I','-i'))
 return {'doc':doc,'url':url,'date':str(date),'codes':sorted(codes),'code_count':len(codes)}

projects,mp=load('Dataset Estrutura de Missão PRR - Projetos');contracts,mc=load('Dataset Estrutura de Missão PRR - Contratos Públicos');invest,mi=load('Dataset Estrutura de Missão PRR - Investimentos')
pc=col(projects,'cd_projeto');pi=col(projects,'cd_investimento');cc=col(contracts,'cd_projeto');cd=col(contracts,'dt_assinatura_contrato');co=col(contracts,'ds_contrato');ic=col(invest,'Código do Investimento');ides=col(invest,'Descrição detalhada do Investimento');iname=col(invest,'Designação do Investimento')
# top-level PRR projects are exactly the project codes without operation slash
p=projects[[pc,pi]].copy();p['_project']=p[pc].astype(str).str.strip();p['_inv']=p[pi].map(invnorm);p=p.loc[~p['_project'].str.contains('/',regex=False)&p['_inv'].notna()].drop_duplicates('_project')
c=contracts[[cc,cd,co]].copy();c['_project']=c[cc].astype(str).str.strip();c['_date']=pd.to_datetime(c[cd],errors='coerce',dayfirst=True);c=c.loc[c['_date'].notna()].merge(p[['_project','_inv']],on='_project',how='inner')
i=invest[[ic,iname,ides]].copy();i['_inv']=i[ic].map(invnorm);i=i.loc[i['_inv'].notna()].drop_duplicates('_inv')
# official full-plan versions; first appearance is conservative public observability timestamp
versions=[]
for d in DOCS:
 try:versions.append(pdf_info(d))
 except Exception as e:versions.append({'doc':d,'error':repr(e),'codes':[],'code_count':0,'date':None})
valid=[v for v in versions if v.get('date')];valid.sort(key=lambda v:v['date'])
first_public={}
for v in valid:
 for code in v['codes']:first_public.setdefault(code,pd.Timestamp(v['date']))
# Map current investment descriptions and contracts to official first public appearance
c['_public']=c['_inv'].map(first_public);observable=c.loc[c['_public'].notna()].copy();observable['_lead']=(observable['_date']-observable['_public']).dt.days
# first downstream contract per investment, excluding contracts before public appearance for the first-after metric
post=observable.loc[observable['_lead']>=0].copy();first=post.groupby('_inv')['_lead'].min().sort_values()
# category prediction from investment public description -> contract object
idict={r['_inv']:cats(str(r[iname])+' '+str(r[ides])) for _,r in i.iterrows()};evaln=hits=0
for _,r in post.iterrows():
 pcats=idict.get(r['_inv'],set());ccats=cats(r[co])
 if pcats and ccats:evaln+=1;hits+=int(bool(pcats&ccats))
catrate=hits/evaln if evaln else None
share90=float((first>=90).mean()) if len(first) else None;med=float(first.median()) if len(first) else None
# Pre-existing thresholds from the prior test, with impossible 10% denominator gate removed as a schema-level bug.
lead_ok=bool(len(first)>=30 and med is not None and med>=90 and share90 is not None and share90>=0.60)
cat_ok=bool(evaln>=100 and catrate is not None and catrate>=0.60)
coverage_ok=bool(len(first)>=30)
mechanism_pass=bool(lead_ok and cat_ok and coverage_ok)
result={
 'verdict':('PORTUGAL_MECHANISM_PASS_OOS_CONFIRMATION_REQUIRED' if mechanism_pass else 'PORTUGAL_MECHANISM_FAIL'),
 'confirmatory_status':'REPAIRED_BACKTEST_NOT_PRISTINE_CONFIRMATORY_BECAUSE_PORTUGAL_AGGREGATES_WERE_SEEN_BEFORE_UNIT_CORRECTION',
 'hard_checks':{'lead_ok':lead_ok,'category_ok':cat_ok,'coverage_min_30_linked_investments':coverage_ok},
 'thresholds_preserved':{'min_linked_units':30,'median_lead_days_min':90,'share_first_contract_ge_90d_min':0.60,'category_evaluable_min':100,'category_overlap_min':0.60},
 'metrics':{
  'top_level_project_count':int(p['_project'].nunique()),'contract_top_level_project_count':int(c['_project'].nunique()),'current_investment_count':int(i['_inv'].nunique()),
  'investments_found_in_official_plan_versions':int(sum(x in first_public for x in i['_inv'])),'linked_investments_with_public_timestamp_and_post_contract':int(len(first)),
  'median_days_public_plan_to_first_contract':med,'p25_days':(float(first.quantile(.25)) if len(first) else None),'p75_days':(float(first.quantile(.75)) if len(first) else None),
  'share_first_contract_at_least_90d':share90,'share_first_contract_at_least_180d':(float((first>=180).mean()) if len(first) else None),
  'contracts_before_first_public_plan_appearance':int((observable['_lead']<0).sum()),'post_public_contracts':int(len(post)),
  'category_evaluable_contracts':evaln,'category_overlap_rate':catrate},
 'official_plan_versions':[{k:v for k,v in x.items() if k!='codes'} for x in versions],
 'unresolved_current_investment_codes':sorted(set(i['_inv'])-set(first_public)),
 'metadata':{'projects':mp,'contracts':mc,'investments':mi},
 'method_note':'Council full-plan annex document dates used as conservative public-observability dates. No project-start date used. No new effect threshold selected from these results.'
}
OUT.write_text(json.dumps(result,indent=2,ensure_ascii=False),encoding='utf-8');print(json.dumps(result,indent=2,ensure_ascii=False))
raise SystemExit(0 if mechanism_pass else 2)
