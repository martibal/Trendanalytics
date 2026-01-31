"use client";

import { create } from "zustand";

export type ExplainMode = "basic" | "advanced";

type ExplainModeState = {
  explainMode: ExplainMode;
  setExplainMode: (m: ExplainMode) => void;
  toggle: () => void;
};

function readInitial(): ExplainMode {
  if (typeof window === "undefined") return "basic";
  const v = window.localStorage.getItem("css_explain_mode");
  return v === "advanced" ? "advanced" : "basic";
}

export const useExplainModeStore = create<ExplainModeState>((set, get) => ({
  explainMode: "basic",
  setExplainMode: (m) => {
    set({ explainMode: m });
    if (typeof window !== "undefined") {
      window.localStorage.setItem("css_explain_mode", m);
    }
  },
  toggle: () => {
    const next: ExplainMode = get().explainMode === "basic" ? "advanced" : "basic";
    get().setExplainMode(next);
  },
}));

/**
 * Call once from a top-level client component (e.g. header) to hydrate from localStorage.
 */
export function hydrateExplainModeFromStorage() {
  if (typeof window === "undefined") return;
  useExplainModeStore.setState({ explainMode: readInitial() });
}
