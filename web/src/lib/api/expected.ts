// What "the model service" means for this site: the registered models and dataset fingerprint
// from the research registry (models/model_registry.json, exported into research.json).
import { research } from "@/lib/research";
import type { ExpectedService } from "./verify";

export const EXPECTED_SERVICE: ExpectedService = {
  versions: Object.fromEntries(Object.entries(research.models.registry).map(([k, v]) => [k, v.version])),
  dataset_sha256_16: research.models.dataset_sha256_16,
};
