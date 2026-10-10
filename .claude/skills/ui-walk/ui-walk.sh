#!/bin/bash
# /ui-walk: builds a head in a detached worktree with its own compose project, serves the
# production build with MODEL_FAKE=1, walks persona A in Chromium at each viewport and prints one
# markdown summary. On the host it runs git, gh and docker only (CLAUDE.md rule 5).
#
# Usage: ui-walk.sh [PR# | branch | commit] [--port 3100] [--viewports 1440x900,390x844]
#                   [--out DIR] [--keep]
#        ui-walk.sh --cleanup [PR# | branch | commit]
# No target: the current HEAD (commit first: the walk builds the commit, not the working tree).
# A branch on origin is walked at origin's tip; otherwise the local branch.
# --keep leaves the server up for more walks (rerun with the same target and --keep reuses the
# build); --cleanup stops it and removes the worktree and the compose project's volumes.
set -euo pipefail

# Pinned versions.
PLAYWRIGHT_IMAGE="mcr.microsoft.com/playwright:v1.55.0-noble"
PLAYWRIGHT_VERSION="1.55.0"
AXE_VERSION="4.10.2"
# The walk's npm packages live in this volume, never in the repo.
DEPS_VOLUME="ui-walk-deps-playwright-${PLAYWRIGHT_VERSION}-axe-${AXE_VERSION}"

die() {
  echo "ui-walk: $*" >&2
  exit 1
}

TARGET=""
PORT=3100
VIEWPORTS="1440x900,390x844"
OUT=""
KEEP=0
CLEANUP=0
while [ $# -gt 0 ]; do
  case "$1" in
    --port) PORT="$2"; shift 2 ;;
    --viewports) VIEWPORTS="$2"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    --keep) KEEP=1; shift ;;
    --cleanup) CLEANUP=1; shift ;;
    -*) die "unknown option $1" ;;
    *) [ -z "$TARGET" ] || die "one target only"; TARGET="${1#\#}"; shift ;;
  esac
done
[[ "$PORT" =~ ^[0-9]+$ ]] || die "--port takes a number"
[[ "$VIEWPORTS" =~ ^[0-9]+x[0-9]+(,[0-9]+x[0-9]+)*$ ]] || die "--viewports takes WxH[,WxH...]"

SKILL_DIR="$(cd "${BASH_SOURCE[0]%/*}" && pwd)"
REPO="$(git rev-parse --show-toplevel)"
PARENT="${REPO%/*}"

# The commit to walk, and a label for the worktree and the compose project.
if [ -z "$TARGET" ]; then
  SHA="$(git rev-parse HEAD)"
  LABEL="$(git branch --show-current)"
  [ -n "$LABEL" ] || LABEL="${SHA:0:7}"
  DESC="${LABEL} (local HEAD)"
elif [[ "$TARGET" =~ ^[0-9]+$ ]]; then
  SHA="$(gh pr view "$TARGET" --json headRefOid --jq .headRefOid)"
  [ "$CLEANUP" = 1 ] || git fetch --quiet origin "pull/$TARGET/head"
  LABEL="pr$TARGET"
  DESC="PR #$TARGET ($(gh pr view "$TARGET" --json headRefName --jq .headRefName))"
elif [ "$CLEANUP" = 0 ] && git fetch --quiet origin "refs/heads/$TARGET" 2>/dev/null; then
  SHA="$(git rev-parse FETCH_HEAD)"
  LABEL="$TARGET"
  DESC="origin/$TARGET"
elif SHA="$(git rev-parse --verify --quiet "$TARGET^{commit}")"; then
  LABEL="$TARGET"
  DESC="$TARGET"
  # A full or short hash: label it by its short hash.
  [[ "$TARGET" =~ ^[0-9a-f]{7,40}$ ]] && LABEL="${SHA:0:7}" && DESC="local commit"
else
  die "can't find $TARGET as a PR number, a branch or a commit"
fi
# Compose project names take lowercase letters, digits, dashes and underscores.
LABEL="$(printf '%s' "$LABEL" | tr 'A-Z' 'a-z')"
LABEL="${LABEL//[^a-z0-9-]/-}"
PROJECT="ui-walk-$LABEL"
WT="$PARENT/step-up-ui-walk-$LABEL"
SERVER="$PROJECT-server"
[ -n "$OUT" ] || OUT="${TMPDIR:-/tmp}/ui-walk/$LABEL"
OUT="${OUT%/}"

dc() { docker compose -p "$PROJECT" --project-directory "$WT" -f "$WT/docker-compose.yml" "$@"; }

cleanup() {
  docker rm -f "$SERVER" >/dev/null 2>&1 || true
  if [ -f "$WT/docker-compose.yml" ]; then
    dc down --volumes --rmi local --remove-orphans >/dev/null 2>&1 || true
  fi
  # Only a worktree this script made: a detached one at the path it names.
  local line
  while IFS= read -r line; do
    if [ "$line" = "worktree $WT" ]; then
      git worktree remove --force "$WT"
      break
    fi
  done < <(git worktree list --porcelain)
}

if [ "$CLEANUP" = 1 ]; then
  cleanup
  echo "ui-walk: removed $SERVER, the $PROJECT volumes and $WT"
  exit 0
fi

# Reuse a kept server only when it serves this same commit.
REUSE=0
if [ "$KEEP" = 1 ] && [ -n "$(docker ps -q --filter "name=^${SERVER}\$")" ] \
  && [ "$(git -C "$WT" rev-parse HEAD 2>/dev/null)" = "$SHA" ]; then
  REUSE=1
  PORT="$(docker port "$SERVER" 3000/tcp)"
  PORT="${PORT%%$'\n'*}"
  PORT="${PORT##*:}"
fi

if [ "$REUSE" = 0 ]; then
  cleanup
  [ -z "$(docker ps -q --filter "publish=$PORT")" ] || die "port $PORT is taken by a running container; pass --port"
  [ "$KEEP" = 1 ] || trap cleanup EXIT
  git worktree add --quiet --detach "$WT" "$SHA"
  mkdir -p "$OUT"
  echo "ui-walk: building $DESC at ${SHA:0:7} in $WT (log: $OUT/build.log)"
  {
    dc build dev
    # The worktree has no .env, so the build and the server never see an API key.
    dc run --rm dev npm ci --no-audit --no-fund
    dc run --rm dev npm run build
  } >"$OUT/build.log" 2>&1 || die "build failed; see $OUT/build.log"
  HOST_PORT="$PORT" dc run -d --rm --service-ports --name "$SERVER" -e MODEL_FAKE=1 dev \
    sh -c "PORT=3000 HOSTNAME=0.0.0.0 node .next/standalone/server.js" >/dev/null
  docker exec "$SERVER" sh -c \
    'for i in $(seq 1 60); do wget -q -O /dev/null http://127.0.0.1:3000/ && exit 0; sleep 1; done; exit 1' \
    || die "the server didn't answer in 60 s; see docker logs $SERVER"
fi
mkdir -p "$OUT"

echo "ui-walk: walking $DESC at ${VIEWPORTS//,/, } on port $PORT"
docker run --rm --add-host=host.docker.internal:host-gateway \
  -v "$SKILL_DIR":/work/skill:ro -v "$DEPS_VOLUME":/work/node_modules -v "$OUT":/out -w /work \
  "$PLAYWRIGHT_IMAGE" sh -c '
    set -e
    # Clear the last results first, so the summary never shows stale ones.
    rm -f /out/result-*.json /out/*.png
    if [ ! -f node_modules/playwright/package.json ]; then
      npm install --no-save --no-package-lock --no-audit --no-fund \
        "playwright@$3" "axe-core@$4" >/dev/null
    fi
    for vp in $(echo "$2" | tr , " "); do node skill/walk.mjs "$1" "$vp" /out || true; done
    node skill/summarize.mjs /out "$5" "$6" "$2" | tee /out/summary.md
  ' sh "http://host.docker.internal:$PORT" "$VIEWPORTS" "$PLAYWRIGHT_VERSION" "$AXE_VERSION" "$DESC" "$SHA"

echo
echo "ui-walk: results and screenshots in $OUT"
if [ "$KEEP" = 1 ]; then
  echo "ui-walk: server left up at http://localhost:$PORT; remove it with: $0 --cleanup ${TARGET:-}"
fi
