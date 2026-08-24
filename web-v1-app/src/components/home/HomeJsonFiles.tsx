"use client";

import { useEffect, useState } from "react";
import styles from "./HomeJsonFiles.module.css";

type ArtifactName = "Gold" | "Derived" | "Meta" | "Briefs";
type JsonPayload = unknown;

type Props = {
  chain: string;
  date: string;
  artifacts: Record<ArtifactName, JsonPayload | null>;
};

const layers: Array<{
  artifact: ArtifactName;
  step: string;
  role: string;
  description: string;
}> = [
  {
    artifact: "Gold",
    step: "01",
    role: "Raw evidence",
    description: "Normalized daily network measurements — the stable analytical base for the observation.",
  },
  {
    artifact: "Derived",
    step: "02",
    role: "Feature layer",
    description: "Robust chain-relative baselines, rolling context and derived features calculated from Gold.",
  },
  {
    artifact: "Meta",
    step: "03",
    role: "Meta decision",
    description: "The joinable regime row with Evidence score, axes, methodology version and provenance.",
  },
  {
    artifact: "Briefs",
    step: "04",
    role: "Delivery",
    description: "A readable explanation generated from the same published state and evidence trail.",
  },
];

export default function HomeJsonFiles({ chain, date, artifacts }: Props) {
  const [openArtifact, setOpenArtifact] = useState<ArtifactName | null>(null);

  useEffect(() => {
    if (!openArtifact) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenArtifact(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [openArtifact]);

  return (
    <section className={styles.section} id="ua6-data" aria-labelledby="ua6-json-heading">
      <div className={styles.shell}>
        <div className={styles.heading}>
          <div>
            <p className={styles.kicker}>What Urd Atlas actually gives you</p>
            <h2 id="ua6-json-heading">Four JSON files. One daily observation.</h2>
          </div>
          <p>
            The classification is deliberately compact, but the evidence behind it stays inspectable. These are the
            four actual published layers for the selected chain and date — not synthetic previews.
          </p>
        </div>

        <div className={styles.track} aria-label="Published JSON layers">
          {layers.map((layer) => (
            <button
              key={layer.artifact}
              type="button"
              className={styles.layer}
              onClick={() => setOpenArtifact(layer.artifact)}
              aria-label={`Open complete ${layer.artifact} JSON for ${chain}`}
            >
              <span className={styles.step}>{layer.step}</span>
              <span className={styles.role}>{layer.role}</span>
              <strong>{layer.artifact === "Briefs" ? "Briefs" : layer.artifact}.json</strong>
              <span className={styles.description}>{layer.description}</span>
              <span className={styles.open}>Open complete latest.json ↗</span>
            </button>
          ))}
        </div>

        <div className={styles.context}>
          <span>{chain.toUpperCase()}</span>
          <span>{date}</span>
          <span>Click any layer to inspect the complete published JSON</span>
        </div>
      </div>

      {openArtifact ? (
        <div className={styles.modalBackdrop} role="presentation" onClick={() => setOpenArtifact(null)}>
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-label={`${openArtifact} JSON for ${chain}`}
            onClick={(event) => event.stopPropagation()}
          >
            <header className={styles.modalHeader}>
              <div>
                <small>{chain.toUpperCase()} · {date}</small>
                <strong>{openArtifact}.json · complete latest.json</strong>
              </div>
              <button type="button" onClick={() => setOpenArtifact(null)}>Close</button>
            </header>
            <nav className={styles.modalNav} aria-label="JSON layers">
              {layers.map((layer) => (
                <button
                  type="button"
                  key={layer.artifact}
                  className={layer.artifact === openArtifact ? styles.active : undefined}
                  onClick={() => setOpenArtifact(layer.artifact)}
                >
                  {layer.artifact}
                </button>
              ))}
            </nav>
            <pre>{JSON.stringify(artifacts[openArtifact] ?? null, null, 2)}</pre>
          </div>
        </div>
      ) : null}
    </section>
  );
}
