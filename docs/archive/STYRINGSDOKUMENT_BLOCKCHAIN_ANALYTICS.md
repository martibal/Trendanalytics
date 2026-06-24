









# STYRINGSDOKUMENT: Prisagnostisk Blockchain Trendanalyseverktøy

**Versjon:** 1.0  
**Dato:** 31. januar 2026  
**Formål:** Retningslinjer for utvikling av profesjonelt analyseverktøy for Bitcoin, Ethereum, Arbitrum og Base

---

## EXECUTIVE SUMMARY

Dette dokumentet definerer tekniske, visuelle og funksjonelle krav for utvikling av en prisagnostisk blockchain-analyseplattform. Systemet skal tilby institusjonell kvalitet på trendanalyse med pedagogisk tilnærming, basert på omfattende on-chain metrikkdata fra fire blockchain-nettverk.

**Målgrupper:**
- Kryptoinvestorer (fra nybegynner til institusjonell)
- Statistikere og data scientists
- Blockchain-analytikere
- Utviklerteam (web, data engineering, statistikk)

**Kjerneprinsipp:** Lang sikt, pedagogikk, bakenforliggende metrikkforståelse - ikke pris, ikke kortsiktige spekulasjoner.

---

## DEL 1: TEKNISK INFRASTRUKTUR OG KOMPATIBILITET

### 1.1 Obligatorisk Utviklingsmiljø

#### 1.1.1 Operativsystem og Base Dependencies

**Windows-utviklere:**
```powershell
# Installer WSL2 (Windows Subsystem for Linux)
wsl --install -d Ubuntu-22.04

# Installer Node.js via nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20.11.0
nvm use 20.11.0

# Installer Python via pyenv
curl https://pyenv.run | bash
pyenv install 3.11.7
pyenv global 3.11.7
```

**macOS-utviklere:**
```bash
# Installer Homebrew hvis ikke allerede installert
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node.js via nvm
brew install nvm
nvm install 20.11.0
nvm use 20.11.0

# Python via pyenv
brew install pyenv
pyenv install 3.11.7
pyenv global 3.11.7
```

**Linux-utviklere:**
```bash
# Node.js via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20.11.0
nvm use 20.11.0

# Python via pyenv
curl https://pyenv.run | bash
pyenv install 3.11.7
pyenv global 3.11.7
```

#### 1.1.2 Låste Versjoner (KRITISK)

**ALLE UTVIKLERE MÅ BRUKE DISSE EKSAKTE VERSJONENE:**

```json
{
  "node": "20.11.0",
  "npm": "10.2.4",
  "python": "3.11.7",
  "typescript": "5.3.3"
}
```

**Begrunnelse for Node 20.11.0:**
- Next.js 14+ krever Node 18.17+
- Node 20 LTS sikrer lang support-periode
- Unngår tidligere problemer med Next.js og Node kompatibilitet

### 1.2 Frontend Stack (OBLIGATORISK)

```json
{
  "framework": "Next.js 14.1.0",
  "runtime": "React 18.2.0",
  "typescript": "5.3.3",
  "styling": "Tailwind CSS 3.4.1",
  "charts": "Recharts 2.10.3",
  "data-fetching": "SWR 2.2.4",
  "state": "Zustand 4.5.0"
}
```

**Struktur:**
```
web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx           # Landing page
│   │   ├── chains/
│   │   │   └── [chain]/
│   │   │       └── page.tsx   # Chain detail page
│   │   ├── methodology/
│   │   │   └── page.tsx       # Advanced methodology page
│   │   └── layout.tsx
│   ├── components/
│   │   ├── charts/            # Alle chart-komponenter
│   │   ├── info-boxes/        # Basic/Advanced info-bokser
│   │   ├── regime-cards/      # Regime visualisering
│   │   └── layout/            # Header, footer, nav
│   ├── lib/
│   │   ├── api/               # API calls og data fetching
│   │   ├── types/             # TypeScript types
│   │   ├── utils/             # Helper functions
│   │   └── registry/          # Metric registry (chain-specific)
│   ├── styles/
│   │   └── globals.css
│   └── config/
│       └── chains.ts          # Chain configurations
├── public/
│   └── data/
│       └── published/
│           └── v1/            # JSON files served statically
│               ├── dataset.json
│               └── gold/
│                   ├── ethereum/
│                   │   ├── latest.json
│                   │   └── last365d.json
│                   ├── bitcoin/
│                   ├── arbitrum/
│                   └── base/
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### 1.3 Backend/Data Pipeline Stack

```python
# requirements.txt
pandas==2.1.4
polars==0.20.2
fastapi==0.109.0
uvicorn==0.27.0
boto3==1.34.23
pyarrow==14.0.2
```

**Eksisterende pipeline-struktur (BEVAR):**
```
pipeline/
├── src/
│   ├── feature_daily_agg.py      # Daglig feature aggregering
│   ├── build_gold_timeseries.py  # Gold timeseries bygging
│   └── build_gold_weekly.py      # Ukentlig aggregering
├── tools/
│   ├── publish_artifacts.py      # Publisering til JSON
│   ├── export_meta_json.py       # Meta JSON export
│   └── validate_published_dataset.py
└── _work/
    └── prod/
        ├── gold_weekly/          # Weekly parquet files
        └── features_agg/         # Daily feature files
```

### 1.4 Deployment Strategi

**Anbefalt: Vercel (Frontend) + AWS S3 (Data)**

**Hvorfor Vercel:**
- Null-konfigurasjon Next.js deployment
- Automatisk edge caching
- Ingen server-administrasjon
- Built-in CI/CD med GitHub integration
- Gratis tier for prototype, skalerer enkelt

**Data Pipeline (AWS):**
```
AWS Architecture:
├── S3 Buckets:
│   ├── raw-data/              # Innkommende blockchain data
│   ├── processed/gold/        # Gold timeseries (Parquet)
│   ├── processed/meta/        # Meta JSON files
│   └── public/published/      # Publiserte JSON for frontend
├── Lambda Functions:
│   ├── daily-aggregator       # Kjører feature_daily_agg.py
│   ├── gold-builder           # Kjører build_gold_timeseries.py
│   └── json-publisher         # Kjører publish_artifacts.py
└── CloudWatch Events:         # Scheduler (daglig kjøring)
```

**Alternativ (Full cloud-native):**
- **Vercel** (frontend)
- **Vercel Blob Storage** (JSON files)
- **GitHub Actions** (data pipeline)

### 1.5 Første Dag Setup Checklist

**DAG 1 - OBLIGATORISK FOR ALLE UTVIKLERE:**

```bash
# 1. Klon repository
git clone <repository-url>
cd blockchain-analytics

# 2. Installer backend dependencies
cd api
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 3. Installer frontend dependencies
cd ../web
npm install

# 4. Verifiser at JSON files er tilgjengelig
npm run verify-data

# 5. Kjør local dev servers
# Terminal 1:
cd api && uvicorn main:app --reload

# Terminal 2:
cd web && npm run dev

# 6. Test at data laster
curl http://localhost:3000/api/health
curl http://localhost:3000/data/published/v1/dataset.json
```

**Forventet resultat:**
- ✅ Begge servere kjører uten errors
- ✅ Alle JSON files leses korrekt
- ✅ Landing page viser data for alle fire chains
- ✅ Ingen TypeScript eller ESLint errors

---

## DEL 2: DATA ARKITEKTUR OG JSON STRUKTUR

### 2.1 Data Flow Overview

```
AWS S3 (Blockchain Raw Data)
    ↓
[Pipeline: feature_daily_agg.py]
    ↓
Parquet Files (per chain, per day)
    ↓
[Pipeline: build_gold_timeseries.py]
    ↓
Gold Timeseries (Parquet)
    ↓
[Pipeline: publish_artifacts.py]
    ↓
Published JSON Files
    ↓
Frontend (via static serving)
    ↓
User Browser
```

### 2.2 JSON File Struktur (GOLD Data)

#### 2.2.1 dataset.json (Master Metadata)
```json
{
  "dataset_id": "css_gold_v1",
  "revision_id": 42,
  "computed_at_utc": "2026-01-31T12:00:00Z",
  "windows_supported": [30, 90, 180, 365],
  "supported_chains": ["bitcoin", "ethereum", "arbitrum", "base"],
  "notes": [
    "BTC does not have EVM gas metrics",
    "L2s use different capacity models"
  ]
}
```

#### 2.2.2 gold/{chain}/latest.json
```json
{
  "chain": "ethereum",
  "date": "2026-01-30",
  "tx_count_daily": 1234567,
  "block_count_daily": 7200,
  "value_transferred_native": 12345.67,
  "median_tx_value_native": 0.15,
  "median_tx_fee_native": 0.0012,
  "failed_tx_rate": 0.05,
  "gas_utilization_pct": 72.5,
  "unique_active_addresses": 456789,
  "avg_block_time_sec": 12.1,
  
  // Ethereum-specific (EIP-1559)
  "median_base_fee_gwei": 25.3,
  "median_priority_fee_gwei": 1.2,
  
  // Derived metrics
  "tx_growth_7d": 0.05,
  "fee_percentile_90d": 67.8,
  "network_utilization_z_score": 1.2
}
```

#### 2.2.3 gold/{chain}/last365d.json
```json
[
  {
    "chain": "ethereum",
    "date": "2025-01-31",
    "tx_count_daily": 1200000,
    // ... all metrics
  },
  {
    "chain": "ethereum",
    "date": "2025-02-01",
    "tx_count_daily": 1210000,
    // ... all metrics
  }
  // ... 365 rows
]
```

### 2.3 Chain-Specific Metric Registry

**KRITISK: Hver chain har ulike metrikkdefinisjoner**

```typescript
// lib/registry/chains.ts

type Chain = "bitcoin" | "ethereum" | "arbitrum" | "base";

interface MetricDefinition {
  key: string;
  title: string;
  unit: "count" | "native" | "pct" | "sec";
  basic: string;      // Basic explanation
  advanced: string;   // Advanced/methodological explanation
  applicableTo: Chain[];
  format?: {
    decimals?: number;
    prefix?: string;
    suffix?: string;
  };
}

export const METRIC_REGISTRY: Record<string, MetricDefinition> = {
  "tx_count_daily": {
    key: "tx_count_daily",
    title: "Daily Transactions",
    unit: "count",
    basic: "Totalt antall transaksjoner per dag på nettverket.",
    advanced: "Aggregert sum av confirmerte transaksjoner per UTC-dag. Ekskluderer failed transactions i BTC (non-standard), inkluderer i EVM chains.",
    applicableTo: ["bitcoin", "ethereum", "arbitrum", "base"],
    format: { decimals: 0 }
  },
  
  "gas_utilization_pct": {
    key: "gas_utilization_pct",
    title: "Gas Utilization",
    unit: "pct",
    basic: "Hvor mye av nettverkets kapasitet som brukes (0-100%).",
    advanced: "Daglig median av (gas_used / gas_limit) per block. Høy utilization (>80%) indikerer kapasitetsbegrensninger.",
    applicableTo: ["ethereum"], // NOT Bitcoin, special handling for L2s
    format: { decimals: 1, suffix: "%" }
  },
  
  "median_tx_fee_native": {
    key: "median_tx_fee_native",
    title: {
      bitcoin: "Median Fee (sat)",
      ethereum: "Median Fee (ETH)",
      arbitrum: "Median Fee (ETH on Arbitrum)",
      base: "Median Fee (ETH on Base)"
    },
    unit: "native",
    basic: {
      bitcoin: "Median transaksjonskostnad i satoshis.",
      ethereum: "Median transaksjonskostnad i ETH (base + priority fee).",
      arbitrum: "Median L2 transaksjonskostnad i ETH.",
      base: "Median L2 transaksjonskostnad i ETH."
    },
    advanced: {
      bitcoin: "Median av total_fee per tranaksjon (satoshis). Reflekterer fee market dynamics uten price-framing.",
      ethereum: "Post-EIP1559: median(base_fee + priority_fee) * gas_used, uttrykt i ETH.",
      arbitrum: "L2 fee structure: median av (L2_execution_fee + L1_data_fee).",
      base: "L2 fee structure: median av (L2_execution_fee + L1_data_fee)."
    },
    applicableTo: ["bitcoin", "ethereum", "arbitrum", "base"]
  }
  
  // ... 20+ additional metrics
};

// Chain-specific metric filtering
export function getVisibleMetrics(chain: Chain): MetricDefinition[] {
  return Object.values(METRIC_REGISTRY)
    .filter(m => m.applicableTo.includes(chain));
}

export function getMetricExplanation(
  chain: Chain, 
  metricKey: string, 
  level: "basic" | "advanced"
): string {
  const metric = METRIC_REGISTRY[metricKey];
  if (!metric) return "";
  
  const explanation = metric[level];
  if (typeof explanation === "string") return explanation;
  if (typeof explanation === "object") return explanation[chain];
  return "";
}
```

### 2.4 Data Validation Requirements

**Frontend må validere HVER JSON load:**

```typescript
// lib/api/validation.ts

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export async function validateDatasetJson(
  url: string
): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      result.valid = false;
      result.errors.push(`HTTP ${response.status}: Failed to fetch dataset.json`);
      return result;
    }
    
    const data = await response.json();
    
    // Required fields
    if (!data.dataset_id) {
      result.errors.push("Missing dataset_id");
      result.valid = false;
    }
    
    if (!data.revision_id) {
      result.errors.push("Missing revision_id");
      result.valid = false;
    }
    
    if (!Array.isArray(data.supported_chains)) {
      result.errors.push("supported_chains must be array");
      result.valid = false;
    }
    
    // Check freshness
    if (data.computed_at_utc) {
      const computedAt = new Date(data.computed_at_utc);
      const now = new Date();
      const ageHours = (now.getTime() - computedAt.getTime()) / (1000 * 60 * 60);
      
      if (ageHours > 48) {
        result.warnings.push(
          `Dataset is ${ageHours.toFixed(1)} hours old (>48h threshold)`
        );
      }
    }
    
    return result;
    
  } catch (error) {
    result.valid = false;
    result.errors.push(`Exception: ${error.message}`);
    return result;
  }
}

export async function validateGoldLatest(
  chain: Chain,
  url: string
): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      result.valid = false;
      result.errors.push(`HTTP ${response.status}: Failed to fetch ${chain}/latest.json`);
      return result;
    }
    
    const data = await response.json();
    
    // Required fields for all chains
    const requiredFields = [
      "chain",
      "date",
      "tx_count_daily",
      "median_tx_fee_native",
      "unique_active_addresses"
    ];
    
    for (const field of requiredFields) {
      if (!(field in data)) {
        result.errors.push(`Missing required field: ${field}`);
        result.valid = false;
      }
    }
    
    // Chain-specific validation
    if (chain === "ethereum") {
      if (!("gas_utilization_pct" in data)) {
        result.errors.push("Ethereum must have gas_utilization_pct");
        result.valid = false;
      }
    }
    
    if (chain === "bitcoin") {
      if ("gas_utilization_pct" in data) {
        result.warnings.push("Bitcoin should not have gas_utilization_pct");
      }
    }
    
    // Value range checks
    if (data.failed_tx_rate && (data.failed_tx_rate < 0 || data.failed_tx_rate > 1)) {
      result.errors.push("failed_tx_rate must be in [0, 1]");
      result.valid = false;
    }
    
    return result;
    
  } catch (error) {
    result.valid = false;
    result.errors.push(`Exception: ${error.message}`);
    return result;
  }
}
```

**Obligatorisk startup validation:**

```typescript
// app/layout.tsx eller _app.tsx

useEffect(() => {
  async function validateAllData() {
    console.log("🔍 Validating all data sources...");
    
    // 1. Validate dataset.json
    const datasetResult = await validateDatasetJson(
      "/data/published/v1/dataset.json"
    );
    
    if (!datasetResult.valid) {
      console.error("❌ Dataset validation failed:", datasetResult.errors);
      // Show error modal to user
      return;
    }
    
    console.log("✅ dataset.json valid");
    
    // 2. Validate each chain's latest.json
    for (const chain of ["bitcoin", "ethereum", "arbitrum", "base"]) {
      const latestResult = await validateGoldLatest(
        chain,
        `/data/published/v1/gold/${chain}/latest.json`
      );
      
      if (!latestResult.valid) {
        console.error(`❌ ${chain}/latest.json validation failed:`, latestResult.errors);
        return;
      }
      
      if (latestResult.warnings.length > 0) {
        console.warn(`⚠️ ${chain}/latest.json warnings:`, latestResult.warnings);
      }
      
      console.log(`✅ ${chain}/latest.json valid`);
    }
    
    console.log("🎉 All data sources validated successfully");
  }
  
  validateAllData();
}, []);
```

---

## DEL 3: VISUELL IDENTITET OG UX PRINSIPPER

### 3.1 Design Philosophy

**Kjerneprinsipper:**
1. **Profesjonalitet over trendy:** Tidløs, institusjonell æstetikk
2. **Data-tetthet med klarhet:** Mye informasjon, null clutter
3. **Progressiv avsløring:** Basic → Advanced uten å skjule kompleksitet
4. **Pedagogisk framfor teknisk:** Forklare først, tekniske detaljer på forespørsel

### 3.2 Color Palette (OBLIGATORISK)

```css
/* globals.css */
:root {
  /* Primary - Professional Blues */
  --color-primary: #0A2540;        /* Deep navy - headers, primary text */
  --color-primary-light: #1E3A5F;  /* Lighter navy - hover states */
  --color-primary-dark: #051422;   /* Darkest - backgrounds */
  
  /* Secondary - Accent Colors (chain-specific) */
  --color-bitcoin: #F7931A;        /* Bitcoin orange */
  --color-ethereum: #627EEA;       /* Ethereum purple-blue */
  --color-arbitrum: #28A0F0;       /* Arbitrum blue */
  --color-base: #0052FF;           /* Base blue */
  
  /* Data Visualization */
  --color-positive: #10B981;       /* Green - growth, high utilization */
  --color-negative: #EF4444;       /* Red - decline, congestion */
  --color-neutral: #6B7280;        /* Gray - stable, normal */
  --color-warning: #F59E0B;        /* Amber - attention needed */
  
  /* Regime Colors */
  --color-regime-stable: #10B981;
  --color-regime-heating: #F59E0B;
  --color-regime-congested: #EF4444;
  --color-regime-cheap: #3B82F6;
  
  /* UI Elements */
  --color-background: #FFFFFF;
  --color-surface: #F9FAFB;
  --color-surface-elevated: #FFFFFF;
  --color-border: #E5E7EB;
  --color-border-strong: #D1D5DB;
  
  /* Text */
  --color-text-primary: #111827;
  --color-text-secondary: #6B7280;
  --color-text-tertiary: #9CA3AF;
  
  /* Charts */
  --chart-line-primary: #0A2540;
  --chart-line-secondary: #627EEA;
  --chart-area-fill: rgba(98, 126, 234, 0.1);
  --chart-grid: #E5E7EB;
}

/* Dark mode (optional, men anbefalt) */
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: #0A0E1A;
    --color-surface: #131823;
    --color-surface-elevated: #1E2432;
    --color-border: #2A3142;
    --color-border-strong: #3D4657;
    --color-text-primary: #F9FAFB;
    --color-text-secondary: #D1D5DB;
    --color-text-tertiary: #9CA3AF;
  }
}
```

### 3.3 Typography System

```css
/* globals.css */

/* Font imports */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  /* Font families */
  --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Courier New', monospace;
  
  /* Font sizes - Modular scale (1.25 ratio) */
  --text-xs: 0.75rem;      /* 12px - labels, captions */
  --text-sm: 0.875rem;     /* 14px - secondary text */
  --text-base: 1rem;       /* 16px - body text */
  --text-lg: 1.125rem;     /* 18px - emphasized text */
  --text-xl: 1.25rem;      /* 20px - section titles */
  --text-2xl: 1.5rem;      /* 24px - card titles */
  --text-3xl: 1.875rem;    /* 30px - page titles */
  --text-4xl: 2.25rem;     /* 36px - hero titles */
  
  /* Line heights */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;
  
  /* Font weights */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
}

/* Utility classes */
.text-mono {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}

.text-data {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-size: var(--text-base);
  font-weight: var(--font-medium);
}
```

### 3.4 Layout Grid System

```typescript
// components/layout/Container.tsx

export function Container({ 
  children, 
  size = "default" 
}: { 
  children: React.ReactNode;
  size?: "narrow" | "default" | "wide" | "full";
}) {
  const maxWidths = {
    narrow: "max-w-4xl",   // 896px - metodologi, lange tekster
    default: "max-w-6xl",  // 1152px - standard pages
    wide: "max-w-7xl",     // 1280px - landing page, dashboards
    full: "max-w-full"     // Full width - data tables
  };
  
  return (
    <div className={`mx-auto px-4 sm:px-6 lg:px-8 ${maxWidths[size]}`}>
      {children}
    </div>
  );
}

// Responsive grid
export function Grid({ 
  children, 
  cols = { sm: 1, md: 2, lg: 3 } 
}: {
  children: React.ReactNode;
  cols?: { sm: number; md: number; lg: number };
}) {
  return (
    <div className={`
      grid
      grid-cols-${cols.sm}
      md:grid-cols-${cols.md}
      lg:grid-cols-${cols.lg}
      gap-4 md:gap-6 lg:gap-8
    `}>
      {children}
    </div>
  );
}
```

### 3.5 Component Library - Info Boxes

**KRITISK KOMPONENT: Basic/Advanced Toggle**

```typescript
// components/info-boxes/MetricInfo.tsx

import { useState } from "react";
import { Info, ChevronDown } from "lucide-react";

interface MetricInfoProps {
  metricKey: string;
  chain: Chain;
  basicText: string;
  advancedText: string;
  methodology?: {
    dataSource: string;
    aggregation: string;
    formula?: string;
    caveats?: string[];
  };
}

export function MetricInfo({
  metricKey,
  chain,
  basicText,
  advancedText,
  methodology
}: MetricInfoProps) {
  const [level, setLevel] = useState<"basic" | "advanced">("basic");
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative inline-block">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          inline-flex items-center gap-1
          text-sm text-text-secondary hover:text-text-primary
          transition-colors
        "
        aria-label={`Info om ${metricKey}`}
      >
        <Info size={16} />
      </button>
      
      {/* Popover */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Content */}
          <div className="
            absolute z-50
            mt-2 w-96
            rounded-lg border border-border
            bg-surface-elevated
            shadow-xl
            p-4
          ">
            {/* Toggle buttons */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setLevel("basic")}
                className={`
                  flex-1 px-3 py-1.5 rounded-md text-sm font-medium
                  transition-colors
                  ${level === "basic"
                    ? "bg-primary text-white"
                    : "bg-surface hover:bg-border text-text-secondary"
                  }
                `}
              >
                Basic
              </button>
              <button
                onClick={() => setLevel("advanced")}
                className={`
                  flex-1 px-3 py-1.5 rounded-md text-sm font-medium
                  transition-colors
                  ${level === "advanced"
                    ? "bg-primary text-white"
                    : "bg-surface hover:bg-border text-text-secondary"
                  }
                `}
              >
                Advanced
              </button>
            </div>
            
            {/* Content */}
            <div className="text-sm text-text-primary leading-relaxed">
              {level === "basic" ? (
                <p>{basicText}</p>
              ) : (
                <div className="space-y-3">
                  <p>{advancedText}</p>
                  
                  {methodology && (
                    <div className="
                      mt-4 pt-4 border-t border-border
                      space-y-2
                    ">
                      <div>
                        <span className="font-semibold">Data source:</span>
                        <span className="text-mono text-xs ml-2">
                          {methodology.dataSource}
                        </span>
                      </div>
                      
                      <div>
                        <span className="font-semibold">Aggregation:</span>
                        <p className="text-text-secondary mt-1">
                          {methodology.aggregation}
                        </p>
                      </div>
                      
                      {methodology.formula && (
                        <div>
                          <span className="font-semibold">Formula:</span>
                          <code className="
                            block mt-1 p-2 
                            bg-surface rounded
                            text-mono text-xs
                          ">
                            {methodology.formula}
                          </code>
                        </div>
                      )}
                      
                      {methodology.caveats && (
                        <div>
                          <span className="font-semibold">Caveats:</span>
                          <ul className="list-disc list-inside mt-1 space-y-1 text-text-secondary">
                            {methodology.caveats.map((caveat, i) => (
                              <li key={i}>{caveat}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Chain-specific note */}
            <div className="
              mt-3 pt-3 border-t border-border
              text-xs text-text-tertiary
            ">
              <span className="font-semibold">Chain context:</span> {chain}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

### 3.6 Chart Styling Standards

```typescript
// components/charts/BaseChart.tsx

import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from "recharts";

const CHART_CONFIG = {
  margins: { top: 10, right: 30, left: 0, bottom: 0 },
  
  grid: {
    strokeDasharray: "3 3",
    stroke: "var(--chart-grid)",
    opacity: 0.5
  },
  
  xAxis: {
    stroke: "var(--color-text-tertiary)",
    tick: { 
      fill: "var(--color-text-secondary)",
      fontSize: 12
    },
    tickLine: { stroke: "var(--chart-grid)" }
  },
  
  yAxis: {
    stroke: "var(--color-text-tertiary)",
    tick: {
      fill: "var(--color-text-secondary)",
      fontSize: 12
    },
    tickLine: { stroke: "var(--chart-grid)" },
    width: 60
  },
  
  tooltip: {
    contentStyle: {
      backgroundColor: "var(--color-surface-elevated)",
      border: "1px solid var(--color-border)",
      borderRadius: "8px",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
    },
    labelStyle: {
      color: "var(--color-text-primary)",
      fontWeight: 600
    }
  }
};

export function MetricTimeSeriesChart({
  data,
  metricKey,
  title
}: {
  data: Array<{ date: string; value: number }>;
  metricKey: string;
  title: string;
}) {
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={CHART_CONFIG.margins}>
          <CartesianGrid {...CHART_CONFIG.grid} />
          <XAxis 
            dataKey="date"
            {...CHART_CONFIG.xAxis}
          />
          <YAxis {...CHART_CONFIG.yAxis} />
          <Tooltip {...CHART_CONFIG.tooltip} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--chart-line-primary)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

---

## DEL 4: SIDE-ARKITEKTUR OG INNHOLD

### 4.1 Landing Page (/)

**Formål:** Gi umiddelbar oversikt over alle fire chains med nøkkelmetrikkene

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ HEADER                                          │
│  - Logo                                         │
│  - Navigation: [Chains] [Methodology] [API]    │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ HERO SECTION                                    │
│  "Prisagnostisk Blockchain Trendanalyse"       │
│  "Lang sikt. Pedagogisk. Metrikkbasert."       │
└─────────────────────────────────────────────────┘

┌──────────┬──────────┬──────────┬──────────┐
│ Bitcoin  │ Ethereum │ Arbitrum │   Base   │
├──────────┼──────────┼──────────┼──────────┤
│ • Latest │ • Latest │ • Latest │ • Latest │
│   Value  │   Value  │   Value  │   Value  │
│ • 7d Δ   │ • 7d Δ   │ • 7d Δ   │ • 7d Δ   │
│ • Regime │ • Regime │ • Regime │ • Regime │
│ • Status │ • Status │ • Status │ • Status │
│          │          │          │          │
│ [Detalj] │ [Detalj] │ [Detalj] │ [Detalj] │
└──────────┴──────────┴──────────┴──────────┘

┌─────────────────────────────────────────────────┐
│ KEY INSIGHTS SECTION                            │
│  - Most notable trends across all chains        │
│  - Regime shifts in last 7 days                 │
│  - Data freshness indicator                     │
└─────────────────────────────────────────────────┘
```

**Kode-struktur:**
```typescript
// app/page.tsx

export default async function LandingPage() {
  // Server-side data fetching
  const dataset = await fetchDataset();
  const chainsData = await Promise.all(
    CHAINS.map(chain => fetchChainLatest(chain))
  );
  
  return (
    <Container size="wide">
      <Hero />
      
      <section className="mt-12">
        <h2 className="text-3xl font-bold mb-8">
          Oversikt per Kjede
        </h2>
        
        <Grid cols={{ sm: 1, md: 2, lg: 4 }}>
          {chainsData.map(data => (
            <ChainCard
              key={data.chain}
              chain={data.chain}
              data={data}
            />
          ))}
        </Grid>
      </section>
      
      <KeyInsights data={chainsData} />
      
      <DataFreshness dataset={dataset} />
    </Container>
  );
}
```

**ChainCard Component:**
```typescript
// components/landing/ChainCard.tsx

function ChainCard({ chain, data }: { chain: Chain; data: GoldLatest }) {
  const regime = computeRegimeLabel(data);
  const color = CHAIN_COLORS[chain];
  
  return (
    <Link
      href={`/chains/${chain}`}
      className="
        block p-6 rounded-xl border border-border
        bg-surface hover:bg-surface-elevated
        transition-all duration-200
        hover:shadow-lg
      "
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold capitalize">
          {chain}
        </h3>
        <div 
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      
      {/* Key metrics */}
      <div className="space-y-3">
        <MetricDisplay
          label="Daily Transactions"
          value={data.tx_count_daily}
          format="number"
          change7d={data.tx_growth_7d}
        />
        
        <MetricDisplay
          label="Median Fee"
          value={data.median_tx_fee_native}
          format="native"
          unit={getNativeUnit(chain)}
        />
        
        <MetricDisplay
          label="Active Addresses"
          value={data.unique_active_addresses}
          format="number"
        />
      </div>
      
      {/* Regime indicator */}
      <div className="mt-4 pt-4 border-t border-border">
        <RegimeBadge regime={regime} />
      </div>
      
      {/* CTA */}
      <div className="mt-4 text-sm text-primary font-medium">
        Se detaljer →
      </div>
    </Link>
  );
}
```

### 4.2 Chain Detail Page (/chains/[chain])

**Formål:** Dyptgående analyse av én spesifikk chain

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ BREADCRUMB: Home > Bitcoin                      │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ CHAIN HEADER                                    │
│  Bitcoin                                        │
│  "Proof-of-Work. Limited supply. Pristine..."  │
│  [Basic] [Advanced] toggle                     │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ CURRENT STATE SUMMARY                           │
│  ┌──────────┬──────────┬──────────┐           │
│  │  Latest  │ 7d Trend │  Regime  │           │
│  └──────────┴──────────┴──────────┘           │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ KEY METRICS GRID (with time series charts)     │
│  ┌─────────────────┬─────────────────┐        │
│  │ Transactions    │ Fees            │        │
│  │ [Chart]         │ [Chart]         │        │
│  │ [ℹ️ Info]        │ [ℹ️ Info]        │        │
│  └─────────────────┴─────────────────┘        │
│  ┌─────────────────┬─────────────────┐        │
│  │ Active Address  │ Block Time      │        │
│  │ [Chart]         │ [Chart]         │        │
│  │ [ℹ️ Info]        │ [ℹ️ Info]        │        │
│  └─────────────────┴─────────────────┘        │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ REGIME ANALYSIS                                 │
│  - Current regime: STABLE                       │
│  - Duration: 14 weeks                           │
│  - Key drivers: [list]                          │
│  - Historical context chart                     │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ ANALOGOUS PERIODS (if available)                │
│  "Current conditions are similar to..."         │
│  - Historical analog matches                    │
│  - Forward-looking statistics                   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ DATA QUALITY INDICATORS                         │
│  - Freshness: ✅ Updated 2 hours ago            │
│  - Coverage: ✅ 365 days complete               │
│  - Confidence: ✅ High (all metrics valid)      │
└─────────────────────────────────────────────────┘
```

**Chain-Specific Interpretations:**

```typescript
// config/chains.ts

export const CHAIN_INTERPRETATIONS = {
  bitcoin: {
    basic: `Bitcoin er den første og mest etablerte blockchain. 
    Den bruker Proof-of-Work konsensus og har et begrenset tilbud på 21 millioner mynter. 
    Metrikkene vi fokuserer på reflekterer nettverkets sikkerhet, brukeradopsjon og fee-marked dynamikk.`,
    
    advanced: `Bitcoin's arkitektur prioriterer desentralisering og sikkerhet over throughput. 
    Transaksjonsvolum er begrenset av blokk-størrelse (typisk ~2000-3000 tx/block post-SegWit). 
    Fee-markedet er et Dutch auction hvor brukere byr på block space. 
    Utilization er ikke direkte målbart (ingen gas limit), så vi bruker fee levels og block time som proxies for demand vs capacity.
    
    Viktige metrikkforskjeller fra EVM chains:
    - Ingen "gas utilization" (ingen dynamisk gas limit)
    - Fees i satoshis (ikke Gwei)
    - Block time target: 10 minutter (justeres hver 2016 blocks)
    - UTXO model vs account model`,
    
    keyMetrics: [
      "tx_count_daily",
      "median_tx_fee_native",
      "avg_block_time_sec",
      "unique_active_addresses",
      "value_transferred_native"
    ],
    
    hiddenMetrics: [
      "gas_utilization_pct",
      "failed_tx_rate",
      "median_base_fee_gwei"
    ]
  },
  
  ethereum: {
    basic: `Ethereum er den ledende smart contract-plattformen. 
    Den bruker Proof-of-Stake konsensus (etter The Merge i 2022) og støtter komplekse applikasjoner. 
    Vi måler både nettverksaktivitet og kapasitetsutnyttelse (gas utilization).`,
    
    advanced: `Post-EIP1559 (August 2021), Ethereum bruker en base fee + priority fee mekanisme. 
    Base fee brenner ETH (deflationary pressure), mens priority fee går til validators. 
    Gas utilization target er 50% (15M gas/block), med max 30M gas/block.
    
    Viktige metrikkdefinisjoner:
    - gas_utilization_pct = (gas_used / gas_limit) * 100
    - median_tx_fee_native = (base_fee + priority_fee) * gas_used, i ETH
    - failed_tx_rate inkluderer reverted transactions (fortsatt bruker gas)
    
    Post-Merge:
    - Block time: ~12 sekunder (veldig stabilt)
    - 32 slots per epoch, 12 sekunder per slot
    - Finality: 2 epochs (~12.8 minutter)`,
    
    keyMetrics: [
      "tx_count_daily",
      "gas_utilization_pct",
      "median_tx_fee_native",
      "median_base_fee_gwei",
      "failed_tx_rate",
      "unique_active_addresses"
    ]
  },
  
  arbitrum: {
    basic: `Arbitrum er en Layer 2 løsning på Ethereum som gir raskere og billigere transaksjoner. 
    Den arver sikkerheten fra Ethereum mens den behandler transaksjoner off-chain.`,
    
    advanced: `Arbitrum er en Optimistic Rollup: transaksjoner utføres på L2, 
    men data og bevis postes til Ethereum L1. 
    Fees består av to komponenter:
    1. L2 execution fee (betales til Sequencer)
    2. L1 data fee (kostnaden for å poste data til Ethereum)
    
    Key differences fra L1:
    - Mye høyere throughput (~40K TPS teoretisk)
    - Lower fees (typisk 10-100x billigere enn Ethereum L1)
    - 7-dag challenge period for withdrawals
    - Sequencer-sentralisering (Offchain Labs kjører)
    
    Gas utilization er ikke direkte sammenlignbart med L1:
    - Ingen hard gas limit per block på samme måte
    - Batching-strategier påvirker metrics
    - "Block" er et L2-konsept (ikke L1 blocks)`,
    
    keyMetrics: [
      "tx_count_daily",
      "median_tx_fee_native",
      "unique_active_addresses",
      "l2_burst_index"  // Custom metric for L2 activity spikes
    ],
    
    hiddenMetrics: [
      "gas_utilization_pct"  // Not directly comparable to L1
    ]
  },
  
  base: {
    basic: `Base er Coinbase sin Layer 2 på Ethereum, bygget med OP Stack. 
    Den gir rask og rimelig tilgang til Ethereum-økosystemet.`,
    
    advanced: `Base er en Optimistic Rollup basert på OP Stack (samme tech som Optimism). 
    Coinbase kjører Sequencer, men planlegger desentralisering.
    
    Key characteristics:
    - 2-sekund block time (L2 blocks)
    - Fees: L2 execution + L1 data (typisk 5-50x billigere enn Ethereum)
    - 7-dag challenge period for withdrawals
    - Native bridging til/fra Coinbase
    
    Metrics considerations:
    - Høy throughput fra Coinbase's retail user base
    - Fee struktur lik Arbitrum (L2 + L1 component)
    - Lower failed_tx_rate vs Ethereum (simpler transactions)
    
    Integration med Coinbase:
    - Onboarding direkte fra Coinbase app
    - Lower friction for retail users
    - Høyere ratio av "simple" transfers vs complex DeFi`,
    
    keyMetrics: [
      "tx_count_daily",
      "median_tx_fee_native",
      "unique_active_addresses"
    ],
    
    hiddenMetrics: [
      "gas_utilization_pct",
      "failed_tx_rate"
    ]
  }
};
```

### 4.3 Methodology Page (/methodology)

**Formål:** Fullstendig transparens om beregninger, datakilder og metodologi

**Seksoner:**

1. **Data Sources**
   - AWS Public Datasets (detaljerte lenker)
   - Update frequency og freshness thresholds
   - Historical coverage per chain

2. **Feature Engineering**
   - Per-metric documentation
   - Aggregation methods (median, mean, percentiles)
   - Guardrails og outlier handling

3. **Regime Detection**
   - Percentile bands (90d windows)
   - Robust z-scores (median/MAD)
   - Momentum signals (7d vs 30d)
   - Label assignment logic

4. **Analog Matching** (hvis implementert)
   - Distance metrics
   - Time window considerations
   - Forward statistics computation

5. **Data Quality Framework**
   - Null rate thresholds
   - Range validation rules
   - Chain-specific guardrails

6. **Limitations & Caveats**
   - Prissensitivitet (vi er prisagnostiske, men fees korrelerer)
   - Coverage gaps (når data mangler)
   - L2 vs L1 sammenlignbarhet

**Kode-struktur:**

```typescript
// app/methodology/page.tsx

export default function MethodologyPage() {
  return (
    <Container size="narrow">
      <h1 className="text-4xl font-bold mb-4">
        Methodology
      </h1>
      
      <p className="text-lg text-text-secondary mb-12">
        Fullstendig dokumentasjon av datakilder, beregninger og beslutningslogikk
      </p>
      
      {/* Table of contents */}
      <nav className="mb-12 p-6 bg-surface rounded-lg border border-border">
        <h2 className="text-xl font-semibold mb-4">Innhold</h2>
        <ul className="space-y-2">
          {sections.map(section => (
            <li key={section.id}>
              <a 
                href={`#${section.id}`}
                className="text-primary hover:underline"
              >
                {section.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      
      {/* Sections */}
      <article className="prose prose-lg max-w-none">
        <DataSourcesSection />
        <FeatureEngineeringSection />
        <RegimeDetectionSection />
        <DataQualitySection />
        <LimitationsSection />
      </article>
      
      {/* Download raw methodology as PDF */}
      <div className="mt-12 p-6 bg-surface rounded-lg border border-border">
        <h3 className="text-xl font-semibold mb-2">
          Teknisk Rapport
        </h3>
        <p className="text-text-secondary mb-4">
          Last ned fullstendig metodologi som PDF (inkl. formler og kode-eksempler)
        </p>
        <button className="btn-primary">
          Last ned PDF
        </button>
      </div>
    </Container>
  );
}
```

---

## DEL 5: API OG DATA-TILGANG

### 5.1 Public API Endpoints

**Base URL:** `https://yoursite.com/api/v1`

**Authentication:** API key via header `X-API-Key` (for subscribers)

#### 5.1.1 Dataset Metadata

```
GET /api/v1/dataset
```

**Response:**
```json
{
  "dataset_id": "css_gold_v1",
  "revision_id": 42,
  "computed_at_utc": "2026-01-31T12:00:00Z",
  "supported_chains": ["bitcoin", "ethereum", "arbitrum", "base"],
  "windows_supported": [30, 90, 180, 365],
  "freshness": {
    "bitcoin": {
      "latest_date": "2026-01-30",
      "lag_hours": 18,
      "status": "ok"
    },
    // ... other chains
  }
}
```

#### 5.1.2 Chain Latest Data

```
GET /api/v1/gold/{chain}/latest
```

**Parameters:**
- `chain`: bitcoin | ethereum | arbitrum | base

**Response:**
```json
{
  "chain": "ethereum",
  "date": "2026-01-30",
  "tx_count_daily": 1234567,
  "gas_utilization_pct": 72.5,
  // ... all metrics
  "metadata": {
    "revision_id": 42,
    "quality": {
      "null_rate": 0.0,
      "coverage_days": 365,
      "confidence": "high"
    }
  }
}
```

#### 5.1.3 Historical Time Series

```
GET /api/v1/gold/{chain}/timeseries
```

**Parameters:**
- `chain`: bitcoin | ethereum | arbitrum | base
- `window`: 30 | 90 | 180 | 365 (days)
- `metrics`: comma-separated list (optional, defaults to all)

**Example:**
```
GET /api/v1/gold/ethereum/timeseries?window=90&metrics=tx_count_daily,gas_utilization_pct
```

**Response:**
```json
{
  "chain": "ethereum",
  "window": 90,
  "start_date": "2025-11-01",
  "end_date": "2026-01-30",
  "data": [
    {
      "date": "2025-11-01",
      "tx_count_daily": 1200000,
      "gas_utilization_pct": 68.3
    },
    // ... 89 more rows
  ]
}
```

#### 5.1.4 Regime Analysis

```
GET /api/v1/regime/{chain}
```

**Response:**
```json
{
  "chain": "ethereum",
  "as_of": "2026-01-30",
  "regime": {
    "label": "STABLE",
    "duration_weeks": 14,
    "confidence": 0.87,
    "drivers": [
      {
        "metric": "gas_utilization_pct",
        "contribution": 0.45,
        "signal": "neutral"
      },
      {
        "metric": "median_tx_fee_native",
        "contribution": 0.32,
        "signal": "low"
      }
    ]
  },
  "explanation": {
    "basic": "Nettverket er i en stabil fase med normal aktivitet.",
    "advanced": "Gas utilization er i midtre percentile band (40-60%) med lav volatilitet. Fees er på lavt nivå (p25) med negativ momentum."
  }
}
```

### 5.2 Data Download (Subscribers)

**Subscribers får tilgang til:**

1. **JSON files (same as frontend)**
   - Hosted på CDN
   - Automatically updated daily
   - Historical archives available

2. **Parquet files (raw)**
   - Gold timeseries per chain
   - Weekly aggregations
   - Confidence scores

3. **Custom exports**
   - CSV format
   - Specific date ranges
   - Selected metrics

**Eksempel:**
```
GET /api/v1/export/gold/ethereum/parquet?start=2025-01-01&end=2026-01-31
Authorization: Bearer <subscriber_token>
```

---

## DEL 6: UTVIKLINGSPROSESS OG QUALITY GATES

### 6.1 Development Workflow

```
Feature Branch → PR → Review → Tests → Staging → Production
```

**Branching strategy:**
```
main           (production)
├── develop    (integration)
├── feature/*  (new features)
├── fix/*      (bug fixes)
└── release/*  (release prep)
```

### 6.2 Pre-Commit Checklist

**ALLE commits må:**

1. ✅ Pass TypeScript type checking
   ```bash
   npm run type-check
   ```

2. ✅ Pass ESLint
   ```bash
   npm run lint
   ```

3. ✅ Pass Prettier formatting
   ```bash
   npm run format
   ```

4. ✅ Pass unit tests
   ```bash
   npm run test
   ```

5. ✅ Verify data loads locally
   ```bash
   npm run verify-data
   ```

### 6.3 Pull Request Requirements

**PR må inneholde:**

1. **Description:**
   - What: Hva endres
   - Why: Hvorfor trengs endringen
   - How: Hvordan er det implementert

2. **Screenshots/Videos** (for UI changes)

3. **Tests:**
   - Unit tests for ny funksjonalitet
   - Integration tests for API changes
   - Visual regression tests for UI changes

4. **Documentation updates:**
   - README hvis nødvendig
   - Inline comments for kompleks logikk
   - API docs hvis endpoints endres

### 6.4 Code Review Standards

**Reviewers må sjekke:**

1. **Functionality:**
   - Does it work as intended?
   - Edge cases handled?
   - Performance implications?

2. **Code Quality:**
   - Readable and maintainable?
   - Follows style guide?
   - DRY principle (Don't Repeat Yourself)?

3. **Type Safety:**
   - All types properly defined?
   - No `any` types without justification?
   - Null checks in place?

4. **Accessibility:**
   - Semantic HTML?
   - Keyboard navigable?
   - Screen reader friendly?

5. **Performance:**
   - Unnecessary re-renders avoided?
   - Large datasets paginated?
   - Images optimized?

### 6.5 Testing Strategy

**Test pyramid:**

```
      ┌─────────┐
      │   E2E   │ (10% - critical user flows)
      ├─────────┤
      │ Integr. │ (30% - component + data)
      ├─────────┤
      │  Unit   │ (60% - pure functions, utils)
      └─────────┘
```

**Example tests:**

```typescript
// __tests__/lib/api/validation.test.ts

import { validateGoldLatest } from "@/lib/api/validation";

describe("validateGoldLatest", () => {
  it("should validate correct ethereum data", async () => {
    const mockData = {
      chain: "ethereum",
      date: "2026-01-30",
      tx_count_daily: 1234567,
      gas_utilization_pct: 72.5,
      // ... all required fields
    };
    
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData
    });
    
    const result = await validateGoldLatest("ethereum", "test-url");
    
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
  
  it("should reject bitcoin with gas_utilization_pct", async () => {
    const mockData = {
      chain: "bitcoin",
      date: "2026-01-30",
      tx_count_daily: 456789,
      gas_utilization_pct: 50.0  // Should not exist for Bitcoin
    };
    
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData
    });
    
    const result = await validateGoldLatest("bitcoin", "test-url");
    
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("should not have gas_utilization_pct");
  });
});
```

### 6.6 Performance Budgets

**HARD LIMITS:**

```javascript
// next.config.js

module.exports = {
  // Performance budgets
  experimental: {
    optimizePackageImports: ['recharts', 'lucide-react']
  },
  
  // Bundle size limits
  webpack: (config) => {
    config.performance = {
      maxEntrypointSize: 512000,    // 500 KB
      maxAssetSize: 512000,          // 500 KB
    };
    return config;
  }
};
```

**Lighthouse targets:**
- Performance: >90
- Accessibility: 100
- Best Practices: >95
- SEO: 100

**Core Web Vitals:**
- LCP (Largest Contentful Paint): <2.5s
- FID (First Input Delay): <100ms
- CLS (Cumulative Layout Shift): <0.1

---

## DEL 7: DEPLOYMENT OG DRIFT

### 7.1 Environment Configuration

```bash
# .env.local (development)
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
NEXT_PUBLIC_DATA_BASE_URL=/data/published/v1

# .env.production
NEXT_PUBLIC_API_BASE_URL=https://api.yoursite.com
NEXT_PUBLIC_DATA_BASE_URL=https://cdn.yoursite.com/data/published/v1
```

### 7.2 Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

**vercel.json:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["arn1"],  // US East (closest to AWS S3)
  "env": {
    "NEXT_PUBLIC_DATA_BASE_URL": "https://cdn.yoursite.com/data/published/v1"
  },
  "headers": [
    {
      "source": "/data/:path*",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=3600, s-maxage=3600"
        }
      ]
    }
  ]
}
```

### 7.3 Monitoring og Alerting

**Required monitoring:**

1. **Uptime monitoring:**
   - Frontend (vercel.app)
   - API endpoints
   - Data freshness

2. **Error tracking:**
   - Sentry integration
   - Frontend errors
   - API errors

3. **Performance monitoring:**
   - Vercel Analytics
   - Core Web Vitals
   - API response times

4. **Data quality alerts:**
   - Stale data detection (>48h)
   - Validation failures
   - Missing files

**Example alert:**
```typescript
// lib/monitoring/alerts.ts

export async function checkDataFreshness() {
  const dataset = await fetchDataset();
  const computedAt = new Date(dataset.computed_at_utc);
  const now = new Date();
  const ageHours = (now.getTime() - computedAt.getTime()) / (1000 * 60 * 60);
  
  if (ageHours > 48) {
    await sendAlert({
      severity: "high",
      message: `Dataset is ${ageHours.toFixed(1)} hours old`,
      service: "data-pipeline"
    });
  }
}
```

### 7.4 Backup og Recovery

**Data backup strategy:**
1. **S3 versioning enabled** på alle buckets
2. **Daily snapshots** av Parquet files
3. **Weekly full backups** til Glacier
4. **Retention:** 90 days (daily), 1 year (weekly)

**Recovery procedures:**
1. **Data corruption:**
   - Restore from S3 version
   - Re-run pipeline from raw data
   - Validate before publishing

2. **Pipeline failure:**
   - Manual trigger from last known good state
   - Notification til data engineering team
   - Status page update

---

## DEL 8: DOKUMENTASJON OG TRAINING

### 8.1 Required Documentation

**For utviklere:**
1. README.md (setup, architecture, conventions)
2. CONTRIBUTING.md (how to contribute)
3. API.md (API documentation)
4. DEPLOYMENT.md (deployment procedures)

**For brukere:**
1. User Guide (how to use the site)
2. FAQ (common questions)
3. Glossary (term definitions)
4. Video tutorials (optional)

### 8.2 Internal Knowledge Base

**Confluence/Notion structure:**
```
📁 Blockchain Analytics
  📁 Technical
    - Architecture Overview
    - Data Pipeline Diagram
    - API Reference
    - Database Schema
  📁 Product
    - User Stories
    - Feature Roadmap
    - Design System
    - Content Guidelines
  📁 Operations
    - Deployment Procedures
    - Monitoring Dashboards
    - Incident Response
    - Backup Procedures
```

---

## DEL 9: SUCCESS CRITERIA OG MILESTONES

### 9.1 Phase 1: Foundation (Week 1-2)

**Deliverables:**
- ✅ Dev environment setup (all team members)
- ✅ JSON data validation working
- ✅ Basic landing page with all 4 chains
- ✅ One complete chain detail page
- ✅ Color system and typography implemented
- ✅ Basic info boxes (Basic/Advanced toggle)

**Success criteria:**
- All data loads correctly in < 2 seconds
- No TypeScript errors
- Mobile responsive
- Passes accessibility audit

### 9.2 Phase 2: Core Features (Week 3-4)

**Deliverables:**
- ✅ All 4 chain detail pages complete
- ✅ Time series charts for all metrics
- ✅ Regime analysis visualization
- ✅ Methodology page first draft
- ✅ API endpoints functional

**Success criteria:**
- Charts render smoothly (60 FPS)
- Info boxes comprehensive (basic + advanced)
- Methodology page gets positive feedback from statistikere
- Lighthouse score >85

### 9.3 Phase 3: Polish (Week 5-6)

**Deliverables:**
- ✅ Visual refinements
- ✅ Animations and transitions
- ✅ Complete methodology documentation
- ✅ API documentation
- ✅ Testing complete

**Success criteria:**
- Lighthouse score >90
- Zero accessibility violations
- Positive feedback from all stakeholder groups
- Deployment to production successful

---

## DEL 10: STAKEHOLDER ACCEPTANCE CRITERIA

### 10.1 For Kryptoinvestorer

**Must-haves:**
- [ ] Immediate understanding of current chain state
- [ ] Historical context (charts, trends)
- [ ] Pedagogisk language for nybegynnere
- [ ] Advanced details for erfarne
- [ ] Mobile-friendly (trading on-the-go)

**Wow-factors:**
- Regime shift detection
- Analogous periods (if implemented)
- Long-term trend visualization
- No price focus (refreshing for experienced investors)

### 10.2 For Statistikere

**Must-haves:**
- [ ] Complete metodologi transparens
- [ ] Formulas and aggregation methods documented
- [ ] Data quality metrics visible
- [ ] Download raw data (Parquet)
- [ ] Reproducible results

**Wow-factors:**
- Robust statistics (median/MAD vs mean/std)
- Chain-specific guardrails
- Explicit uncertainty quantification
- PhD-level rigor in methodology page

### 10.3 For Web-utviklere (Review Team)

**Must-haves:**
- [ ] Clean, maintainable code
- [ ] TypeScript throughout
- [ ] Responsive design
- [ ] Accessibility compliant
- [ ] Fast load times (<2s)
- [ ] SEO optimized

**Wow-factors:**
- Beautiful animations
- Excellent DX (Developer Experience)
- Comprehensive testing
- Performance optimizations
- Modern tech stack

### 10.4 For Data Engineers

**Must-haves:**
- [ ] Clear data pipeline
- [ ] Error handling and logging
- [ ] Validation at every step
- [ ] Idempotent operations
- [ ] Easy to debug

**Wow-factors:**
- Automated testing of pipeline
- Quality metrics dashboards
- Historical data lineage
- Disaster recovery procedures

---

## APPENDIX A: TECH STACK RATIONALE

### Why Next.js 14?

**Pros:**
- Server-side rendering (SEO)
- Static site generation (performance)
- API routes (backend in same repo)
- Excellent DX
- Vercel integration

**Cons:**
- Learning curve for beginners
- Can be overkill for simple sites

**Conclusion:** Justified for this project due to complexity and SEO needs.

### Why Recharts over other chart libraries?

**Alternatives considered:**
- Chart.js: More features, heavier
- D3.js: Full control, steep learning curve
- Victory: Good, but less popular
- Recharts: **CHOSEN** - React-native, composable, good enough

**Rationale:** Recharts balances ease-of-use with flexibility. For custom charts, can extend with D3.

### Why Tailwind CSS?

**Pros:**
- Utility-first (fast prototyping)
- Consistent spacing/colors
- Dead code elimination
- Customizable

**Cons:**
- Verbose HTML
- Learning curve

**Conclusion:** Industry standard, worth the trade-off.

### Why SWR for data fetching?

**Alternatives:**
- React Query: More features, heavier
- Axios: Not React-specific
- Native fetch: No caching

**Rationale:** SWR is lightweight, has built-in caching, and "stale-while-revalidate" strategy fits our use case (data updates daily, stale data acceptable for minutes).

---

## APPENDIX B: COMMON PITFALLS OG SOLUTIONS

### Pitfall 1: Next.js + Node version mismatch

**Problem:** `Error: Cannot find module 'next'`

**Solution:**
```bash
rm -rf node_modules package-lock.json
nvm use 20.11.0
npm install
```

### Pitfall 2: TypeScript errors in production build

**Problem:** `npm run build` fails with type errors

**Solution:**
```bash
# Enable strict mode gradually
# tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": false  // Start with this, then enable
  }
}
```

### Pitfall 3: Data not loading

**Problem:** Blank charts, "No data" messages

**Solution:**
1. Check browser console for CORS errors
2. Verify JSON files exist:
   ```bash
   curl http://localhost:3000/data/published/v1/dataset.json
   ```
3. Check `next.config.js` static file serving:
   ```javascript
   async rewrites() {
     return [
       {
         source: '/data/:path*',
         destination: '/public/data/:path*'
       }
     ];
   }
   ```

### Pitfall 4: Chart performance issues

**Problem:** Lag when rendering charts with 365 data points

**Solution:**
```typescript
// 1. Downsample data for display
function downsample(data: Point[], targetPoints: number): Point[] {
  if (data.length <= targetPoints) return data;
  const step = Math.floor(data.length / targetPoints);
  return data.filter((_, i) => i % step === 0);
}

// 2. Use memo to avoid re-renders
const chartData = useMemo(
  () => downsample(rawData, 100),
  [rawData]
);

// 3. Lazy load charts below the fold
import dynamic from 'next/dynamic';
const ChartComponent = dynamic(() => import('./Chart'), {
  loading: () => <Skeleton />,
  ssr: false
});
```

---

## APPENDIX C: CONTRIBUTION GUIDE

### How to Add a New Metric

**Step 1:** Add to metric registry
```typescript
// lib/registry/metrics.ts

export const METRIC_REGISTRY = {
  // ...
  "new_metric_key": {
    key: "new_metric_key",
    title: "New Metric",
    unit: "count",
    basic: "Enkel forklaring",
    advanced: "Avansert forklaring med metodikk",
    applicableTo: ["ethereum"],
    format: { decimals: 2 }
  }
};
```

**Step 2:** Add to gold data schema
```typescript
// lib/types/gold.ts

export interface GoldLatest {
  // ...
  new_metric_key?: number;  // Optional if not all chains have it
}
```

**Step 3:** Add to chart components
```typescript
// components/chains/MetricGrid.tsx

<MetricCard
  metricKey="new_metric_key"
  data={chainData}
  basic={getMetricExplanation(chain, "new_metric_key", "basic")}
  advanced={getMetricExplanation(chain, "new_metric_key", "advanced")}
/>
```

**Step 4:** Update validation
```typescript
// lib/api/validation.ts

// Add to appropriate validation functions
```

**Step 5:** Update documentation
```markdown
// docs/metrics.md

## new_metric_key

**Definition:** ...
**Calculation:** ...
**Applicability:** Ethereum only
**Interpretation:** ...
```

---

## SLUTTORD

Dette styringsdokumentet er et levende dokument. Det skal oppdateres når:
- Nye teknologiske valg gjøres
- Arkitektur endres vesentlig
- Nye best practices etableres
- Feedback fra stakeholders krever justeringer

**Ansvarlig for vedlikehold:** Tech Lead  
**Review-frekvens:** Månedlig i development-fase, quarterly i maintenance-fase

**Suksess-indikator:** Når et nytt team medlem kan være produktiv innen 1 dag, og når alle stakeholder-grupper gir positiv feedback på kvalitet, pedagogikk og profesjonalitet.

---

**SIGNERT:**

_[Tech Lead]_  
_[Dato]_

_[Product Owner]_  
_[Dato]_

_[Lead Data Engineer]_  
_[Dato]_
