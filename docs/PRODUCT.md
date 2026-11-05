# FairValue web product

The product layer over the research: a Next.js app in `web/` that talks to the existing FastAPI
service. It adds no new model and changes no research result (D-032, D-033).

## What it contains
Three environments behind a persistent switcher (D-038), plus a shared player dossier:

| Route | Environment | Composition | Data source |
|---|---|---|---|
| `/` | **Overview** | Front door: headline, featured valuation (journey ribbon), market snapshot, doors into Stories and the Terminal; market-vs-model spectrum; the audit finding; directory; live model check | `research.json`, player export, `POST /predict` (live check) |
| `/terminal` | **Terminal** · Player Explorer | Search, position/league/tier and numeric filters (age, minutes, value), sortable table or cards, comparison tray, watch, inspector with a compact journey. All state in the URL | player export, `/api/players/[id]` |
| `/terminal/compare?ids=` | Terminal · Comparison Studio | 2–4 players: value ladder, side-by-side explanation matrix, performance lanes (goalkeepers off goals/assists axes), record, history | player export |
| `/terminal/watchlists` | Terminal · Watchlists | Named lists in `localStorage` (not synced), sort, filter, compare, JSON export | `/api/players` |
| `/terminal/market`, `/terminal/leagues` | Terminal · Market / League Landscape | Held-out error and value distributions for the 5,820-player population; league board; player-level views from the current export | `research.json → market` |
| `/terminal/discrepancies` | Terminal · Discrepancy Explorer | Residuals with fixed terminology, one basis per ranking (held-out, or in-sample with the showcase) | player export |
| `/terminal/valuation`, `/terminal/audit` | Terminal · Valuation Studio, Fairness Audit | The former studio and observatory, unchanged inside | `POST /predict`, `POST /explain`, `research.json` |
| `/stories` and `/stories/*` | **Stories** | Cover; research and market stories; a valuation story per showcase player; head-to-heads; Spotlight shown as not published | `research.json`, `players.json` (showcase) |
| `/methods` | Stories · Methods | Paper on light stock | `research.json` |
| `/players/[id]?from=` | Shared dossier | Same record from every environment: header, A vs B, Valuation Journey, traits, history, audit context | player export, `POST /predict`, `POST /explain` |
| `/api/predict`, `/api/explain`, `/api/health`, `/api/players` | Server-side | Proxy to FastAPI (the backend URL never reaches the browser); compact player index | `FAIRVALUE_API_URL`, player export |

`/players`, `/studio` and `/fairness` redirect to their Terminal workspaces.

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
- **Switcher and motion:** the global bar carries the switcher. Its lit segment glides between
  environments (a shared view-transition name). Each crossing has its own entrance: the Terminal
  wipes in, Stories cuts up from black, the Overview and dossier rise. Workspaces and chapters
  swap quickly. Reduced motion disables all of it.
- **Identity per environment:**
  - Overview: serif headline on turf; a Terminal slice (snapshot) and a Stories slice (door).
  - Terminal: black, hairlines, dense tabular type, rail and status strip.
  - Stories: black stage, broadcast-scale condensed type, serif reading text, typographic covers.
  - Methods: a paper on light stock.
- **Signature elements:**
  - the Valuation Journey: the full waterfall, a compact one in the inspector, a story mode, and the
    one-line ribbon on the Overview;
  - the €2M / €10M / €30M value ruler.
- **Colour:** gold marks the selection. Raises are gold (`--raise`), lowers a restrained red
  (`--lower`). Comparison players use three dataviz-validated slots plus a fourth, always with
  shapes and one row each.
- **Shortcuts:** ⌘K or `/` opens search (players, workspaces, stories). In the Terminal, `g` then a
  letter jumps between workspaces. Escape closes the palette or the inspector.

## Not done
- Player Spotlight stories: need licensed photography and match-level data.
- Accounts and synced watchlists: need authentication and server storage.
- Public hosting (Railway/Render) and image publishing: need owner approval and a check of free-tier terms.
- The API image grew to about 970 MB because `shap` brings numba/llvmlite. `/predict` works without
  it if a slimmer image is ever needed (`/explain` then returns 501).
