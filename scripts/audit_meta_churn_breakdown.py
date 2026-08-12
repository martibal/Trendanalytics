from collections import Counter, defaultdict
from datetime import date, timedelta
from pathlib import Path
import json, re

ROOT=Path('data/published/v1/meta')
CHAINS=['bitcoin','ethereum','arbitrum','base']
PAT=re.compile(r'^\d{4}-\d{2}-\d{2}\.json$')

def load(chain):
    out=[]
    for p in sorted((ROOT/chain).glob('*.json')):
        if PAT.match(p.name):
            m=json.loads(p.read_text(encoding='utf-8'))
            out.append((date.fromisoformat(m['date']), (m.get('regime') or {}).get('label')))
    return out

def stats(rows):
    runs=[]
    if rows:
        s=0
        for i in range(1,len(rows)+1):
            if i==len(rows) or rows[i][1]!=rows[s][1]:
                runs.append((rows[s][0],rows[i-1][0],rows[s][1],i-s))
                s=i
    by=defaultdict(list)
    for r in runs: by[r[2]].append(r[3])
    switches=Counter()
    for a,b in zip(rows,rows[1:]):
        if a[1]!=b[1]: switches[f'{a[1]}->{b[1]}']+=1
    one=Counter(r[2] for r in runs if r[3]==1)
    return {
      'rows':len(rows),'runs':len(runs),'switches':sum(switches.values()),'switch_pairs':dict(switches),
      'one_day_runs_by_label':dict(one),
      'run_stats_by_label':{k:{'runs':len(v),'min':min(v),'median':sorted(v)[len(v)//2],'max':max(v),'mean':round(sum(v)/len(v),3)} for k,v in by.items()}
    }

def main():
    out={}
    for c in CHAINS:
        rows=load(c)
        cutoff=rows[0][0]+timedelta(days=180)
        mature=[r for r in rows if r[0]>=cutoff]
        out[c]={'all':stats(rows),'post_180d_warmup':stats(mature),'warmup_cutoff':cutoff.isoformat()}
    Path('audit-meta-churn.json').write_text(json.dumps(out,indent=2,sort_keys=True),encoding='utf-8')
    print('CHURN_JSON_START')
    print(json.dumps(out,sort_keys=True))
    print('CHURN_JSON_END')
if __name__=='__main__': main()
