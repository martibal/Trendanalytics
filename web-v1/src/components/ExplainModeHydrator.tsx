"use client";

import { useEffect } from "react";
import { hydrateExplainModeFromStorage } from "@/lib/explainMode";

export function ExplainModeHydrator() {
  useEffect(() => {
    hydrateExplainModeFromStorage();
  }, []);
  return null;
}
