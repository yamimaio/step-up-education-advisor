#!/bin/bash
# Commits screenshots to a separate, never-merged branch with git plumbing (a temporary index, then
# commit-tree and update-ref), so the checkout, its index and the current branch stay untouched.
# Prints a raw.githubusercontent URL per file, pinned to the commit, for a PR body (gh can't attach
# images). Pushes only with --push.
# Usage: publish-screenshots.sh <branch> <folder in the branch> [--push] <file.png>...
set -euo pipefail

die() {
  echo "publish-screenshots: $*" >&2
  exit 1
}
[ $# -ge 3 ] || die "usage: publish-screenshots.sh <branch> <folder> [--push] <file.png>..."
BRANCH="$1"
FOLDER="${2%/}"
shift 2
PUSH=0
if [ "$1" = "--push" ]; then
  PUSH=1
  shift
fi
[ $# -gt 0 ] || die "no files"
[ "$BRANCH" != "main" ] || die "never main"
while IFS= read -r line; do
  [ "$line" != "branch refs/heads/$BRANCH" ] || die "$BRANCH is checked out in a worktree; pick another branch"
done < <(git worktree list --porcelain)

GIT_DIR="$(git rev-parse --absolute-git-dir)"
export GIT_INDEX_FILE="$GIT_DIR/ui-walk-screenshots.index"
trap 'rm -f "$GIT_INDEX_FILE"' EXIT

# Start from the branch's last commit, local or on origin, so earlier screenshots stay.
git fetch --quiet origin "refs/heads/$BRANCH:refs/remotes/origin/$BRANCH" 2>/dev/null || true
PARENT="$(git rev-parse --verify --quiet "refs/heads/$BRANCH" || git rev-parse --verify --quiet "refs/remotes/origin/$BRANCH" || true)"
if [ -n "$PARENT" ]; then git read-tree "$PARENT"; else git read-tree --empty; fi

for f in "$@"; do
  [ -f "$f" ] || die "no file $f"
  git update-index --add --cacheinfo "100644,$(git hash-object -w "$f"),$FOLDER/${f##*/}"
done
TREE="$(git write-tree)"
if [ -n "$PARENT" ]; then
  COMMIT="$(git commit-tree "$TREE" -p "$PARENT" -m "Screenshots: $FOLDER")"
else
  COMMIT="$(git commit-tree "$TREE" -m "Screenshots: $FOLDER")"
fi
git update-ref "refs/heads/$BRANCH" "$COMMIT"

REPO="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
if [ "$PUSH" = 1 ]; then
  git push --quiet origin "refs/heads/$BRANCH:refs/heads/$BRANCH"
else
  echo "Committed $COMMIT on $BRANCH (local). Push with: git push origin $BRANCH"
fi
for f in "$@"; do
  echo "https://raw.githubusercontent.com/$REPO/$COMMIT/$FOLDER/${f##*/}"
done
