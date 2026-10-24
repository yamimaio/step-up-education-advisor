# Prints version v's section of CHANGELOG.md (read on stdin), without its heading and without the
# link definitions at the bottom. Exits 1 when the section has no text besides subheadings, so
# scripts/release.sh never publishes empty notes (#280). With newest=1, also exits 1 when another
# version's section comes before it, so a release can't reuse an old section.
# Usage: awk -v v=0.1.1 [-v newest=1] -f release-notes.awk
index($0, "## [" v "]") == 1 {
  if (newest && before != "") stale = before
  found = 1
  p = 1
  next
}
/^## \[/ {
  if (!found && before == "" && index($0, "## [Unreleased]") != 1) before = $0
  p = 0
}
/^\[.*\]: / { p = 0 }
p && NF && !/^#/ { n++ }
p { print }
END {
  if (stale != "") {
    print "release: [" v "] isn't the newest version in CHANGELOG.md: \"" stale "\" comes first" > "/dev/stderr"
    exit 1
  }
  if (!n) {
    print "release: no notes for [" v "] in CHANGELOG.md" > "/dev/stderr"
    exit 1
  }
}
