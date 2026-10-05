#!/usr/bin/env bash
# =============================================================================
# deploy.sh – shared von `dev` nach `main` freigeben
#
# Produktions-Builds von frontend und backend duerfen nur shared-Staende nutzen, die auf `main`
# liegen (deren deploy.sh bricht sonst ab). Deshalb vor jedem frontend-/backend-Deploy mit
# shared-Aenderungen zuerst dieses Skript ausfuehren.
#
# Standardablauf:
#   1. `dev` aktualisieren und Checks ausfuehren (typecheck + test)
#   2. `dev` nach `main` mergen (--no-ff)
#   3. `main` pushen
#   4. zurueck auf `dev` wechseln und auf den neuen Stand fast-forwarden
#
# Verwendung:
#   ./scripts/deploy.sh
#   ./scripts/deploy.sh --dry-run
#   ./scripts/deploy.sh --skip-checks
# =============================================================================

set -euo pipefail

REMOTE="${REMOTE:-origin}"
SOURCE_BRANCH="${SOURCE_BRANCH:-dev}"
TARGET_BRANCH="${TARGET_BRANCH:-main}"
RUN_CHECKS=true
PUSH_CHANGES=true
DRY_RUN=false

usage() {
  cat <<EOF
Usage: ./scripts/deploy.sh [options]

Merges ${SOURCE_BRANCH} into ${TARGET_BRANCH} (--no-ff), pushes both branches to ${REMOTE}
and switches back to ${SOURCE_BRANCH}.

Options:
  --skip-checks       Skip typecheck + test
  --no-push           Prepare merge locally without pushing branches
  --dry-run           Show commands only, do not change anything
  -h, --help          Show this help
EOF
}

# Die Pushes unten ohne Husky-Gate: die Checks liefen hier bereits (oder wurden bewusst uebersprungen).
export HUSKY=0

run_cmd() {
  echo "+ $*"
  if [[ "$DRY_RUN" != true ]]; then
    "$@"
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-checks) RUN_CHECKS=false ;;
    --no-push) PUSH_CHANGES=false ;;
    --dry-run) DRY_RUN=true ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      echo >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

cd "$(dirname "$0")/.."

for branch in "$SOURCE_BRANCH" "$TARGET_BRANCH"; do
  if ! git rev-parse --verify "$branch" >/dev/null 2>&1; then
    echo "❌ Branch '$branch' does not exist locally." >&2
    exit 1
  fi
done

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "❌ Working tree is not clean. Please commit or stash your changes first." >&2
  exit 1
fi

echo "🚀 Deploying shared from '$SOURCE_BRANCH' to '$TARGET_BRANCH' via '$REMOTE'"

run_cmd git fetch "$REMOTE"
run_cmd git checkout "$SOURCE_BRANCH"
run_cmd git pull --ff-only "$REMOTE" "$SOURCE_BRANCH"

if [[ "$RUN_CHECKS" == true ]]; then
  run_cmd bun run typecheck
  run_cmd bun test
fi

run_cmd git checkout "$TARGET_BRANCH"
run_cmd git pull --ff-only "$REMOTE" "$TARGET_BRANCH"
run_cmd git merge --no-ff "$SOURCE_BRANCH" -m "chore: deploy ${SOURCE_BRANCH} to ${TARGET_BRANCH}"

if [[ "$PUSH_CHANGES" == true ]]; then
  run_cmd git push "$REMOTE" "$TARGET_BRANCH"
fi

run_cmd git checkout "$SOURCE_BRANCH"
run_cmd git merge --ff-only "$TARGET_BRANCH"

if [[ "$PUSH_CHANGES" == true ]]; then
  run_cmd git push "$REMOTE" "$SOURCE_BRANCH"
fi

echo "✅ Done. shared '$TARGET_BRANCH' ist freigegeben; frontend/backend koennen jetzt deployt werden."
