"use client";

import React from "react";

export function PanelPurpose(props: {
  whatThisShows: string; // 1–2 sentences
  commonlyUsedFor: string[]; // 3–5 bullets
  learnMoreHref?: string;
  className?: string;
}) {
  const what =
    typeof props.whatThisShows === "string" ? props.whatThisShows.trim() : "";
  const bullets = Array.isArray(props.commonlyUsedFor)
    ? props.commonlyUsedFor
        .map((s) => (typeof s === "string" ? s.trim() : ""))
        .filter(Boolean)
        .slice(0, 5)
    : [];

  return (
    <div
      className={`mt-4 rounded-2xl border border-ui-border bg-ui-bg/15 p-4 ${
        props.className ?? ""
      }`}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-ui-faint">
            What this shows
          </div>
          <div className="mt-2 text-sm text-ui-muted leading-relaxed">
            {what.length ? what : "—"}
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-ui-faint">
              Commonly used for
            </div>

            {props.learnMoreHref ? (
              <a
                className="text-[11px] font-semibold text-ui-muted underline underline-offset-2 hover:text-ui-text"
                href={props.learnMoreHref}
              >
                Learn more
              </a>
            ) : null}
          </div>

          {bullets.length ? (
            <ul className="mt-2 space-y-1 text-sm text-ui-muted">
              {bullets.map((b, i) => (
                <li key={i} className="leading-relaxed">
                  <span className="mr-2 text-ui-faint">•</span>
                  {b}
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-2 text-sm text-ui-muted">—</div>
          )}
        </div>
      </div>

      <div className="mt-3 text-[11px] text-ui-faint">
        Descriptive only. No prices, no forecasts, no advice.
      </div>
    </div>
  );
}