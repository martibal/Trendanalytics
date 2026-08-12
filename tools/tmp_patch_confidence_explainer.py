from pathlib import Path

p = Path('web-v1-app/src/components/home/InteractiveHomeDashboard.tsx')
s = p.read_text(encoding='utf-8')

old_info = 'confidence: { title: "Confidence", body: "Headline reliability for the published row. It combines data quality with how clearly the row supports the published label." },'
new_info = 'confidence: { title: "Confidence", body: "A combined evidence-strength score. It blends data quality with how clearly the observed evidence supports the published label. It is not a probability that the label is correct." },'
if old_info not in s:
    raise SystemExit('confidence info anchor not found')
s = s.replace(old_info, new_info, 1)

old_gauge = '<div className="ua3-confidence-text"><p className="ua3-label">Headline reliability</p><p>Use confidence to decide how much weight to place on the published row.</p></div>'
new_gauge = '<div className="ua3-confidence-text"><p className="ua3-label">Evidence strength</p><p>Use confidence to decide how much weight to place on the row. It is not the probability that the label is correct.</p></div>'
if old_gauge not in s:
    raise SystemExit('confidence gauge anchor not found')
s = s.replace(old_gauge, new_gauge, 1)

anchor = '''      </section>\n\n      <div className="ua3-transition" aria-hidden="true" />\n\n      <section id="today-status" className="ua3-section ua3-status"'''
section = '''      </section>\n\n      <div className="ua3-transition" aria-hidden="true" />\n\n      <section className="ua3-section ua3-confidence-explainer" aria-labelledby="confidence-explainer-title">\n        <div className="ua3-wrap">\n          <div className="ua3-confidence-explainer-head">\n            <div>\n              <p className="ua3-label ua3-step-label">How to read confidence</p>\n              <h2 id="confidence-explainer-title" className="ua3-step-title">Confidence is evidence strength — not probability.</h2>\n            </div>\n            <p className="ua3-body-small ua3-confidence-explainer-intro">A displayed confidence of 74% does not mean there is a 74% chance the regime label is correct. It means the combined confidence score is 0.74 under the published methodology.</p>\n          </div>\n          <div className="ua3-confidence-explainer-grid">\n            <article className="ua3-card ua3-confidence-explainer-card">\n              <p className="ua3-label">01 · Data quality</p>\n              <h3>Is the evidence complete and fresh enough?</h3>\n              <p className="ua3-body-small">Data quality measures the reliability of the observation surface: required metric coverage, recent coverage, history, density and freshness relative to the chain&apos;s publication-lag policy.</p>\n            </article>\n            <article className="ua3-card ua3-confidence-explainer-card">\n              <p className="ua3-label">02 · Label confidence</p>\n              <h3>How clearly does the evidence support this label?</h3>\n              <p className="ua3-body-small">Label confidence measures separation and support inside the regime rules — including rule margin, driver strength, trend, coherence and label-specific evidence.</p>\n            </article>\n            <article className="ua3-card ua3-confidence-explainer-card ua3-confidence-formula-card">\n              <p className="ua3-label">03 · Headline confidence</p>\n              <h3><code>sqrt(data quality × label confidence)</code></h3>\n              <p className="ua3-body-small">The geometric mean prevents one strong component from fully hiding a weak one. If the combined score falls below 0.40, Urd Atlas withholds the stronger regime claim and publishes <strong>UNKNOWN/DEGRADED</strong>.</p>\n            </article>\n          </div>\n          <div className="ua3-confidence-warning"><strong>Read 74% as:</strong> “the data are sufficiently reliable and the evidence supports this label clearly under the defined methodology” — not “74% probability that this is the true regime.” <Link href="/methodology/reference">See the exact confidence methodology →</Link></div>\n        </div>\n      </section>\n\n      <div className="ua3-transition" aria-hidden="true" />\n\n      <section id="today-status" className="ua3-section ua3-status"'''
if anchor not in s:
    raise SystemExit('today-status section anchor not found')
s = s.replace(anchor, section, 1)

css_anchor = '.ua3-files { background: linear-gradient(rgba(76, 110, 245, 0.04), rgba(76, 110, 245, 0.04)), var(--bg-base); }'
css = '''.ua3-confidence-explainer { background: var(--bg-base); }\n.ua3-confidence-explainer-head { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(320px, .75fr); gap: 48px; align-items: end; }\n.ua3-confidence-explainer-intro { margin: 0; max-width: 580px; }\n.ua3-confidence-explainer-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; margin-top: 36px; }\n.ua3-confidence-explainer-card { padding: 24px; }\n.ua3-confidence-explainer-card h3 { margin-top: 18px; }\n.ua3-confidence-formula-card { border-color: color-mix(in srgb, var(--accent-action) 55%, var(--border-subtle)); background: linear-gradient(rgba(16,224,160,.05), rgba(16,224,160,.05)), var(--bg-elevated-1); }\n.ua3-confidence-formula-card code { color: #7DD3FC; font-family: var(--mono); font-size: .72em; line-height: 1.5; }\n.ua3-confidence-warning { margin-top: 24px; padding: 16px 18px; border: 1px solid var(--border-subtle); border-radius: var(--radius-card); color: var(--text-secondary); font-size: 13px; line-height: 1.65; }\n.ua3-confidence-warning strong { color: var(--text-primary); }\n.ua3-confidence-warning a { color: var(--accent-action); text-decoration: none; }\n''' + css_anchor
if css_anchor not in s:
    raise SystemExit('css anchor not found')
s = s.replace(css_anchor, css, 1)

resp = '@media (max-width: 1120px) {'
if resp not in s:
    raise SystemExit('responsive anchor not found')
s = s.replace(resp, resp + '\n  .ua3-confidence-explainer-grid { grid-template-columns: 1fr; }\n  .ua3-confidence-explainer-head { grid-template-columns: 1fr; gap: 18px; align-items: start; }', 1)

p.write_text(s, encoding='utf-8')
