// Types mirroring src/api/schemas.py. The field list and ranges are read from the generated
// OpenAPI document at runtime (lib/contract.ts); a test fails if these types drift from it.

import type { Foot, LeagueId, ModelId, Position, TierName } from "@/lib/football";

export interface PlayerFeatures {
  age: number;
  height_in_cm: number | null;
  position: Position;
  sub_position: string;
  foot: Foot | null;
  valuation_league_id: LeagueId;
  club_ppg: number | null;
  appearances: number;
  minutes: number;
  start_share: number;
  goals_p90: number;
  assists_p90: number;
  yellow_p90: number;
  red_p90: number;
  intl_club_minutes_share: number;
  minutes_last_365: number;
  days_since_last_match: number;
  valuation_club_minutes_share: number;
}

export type PlayerField = keyof PlayerFeatures;

export interface PredictRequest {
  player: PlayerFeatures;
  model: ModelId;
}

export interface PredictResponse {
  predicted_value_eur: number;
  predicted_tier: TierName;
  classifier_tier: TierName;
  tier_probabilities: Record<TierName, number>;
  model: ModelId;
  model_version: { regressor: string; classifier: string };
  disclaimer: string;
}

export interface FeatureContribution {
  feature: string;
  value: number | string | null;
  contribution: number;
}

export interface ExplainResponse {
  model: ModelId;
  model_version: string;
  base_log_value: number;
  base_value_eur: number;
  predicted_log_value: number;
  predicted_value_eur: number;
  contributions: FeatureContribution[];
  method: string;
  disclaimer: string;
}

export interface HealthResponse {
  status: "ok" | "degraded";
  models_loaded: string[];
  model_versions: Record<string, string>;
  dataset_sha256_16: string | null;
}

/** FastAPI validation error item (HTTP 422). */
export interface ValidationIssue {
  loc: (string | number)[];
  msg: string;
  type: string;
}
