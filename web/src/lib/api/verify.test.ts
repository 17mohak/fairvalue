import { verifyHealth } from "./verify";

const expected = {
  versions: { regressor_A: "rA-1", classifier_A: "cA-1", regressor_B: "rB-1", classifier_B: "cB-1" },
  dataset_sha256_16: "91174c392a8be652",
};
const healthy = { status: "ok", model_versions: { ...expected.versions }, dataset_sha256_16: expected.dataset_sha256_16 };

describe("service verification", () => {
  it("is online only when every registered model and the dataset fingerprint match", () => {
    expect(verifyHealth(200, healthy, expected).state).toBe("online");
  });

  it("treats anything unreachable or not loaded as offline", () => {
    expect(verifyHealth(null, null, expected).state).toBe("offline");
    expect(verifyHealth(503, { status: "degraded" }, expected).state).toBe("offline");
    expect(verifyHealth(200, { status: "degraded", model_versions: expected.versions }, expected).state).toBe("offline");
  });

  it("calls a service that answers with other models unverified, never online", () => {
    // e.g. a replay stub or a test server that reports no models
    expect(verifyHealth(200, { status: "ok", model_versions: {}, dataset_sha256_16: null }, expected)).toMatchObject({ state: "unverified" });
    expect(verifyHealth(200, { ...healthy, model_versions: { ...expected.versions, regressor_A: "rA-2" } }, expected)).toMatchObject({
      state: "unverified",
      reason: expect.stringContaining("regressor_A"),
    });
    expect(verifyHealth(200, { ...healthy, dataset_sha256_16: "0000000000000000" }, expected)).toMatchObject({
      state: "unverified",
      reason: expect.stringContaining("dataset fingerprint"),
    });
  });
});
