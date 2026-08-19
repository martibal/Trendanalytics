import CheckoutRedirectGuard from "@/components/home/CheckoutRedirectGuard";
import InteractiveHomeDashboard, { type HomeChainSnapshot, type HomeLabel } from "@/components/home/InteractiveHomeDashboard";
import MobileHomeExperience from "@/components/home/MobileHomeExperience";
import styles from "@/components/home/MobileHomeExperience.module.css";
import type { HeroPanelSnapshot } from "@/components/home/HeroNetworkStatePanel";
import { readStorageObject } from "@/lib/storage";

export const revalidate = 0;

type ArtifactName = "Meta" | "Gold" | "Derived" | "Briefs";
type ScoreShape = number | { score?: number; label?: string } | undefined;
type MetaLatest = {
  chain?: string;
  date?: string;
  updated_through?: string;
  status?: { label?: string; one_liner?: string };
  regime?: { label?: string; asof_date?: string; demand_score?: number; friction_score?: number; capacity_score?: number };
  confidence?: { confidence_score?: number; data_quality_score?: number; label_confidence_score?: number };
  scorecard?: {
    demand?: ScoreShape;
    friction?: ScoreShape;
    capacity?: ScoreShape;
    dimensions?: {
      demand?: { score?: number; label?: string };
      friction?: { score?: number; label?: string };
      capacity?: { score?: number; label?: string };
    };
  };
  methodology_version?: string;
};
type DatasetJson = { published_at?: string; computed_at_utc?: string };

const CHAINS = [
  { id: "bitcoin", ticker: "BTC", name: "Bitcoin", lag: "T+1" },
  { id: "ethereum", ticker: "ETH", name: "Ethereum", lag: "T+1" },
  { id: "arbitrum", ticker: "ARB", name: "Arbitrum", lag: "T+7" },
  { id: "base", ticker: "BASE", name: "Base", lag: "T+7" },
] as const;

const DATASET_START_DATE = "2024-12-01";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function decode(buffer:ArrayBuffer){return new TextDecoder("utf-8").decode(new Uint8Array(buffer))}
async function readJson<T>(path:string):Promise<T|null>{
  try{
    const result=await readStorageObject(path);
    if(!result)return null;
    return JSON.parse(decode(result.body)) as T;
  }catch{return null}
}
function normalizeLabel(raw:string|undefined):HomeLabel{
  const value=(raw??"").toUpperCase();
  if(value==="STABLE"||value==="HEATING"||value==="CONGESTED"||value==="CHEAP")return value;
  return "UNKNOWN/DEGRADED";
}
function numberOrNull(value:unknown){return typeof value==="number"&&Number.isFinite(value)?value:null}
function scoreValue(value:ScoreShape){
  if(typeof value==="number"&&Number.isFinite(value))return value;
  return value&&typeof value==="object"?numberOrNull(value.score):null;
}
function score(row:MetaLatest,axis:"demand"|"friction"|"capacity"){
  if(axis==="demand")return numberOrNull(row.regime?.demand_score)??numberOrNull(row.scorecard?.dimensions?.demand?.score)??scoreValue(row.scorecard?.demand);
  if(axis==="friction")return numberOrNull(row.regime?.friction_score)??numberOrNull(row.scorecard?.dimensions?.friction?.score)??scoreValue(row.scorecard?.friction);
  return numberOrNull(row.regime?.capacity_score)??numberOrNull(row.scorecard?.dimensions?.capacity?.score)??scoreValue(row.scorecard?.capacity);
}
function pct(value:number|null){return value==null?"—":`${Math.round(value*100)}%`}
function formatDate(value:string|undefined){
  if(!value)return "—";
  const d=new Date(value.includes("T")?value:`${value}T00:00:00Z`);
  return Number.isNaN(d.getTime())?value:d.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"});
}
function dimensionLabel(value:string|undefined,fallback:string){
  if(!value)return fallback;
  return value.toLowerCase().split(/[_\s-]+/).filter(Boolean).map(part=>part[0].toUpperCase()+part.slice(1)).join(" ");
}
async function getArtifacts(chainId:string):Promise<Record<ArtifactName,unknown|null>>{
  const [Meta,Gold,Derived,Briefs]=await Promise.all([
    readJson<unknown>(`data/published/v1/meta/${chainId}/latest.json`),
    readJson<unknown>(`data/published/v1/gold/${chainId}/latest.json`),
    readJson<unknown>(`data/published/v1/derived/${chainId}/latest.json`),
    readJson<unknown>(`data/published/v1/briefs/chains/${chainId}/latest.json`),
  ]);
  return {Meta,Gold,Derived,Briefs};
}
async function getSnapshot(chain:(typeof CHAINS)[number]):Promise<HomeChainSnapshot>{
  const artifacts=await getArtifacts(chain.id);
  const meta=artifacts.Meta as MetaLatest|null;
  const regime=normalizeLabel(meta?.status?.label??meta?.regime?.label);
  const confidenceValue=numberOrNull(meta?.confidence?.confidence_score);
  const dimensions=meta?.scorecard?.dimensions;
  return {
    id:chain.id,ticker:chain.ticker,name:chain.name,lag:chain.lag,regime,
    confidence:pct(confidenceValue),confidenceValue,
    dataQuality:numberOrNull(meta?.confidence?.data_quality_score),
    labelConfidence:numberOrNull(meta?.confidence?.label_confidence_score),
    asOf:formatDate(meta?.date??meta?.updated_through??meta?.regime?.asof_date),
    oneLiner:meta?.status?.one_liner??`${chain.name} latest published network-state row is ${regime}.`,
    demand:numberOrNull(dimensions?.demand?.score)??score(meta??{},"demand"),
    demandLabel:dimensionLabel(dimensions?.demand?.label,"Demand context"),
    friction:numberOrNull(dimensions?.friction?.score)??score(meta??{},"friction"),
    frictionLabel:dimensionLabel(dimensions?.friction?.label,"Friction context"),
    capacity:numberOrNull(dimensions?.capacity?.score)??score(meta??{},"capacity"),
    capacityLabel:dimensionLabel(dimensions?.capacity?.label,"Capacity context"),
    methodologyVersion:meta?.methodology_version??"—",
    artifacts,
  };
}
async function getLastRun(){
  const dataset=await readJson<DatasetJson>("data/published/v1/dataset.json");
  return formatDate(dataset?.published_at??dataset?.computed_at_utc);
}
async function getHeroSnapshot():Promise<HeroPanelSnapshot>{
  const latest=await readJson<MetaLatest>("data/published/v1/meta/bitcoin/latest.json");
  const raw=latest?.date??latest?.updated_through??latest?.regime?.asof_date;
  const start=new Date(`${DATASET_START_DATE}T00:00:00Z`);
  const end=raw?new Date(raw.includes("T")?raw:`${raw}T00:00:00Z`):null;
  const consecutiveRows=end&&!Number.isNaN(end.getTime())?Math.floor((end.getTime()-start.getTime())/ONE_DAY_MS)+1:null;
  const version=latest?.methodology_version?.trim();
  return {
    consecutiveRows,
    firstPublishedLabel:formatDate(DATASET_START_DATE),
    methodologyVersionLabel:version?(version.startsWith("v")?version:`v${version}`):null,
  };
}

export default async function HomePage(){
  const [snapshots,lastRun,heroSnapshot]=await Promise.all([
    Promise.all(CHAINS.map(getSnapshot)),
    getLastRun(),
    getHeroSnapshot(),
  ]);
  return <>
    <CheckoutRedirectGuard />
    <MobileHomeExperience snapshots={snapshots} lastRun={lastRun} consecutiveRows={heroSnapshot.consecutiveRows} />
    <div className={styles.desktopOnly}>
      <InteractiveHomeDashboard snapshots={snapshots} lastRun={lastRun} examples={{high:null,low:null}} heroSnapshot={heroSnapshot}/>
    </div>
  </>;
}
