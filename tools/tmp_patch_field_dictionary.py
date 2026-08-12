from pathlib import Path

p = Path('web-v1-app/src/app/methodology/fields/page.tsx')
s = p.read_text(encoding='utf-8')

old_type = '''type FieldEntry = {
  field: string;
  meaning: ReactNode;
  notes: ReactNode;
  verificationClass?: string;
};'''
new_type = '''type FieldEntry = {
  field: string;
  meaning: ReactNode;
  notes: ReactNode;
  verificationClass?: string;
};

type FieldContext = {
  role: string;
  usefulFor: string;
  appliesTo: string;
};

const FIELD_CONTEXT: Record<string, FieldContext> = {
  tx_count_daily: { role: "Regime · Scorecard · Confidence", usefulFor: "Core activity volume and a primary Demand input.", appliesTo: "BTC · ETH · ARB · BASE" },
  block_count_daily: { role: "Confidence input", usefulFor: "Checks whether the daily block observation surface is sufficiently covered.", appliesTo: "BTC · ETH · ARB · BASE" },
  value_transferred_native: { role: "Observational context", usefulFor: "Adds transfer-volume context without changing the current regime label.", appliesTo: "Where source semantics are available" },
  median_tx_value_native: { role: "Observational context", usefulFor: "Shows the typical native-denominated transaction value; not a current regime driver.", appliesTo: "Where source semantics are available" },
  median_tx_fee_native: { role: "Regime · Scorecard · Confidence", usefulFor: "Primary Friction evidence and the direct fee distribution used by current profiles.", appliesTo: "BTC · ETH · ARB · BASE" },
  median_tx_fee_rate_sat_vbyte: { role: "Observational context", usefulFor: "Lets Bitcoin users inspect fee-rate conditions independently of native fee amount.", appliesTo: "BTC only" },
  median_tx_gas_used: { role: "Observational context", usefulFor: "Provides Ethereum execution-intensity context beneath aggregate network state.", appliesTo: "ETH only" },
  nonempty_calldata_share: { role: "Supplemental regime evidence", usefulFor: "Can corroborate an ETH HEATING classification when core Demand is already high.", appliesTo: "ETH only" },
  contract_creation_tx_share: { role: "Observational context", usefulFor: "Shows how much daily Ethereum activity consists of contract creation.", appliesTo: "ETH only" },
  eip1559_type2_tx_share: { role: "Observational context", usefulFor: "Tracks transaction-envelope adoption without inferring protocol or user intent.", appliesTo: "ETH only" },
  failed_tx_rate: { role: "Regime · Scorecard · Confidence", usefulFor: "Adds execution-failure burden to Ethereum Friction.", appliesTo: "ETH L1" },
  gas_utilization_pct: { role: "Regime · Scorecard · Confidence", usefulFor: "Primary Ethereum Capacity proxy.", appliesTo: "ETH L1" },
  median_block_base_fee_per_gas: { role: "Observational context", usefulFor: "Shows the protocol-set Ethereum base gas price before priority fees.", appliesTo: "ETH only" },
  block_gas_utilization_p90: { role: "Observational context", usefulFor: "Retains upper-tail Ethereum blockspace pressure that an average can hide.", appliesTo: "ETH only" },
  block_weight_utilization_pct: { role: "Regime · Scorecard", usefulFor: "Measures Bitcoin blockspace occupancy and contributes to Capacity pressure.", appliesTo: "BTC only" },
  unique_active_addresses: { role: "Regime evidence · Scorecard · Confidence", usefulFor: "Adds breadth of observed address activity; addresses are not equivalent to users.", appliesTo: "BTC classifier · ETH/L2 classifier + scorecard" },
  avg_block_time_sec: { role: "Confidence · transformed Capacity evidence", usefulFor: "Feeds block-time instability and confirms expected block-cadence coverage.", appliesTo: "BTC · ETH · ARB · BASE" },
  capacity_util_pct: { role: "Regime · Scorecard · Confidence", usefulFor: "Canonical public L2 Capacity field when available.", appliesTo: "ARB · BASE" },
  arbitrum_l1_gas_used_daily: { role: "Observational context", usefulFor: "Exposes Arbitrum L1 gas footprint as a delivered measurement without making it a regime driver.", appliesTo: "ARB only" },
  base_l1_gas_used_daily: { role: "Observational context", usefulFor: "Exposes Base L1 gas footprint as a delivered measurement without making it a regime driver.", appliesTo: "BASE only" },
  "derived.metrics.<metric>__ma7": { role: "Derived feature", usefulFor: "Ready-to-join 7-day smoothing of a published Gold metric.", appliesTo: "Published Derived metric set" },
  "derived.metrics.<metric>__ma30": { role: "Derived feature", usefulFor: "Ready-to-join 30-day smoothing for slower context and comparisons.", appliesTo: "Published Derived metric set" },
  "derived.source.gold_sha256": { role: "Provenance", usefulFor: "Links a Derived artifact back to the exact Gold input state used to produce it.", appliesTo: "BTC · ETH · ARB · BASE" },
  "derived.source.metric_columns": { role: "Provenance", usefulFor: "States exactly which Gold columns were included in the Derived build.", appliesTo: "BTC · ETH · ARB · BASE" },
  "confidence.confidence_score": { role: "Headline reliability", usefulFor: "Helps downstream users decide how much weight to place on the published row.", appliesTo: "Meta" },
  "confidence.methodology_version": { role: "Methodology provenance", usefulFor: "Identifies the exact confidence rules used for this row.", appliesTo: "Meta" },
  "confidence.data_quality_score": { role: "Confidence component", usefulFor: "Separates data sufficiency from label-evidence clarity.", appliesTo: "Meta" },
  "confidence.label_confidence_score": { role: "Confidence component", usefulFor: "Shows how clearly the evidence supports the candidate/published label.", appliesTo: "Meta" },
  "confidence.candidate_label.label": { role: "Audit field", usefulFor: "Shows the pre-gate candidate when a stronger public label may be withheld.", appliesTo: "Meta" },
  "confidence.components.data_quality.required_metrics": { role: "Audit field", usefulFor: "Makes the chain-specific confidence denominator inspectable.", appliesTo: "Meta" },
  "confidence.components.data_quality.structurally_not_applicable": { role: "Audit field", usefulFor: "Explains why non-applicable fields do not count as missing evidence.", appliesTo: "Meta" },
  "confidence.components.data_quality.optional_not_penalized": { role: "Audit field", usefulFor: "Shows which visible fields may be absent without reducing data quality.", appliesTo: "Meta" },
  "confidence.components.label_confidence.uses_score_raw": { role: "Audit field", usefulFor: "Confirms whether label confidence used raw rather than degraded display scores.", appliesTo: "Meta" },
  "confidence.components.label_confidence.used": { role: "Audit field", usefulFor: "Exposes the label-specific components that entered confidence.", appliesTo: "Meta" },
  "status.one_liner": { role: "Readable explanation", usefulFor: "Gives a concise human interpretation of the same published evidence.", appliesTo: "Meta" },
  "status.explanation_support.status_note": { role: "Explanation provenance", usefulFor: "Preserves machine-readable support for nuanced status copy.", appliesTo: "Meta" },
  "regime.label": { role: "Primary product field", usefulFor: "The daily network-state classification joined on date + chain.", appliesTo: "Meta" },
  "regime.determinism_hash": { role: "Integrity provenance", usefulFor: "Provides a canonical traceability anchor for a named regime row.", appliesTo: "Meta" },
  "scorecard.dimensions.<axis>.score": { role: "Display evidence", usefulFor: "Continuous Demand/Friction/Capacity context after confidence degradation.", appliesTo: "Meta" },
  "scorecard.dimensions.<axis>.score_raw": { role: "Methodology evidence", usefulFor: "Preserves the pre-degradation axis score used in analytical interpretation.", appliesTo: "Meta" },
  schema: { role: "Artifact contract", usefulFor: "Identifies which Briefs schema a consumer is parsing.", appliesTo: "Briefs" },
  brief_status: { role: "Publication state", usefulFor: "Tells consumers whether a Briefs artifact was published normally.", appliesTo: "Briefs" },
  "window.updated_through": { role: "Freshness", usefulFor: "Prevents stale or differently lagged windows from being compared blindly.", appliesTo: "Briefs" },
  "regime_path.dominant_label": { role: "Window context", usefulFor: "Summarizes the most common descriptive state inside the brief window.", appliesTo: "Briefs" },
  "movement.type": { role: "Readable context", usefulFor: "Summarizes whether the recent regime path is stable, shifting or degraded.", appliesTo: "Briefs" },
};'''
if old_type not in s:
    raise SystemExit('FieldEntry type anchor not found')
s = s.replace(old_type, new_type, 1)

s = s.replace(
    'notes: "Optional for all current chain profiles; visible when available, but not a confidence penalty when absent. Used only where value-normalized fee burden is methodologically valid. For AWS Ethereum data, transactions.value is normalized from wei to ETH before the daily median is calculated.",',
    'notes: "Optional for all current chain profiles; visible when available, but not a confidence penalty when absent and not used by the current public Friction scorecard. For AWS Ethereum data, transactions.value is normalized from wei to ETH before the daily median is calculated.",',
    1,
)

old_calldata = '''        intent. It does not yet drive the public regime label, scorecard, or confidence calculation
        while historical behaviour is being validated.'''
new_calldata = '''        intent. Under <FieldCode>eth_l1_v2</FieldCode>, it is supplemental Demand evidence: it can
        support HEATING when core Demand is already HIGH/EXTREME_HIGH and calldata trend is HEATING.
        It is not a standalone Demand axis component in the public scorecard.'''
if old_calldata not in s:
    raise SystemExit('calldata note anchor not found')
s = s.replace(old_calldata, new_calldata, 1)

old_unique = '''        Drives the Demand axis for Ethereum L1 and both L2 chains, both directly (weight 1.0)
        and via the derived <FieldCode>tx_per_user</FieldCode> ratio (weight 0.6). Not used for
        Bitcoin&apos;s Demand axis, where <FieldCode>tx_count_daily</FieldCode> alone is the
        methodology&apos;s chosen activity signal.'''
new_unique = '''        Used as Demand evidence by the current regime classifier for BTC, Ethereum L1 and both L2s.
        In the public scorecard it is weighted directly (1.0) for Ethereum/L2 and also feeds
        <FieldCode>tx_per_user</FieldCode> (0.6); the BTC scorecard itself still uses
        <FieldCode>tx_count_daily</FieldCode> as its sole Demand component. This counts addresses,
        not people or unique users.'''
if old_unique not in s:
    raise SystemExit('unique addresses note anchor not found')
s = s.replace(old_unique, new_unique, 1)

avg_anchor = '''  {
    field: "avg_block_time_sec",
    meaning: "Typical daily inter-block interval behaviour.",
    notes: (
      <>
        Inter-block cadence field. It is not read as a raw directional congestion metric; it feeds
        the derived <FieldCode>blocktime_instability</FieldCode> component where that component is
        used by the chain profile.
      </>
    ),
  },
];'''
avg_replacement = '''  {
    field: "avg_block_time_sec",
    meaning: "Typical daily inter-block interval behaviour.",
    notes: (
      <>
        Inter-block cadence field. It is not read as a raw directional congestion metric; it feeds
        the derived <FieldCode>blocktime_instability</FieldCode> evidence surface and is also a
        required data-quality field in current Confidence v3 profiles.
      </>
    ),
  },
  {
    field: "capacity_util_pct",
    meaning: "Public L2 capacity-utilization observation used by the L2 methodology when available.",
    notes: (
      <>
        Arbitrum/Base-only Capacity field for the current <FieldCode>l2_v1</FieldCode> profile. It is
        the canonical L2 Capacity input for regime classification, scorecard construction and
        Confidence v3 data-quality coverage. A null value means that observation is unavailable for
        the row; consumers should not reinterpret null as zero or spare capacity.
      </>
    ),
  },
  {
    field: "arbitrum_l1_gas_used_daily",
    meaning: "Daily L1 gas footprint associated with the Arbitrum data surface.",
    notes: "Arbitrum-only delivered observational field. It is useful for L1-footprint context but is not a current public Demand/Friction/Capacity driver or required confidence input.",
  },
  {
    field: "base_l1_gas_used_daily",
    meaning: "Daily L1 gas footprint associated with the Base data surface.",
    notes: "Base-only delivered observational field. It is useful for L1-footprint context but is not a current public Demand/Friction/Capacity driver or required confidence input.",
  },
];'''
if avg_anchor not in s:
    raise SystemExit('Gold tail anchor not found')
s = s.replace(avg_anchor, avg_replacement, 1)

meta_anchor = 'const META_FIELDS: FieldEntry[] = ['
derived_block = '''const DERIVED_FIELDS: FieldEntry[] = [
  {
    field: "derived.metrics.<metric>__ma7",
    meaning: "Seven-day rolling mean of a published numeric Gold metric included by the Derived producer.",
    notes: "Computed from final published Gold rows with min_periods=1 over available finite values. Use it for short-window smoothing without rebuilding the transformation yourself.",
  },
  {
    field: "derived.metrics.<metric>__ma30",
    meaning: "Thirty-day rolling mean of the same published Gold metric.",
    notes: "Provides slower context for comparisons with the 7-day series. The exact included metric set is recorded in derived.source.metric_columns.",
  },
  {
    field: "derived.source.gold_sha256",
    meaning: "SHA-256 link to the Gold input state used by the Derived artifact.",
    notes: "Use it for provenance and reproducibility when a downstream analysis depends on a particular Derived row.",
  },
  {
    field: "derived.source.metric_columns",
    meaning: "Explicit list of Gold metrics included in that Derived build.",
    notes: "This is the authoritative row-level answer to which Gold measurements received MA7/MA30 features; do not assume every numeric-looking observational field is included.",
  },
];

'''
if meta_anchor not in s:
    raise SystemExit('Meta anchor not found')
s = s.replace(meta_anchor, derived_block + meta_anchor, 1)

s = s.replace('field: "confidence.candidate_label",', 'field: "confidence.candidate_label.label",', 1)
s = s.replace('Confidence v2 uses <FieldCode>sqrt(data_quality_score × label_confidence_score)</FieldCode>. The', 'Confidence v3 uses <FieldCode>sqrt(data_quality_score × label_confidence_score)</FieldCode>. The', 1)
s = s.replace('Current value is <FieldCode>confidence_v2_profile_evidence</FieldCode> for Confidence v2 rows.', 'Current value is <FieldCode>confidence_v3_l2_capacity_required</FieldCode> for current rows.', 1)
s = s.replace('under Confidence v2.', 'under Confidence v3.', 1)
s = s.replace('Current Confidence v2 rows use raw scorecard/regime evidence, not confidence-degraded display scores.', 'Current Confidence v3 rows use raw scorecard/regime evidence, not confidence-degraded display scores.', 1)
s = s.replace('Used by Confidence v2 as part of label confidence.', 'Used by Confidence v3 as part of label confidence.', 1)
s = s.replace('Confidence v2 fields explain why data quality can be high while label confidence remains', 'Confidence v3 fields explain why data quality can be high while label confidence remains', 1)
s = s.replace('Field note: Confidence v2', 'Field note: Confidence v3', 1)
s = s.replace('after Confidence v2 does not mean', 'under Confidence v3 does not mean', 1)

old_grid = '''function FieldGrid({ entries }: { entries: FieldEntry[] }) {
  return (
    <div className="mt-4 grid min-w-0 gap-3">
      {entries.map((entry) => (
        <article key={entry.field} className="min-w-0 rounded-xl border border-[var(--line)] bg-[rgba(22,40,64,.56)] p-4">
          <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <FieldCode>{entry.field}</FieldCode>
            {entry.verificationClass ? (
              <span className="shrink-0 rounded-full border border-[var(--gold-line)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--gold)]">
                Class {entry.verificationClass}
              </span>
            ) : null}
          </div>
          <p className="mt-3 text-sm leading-7 text-[var(--ink)]">{entry.meaning}</p>
          <div className="mt-2 text-sm leading-7 text-[var(--ink2)]">{entry.notes}</div>
        </article>
      ))}
    </div>
  );
}'''
new_grid = '''function FieldGrid({ entries }: { entries: FieldEntry[] }) {
  return (
    <div className="mt-4 grid min-w-0 gap-3">
      {entries.map((entry) => {
        const context = FIELD_CONTEXT[entry.field];
        return (
          <article key={entry.field} className="min-w-0 rounded-xl border border-[var(--line)] bg-[rgba(22,40,64,.56)] p-4">
            <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <FieldCode>{entry.field}</FieldCode>
              <div className="flex flex-wrap gap-2">
                {context ? <span className="rounded-full border border-[var(--line)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink2)]">{context.role}</span> : null}
                {entry.verificationClass ? (
                  <span className="shrink-0 rounded-full border border-[var(--gold-line)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--gold)]">
                    Class {entry.verificationClass}
                  </span>
                ) : null}
              </div>
            </div>
            <p className="mt-3 text-sm leading-7 text-[var(--ink)]">{entry.meaning}</p>
            {context ? (
              <div className="mt-3 grid gap-2 rounded-lg border border-[var(--line)] bg-[rgba(8,15,26,.22)] p-3 text-xs leading-6 text-[var(--ink2)] md:grid-cols-2">
                <p><span className="text-[var(--ink)]">Why useful:</span> {context.usefulFor}</p>
                <p><span className="text-[var(--ink)]">Applies to:</span> {context.appliesTo}</p>
              </div>
            ) : null}
            <div className="mt-2 text-sm leading-7 text-[var(--ink2)]">{entry.notes}</div>
          </article>
        );
      })}
    </div>
  );
}'''
if old_grid not in s:
    raise SystemExit('FieldGrid anchor not found')
s = s.replace(old_grid, new_grid, 1)

s = s.replace(
    'description="This page defines the public meaning of the main published fields and the interpretation warnings that matter most for technical users."',
    'description="What Urd Atlas delivers, what each important field measures, why it is useful, and whether it drives classification, confidence, context, or provenance."',
    1,
)

how_anchor = '''              <Section title="How to use this page">
                <div className="space-y-3">
                  <p>
                    Use this page when you already know the field name and need the public meaning,
                    unit semantics, verification class, and interpretation boundaries. For deeper
                    system-level logic, use the Public Methodology Reference page.
                  </p>
                  <p>
                    Long field paths are shown in wrapping code blocks and cards rather than compact
                    tables, so the page remains readable on laptop and mobile widths.
                  </p>
                </div>
              </Section>'''
receive_section = how_anchor + '''

              <Section title="What exactly do I receive?">
                <div className="grid gap-3 md:grid-cols-2">
                  <NotePanel title="Gold · daily observations">
                    <p>One date + chain row of normalized measurements such as transaction activity, fees, utilization, block cadence and chain-specific observational fields.</p>
                    <p><strong className="text-[var(--ink)]">Use it for:</strong> inspecting the evidence beneath a classification or joining the underlying measurements directly.</p>
                  </NotePanel>
                  <NotePanel title="Derived · ready-made features">
                    <p>MA7/MA30 transformations of the explicitly listed Gold metric set, plus source provenance back to Gold.</p>
                    <p><strong className="text-[var(--ink)]">Use it for:</strong> analysis that needs smoothed features without rebuilding the same rolling calculations.</p>
                  </NotePanel>
                  <NotePanel title="Meta · classification + evidence">
                    <p>The daily regime, Demand/Friction/Capacity evidence, confidence, drivers, ruleset identifiers and determinism/provenance fields.</p>
                    <p><strong className="text-[var(--ink)]">Use it for:</strong> the date + chain state row you integrate into an analytical system.</p>
                  </NotePanel>
                  <NotePanel title="Briefs · readable context">
                    <p>Human-readable window summaries generated from already published regime evidence.</p>
                    <p><strong className="text-[var(--ink)]">Use it for:</strong> reporting and narrative context, not as a separate predictive model.</p>
                  </NotePanel>
                </div>
                <Callout title="Read the role badge first">
                  <p>Each field card now states whether the field is a regime/scorecard input, a confidence input, observational context, a derived feature, or provenance. A field being delivered does not automatically mean it drives the regime label.</p>
                </Callout>
              </Section>'''
if how_anchor not in s:
    raise SystemExit('How-to-use section anchor not found')
s = s.replace(how_anchor, receive_section, 1)

s = s.replace(
    '''              <Section title="Key Gold fields">
                <FieldGrid entries={GOLD_FIELDS} />
              </Section>''',
    '''              <Section title="Key Gold fields">
                <p>Gold is the normalized daily observation layer. Null means unavailable/not applicable for that row; it must not be reinterpreted as zero.</p>
                <FieldGrid entries={GOLD_FIELDS} />
              </Section>

              <Section title="Key Derived fields">
                <p>Derived is deliberately simpler than Gold: it publishes reusable rolling features only for the metric set declared in each artifact&apos;s source metadata.</p>
                <FieldGrid entries={DERIVED_FIELDS} />
              </Section>''',
    1,
)

old_fee_section = '''              <Section title="Field note: fee burden proxy">
                <NotePanel title="Current value">
                  <p>
                    <FieldCode>scorecard.dimensions.friction.components.fee_burden_proxy.current</FieldCode>{" "}
                    is not a native fee amount. It is the current value of an internal friction proxy.
                  </p>
                  <FormulaBlock>{"median_tx_fee_native / median_tx_value_native"}</FormulaBlock>
                  <p>
                    Its unit is a dimensionless ratio, not a native-denominated fee. It measures fee
                    burden relative to transaction value, not fee size in isolation.
                  </p>
                </NotePanel>
                <Callout title="Why this matters">
                  <p>
                    A friction score can be elevated even when absolute fees are not unusually high in
                    native terms, because the friction component is based on fee burden relative to
                    transferred value. Customers should read this field as a burden proxy rather than as
                    a direct fee amount.
                  </p>
                </Callout>
              </Section>'''
new_fee_section = '''              <Section title="Field note: current Friction fee semantics">
                <NotePanel title="Direct fee distribution">
                  <p>
                    Current BTC, Ethereum and L2 public Friction profiles use <FieldCode>median_tx_fee_native</FieldCode>
                    directly (with a log1p transform in the scorecard). Ethereum also includes
                    <FieldCode>failed_tx_rate</FieldCode> as a second Friction component.
                  </p>
                  <p>
                    <FieldCode>fee_burden_proxy</FieldCode> may still appear as a compatibility alias in
                    some mapping metadata, but under the current production profiles it resolves to
                    <FieldCode>median_tx_fee_native</FieldCode>; it is not the old fee/value ratio.
                  </p>
                </NotePanel>
                <Callout title="Why this matters">
                  <p>
                    Consumers should interpret current Friction against the chain&apos;s own historical fee
                    distribution, not as fee divided by transaction value. This keeps the Field Dictionary
                    aligned with the current scorecard and regime engines.
                  </p>
                </Callout>
              </Section>'''
if old_fee_section not in s:
    raise SystemExit('old fee-burden section anchor not found')
s = s.replace(old_fee_section, new_fee_section, 1)

# Remove any remaining obsolete public Confidence-v2 wording.
s = s.replace('Confidence v2', 'Confidence v3')

p.write_text(s, encoding='utf-8')
print('patched', p)
