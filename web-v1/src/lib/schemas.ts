import { z } from "zod";

export const ChainSchema = z.enum(["bitcoin", "ethereum", "arbitrum", "base"]);
export type Chain = z.infer<typeof ChainSchema>;

export const GenreSchema = z.enum(["gold", "meta", "derived"]);
export type Genre = z.infer<typeof GenreSchema>;

export const DatasetSchema = z.object({
  dataset_id: z.string(),
  revision_id: z.number().int().nonnegative(),
  methodology_version: z.string(),
  computed_at_utc: z.string(),
  supported_chains: z.array(ChainSchema),
  supported_genres: z.array(GenreSchema),
  windows_supported: z.array(z.number().int().positive()),
  schema_versions: z.record(z.string(), z.string()),
  notes: z.array(z.string()).optional(),
  copied_file_counts: z.record(z.string(), z.any()).optional(),

  // genre -> chain -> asof date (YYYY-MM-DD)
  asof_by_genre_chain: z.record(z.string(), z.record(z.string(), z.string())),
});

export type Dataset = z.infer<typeof DatasetSchema>;

export const ManifestSchema = z.object({
  dataset_id: z.string(),
  revision_id: z.number().int().nonnegative(),
  methodology_version: z.string(),
  computed_at_utc: z.string(),

  chain: ChainSchema,
  genre: GenreSchema,
  schema_version: z.string(),

  asof: z.string(), // YYYY-MM-DD
  windows_supported: z.array(z.number().int().positive()),

  files: z.object({
    latest: z.string(), // "latest.json"
    windows: z.record(z.string(), z.string()), // {"7":"last7d.json", ...}
  }),

  available_days_count: z.number().int().nonnegative().optional(),
  available_days: z.array(z.string()).optional(),
});

export type Manifest = z.infer<typeof ManifestSchema>;

export const WindowPayloadSchema = z.array(z.record(z.string(), z.any()));
export type WindowPayload = z.infer<typeof WindowPayloadSchema>;

export const LatestPayloadSchema = z.record(z.string(), z.any());
export type LatestPayload = z.infer<typeof LatestPayloadSchema>;
