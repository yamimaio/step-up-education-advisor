# Prints version v's section of CHANGELOG.md (read on stdin), without its heading and without the
# link definitions at the bottom. Exits 1 when the section has no text besides subheadings, so
# scripts/release.sh never publishes empty notes (#280). With newest=1, also exits 1 when another
# version's section comes before it, so a release can't reuse an old section. With whole=1, the
# whole input is the section (to normalize a published Release's notes for a comparison).
# Output is normalized: no carriage returns, no trailing spaces, no blank lines at either end.
# Usage: awk -v v=0.1.1 [-v newest=1] [-v whole=1] -f release-notes.awk
{
  sub(/\r$/, "")
  sub(/[ \t]+$/, "")
}
whole { out[++k] = $0; next }
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
p { out[++k] = $0 }
END {
  if (stale != "") {
    print "release: [" v "] isn't the newest version in CHANGELOG.md: \"" stale "\" comes first" > "/dev/stderr"
    exit 1
  }
  if (!whole && !n) {
    print "release: no notes for [" v "] in CHANGELOG.md" > "/dev/stderr"
    exit 1
  }
  first = 1
  while (first <= k && out[first] == "") first++
  last = k
  while (last >= first && out[last] == "") last--
  for (i = first; i <= last; i++) print out[i]
}
