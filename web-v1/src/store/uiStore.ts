"use client";

import { create } from "zustand";

export type ExplainMode = "basic" | "advanced";

type UiState = {
  explainMode: ExplainMode;
  setExplainMode: (mode: ExplainMode) => void;
};

export const useUiStore = create<UiState>((set) => ({
  explainMode: "basic",
  setExplainMode: (mode) => set({ explainMode: mode }),
}));
