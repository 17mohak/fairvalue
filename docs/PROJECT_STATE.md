# Project state

_Last updated: 2026-11-06_

## Where we are
- All eight milestones are implemented, tested and run on the full data. The research design is
  **locked** (`docs/RESEARCH_DESIGN.md`).
- Every reported number was regenerated from the committed code with `scripts/run_pipeline.sh` (D-028).
- **Public (D-054, 2026-11-06):** on Google Cloud Run (`asia-south1`, project `fairvalue-513904`),
  opened by the owner's decision for a LinkedIn launch. The reviewer password and noindex were
  removed; image from main `a2f4f92`.
  - Site: `https://fairvalue-web-111067737818.asia-south1.run.app`, public and indexable.
  - The API stays private; only the web app's service account can call it.
  - Images are only in the private Artifact Registry repository.
  - Open data-rights questions (Transfermarkt terms, unlicensed FootyLogos portraits) are accepted
    by the owner (D-044, D-054), not resolved.

| Area | State | Evidence |
|---|---|---|
| Location | Permanent folder `C:\Users\MOHAK\fairvalue`; git history and data checksums verified after the move | `git log`, `data/raw/MANIFEST.json` |
| Data | 10 tables, checksummed; 5,820-player modelling set; separate audit table and drift snapshot | `data/processed/build_metadata.json` |
| Design | Locked: population, RQ1–RQ4, metrics, DiCE approach | `docs/RESEARCH_DESIGN.md`, DECISIONS D-011, D-017–D-031 |
| Models | Ridge, RF, HGB, Optuna-HGB × Model A/B; HGB tier classifier; 5-fold held-out predictions | `docs/reports/MODEL_EVALUATION.md` |
| Primary model | Optuna-tuned HGB: Model A log RMSE 0.526, R² 0.891 (unseen clubs: 0.573 / 0.871) | `reports/models/primary_model.json` |
| Serving | Full-data refits + registry; FastAPI `POST /predict`, `GET /health`. Docker image rebuilt from the re-run models and smoke-tested on 2026-11-05: predictions identical to the saved artefacts; 422 on 7 invalid-input cases (including a nationality field); 405 on GET /predict; non-root; HEALTHCHECK healthy | `docs/DEPLOYMENT.md`, `models/model_registry.json` |
| Fairness | Signed residual gaps, MAE/RMSE gaps, league/strata, calibration check, ER1a/ER1b, club-clustered CIs, tier power | `docs/reports/FAIRNESS_AUDIT.md`, `SUPPLEMENTARY_CHECKS.md` |
| Explainability | SHAP global/group/local; feature-based DiCE: full run complete (720 queries, no consistent group difference). DiCE is now time-bounded and checkpointed (D-031) | `docs/reports/EXPLAINABILITY.md` |
| Monitoring | Evidently + PSI drift simulation, retraining policy (NO ACTION), quality gates | `docs/MONITORING.md` |
| CI | Private repo [17mohak/fairvalue](https://github.com/17mohak/fairvalue). First run (2026-11-04, about 6 min) **passed**: 79 unit tests (+10 data tests skipped as designed); data re-downloaded with an unchanged manifest; 9 data/leakage tests; quick-run gate with numbers identical to the local run (0.851 / 0.581 / 0.718); refit; Docker build, health and predict smoke test. No image pushed | `.github/workflows/ci.yml`, GitHub Actions |
| Product (branch `feat/product-experience`) | Next.js app in `web/`: landing, valuation studio (live predict + per-prediction SHAP), fairness explorer, methods. `POST /explain`, `GET /metadata`. Compose stack built and smoke-tested locally. Not pushed or deployed | `docs/PRODUCT.md`, D-032, D-033 |
| Responsible AI | Model card, data card, EU AI Act assessment | `docs/MODEL_CARD.md`, `docs/DATA_CARD.md`, `docs/EU_AI_ACT_ASSESSMENT.md` |
| Tests | Python 138 collected (data tests skip without the dataset); web 181 (`npm test`) | `pytest -q`, `web/` vitest |
| Reviews | Three independent read-only reviews; all findings addressed | DECISIONS D-015, D-023, D-028 |

## Key results (held-out, within the selected population)
- Context dominates prediction: Model A log R² 0.891 vs Model B 0.669.
- **Primary fairness result:** non-UEFA players are under-predicted relative to UEFA players in the same
  leagues.
  - League-stratified log gap **+0.093** (95% CI 0.063–0.124) under Model A; +0.164 under Model B.
  - It holds within predicted-value deciles, for every algorithm, at 900 minutes, for unseen clubs and
    with club-clustered CIs.
  - It is concentrated in RU1, TR1, GR1, UKR1 and BE1.
- This is the opposite of the original hypothesis. It is reported as found, with no causal reading.
- Accuracy (MAE/RMSE) is similar for both groups. Model A's ER1a is +2.5 pp, and its club-clustered CI
  reaches 0. Errors lean towards under-tiering non-UEFA players. The World Class and Elite tier
  components are too imprecise to interpret.

## Open items
- **Player export on real data: done (D-040, 2026-11-05).** 5,820 profiles; `verify_players` 24/24,
  27/27 with the local API. The export is git-ignored and must be regenerated on each machine.
- **Product plan:** `docs/ROADMAP.md` (Sprints 0–6) is authoritative. Sprint 0 is done apart from
  the merge into `main`; Sprint 1 has flags and the coverage report (D-041, D-042).
- **Player cards and portraits (D-044, D-053): live on the reviewer site.** PlayerCard in the dossier
  hero and on valuation story covers; PlayerChip in Explorer rows, Overview spotlights, dossier
  neighbours and Head-to-Head covers. Portraits: 1,128 FootyLogos (unlicensed, git-ignored), 57
  Berlin (CC BY-SA 4.0), 4,635 monograms (`docs/PLAYER_ASSETS.md`). Open:
  - the card or chip on the Inspector, Comparison Studio, Watchlists, Market, Leagues and the
    Stories index;
  - Safari, Firefox and screen-reader checks; long names, goalkeepers, close-ups at phone width;
  - by-eye review of the remaining FootyLogos crops (about 100 of 1,128 seen) and Berlin cutouts
    (4 of 57);
  - valuation stories say Model A is "served, in-sample" beside a held-out card figure (owner call);
- **Sprint 2:** audited and planned (ROADMAP S2-01 to S2-10). S2-02 is done and S2-07 partial, through
  the product-experience sprint below.
- **Product-experience sprint (D-045, 2026-11-05, uncommitted):** Valuation Theatre Overview in five
  chapters, ranked global player search, canonical dossier with breadcrumbs and a section index. Web
  tests 130; the build passes. Checked in Chromium at 390, 820, 1440 and 1920 px and with reduced
  motion. Screenshots are in `screenshots/theatre-sprint/` (not for commit).
- **Dossier sprint (owner's journey: Overview → search → dossier):** stage 1 done (D-046): valuation
  lane and plain-language reading in the dossier opening. Stage 2 done (D-047): Valuation Journey as the
  centrepiece. Stage 3 done (D-048): standings, neighbours and where the player appears. Stage 4 done
  (D-049): previous/next player within the originating list. Stage 5 done (D-050): share cards.
  Stage 6 done (D-051): accessibility (Lighthouse mobile 100) and edge cases. Sprint complete; open:
  Safari/Firefox/screen-reader testing and brand fonts in share cards.
- **Compose stack:** `docker compose up --build` runs api, web and a Caddy proxy on :3000 that
  compresses responses (D-041). Verified on 2026-11-05.
- **Player profiles (D-035):** the full board, held-out estimates, traits and valuation histories
  run on the full local export (D-040). No licensed portraits yet.
- **Multi-page branch:** `feat/multipage-experience` (based on `feat/product-experience`) now has three
  environments, Overview, Terminal and Stories, with a shared dossier (D-038). It supersedes the rooms
  of D-034. It also carries the FairValue brand identity (D-039). Local commits only; pushing and merging need owner approval.
  Its live API path was exercised end to end on 2026-11-05 with the local uvicorn service and the
  production Next.js server (D-040), then in the Docker compose stack (D-041).
  Open: Safari, Firefox and screen-reader testing.
- **Product branch:** `feat/product-experience` is local only. Pushing it (and running its CI) and any
  merge into `main` need owner approval.
- **GitHub:** public since 2026-11-06 (owner's decision; history scanned first: no secrets, data or
  FootyLogos images; commit author emails are visible). Earlier: private, CI green (2026-11-05). Visibility changes
  and collaborators are the owner's call.
- **Hosting (Railway/Render) and GHCR image publishing:** not done; needs approval, and free-tier terms
  must be checked first.

## How to resume
- Start Docker Desktop first if you need the container (the engine runs after enabling virtualization).
- `bash scripts/run_pipeline.sh` regenerates everything except the full DiCE run (about 35 min; runs
  the bounded DiCE demo). `WITH_DICE=1 bash scripts/run_pipeline.sh` adds the full DiCE run (+80 min).
- To check things without retraining:
  - `./.venv/Scripts/python -m src.models.quality_gate` (gate on saved results);
  - `./.venv/Scripts/python -m src.fairness.counterfactuals` (bounded DiCE demo, at most 10 min);
  - `docker build -t fairvalue-api:local .` then `docker run -p 8000:8000 fairvalue-api:local`.
- `./.venv/Scripts/python -m pytest -q` runs the tests.
- The API runs with `./.venv/Scripts/python -m uvicorn src.api.app:app --port 8000`, or via Docker
  (see `docs/DEPLOYMENT.md`).
