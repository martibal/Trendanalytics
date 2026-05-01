// src/lib/content/chainExplainers.ts

import type { ChainId } from "@/config/chains";

export type ExplainCopy = {
  short: string;
  basic: string;
  advanced: string;
  whyCare?: string;
  caveats?: string[];
};

export const CHAIN_PAGE_EXPLAINERS: Record<
  ChainId,
  {
    primer: ExplainCopy;
    demand: ExplainCopy;
    friction: ExplainCopy;
    capacity: ExplainCopy;
  }
> = {
  bitcoin: {
    primer: {
      short:
        "Bitcoin is an L1 UTXO network where block-space competition and confirmation timing dominate the user experience.",
      basic:
        "Bitcoin is the original blockchain payment network. Unlike Ethereum-style chains, it does not revolve around smart-contract gas execution. What matters most here is whether many users are trying to fit transactions into limited block space at the same time, how expensive that competition currently looks, and whether blocks are arriving at the pace the network usually expects. That is why this page focuses so much on transaction count, fees, and block-time behavior.",
      advanced:
        "In the uploaded regime engine, BTC is treated as a distinct profile. Demand uses tx_count_daily and unique_active_addresses; friction uses median_tx_fee_native; capacity uses avg_block_time_sec. The scorecard is slightly richer than the regime surface because it can also use transformed components such as tx_per_user and blocktime instability, but the published regime itself remains BTC-specific and intentionally avoids EVM-only semantics such as gas utilisation and failed-tx rate.",
      whyCare:
        "BTC users need to know whether the network currently looks ordinary, warming up, or crowded because that changes inclusion pressure, fee burden, and how much interpretive weight to place on the current operating state.",
      caveats: [
        "BTC capacity is proxied rather than observed through an EVM-style utilisation field.",
        "Short fee spikes can be real but temporary; historical context matters.",
      ],
    },
    demand: {
      short: "Demand asks how much real usage pressure the chain is currently carrying.",
      basic:
        "For Bitcoin, Demand is the 'how busy is the network really?' lens. It is not just about whether one whale moved coins once. It tries to capture whether usage pressure looks broad enough and persistent enough to matter. Higher Demand means the chain is busier than usual relative to its own recent history.",
      advanced:
        "On BTC, the regime engine emphasizes tx_count_daily and unique_active_addresses on the demand side. The scorecard can also use tx_per_user where available. Demand is therefore not a price concept and not a sentiment concept. It is a descriptive activity-pressure concept built from published network-usage fields and normalized relative to the chain's own recent distribution.",
      whyCare:
        "Because rising demand is often the first sign that the current state is moving away from ordinary conditions and toward a more notable regime.",
    },
    friction: {
      short: "Friction asks how difficult or expensive the chain currently feels to use.",
      basic:
        "On Bitcoin, Friction is mostly about fees. If users are competing harder for limited block space, they usually have to pay more to get included. Higher Friction means using the chain currently looks more costly or pressured than usual for Bitcoin itself.",
      advanced:
        "BTC has a thinner friction surface than EVM chains. In the uploaded profile, friction is centered on median_tx_fee_native. The scorecard can still transform that field to create a smoother comparative signal, but it does not have the same multi-field friction surface that an EVM L1 has with failed transaction rate and gas-specific execution pressure.",
      whyCare:
        "Because fee pressure is one of the clearest practical user costs on Bitcoin.",
    },
    capacity: {
      short: "Capacity asks how tight the system currently looks.",
      basic:
        "On Bitcoin, Capacity does not mean 'how much spare room exists' in a direct engineering sense. It means 'how constrained does the chain look right now relative to how it usually behaves?' Since Bitcoin does not publish EVM gas usage, block-time behavior becomes a useful proxy for whether the network currently looks tight or loose.",
      advanced:
        "In the uploaded regime engine, BTC capacity is proxied through avg_block_time_sec. In the scorecard, blocktime instability is also used as a transformed component. This means the capacity lens is not simply raw block time; it is a descriptive pressure proxy built from how block-time behavior deviates from the chain's own rolling baseline.",
      whyCare:
        "Because demand and friction are easier to interpret when you also know whether the network currently looks constrained.",
    },
  },
  ethereum: {
    primer: {
      short:
        "Ethereum is the main EVM base layer, so gas cost and block capacity are central to how users experience demand and congestion.",
      basic:
        "Ethereum is not just a payment chain. It is a programmable execution network, so demand does not only show up as 'more transfers' but also as more competition for computational space inside blocks. That is why Ethereum pages need stronger explanations around gas, utilisation, failure rate, and execution cost.",
      advanced:
        "The uploaded ETH L1 profile uses tx_count_daily and unique_active_addresses for demand, median_tx_fee_native and failed_tx_rate for friction, and gas_utilization_pct plus avg_block_time_sec for capacity context. This makes the ETH explanatory surface richer than BTC because execution scarcity is directly measurable through gas-based fields.",
      whyCare:
        "Because on Ethereum, cost and usability can change sharply when execution demand rises against finite block capacity.",
    },
    demand: {
      short: "Demand is the activity-pressure lens.",
      basic:
        "Higher Demand means the network is seeing more real usage than usual relative to its own history.",
      advanced:
        "Demand is built from demand-side metrics rather than from price or sentiment, and then normalized relative to ETH's own recent distribution.",
    },
    friction: {
      short: "Friction is the cost / difficulty lens.",
      basic:
        "Higher Friction means using the network currently looks more costly, failure-prone, or execution-tight than usual.",
      advanced:
        "Friction uses fee and failed-transaction information, so it is explicitly an operating-state surface rather than a valuation surface.",
    },
    capacity: {
      short: "Capacity is the tightness lens.",
      basic:
        "Higher Capacity score means tighter conditions, not more spare capacity.",
      advanced:
        "Capacity is interpreted as capacity pressure and uses gas-utilisation and block-time context rather than literal hardware throughput measures.",
    },
  },
  arbitrum: {
    primer: {
      short:
        "Arbitrum is an Ethereum-secured rollup, so cost and throughput depend on both local L2 conditions and parent-chain settlement mechanics.",
      basic:
        "Arbitrum can feel cheaper and faster than Ethereum mainnet, but that does not mean its operating state is simple. Local activity matters, and parent-chain publishing cost matters too. So the page needs to explain both the immediate L2 state and the fact that some pressure is inherited from settlement conditions.",
      advanced:
        "The uploaded L2 profile uses tx_count_daily and unique_active_addresses for demand, median_tx_fee_native and failed_tx_rate for friction, and capacity_util_pct plus avg_block_time_sec for capacity. That should be explained as an L2-specific descriptive model rather than as an ETH-mainnet clone.",
      whyCare:
        "Because users otherwise misread low headline fees as meaning the system cannot become tight or stressed.",
    },
    demand: {
      short: "Demand asks how much real usage pressure the rollup currently carries.",
      basic:
        "Higher Demand means more users or more activity are trying to use the rollup than usual.",
      advanced:
        "Demand is normalized relative to Arbitrum's own recent history and is not meant to be compared naively to L1 levels.",
    },
    friction: {
      short: "Friction asks how costly or difficult using the rollup currently looks.",
      basic:
        "Higher Friction means transactions are currently more costly or operationally less smooth than usual for Arbitrum.",
      advanced:
        "Friction can rise because of local execution conditions, parent-chain posting conditions, or both.",
    },
    capacity: {
      short: "Capacity asks how tight the rollup currently looks.",
      basic:
        "Higher Capacity means tighter operating conditions relative to recent Arbitrum history.",
      advanced:
        "Capacity is modeled through L2-appropriate fields and should not be interpreted as a literal copy of ETH-mainnet gas-utilisation semantics.",
    },
  },
  base: {
    primer: {
      short:
        "Base is an Ethereum Layer 2 where total cost reflects both local L2 execution and L1 publishing / security cost.",
      basic:
        "Base often feels cheap, but users still need to know whether that cheapness is stable, fading, or under pressure. A good explanatory page should make clear that Base transactions have both a local execution side and a parent-chain publication side.",
      advanced:
        "The uploaded L2 profile treats Base with the same broad model family as other rollups: demand from tx_count_daily and unique_active_addresses, friction from median_tx_fee_native and failed_tx_rate, and capacity from capacity_util_pct plus block-time context. The page should still explain Base-specific fee mechanics in plain language.",
      whyCare:
        "Because users otherwise mistake 'currently cheap' for 'structurally unconstrained'.",
    },
    demand: {
      short: "Demand is the local usage-pressure lens.",
      basic:
        "Higher Demand means more real onchain usage pressure than usual for Base.",
      advanced:
        "Demand is chain-relative, not an absolute comparison to ETH L1 scale.",
    },
    friction: {
      short: "Friction is the cost / difficulty lens.",
      basic:
        "Higher Friction means using Base currently looks more costly or less smooth than usual.",
      advanced:
        "On Base, friction can reflect both local L2 conditions and parent-chain publishing cost.",
    },
    capacity: {
      short: "Capacity is the tightness lens.",
      basic:
        "Higher Capacity means tighter operating conditions, not more room.",
      advanced:
        "Capacity uses L2-appropriate pressure fields and should be read as descriptive tightness relative to recent Base history.",
    },
  },
};

export const SHARED_EXPLAINERS = {
  regime: {
    short:
      "Regime is the page's compact label for the chain's current operating state.",
    basic:
      "Regime is the headline summary of what the chain currently looks like relative to its own recent history. It does not try to predict what will happen next. Instead, it answers a simpler question: if you had to summarize the current state in one descriptive label, what would that label be? The point of the regime label is to save the user from having to mentally combine every metric from scratch each time.",
    advanced:
      "In the uploaded regime engine, regime is not a free-form narrative. It is a rule-based descriptive classification built from demand, friction, and capacity evidence. The current rules are: CONGESTED when capacity is extreme-high or capacity-high plus friction-high; CHEAP when friction-low and capacity-low; HEATING when demand-high and at least one relevant axis is heating; otherwise STABLE. If confidence falls below the product threshold, the regime is overridden to UNKNOWN/DEGRADED.",
  },
  regimeValue: {
    short:
      "The specific regime label tells you which descriptive state the model thinks best fits the current evidence.",
    basic:
      "A label such as HEATING is meant to catch your attention, but not to scare you or instruct you. It says the current mix of evidence looks more like 'usage pressure is building' than 'the chain is simply normal'. The reason to surface this visibly is that most users do not want to parse every axis and every chart before getting the headline state.",
    advanced:
      "The current regime value is a downstream summary of the published rule set, not a separately trained score. It should therefore be read together with confidence, drivers, and scorecard axes. In other words, the label is the summary and the rest of the page is the evidence layer explaining why that summary was emitted.",
  },
  stable: {
    short: "Stable means the chain looks broadly ordinary relative to its own recent history.",
    basic:
      "Stable does not mean 'nothing is happening'. It means the page does not see a strong enough combination of evidence to call the current state unusually hot, crowded, or unusually loose. You can still have active charts and moving metrics while remaining Stable.",
    advanced:
      "Stable is the residual label when higher-priority regime conditions do not fire and confidence is above the gating floor. It should be read as 'no stronger descriptive regime rule currently dominates', not as 'all metrics are exactly neutral'.",
  },
  heating: {
    short:
      "Heating means usage pressure looks like it is building rather than staying flat.",
    basic:
      "Heating is the 'something is warming up' label. It usually means demand is elevated enough, and the short-term pattern is strong enough, that the page sees genuine building pressure rather than a one-day blip. That is useful because users usually want to know not only whether activity is high, but whether it is actively strengthening.",
    advanced:
      "In the uploaded regime engine, HEATING requires demand-high plus at least one HEATING trend among demand, friction, or capacity axes. So the label is explicitly about elevated demand with acceleration, not just a high level in isolation. That is why a chain can be busy without necessarily being labeled HEATING.",
  },
  congested: {
    short:
      "Congested means the chain looks crowded or constrained relative to its own history.",
    basic:
      "Congested is the label for a chain that looks genuinely tight. In plain English: using it appears harder or more crowded than usual, often with higher cost or tighter capacity conditions.",
    advanced:
      "In the uploaded rules, CONGESTED is a cross-axis state: capacity extreme-high alone is enough, or capacity high plus friction high. So congestion is not merely 'fees are up'. It is a combined descriptive state where tightness and operating difficulty align strongly enough to justify the label.",
  },
  cheap: {
    short:
      "Cheap means the chain looks unusually unconstrained relative to its own history.",
    basic:
      "Cheap does not mean the token is cheap. It means using the network currently looks easier and less pressured than usual, with low operating friction and low capacity pressure.",
    advanced:
      "In the uploaded rules, CHEAP is emitted when friction-low and capacity-low hold together. It is therefore a network-state label about operating conditions, not a valuation label or an investment opinion.",
  },
  unknownDegraded: {
    short:
      "Unknown/Degraded means the page is deliberately withholding a stronger regime claim because the evidence is not sufficient.",
    basic:
      "This label exists to stop the page from sounding more certain than it should. The data can still be shown, but the page refuses to present a normal regime headline when the support underneath that headline is too weak.",
    advanced:
      "This is a confidence gate, not an economic regime. If confidence is below the product floor, the regime layer is overridden so the page does not overclaim. That makes UNKNOWN/DEGRADED a safety label about evidence quality rather than a separate market condition.",
  },
  confidence: {
    short:
      "Confidence tells you how much evidence the page has behind the current descriptive state.",
    basic:
      "Confidence is not saying 'there is a 76% chance this regime is true'. It is saying how well-supported the current page reading is by usable, recent, and sufficient evidence. Higher confidence means the page has a stronger basis for speaking clearly. Lower confidence means you should read the state more cautiously.",
    advanced:
      "In your patched backend, confidence is an evidence-sufficiency score rather than a probabilistic forecast score. It is the quantity used by the regime gate. The key user-facing implication is that confidence should be interpreted as support for the current descriptive classification, not as an out-of-sample accuracy estimate or continuation probability.",
  },
  confidenceBand: {
    short: "The band label is a reading aid layered on top of the raw confidence score.",
    basic:
      "Good means the current state is well supported. Caution means the page still publishes a normal state, but the evidence is thinner than ideal. Degraded means the evidence is too weak for a normal regime label and the page should withhold stronger interpretation.",
    advanced:
      "The raw score is the important quantity. Band labels such as Good or Caution are UI summaries. The critical threshold is 0.40: below that, the regime should be treated as UNKNOWN/DEGRADED. A 0.67 reading and a 'Reduced confidence' warning should not coexist; the warning logic should be tied to the actual band semantics rather than to vague cautionary prose.",
  },
  determinism: {
    short:
      "Determinism tells you that the page's current output is rule-based and reproducible rather than arbitrary.",
    basic:
      "This box exists because serious users want to know whether the headline state is hand-wavy or reproducible. The answer is: the page is meant to be reproducible. The hash is a compact fingerprint of the ruleset and output context, and window days tells you how much recent history the regime layer looked at.",
    advanced:
      "The determinism hash is an audit-oriented identifier derived from the regime payload and rule context. The frontend does not decode or reinterpret it; it simply exposes it so users can verify that the same ruleset and evidence surface produce the same descriptive output. Window days is equally important because the label depends on a specific historical lens, not on an undefined notion of 'recent'.",
  },
  scorecard: {
    short:
      "The scorecard breaks the current state into Demand, Friction, and Capacity so the user can see where the pressure is coming from.",
    basic:
      "The scorecard exists because a single regime label is useful, but too compressed. Demand tells you about activity pressure, Friction tells you about cost or difficulty, and Capacity tells you about tightness. Together they answer: what kind of state is this, and where is the pressure actually coming from?",
    advanced:
      "In your uploaded scorecard code, each axis is transformed to a 0–100 scale where 50 is neutral versus the chain's own history. The displayed scores are then degraded toward 50 using coverage_factor and effective_confidence so the UI does not exaggerate weak evidence. That shrinkage rule is one of the most important explanatory points on the page and should be surfaced explicitly.",
  },
  demand: {
    short: "Demand is the usage-pressure axis.",
    basic:
      "Demand asks whether the chain currently looks busier than usual. 'Normal' means roughly normal relative to the chain's own recent history, not normal relative to some abstract global crypto average.",
    advanced:
      "Demand is an axis-level summary built from demand-side component metrics. It should be read as a comparative historical score inside the current methodology, not as an absolute scale across chains.",
  },
  friction: {
    short: "Friction is the cost / difficulty axis.",
    basic:
      "Friction asks whether using the chain currently looks easier or harder than usual. Higher friction means more cost, more difficulty, or more operating pressure for the user.",
    advanced:
      "Friction is not a sentiment metric. It is a descriptive operating-state axis built from fee and failure-related components where available.",
  },
  capacity: {
    short: "Capacity is the tightness axis.",
    basic:
      "Capacity here means pressure on available room, not spare room itself. So a higher Capacity score means the system looks tighter, not freer.",
    advanced:
      "The scorecard interprets capacity as capacity pressure. That is why labels such as Tight / Balanced / Slack are better than 'high capacity' or 'low capacity' in plain English.",
  },
  coverage: {
    short: "Coverage tells you how complete the supporting evidence is for that axis.",
    basic:
      "Coverage is a reality check. It tells you whether the axis score is built from enough of the intended evidence or whether parts of that evidence are thin or missing.",
    advanced:
      "coverage_factor is a published multiplier used to reduce how strongly an axis score is allowed to move away from neutral when the underlying evidence surface is incomplete.",
  },
  effectiveConfidence: {
    short:
      "Effective confidence is the confidence the axis effectively gets after coverage is taken into account.",
    basic:
      "Even if the overall page confidence is decent, a single axis can still deserve caution if the evidence for that axis is incomplete. Effective confidence tells you that axis-level version of the story.",
    advanced:
      "In the uploaded scorecard implementation, effective_confidence is the combination of confidence_score and coverage_factor used to shrink displayed axis scores back toward 50 when evidence is weaker.",
  },
  drivers: {
    short:
      "Drivers are the evidence rows that explain why the current regime looks notable.",
    basic:
      "Drivers answer the question 'why is the page saying this?'. The regime label is the summary; the drivers are the leading published metrics that currently stand out enough to help explain that summary.",
    advanced:
      "The current page does not show every possible driver candidate. It shows the strongest few published driver rows after regime-consistency filtering and deterministic ranking. So seeing only tx_count_daily in a BTC demand case does not mean that is the only metric in the model; it means that is the strongest currently surfaced published driver for the visible regime.",
  },
  currentSummary: {
    short:
      "The current summary is the shortest possible plain-language reading of the chain's present state.",
    basic:
      "This is the one-sentence version of the page. It exists because many users want to know the current take immediately, before digging into the evidence underneath.",
    advanced:
      "The summary should be treated as the descriptive front layer that sits on top of regime, scorecard, and driver evidence. It should never be more assertive than the underlying confidence and freshness allow.",
  },
};

export const METRIC_EXPLAINERS: Record<string, ExplainCopy> = {
  tx_count_daily: {
    short: "Confirmed transactions per day — a core demand metric.",
    basic:
      "This metric counts how many transactions were actually confirmed onchain during the day. For most users, it is one of the clearest first checks of whether a network looks quiet, normal, or busy. It matters because rising transaction count often means more competition for block space or execution capacity, especially when the increase lasts longer than a day or two.",
    advanced:
      "tx_count_daily is one of the primary demand-side fields in the uploaded profile definitions. It is useful because it is simple, interpretable, and chain-native. However, it is not enough by itself: a higher count can reflect broad participation, bursty automation, or application-specific activity. That is why it should be read with active addresses, fees, and the scorecard / driver context rather than as a standalone verdict.",
  },
  unique_active_addresses: {
    short: "Unique active addresses per day — a breadth-of-participation metric.",
    basic:
      "This metric tries to say whether activity is broad or narrow. Rising active addresses often means more participants are touching the network, not just a few heavy users doing more transactions.",
    advanced:
      "In the uploaded regime profiles, unique_active_addresses sits on the demand side. It should be treated as a breadth signal, with the usual caveat that address count is not the same thing as unique human count. It is still useful because it complements tx_count_daily by showing whether current activity looks wider, not just heavier.",
  },
  median_tx_fee_native: {
    short: "Median transaction fee in the native asset — a core friction metric.",
    basic:
      "This tells you what a typical user was paying to transact, in the chain's own native unit. It matters because rising fees are one of the most immediate ways users feel congestion or operating pressure.",
    advanced:
      "The median is used rather than a raw mean because it is more robust to extreme outliers. In the current model family, this field is one of the main friction anchors across chains. On BTC it is especially important because the friction surface is thinner than on EVM chains.",
  },
  avg_block_time_sec: {
    short: "Average time between blocks in seconds — a pacing / capacity proxy.",
    basic:
      "This metric helps show whether the chain is producing blocks at the pace it usually does. If the pace changes persistently, that can affect how tight or loose the network currently feels.",
    advanced:
      "In the uploaded code, avg_block_time_sec is not always read directly as a 'higher is worse' scalar. It can also be transformed into an instability-style proxy for the scorecard. On BTC in particular, it acts as a practical capacity-side anchor because there is no EVM gas-utilisation field.",
  },
  gas_utilization_pct: {
    short: "Average block gas utilisation — how full EVM blocks are.",
    basic:
      "This is a direct 'how full are the blocks?' style metric. Higher values mean blocks are more packed with computation and the network has less slack.",
    advanced:
      "This is one of the clearest capacity-pressure fields on EVM L1. It becomes especially informative when read together with median_tx_fee_native and failed_tx_rate because those three together describe demand-versus-capacity pressure more clearly than any single one of them alone.",
  },
  failed_tx_rate: {
    short: "Share of transactions that failed — an EVM friction signal.",
    basic:
      "This helps show whether using the chain is currently error-prone or wasteful. A higher failed rate can mean the environment is harder to navigate or more competitive than usual.",
    advanced:
      "In the uploaded profiles, failed_tx_rate sits on the friction side for ETH and L2s. It is absent for BTC because the semantics are not equivalent there. That chain-specific absence should be explained explicitly rather than silently treated as if it were universal.",
  },
};
