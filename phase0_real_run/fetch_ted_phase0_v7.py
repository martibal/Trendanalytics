#!/usr/bin/env python3
"""
Phase 0 v7 real TED transport.

2016-2023:
  Official TED CSV Contract Notices annual ZIPs.
  Only the non-personal analytical columns are read:
    ID_NOTICE_CN, DT_DISPATCH, ISO_COUNTRY_CODE, CPV, ADDITIONAL_CPVS, CANCELLED.
  Raw ZIP/CSV files are ephemeral and deleted after projection.

2024-2026:
  TED Search API, restricted to Contract Notice competition types:
    cn-standard, cn-social, cn-desg
  Requested fields only:
    publication-number, dispatch-date, buyer-country, classification-cpv

Persisted output:
  notice_id, dispatch_date, buyer_country, cpv_code

No buyer names, national IDs, contact persons, emails, phones or addresses are persisted.
"""
from __future__ import annotations
import argparse, calendar, csv, io, json, re, tempfile, zipfile, os, time
from pathlib import Path
import requests
import pandas as pd

API="https://api.ted.europa.eu/v3/notices/search"
HIST_URL="https://data.europa.eu/api/hub/store/data/ted-contract-notices-{year}.zip"
FIELDS=["publication-number","dispatch-date","buyer-country","classification-cpv"]
NOTICE_TYPES=("cn-standard","cn-social","cn-desg")
ISO3_TO_2={"AUT":"AT","BEL":"BE","BGR":"BG","HRV":"HR","CYP":"CY","CZE":"CZ","DNK":"DK",
"EST":"EE","FIN":"FI","FRA":"FR","DEU":"DE","GRC":"GR","HUN":"HU","IRL":"IE","ITA":"IT",
"LVA":"LV","LTU":"LT","LUX":"LU","MLT":"MT","NLD":"NL","POL":"PL","PRT":"PT","ROU":"RO",
"SVK":"SK","SVN":"SI","ESP":"ES","SWE":"SE"}
EU2=set(ISO3_TO_2.values())

def scalar_list(v):
    if v is None:return []
    if isinstance(v,list):
        out=[]
        for x in v:out.extend(scalar_list(x))
        return out
    if isinstance(v,dict):
        out=[]
        for x in v.values():out.extend(scalar_list(x))
        return out
    return [str(v)]

def first(v):
    x=scalar_list(v);return x[0] if x else None

def country(v):
    for x in [z.strip().upper() for z in scalar_list(v)]:
        if x in EU2:return x
        if x in ISO3_TO_2:return ISO3_TO_2[x]
    return None

def cpvs_from_text(v, allowed):
    out=set()
    for x in scalar_list(v):
        for digits in re.findall(r"(?<!\d)(\d{8})(?:-\d)?(?!\d)",x):
            if digits in allowed:out.add(digits)
    return sorted(out)

def extract_notices(data):
    if not isinstance(data,dict):return []
    for k in ("notices","results","items","content"):
        if isinstance(data.get(k),list):return data[k]
    return []

def req(session,q,page):
    payload={"query":q,"fields":FIELDS,"limit":100,"page":page,"scope":"ALL","paginationMode":"PAGE_NUMBER"}
    last=None
    for a in range(5):
        try:
            r=session.post(API,json=payload,timeout=60)
            if r.status_code in (429,500,502,503,504):
                last=f"{r.status_code} {r.text[:500]}";time.sleep(min(2**a,16));continue
            r.raise_for_status();return r.json()
        except Exception as e:
            last=repr(e);time.sleep(min(2**a,16))
    raise RuntimeError(last)

def read_historical_zip(session, year, allowed, rows, audit):
    url=HIST_URL.format(year=year)
    with tempfile.TemporaryDirectory() as td:
        zp=Path(td)/f"{year}.zip"
        with session.get(url,stream=True,timeout=120) as r:
            r.raise_for_status()
            with zp.open("wb") as f:
                for ch in r.iter_content(1024*1024):
                    if ch:f.write(ch)
        with zipfile.ZipFile(zp) as z:
            names=[n for n in z.namelist() if n.lower().endswith(".csv")]
            if not names:raise RuntimeError(f"No CSV in official TED CN ZIP {year}")
            annual=0
            for name in names:
                with z.open(name) as raw:
                    b=raw.read(65536)
                    enc="utf-8-sig"
                    try: txt=b.decode(enc)
                    except UnicodeDecodeError:
                        enc="latin-1";txt=b.decode(enc)
                    sep=";" if txt.splitlines()[0].count(";")>txt.splitlines()[0].count(",") else ","
                with z.open(name) as raw2:
                    df=pd.read_csv(raw2,sep=sep,encoding=enc,dtype=str,low_memory=False)
                aliases={c.upper().strip():c for c in df.columns}
                required=["ID_NOTICE_CN","DT_DISPATCH","ISO_COUNTRY_CODE","CPV"]
                miss=[c for c in required if c not in aliases]
                if miss:raise RuntimeError(f"{year}/{name} missing {miss}; columns={list(df.columns)[:30]}")
                use=[aliases[c] for c in required]
                for opt in ("ADDITIONAL_CPVS","CANCELLED"):
                    if opt in aliases:use.append(aliases[opt])
                df=df[use].copy()
                ren={aliases[c]:c for c in required}
                for opt in ("ADDITIONAL_CPVS","CANCELLED"):
                    if opt in aliases:ren[aliases[opt]]=opt
                df=df.rename(columns=ren)
                if "CANCELLED" in df:
                    df=df.loc[df["CANCELLED"].fillna("").str.strip()!="1"]
                dates=pd.to_datetime(df["DT_DISPATCH"],dayfirst=True,errors="coerce")
                for idx,r in df.iterrows():
                    d=dates.loc[idx]
                    if pd.isna(d):continue
                    cc=str(r["ISO_COUNTRY_CODE"]).strip().upper()
                    if cc not in EU2:continue
                    codes=set(cpvs_from_text(r["CPV"],allowed))
                    if "ADDITIONAL_CPVS" in df.columns:
                        codes.update(cpvs_from_text(r.get("ADDITIONAL_CPVS"),allowed))
                    if not codes:continue
                    nid=f"{year}-CN-{str(r['ID_NOTICE_CN']).strip()}"
                    for code in codes:
                        rows.add((nid,d.date().isoformat(),cc,code))
                        annual+=1
        audit.append({"source":"OFFICIAL_TED_CSV_CONTRACT_NOTICES","year":year,"url":url,"normalized_rows_added":annual})

def modern_month(session,y,m,allowed,rows,audit):
    last=calendar.monthrange(y,m)[1]
    cpv_expr=" ".join(sorted(allowed))
    types=" ".join(NOTICE_TYPES)
    q=(f"DS>={y:04d}{m:02d}01 AND DS<={y:04d}{m:02d}{last:02d} "
       f"AND notice-type IN ({types}) AND classification-cpv IN ({cpv_expr})")
    page=1;raw_n=0;added=0
    while True:
        data=req(session,q,page);ns=extract_notices(data)
        if not ns:break
        raw_n+=len(ns)
        for n in ns:
            nid=first(n.get("publication-number"))
            ds=first(n.get("dispatch-date"))
            cc=country(n.get("buyer-country"))
            cs=cpvs_from_text(n.get("classification-cpv"),allowed)
            if not nid or not ds or not cc or not cs:continue
            for code in cs:
                rows.add((nid,ds[:10],cc,code));added+=1
        if len(ns)<100:break
        page+=1
        if page>150:raise RuntimeError(f"15k PAGE_NUMBER ceiling {y}-{m:02d}")
    audit.append({"source":"TED_SEARCH_API_COMPETITION_CN","month":f"{y:04d}-{m:02d}","raw_notices":raw_n,"rows_added":added,"pages":page})

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--frozen-dir",required=True,type=Path)
    ap.add_argument("--out",required=True,type=Path)
    ap.add_argument("--log",required=True,type=Path)
    a=ap.parse_args()
    cpv=json.loads((a.frozen_dir/"cpv_definitions.json").read_text())
    allowed=set()
    for d in cpv["definitions"].values():allowed.update(d["codes"])
    rows=set();audit=[]
    s=requests.Session();s.headers["User-Agent"]="Phase0-Regulatory-Demand-v7/1.0"
    for y in range(2016,2024):
        read_historical_zip(s,y,allowed,rows,audit)
    for y,m in [(y,m) for y in range(2024,2027) for m in range(1,13) if (y<2026 or m<=8)]:
        modern_month(s,y,m,allowed,rows,audit)
    a.out.parent.mkdir(parents=True,exist_ok=True)
    with a.out.open("w",newline="",encoding="utf-8") as f:
        w=csv.writer(f);w.writerow(["notice_id","dispatch_date","buyer_country","cpv_code"])
        w.writerows(sorted(rows,key=lambda x:(x[1],x[2],x[0],x[3])))
    log={"privacy_projection":["notice_id","dispatch_date","buyer_country","cpv_code"],
         "notice_universe":"COMPETITION_CONTRACT_NOTICES","time_field":"DISPATCH_DATE",
         "normalized_rows":len(rows),"audit":audit}
    a.log.write_text(json.dumps(log,indent=2),encoding="utf-8")
    print(json.dumps({k:v for k,v in log.items() if k!="audit"},indent=2))
    if not rows:raise RuntimeError("No rows; abort")
if __name__=="__main__":main()
