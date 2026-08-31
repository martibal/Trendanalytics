#!/usr/bin/env python3
from pathlib import Path
import json, shutil, sys

EXPECTED_REGISTRY = "a719f44fea61abac1963947d0df5b93a0a1de1bcd5f83ef1c7436948a89959fc"
EXPECTED_CPV = "ad2c53421c20871db3b178c920cdfa4fe9f933578f5f36d9b0be0b9df46f89db"

def main():
    if len(sys.argv) != 3:
        raise SystemExit("usage: materialize_v7.py V6_DIR OUT_DIR")
    v6 = Path(sys.argv[1]); out = Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)

    shutil.copy2(v6/"nis2_country_registry.json", out/"nis2_country_registry.json")
    shutil.copy2(v6/"cpv_definitions.json", out/"cpv_definitions.json")

    p6=json.loads((v6/"phase0_preregistration.json").read_text())
    p7=json.loads(json.dumps(p6))
    p7["specification_version"]="PHASE0_LOCKED_V7"
    p7["freeze_date"]="2026-08-31"
    p7["frozen"]=True
    p7["pre_outcome_correction_from_v6"]={
        "reason": (
            "TED Search API scope=ALL is a rolling ten-year search population, so May-Aug 2016 "
            "cannot be populated through the same all-notice Search API used for later years. "
            "No real outcome counts were opened before this correction."
        ),
        "primary_notice_universe": "COMPETITION_CONTRACT_NOTICES",
        "time_field": "DISPATCH_DATE",
        "historical_transport_2016_2023": "OFFICIAL_TED_CSV_CONTRACT_NOTICES",
        "modern_transport_2024_2026": "TED_SEARCH_API_NOTICE_TYPES_CN_STANDARD_CN_SOCIAL_CN_DESG",
        "why_substantively_better": (
            "Competition/Contract Notices represent calls for competition, i.e. the commercially "
            "actionable procurement opportunity, rather than awards/results/corrections."
        )
    }
    p7["locked_input_hashes"]={
        "nis2_country_registry_sha256":EXPECTED_REGISTRY,
        "cpv_definitions_sha256":EXPECTED_CPV
    }
    p7["panel_policy"]["notice_universe"]="COMPETITION_CONTRACT_NOTICES"
    p7["panel_policy"]["time_field"]="DISPATCH_DATE"
    p7["panel_policy"]["historical_notice_types"]="TED_CSV_CONTRACT_NOTICES"
    p7["panel_policy"]["modern_notice_types"]=["cn-standard","cn-social","cn-desg"]
    p7["panel_policy"]["source_population_consistency_required"]=True
    (out/"phase0_preregistration.json").write_text(
        json.dumps(p7,indent=2,ensure_ascii=False),encoding="utf-8"
    )

    builder=(v6/"build_phase0_panel.py").read_text()
    builder=builder.replace(
        "Build the frozen Phase 0 monthly notice-count panel from normalized TED notice×CPV rows.",
        "Build the frozen Phase 0 v7 monthly notice-count panel from Competition/Contract Notice×CPV rows."
    )
    builder=builder.replace("publication_date","dispatch_date")
    builder=builder.replace(
        '"panel_schema_version":"PHASE0_PANEL_V1"',
        '"panel_schema_version":"PHASE0_PANEL_V7_COMPETITION_DISPATCH"'
    )
    builder=builder.replace(
        '"counting_policy":c["counting_policy"],',
        '"counting_policy":c["counting_policy"],\n'
        '        "notice_universe":"COMPETITION_CONTRACT_NOTICES",\n'
        '        "time_field":"DISPATCH_DATE",'
    )
    (out/"build_phase0_panel_v7.py").write_text(builder,encoding="utf-8")

    engine=(v6/"regulatory_demand_phase0_v6.py").read_text()
    engine=engine.replace("PHASE0_LOCKED_V6","PHASE0_LOCKED_V7")
    engine=engine.replace("Phase 0 hard falsification gate v6","Phase 0 hard falsification gate v7")
    engine=engine.replace(
        'if m.get("panel_sha256")!=sha(panel_path): raise ValueError("Panel hash mismatch")',
        'if m.get("panel_sha256")!=sha(panel_path): raise ValueError("Panel hash mismatch")\n'
        '    if m.get("panel_schema_version")!="PHASE0_PANEL_V7_COMPETITION_DISPATCH": '
        'raise ValueError("Wrong panel schema: v7 requires Competition/Contract Notices on dispatch-date")\n'
        '    if m.get("notice_universe")!="COMPETITION_CONTRACT_NOTICES": '
        'raise ValueError("Panel notice universe mismatch")\n'
        '    if m.get("time_field")!="DISPATCH_DATE": raise ValueError("Panel time field mismatch")'
    )
    (out/"regulatory_demand_phase0_v7.py").write_text(engine,encoding="utf-8")

if __name__=="__main__":
    main()
