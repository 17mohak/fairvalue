# Development changelog

## 2026-11-06: MIT licence for the code
- `LICENSE` (MIT, Mohak Mandwani) for the source code and documentation, with a scope note: data, Berlin portraits (CC BY-SA 4.0), flag icons and third-party fonts and packages keep their own terms. README, model card, `pyproject.toml` and `web/package.json` updated.

## 2026-11-06: Site address fairvalue.web.app
- Firebase Hosting site `fairvalue` forwards to Cloud Run `fairvalue-web`; deployed from main `901c424` with `FAIRVALUE_SITE_URL=https://fairvalue.web.app`, so canonical links and share cards use it. README, DEPLOYMENT and PROJECT_STATE updated; README no longer says the repository is private.

## 2026-11-06: Public launch (D-054)
- **Site public:** reviewer password and noindex removed from `fairvalue-web` (revision 00005, env change only; image `a2f4f92`). The API stays private. Checked live: pages 200 without a password, `robots.txt` allows all, no `X-Robots-Tag`, API direct 403, health "online".
- **Repository public:** `17mohak/fairvalue`, after scanning all 90 commits for secrets, emails in files, data, models and FootyLogos images (none found).
- **Share card:** `app/opengraph-image.tsx` plus Open Graph and Twitter metadata in the layout, so the home page and other pages without their own card get a 1200×630 preview (figures from `research.json`). Dossiers keep their per-player card.
- **Deploy script:** `FAIRVALUE_PUBLIC=1` deploys the public site; without it the script restores the reviewer gate. Docs: README live link, DEPLOYMENT, PROJECT_STATE, PLAYER_ASSETS (takedown contact now reachable), DECISIONS D-054.
- **Checks:** web 181 pass, tsc and build pass; share image rendered and checked locally. The new card is not live until the next deploy.

## 2026-11-06: Player chip on the remaining player surfaces (branch `feat/card-everywhere`, D-053)
- **Chip:** `PlayerChip` now in the Terminal Inspector header, Comparison Studio slot tags, Watchlist rows, and the Stories index (Head-to-Head pairs and Valuation cards). Market and League pages show players only as chart points or not at all, so they get none.
- **Checked:** web tests 181, tsc and the production build pass. By eye on the local production build with the full export, at desktop and 375 px: FootyLogos, Berlin and monogram chips render, no horizontal scroll, no console errors. Not checked: Safari, Firefox, screen readers.
- **Docs:** PLAYER_ASSETS describes the card portraits that ship; DEPLOYMENT lists the git-ignored files a deploy must copy in; PROJECT_STATE updated. Remaining "academic" wording replaced.

## 2026-11-06: Health check waits for a cold-starting API (PR 5)
- **Fix:** on the live site `/api/health` answered 503 "unreachable" while the scaled-to-zero API was waking up: the route gave up after 4 s, and a cold start took 11.5 s to answer `/health` (Cloud Run logs). The route now waits 20 s; the browser's `health()` call waits 25 s so it always outlasts the server.
- **Tests:** `app/api/health/route.test.ts`: an API answering after 11.5 s reads "ok" (fails on the old 4 s limit), one that never answers still gives 503. Web 181 pass. Not yet checked on the live site (needs a deploy).

## 2026-11-06: Clean checkouts build without the FootyLogos files (PR 5)
- **Fix:** CI failed because the app imports the git-ignored `portrait_cards_fl.json`. `web/scripts/ensure-portrait-manifest.mjs` now writes an empty manifest when it is missing (never overwrites), run before dev, build, typecheck and test. A build without the real file shows monograms instead of FootyLogos portraits, so a deploy must copy the file and images in first.
- **Tests:** FootyLogos checks skip when the manifest is empty; the PlayerCard test uses a committed Berlin portrait. Web 179 pass with the real files; 177 pass and 2 skip with the stub (simulated clean checkout).

## 2026-11-06: Player card on every player surface (branch `feat/portrait-cards`, D-053)
- **Chip:** `PlayerChip`, the card's small slanted form (ink by tier, engraved monogram when there is no portrait), now in Explorer rows, Overview spotlights, the dossier's "near this valuation" list and Head-to-Head covers.
- **Stories:** valuation story covers show the full card (held-out Model A from the full export) with its credit; the "no licensed photograph" typographic cover is gone. Head-to-Head covers link to `/credits`.
- **Switch:** renamed to `NEXT_PUBLIC_FAIRVALUE_FOOTYLOGOS_PORTRAITS=off` so client rows and server pages agree; it is read at build time, so rebuild after changing it.
- **Checked:** web tests 177 pass, tsc passes; by eye at desktop width on Explorer, Overview, a valuation story and a head-to-head. Not checked: mobile, other browsers, Inspector panel, Comparison Studio, Watchlists (still monogram-free text).

## 2026-11-06: Player cards, direction C (branch `feat/portrait-cards`, D-053)
- **Card:** `PlayerCard` ("The Denomination") in the dossier hero: observed value as the denomination, ink by value tier, held-out Model A and residual on the foot, engraved monogram when there is no portrait. Guilloche background from `lib/guilloche.ts`.
- **Portraits:** `portraitFor` now falls back to card portraits: 57 Berlin / WikiPortraits frames (CC BY-SA 4.0, background removed, committed) and 1,128 FootyLogos images (unlicensed, owner's risk per D-044, git-ignored). `scripts/portraits/build_card_assets.py` builds both from `research/portrait_sourcing/`.
- **Safeguards:** `/credits` page and footer link, `NEXT_PUBLIC_FAIRVALUE_FOOTYLOGOS_PORTRAITS=off` (build-time) removes every unlicensed image, `cardPortraitProblems` checks credit and source on each entry.
- **Tests:** web 177 (+6). tsc and production build pass. Checked by eye on three dossiers (FootyLogos, Berlin, monogram) at desktop width only; mobile and other browsers not checked. Not yet on Explorer rows, Stories or the Overview.

## 2026-11-06: Pre-live deployed to Cloud Run (reviewers only)
- Deployed with the owner's approval from main `fd16b8d` to Cloud Run `asia-south1`. The web app is
  behind a reviewer password and noindexed; the API is private; min-instances 0 on both.
- **Fix (PR 3):** `/api/health` now sends the identity token. The first deploy showed the API as
  offline. A guard test stops any route from calling the API without the token. Web tests 172.
- **Live check:** gate 401/200, API direct 403, health "online", predict 200, players gzip 324 KB.

## 2026-11-06: Pre-live deployment setup (branch `feat/pre-live`)
- **Reviewer gate (D-052):** HTTP Basic auth on every page when `FAIRVALUE_REVIEW_PASSWORD` is set
  (`web/src/proxy.ts`), `/api/ping` open for health checks; noindex header and disallow-all
  `robots.txt` by default.
- **Private API:** the web app sends a cached Google identity token when `FAIRVALUE_API_AUTH=gcp-id-token`.
- **Compression:** Next.js now gzips `/api/players` itself (1.92 MB to 324 KB), so Cloud Run needs no
  Caddy. Root cause: Next's compression filter rejected the route's array-valued `Content-Type`; a
  `next.config.ts` header fixes it. Checked on the standalone server and the Docker image.
- **Deploy script:** `scripts/deploy_gcp.sh`, dry run by default. Nothing pushed or deployed.
- **Tests:** web 171 (+10: gate, identity token, player index). Build passes; Docker web image healthy behind the gate.

## 2026-11-05: Deployment URL wired through the build (branch `feat/multipage-experience`)
- `FAIRVALUE_SITE_URL` (the public address used for canonical links and share cards) is now passed
  through the web Docker build and run stages and docker compose, and documented in DEPLOYMENT.md as
  required for any public deployment. A blank value falls back to `http://localhost:3000`; a malformed
  one fails the build (`web/src/lib/siteUrl.ts`, tested). Web tests 161.

## 2026-11-05: Dossier, stage 6: accessibility and edge cases (branch `feat/multipage-experience`)
- **Accessibility (D-051):** Lighthouse mobile 100/100/100 for the dossier (was 93) and the Overview.
  Fixed contrast in the footer, two invalid definition lists, the missing favicon and a label/name
  mismatch on the Overview search buttons.
- **Edge cases:** standings are not stated for groups under 12 players (showcase build); goalkeeper,
  lowest-value, single-valuation and showcase dossiers checked.
- **Tests:** web 158 (+1). Build passes.

## 2026-11-05: Dossier, stage 5: share cards (branch `feat/multipage-experience`)
- **Share cards (D-050):** every dossier link has a generated 1200 × 630 preview card (observed value,
  labelled Model A estimate, residual in words, the player's lane) and a per-player description.
  `FAIRVALUE_SITE_URL` sets the absolute base for share and canonical URLs.
- **Tests:** web 157 (+2: share description, no nationality). Build passes; the card is served by the
  production server.

## 2026-11-05: Dossier, stage 4: previous / next player (branch `feat/multipage-experience`)
- **Stepping (D-049):** the dossier steps through the list it was opened from (Explorer view, search
  results, league, position), rebuilt on the server from a `seq` URL parameter; league by value
  otherwise. J/K or ]/[ on the keyboard. Checked with browser back and forward.
- **Fix:** the lane's tier label no longer overprints the observed-value label at a tier boundary.
- **Tests:** web 155 (+5: sequence parsing, rebuilding, stepping and fallback). Build passes.

## 2026-11-05: Dossier, stage 3: in context (branch `feat/multipage-experience`)
- **In context (D-048):** league and position standings in plain words with value silhouettes;
  "Near this valuation" (same league, then same position); "Where this player appears" (stories,
  Explorer and League Landscape links, this browser's comparison tray and watchlists).
- **Tests:** web 150 (+7: standings wording and ties, neighbours, histogram, appearances). Build passes.

## 2026-11-05: Dossier, stage 2: Valuation Journey as centrepiece (branch `feat/multipage-experience`)
- **Journey (D-047):** first section after the opening, full width and first in reading order. The
  heading names the explained estimate and its source, and explains why it differs from the held-out
  figure. The biggest raising and lowering inputs come above the waterfall. A loading skeleton replaces
  the loading text.
- **Tests:** web 143 (+4: movers, negligible effects, journey framing and order, loading state). Build passes.

## 2026-11-05: Dossier opening, stage 1 (branch `feat/multipage-experience`)
- **Dossier hero (D-046):** a valuation lane (one-player theatre: observed line, Model A and Model B
  diamonds with residual arcs, fitted log scale, tier lines when in range) beside a plain-language
  reading of the valuation. A small monogram badge replaces the large empty portrait frame. The lane
  comes first when stacked, and its labels scale up on phones.
- **Shared code:** `pitchDrawing` now draws the pitch for both the Overview and the dossier.
- **Tests:** web 139 (+9: reading wording and caveats, lane labels and missing estimates). Build passes.

## 2026-11-05: Valuation Theatre, global search, canonical dossier (branch `feat/multipage-experience`, not committed)
- **Overview (D-045):** rebuilt as five chapters. The hero is the Valuation Theatre, an SVG pitch whose
  length is a log value scale fitted to the plotted values. Its lanes are the seven most valuable players
  (held-out Model A), each linked to its dossier. Then Market (funnel, tiers, 14-league ladder),
  Discrepancy (group mean residuals, raw vs league-stratified gap, definitions, caveats), Players
  (per-position spotlights, per-league leaders) and Research (Model A/B, explainability, journey,
  fairness, methods, live check).
- **Search:** ranked results ("saka" now finds Bukayo Saka first), nationality and value per row,
  loading, empty and error-with-retry states, recent searches, prefetch on hover, a platform-aware
  shortcut label and `?from=` to the dossier. A resting pointer no longer changes the highlighted row.
- **Dossier:** `rel=canonical`, breadcrumbs and Back, sticky section index, floodlight atmosphere.
- **Fixes:** ROADMAP S2-02 (data-driven axis); reduced motion zeroes delays; no horizontal overflow at
  390, 820, 1440 or 1920 px.
- **Tests:** web 130 (+22: theatre geometry and selection rules, ranked search, recent searches,
  palette keyboard, error and pointer flows). Typecheck and production build pass.

## 2026-11-05: Portrait sourcing and Sprint 2 audit (branch `feat/multipage-experience`)
- **Portraits (D-043):** the finder works with the owner's contact and was run on all 5,820 players.
  3,674 have an allowed licence, 2,765 at ≥ 800 px and 1,755 at ≥ 1,400 px. The finder was fixed
  (file-name decoding, batching, retries, UTF-8) and has a regression test.
- **Sprint 2 audit:** the product was audited on the full export. `docs/ROADMAP.md` now holds the
  backlog S2-01 to S2-10 with evidence, acceptance criteria and sizes. Two P0 regressions from the
  full-population switch were found: no published explanations in the full export (the Overview
  cover is gone), and a hard-coded spectrum axis that hides 8 of 10 markers. Not implemented yet;
  this waits for approval.

## 2026-11-05: Release foundation and identity assets (branch `feat/multipage-experience`)
- **Roadmap:** `docs/ROADMAP.md` is now the single plan: the research milestones plus product
  Sprints 0–6, each with status, priority, dependencies, acceptance criteria and blockers.
- **Sprint 0:** CI is green on the pushed integration commit. The Docker Compose stack runs with a
  Caddy edge proxy (D-041), and the player index drops from 1.78 MB to 320 KB. The containerised
  API passes 27/27. Configuration is documented in DEPLOYMENT.md.
- **Sprint 1 (D-042):**
  - Nationality flags (dossier only) and league flags (Explorer, dossier, League board, Compare)
    from flag-icons (MIT).
  - Asset coverage report `src.product.asset_coverage`: flags 99.6% and 14/14 leagues; portraits,
    shirt numbers and crests 0.
  - The portrait finder is blocked by Wikimedia's User-Agent policy; shirt numbers and crests are
    blocked for the documented reasons.
- **Tests:** web 108 (+4), Python 137 (+1); production build passes.

## 2026-11-05: Full-population integration (branch `feat/multipage-experience`, not pushed)
- **Data:** the full export was generated locally from the existing dataset and held-out
  predictions: 5,820 players. `verify_players` passed 24/24, and 27/27 against the live API. No
  acquisition, rebuild, retraining or cross-validation was run.
- **API:** the local binaries are served with dataset `91174c392a8be652`. Predict and explain work
  for Models A and B through the web proxy. A nationality field gets 422, GET /predict gets 405, an
  unknown player gets 404, and the stopped service gets 503 with "Model offline".
- **Fixes (D-040):**
  - Dense scatters for the full population (Market Landscape 5.3 MB to 400 KB).
  - Live SHAP in the Comparison Studio for players without published explanations.
  - The dossier's live line names both served models.
  - The narrow-screen rail no longer stretches.
- **Tests:** web 104 (+6), Python 136 passed with data present; typecheck and production build pass.
- **Performance (production server, full export):** pages answer in 35 to 85 ms, gzipped at 10 to
  97 KB. The server uses about 185 MB of memory. `/api/players` is 1.8 MB uncompressed (D-040).

## 2026-11-05: Brand identity (branch `feat/multipage-experience`, not pushed)
- **Identity (D-039):**
  - Big Shoulders and Archivo (expanded labels) replace Barlow; Source Serif is kept for reading.
  - A solid/outline grammar for observed vs model, residual ▲/▼, tier gauge and gold ID plates,
    shared by every chart and table.
- **Overview:**
  - A cover with a broadcast score bug and the solid/outline headline with its key.
  - A cover valuation (observed, Model A, residual, journey ribbon) and a market band.
  - Doors, a numbered spectrum section, a Stories-style finding band, and the directory.
- **Stories:** outline chapter numerals, reading progress, a two-act research story around a
  stat-duel interstitial, a verdict on the valuation stage, and the grammar on sparklines.
- **Terminal:**
  - Explorer rows carry markers, the residual indicator and the tier gauge.
  - A phone layout keeps who, observed and Model A.
  - Comparison ladder in the grammar with player stripes; a readable matrix with a pinned input
    column.
  - Table row headers are no longer sticky.
- **Dossier:** larger name and observed value in chalk, Model A estimates with markers and
  residuals, tier gauge, more readable journey rows. Narrow journeys now keep a usable track (a
  container-query fix).
- **QA:** the unstyled capture traced to an orphaned server serving a deleted build; documented.
  The head-to-head scale's 5px mobile overflow is fixed.
- **Tests:** web 98 (+3 marks), Python 125; production build passes.

## 2026-11-05: Three experiences (branch `feat/multipage-experience`, not pushed)
- **Architecture (D-038):**
  - Overview, Terminal and Stories behind a persistent switcher, with a transition per crossing
    (reduced motion respected).
  - ⌘K command palette over players, workspaces and stories.
  - The player dossier is shared, with a `?from=` context bar.
  - `/players`, `/studio` and `/fairness` redirect into the Terminal.
- **Terminal:**
  - Shell with a workspace rail, status strip, coverage and build information, and `g` shortcuts.
  - Player Explorer: URL-state filters including numeric ones, sortable table and cards,
    comparison tray, watch, inspector.
  - Comparison Studio: value ladder, explanation matrix, trait lanes, record, history.
  - Watchlists, stored in this browser only, with JSON export.
  - Market Landscape, League Landscape and Discrepancy Explorer.
  - The studio and the observatory, moved in.
- **Valuation Journey:** an interactive SHAP waterfall. Running € = exp(base + Σ contributions);
  additivity is checked; Model B is offered only when it can be explained. It appears in the
  dossier, inspector, stories and Overview.
- **Stories:**
  - A cover page.
  - A scroll-driven research story and a scroll-driven valuation story for each showcase player.
  - Two head-to-heads and a market story.
  - Spotlight shown as not published, with the reason.
- **Overview:** featured valuation (journey ribbon), market snapshot with a league board, doors
  into Stories and the Terminal, the audit finding, directory and live model check.
- **Export:** `research.json` gains `market` (held-out error by position, tier, minutes and league;
  league sizes and medians; no group columns).
- **Tests:** web 95 (+26: routing, stores, explorer query, journey arithmetic against all 8
  published explanations, stories registry, goalkeeper rule, switcher); Python 125 (+1 market export).

## 2026-11-05: Product-design correction (branch `feat/multipage-experience`, not pushed)
- **Direction (D-037):** a scouting-console language replaces the editorial hero-and-sections
  pattern in the analytical rooms. Compact title bars, panel grids and source badges; far smaller
  display type.
- **Players:**
  - The profile is a dossier: one header card holds the frame, identity, valuation and record strip.
    Panels for A vs B, traits, history, SHAP and audit sit in a grid.
  - The board is a database of comparable cards, with a table view.
  - A monogram frame replaces the silhouette.
- **Studio:** a workstation with designed ready, loading, live, offline and cached states. The eight
  research players are presets whose published results show, labelled cached, when the API is down.
- **Observatory:**
  - A headline-gaps strip (A, B, A−B, MAE gap).
  - A multi-chart stage per view, including the new SHAP group-gap chart, league sample sizes,
    accuracy against direction, and largest-error shares.
- **Overview:** a compact hero with three pathways and key figures. The market-vs-model spectrum of
  real players links to their dossiers, and room tiles carry real previews.
- **Fixes:**
  - The landing card no longer says "Live" unless the health verdict is online.
  - A CSS-module guard test found five more dead `.num`/`.prose` rules.
- **Tests:** web 69, Python 124 (11 skipped without data).

## 2026-11-05: Completing the player experience (branch `feat/multipage-experience`, not pushed)
- **Service status (D-036):**
  - `/api/health` verifies the upstream against the research registry and returns a verdict:
    online, unverified or offline.
  - One shared status feeds the masthead, studio and profiles. The studio auto-values only a
    verified service.
  - Served figures are labelled live, live and unverified, or cached research result.
  - Fixes a QA stub being shown as "Model online".
- **Real-data verification:**
  - `python -m src.product.verify_players` runs 24 checks, 27 with `--api`. It proves held-out
    estimates, percentiles and histories belong to the right players.
  - It reproduces the registry's held-out metrics, the published raw gaps and the published
    position counts.
  - Steps and expected output are in `docs/PLAYER_EXPORT_VERIFICATION.md`. Not yet run on real data.
- **Portraits:**
  - `scripts/portraits/find_candidates.py` finds candidates via Wikidata P2446 → P18 and checks
    each Commons file's licence. The output is a review sheet only.
  - `scripts/portraits/add_portrait.py` checks licence, transparency and size, then writes the
    manifest entry.
  - Allow-list widened to every CC BY / BY-SA version. The shortlist is in `docs/PLAYER_ASSETS.md`.
  - The attribution credit moved off the figure.
- **Tests:** Python +20 (verifier passes a correct export and fails four kinds of misalignment;
  licence rules; candidate verdicts; image checks); web 67 (+8: verification rules, masthead states,
  unverified handling).

## 2026-11-05: Player experience (branch `feat/multipage-experience`, not pushed)
- **Rooms:** `/players` board and `/players/[id]` profile added as room 02 (D-035); room numbers now
  come from the registry.
- **Data:** `src/product/players.py`. Committed showcase of the eight published representative players
  (`web/src/data/players.json`); full local export for the whole population (git-ignored). Window
  counts are recovered exactly from per-90 rates. Traits are within-position mid-rank percentiles of
  existing features, and peer deciles are included. Held-out and served estimates are kept apart.
- **Profile:** stadium backdrop in CSS/SVG, role-code glyph, portrait slot with a licensed-cutout path,
  pointer parallax, market vs Model A/B panel with live `/predict` and `/explain` and an offline
  fallback to the published SHAP, interactive radar with decile strip, valuation-history chart, audit
  context, and shared-element transitions from the board.
- **Assets:** portrait manifest with a licence allow-list and validation tests; `docs/PLAYER_ASSETS.md`.
- **Fixes:** `.num` selectors in CSS modules were hashed and never matched (footer, mobile menu,
  methods contents); now `:global(.num)`.
- **Tests:** Python +11 (showcase, percentiles, window counts, full export on synthetic frames); web
  59 passed (+11: helpers, URL parsing, portrait gate, radar, valuation panel offline/live).

## 2026-11-05: Multi-page experience (branch `feat/multipage-experience`, not pushed)
- **Structure (D-034):** four rooms with their own compositions. Overview (live streamed specimen,
  figures ledger, headline finding, room directory); studio as a viewport-height workbench with
  auto-valuation, Model A/B duel and SHAP; fairness observatory as an instrument with seven
  URL-addressable views, model overlay, league sorting and a definitions dialog (replaces the
  anchor-scroll explorer); methods as a light-paper publication with abstract, numbered sections,
  scroll-spy contents and margin notes.
- **Shell:** numbered room navigation with a morphing active indicator, mobile room sheet (inert
  background, Escape, closes on navigation/resize), model-service status, directional route
  transitions (React ViewTransition, off under reduced motion), designed 404 and error pages.
- **Fixes:** ValueRuler no longer blows out grid parents; the landing page's "live" estimate is no
  longer served from an hour-old cache; methods limitation figures are read from `research.json`;
  a home-page claim that contradicted the R² results was corrected; paper-theme small text meets AA.
- **Tests:** web 48 passed (room routing, observatory URL state, studio auto-run and its race);
  Python 93 passed, 11 skipped (no dataset or model binaries in this checkout).

## 2026-11-05: Product experience (branch `feat/product-experience`, not pushed)
- **API:** `POST /explain` (per-prediction SHAP, additivity enforced) and `GET /metadata` (D-033);
  optional CORS via `FAIRVALUE_CORS_ORIGINS`; `original_feature` moved to `src/features/preprocess.py`.
- **Export:** `src/product/export.py` writes `web/src/data/{research,openapi,catalog}.json` from
  committed outputs; staleness test added (D-032).
- **Web app (`web/`):** landing page with a live estimate, valuation studio, fairness explorer and
  methods page. See `docs/PRODUCT.md`.
- **Containers:** `web/Dockerfile` (Next.js standalone) and `docker-compose.yml`. The compose stack was
  built and smoke-tested locally: predict and explain through the proxy, 422 on a nationality field,
  all pages 200, clean 503 when the API is stopped.
- **CI:** new `web` job (typecheck, tests, build); the Docker job also smoke-tests `/explain` and the
  compose stack. Not yet run on GitHub (branch not pushed).
- **Tests:** Python 94 passed, 10 skipped (no dataset in the new checkout); web 39 passed.

## 2026-11-05: GitHub and first CI run
- Private repository `17mohak/fairvalue` created (owner-approved); `main` pushed.
- First CI run passed both jobs in about 6 minutes: unit tests; data acquisition reproduced the committed
  checksums; data/leakage tests; quick training and gate (identical numbers to the local run); refit;
  Docker build and smoke test. No image was published.

## 2026-11-05 (later): Priority pass: engineering verification

- **DiCE:** the full run (720 queries) completed during this pass, after 83 minutes, and its outputs
  were saved (`reports/explainability/dice_*`). DiCE is now bounded: `--max-minutes`, per-player
  checkpoints, a demo default and incomplete-run labelling. The pipeline runs the full analysis only
  with `WITH_DICE=1` (D-031). Bounded mode was smoke-tested, including an early stop marked incomplete.
- **Docker:** the image was rebuilt from the re-run models and smoke-tested. Predictions are identical to
  the saved artefacts; 7 invalid inputs return 422; GET /predict returns 405; non-root user; HEALTHCHECK healthy.
- **Tests:** 89 passing.
- **Docs:** explainability report completed. Thresholds checked for agreement between code and
  `docs/MONITORING.md`. Run logs are kept out of git (they contain local paths).

## 2026-11-05: Milestones 5–8, review fixes, full re-run

### Added
- Project moved to the permanent folder `fairvalue` in the user's home directory. Git history
  restored, venv rebuilt, checksums verified, MLflow paths repointed.
- `src/models/final.py`: full-data refit of the selected models with `models/model_registry.json`.
- `src/fairness/explain_shap.py` (SHAP global, group and local) and `src/fairness/counterfactuals.py`
  (feature-based DiCE).
- `src/api/` (FastAPI `POST /predict`, `GET /health`, Pydantic validation), `Dockerfile`,
  `.dockerignore`, `requirements-api.txt`.
- `src/monitoring/drift.py` (Evidently + PSI on the reserved period, last-year model decay) and
  `src/monitoring/policy.py` (retraining triggers).
- `src/models/quality_gate.py`; CI now runs data → quick train → gate → refit → Docker smoke test.
- `scripts/run_pipeline.sh` regenerates every reported result.
- Docs: MODEL_CARD, DATA_CARD, EU_AI_ACT_ASSESSMENT, MONITORING, DEPLOYMENT, reports/EXPLAINABILITY,
  reports/SUPPLEMENTARY_CHECKS.
- Supplementary checks: club-grouped CV, club-clustered bootstrap, tier-cell power (D-026).
- Dependencies pinned: shap 0.46.0, dice-ml 0.12, fastapi 0.115.6, uvicorn 0.32.1, pydantic 2.14.2,
  httpx 0.28.1, evidently 0.7.14.

### Fixed (third independent review, D-028)
- Python `None` was not treated as missing in categorical features.
- API ranges are now the training ranges.
- DiCE minutes are consistent, and European-cup share is held fixed.
- The drift decay simulation no longer uses settings tuned on its test period.
- `final.py` checks the dataset fingerprint; `/health` returns 503 when models are missing.
- Then: a full pipeline re-run. Model A fairness gap +0.093 (was +0.099); all conclusions unchanged.

### Environment
- Docker Desktop's engine failed to start (stale Model Runner socket). It started after the owner
  rebooted and enabled virtualization, and the image was then built and smoke-tested locally.

## 2026-11-04: Session 1 (continued): design lock, models, first fairness audit

### Added
- `docs/RESEARCH_DESIGN.md`: the locked research design. D-011 accepted; D-017 to D-025 recorded.
- `src/fairness/scope_analysis.py` + `reports/scope/`: selection, threshold, overlap and proxy evidence.
- `src/models/tiers.py` (€2M / €10M / €30M), `src/models/evaluate.py`, and `src/models/train.py`
  (Ridge, RF, HGB, nested-Optuna HGB, HGB tier classifier; Model A/B; MLflow).
- `src/fairness/audit.py`: signed residual gaps, MAE/RMSE gaps, league-stratified estimates,
  stratified bootstrap, strata/league tables, calibration-within-deciles check, ER1a/ER1b via
  Fairlearn plus directional tier errors.
- Reports: `docs/reports/MODEL_EVALUATION.md`, `docs/reports/FAIRNESS_AUDIT.md`, `reports/models/`,
  `reports/fairness/`.
- Dependencies pinned: mlflow 2.22.0, optuna 4.2.1, fairlearn 0.12.0.
- Tests: tiers, folds, CV loop, nested tuning, metric scales, stratified-gap logic, bootstrap
  strata, Fairlearn agreement, arrival-strata regression test (63 total).

### Changed
- Scope assessment: selection language revised (observed vs plausible; no assumed direction).
- Preprocessor always outputs dense arrays (needed by HistGradientBoosting).

### Fixed (independent review, D-023)
- The "established players" stratum selected everyone (object-dtype boolean negation).
- Bootstrap replicates are now 2,000 everywhere; the primary-model rule matches the spec.

## 2026-11-04: Session 1: data foundation (Milestones 0–2)

### Added
- Repository scaffold, pinned core dependencies, config with research constants,
  logging, pytest config, GitHub Actions CI (unit tests; data tests skip without data).
- `src/data/acquire.py`: downloads 10 tables (~113 MB) from the maintainer's public
  bucket and writes a SHA-256 manifest.
- `src/data/mappings/country_confederation.csv` + `src/data/nationality.py`: 202
  citizenship values mapped by football confederation; agrees with the dataset's own
  `national_teams` table for all 123 labelled countries.
- `src/data/quality.py`: key, relationship, range and consistency checks → `reports/data_quality.csv`.
- `src/data/build_dataset.py`: player-level dataset (5,820 eligible players), separate
  audit table, disjoint drift reference snapshot, build metadata.
- `src/features/preprocess.py`: Model A / Model B feature lists and shared
  `ColumnTransformer`; demographic-column guard.
- `src/fairness/coverage.py`: UEFA/non-UEFA coverage audit → `reports/coverage/`.
- Tests: mapping rules, leakage guards (including output invariance to demographic
  columns), time windows, aggregation, and real-data integrity + reproducibility.
- Docs: README, CLAUDE.md, DECISIONS, DATA_PROVENANCE, FEATURES, KNOWN_LIMITATIONS,
  ROADMAP, PROJECT_STATE, COVERAGE_AUDIT.

### Found
- Upstream dataset is frozen (updates paused July 2026), contrary to "refreshed weekly".
- Match data only for 14 European leagues; 79% of currently valued non-UEFA players excluded.
- Only one citizenship per player is stored.
- Several locked-spec items do not apply to this dataset (S-1 … S-8 in DECISIONS.md).

### Changed after independent review
- Added recency / club-continuity features and the `recent_arrival` audit flag (D-015).
- Added proxy-strength measurement (D-016) and recent-arrivals table to the coverage audit.
- New tests: club points-per-game join, 730-day window edges, new features (44 tests total).
- Coverage labels read thresholds from config; birth-vs-citizenship compares canonical names.

### Fixed
- Python's default user agent got HTTP 403 from the bucket; the script now sends a project user agent.
- Impossible heights (13 raw rows, e.g. 19 cm) are set to missing.
