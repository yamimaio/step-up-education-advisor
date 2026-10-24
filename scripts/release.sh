#!/bin/sh
# Releases Step Up (docs/deploy.md, "Release notes"). Runs only git, gh and docker on the host
# (CLAUDE.md rule 5); the CHANGELOG section is cut out by scripts/release-notes.awk and
# package.json is read in the dev container. Every check runs before anything is pushed, tagged
# or published.
#
#   scripts/release.sh push <release PR> <version>     push the PR's merge commit to production
#   scripts/release.sh publish <release PR> <version>  once it's live: tag it, create the Release
#   scripts/release.sh edit <version>                  republish the notes from origin/main
#   scripts/release.sh notes <version> [<ref>]         print the notes (default ref: origin/main)
#   scripts/release.sh backfill                        v0.1.0 on c15c109, notes from origin/main
set -eu

# The first public release went live before CHANGELOG.md existed (docs/decisions.md, "Versions
# and release notes").
BACKFILL_SHA=c15c1097bd3d0dda8c48931ffdaf4a19a7d57f4f
BACKFILL_VERSION=0.1.0

die() {
  printf 'release: %s\n' "$*" >&2
  exit 1
}

usage() {
  die "usage: scripts/release.sh push|publish <release PR> <version> | edit <version> | notes <version> [<ref>] | backfill"
}

check_version() {
  case "$1" in
    *[!0-9.]* | *.*.*.* | *..* | .* | *.) die "not a version: '$1' (expected X.Y.Z, e.g. 0.1.1)" ;;
    *.*.*) ;;
    *) die "not a version: '$1' (expected X.Y.Z, e.g. 0.1.1)" ;;
  esac
}

# Runs a command in the dev container. --progress quiet keeps Compose's build log, printed when
# the image has to be built first, out of what the command prints.
in_dev() {
  docker compose --progress quiet run --rm -T dev "$@"
}

# Prints version $1's notes from CHANGELOG.md at ref $2, or fails. With $3 = newest, also fails
# when another version's section comes before it.
notes() {
  git show "${2}:CHANGELOG.md" >/dev/null 2>&1 || die "no CHANGELOG.md at $2"
  git show "${2}:CHANGELOG.md" |
    in_dev awk -v v="$1" -v newest="$([ "${3:-}" = newest ] && echo 1 || echo 0)" -f scripts/release-notes.awk
}

# Fails unless package.json's version at commit $1 is $2 (docs/decisions.md: it matches the
# latest release, and each release PR bumps it).
check_package_version() {
  pkg=$(git show "${1}:package.json" |
    in_dev node -e 'let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => console.log(JSON.parse(s).version))') ||
    die "can't read package.json at $1"
  [ "$pkg" = "$2" ] || die "package.json at $1 is version $pkg, not $2: the release PR runs ./run npm version $2 --no-git-tag-version"
}

# Fails when version $1 already has a tag or a GitHub Release. Run after git fetch --tags.
check_unreleased() {
  if gh release view "v$1" >/dev/null 2>&1; then
    die "v$1 is already published: to change its notes, use scripts/release.sh edit $1"
  fi
  if git rev-parse -q --verify "refs/tags/v$1" >/dev/null; then
    die "v$1 is already tagged: pick the next version"
  fi
}

# Fails unless CI passed on the production push of commit $1: Render deploys only then
# (render.yaml, autoDeployTrigger: checksPass).
check_ci() {
  runs=$(gh run list --commit "$1" --branch production --event push --json status,conclusion \
    --jq '.[] | .status + " " + .conclusion') || die "can't read CI runs for $1"
  [ -n "$runs" ] || die "no CI run on production for $1 yet: wait for it, and for Render to deploy"
  printf '%s\n' "$runs" | while read -r status conclusion; do
    [ "$status $conclusion" = "completed success" ] ||
      die "CI on production for $1 is '$status $conclusion', so Render didn't deploy it: don't tag it"
  done || exit 1
}

# Prints PR $1's merge commit, or fails when the PR isn't merged. For an open PR, gh prints no
# commit and exits 0, and an empty source in a push refspec would delete production.
merge_commit() {
  out=$(gh pr view "$1" --json state,mergeCommit --jq '.state + " " + (.mergeCommit.oid // "")') ||
    die "can't read PR #$1"
  state=${out%% *}
  sha=${out#* }
  [ "$state" = MERGED ] && [ -n "$sha" ] || die "PR #$1 isn't merged (state: $state): nothing to release"
  printf '%s\n' "$sha"
}

# Tags commit $1 as v$2 and creates its GitHub Release from the notes at ref $3, passing $4 on to
# gh release create. A tag already on that commit is reused, so a run that stopped after pushing
# the tag can be repeated.
publish() {
  sha=$1
  v=$2
  body=$(notes "$v" "$3" "${5:-}") || exit 1
  if gh release view "v$v" >/dev/null 2>&1; then
    die "v$v is already published: to change its notes, use scripts/release.sh edit $v"
  fi
  tagged=$(git rev-parse -q --verify "refs/tags/v${v}^{commit}" || true)
  if [ -z "$tagged" ]; then
    git tag -a "v$v" "$sha" -m "v$v"
  elif [ "$tagged" != "$sha" ]; then
    die "tag v$v is on $tagged, not $sha"
  fi
  git push origin "refs/tags/v$v"
  printf '%s\n' "$body" | gh release create "v$v" --verify-tag --title "v$v" "$4" --notes-file -
}

cd "$(git rev-parse --show-toplevel)"
[ $# -ge 1 ] || usage
cmd=$1
shift

case "$cmd" in
  push)
    [ $# -eq 2 ] || usage
    check_version "$2"
    git fetch -q --tags origin
    sha=$(merge_commit "$1")
    git merge-base --is-ancestor "$sha" origin/main || die "$sha isn't on origin/main"
    check_unreleased "$2"
    notes "$2" "$sha" newest >/dev/null || exit 1
    check_package_version "$sha" "$2"
    git push origin "${sha}:refs/heads/production"
    printf 'release: pushed %s to production. Once Render shows it live: scripts/release.sh publish %s %s\n' "$sha" "$1" "$2"
    ;;
  publish)
    [ $# -eq 2 ] || usage
    check_version "$2"
    git fetch -q --tags origin
    sha=$(merge_commit "$1")
    live=$(git rev-parse origin/production)
    [ "$live" = "$sha" ] || die "production is at $live, not PR #$1's merge commit $sha: run push first"
    check_ci "$sha"
    check_package_version "$sha" "$2"
    publish "$sha" "$2" "$sha" --latest newest
    ;;
  edit)
    [ $# -eq 1 ] || usage
    check_version "$1"
    git fetch -q origin
    body=$(notes "$1" origin/main) || exit 1
    gh release view "v$1" >/dev/null 2>&1 || die "v$1 isn't published yet"
    printf '%s\n' "$body" | gh release edit "v$1" --notes-file -
    ;;
  notes)
    [ $# -eq 1 ] || [ $# -eq 2 ] || usage
    check_version "$1"
    git fetch -q origin
    notes "$1" "${2:-origin/main}"
    ;;
  backfill)
    [ $# -eq 0 ] || usage
    git fetch -q --tags origin
    git merge-base --is-ancestor "$BACKFILL_SHA" origin/production || die "$BACKFILL_SHA isn't on production"
    # An older version must never become the repo's Latest release (#285).
    publish "$BACKFILL_SHA" "$BACKFILL_VERSION" origin/main --latest=false
    ;;
  *) usage ;;
esac
