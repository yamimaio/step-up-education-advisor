# Prints version v's section of CHANGELOG.md (read on stdin), without its heading and without the
# link definitions at the bottom. Exits 1 when the section has no text besides subheadings, so
# scripts/release.sh never publishes empty notes (#280). Usage: awk -v v=0.1.1 -f release-notes.awk
index($0, "## [" v "]") == 1 { p = 1; next }
/^## \[/ || /^\[.*\]: / { p = 0 }
p && NF && !/^#/ { n++ }
p { print }
END {
  if (!n) {
    print "release: no notes for [" v "] in CHANGELOG.md" > "/dev/stderr"
    exit 1
  }
}
