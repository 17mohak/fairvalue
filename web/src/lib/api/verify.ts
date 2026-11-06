// Is the service answering /health the model service the research describes? "Answers" is not
// enough: a different model build, a half-loaded server or a test stub can all answer. The site
// only calls the service "online" when its loaded models and dataset fingerprint match the
// research registry (models/model_registry.json, exported into research.json).

export type ServiceState = "checking" | "online" | "unverified" | "offline";

export interface ServiceVerdict {
  state: Exclude<ServiceState, "checking">;
  /** One sentence a person can read. */
  reason: string;
}

export interface ExpectedService {
  versions: Record<string, string>;
  dataset_sha256_16: string;
}

/** The models the site needs: Model A for every page, Model B for comparisons. */
const REQUIRED = ["regressor_A", "classifier_A", "regressor_B", "classifier_B"] as const;

export function verifyHealth(httpStatus: number | null, body: unknown, expected: ExpectedService): ServiceVerdict {
  if (httpStatus === null) return { state: "offline", reason: "The prediction API is unreachable." };
  const h = (body ?? {}) as { status?: string; model_versions?: Record<string, string>; dataset_sha256_16?: string | null };
  if (httpStatus >= 500 || h.status !== "ok") {
    return { state: "offline", reason: "The prediction API answered, but its models are not loaded." };
  }
  const got = h.model_versions ?? {};
  const missing = REQUIRED.filter((k) => !got[k]);
  if (missing.length) return { state: "unverified", reason: `The prediction API does not report ${missing.join(", ")}.` };
  const different = REQUIRED.filter((k) => got[k] !== expected.versions[k]);
  if (different.length) {
    return { state: "unverified", reason: `The served ${different.join(", ")} differ from the models the research results describe.` };
  }
  if (h.dataset_sha256_16 !== expected.dataset_sha256_16) {
    return { state: "unverified", reason: "The served models were trained on a different dataset fingerprint." };
  }
  return { state: "online", reason: "Serving the registered models, trained on the research dataset." };
}
