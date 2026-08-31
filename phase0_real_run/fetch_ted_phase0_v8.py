#!/usr/bin/env python3
"""
Phase 0 v8 TED transport — privacy-safe.

Uses TED Search API ONLY.

Server-side requested fields:
  publication-number
  dispatch-date
  buyer-country
  classification-cpv

Notice universe:
  Competition / Contract Notices only:
    cn-standard, cn-social, cn-desg

Persisted schema:
  notice_id, dispatch_date, buyer_country, cpv_code

Forbidden:
- raw bulk ZIP/XML downloads
- buyer/contact names
- email
- phone
- postal addresses
- natural-person identifiers
- any field not in the explicit four-field projection above
"""
from __future__ import annotations

import argparse, calendar, csv, json, re, time
from pathlib import Path
import requests

API = "https://api.ted.europa.eu/v3/notices/search"
FIELDS = [
    "publication-number",
    "dispatch-date",
    "buyer-country",
    "classification-cpv",
]
NOTICE_TYPES = ("cn-standard", "cn-social", "cn-desg")
ISO3_TO_2 = {
    "AUT":"AT","BEL":"BE","BGR":"BG","HRV":"HR","CYP":"CY","CZE":"CZ",
    "DNK":"DK","EST":"EE","FIN":"FI","FRA":"FR","DEU":"DE","GRC":"GR",
    "HUN":"HU","IRL":"IE","ITA":"IT","LVA":"LV","LTU":"LT","LUX":"LU",
    "MLT":"MT","NLD":"NL","POL":"PL","PRT":"PT","ROU":"RO","SVK":"SK",
    "SVN":"SI","ESP":"ES","SWE":"SE"
}
EU2 = set(ISO3_TO_2.values())


def scalar_list(v):
    if v is None:
        return []
    if isinstance(v, list):
        out = []
        for x in v:
            out.extend(scalar_list(x))
        return out
    if isinstance(v, dict):
        out = []
        for x in v.values():
            out.extend(scalar_list(x))
        return out
    return [str(v)]


def first(v):
    xs = scalar_list(v)
    return xs[0] if xs else None


def normalize_country(v):
    for x in [z.strip().upper() for z in scalar_list(v)]:
        if x in EU2:
            return x
        if x in ISO3_TO_2:
            return ISO3_TO_2[x]
    return None


def normalize_cpvs(v, allowed):
    out = set()
    for x in scalar_list(v):
        for code in re.findall(r"(?<!\d)(\d{8})(?:-\d)?(?!\d)", x):
            if code in allowed:
                out.add(code)
    return sorted(out)


def extract_notices(data):
    if not isinstance(data, dict):
        return []
    for key in ("notices", "results", "items", "content"):
        if isinstance(data.get(key), list):
            return data[key]
    return []


def request_page(session, query, page, attempts=5):
    payload = {
        "query": query,
        "fields": FIELDS,
        "limit": 100,
        "page": page,
        "scope": "ALL",
        "paginationMode": "PAGE_NUMBER",
    }
    last = None
    for attempt in range(attempts):
        try:
            r = session.post(API, json=payload, timeout=60)
            if r.status_code in (429, 500, 502, 503, 504):
                last = f"HTTP {r.status_code}: {r.text[:500]}"
                time.sleep(min(2**attempt, 16))
                continue
            r.raise_for_status()
            data = r.json()
            # Defensive privacy guard: refuse unexpected requested-field configuration.
            if payload["fields"] != FIELDS:
                raise RuntimeError("Field projection mutated unexpectedly.")
            return data
        except Exception as e:
            last = repr(e)
            time.sleep(min(2**attempt, 16))
    raise RuntimeError(f"TED request failed after {attempts} attempts: {last}")


def month_iter(start_y, start_m, end_y, end_m):
    y, m = start_y, start_m
    while (y, m) <= (end_y, end_m):
        yield y, m
        m += 1
        if m == 13:
            y, m = y + 1, 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--frozen-dir", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--log", required=True, type=Path)
    a = ap.parse_args()

    prereg = json.loads((a.frozen_dir/"phase0_preregistration.json").read_text())
    if prereg["specification_version"] != "PHASE0_LOCKED_V8":
        raise RuntimeError("Expected frozen v8 preregistration.")
    if prereg["panel_policy"].get("raw_bulk_downloads_forbidden") is not True:
        raise RuntimeError("Privacy policy not frozen correctly.")

    cpv = json.loads((a.frozen_dir/"cpv_definitions.json").read_text())
    allowed = set()
    for d in cpv["definitions"].values():
        allowed.update(d["codes"])

    cpv_expr = " ".join(sorted(allowed))
    types_expr = " ".join(NOTICE_TYPES)

    rows = set()
    audit = []
    s = requests.Session()
    s.headers["User-Agent"] = "Phase0-Regulatory-Demand-v8/1.0"

    # Common privacy-safe Search API horizon at 2026-08-31.
    for y, m in month_iter(2016, 9, 2026, 8):
        last = calendar.monthrange(y, m)[1]
        query = (
            f"DS>={y:04d}{m:02d}01 AND DS<={y:04d}{m:02d}{last:02d} "
            f"AND notice-type IN ({types_expr}) "
            f"AND classification-cpv IN ({cpv_expr})"
        )
        page = 1
        raw = 0
        added = 0
        first_total = None

        while True:
            data = request_page(s, query, page)
            notices = extract_notices(data)
            if page == 1:
                first_total = data.get("totalNoticeCount")
            if not notices:
                break

            raw += len(notices)
            for n in notices:
                nid = first(n.get("publication-number"))
                ds = first(n.get("dispatch-date"))
                cc = normalize_country(n.get("buyer-country"))
                codes = normalize_cpvs(n.get("classification-cpv"), allowed)
                if not nid or not ds or not cc or not codes:
                    continue
                for code in codes:
                    rows.add((nid, ds[:10], cc, code))
                    added += 1

            if len(notices) < 100:
                break
            page += 1
            if page > 150:
                raise RuntimeError(
                    f"PAGE_NUMBER pagination ceiling exceeded for {y}-{m:02d}; "
                    "refusing partial month."
                )

        audit.append({
            "month": f"{y:04d}-{m:02d}",
            "query": query,
            "first_page_totalNoticeCount": first_total,
            "raw_notices": raw,
            "normalized_rows_added_before_dedupe": added,
            "pages": page,
        })

    a.out.parent.mkdir(parents=True, exist_ok=True)
    with a.out.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["notice_id", "dispatch_date", "buyer_country", "cpv_code"])
        w.writerows(sorted(rows, key=lambda x: (x[1], x[2], x[0], x[3])))

    log = {
        "endpoint": API,
        "source": "TED_SEARCH_API_ONLY",
        "notice_universe": "COMPETITION_CONTRACT_NOTICES",
        "time_field": "DISPATCH_DATE",
        "fields_requested": FIELDS,
        "personal_fields_requested": False,
        "raw_bulk_downloads_used": False,
        "start_month": "2016-09",
        "end_month": "2026-08",
        "months_queried": len(audit),
        "normalized_rows": len(rows),
        "audit": audit,
    }
    a.log.write_text(json.dumps(log, indent=2), encoding="utf-8")
    print(json.dumps({k:v for k,v in log.items() if k != "audit"}, indent=2))
    if not rows:
        raise RuntimeError("No normalized rows returned; refusing to run gate.")


if __name__ == "__main__":
    main()
