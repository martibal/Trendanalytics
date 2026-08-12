from pathlib import Path

p = Path('web-v1-app/src/components/home/InteractiveHomeDashboard.tsx')
s = p.read_text(encoding='utf-8')

anchor = '''const gettingStarted = [
  { number: "01", title: "A network regime, not a market regime", body: "STABLE, HEATING, CONGESTED and CHEAP describe observable network conditions. They do not describe price direction, investor risk or a trading view.", cta: "Read methodology →", href: "/methodology/reference", icon: "card" },
  { number: "02", title: "Evidence underneath the label", body: "Demand, Friction and Capacity summarize the network state, while confidence, drivers and Gold measurements show the evidence behind it.", cta: "See validation →", href: "/validation", icon: "plug" },
  { number: "03", title: "A row you can use immediately", body: "Join the daily state on date + chain, segment analysis by regime, filter on confidence, or use Briefs as reporting context.", cta: "See code example →", href: "/analyst-kit", icon: "code" },
] as const;'''
addition = anchor + '''

const regimeExplainers: Array<{ label: Exclude<HomeLabel, "UNKNOWN/DEGRADED">; plain: string; evidence: string }> = [
  { label: "STABLE", plain: "No unusual network condition dominates the evidence.", evidence: "Demand, Friction and Capacity do not combine strongly enough to trigger another regime." },
  { label: "HEATING", plain: "Network activity is unusually elevated and still strengthening.", evidence: "High Demand plus a heating trend; Ethereum can also use its defined calldata corroboration path." },
  { label: "CONGESTED", plain: "The network is under material usage or capacity pressure.", evidence: "Typically high Friction together with high Capacity pressure; Ethereum/L2 also allow an extreme-capacity heating path." },
  { label: "CHEAP", plain: "Using the network is unusually inexpensive without contradictory capacity pressure.", evidence: "Low Friction while Capacity is not simultaneously high enough to veto the classification." },
];'''
if anchor not in s:
    raise SystemExit('gettingStarted anchor not found')
s = s.replace(anchor, addition, 1)

section_anchor = '''      <div className="ua3-transition" aria-hidden="true" />

      <section id="today-status" className="ua3-section ua3-status"'''
new_section = '''      <div className="ua3-transition" aria-hidden="true" />

      <section className="ua3-section ua3-regimes" aria-labelledby="regime-explainer-title">
        <div className="ua3-wrap">
          <div className="ua3-regime-head">
            <div>
              <p className="ua3-label ua3-step-label">How to read the label</p>
              <h2 id="regime-explainer-title" className="ua3-step-title">Four labels. One question: what kind of network day was it?</h2>
            </div>
            <p className="ua3-body-small ua3-regime-intro">Each label is relative to that chain&apos;s own recent history. The same absolute fee or activity level can therefore mean something different on Bitcoin, Ethereum, Arbitrum and Base.</p>
          </div>
          <div className="ua3-regime-grid">
            {regimeExplainers.map((item) => (
              <article key={item.label} className="ua3-card ua3-regime-card" style={toneStyle(item.label)}>
                <div className="ua3-regime-card-head"><StatusBadge label={item.label} /><span className="ua3-regime-question">Network state</span></div>
                <h3>{item.plain}</h3>
                <p className="ua3-body-small">{item.evidence}</p>
              </article>
            ))}
          </div>
          <div className="ua3-regime-axis-note">
            <strong>Demand</strong> = activity · <strong>Friction</strong> = cost/failure burden · <strong>Capacity</strong> = pressure on usable network room.
            <Link href="/methodology/reference"> See the exact chain-specific rules →</Link>
          </div>
        </div>
      </section>

      <div className="ua3-transition" aria-hidden="true" />

      <section id="today-status" className="ua3-section ua3-status"'''
if section_anchor not in s:
    raise SystemExit('today-status anchor not found')
s = s.replace(section_anchor, new_section, 1)

css_anchor = '.ua3-status { background: var(--bg-base); }'
css_add = css_anchor + '''
.ua3-regimes { background: linear-gradient(rgba(16, 224, 160, 0.025), rgba(16, 224, 160, 0.025)), var(--bg-base); }
.ua3-regime-head { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(320px, 0.7fr); gap: 48px; align-items: end; }
.ua3-regime-intro { margin: 0; max-width: 560px; }
.ua3-regime-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; margin-top: 36px; }
.ua3-regime-card { position: relative; overflow: hidden; padding: 24px; border-top: 3px solid var(--status-color); }
.ua3-regime-card::before { content: ""; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(145deg, rgba(255,255,255,.025), transparent 45%); }
.ua3-regime-card-head { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 22px; }
.ua3-regime-question { color: var(--text-tertiary); font-family: var(--mono); font-size: 10px; letter-spacing: .05em; text-transform: uppercase; }
.ua3-regime-card h3, .ua3-regime-card p { position: relative; }
.ua3-regime-axis-note { margin-top: 24px; padding: 16px 18px; border: 1px solid var(--border-subtle); border-radius: var(--radius-card); color: var(--text-secondary); font-size: 13px; line-height: 1.6; }
.ua3-regime-axis-note strong { color: var(--text-primary); }
.ua3-regime-axis-note a { color: var(--accent-action); text-decoration: none; }'''
if css_anchor not in s:
    raise SystemExit('css anchor not found')
s = s.replace(css_anchor, css_add, 1)

resp_anchor = '@media (max-width: 1120px) {'
if resp_anchor not in s:
    raise SystemExit('responsive anchor not found')
s = s.replace(resp_anchor, resp_anchor + '\n  .ua3-regime-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }\n  .ua3-regime-head { grid-template-columns: 1fr; gap: 18px; align-items: start; }', 1)

mobile_anchor = '@media (max-width: 767px) {'
if mobile_anchor not in s:
    raise SystemExit('mobile anchor not found')
s = s.replace(mobile_anchor, mobile_anchor + '\n  .ua3-regime-grid { grid-template-columns: 1fr; }\n  .ua3-regime-card { padding: 20px; }', 1)

p.write_text(s, encoding='utf-8')
