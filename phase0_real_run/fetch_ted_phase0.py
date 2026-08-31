#!/usr/bin/env python3
"""Fetch only the non-personal TED fields required by frozen Phase 0 v6.

Output schema: notice_id, publication_date, buyer_country, cpv_code.
No buyer names, contacts, emails, phones or addresses are requested or persisted.
"""
from __future__ import annotations

import argparse
import calendar
import csv
import json
import time
from pathlib import Path

import requests

API = "https://api.ted.europa.eu/v3/notices/search"
ISO3_TO_2 = {
    "AUT":"AT","BEL":"BE","BGR":"BG","HRV":"HR","CYP":"CY","CZE":"CZ",
    "DNK":"DK","EST":"EE","FIN":"FI","FRA":"FR","DEU":"DE","GRC":"GR",
    "HUN":"HU","IRL":"IE","ITA":"IT","LVA":"LV","LTU":"LT","LUX":"LU",
    "MLT":"MT","NLD":"NL","POL":"PL","PRT":"PT","ROU":"RO","SVK":"SK",
    "SVN":"SI","ESP":"ES","SWE":"SE"
}
EU2 = set(ISO3_TO_2.values())
FIELDS = ["publication-number", "publication-date", "buyer-country", "classification-cpv"]


def scalar_list(v):
    if v is None:
        return []
    if isinstance(v, list):
        out=[]
        for x in v: out.extend(scalar_list(x))
        return out
    if isinstance(v, dict):
        out=[]
        for x in v.values(): out.extend(scalar_list(x))
        return out
    return [str(v)]


def first(v):
    xs=scalar_list(v)
    return xs[0] if xs else None


def normalize_country(v):
    vals=[x.strip().upper() for x in scalar_list(v)]
    for x in vals:
        if x in EU2: return x
        if x in ISO3_TO_2: return ISO3_TO_2[x]
    return None


def normalize_cpvs(v, allowed):
    out=[]
    for x in scalar_list(v):
        digits=''.join(ch for ch in x if ch.isdigit())[:8]
        if len(digits)==8 and digits in allowed:
            out.append(digits)
    return sorted(set(out))


def extract_notices(data):
    for key in ("notices","results","items"):
        v=data.get(key) if isinstance(data,dict) else None
        if isinstance(v,list): return v
    return []


def request_page(session, query, page, attempts=5):
    payload={
        "query": query,
        "fields": FIELDS,
        "limit": 100,
        "page": page,
        "scope": "ALL"
    }
    last=None
    for attempt in range(attempts):
        try:
            r=session.post(API,json=payload,timeout=60)
            if r.status_code in (429,500,502,503,504):
                last=f"HTTP {r.status_code}: {r.text[:500]}"
                time.sleep(min(2**attempt,16)); continue
            r.raise_for_status()
            return r.json(), r.status_code
        except Exception as e:
            last=repr(e)
            time.sleep(min(2**attempt,16))
    raise RuntimeError(f"TED request failed after {attempts} attempts: {last}")


def month_iter(start_year, start_month, end_year, end_month):
    y,m=start_year,start_month
    while (y,m) <= (end_year,end_month):
        yield y,m
        m+=1
        if m==13: y,m=y+1,1


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--frozen-dir",required=True,type=Path)
    ap.add_argument("--out",required=True,type=Path)
    ap.add_argument("--log",required=True,type=Path)
    a=ap.parse_args()

    cpv=json.loads((a.frozen_dir/"cpv_definitions.json").read_text())
    allowed=set()
    for d in cpv["definitions"].values(): allowed.update(d["codes"])
    cpv_expr=" ".join(sorted(allowed))

    # Union of the two frozen required intervals. Query month-by-month to avoid any
    # archive/page ceiling ambiguity; no result-count assumptions are made.
    intervals=[(2016,5,2020,4),(2021,1,2026,8)]
    rows=set(); audit=[]
    s=requests.Session(); s.headers.update({"User-Agent":"Phase0-Regulatory-Demand-Research/1.0"})

    # Archive availability smoke probes independent of selected CPVs.
    for label,q in [
        ("archive_2016", "publication-date = (20160501 <> 20160531)"),
        ("archive_2026", "publication-date = (20260801 <> 20260831)")
    ]:
        data,status=request_page(s,q,1)
        ns=extract_notices(data)
        audit.append({"type":"archive_probe","label":label,"status":status,
                      "response_keys":sorted(data.keys()) if isinstance(data,dict) else [],
                      "returned":len(ns)})
        if not ns:
            raise RuntimeError(f"TED archive probe returned zero notices for {label}; aborting rather than zero-filling unknown source coverage")

    for sy,sm,ey,em in intervals:
        for y,m in month_iter(sy,sm,ey,em):
            last=calendar.monthrange(y,m)[1]
            q=(f"publication-date = ({y:04d}{m:02d}01 <> {y:04d}{m:02d}{last:02d}) "
               f"AND classification-cpv IN ({cpv_expr})")
            page=1; month_raw=0
            while True:
                data,status=request_page(s,q,page)
                notices=extract_notices(data)
                if page==1:
                    audit.append({"type":"cpv_month","month":f"{y:04d}-{m:02d}","status":status,
                                  "response_keys":sorted(data.keys()) if isinstance(data,dict) else [],
                                  "first_page_returned":len(notices)})
                if not notices: break
                month_raw += len(notices)
                for n in notices:
                    nid=first(n.get("publication-number")) or first(n.get("notice-identifier"))
                    pdate=first(n.get("publication-date"))
                    country=normalize_country(n.get("buyer-country"))
                    cpvs=normalize_cpvs(n.get("classification-cpv"),allowed)
                    if not nid or not pdate or not country or not cpvs: continue
                    pdate=pdate[:10]
                    for code in cpvs:
                        rows.add((nid,pdate,country,code))
                if len(notices) < 100: break
                page += 1
                if page > 1000: raise RuntimeError(f"Pagination safety limit exceeded for {y}-{m:02d}")
                time.sleep(0.05)
            audit[-1]["raw_notices_all_pages"]=month_raw
            audit[-1]["pages"]=page

    a.out.parent.mkdir(parents=True,exist_ok=True)
    with a.out.open("w",newline="",encoding="utf-8") as f:
        w=csv.writer(f); w.writerow(["notice_id","publication_date","buyer_country","cpv_code"])
        w.writerows(sorted(rows,key=lambda x:(x[1],x[2],x[0],x[3])))
    log={
        "endpoint":API,"fields_requested":FIELDS,
        "personal_fields_requested":False,
        "allowed_cpv_count":len(allowed),"normalized_rows":len(rows),
        "months_queried":sum(1 for x in audit if x.get("type")=="cpv_month"),
        "audit":audit
    }
    a.log.write_text(json.dumps(log,indent=2),encoding="utf-8")
    print(json.dumps({k:v for k,v in log.items() if k!="audit"},indent=2))
    if not rows: raise RuntimeError("No normalized CPV rows returned; refusing to run frozen gate")

if __name__=="__main__": main()
