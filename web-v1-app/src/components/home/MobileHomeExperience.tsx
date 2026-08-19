"use client";

import type { MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";

import type { HomeChainSnapshot, HomeLabel, Artifact } from "./InteractiveHomeDashboard";
import styles from "./MobileHomeExperience.module.css";

type Props = {
  snapshots: HomeChainSnapshot[];
  lastRun: string;
  consecutiveRows: number | null | undefined;
};

type HistoryRow = { date: string; label: HomeLabel; confidence: number | null };
type HistoryResponse = { chains?: Record<string, HistoryRow[]> };
type Range = 7 | 14;

const artifacts: Artifact[] = ["Meta","Gold","Derived","Briefs"];
const artifactCopy: Record<Artifact,{title:string;body:string}> = {
  Meta:{title:"Meta",body:"The classification layer you join to your own data."},
  Gold:{title:"Gold",body:"The normalized daily network measurements behind the observation."},
  Derived:{title:"Derived",body:"Rolling baselines and historical context calculated from Gold."},
  Briefs:{title:"Brief",body:"A readable explanation generated from the same published evidence."},
};

function yFor(label:HomeLabel){
  if(label==="HEATING") return 60;
  if(label==="STABLE") return 132;
  if(label==="CHEAP") return 214;
  if(label==="CONGESTED") return 28;
  return 176;
}
function shortDate(v:string){
  const d=new Date(`${v}T00:00:00Z`);
  return Number.isNaN(d.getTime())?v:d.toLocaleDateString("en-GB",{day:"numeric",month:"short",timeZone:"UTC"});
}
function statusClass(label:HomeLabel){
  return label.toLowerCase().replace("/","-");
}
function axisValue(v:number|null){return v==null?"—":v.toFixed(1)}
function axisDetail(chain:HomeChainSnapshot){
  return [
    ["Demand", chain.demandLabel || "Current context", axisValue(chain.demand)],
    ["Friction", chain.frictionLabel || "Current context", axisValue(chain.friction)],
    ["Capacity", chain.capacityLabel || "Current context", axisValue(chain.capacity)],
  ];
}
function confidenceCopy(chain:HomeChainSnapshot){
  return `${chain.confidence} confidence describes how strongly the published evidence supports this ${chain.name} classification. It is evidence strength for this observation, not a forecast probability.`;
}

export default function MobileHomeExperience({snapshots,lastRun,consecutiveRows}:Props){
  const [selectedId,setSelectedId]=useState(snapshots[0]?.id??"bitcoin");
  const [history,setHistory]=useState<Record<string,HistoryRow[]>>({});
  const [range,setRange]=useState<Range>(7);
  const [pointIndex,setPointIndex]=useState<number|null>(null);
  const [statusOpen,setStatusOpen]=useState(false);
  const [hintHidden,setHintHidden]=useState(false);
  const [contextOpen,setContextOpen]=useState(false);
  const [layersOpen,setLayersOpen]=useState(true);
  const [artifact,setArtifact]=useState<Artifact>("Meta");
  const [jsonOpen,setJsonOpen]=useState(false);
  const chartRef=useRef<SVGSVGElement|null>(null);

  useEffect(()=>{
    let live=true;
    fetch("/api/v1/home-history",{cache:"no-store"})
      .then(r=>r.ok?r.json() as Promise<HistoryResponse>:Promise.reject())
      .then(v=>{if(live&&v.chains)setHistory(v.chains)})
      .catch(()=>undefined);
    return()=>{live=false};
  },[]);

  const selected=snapshots.find(s=>s.id===selectedId)??snapshots[0];
  if(!selected)return null;
  const visible=(history[selectedId]??[]).slice(-range);
  const idx=pointIndex==null?Math.max(0,visible.length-1):Math.min(pointIndex,Math.max(0,visible.length-1));
  const point=visible[idx];
  const regime=point?.label??selected.regime;
  const confidence=point?.confidence==null?selected.confidence:`${Math.round(point.confidence*100)}%`;
  const date=point?.date?shortDate(point.date):selected.asOf;
  const points=visible.length<2?"":visible.map((r,i)=>`${(i/(visible.length-1))*360},${yFor(r.label)}`).join(" ");
  const cursorX=visible.length>1?(idx/(visible.length-1))*360:360;

  function chooseChain(id:string,open=false){
    setSelectedId(id);setPointIndex(null);
    if(open)setStatusOpen(true);
  }
  function chartClick(e:MouseEvent<SVGSVGElement>){
    if(visible.length<2||!chartRef.current)return;
    const rect=chartRef.current.getBoundingClientRect();
    const ratio=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width));
    setPointIndex(Math.round(ratio*(visible.length-1)));
  }
  function openArtifact(a:Artifact){
    setArtifact(a);setJsonOpen(true);
  }

  return <div className={styles.mobileRoot}>
    <section className={styles.statusZone}>
      <p className={`${styles.statusHint} ${hintHidden?styles.hidden:""}`}>Swipe for all chains · Tap a chain for details →</p>
      <div className={styles.statusStrip} onScroll={e=>{if(e.currentTarget.scrollLeft>18)setHintHidden(true)}} onTouchMove={()=>setHintHidden(true)}>
        {snapshots.map(chain=><button key={chain.id} type="button" className={`${styles.statusPill} ${styles[statusClass(chain.regime)]}`} onClick={()=>chooseChain(chain.id,true)}>
          <strong>{chain.ticker}</strong><span>{chain.regime}</span><small>{chain.confidence}</small>
        </button>)}
      </div>
    </section>

    <section className={styles.hero}>
      <p className={styles.kicker}>Daily blockchain network-state reference data</p>
      <h1>Know the network conditions behind your data.</h1>
      <p className={styles.heroDek}>One classified observation per chain and date.</p>
      <p className={styles.heroExplain}><strong>Join Urd Atlas to the data you already use.</strong> Each row adds a regime, confidence and evidence so you can see whether a change in your own metric happened alongside a change in network conditions.</p>
      <div className={styles.heroActions}><a className={styles.primary} href="#mobile-product">Inspect the product</a><a className={styles.textLink} href="#mobile-why">See why it helps</a></div>

      <div className={styles.chartBlock}>
        <p className={styles.chartGuide}>Each band is a network state — read left to right.</p>
        <div className={styles.chartControls}>
          <div>{snapshots.map(c=><button key={c.id} className={c.id===selectedId?styles.active:""} onClick={()=>chooseChain(c.id)}>{c.ticker}</button>)}</div>
          <div>{([7,14] as Range[]).map(r=><button key={r} className={range===r?styles.active:""} onClick={()=>{setRange(r);setPointIndex(null)}}>{r}D</button>)}</div>
        </div>
        <svg ref={chartRef} className={styles.chart} viewBox="0 0 360 260" preserveAspectRatio="none" onClick={chartClick}>
          <line x1="0" y1="58" x2="360" y2="58" className={styles.gridline}/><line x1="0" y1="132" x2="360" y2="132" className={styles.gridline}/><line x1="0" y1="214" x2="360" y2="214" className={styles.gridline}/>
          <text x="0" y="18" className={styles.axis}>HEATING</text><text x="0" y="112" className={styles.axis}>STABLE</text><text x="0" y="238" className={styles.axis}>CHEAP</text>
          {points?<polyline points={points} className={styles.line}/>:null}
          {visible.length>1?<><line x1={cursorX} y1="0" x2={cursorX} y2="260" className={styles.cursor}/><circle cx={cursorX} cy={yFor(regime)} r="5" className={styles.dot}/></>:null}
        </svg>
        <div className={styles.chartNote}><small>{selected.name.toUpperCase()} · {date}</small><strong>{regime}</strong><p>{point?`Published ${regime} for this ${selected.name} date.`:selected.oneLiner}</p><span>{confidence} confidence</span></div>
      </div>
    </section>

    <div className={styles.editorial}>
      <section className={styles.section}>
        <h2>See the difference on one date.</h2>
        <p>Your own observation stays intact. Urd Atlas adds the network context beside it.</p>
        <div className={`${styles.record} ${contextOpen?styles.expanded:""}`}>
          <div className={styles.recordHead}><span>16 AUG</span><span>YOUR DATA</span></div>
          <div className={styles.recordMain}><div><small>Model error</small><strong>4.3%</strong></div><div><small>Chain</small><strong>BTC</strong></div></div>
          {contextOpen?<div className={styles.added}><div><small>Regime</small><strong>CHEAP</strong></div><div><small>Confidence</small><strong>92%</strong></div></div>:null}
        </div>
        <button className={styles.contextButton} onClick={()=>setContextOpen(v=>!v)}>{contextOpen?"Remove Urd Atlas context":"Add Urd Atlas context"}</button>
        <p className={styles.takeaway}>Now you know the anomaly happened while the network was in a different operating regime.</p>
      </section>

      <section className={styles.section} id="mobile-why">
        <h2>What you get every day.</h2><p>Three pieces of context that can be joined directly to your own chain-level data.</p>
        <div className={styles.benefits}>
          <div><strong>Network regime</strong><p>A compact classification of current operating conditions.</p><code>e.g. CHEAP · HEATING · CONGESTED · STABLE</code></div>
          <div><strong>Confidence</strong><p>How strongly the available evidence supports that published state.</p><code>e.g. 91% — evidence strength, not probability</code></div>
          <div><strong>Evidence + provenance</strong><p>The measurements, derived context and versioning behind the observation.</p><code>e.g. median_tx_fee_native · methodology_version</code></div>
        </div>
      </section>
    </div>

    <section className={styles.product} id="mobile-product">
      <p className={styles.productKicker}>One published observation</p>
      <h2>This is what you actually receive.</h2>
      <p className={styles.productIntro}>Urd Atlas publishes one classified observation for each supported chain and date, together with the data needed to inspect why it was published.</p>
      <div className={styles.deliveryMeta}><span>{selected.name.toUpperCase()}</span><span>{selected.asOf}</span></div>
      <button className={styles.deliveryToggle} onClick={()=>setLayersOpen(v=>!v)}>{layersOpen?"Hide file layers ↑":"Show file layers ↓"}</button>
      {layersOpen?<div className={styles.layers}>{artifacts.map((a,i)=><button key={a} onClick={()=>openArtifact(a)}><span>0{i+1}</span><span><strong>{artifactCopy[a].title}</strong><small>{artifactCopy[a].body}</small></span><em>Open JSON</em></button>)}</div>:null}
      <p className={styles.deliveryFoot}>The regime is the compact output. The four files let you inspect, reproduce and use the evidence behind it.</p>
    </section>

    <section className={styles.trust}>
      <p>— Provenance</p><h2>Built to be referenced, not silently revised.</h2>
      <div><article><strong>{consecutiveRows??"—"}</strong><span>Published Bitcoin days</span></article><article><strong>4 chains</strong><span>Bitcoin, Ethereum, Arbitrum, Base</span></article><article><strong>v{selected.methodologyVersion}</strong><span>Current methodology</span></article><article><strong>Versioned</strong><span>Corrections are disclosed rather than silently overwritten.</span></article></div>
    </section>

    <div className={styles.editorial}>
      <section className={styles.section}>
        <h2>How it enters your workflow.</h2>
        <div className={styles.steps}><div><span>01</span><p><strong>Measure</strong>Keep the metrics and models you already use.</p></div><div><span>02</span><p><strong>Classify</strong>Urd Atlas publishes the network state for the same chain and date.</p></div><div><span>03</span><p><strong>Join</strong>Add the observation beside your data using date + chain.</p></div></div>
      </section>

      <section className={styles.pricing} id="mobile-pricing">
        <h2>Simple coverage.</h2><p>The free sample is enough to test the join. Subscribe when you need daily coverage and history.</p>
        <div className={styles.plan}><h3>Free</h3><strong>$0</strong><p>Representative files for inspecting the schema.</p><a href="/api/v1/sample-pack">Inspect sample</a></div>
        <div className={`${styles.plan} ${styles.recommended}`}><h3>Basic</h3><strong>$49/mo</strong><p>One selected chain, daily delivery and 90 days of history.</p><form action="/api/v1/checkout?plan=basic" method="post"><button>Start Basic</button></form></div>
        <div className={styles.plan}><h3>Pro</h3><strong>$149/mo</strong><p>All four chains with the full published history.</p><form action="/api/v1/checkout?plan=pro" method="post"><button>Start Pro</button></form></div>
      </section>

      <section className={styles.details}>
        <h2>More detail when you want it.</h2>
        <details><summary>How the classification is produced <span>Expand</span></summary><p>Measurements are normalized against chain-relative baselines. Demand, friction and capacity are scored and confidence is gated.</p></details>
        <details><summary>Why confidence can be low <span>Expand</span></summary><p>Confidence measures evidence strength. Weak evidence can result in UNKNOWN / DEGRADED instead of an overstated claim.</p></details>
        <details><summary>What the subscription replaces <span>Expand</span></summary><p>Ingestion, normalization, baselines, derived features, confidence rules, testing, versioning and publication are maintained upstream.</p></details>
      </section>
    </div>

    <section className={styles.final}><h2>When the network changes, your data should know.</h2><p>Give each supported chain and date a network-state reference you can inspect and join.</p><a href="/api/v1/sample-pack">Inspect the sample</a></section>

    {statusOpen?<div className={styles.statusModal} onClick={()=>setStatusOpen(false)}><div onClick={e=>e.stopPropagation()}>
      <header><small>{selected.name.toUpperCase()} · {selected.asOf}</small><button onClick={()=>setStatusOpen(false)}>Close</button></header>
      <div className={styles.statusState}><strong>{selected.regime}</strong><span>{selected.confidence} confidence</span></div>
      <p>{selected.oneLiner}</p>
      <h4>What is driving this state</h4>
      {axisDetail(selected).map(([name,label,value])=><div className={styles.driver} key={name}><b>{name}</b><span>{label} · {value}</span></div>)}
      <p className={styles.confidenceCopy}>{confidenceCopy(selected)}</p>
      <a href="#mobile-product" onClick={()=>setStatusOpen(false)}>Inspect this observation</a>
    </div></div>:null}

    {jsonOpen?<div className={styles.jsonModal} onClick={()=>setJsonOpen(false)}><div onClick={e=>e.stopPropagation()}>
      <header><strong>{artifactCopy[artifact].title} · {selected.name}</strong><button onClick={()=>setJsonOpen(false)}>Close</button></header>
      <nav>{artifacts.map(a=><button key={a} className={a===artifact?styles.active:""} onClick={()=>setArtifact(a)}>{artifactCopy[a].title}</button>)}</nav>
      <pre>{JSON.stringify(selected.artifacts[artifact]??null,null,2)}</pre>
    </div></div>:null}

    <div className={styles.sticky}><div><strong>Basic — $49/mo</strong><span>one chain · 90 days included</span></div><form action="/api/v1/checkout?plan=basic" method="post"><button>Start now</button></form></div>
    <p className={styles.lastRun}>Last run: {lastRun}</p>
  </div>;
}
