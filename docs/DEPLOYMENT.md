# Deployment (Milestone 6)

## Serving artefacts
- `python -m src.models.final` refits the selected models on all 5,820 players and writes:
  - `models/regressor_{A,B}.joblib` and `models/classifier_{A,B}.joblib` (git-ignored);
  - `models/model_registry.json` (committed): versions, hyperparameters, features, dataset
    fingerprint and the held-out CV metrics that describe them.
- Hyperparameters are the median of the per-fold Optuna optima (D-027).

## API (`src/api/`)
| Endpoint | Purpose |
|---|---|
| `GET /health` | Status, loaded models, model versions, dataset fingerprint |
| `POST /predict` | `{"player": {...}, "model": "A"}` → `predicted_value_eur`, `predicted_tier`, `classifier_tier`, `tier_probabilities`, `model_version`, `disclaimer` |
| `POST /explain` | same body → per-feature SHAP contributions (log scale) that add up to the prediction; 501 if `shap` is not installed (D-033) |
| `GET /metadata` | leagues, sub-positions by position, tier boundaries, model versions and held-out metrics |

**Validation (Pydantic, `src/api/schemas.py`):**
- Inputs must fall inside the approved population: age 15–45, minutes ≥ 450, one of the 14 leagues,
  rates within plausible ranges, `minutes_last_365 ≤ minutes`, and known sub-positions.
- Derived features (`goal_contrib_p90`, `minutes_per_appearance`) are computed by the server.
- **Unknown fields are rejected** (`extra="forbid"`). Sending `nationality`, `country_of_citizenship`
  or `confederation` returns HTTP 422, so demographic data cannot reach the model through the API.
- Every response includes the research-use disclaimer.

Run locally:
```bash
./.venv/Scripts/python -m uvicorn src.api.app:app --port 8000
```
Interactive docs are then at http://localhost:8000/docs.

## Docker
- The `Dockerfile` is based on `python:3.12-slim`. It installs only `requirements-api.txt` (no
  training or MLOps libraries), copies only the modules the API imports plus `models/`, runs as a
  non-root user, and has a `HEALTHCHECK` on `/health`.

```bash
python -m src.models.final
docker build -t fairvalue-api .
docker run -p 8000:8000 fairvalue-api
```

### Local verification (2026-11-04)
- **Built and run with Docker Engine 29.2.0 (linux/x86_64)**: image `fairvalue-api:local`, 676 MB.
  - `GET /health`: HTTP 200, all four models loaded, versions and dataset fingerprint reported.
  - `POST /predict`: value, tier, tier probabilities, model versions and disclaimer returned.
  - A request containing `nationality`: HTTP 422.
  - The process runs as the non-root `appuser`; Docker's HEALTHCHECK status is `healthy`.
- History: Docker Desktop first failed to start (its Model Runner could not remove a stale socket
  file). Before the engine came up, the image contents were verified with a container-equivalent
  run. The engine started normally after the owner rebooted and enabled virtualization.
- CI repeats the build and smoke test on every push (no push to any registry).

## Hosting and registry
- **Pre-live on Google Cloud Run (D-052)**, deployed 2026-11-06 with the owner's approval. See the
  Cloud Run section below. Images are in the private Artifact Registry repository only. GitHub
  Container Registry, Railway and Render were not used.
- Every further push or deploy still needs the owner's explicit approval.
- Model files are build inputs. A CI publish job would need to train/refit first (as the CI job
  already does) or pull versioned models from a release artefact.

## Web app and full stack
The Next.js front end has its own image (`web/Dockerfile`). `docker compose up --build` runs three
services:

| Service | Host port | Role |
|---|---|---|
| `api` | 8000 | FastAPI prediction and explanation service (`models/*.joblib`) |
| `web` | none (internal 3000) | Next.js standalone server; reaches the API at `FAIRVALUE_API_URL` |
| `proxy` | 3000 | Caddy (`deploy/Caddyfile`): `encode zstd gzip` and reverse proxy to `web` |

**Why the proxy:** Next.js compresses pages but not route-handler responses, and it strips a
`Content-Encoding` header set by the handler. The `/api/players` index behind search, watchlists and
compare is therefore 1.8 MB raw. Through the proxy it is 320 KB with gzip, measured 2026-11-05 on
the full export (D-041). Since D-052 Next.js compresses it as well, so the proxy is no longer
required for this; compose keeps it.

**Configuration:**

| Variable | Where | Default | Meaning |
|---|---|---|---|
| `FAIRVALUE_API_URL` | web (server only) | `http://127.0.0.1:8000` locally, `http://api:8000` in compose | where the proxy routes `/api/predict`, `/api/explain` and `/api/health` |
| `FAIRVALUE_SITE_URL` | web, **build and run time** | `http://localhost:3000` when unset | the public address of the site: the base for canonical links and per-player share images (`og:image`). **Required for any public deployment** |
| `PORT`, `HOSTNAME` | web image | `3000`, `0.0.0.0` | Next.js standalone server |

**Before any public deployment, set `FAIRVALUE_SITE_URL`** to the site's own address, for example
`https://fairvalue.example`. Without it every canonical link and share card points at
`http://localhost:3000`, so shared links break. Set it when the image is **built** as well as when it
runs, because Stories and Methods are generated at build time:

- compose: `FAIRVALUE_SITE_URL=https://fairvalue.example docker compose up --build` (or put it in an
  `.env` file next to `docker-compose.yml`); compose passes it as a build argument and to the container;
- plain Docker: `docker build --build-arg FAIRVALUE_SITE_URL=https://fairvalue.example web` and
  `docker run -e FAIRVALUE_SITE_URL=https://fairvalue.example …`.

A value that is set but is not an absolute `http(s)` URL fails the build on purpose
(`web/src/lib/siteUrl.ts`), so a typo cannot ship links to the wrong place.

Local development without Docker: copy `web/.env.example` to `web/.env.local`, run the API with
`uvicorn`, then `npm run dev` in `web/`.

**Data in images:** the web image copies `web/src/data/generated/players.json` (the full export)
when it exists locally. This is dataset content, so an image built on a machine with the export
must never be pushed to a public registry. CI builds without it and uses the eight-player
showcase.

Details are in `docs/PRODUCT.md`. Hosting and image publishing still need owner approval.

## Cloud Run (public since 2026-11-06, D-054)
The site is public and indexable; the API stays private. **Deploy with `FAIRVALUE_PUBLIC=1`**:
without it the script restores the reviewer password and noindex (the pre-live mode below).

```bash
FAIRVALUE_PUBLIC=1 bash scripts/deploy_gcp.sh             # print the plan
FAIRVALUE_PUBLIC=1 bash scripts/deploy_gcp.sh --execute   # build, push, deploy
```

The switch to public was made in place on 2026-11-06 (revision `fairvalue-web-00005`):
`FAIRVALUE_REVIEW_PASSWORD` and `FAIRVALUE_REVIEW_USER` removed, `FAIRVALUE_NOINDEX=0`. Both are read at
run time, so changing them needs a new revision, not a rebuild.

## Cloud Run (pre-live, D-052)
`scripts/deploy_gcp.sh` deploys both services to Cloud Run in `asia-south1` (project
`fairvalue-513904`). It is a **dry run by default**: it prints every command. `--execute` runs them,
and needs the owner's approval, `gcloud` and `docker` logged in, and a clean working tree.

```bash
FAIRVALUE_REVIEW_PASSWORD=... bash scripts/deploy_gcp.sh             # print the plan
FAIRVALUE_REVIEW_PASSWORD=... bash scripts/deploy_gcp.sh --execute   # build, push, deploy
```

| Service | Access | Scaling | Notes |
|---|---|---|---|
| `fairvalue-api` | private (IAM; only the web app's service account may invoke) | 0 to 2 instances, 1 GiB | port 8000 |
| `fairvalue-web` | public URL, every page behind the reviewer password, noindexed | 0 to 3 instances, 512 MiB | port 3000, runs as `fairvalue-web@` |

**Cost:** min-instances 0 on both, so nothing bills while idle. Requests rejected by IAM are not billed.
The project budget is an enforced ₹1,000/month cap on Cloud Run. It pauses services, but not
instantly, and it does not cover Artifact Registry storage (keep at most two images per service; the
repository's cleanup policy does this).

**Extra web variables on Cloud Run:**

| Variable | Default | Meaning |
|---|---|---|
| `FAIRVALUE_REVIEW_PASSWORD` | unset (gate off) | reviewer password for HTTP Basic auth on every page. Set from the deployer's shell, never stored in the repo |
| `FAIRVALUE_REVIEW_USER` | `fairvalue` | reviewer user name |
| `FAIRVALUE_NOINDEX` | on (anything but `0`) | `X-Robots-Tag: noindex, nofollow` and a disallow-all `robots.txt` |
| `FAIRVALUE_API_AUTH` | unset | `gcp-id-token`: send a Google identity token to the private API |

### Files to copy into the deploy worktree first
Deploy from a clean worktree of main (`C:\Users\MOHAK\fairvalue-deploy`), never from a working
folder. These are git-ignored and must be copied in from a machine that has them:

| Path | Why | If missing |
|---|---|---|
| `models/*.joblib` | the served models | the API image has no models to serve |
| `web/src/data/generated/players.json` | the full 5,820-player export | the site falls back to the eight-player showcase |
| `web/public/players/portraits/cards/fl/` (1,128 WebP, about 37 MB) and `web/src/data/generated/portrait_cards_fl.json` | FootyLogos card portraits (unlicensed, D-044) | **the build still succeeds** and shows monograms, because `npm` writes an empty manifest. Check the count before deploying |

Before running the script: `ls web/public/players/portraits/cards/fl | wc -l` gives 1128, and
`git status --short` is empty (these files are ignored, so nothing can be committed by accident).
The images add about 37 MB to the web image. After the 2026-11-06 deploy the registry held
420.7 MB across three stored versions; the cleanup policy keeps two.

**Cold starts:** both services scale to zero. On 2026-11-06 the API took 11.5 s to answer its first
`/health` after idling, so the web app's health route waits up to 20 s and the browser 25 s. The
first page after a quiet spell shows "Checking model" for that long, not "Model offline".

### Live check (2026-11-06, main `0488e4c`, revisions `fairvalue-api-00003`, `fairvalue-web-00003`)
- **Gate, noindex, private API:** 401 without the password; `X-Robots-Tag: noindex, nofollow` and a
  disallow-all `robots.txt`; the API answers 403 directly; `/api/health` reports "online".
- **Portraits:** dossiers 605184 (FootyLogos), 670681 (Berlin) and 918332 (monogram) answer 200 with
  the expected image or none; a FootyLogos image is served as `image/webp`. `/credits` lists 1,128
  FootyLogos images.
- **Not checked live:** phone-width rendering (needs a reviewer to sign in), the cold-start health
  wait, and the new API disclaimer text.

### Live check (2026-11-06, main `fd16b8d`, revisions `fairvalue-api-00002`, `fairvalue-web-00002`)
- **Gate:** without the password, or with a wrong one, the site answers 401. With it, `/`,
  `/terminal`, `/terminal/valuation`, `/stories` and `/methods` answer 200.
- **Noindex:** the `X-Robots-Tag` header is set and `robots.txt` disallows everything.
- **Private API:** a direct call to the API answers 403. Through the web app, `/api/health` reports
  "online" with the registered models, and `POST /api/predict` answers 200 in 0.24 s.
- **Compression:** `/api/players` is served gzipped, 324 KB.
- **First deploy:** `/api/health` reported the API offline because that route called the API without
  the identity token. Fixed in PR 3, with a guard test, and redeployed.
- **How it was deployed:** from a clean worktree of main. The git-ignored model files and player export
  were copied in, and nothing uncommitted went into the images.

`/api/ping` stays open for the container health check. Compression no longer needs Caddy: Next.js
itself gzips `/api/players` (1.92 MB to 324 KB) because `next.config.ts` sets its `Content-Type` up
front (D-052 explains why that matters).
