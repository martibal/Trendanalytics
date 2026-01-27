README — CSS Trend Observatory (status pr 2026-01-23)
=====================================================

Denne README-en beskriver i detalj (1) dataflyt og filstruktur, (2) pipeline-kjøring og robusthet (incremental, uten å fylle disken),
(3) hvordan web-appen leser og validerer JSON (Zod), (4) hvordan GUI-en starter pipeline og åpner nettsiden, samt (5) en komplett
spørsmålsliste til “neste chat” for videre design/utvikling av en fullverdig, interaktiv og “proff” nettside.

Viktig kontekst (forventet data-lag)
-----------------------------------
- Bitcoin + Ethereum: “gold/meta” oppdateres typisk til gårsdagen (publish-lag ~ 1 dag).
- Arbitrum + Base: data leveres med ~1 ukes lag (publish-lag ~ 7 dager). Dette er forventet og skal ikke flagges som feil i UI,
  men som “stale” ift policy.

Kjapp oversikt: hva systemet gjør (end-to-end)
----------------------------------------------
1) Pipeline laster ned/matcher rådata (parquet / råfiler) INKREMENTELT slik at den ikke re-laster alt.
2) Pipeline beregner aggregerte features (intermediate parquet) og deretter:
   - GOLD JSON (verdier brukt i UI per chain per dato, samt latest.json per chain)
   - META JSON (status, confidence, regime, scorecard, updated_through osv, samt latest.json per chain)
3) Pipeline synker beregnet JSON til web-prosjektet, og videre til web/public/data slik at web kan servere data statisk.
4) Web-appen laster `/data/gold/<chain>/latest.json` og `/data/meta/<chain>/latest.json` i browser, validerer med Zod, og viser:
   - Data Health / coverage/freshness
   - Oversikt per chain
   - Chain-detaljsider

Fil- og mappe-struktur (konseptuelt)
------------------------------------
Repo root: `D:\CSS\main`

Viktige rotmapper:
- `pipeline\`               — alt som gjelder pipeline (python + PS1)
- `data\`                   — dataområde for beregnet output som kan synkes til web
- `web\`                    — Next.js webapp (dev + export til dist + serve-dist)

Pipeline-work (midlertidig/arbeidsområde):
- `pipeline\_work\prod\`  — pipeline “prod” arbeidskatalog
  - `raw\`                  — nedlastet rå/inputs (kan være stor)
  - `features_agg\<chain>\YYYY-MM-DD.parquet`  — daglige aggregerte features (intermediate)
  - `gold\`                 — generert gold-output (kilde til gold json historikk)
  - (ev. flere underfoldere avhengig av pipeline)

Beregnet (kilde til web):
- `data\calculated\gold\<chain>\YYYY-MM-DD.json`
- `data\calculated\gold\<chain>\latest.json`
- `data\calculated\meta\<chain>\YYYY-MM-DD.json`
- `data\calculated\meta\<chain>\latest.json`

Web-kopier (før publisering):
- `web\data\css_json\...`       — kopi av gold-json historikk (fra data/calculated/gold)
- `web\data\css_json_meta\...`  — kopi av meta-json historikk (fra data/calculated/meta)

Web-server (det som faktisk brukes av nettsiden):
- `web\public\data\gold\<chain>\...`
- `web\public\data\meta\<chain>\...`
- `web\public\data\manifest.json`  (Data Health-siden bruker denne)

Merknad: “public/data” er det viktigste for web. Alt i `web\public\...` blir servert på URL:
- `http://localhost:3000/data/...` (dev)
- `dist` / statisk export: samme relative path.

JSON-formater (konkret)
-----------------------
A) GOLD: `/data/gold/<chain>/latest.json`
- Typisk innhold (eksempel fra UI / keys preview):
  - `date` (YYYY-MM-DD)
  - `chain` ("bitcoin" | "ethereum" | "arbitrum" | "base")
  - `tx_count_daily`
  - `block_count_daily`
  - `value_transferred_native`
  - `median_tx_value_native`
  - `median_tx_fee_native`
  - `failed_tx_rate`
  - `gas_utilization_pct`
  - `unique_active_addresses`
  - `avg_block_time_sec`
  - (kan ha flere felt; schema tillater typisk “passthrough”/ekstra felter der det er hensiktsmessig)

B) META: `/data/meta/<chain>/latest.json`
- Eksempel: `data/meta/bitcoin/latest.json` (sample fra opplastet fil)
- Toppnivå keys (observed): chain, missing, profile, gold_status, confidence, scorecard, regime, updated_through, publish_lag_days_policy, tier_used, status
- Viktige felt:
  - `chain`: string
  - `updated_through`: YYYY-MM-DD (hvilken dato meta dekker opp til)
  - `publish_lag_days_policy`: f.eks 1 for BTC/ETH og 7 for ARB/BASE (brukes i UI for freshness-forventning)
  - `status`: helhetlig status (OK/FAIL/DEGRADED etc)
  - `regime`: regime-objekt (kan inneholde axes demand/friction/capacity m.m.)
  - `confidence`: confidence-objekt
  - `scorecard`: scoring/diagnostikk
  - `missing`: felter/mangler
  - `profile`: beskrivende metadata (merk: i tidlige feil ble `profile.note` = null, forventet string)

Synk og publisering: hvilke filer blir “sannhet” for web
--------------------------------------------------------
Web-appen leser alltid fra:
- `web/public/data/gold/<chain>/latest.json`
- `web/public/data/meta/<chain>/latest.json`
- `web/public/data/manifest.json` (Data Health)

Det betyr at du alltid kan verifisere lokalt at web vil lese “riktige” data ved å sammenligne:
- `data\calculated\...`  (pipeline sin endelige beregning)
- `web\data\...`         (mellomlager i web-prosjektet)
- `web\public\data\...` (det som serveres)

(Praktisk verifisering)
- PowerShell: `Get-FileHash` er enklest for binær/tekst-sammenligning.
  Eksempel:
  - `Get-FileHash D:\CSS\main\data\calculated\gold\bitcoin\latest.json`
  - `Get-FileHash D:\CSS\main\web\public\data\gold\bitcoin\latest.json`
  Hash skal matche.

Pipeline: hvordan den kjøres (CLI)
----------------------------------
Primær “full pipeline”:
- Kjøres fra repo root:
  `powershell -NoProfile -ExecutionPolicy Bypass -File .\pipeline\tools\full_pipeline.ps1`

Forventet loggflyt (observerte steg):
- STEP 1: Ingest/download (incremental)
- STEP 2: feature_daily_agg (skriver features_agg parquet per chain per dag)
- STEP 3: (beregner/genererer gold-output i pipeline/_work/prod/gold)
- STEP 4: Sync GOLD JSON history -> data/calculated/gold
- STEP 5: Export META JSON history -> data/calculated/meta
- Deretter (integrert eller via GUI): sync `data/calculated` -> `web/public/data`

Hvorfor parquet i det hele tatt?
- Parquet brukes som effektiv mellomlagring for daglige features og/eller rådata i pipeline.
- Web bruker IKKE parquet. Web bruker kun JSON i `web/public/data/...`.
- At pipeline skriver `features_agg\<chain>\YYYY-MM-DD.parquet` er normalt (intermediate).
  Det du “publiserer” til web er JSON output (gold+meta).

Robusthet: “incremental” og diskbruk
------------------------------------
Målet er: IKKE re-laste ned eller re-beregne hele historikken hvis ikke nødvendig.

Prinsipp:
- Pipeline avgjør “start date” basert på hva som allerede finnes lokalt under raw/features.
- Hvis pipeline ikke klarer å finne “latest local RAW day”, vil den falle tilbake til en hardkodet startdato (eks: 2024-12-01).
  Dette kan trigge mange dager med beregning. Årsak: katalogstruktur mangler eller er tom.

Hva du skal sjekke hvis du ser “den laster alt på nytt”:
1) Finnes det data under `D:\CSS\main\data\raw` (eller pipeline sin raw-root)?
   - Logg: “Latest local RAW day could not be determined under ...”
2) Stemmer parameterne pipeline sender til python-script (root/raw-root/start)?
   - Tidligere feil: python-scripts fikk ikke påkrevde CLI-argumenter og returnerte rc=2.
3) Er `Mode: incremental` aktiv og implementert i python-scripts?
4) Hvis du vil “tvinge” pipeline til å være konservativ:
   - Ikke slett raw/features_agg.
   - Unngå å endre path-konvensjoner uten migrering.

PerformanceWarning i polars (ikke kritisk)
------------------------------------------
Du så meldinger av typen:
- “Determining the column names of a LazyFrame requires resolving its schema ...”
Dette er en advarsel om potensiell kostnad, ikke en feil.
Det påvirker ikke korrekthet, men kan optimaliseres i python-kode ved å bruke
`LazyFrame.collect_schema().names()` der det er relevant.

Sync til web: hvordan data flyttes til web/public/data
------------------------------------------------------
Det finnes et eget PS1-script:
- `.\pipeline\tools\sync_web_data.ps1`

Observerte parametre i logg:
- calcGold = `D:\CSS\main\data\calculated\gold`
- calcMeta = `D:\CSS\main\data\calculated\meta`
- webGold  = `D:\CSS\main\web\data\css_json`
- webMeta  = `D:\CSS\main\web\data\css_json_meta`
- kjører deretter: `node scripts/sync-data.mjs` i `D:\CSS\main\web`
- resultat:
  - `web\public\data\gold`
  - `web\public\data\meta`

Kort fortalt:
1) Kopier fra `data\calculated\...` inn i `web\data\...`
2) Kjør `web\scripts\sync-data.mjs` som synker `web\data\...` -> `web\public\data\...`

Manifest: Data Health-siden
---------------------------
Data Health-siden forventer en fil:
- `web\public\data\manifest.json`
som serveres på:
- `/data/manifest.json`

Du genererer den via:
- `node .\scripts\write-manifest.mjs` (kjøres i `web`-mappa)
Dette ble bekreftet i logg: “wrote ...\public\data\manifest.json”

Web: dev, typecheck, export, serve-dist
---------------------------------------
Web er en Next.js app (Next 14.2.5 i loggene).

Vanlige kommandoer fra `D:\CSS\main\web`:
- `npm run typecheck`    — `tsc --noEmit`
- `npm run dev`          — starter dev-server på http://localhost:3000
- `npm run export`       — bygger statisk export til `web\dist`
- `npm run open` / `npm run open:build` (brukes av GUI)
  - `open:build` kjører typisk build+export og starter `serve-dist`
- `node .\scripts\serve-dist.mjs` (direkte) — serverer `dist` lokalt på 127.0.0.1:<port>

Data base URL (kritisk)
-----------------------
Web kan enten:
A) Lese data lokalt (relative paths) fra `web/public/data/...`
B) Lese data fra en ekstern base URL (CDN/bucket)

Dette styres av miljøvariabel:
- `NEXT_PUBLIC_DATA_BASE_URL`

Fallgruve:
- Hvis du setter den til en “invalid” URL (f.eks. `https://example.invalid/css-data`)
  vil web få nettverksfeil (ERR_NAME_NOT_RESOLVED) og alt blir FAIL.
- For lokal dev: sett den til tom / fjern den.
  I praksis via `web\.env.local`:
  - OK (lokal): `NEXT_PUBLIC_DATA_BASE_URL=` (tom)
  - eller slett `.env.local` helt om du ikke trenger den.

Routing: chain-sider og “undefined”
-----------------------------------
Du så feil der web forsøkte å hente:
- `/data/gold/undefined/latest.json`
Det betyr: route-param `chain` var `undefined` i client.

Løsningen som ble etablert:
- Bruk en dynamisk route: `web/app/chain/[chain]/page.tsx`
- Sørg for at `generateStaticParams()` er eksportert når appen bygges med static export,
  slik at Next vet hvilke ruter som eksisterer (bitcoin/ethereum/arbitrum/base).
- Sørg for at `ChainClient` tar inn `chain` og validerer at den er en av de tillatte verdiene.

I perioden med rydding ble de gamle per-chain sidene midlertidig omdøpt til:
- `app/chain/bitcoin_OLD/`, `ethereum_OLD/`, `arbitrum_OLD/`, `base_OLD/`
og filen `ChainClient.tsx` ble kopiert inn i `app/chain/[chain]/` for å dele logikk.

Hvis du ser feil “Module not found: ./ChainClient”:
- Filen mangler i `app/chain/[chain]/ChainClient.tsx` eller import-path er feil.
- Løsning: kopier en fungerende `ChainClient.tsx` til denne mappen.

GUI: css_gui_pipeline.py — hvordan den fungerer (praktisk)
----------------------------------------------------------
GUI-en heter: `css_gui_pipeline.py` (ligger i repo root eller et kjent sted du kjører fra).

GUI har tre hovedknapper (basert på skjermbilder/logg):
1) “Kjør pipeline”
   - kjører full pipeline-scriptet:
     `D:\CSS\main\pipeline\tools\full_pipeline.ps1`
2) “Rebuild pipeline”
   - kjører pipeline i en “rebuild/clean” modus (typisk mer omfattende)
3) “Åpne nettsiden”
   - kjører en web-kommando i `D:\CSS\main\web`, typisk:
     `cmd /c npm run open:build`
   - og/eller starter `serve-dist`

Viktig: Node/npm på PATH
- Du opplevde feilen: “Fant ikke node/npm på PATH” og “'npm' is not recognized ...”
- Dette løses ved å installere Node.js (inkl npm) og åpne nytt terminalvindu, eller sikre at PATH peker på Node.
- Når Node/npm er tilgjengelig, fungerer “Åpne nettsiden” og web-kommandoer fra GUI.

Filsamspill (hva som avhenger av hva)
-------------------------------------
Pipeline (produserer data):
- `full_pipeline.ps1` orchestrerer python scripts (download + feature + gold/meta eksport)
- Output ender i `data\calculated\gold` og `data\calculated\meta`

Sync til web (flytter data):
- `sync_web_data.ps1` kopierer calculated -> web/data og kjører `web/scripts/sync-data.mjs`
- `write-manifest.mjs` lager `web/public/data/manifest.json`

Web (konsumerer data):
- Leser data fra `web/public/data/...` med fetch i browser
- Validerer JSON med Zod schema (for å gi presise feilmeldinger)

Sjekkliste: lokal “truth gate” før sky-push
-------------------------------------------
Kjør dette før du publiserer:
1) Pipeline OK:
   - `full_pipeline.ps1` ender med “=== PIPELINE OK ===”
2) Sync OK:
   - `sync_web_data.ps1` ender med “=== SYNC WEB DATA OK ===”
3) Manifest OK:
   - `web/public/data/manifest.json` finnes
   - Data Health-siden viser “OK: /data/manifest.json”
4) Web i dev:
   - `npm run dev` og åpne http://localhost:3000
   - Forsiden viser 4/4 OK og riktige datoer
   - Chain-sider: `/chain/bitcoin`, `/chain/ethereum`, `/chain/arbitrum`, `/chain/base` fungerer
5) Web i dist:
   - `npm run open:build` (eller `npm run export` + `npm run open`)
   - Dist-server viser samme resultat
6) Verifiser at base URL er riktig:
   - Lokal: `NEXT_PUBLIC_DATA_BASE_URL=` (tom)
   - Sky: settes til CDN/bucket URL som faktisk har `/data/gold/...` og `/data/meta/...`

Hva som ble endret/innført i denne iterasjonen (oppsummering)
-------------------------------------------------------------
1) Stabil data-sync:
   - `data/calculated/*` -> `web/data/css_json*` -> `web/public/data/*`
2) Zod-validering og tydelige feilmeldinger i UI:
   - “stage: network/http/schema” med message+details for enkel debugging
3) Freshness-policy per chain:
   - BTC/ETH policy 1d; ARB/BASE policy 7d (forklarende tekst i UI)
4) Data Health-siden + manifest:
   - `write-manifest.mjs` genererer `public/data/manifest.json`
   - UI leser manifest først (“truth gate”)
5) Rydding av routing:
   - dynamisk route `app/chain/[chain]/page.tsx` + `generateStaticParams`
   - gjenbruk av `ChainClient.tsx`
6) Skille mellom:
   - pipeline intermediate (parquet)
   - web-ready (json)

Kjente problemer/varsler (og hva de betyr)
------------------------------------------
- “Prop style did not match”:
  - Kommer ofte fra Dark Reader eller små serialiseringsforskjeller i inline-style mellom server/client.
  - Ikke datarelatert. Kan ryddes senere ved å flytte styles til CSS-klasser eller unngå dynamiske style-objekter i SSR.
- 404 for favicon:
  - Legg favicon i `web/public/favicon.ico` hvis ønskelig.
- Polars PerformanceWarning:
  - Ikke kritisk; kan optimaliseres senere.

SPØRSMÅL TIL NESTE CHAT (for å designe den endelige nettsiden)
--------------------------------------------------------------
Mål: neste chat skal lese denne README og deretter stille disse spørsmålene — og så starte design/implementasjon.

A) Produktmål og brukerreise
1) Hvem er primærbruker (deg selv, investorer, team, offentlig)? Hvilken kompetanse?
2) Hva er den viktigste “hovedhistorien” siden skal fortelle på forsiden?
3) Hvilke handlinger skal brukeren gjøre (lese status, sammenligne chains, dykke i tid, eksportere, dele lenker)?
4) Skal nettsiden være 100% statisk (Next export) eller kan den bruke server (API routes)?

B) Datapresentasjon og “depth”
5) Hvilke grafer er must-have per chain? (f.eks. 7/30/90/365d trend for tx_count, median fee, value transferred osv.)
6) Hvilke “interaktive” kontroller trengs? (tidsvindu, smoothing, log/lin, sammenligning av flere chains, toggles)
7) Hvordan skal “regime” visualiseres? (terning/heatmap, radar, timeline med regime-skift)
8) Skal vi vise “confidence” og “scorecard” som egne komponenter med forklaringer?

C) IA (informasjonarkitektur)
9) Hvilke toppnivåsider skal finnes? (Home, Data Health, Chain detail, Compare, Methodology, Changelog)
10) Skal det være en “Compare”-side der du kan plotte flere chains i samme graf?
11) Skal det være en “Metrics library”-side som dokumenterer alle feltene i GOLD/META?

D) Design / “fancy og proff”
12) Hvilket visuelt uttrykk ønsker du? (mørk, “terminal-lux”, finans-dashboard, minimalistisk)
13) Skal vi bruke et UI-bibliotek (shadcn/ui, Radix) og et chart-bibliotek (Recharts, ECharts, Plotly)?
14) Ønsker du animasjoner (subtile transitions) eller helt statisk?
15) Skal vi ha “status chips” + fargekodet regime, og et konsistent fargesystem?

E) Robusthet og feilsøking (non-negotiables)
16) Hvilke feiltyper skal vises, og hvor mye? (network/http/schema/missing)
17) Skal UI alltid vise “hva forventes” (policy) og “hva observeres” (lag i dager)?
18) Ønsker du en debug-panel som viser raw JSON for gold/meta og schema-versjon?

F) Deploy og drift
19) Hvor skal data hostes (S3 + CloudFront, annen CDN)? Hvilken URL blir `NEXT_PUBLIC_DATA_BASE_URL`?
20) Skal manifestet inneholde checksum/hash for integrity-check i web?
21) Hvor ofte kjøres pipeline, og hvordan publiseres web (CI/CD)?

G) Backlog / next increments
22) Trenger du historiske sider (per dato) eller kun latest + grafer (som henter day-files)?
23) Skal vi optimalisere datamengde (pre-aggregere vinduer 7/30/90/365 i pipeline vs klientberegning)?
24) Skal vi ha søk, filtrering, og “alerts” på statusendringer?

----

Hvis du gir denne README-en til en ny chat, skal du kunne si:
"Les README, still meg spørsmålene på slutten, og start implementasjon av nettsiden."

(EOF)
