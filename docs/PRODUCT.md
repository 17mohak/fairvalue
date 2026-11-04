# FairValue web product

The product layer over the research: a Next.js app in `web/` that talks to the existing FastAPI
service. It adds no new model and changes no research result (D-032, D-033).

## What it contains
Five rooms, each with its own route, layout and interaction model (D-034, D-035; design direction D-037):

| Route | Room | Composition | Data source |
|---|---|---|---|
| `/` | 01 Overview | Editorial front door: headline, live specimen (streamed, uncached), figures ledger, headline finding, room directory | `POST /predict` (live), `research.json` |
| `/players`, `/players/[id]` | 02 Players | Board: floodlit squad cards, search and filters in the URL. Profile: cinematic hero built around a licensed cutout (labelled silhouette until one exists) with the role code as the oversized glyph; market value vs Model A/B (held-out and served, labelled); live SHAP; traits radar vs positional peers with decile detail; valuation history; audit context | `players.json` (showcase, committed) or the git-ignored full export; `POST /predict`, `POST /explain` |
| `/studio` | 03 Valuation studio | Workbench: profile pane and result pane scroll independently on desktop; values the starting profile once the service is up; scoreboard, Model A/B duel, ruler, tier odds, SHAP | `POST /predict`, `POST /explain` |
| `/fairness` | 04 Fairness observatory | Instrument: readout dial, rail of seven views (gap, value level, leagues, subgroups, tier errors, robustness, limits), comparison-model overlay, definitions dialog. State in the URL: `?view=leagues&model=B&compare=1` | `research.json` |
| `/methods` | 05 Methods | Paper on light stock: abstract, numbered sections, scroll-spy contents, margin notes, booktabs tables | `research.json` |
| `/api/predict`, `/api/explain`, `/api/health` | Server-side proxy to FastAPI (backend URL never reaches the browser) | `FAIRVALUE_API_URL` |

## Where the numbers come from
`python -m src.product.export` writes three files into `web/src/data/`:
- `research.json`: reshaped copies of committed tables in `reports/` and `models/model_registry.json`;
- `openapi.json`: the API's own OpenAPI schema; the form reads ranges, enums and defaults from it;
- `catalog.json`: input rules that live in Python constants (sub-positions by position, the
  minutes-per-appearance range, tier boundaries, the disclaimer).

`tests/test_product_export.py` fails if any of these is stale, so rerun the export after changing
reports, the registry or the API schema. Nothing in the web app computes a new research figure.

## Players
- Default build: the eight-player research showcase (committed). Full board: run
  `python -m src.product.players` after `src.data.build_dataset` (and `src.models.train` for held-out
  estimates); it writes `web/src/data/generated/players.json`, which the app prefers when present.
- Verify a full export against its sources: `python -m src.product.verify_players [--api URL]`
  (`docs/PLAYER_EXPORT_VERIFICATION.md`).
- Portraits: see `docs/PLAYER_ASSETS.md` (licence allow-list, Wikidata/Commons finder, add helper, tests).

## Service status
The masthead says **Model online** only when the API reports the registered model versions and
dataset fingerprint; **Model unverified** when something else answers; **Model offline** otherwise
(D-036). Profiles and the studio label each served figure as live, live and unverified, or a cached
research result.

## Explanations
`POST /explain` (src/api/explain.py) runs SHAP TreeExplainer on the served regressor, the same
method as `src/fairness/explain_shap.py`. Contributions are summed back to input features and must
add up to the prediction (tolerance 1e-4); otherwise the endpoint returns 500 instead of a wrong
explanation. The studio shows them as multipliers on the estimate (log scale). Global importance
(mean |SHAP| over the training population) is shown separately and labelled as such.

The "typical miss" band in the studio is the held-out log MAE from the registry around the
estimate. It is labelled as a guide to scale, not a confidence interval.

## Run locally
```bash
# API (needs models/*.joblib from python -m src.models.final)
./.venv/Scripts/python -m uvicorn src.api.app:app --port 8000
# Web (Node 20.9+)
cd web && npm ci && npm run dev        # http://localhost:3000
```
`web/.env.example` documents `FAIRVALUE_API_URL` (default `http://127.0.0.1:8000`).

Full stack in containers (models must exist in `models/`):
```bash
docker compose up --build             # web on :3000, API on :8000
```

## Tests
- `cd web && npm test`: formatting, contract sync (every API field has a form field), validation
  rules, API client error mapping, and the studio flow against fixtures captured from the real API
  (success, invalid input, API offline, explanation unavailable, server 422 mapping).
- `npm run typecheck` and `npm run build`.
- Python: `tests/test_api_explain.py` (additivity, Model B has no context features, invalid input,
  non-additive explanations refused, metadata) and `tests/test_product_export.py`.
- CI runs all of these; the Docker job also smoke-tests `/explain` and the compose stack.

## Design notes
- Navigation: numbered rooms in the masthead with a morphing active indicator; a full-screen room
  sheet on mobile. Route changes slide forward or back by room order (React `<ViewTransition>`,
  `components/site/RoomTransition.tsx`); the masthead stays anchored. Reduced motion disables it.
- Each room varies the shared system: Overview is editorial and wide, the studio is an app-like
  bench, the observatory has an instrument graticule, Methods switches to the `.paper` token scope
  (light stock, serif display, darker data colours re-checked for contrast).
- Identity: a night match. Turf-dark ground, chalk text, sodium-floodlight accent for value.
  Barlow Condensed for headlines and numerals, Source Serif 4 for research prose, Barlow for UI.
- Data colours were checked with a colour-vision-deficiency validator against the dark surface:
  UEFA `#4495DC` / non-UEFA `#D4609A`; raises `#BF8622` / lowers `#13A096`. No red/green verdicts.
- Signature element: a log-scale valuation ruler marked at the €2M / €10M / €30M tier boundaries.
- Motion: one draw-in on the landing ruler, the estimate reveal, and chart entrances; all respect
  `prefers-reduced-motion`. Every chart has a table view.

## Not done
- Public hosting (Railway/Render) and image publishing: need owner approval and a check of free-tier terms.
- The API image grew to about 970 MB because `shap` brings numba/llvmlite. `/predict` works without
  it if a slimmer image is ever needed (`/explain` then returns 501).
