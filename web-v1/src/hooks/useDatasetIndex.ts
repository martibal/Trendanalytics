// src/hooks/useDatasetIndex.ts
"use client";

import useSWR from "swr";
import { fetchJsonLenient } from "@/lib/fetchJson";

export type PublishedDataset = {
  dataset_id: string;
  revision_id: number;
  computed_at_utc: string;
  supported_chains: string[];
  supported_genres: string[];
  windows_supported: number[];
  methodology_version?: string;
};

export function useDatasetIndex() {
  // Published contract root is static:
  //   /public/data/published/v1/...
  const publishedBase = "/data/published/v1";

  const { data, error, isLoading, mutate } = useSWR<PublishedDataset>(
    `${publishedBase}/dataset.json`,
    fetchJsonLenient,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30_000,
    }
  );

  return {
    publishedBase,
    dataset: data ?? null,
    error: error ?? null,
    isLoading,
    refresh: mutate,
  };
}