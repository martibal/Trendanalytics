CSS – Pipeline, Data og Reports (Overtakelses-README)
===================================================

Dette dokumentet beskriver den delen av repoet som produserer og forvalter data: ingest av rådata, daglig aggregering til features, bygging av GOLD timeseries (daglig og ukentlig), validering, samt synk til JSON-historikk som kan konsumeres av andre lag.

Avgrensning
-----------
- API-kode under `api/` og web-klient under `web/` omtales kun som integrasjonspunkter (stier/artefakter). Du skal ikke bruke dette dokumentet som spesifikasjon av API/web, fordi de skal bygges på nytt.
- Alt her er basert på innholdet i den vedlagte ZIP-en (repo snapshot). Hvis noe eksternt finnes i drift (f.eks. ekstra scripts som produserer `raw_manifest_summary.json`), er det markert eksplisitt som “forventet, men ikke inkludert i snapshot”.

Hurtig oversikt
---------------
**Ende-til-ende flyt (daglig):**
1) Last ned/oppdater RAW parquet per chain og tabell (blocks/transactions) fra AWS Public Blockchain S3.
2) For hver chain og dag: les RAW -> aggreger til én rad/dag i `features_agg/<chain>/<YYYY-MM-DD>.parquet`.
3) Bygg daglig GOLD timeseries per chain (samler alle dager) til `prod/gold/<chain>.parquet` + skriv status/helse til `prod/ml_status/<chain>.json`.
4) Bygg weekly GOLD per chain til `prod/gold_weekly/<chain>.parquet`.
5) Synk daglig GOLD parquet -> historiske JSON-filer (per dag + latest + last30d) under `data/calculated/gold/<chain>/`.
6) (Integrasjonspunkt) Eksporter META JSON-historikk under `data/calculated/meta/<chain>/` ved å kalle beregningsfunksjon i API-laget.
7) (Integrasjonspunkt) Bygg web-dist.

**Kjerneartefakter (filer du typisk publiserer/bruker videre):**
- Daglig GOLD parquet: `pipeline/_work/prod/gold/<chain>.parquet`
- Weekly GOLD parquet: `pipeline/_work/prod/gold_weekly/<chain>.parquet`
- GOLD status: `pipeline/_work/prod/ml_status/<chain>.json`
- JSON-historikk (for enkel hosting/cache): `data/calculated/gold/<chain>/{YYYY-MM-DD.json,latest.json,last30d.json}`

Repo-struktur
-------------
Snapshotet har følgende toppnivå:
- `pipeline/` – all databygging/produksjon av artefakter.
  - `pipeline/src/` – Python-moduler som faktisk beregner features og bygger GOLD.
  - `pipeline/tools/` – kjøre-script (PowerShell) og hjelpeverktøy (Python) for ingest/synk/validering.
  - `pipeline/_work/` – arbeidskatalog med prod-artefakter (features_agg, gold, gold_weekly, ml_status, ev. reports).
- `data/` – forventet “eksternisert” data-layout i drift (junction/symlink til store disker). (I snapshotet finnes primært `README_DATA.txt` som dokumenterer dette.)
- `css_gui_pipeline.py` – enkel GUI som kjører full pipeline og kan starte “site” (integrasjonspunkt; omtales bare for miljøvariabler og kjøring av pipeline).
- `api/`, `web/` – integrasjonspunkt; ikke gjennomgått i detalj her.


1) Data layout og kataloger
===========================

1.1 “main/data” i drift (junction/symlink-basert)
-------------------------------------------------
`README_DATA.txt` beskriver målbildet for drift:

Forventet struktur:
- `main/data/raw/` (stor lagring, ofte junction til eksterne disker)
  - `bitcoin/`
  - `ethereum/`
  - `arbitrum/`
  - `base/`

- `main/data/calculated/gold/` (JSON-historikk; ofte junction)
  - `<chain>/YYYY-MM-DD.json`
  - `<chain>/latest.json`
  - `<chain>/last30d.json`

- `main/data/calculated/meta/` (META JSON-historikk; ofte junction)
  - `<chain>/YYYY-MM-DD.json`
  - `<chain>/latest.json` (avhengig av export-scriptets praksis)

Typiske junction-eksempler (PowerShell, administrator):
- `mklink /J D:\css\main\data\raw\bitcoin   F:\css_raw\bitcoin`
- `mklink /J D:\css\main\data\calculated\gold\bitcoin   F:\css_json\bitcoin`
- `mklink /J D:\css\main\data\calculated\meta\bitcoin   F:\css_json_meta\bitcoin`

Viktig presisering:
- Pipeline **produserer primært parquet og statusfiler under `pipeline/_work/`**.
- JSON-historikk blir skrevet under `data/calculated/gold/` via sync-script.
- `data/raw/` er forventet lokalt mount/junction hvor ingest legger ned parquet.

1.2 Pipeline arbeidskatalog (`pipeline/_work/`)
-----------------------------------------------
Snapshotet inkluderer eksempelartefakter under:
- `pipeline/_work/prod/features_agg/<chain>/<YYYY-MM-DD>.parquet`
- `pipeline/_work/prod/gold/<chain>.parquet`
- `pipeline/_work/prod/gold_weekly/<chain>.parquet`
- `pipeline/_work/prod/ml_status/<chain>.json`

Merk:
- I `pipeline/tools/daily_update.ps1` finnes referanser til en eldre `pipeline/_work/features`-layout. Den moderne flyten (full pipeline) bruker `pipeline/_work/prod/features_agg`.
- `feature_daily_agg.py` har en eksplisitt sperre som nekter å skrive til en legacy-rot kalt `features`.


2) Orkestrering: hvordan pipeline kjøres
=======================================

2.1 “Full pipeline” (anbefalt): `pipeline/tools/full_pipeline.ps1`
------------------------------------------------------------------
Dette er hovedrunneren som implementerer hele flyten i nummererte “STEP”er.

**Viktige stier (inne i scriptet):**
- Repo-root (`$MAIN_ROOT`): to nivåer opp fra `pipeline/tools`.
- RAW-root (`$RAW_ROOT`): `data/raw`
- Work/prod-root (`$PROD_ROOT`): `pipeline/_work/prod`
- Features-root (`$FEATURES_ROOT`): `pipeline/_work/prod/features_agg`
- GOLD-root (`$GOLD_ROOT`): `pipeline/_work/prod/gold`
- Weekly GOLD-root (`$GOLD_WEEKLY_ROOT`): `pipeline/_work/prod/gold_weekly`
- Status-root (`$ML_STATUS_ROOT`): `pipeline/_work/prod/ml_status`
- Reports-dir (`$REPORTS_DIR`): `pipeline/_work/prod/reports` (forventet; kan opprettes)
- JSON output root (`$GOLD_JSON_ROOT`): `data/calculated/gold`

**Startdato-policy:**
- Hard start: `2024-12-01`.
- Scriptet prøver å finne “latest raw day” lokalt (billig probe på `bitcoin/blocks`, ellers rekursivt).
- Deretter kjøres pipeline for siste ~7 dager (latest - 7), clampet til hard start.
  - Formålet er å redusere arbeid ved normal drift: man oppdaterer bare en buffer bakover.

**STEG 1: Download RAW (missing only)**
- Kaller: `pipeline/tools/download_up_to_date_minimal.py`
- Parametre:
  - `--root <repo_root>` (for å skrive report under `<repo_root>/reports/`)
  - `--raw-root <data/raw>`
  - `--start <startDate>`
- Scriptet:
  - lister tilgjengelige dato-partisjoner på S3 per chain og tabell
  - filtrerer til [start, cutoff] der cutoff = i dag minus publish-lag (default 1)
  - sjekker om dagen allerede finnes lokalt i et av to layoutformat (se 3.1)
  - “aws s3 sync” for manglende dager
  - skriver report: `<repo_root>/reports/download_up_to_date_minimal.json`

**STEG 2: Build FEATURES daily parquet (missing only)**
- For hver chain:
  - les rå dagsmapper fra RAW blocks (anvendes som “kanonisk” dagliste)
  - finn hvilke feature-parquet som mangler i `features_agg/<chain>/`
  - kjør `pipeline/src/feature_daily_agg.py` for hver manglende dag
- Output: `pipeline/_work/prod/features_agg/<chain>/<YYYY-MM-DD>.parquet`

**STEG 3: Build GOLD parquet + ml_status**
- For hver chain:
  - kjør `pipeline/src/build_gold_timeseries.py`
    - samler daily feature-artefakter til én timeseries parquet
    - anvender guardrails og skriver kvalitet/status JSON
  - kjør `pipeline/src/build_gold_weekly.py`
    - avleder ukentlig datasett fra daglig gold
- Output:
  - `pipeline/_work/prod/gold/<chain>.parquet`
  - `pipeline/_work/prod/gold_weekly/<chain>.parquet`
  - `pipeline/_work/prod/ml_status/<chain>.json`

**STEG 4: Sync GOLD JSON history**
- Setter env:
  - `GOLD_ROOT = <pipeline/_work/prod/gold>`
  - `GOLD_JSON_ROOT = <data/calculated/gold>`
- Kaller: `pipeline/tools/sync_gold_json_history.py`
- Output:
  - per-dag JSON: `data/calculated/gold/<chain>/<YYYY-MM-DD>.json`
  - `data/calculated/gold/<chain>/latest.json`
  - `data/calculated/gold/<chain>/last30d.json`

**STEG 5: Export META JSON history**
- Kaller: `pipeline/tools/export_meta_json.py --root <repo_root> --start 2024-12-01`
- Dette scriptet importerer API-laget og kaller en “compute_overview” funksjon.
- Avgrensning: selve beregningen er i API-laget og omtales ikke her. Fra pipeline-perspektiv er dette et “export”-steg som materialiserer en per-dag JSON cache.
- Output:
  - `data/calculated/meta/<chain>/<YYYY-MM-DD>.json`
  - `data/calculated/meta/<chain>/latest.json`

**STEG 6: Build web dist**
- Integrasjonspunkt (ikke dokumentert i detalj): `web/build.py`.

2.2 Alternativ: `pipeline/tools/daily_update.ps1`
-------------------------------------------------
Dette er et eldre/alternativt runner-script. I snapshotet finnes det referanser til:
- `$FEAT_ROOT = pipeline/_work/features` (legacy)
Mens `feature_daily_agg.py` eksplisitt nekter å skrive til en rot kalt `features`.

Anbefaling:
- Bruk `full_pipeline.ps1` som “source of truth”.
- Dersom `daily_update.ps1` skal brukes, må den oppdateres til å peke på `pipeline/_work/prod/features_agg`.

2.3 GUI-runner: `css_gui_pipeline.py`
-------------------------------------
GUI-en har to knapper:
- “Kjør pipeline”: kjører `pipeline/tools/full_pipeline.ps1` og deretter web build.
- “Åpne nettsiden”: starter API (integrasjonspunkt).

Det viktigste for pipeline-drift er at GUI-en setter/propagerer miljøvariabler som forventes av andre komponenter:
- `WEB_DIST`, `GOLD_DIR`, `GOLD_WEEKLY_DIR`, `GOLD_STATUS_DIR`, `META_DIR`, `CSS_RAW_ROOT`, `GOLD_JSON_MAX_DAYS`.


3) Ingest og RAW data
=====================

3.1 Datakilde og S3 layout
--------------------------
Ingest-scriptet `pipeline/tools/download_up_to_date_minimal.py` bruker AWS CLI til å hente fra AWS Public Blockchain:

S3 baser (hardkodet i scriptet):
- ethereum: `s3://aws-public-blockchain/v1.0/eth`
- bitcoin:  `s3://aws-public-blockchain/v1.0/btc`
- arbitrum: `s3://aws-public-blockchain/v1.1/sonarx/arbitrum`
- base:     `s3://aws-public-blockchain/v1.1/sonarx/base`

Tabeller (hardkodet):
- `blocks`
- `transactions`

S3 partisjoner antas å være hive-style:
- `<base>/<table>/date=YYYY-MM-DD/...parquet`

3.2 Lokal RAW layout (to støttede varianter)
--------------------------------------------
`feature_daily_agg.py` støtter historisk to lokale layout-formater for dagsdata:

A) Hive-style:
- `data/raw/<chain>/<table>/date=YYYY-MM-DD/*.parquet`

B) Plain folder:
- `data/raw/<chain>/<table>/YYYY-MM-DD/*.parquet`

Ingest-scriptet *skriver* som plain folder som default:
- destination for en dag: `.../<chain>/<table>/<YYYY-MM-DD>/`.

Feature-scriptet har prioritet:
1) `date=YYYY-MM-DD` hvis mappen eksisterer
2) ellers `YYYY-MM-DD`

3.3 Ingest-policy: cutoff/publish-lag
-------------------------------------
`download_up_to_date_minimal.py` bruker en “safety lag”:
- `cutoff = today - publish_lag_days` (default 1)
- Den prøver ikke å laste ned de aller ferskeste dagene (for å unngå ufullstendige S3-partisjoner).

Scriptet skriver en reportfil:
- `<repo_root>/reports/download_up_to_date_minimal.json`

Innhold (høynivå):
- start/cutoff
- per chain/table: hvor mange dager som mangler
- liste over planlagte nedlastinger
- liste over “skipped existing”
- failures med årsak


4) Daglige features: `pipeline/src/feature_daily_agg.py`
========================================================

4.1 Rolle
---------
Dette er den eneste komponenten som leser rå “row-level” blocks/transactions for en dag.
Den produserer **én rad per chain per dag** med et kanonisk sett av kolonner (CANON_COLS).

Kanoniske output-kolonner (rekkefølge og navn er “kontrakt”):
- `date` (string, ISO `YYYY-MM-DD`)
- `chain`
- `tx_count_daily`
- `block_count_daily`
- `value_transferred_native`
- `median_tx_value_native`
- `median_tx_fee_native`
- `failed_tx_rate`
- `gas_utilization_pct`
- `unique_active_addresses`
- `avg_block_time_sec`

Output-fil:
- `<out_root>/<chain>/<YYYY-MM-DD>.parquet`
I “full pipeline” er `out_root = pipeline/_work/prod/features_agg`.

4.2 Robust lesing og schema-drift
---------------------------------
Råparquet kan ha schema-drift på tvers av filer samme dag.
For å unngå `SchemaError`:
- `_scan_dir()` scanner **per fil** og conkatenerer `pl.concat(..., how="diagonal_relaxed")`.
- Dette betyr at missing kolonner i en fil blir null i union-skjema.

4.3 Innganger og tabeller
-------------------------
For hver (chain, day) prøver scriptet å lese:
- transactions (parquetfiler under day-mappen)
- blocks (parquetfiler under day-mappen)

Hvis begge mangler eller er tomme -> returnerer `None` og skriver ikke output.

4.4 Kolonnematching (case-insensitive)
--------------------------------------
Scriptet bygger et case-insensitive “kolonnekart” (`_ci_map_columns`) slik at ulike kilder kan ha variasjon i casing.
Når den leter etter en kandidatkolonne, sjekker den `name.lower()` i kartet.

4.5 Metrikker og eksakte beregninger
------------------------------------
Nedenfor er definisjoner slik de faktisk implementeres.

### A) Transactions-baserte metrikker

**1) `tx_count_daily`**
- Definisjon: antall transaksjonsrader den dagen.
- Polars: `pl.len()`.
- Type: `UInt32`.

**2) `value_transferred_native` og `median_tx_value_native`**
- Scriptet prøver å finne en “value” kolonne i denne rekkefølgen (første treff brukes):
  - `value`, `value_native`, `value_transferred`, `amount`, `native_value`, `tx_value`
- Hvis funnet:
  - `value_transferred_native = SUM(value)` (cast til Float64, `strict=False`)
  - `median_tx_value_native = MEDIAN(value)`
- Hvis ikke funnet: begge blir `NULL`.

**3) `median_tx_fee_native`**
Scriptet prøver flere alternativer i prioritert rekkefølge:

A) Direkte fee-kolonne (median):
- Kandidater: `fee`, `tx_fee`, `transaction_fee`, `gas_fee`, `transaction_fee_native`, `transaction_fee`
- Hvis funnet: `median_tx_fee_native = MEDIAN(fee_col)`

B) Deriver fee fra gas * price (median av produktet):
- hvis `receipt_effective_gas_price` og `receipt_gas_used` finnes:
  - `median_tx_fee_native = MEDIAN(receipt_effective_gas_price * receipt_gas_used)`
- ellers hvis `effective_gas_price` og `gas_used` finnes:
  - `median_tx_fee_native = MEDIAN(effective_gas_price * gas_used)`
- ellers hvis `gas_price` og `gas_used` finnes:
  - `median_tx_fee_native = MEDIAN(gas_price * gas_used)`

Hvis ingen av delene kan beregnes: `NULL`.

**4) `failed_tx_rate`**
- Primært: hvis `receipt_status` finnes:
  - `failed_tx_rate = MEAN(receipt_status != 1.0)`
- Ellers: hvis `status` finnes:
  - `failed_tx_rate = MEAN(status != 1.0)`
- Resultat er andel i [0, 1] (forventet).
- Hvis ingen statuskolonne: `NULL`.

**5) `unique_active_addresses`**
- Scriptet finner “from” og “to” kolonner med kandidatnavn:
  - from: `from_address`, `from`, `sender`
  - to:   `to_address`, `to`, `recipient`
- Hvis minst én finnes:
  - concat-liste av disse kolonnene
  - explode til rader
  - drop null
  - `n_unique()`
- Type: `UInt32`.
- Merk: dette er “unik blant avsender + mottaker samme dag”, ikke unike per rolle.

### B) Blocks-baserte metrikker

**6) `block_count_daily`**
- Definisjon: antall block-rader den dagen.
- Polars: `pl.len()`.
- Type: `UInt32`.

**7) `gas_utilization_pct`**
- Kun hvis både `gas_used` og `gas_limit` finnes i blocks:
  - `gas_utilization_pct = SUM(gas_used) / SUM(gas_limit)`
  - Hvis `SUM(gas_limit) <= 0` -> `NULL`.
- Merk: For bitcoin settes den senere til `NULL` (se guardrails).

**8) `avg_block_time_sec` (median blokk-intervall)**
- Scriptet leter etter timestamp-kolonne:
  - `timestamp` ellers `block_timestamp`
- Den tar unike timestamps, sorterer, og tar medianen av differansen (`diff().median()`).
- Enhetsdeteksjon:
  - Det estimeres en divisor ut fra størrelsesorden på max timestamp:
    - >= 1e18 => antar nanosekunder => divisor 1e9
    - >= 1e15 => antar mikrosekunder => divisor 1e6
    - >= 1e12 => antar millisekunder => divisor 1e3
    - ellers => antar sekunder => divisor 1
  - `avg_block_time_sec = median(diff(ts)) / divisor`

Dette er en robust “typisk block time” (median, ikke mean) og tåler outliers bedre.

4.6 Post-prosessering / guardrails i feature-scriptet
------------------------------------------------------
Etter at én-rads dataframen er satt sammen, kjøres kjedeprofil-guardrails.

Kjedeprofil (`_chain_profile`):
- bitcoin/btc => `btc`
- ethereum/eth => `eth`
- arbitrum/arb/base => `l2`
- ellers => `evm`

**avg_block_time_sec plausibilitet (filtrering):**
- btc: tillat [30.0, 7200.0]
- eth: tillat [0.5, 120.0]
- l2:  tillat [0.02, 30.0]
- evm: tillat [0.05, 600.0]
Verdier utenfor intervallet settes til `NULL`.

**gas_utilization_pct plausibilitet (filtrering):**
- btc: alltid `NULL`
- andre: tillat [0, 1.2] (litt slingringsmonn) ellers `NULL`

**failed_tx_rate plausibilitet:**
- tillat [0, 1] ellers `NULL`

4.7 Viktig invariant: én rad per dag
------------------------------------
Hvis aggregasjonen likevel produserer flere rader (skal i praksis ikke skje):
- scriptet logger warning og beholder `head(1)`.


5) GOLD (daglig): `pipeline/src/build_gold_timeseries.py`
==========================================================

5.1 Rolle
---------
Dette scriptet *reberegner ikke features*. Det:
- leser allerede produserte feature-parquet (én fil per dag)
- normaliserer schema til en stabil kanonisk kontrakt
- applicerer guardrails/safety-fixes
- skriver én “timeseries” parquet per chain
- skriver en status JSON per chain med:
  - periode (første/siste dag)
  - manglende datoer
  - read_errors (hvis enkelte dagsfiler ikke kan leses)
  - kvalitet (null-rate per kolonne, out-of-range counts)
  - applied fixes
  - (valgfritt) raw-manifest kontekst

5.2 Input og output
-------------------
Input:
- `features_root/<chain>/*.parquet` (i full pipeline: `pipeline/_work/prod/features_agg/<chain>/`)

Output:
- GOLD parquet: `gold_root/<chain>.parquet` (i full pipeline: `pipeline/_work/prod/gold/<chain>.parquet`)
- Status JSON: `status_root/<chain>.json` (i full pipeline: `pipeline/_work/prod/ml_status/<chain>.json`)

5.3 Robust lesing av dagsfiler
------------------------------
For å tåle schema-drift og store filer:
- Hver dagsfil leses individuelt med `pl.read_parquet(..., n_rows=1)`.
  - Dette er bevisst: dagsfilen skal være én rad, og dette hindrer at et feilformatert dagsartefakt blåser minne.
- Etter lesing normaliseres den til CANON_COLS (`_normalize_feature_df`).
- Dagsrammer concateneres med `pl.concat(..., how="vertical_relaxed")` for dtype-toleranse.

5.4 Manglende datoer
--------------------
- Scriptet tar listen av tilstedeværende dager (`p.stem` for `*.parquet`), sorterer, og bygger en forventet dato-liste fra første til siste.
- `missing_dates = expected - present` (sortert).
- Dette skrives i status JSON.

5.5 Guardrails/safety-fixes i GOLD-bygger
-----------------------------------------
GOLD-byggeren har et ekstra lag med guardrails, spesielt for kjente enhets-/skala-feil.

**A) avg_block_time_sec – “tiny positive” rescale safety-net**
- Hvis `0 < avg_block_time_sec < 1e-6`:
  - multipliser med `1e9`
  - noter fix: `avg_block_time_sec_rescaled_tiny_by_1e9`
- Formål: detektere/rette en nanosekund-bug eller ekstremt feil skala.

**B) avg_block_time_sec plausibilitet (profilavhengig):**
- btc: [30, 3600]
- eth: [1, 60]
- l2:  [0.001, 60]
- evm: [0.05, 600]
Utenfor => settes til `NULL`.

**C) gas_utilization_pct**
- btc: settes alltid `NULL` + noteres `gas_utilization_pct_null_for_btc`
- l2: behold hvis i [0, 1.2], ellers NULL + noteres `gas_utilization_pct_range_checked_l2`
- eth/evm: behold hvis i [0, 1.0], ellers NULL

**D) failed_tx_rate**
- behold hvis i [0, 1], ellers NULL

5.6 Kvalitetssammendrag i status
--------------------------------
Status JSON inneholder:
- `quality.null_rates`: andel null per kolonne over alle rader
- `quality.out_of_range_counts`: antall ikke-null verdier som er utenfor profilgrenser (etter guardrails er dette typisk 0)
- `row_count`

I tillegg beregnes:
- `features_lag_days_vs_utc_today`: (UTC today - last_feature_date)

5.7 Raw kontekst (forventet, men ikke produsert i snapshot)
-----------------------------------------------------------
GOLD-byggeren forsøker å lese:
- `<reports_dir>/raw_manifest_summary.json`
- `<reports_dir>/raw_gaps.json`

Disse brukes for å hente `latest_ok_date` for raw blocks/transactions per chain og “gaps” i rågrunnlaget.

I snapshotet finnes ikke generator-script for disse reportfilene.
Hvis de ikke finnes:
- `latest_raw_ok_date` blir `null` i status
- `raw_gaps` blir `{}`
- stiene ligger likevel i status JSON som referanse.


6) GOLD (ukentlig): `pipeline/src/build_gold_weekly.py`
=======================================================

6.1 Rolle
---------
Deriverer et investorrettet ukesdatasett fra daglig GOLD:
- 7d aggregater
- week-over-week (WoW) prosentendringer
- sesong-/baseline medianer over 8 og 26 uker (ekskluderer nåværende uke)

6.2 Input og output
-------------------
Input:
- `gold_root/<chain>.parquet` (daglig gold)

Output:
- `gold_weekly_root/<chain>.parquet`

Hvis input mangler:
- scriptet skriver en tom placeholder parquet med kolonner `date, week_start, week_end, chain`.

6.3 Normalisering av dato
-------------------------
- Scriptet forventer `date` i daglig gold.
- Hvis `day` finnes i stedet, renames den til `date`.
- `_normalize_date_column` gjør:
  - hvis `date` allerede er `pl.Date`: bruk den
  - hvis `pl.Datetime`: konverter til dato
  - ellers parse string til dato

Intern hjelpekolonne `_d` brukes som `pl.Date`.

6.4 Ukedefinisjon
-----------------
- Uke starter mandag.
- `week_start = _d - (weekday(_d) - 1) days`, der `weekday()` er mandag=1..søndag=7.
- `week_end = week_start + 6 days`.

6.5 Proxies og aggregater
-------------------------
Weekly datasettet bygger tre “hoveddimensjoner”:

**A) Aktivitet (activity)**
- Daglig: `tx_count_daily`
- Ukentlig: `activity_7d_sum = SUM(tx_count_daily)` gruppert per `week_start`.

**B) Fees (fees proxy)**
- Daglig fees proxy:
  - `_fee_proxy = median_tx_fee_native * tx_count_daily`
  - Begrunnelse: total fee per dag finnes ofte ikke direkte; median*antall gir en robust proxy som er mindre sårbar for outliers enn mean fee.
- Ukentlig:
  - `fees_7d_sum_proxy = SUM(_fee_proxy)`.

**C) Kapasitet (capacity proxy)**
- Scriptet beregner ukentlig:
  - `_gas_mean = MEAN(gas_utilization_pct)`
  - `_blk_mean = MEAN(avg_block_time_sec)`
- Deretter:
  - `capacity_7d_mean = _gas_mean` hvis `_gas_mean` ikke er null
  - ellers `capacity_7d_mean = -1.0 * _blk_mean`

Tolkning:
- Hvis gas utilization eksisterer og er meningsfull: høyere = mer utnyttelse (tighter capacity).
- Hvis ikke: lavere block time indikerer høyere kapasitet; ved å negere block time blir “høyere” i proxyen bedre/strammere.

6.6 WoW prosentendringer
------------------------
- For hver av de tre dimensjonene beregnes pct change mot forrige uke:
  - `wow_*_pct = (cur - prev) / prev`
- Hvis `prev` er null eller 0 -> resultat blir NULL.

6.7 Baselines (median)
----------------------
- Baselines bruker *tidligere uker* (shift(1) for å ekskludere nåværende uke).
- Rolling median:
  - 8 uker: `rolling_median(window_size=8, min_samples=4)`
  - 26 uker: `rolling_median(window_size=26, min_samples=10)`

Outputkolonner (stabilt schema):
- `date` (lik `week_start` formatert `YYYY-MM-DD`, for enkel slicing)
- `week_start`, `week_end`
- `chain`
- `activity_7d_sum`
- `fees_7d_sum_proxy`
- `capacity_7d_mean`
- `wow_activity_pct`, `wow_fees_pct`, `wow_capacity_pct`
- `baseline_activity_8w_med`, `baseline_activity_26w_med`
- `baseline_fees_8w_med`, `baseline_fees_26w_med`
- `baseline_capacity_8w_med`, `baseline_capacity_26w_med`


7) Synk til JSON-historikk: `pipeline/tools/sync_gold_json_history.py`
======================================================================

7.1 Rolle
---------
Konverterer daglig GOLD parquet (timeseries) til “file-per-day” JSON slik at en UI/hosting kan servere statiske JSON-filer uten å lese parquet.

7.2 Repo-root deteksjon
-----------------------
Scriptet kan ligge under `tools/` eller `pipeline/tools/`.
Det finner repo-root ved å gå oppover til den finner både `api/` og `web/` som markører.

7.3 Default paths og overstyring
--------------------------------
Defaults:
- `gold_root = <repo>/pipeline/_work/prod/gold` (kan overstyres med `--gold-root` eller env `GOLD_ROOT`)
- `out_root  = <repo>/data/calculated/gold` (kan overstyres med `--out-root` eller env `GOLD_JSON_ROOT`)

7.4 Hva som skrives
-------------------
For hver chain:
- Per dato:
  - `data/calculated/gold/<chain>/<YYYY-MM-DD>.json`
  - Payload er som hovedregel ett objekt (én rad). Hvis det finnes flere rader samme dag, skrives en liste.

- `latest.json`:
  - siste dato i datasettet

- `last30d.json`:
  - liste over rader for de siste 30 unike datoene

7.5 Datatyper i JSON
--------------------
Scriptet normaliserer:
- `date` til ISO-string
- pandas/numpy scalarer til “plain” Python via `_json_safe`.


8) Produksjonsvalidering: `pipeline/tools/validate_gold_parquet.py`
===================================================================

8.1 Rolle
---------
Dette er en “MÅ-gate” (quality gate) for GOLD parquet før publisering.
Den sjekker:
- at gold parquet finnes per chain
- at siste dato ikke er for gammel iht policy (lag per chain)
- ingen duplikate datoer
- (warn) deteksjon av gap i datorekke
- sanity ranges for sentrale metrikker
- deteksjon av kjent “nanosekund-bug” i avg_block_time_sec

8.2 Freshness policy (default)
------------------------------
- bitcoin, ethereum: tillatt lag 1 dag (T-1)
- base, arbitrum: tillatt lag 7 dager (T-7)

Kan overstyres med env:
- `PUBLISH_LAG_BTC_ETH_DAYS`
- `PUBLISH_LAG_L2_DAYS`
- `PUBLISH_LAG_DAYS_POLICY`

8.3 Range checks (fatal som default)
------------------------------------
- bitcoin:
  - `avg_block_time_sec` i [30, 3600]
- ethereum:
  - `avg_block_time_sec` i [0.5, 60]
  - `gas_utilization_pct` i [0, 1]
  - `failed_tx_rate` i [0, 1]
- base/arbitrum:
  - `avg_block_time_sec` i [0.001, 60]

Nanosekund-bug:
- hvis `0 < avg_block_time_sec < 1e-6` => FATAL

8.4 Strict mode
---------------
- `--strict` gjør freshness breach til FATAL og feiler også på WARN.


9) META JSON export (integrasjonspunkt): `pipeline/tools/export_meta_json.py`
=============================================================================

9.1 Rolle
---------
Materialiserer en “overview”/META JSON per chain per dag til fil.
Formålet er å slippe runtime-beregning i konsumlag.

9.2 Viktige tekniske detaljer (uten å gå inn i API-beregning)
------------------------------------------------------------
- Scriptet injiserer repo-root i `sys.path` for å kunne `import api.main` uansett working directory.
- Den prøver flere kompatible kwarg-navn når den kaller compute-funksjonen:
  - `asof`, `asof_date`, `date`

9.3 Output
----------
- `<repo_root>/data/calculated/meta/<chain>/<YYYY-MM-DD>.json`
- `<repo_root>/data/calculated/meta/<chain>/latest.json`


10) Reports og logg-artefakter
==============================

10.1 `reports/download_up_to_date_minimal.json`
-----------------------------------------------
Skrevet av `download_up_to_date_minimal.py` under `<repo_root>/reports/`.

Innhold:
- `started_at`
- `start`, `cutoff`, `dry_run`
- `summary` per `chain:table`
- `planned_downloads` (liste av objekter)
- `skipped_existing`
- `failures`

10.2 `raw_manifest_summary.json` og `raw_gaps.json` (forventet)
--------------------------------------------------------------
Byggeren for GOLD status refererer til disse som ekstra kontekst.
De er ikke generert av script i snapshotet.

Hvis dere ønsker at status JSON alltid skal inneholde “freshness i rågrunnlaget”, må dere:
- enten implementere et nytt report-steg som produserer disse filene
- eller fjerne avhengigheten i `build_gold_timeseries.py`.


11) Avhengigheter og runtime-krav
================================

11.1 Python-pakker
------------------
Pipeline-koden bruker primært:
- `polars` (feature-agg + gold builders)
- `pandas` (sync til json + validate)
- `pyarrow` (implisitt via pandas/parquet; ofte nødvendig for `read_parquet`)

11.2 Eksterne verktøy
---------------------
- **AWS CLI** (`aws`) må være installert og på PATH.
  - `download_up_to_date_minimal.py` feiler hardt hvis `aws --version` ikke fungerer.
- **PowerShell**
  - `full_pipeline.ps1` kjøres typisk via Windows PowerShell eller `pwsh`.

11.3 Filformater
----------------
- RAW: Parquet (mange filer per dag)
- FEATURES: Parquet (én fil per dag, én rad)
- GOLD: Parquet (timeseries, én rad per dag)
- WEEKLY: Parquet (timeseries, én rad per uke)
- JSON-historikk: JSON per dag + latest + last30d


12) Operasjonelle “gotchas” og feilsøking
========================================

12.1 “SchemaError” / schema-drift
---------------------------------
- Løses i hovedsak ved at feature-scriptet scanner per fil og bruker `diagonal_relaxed`.
- GOLD-byggeren leser bare `n_rows=1` per dagsfil og concatenerer `vertical_relaxed`.

Hvis det likevel feiler:
- Se `read_errors` i `pipeline/_work/prod/ml_status/<chain>.json`.
- Vanlig årsak er helt korrupt parquet eller manglende fil.

12.2 Manglende days / gaps
--------------------------
- `build_gold_timeseries.py` skriver `missing_dates` basert på “expected from first->last”.
- Det er normalt å ha gaps dersom ingest ikke har alle dager.

12.3 “avg_block_time_sec nanosecond bug”
----------------------------------------
- Validatoren feiler FATAL hvis den ser verdier mellom 0 og 1e-6.
- GOLD-byggeren prøver å rescale slike verdier *før* plausibilitetsfiltrering.

Hvis dette trigges ofte:
- Sjekk at RAW timestamps har riktig enhet.
- Sjekk enhetsdeteksjonen i `feature_daily_agg.py` (divisor basert på max ts).

12.4 Freshness-breach
---------------------
- Validatoren vil WARN (eller FATAL i strict) hvis siste dato i gold er eldre enn policy.
- For L2 er policy 7 dager, for BTC/ETH 1 dag.

Dette er ofte forventet når:
- ingest cutoff/publish-lag er strengere enn policy
- S3-partisjoner har faktisk lag

12.5 Lokal data-layout (junction)
---------------------------------
- Hvis `data/raw` eller `data/calculated` er junction til andre disker, må stiene eksistere.
- `full_pipeline.ps1` forventer at `data/raw` finnes.
- GUI-en (`css_gui_pipeline.py`) setter `CSS_RAW_ROOT` til `data/raw` hvis ikke eksplisitt satt.


13) Referanseliste: filer og ansvar
===================================

Pipeline-kjerne:
- `pipeline/src/feature_daily_agg.py`
  - Leser RAW parquet (blocks + transactions) per dag
  - Produserer én rad/dag i features_agg
  - Definerer CANON_COLS og alle daglige metrikker

- `pipeline/src/build_gold_timeseries.py`
  - Leser features_agg dagsfiler
  - Normaliserer schema
  - Guardrails + quality
  - Skriver gold parquet + status JSON

- `pipeline/src/build_gold_weekly.py`
  - Leser gold parquet
  - Avleder ukentlig datasett (7d sums + WoW + baselines)

Orkestrering / verktøy:
- `pipeline/tools/full_pipeline.ps1`
  - End-to-end runner i 6 steg

- `pipeline/tools/download_up_to_date_minimal.py`
  - Ingest fra AWS Public Blockchain (aws s3 ls/sync)
  - Skriver report JSON

- `pipeline/tools/sync_gold_json_history.py`
  - Konverterer gold parquet til JSON-historikk for hosting/UI

- `pipeline/tools/validate_gold_parquet.py`
  - Quality gate for gold parquet (freshness, ranges, duplikater, nanosekund-bug)

- `pipeline/tools/export_meta_json.py`
  - Materialiserer META/overview JSON til fil (integrasjonspunkt mot API-lag)

- `pipeline/tools/export_meta_json_history.py`
  - Ekstra/alternativ eksport av META-historikk med mer logikk (tilstede i repoet, men ikke brukt i `full_pipeline.ps1` i snapshotet)

Andre:
- `README_DATA.txt`
  - Dokumenterer junction-basert data-layout

- `css_gui_pipeline.py`
  - GUI-runner (knapp for full pipeline) + setter miljøvariabler


