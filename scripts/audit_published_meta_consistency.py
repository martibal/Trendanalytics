from __future__ import annotations

import json, math, re
from collections import Counter, defaultdict
from datetime import date, timedelta
from pathlib import Path

ROOT = Path('data/published/v1/meta')
CHAINS = ['bitcoin','ethereum','arbitrum','base']
ALLOWED = {'STABLE','HEATING','CONGESTED','CHEAP','UNKNOWN/DEGRADED'}
DAY_RE = re.compile(r'^\d{4}-\d{2}-\d{2}\.json$')

def close(a,b,tol=1e-10):
    try: return math.isclose(float(a),float(b),rel_tol=tol,abs_tol=tol)
    except Exception: return False

def axis_sig(reg):
    axes=reg.get('axes') or {}
    out=[]
    for k in ('demand','friction','capacity'):
        a=axes.get(k) or {}
        out += [a.get('band_high'),a.get('band_low'),a.get('trend'),int(a.get('informative_count') or 0)]
    # ETH v2 supplemental calldata can independently corroborate HEATING.
    s=((reg.get('signals') or {}).get('nonempty_calldata_share') or {})
    out += [s.get('trend'), bool(s.get('informative',False))]
    g=reg.get('gate') or {}
    out += [g.get('status')]
    return tuple(out)

def label_support_from_axes(reg,label):
    axes=reg.get('axes') or {}
    def a(k): return axes.get(k) or {}
    def high(x): return x.get('band_high') in {'HIGH','EXTREME_HIGH'} and int(x.get('informative_count') or 0)>0
    def extreme(x): return x.get('band_high')=='EXTREME_HIGH' and int(x.get('informative_count') or 0)>0
    def low(x): return x.get('band_low') in {'LOW','EXTREME_LOW'} and int(x.get('informative_count') or 0)>0
    d,f,c=a('demand'),a('friction'),a('capacity')
    if label=='CONGESTED': return (high(f) and high(c)) or (extreme(c) and c.get('trend')=='HEATING')
    if label=='CHEAP': return low(f) and not high(c)
    if label=='HEATING':
        core=high(d) and d.get('trend')=='HEATING'
        calldata=((reg.get('signals') or {}).get('nonempty_calldata_share') or {})
        supplemental=high(d) and bool(calldata.get('informative',False)) and calldata.get('trend')=='HEATING'
        return core or supplemental
    return True

def score_support(meta,label):
    # Prefer explicit reconciliation facts embedded in published regime.sanity.
    san=((meta.get('regime') or {}).get('sanity') or {})
    basis=san.get('support_basis')
    if basis=='scorecard': return True
    details=san.get('scorecard_support') or {}
    def item(k): return details.get(k) or {}
    ds,fs,cs=item('demand'),item('friction'),item('capacity')
    dv,fv,cv=ds.get('score'),fs.get('score'),cs.get('score')
    dl,fl,cl=ds.get('level'),fs.get('level'),cs.get('level')
    if label=='CONGESTED': return ((fv is not None and fv>=67 and cv is not None and cv>=67) or (fl=='High' and cl=='Tight'))
    if label=='CHEAP': return ((fv is not None and fv<=33) or fl=='Low') and not ((cv is not None and cv>=67) or cl=='Tight')
    if label=='HEATING': return ((dv is not None and dv>=67) or dl=='High')
    return True

def cand_label(meta):
    c=meta.get('confidence') or {}
    x=c.get('candidate_label') or {}
    return x.get('label') or (((c.get('components') or {}).get('label_confidence') or {}).get('candidate_label'))

def score_vector(meta):
    c=meta.get('confidence') or {}
    cc=c.get('candidate_label') or {}
    comp=cc.get('components') or {}
    raw=comp.get('scorecard_raw_scores') or (((c.get('components') or {}).get('label_confidence') or {}).get('scorecard_raw_scores')) or {}
    try: return tuple(float(raw[k]) for k in ('demand','friction','capacity'))
    except Exception: return None

def run(chain):
    files=sorted(p for p in (ROOT/chain).glob('*.json') if DAY_RE.match(p.name))
    rows=[]; parse_errors=[]
    for p in files:
        try: rows.append(json.loads(p.read_text(encoding='utf-8')))
        except Exception as e: parse_errors.append((p.name,str(e)))
    rows.sort(key=lambda x:x.get('date') or '')
    dates=[r.get('date') for r in rows]
    missing=[]
    if dates:
        cur=date.fromisoformat(dates[0]); end=date.fromisoformat(dates[-1]); have=set(dates)
        while cur<=end:
            if cur.isoformat() not in have: missing.append(cur.isoformat())
            cur += timedelta(days=1)
    labels=Counter(); rules=Counter(); meth=Counter(); hard=[]; adjusted=[]; switches=[]; one_day=[]; aba=[]
    sig_to_cands=defaultdict(set)
    sig_examples=defaultdict(list)
    prev=None
    for i,m in enumerate(rows):
        dt=m.get('date'); reg=m.get('regime') or {}; lab=reg.get('label'); labels[lab]+=1
        rules[reg.get('ruleset_id')]+=1; meth[m.get('methodology_version')]+=1
        if lab not in ALLOWED: hard.append([dt,'invalid_label',lab])
        conf=m.get('confidence') or {}; cs=conf.get('confidence_score'); dq=conf.get('data_quality_score'); lc=conf.get('label_confidence_score')
        for name,v in [('confidence_score',cs),('data_quality_score',dq),('label_confidence_score',lc)]:
            if v is not None and not (0<=float(v)<=1): hard.append([dt,'range_'+name,v])
        if cs is not None and dq is not None and lc is not None and not close(cs, math.sqrt(float(dq)*float(lc)),1e-9): hard.append([dt,'confidence_formula',[cs,dq,lc]])
        gate=reg.get('gate') or {}; gated=(gate.get('status')=='gated')
        if gated and lab!='UNKNOWN/DEGRADED': hard.append([dt,'gated_but_published',lab])
        if not gated and lab=='UNKNOWN/DEGRADED': hard.append([dt,'unknown_without_gate',gate])
        if lab not in {'STABLE','UNKNOWN/DEGRADED',None}:
            if not (label_support_from_axes(reg,lab) or score_support(m,lab)):
                hard.append([dt,'unsupported_nonstable',lab])
        san=reg.get('sanity') or {}
        if san.get('adjusted'): adjusted.append([dt,san.get('from_label'),san.get('to_label'),san.get('reason')])
        c=cand_label(m)
        sig=(reg.get('ruleset_id'),axis_sig(reg))
        if c: sig_to_cands[sig].add(c); sig_examples[sig].append([dt,c,lab])
        if prev and lab!=prev[1]: switches.append([prev[0],prev[1],dt,lab])
        prev=(dt,lab)
    # transition pathologies
    for i in range(1,len(rows)-1):
        l0=(rows[i-1].get('regime') or {}).get('label'); l1=(rows[i].get('regime') or {}).get('label'); l2=(rows[i+1].get('regime') or {}).get('label')
        if l0==l2 and l0!=l1: aba.append([rows[i-1].get('date'),l0,rows[i].get('date'),l1,rows[i+1].get('date'),l2])
    # run lengths
    runs=[]
    if rows:
        start=0
        labs=[(r.get('regime') or {}).get('label') for r in rows]
        for i in range(1,len(labs)+1):
            if i==len(labs) or labs[i]!=labs[start]:
                runs.append([rows[start].get('date'),rows[i-1].get('date'),labs[start],i-start])
                start=i
    one_day=[x for x in runs if x[3]==1]
    inconsistent_sigs=[]
    for sig,vals in sig_to_cands.items():
        if len(vals)>1: inconsistent_sigs.append({'ruleset':sig[0],'labels':sorted(vals),'examples':sig_examples[sig][:8]})
    # nearest adjacent score-vector switch: diagnostic only
    close_switch=[]
    for i in range(1,len(rows)):
        a,b=rows[i-1],rows[i]; la=(a.get('regime') or {}).get('label'); lb=(b.get('regime') or {}).get('label')
        va,vb=score_vector(a),score_vector(b)
        if la!=lb and va and vb:
            dist=math.sqrt(sum((x-y)**2 for x,y in zip(va,vb)))
            if dist<=5: close_switch.append([a.get('date'),la,b.get('date'),lb,round(dist,3),[round(x,2) for x in va],[round(x,2) for x in vb]])
    return {
      'chain':chain,'rows':len(rows),'first':dates[0] if dates else None,'last':dates[-1] if dates else None,
      'parse_errors':parse_errors,'missing_dates':missing,'duplicate_dates':len(dates)-len(set(dates)),
      'labels':dict(labels),'rulesets':dict(rules),'methodology_versions':dict(meth),
      'hard_violation_count':len(hard),'hard_violations':hard[:50],
      'sanity_adjustment_count':len(adjusted),'sanity_adjustments':adjusted[:50],
      'switch_count':len(switches),'one_day_run_count':len(one_day),'aba_whipsaw_count':len(aba),
      'one_day_runs':one_day[:30],'aba_whipsaws':aba[:30],
      'candidate_signature_inconsistency_count':len(inconsistent_sigs),'candidate_signature_inconsistencies':inconsistent_sigs[:20],
      'close_score_switch_count':len(close_switch),'close_score_switches':close_switch[:30],
      'min_run_days':min((x[3] for x in runs),default=None),'median_run_days':(sorted(x[3] for x in runs)[len(runs)//2] if runs else None),'max_run_days':max((x[3] for x in runs),default=None)
    }

def main():
    report={'audit_version':'2026-08-12','scope':'all dated daily meta JSON files present in repository','chains':[run(c) for c in CHAINS]}
    report['totals']={
      'rows':sum(x['rows'] for x in report['chains']),
      'hard_violations':sum(x['hard_violation_count'] for x in report['chains']),
      'missing_dates':sum(len(x['missing_dates']) for x in report['chains']),
      'sanity_adjustments':sum(x['sanity_adjustment_count'] for x in report['chains']),
      'switches':sum(x['switch_count'] for x in report['chains']),
      'one_day_runs':sum(x['one_day_run_count'] for x in report['chains']),
      'aba_whipsaws':sum(x['aba_whipsaw_count'] for x in report['chains']),
      'candidate_signature_inconsistencies':sum(x['candidate_signature_inconsistency_count'] for x in report['chains'])
    }
    Path('audit-meta-consistency.json').write_text(json.dumps(report,indent=2,sort_keys=True),encoding='utf-8')
    print('AUDIT_JSON_START')
    print(json.dumps(report,sort_keys=True))
    print('AUDIT_JSON_END')

if __name__=='__main__': main()
