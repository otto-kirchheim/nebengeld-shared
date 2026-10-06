#!/usr/bin/env bash
# =============================================================================
# deploy.sh – shared releasen: Version anheben und `dev` nach `main` freigeben
#
# Produktions-Builds von frontend und backend duerfen nur shared-Staende nutzen, die auf `main`
# liegen oder dasselbe `src/` wie `main` haben (deren deploy.sh bricht sonst ab). `main` waechst nur per Release, also immer mit
# angehobener Version. Der Root-`release.sh` ruft dieses Skript vor frontend/backend auf.
#
# Standardablauf:
#   1. `dev` aktualisieren; ohne Aenderung unter `src/` gegenueber `main` Abbruch (nichts zu releasen --
#      frontend/backend akzeptieren einen dev-Pin, solange dessen `src/` mit `main` identisch ist)
#   2. Checks (typecheck + test)
#   3. Version in package.json anheben, Release-Commit auf `dev`
#   4. `dev` nach `main` mergen (--no-ff), beide Branches pushen, zurueck auf `dev`
#
# Verwendung:
#   ./scripts/deploy.sh <patch|minor|major> [--dry-run] [--skip-checks] [--no-push]
# =============================================================================

set -euo pipefail

REMOTE="${REMOTE:-origin}"
SOURCE_BRANCH="dev"
TARGET_BRANCH="main"
BUMP_TYPE=""
RUN_CHECKS=true
PUSH_CHANGES=true
DRY_RUN=false

usage() {
  cat <<EOF
Usage: ./scripts/deploy.sh <patch|minor|major> [options]

Bumps the version on ${SOURCE_BRANCH}, merges ${SOURCE_BRANCH} into ${TARGET_BRANCH} (--no-ff),
pushes both branches to ${REMOTE} and switches back to ${SOURCE_BRANCH}.

Options:
  --skip-checks       Skip typecheck + test
  --no-push           Prepare release locally without pushing branches
  --dry-run           Show commands only, do not change anything
  -h, --help          Show this help
EOF
}

# Die Commits/Pushes unten ohne Husky-Gate: die Checks liefen hier bereits (oder wurden bewusst uebersprungen).
export HUSKY=0

run_cmd() {
  echo "+ $*"
  if [[ "$DRY_RUN" != true ]]; then
    "$@"
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    patch|minor|major) BUMP_TYPE="$1" ;;
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

if [[ -z "$BUMP_TYPE" ]]; then
  echo "❌ Release-Typ fehlt: patch, minor oder major." >&2
  usage >&2
  exit 1
fi

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

echo "🚀 Releasing shared (${BUMP_TYPE}) from '$SOURCE_BRANCH' to '$TARGET_BRANCH' via '$REMOTE'"

run_cmd git fetch "$REMOTE"
run_cmd git checkout "$SOURCE_BRANCH"
run_cmd git pull --ff-only "$REMOTE" "$SOURCE_BRANCH"

NEUE_COMMITS="$(git rev-list --count "${REMOTE}/${TARGET_BRANCH}..${SOURCE_BRANCH}")"
if [[ "$NEUE_COMMITS" -eq 0 ]]; then
  echo "ℹ️ Keine neuen Commits auf '${SOURCE_BRANCH}' gegenueber '${TARGET_BRANCH}' -- nichts zu releasen."
  exit 0
fi

# Nur `src/` kommt bei frontend/backend an. Commits ohne src-Aenderung (CI, Doku, Skripte) bekommen keine
# eigene Version; sie gehen mit dem naechsten echten Release nach main.
if git diff --quiet "${REMOTE}/${TARGET_BRANCH}" "$SOURCE_BRANCH" -- src; then
  echo "ℹ️ ${NEUE_COMMITS} Commits auf '${SOURCE_BRANCH}', aber keine Aenderung unter src/ -- nichts zu releasen."
  exit 0
fi

if [[ "$RUN_CHECKS" == true ]]; then
  run_cmd bun run typecheck
  run_cmd bun test
fi

pkg_version() { { grep -m1 -oE '"version": *"[^"]+"' || true; } | sed -E 's/.*"([^"]+)"$/\1/'; }
VERSION_ALT="$(pkg_version < package.json)"
VERSION_PROD="$(git show "${REMOTE}/${TARGET_BRANCH}:package.json" | pkg_version)"

if [[ "$VERSION_ALT" != "$VERSION_PROD" ]]; then
  # Abgebrochener Release: Bump-Commit existiert schon, nur Merge/Push nachholen.
  VERSION_NEU="$VERSION_ALT"
  echo "ℹ️ Version ${VERSION_NEU} ist schon angehoben (${TARGET_BRANCH}: ${VERSION_PROD}) – Release wird fortgesetzt"
else
  IFS='.' read -r MAJOR MINOR PATCH <<<"$VERSION_ALT"
  case "$BUMP_TYPE" in
    major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
    minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
    patch) PATCH=$((PATCH + 1)) ;;
  esac
  VERSION_NEU="${MAJOR}.${MINOR}.${PATCH}"
  echo "📦 Version ${VERSION_ALT} -> ${VERSION_NEU} (${NEUE_COMMITS} Commits)"

  run_cmd sed -i -E "0,/\"version\": *\"[^\"]+\"/s//\"version\": \"${VERSION_NEU}\"/" package.json
  run_cmd git commit -am "chore(release): bump version to ${VERSION_NEU}"
fi

run_cmd git checkout "$TARGET_BRANCH"
run_cmd git pull --ff-only "$REMOTE" "$TARGET_BRANCH"
run_cmd git merge --no-ff "$SOURCE_BRANCH" -m "chore: deploy ${SOURCE_BRANCH} to ${TARGET_BRANCH} (v${VERSION_NEU})"

if [[ "$PUSH_CHANGES" == true ]]; then
  run_cmd git push "$REMOTE" "$TARGET_BRANCH"
fi

run_cmd git checkout "$SOURCE_BRANCH"
run_cmd git merge --ff-only "$TARGET_BRANCH"

if [[ "$PUSH_CHANGES" == true ]]; then
  run_cmd git push "$REMOTE" "$SOURCE_BRANCH"
fi

echo "✅ shared ${VERSION_NEU} ist auf '${TARGET_BRANCH}' freigegeben; frontend/backend koennen jetzt releasen."
