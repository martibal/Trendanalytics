
"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

const SECTIONS = [
  ["why", "Why it exists"],
  ["source", "Source data"],
  ["chains", "Four chains"],
  ["method", "Calculation"],
  ["json", "Published JSON"],
  ["use", "How it is used"],
  ["trust", "Trust model"],
] as const;

const META_JSON = `{
  "schema_version": "meta.v1",
  "chain": "bitcoin",
  "date": "2026-05-10",
  "status": {
    "label": "STABLE",
    "one_liner": "Published evidence points to balanced network conditions."
  },
  "confidence": {
    "confidence_score": 0.748,
    "row_coverage": 0.8,
    "freshness": 1,
    "history_depth": 1,
    "metric_coverage": 0.6
  },
  "drivers": {
    "demand": "normal",
    "friction": "normal",
    "capacity": "balanced"
  },
  "provenance": {
    "methodology_version": "v1",
    "determinism_hash": "81b295000696",
    "no_price_data": true
  }
}`;

const highlightJson = (json: string) => json.replace(/("[^"\\]*(?:\\.[^"\\]*)*"\s*:)/g, '<span class="key">$1</span>').replace(/:\s*("[^"\\]*(?:\\.[^"\\]*)*")/g, ': <span class="str">$1</span>').replace(/:\s*(-?\d+(?:\.\d+)?)/g, ': <span class="num">$1</span>');

function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`ua-vf-reveal ${className}`}>{children}</div>;
}

export default function UrdAtlasTourClient() {
  const [active, setActive] = useState<string>("#why");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const revealItems = Array.from(document.querySelectorAll<HTMLElement>(".ua-vf-reveal"));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14 });
    revealItems.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sideLinks = document.querySelectorAll<HTMLAnchorElement>(".ua-vf-side a");
    const sections = Array.from(sideLinks).map((a) => document.querySelector<HTMLElement>(a.getAttribute("href") ?? "")).filter(Boolean) as HTMLElement[];
    const onScroll = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      setProgress((window.scrollY / max) * 100);
      let current = "#why";
      sections.forEach((section) => { if (section.getBoundingClientRect().top < 140) current = `#${section.id}`; });
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <main className="ua-vf">
      <div className="ua-vf-progress" style={{ width: `${progress}%` }} />
      <section className="ua-vf-hero">
        <div className="ua-vf-shell ua-vf-hero-grid">
          <div className="ua-vf-hero-copy ua-vf-reveal is-visible">
            <div className="ua-vf-eyebrow">New to Urd Atlas</div>
            <h1 className="ua-vf-h1">An A–Z roadmap from raw chain data to <em>regime context.</em></h1>
            <p>Blockchain data is noisy, uneven, and hard to read structurally. Urd Atlas exists to classify daily network conditions without price data, forecasts, or recommendations.</p>
            <div className="ua-vf-btn-row"><Link className="ua-vf-btn-primary" href="/">Back to landing</Link><a className="ua-vf-btn-ghost" href="#why">Start roadmap</a></div>
          </div>
          <aside className="ua-vf-context-panel ua-vf-reveal is-visible">
            <div className="ua-vf-panel-head"><div><div className="ua-vf-panel-title">Roadmap</div><div className="ua-vf-muted ua-vf-mono">seven sections</div></div><div className="ua-vf-panel-date">Daily<br />not intraday</div></div>
            <ol className="ua-tour-roadmap-list">
              {SECTIONS.map(([id, label]) => <li key={id}><a className="ua-vf-text-link" href={`#${id}`}>{label}</a></li>)}
            </ol>
          </aside>
        </div>
      </section>

      <section className="ua-vf-kpis"><div className="ua-vf-shell ua-vf-kpi-grid"><div className="ua-vf-kpi"><strong>526</strong><span>published pipeline days</span></div><div className="ua-vf-kpi"><strong>4</strong><span>chains covered</span></div><div className="ua-vf-kpi"><strong>v1</strong><span>methodology version</span></div><div className="ua-vf-kpi"><strong>0</strong><span>price fields</span></div><div className="ua-vf-kpi"><strong>Daily</strong><span>not intraday</span></div></div></section>

      <div className="ua-vf-tour-layout">
        <aside className="ua-vf-side"><nav>{SECTIONS.map(([id, label]) => <a key={id} href={`#${id}`} className={active === `#${id}` ? "active" : ""}>{label}</a>)}</nav></aside>
        <article className="ua-vf-article">
          <ArticleSection id="why" num="01" title="Why Urd Atlas exists"><p>On-chain data never stops. Every block, transaction, fee movement, and address count creates a stream of observations that can move sharply without representing a durable change in the network.</p><p>Urd Atlas was built for one question: is this chain behaving normally, or has something structurally shifted?</p><figure className="ua-vf-noise-figure"><figcaption className="ua-vf-chart-caption"><span>Intraday raw movement</span><span>Underlying structural context</span></figcaption><svg viewBox="0 0 900 180" width="100%" height="180" aria-hidden="true"><polyline points="0,90 30,40 60,120 90,55 120,100 150,28 180,92 210,142 240,60 270,105 300,35 330,115 360,78 390,145 420,55 450,95 480,36 510,120 540,62 570,110 600,42 630,118 660,70 690,132 720,58 750,101 780,38 810,112 840,60 870,105 900,72" fill="none" stroke="rgba(196,64,64,.4)" strokeWidth="1.2"/><polyline points="0,95 100,92 200,88 300,91 400,87 500,90 600,86 700,89 800,85 900,88" fill="none" stroke="var(--teal)" strokeWidth="3" strokeDasharray="8 5"/></svg></figure></ArticleSection>
          <ArticleSection id="source" num="02" title="The source layer"><p>AWS Public Blockchain Data provides the raw observations. Urd Atlas does not resell raw AWS data; it publishes daily aggregated, derived, and interpretive JSON layers built from public-chain observations.</p><p>The source layer matters because the product can be checked from the bottom up: source, transformation, label, confidence, provenance.</p></ArticleSection>
          <ArticleSection id="chains" num="03" title="Why these four chains"><p>Bitcoin, Ethereum, Arbitrum, and Base cover the main reference chain, the major execution layer, and two high-activity scaling environments. Together, they provide enough market structure to make regime context useful without turning the product into an unfocused chain catalogue.</p><div className="ua-vf-label-row"><span className="ua-vf-mono">BTC</span><p>Reference settlement chain.</p></div><div className="ua-vf-label-row"><span className="ua-vf-mono">ETH</span><p>Major execution and fee-market environment.</p></div><div className="ua-vf-label-row"><span className="ua-vf-mono">ARB / BASE</span><p>Scaling environments with high daily activity and distinct fee/capacity dynamics.</p></div></ArticleSection>
          <ArticleSection id="method" num="04" title="How calculation works"><p>Raw observations are turned into daily measurements, then into trend baselines, then into labels and confidence. The process is deterministic and versioned.</p><ol className="ua-vf-method-steps"><li><span className="ua-vf-step-num">01</span><div><strong>Aggregate daily measurements</strong><p>Raw observations become canonical chain metrics.</p></div></li><li><span className="ua-vf-step-num">02</span><div><strong>Build derived baselines</strong><p>Moving averages and windows establish context.</p></div></li><li><span className="ua-vf-step-num">03</span><div><strong>Classify regime</strong><p>Demand, friction, and capacity evidence determine the published label.</p></div></li><li><span className="ua-vf-step-num">04</span><div><strong>Publish provenance</strong><p>Each row carries methodology version and determinism hash.</p></div></li></ol></ArticleSection>
          <ArticleSection id="json" num="05" title="What the customer receives"><p>The product is published as JSON: Gold, Derived, Meta, and Brief. Technical users parse the files directly. Non-pipeline users read the Brief layer.</p><pre className="ua-vf-code-block" dangerouslySetInnerHTML={{ __html: highlightJson(META_JSON) }} /></ArticleSection>
          <ArticleSection id="use" num="06" title="How it is used"><p>Pipeline users join Urd Atlas to their own rows by chain and date. Users without infrastructure read the Briefs directly. Both paths rely on the same published evidence.</p><details><summary>With a pipeline</summary><p>Join by chain + date, then segment your own data by regime, confidence, and drivers.</p></details><details><summary>Without a pipeline</summary><p>Read the latest chain Brief to understand what changed, what drove it, and how stable the label has been.</p></details></ArticleSection>
          <ArticleSection id="trust" num="07" title="Trust model"><p>Trust is built through constraints: no price data, no predictions, no recommendations, versioned methodology, public examples, and explicit UNKNOWN/DEGRADED states when evidence is weak.</p><Link className="ua-vf-btn-primary" href="/api-docs">Read API docs</Link></ArticleSection>
        </article>
      </div>
    </main>
  );
}

function ArticleSection({ id, num, title, children }: { id: string; num: string; title: string; children: ReactNode }) {
  return <section id={id} className="ua-vf-article-section"><div className="ua-vf-article-meta">{num}</div><Reveal className="ua-vf-article-content"><h2 className="ua-vf-h2">{title}</h2>{children}</Reveal></section>;
}
