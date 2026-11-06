#!/usr/bin/env bash
# Deploy FairValue to Google Cloud Run (D-052): a private API and a password-gated, noindexed web app.
#
# Dry run by default: prints every command and changes nothing. Pass --execute to run them.
# Pushing images and deploying both need the owner's explicit approval (CLAUDE.md).
#
# Usage (repo root, Git Bash or Cloud Shell, with gcloud and docker logged in):
#   FAIRVALUE_REVIEW_PASSWORD=... bash scripts/deploy_gcp.sh            # print the plan
#   FAIRVALUE_REVIEW_PASSWORD=... bash scripts/deploy_gcp.sh --execute  # build, push, deploy
#
# Cost guard rails (idle cost zero):
#   - min-instances 0 on both services, so nothing runs (or bills) between requests;
#   - max-instances caps, so a burst of traffic cannot scale cost without limit;
#   - requests rejected by IAM (anyone calling the private API directly) are not billed;
#   - the project's budget is a spend cap that pauses Cloud Run (docs/DEPLOYMENT.md).
#
# Data: the web image contains the full player export when it exists locally. It is pushed only
# to the PRIVATE Artifact Registry repository below, never to a public registry.
set -euo pipefail

PROJECT="${GCP_PROJECT:-fairvalue-513904}"
REGION="${GCP_REGION:-asia-south1}"
REPO="${GCP_REPO:-fairvalue}"
API_SERVICE=fairvalue-api
WEB_SERVICE=fairvalue-web
WEB_SA="fairvalue-web@${PROJECT}.iam.gserviceaccount.com"
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT}/${REPO}"
TAG="$(git rev-parse --short HEAD)"
REVIEW_USER="${FAIRVALUE_REVIEW_USER:-fairvalue}"

EXECUTE=0
[ "${1:-}" = "--execute" ] && EXECUTE=1

# Refuse to deploy uncommitted code under a commit's tag: the tag must describe the image.
if [ "$EXECUTE" = 1 ] && [ -n "$(git status --porcelain -- src web/src web/package.json Dockerfile web/Dockerfile requirements-api.txt models 2>/dev/null)" ]; then
  echo "Uncommitted changes under src/, web/ or models/: commit them first so the image tag ($TAG) is honest." >&2
  exit 1
fi
if [ -z "${FAIRVALUE_REVIEW_PASSWORD:-}" ]; then
  echo "Set FAIRVALUE_REVIEW_PASSWORD (the reviewer password). It is never stored in the repo." >&2
  exit 1
fi
# gcloud splits --set-env-vars on a delimiter; "^|^" makes it "|" so commas in the password are safe.
case "$FAIRVALUE_REVIEW_PASSWORD" in *"|"*) echo "The reviewer password must not contain '|'." >&2; exit 1 ;; esac

# Print a command; run it too with --execute. Secrets are masked in the printout.
run() {
  local shown="$*"
  shown="${shown//${FAIRVALUE_REVIEW_PASSWORD}/********}"
  echo "+ $shown"
  if [ "$EXECUTE" = 1 ]; then "$@"; fi
}

# The service URLs are deterministic (https://SERVICE-PROJECTNUMBER.REGION.run.app), so the site
# URL can be baked into the web build before the service exists.
if command -v gcloud >/dev/null 2>&1; then
  PROJECT_NUMBER="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')"
else
  [ "$EXECUTE" = 1 ] && { echo "gcloud is not installed." >&2; exit 1; }
  PROJECT_NUMBER="PROJECT_NUMBER"
fi
API_URL="https://${API_SERVICE}-${PROJECT_NUMBER}.${REGION}.run.app"
SITE_URL="${FAIRVALUE_SITE_URL:-https://${WEB_SERVICE}-${PROJECT_NUMBER}.${REGION}.run.app}"

echo "Project $PROJECT ($PROJECT_NUMBER), region $REGION, tag $TAG"
echo "API  $API_URL (private)"
echo "Site $SITE_URL (password-gated, noindex)"
[ "$EXECUTE" = 1 ] || echo "DRY RUN: nothing is executed. Re-run with --execute after approval."
echo

# 1. APIs and the web app's own identity (idempotent: an existing account is kept).
run gcloud services enable run.googleapis.com artifactregistry.googleapis.com iam.googleapis.com --project "$PROJECT"
if [ "$EXECUTE" = 0 ] || ! gcloud iam service-accounts describe "$WEB_SA" --project "$PROJECT" >/dev/null 2>&1; then
  run gcloud iam service-accounts create fairvalue-web --display-name "FairValue web app" --project "$PROJECT"
fi

# 2. Images, built for Cloud Run's platform and tagged with the commit.
run gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
run docker build --platform linux/amd64 -t "${REGISTRY}/api:${TAG}" .
run docker build --platform linux/amd64 --build-arg "FAIRVALUE_SITE_URL=${SITE_URL}" -t "${REGISTRY}/web:${TAG}" web
run docker push "${REGISTRY}/api:${TAG}"
run docker push "${REGISTRY}/web:${TAG}"

# 3. The API: private. Only the web app's service account may invoke it.
run gcloud run deploy "$API_SERVICE" --project "$PROJECT" --region "$REGION" \
  --image "${REGISTRY}/api:${TAG}" --port 8000 \
  --no-allow-unauthenticated \
  --min-instances 0 --max-instances 2 --memory 1Gi --cpu 1 --concurrency 20 --cpu-boost
run gcloud run services add-iam-policy-binding "$API_SERVICE" --project "$PROJECT" --region "$REGION" \
  --member "serviceAccount:${WEB_SA}" --role roles/run.invoker

# 4. The web app: public URL, but every page sits behind the reviewer password and is noindexed.
run gcloud run deploy "$WEB_SERVICE" --project "$PROJECT" --region "$REGION" \
  --image "${REGISTRY}/web:${TAG}" --port 3000 \
  --service-account "$WEB_SA" \
  --allow-unauthenticated \
  --min-instances 0 --max-instances 3 --memory 512Mi --cpu 1 --cpu-boost \
  --set-env-vars "^|^FAIRVALUE_API_URL=${API_URL}|FAIRVALUE_API_AUTH=gcp-id-token|FAIRVALUE_SITE_URL=${SITE_URL}|FAIRVALUE_NOINDEX=1|FAIRVALUE_REVIEW_USER=${REVIEW_USER}|FAIRVALUE_REVIEW_PASSWORD=${FAIRVALUE_REVIEW_PASSWORD}"

echo
echo "Done. Check: curl -sI $SITE_URL  (expect 401), then open it with user '$REVIEW_USER'."
