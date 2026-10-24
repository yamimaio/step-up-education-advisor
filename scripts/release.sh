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

# Prints version $1's notes from CHANGELOG.md at ref $2, or fails.
notes() {
  git show "${2}:CHANGELOG.md" >/dev/null 2>&1 || die "no CHANGELOG.md at $2"
  git show "${2}:CHANGELOG.md" |
    in_dev awk -v v="$1" -f scripts/release-notes.awk
}

# Fails unless package.json's version at commit $1 is $2 (docs/decisions.md: it matches the
# latest release, and each release PR bumps it).
check_package_version() {
  pkg=$(git show "${1}:package.json" |
    in_dev node -e 'let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => console.log(JSON.parse(s).version))') ||
    die "can't read package.json at $1"
  [ "$pkg" = "$2" ] || die "package.json at $1 is version $pkg, not $2: the release PR runs ./run npm version $2 --no-git-tag-version"
}

# Fails when version $1 already has a GitHub Release or a tag on origin. A tag only in this clone
# is left by a run whose tag push failed, and doesn't use the number up (#288).
check_unreleased() {
  if gh release view "v$1" >/dev/null 2>&1; then
    die "v$1 is already published: to change its notes, use scripts/release.sh edit $1"
  fi
  remote=$(git ls-remote --tags origin "refs/tags/v$1") || die "can't read origin's tags"
  [ -z "$remote" ] || die "v$1 is already tagged on origin: pick the next version"
}

# True when version $1 is above version $2.
version_gt() {
  IFS=. read -r a1 a2 a3 <<EOF
$1
EOF
  IFS=. read -r b1 b2 b3 <<EOF
$2
EOF
  [ "$a1" -gt "$b1" ] || { [ "$a1" -eq "$b1" ] && { [ "$a2" -gt "$b2" ] || { [ "$a2" -eq "$b2" ] && [ "$a3" -gt "$b3" ]; }; }; }
}

# Fails unless version $2 is above every published release (#289), and every published release's
# section in CHANGELOG.md at commit $1 still matches its published notes. A PR that branched
# before a release PR and merged after it lands its line under the released version, with no
# conflict (PR #276 review round 5).
check_history() {
  git show "${1}:CHANGELOG.md" >/dev/null 2>&1 || die "no CHANGELOG.md at $1"
  tags=$(gh release list --limit 1000 --json tagName --jq '.[].tagName') || die "can't list releases"
  for tag in $tags; do
    w=${tag#v}
    case "$w" in *[!0-9.]* | "$2") continue ;; esac
    version_gt "$2" "$w" || die "$2 isn't above the published $tag: pick a higher version"
    published=$(gh release view "$tag" --json body --jq .body | in_dev awk -v whole=1 -f scripts/release-notes.awk) ||
      die "can't read $tag's notes"
    current=$(notes "$w" "$1") || die "[$w] has no notes in CHANGELOG.md at $1, but $tag is published"
    [ "$current" = "$published" ] ||
      die "[$w] in CHANGELOG.md at $1 differs from $tag's published notes. A PR that branched before $tag and merged after it lands its line there, and its code is in this commit, so it ships in $2: in a fix PR, move that line into [$2] (git diff $tag $1 -- CHANGELOG.md shows it), then run push and publish with the fix PR's number. If [$w]'s notes were fixed on purpose, run scripts/release.sh edit $w first."
  done
  # Every older version in the CHANGELOG must be published already. A version that was pushed but
  # never published would otherwise be skipped for good once a later one goes out (round 7).
  sections=$(git show "${1}:CHANGELOG.md" | in_dev awk -v versions=1 -f scripts/release-notes.awk) ||
    die "can't read CHANGELOG.md at $1"
  published=" $(printf '%s ' $tags)"
  for w in $sections; do
    case "$w" in *[!0-9.]* | "$2") continue ;; esac
    case "$published" in *" v$w "*) continue ;; esac
    if [ "$w" = "$BACKFILL_VERSION" ]; then
      die "v$w isn't published yet: run scripts/release.sh backfill first"
    fi
    die "[$w] is in CHANGELOG.md at $1, but v$w isn't published: run scripts/release.sh publish <its release PR> $w first"
  done
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
  body=$(notes "$v" "$3") || exit 1
  if gh release view "v$v" >/dev/null 2>&1; then
    die "v$v is already published: to change its notes, use scripts/release.sh edit $v"
  fi
  tagged=$(git rev-parse -q --verify "refs/tags/v${v}^{commit}" || true)
  if [ -n "$tagged" ] && [ "$tagged" != "$sha" ]; then
    remote=$(git ls-remote --tags origin "refs/tags/v$v") || die "can't read origin's tags"
    [ -z "$remote" ] || die "tag v$v is on $tagged, not $sha"
    # Left in this clone by a run whose tag push failed; origin never had it (#288).
    git tag -d "v$v" >/dev/null
    tagged=
  fi
  [ -n "$tagged" ] || git tag -a "v$v" "$sha" -m "v$v"
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
    check_history "$sha" "$2"
    notes "$2" "$sha" >/dev/null || exit 1
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
    check_history "$sha" "$2"
    check_package_version "$sha" "$2"
    publish "$sha" "$2" "$sha" --latest
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
