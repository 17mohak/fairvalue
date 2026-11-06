// Typed access to the generated research outputs (src/data/research.json).
// Everything here is read-only reshaping; no figure is computed for display that the
// research pipeline did not produce.

import research from "@/data/research.json";
import type { ModelId } from "@/lib/football";

export { research };

export interface Interval {
  estimate: number;
  low: number;
  high: number;
}

export function heldOutLogMae(model: ModelId): number {
  return research.models.registry[`regressor_${model}`].cv_heldout_metrics.log_mae;
}

export function heldOutLogR2(model: ModelId): number {
  return research.models.registry[`regressor_${model}`].cv_heldout_metrics.log_r2;
}

export function shapGlobal(model: ModelId) {
  return research.shap_global[model];
}

export const PRIMARY_GAP: Interval = research.headline.A.signed_gap_league_stratified;
