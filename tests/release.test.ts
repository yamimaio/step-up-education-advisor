// scripts/release.sh, run by sh against fake git, gh and docker (issue #281). The fakes keep their
// state in a temp directory and log every call; the fake docker runs the real
// scripts/release-notes.awk, so the notes tests exercise the same awk program a release does.
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const SHA = "1111111111111111111111111111111111111111";
const OTHER = "2222222222222222222222222222222222222222";
const BACKFILL = "c15c1097bd3d0dda8c48931ffdaf4a19a7d57f4f";

const CHANGELOG = `# Changelog

## [Unreleased]

## [0.1.1] - 2026-10-24

### Security

- Node 24.22.1 (#273).

## [0.1.0] - 2026-10-11

The first public release.

### Added

- The advisor.

[unreleased]: https://example.test/compare/v0.1.1...HEAD
[0.1.1]: https://example.test/compare/v0.1.0...v0.1.1
[0.1.0]: https://example.test/releases/tag/v0.1.0
`;

const FAKE_GIT = `#!/bin/sh
echo "git $*" >> "$FAKE/log"
case "$1" in
  rev-parse)
    case "$2" in
      --show-toplevel) echo "$REPO" ;;
      origin/production) cat "$FAKE/production" ;;
      -q) t=\${4#refs/tags/}; t=\${t%'^{commit}'}; [ -f "$FAKE/tags/$t" ] && cat "$FAKE/tags/$t" || exit 1 ;;
    esac ;;
  show)
    f="$FAKE/show/$(printf '%s' "\${2%%:*}" | tr / _)__\${2#*:}"
    [ -f "$f" ] || { echo "fatal: path '\${2#*:}' does not exist" >&2; exit 128; }
    cat "$f" ;;
  merge-base) [ ! -f "$FAKE/not-ancestor" ] ;;
  tag) printf '%s\\n' "$4" > "$FAKE/tags/$3" ;;
esac
`;

const FAKE_GH = `#!/bin/sh
echo "gh $*" >> "$FAKE/log"
case "$1 $2" in
  "pr view") cat "$FAKE/pr" ;;
  "run list") cat "$FAKE/runs" ;;
  "release view") [ -f "$FAKE/releases/$3" ] ;;
  "release create") [ -f "$FAKE/gh-fails" ] && exit 1; cat > "$FAKE/releases/$3" ;;
  "release edit") cat > "$FAKE/releases/$3" ;;
esac
`;

// docker compose --progress quiet run --rm -T dev <command...>: runs the command here.
const FAKE_DOCKER = `#!/bin/sh
echo "docker $*" >> "$FAKE/log"
while [ "$1" != dev ]; do shift; done
shift
exec "$@"
`;

let fake: string;

const write = (path: string, text: string) => writeFileSync(join(fake, path), text);
const read = (path: string) => readFileSync(join(fake, path), "utf8");
const log = () => (existsSync(join(fake, "log")) ? read("log") : "");
const atRef = (ref: string, path: string, text: string) =>
  write(`show/${ref.replaceAll("/", "_")}__${path}`, text);
const changelogAt = (ref: string, text = CHANGELOG) => atRef(ref, "CHANGELOG.md", text);
const packageAt = (ref: string, version: string) =>
  atRef(ref, "package.json", JSON.stringify({ name: "step-up", version }, null, 2));
// Each logged call in order, so a test can check that one ran before another.
const calls = () => log().split("\n");

function release(...args: string[]) {
  const bin = join(fake, "bin");
  const result = spawnSync("sh", ["scripts/release.sh", ...args], {
    encoding: "utf8",
    // Only what the script needs: never the container's .env.
    env: { NODE_ENV: "test", PATH: `${bin}:${process.env.PATH}`, FAKE: fake, REPO: process.cwd() },
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

beforeEach(() => {
  fake = mkdtempSync(join(tmpdir(), "release-test-"));
  for (const dir of ["bin", "show", "tags", "releases"]) mkdirSync(join(fake, dir));
  for (const [name, body] of Object.entries({ git: FAKE_GIT, gh: FAKE_GH, docker: FAKE_DOCKER })) {
    write(`bin/${name}`, body);
    chmodSync(join(fake, "bin", name), 0o755);
  }
  write("pr", `MERGED ${SHA}\n`);
  write("production", `${SHA}\n`);
  write("runs", "completed success\n");
  changelogAt(SHA);
  packageAt(SHA, "0.1.1");
  changelogAt("origin/main");
});

afterEach(() => rmSync(fake, { recursive: true, force: true }));

describe("notes", () => {
  it("prints the version's section without its heading or the links", () => {
    const { status, stdout } = release("notes", "0.1.0");
    expect(status).toBe(0);
    expect(stdout).toContain("The first public release.");
    expect(stdout).toContain("- The advisor.");
    expect(stdout).not.toContain("## [0.1.0]");
    expect(stdout).not.toContain("[unreleased]:");
    expect(stdout).not.toContain("Node 24.22.1");
    // Without --progress quiet, a first-time image build prints into the notes (#286).
    expect(log()).toContain("docker compose --progress quiet run --rm -T dev awk");
  });

  it("matches the whole version: 0.1.1 is not 0.1.10", () => {
    changelogAt("origin/main", "## [0.1.10] - 2026-12-01\n\n- Later.\n");
    const { status, stderr } = release("notes", "0.1.1");
    expect(status).toBe(1);
    expect(stderr).toContain("no notes for [0.1.1]");
  });

  it("fails on a missing section, an empty one and one with only subheadings (#280)", () => {
    changelogAt(
      "origin/main",
      "## [Unreleased]\n\n### Added\n\n### Fixed\n\n## [0.1.0] - 2026-10-11\n\n- x\n",
    );
    for (const v of ["9.9.9", "0.0.1"]) {
      const { status, stderr } = release("notes", v);
      expect(status).toBe(1);
      expect(stderr).toContain(`no notes for [${v}]`);
    }
    changelogAt(
      "origin/main",
      "## [0.2.0] - 2026-11-01\n\n### Added\n\n### Fixed\n\n## [0.1.0] - 2026-10-11\n\n- x\n",
    );
    expect(release("notes", "0.2.0").status).toBe(1);
  });

  it("fails when the ref has no CHANGELOG.md", () => {
    const { status, stderr } = release("notes", "0.1.0", "c15c109");
    expect(status).toBe(1);
    expect(stderr).toContain("no CHANGELOG.md at c15c109");
  });

  it("refuses a version that isn't X.Y.Z", () => {
    for (const v of ["v0.1.1", "0.1.1.", "0..1", "1.2.3.4", "", "0.1.x"]) {
      expect(release("notes", v).status).toBe(1);
    }
  });
});

describe("push", () => {
  it("pushes the release PR's merge commit to production", () => {
    const { status, stdout } = release("push", "290", "0.1.1");
    expect(status).toBe(0);
    expect(log()).toContain(`git push origin ${SHA}:refs/heads/production`);
    expect(stdout).toContain("scripts/release.sh publish 290 0.1.1");
  });

  it("never pushes for a PR that isn't merged, which gh reports with no commit", () => {
    write("pr", "OPEN \n");
    const { status, stderr } = release("push", "290", "0.1.1");
    expect(status).toBe(1);
    expect(stderr).toContain("isn't merged");
    write("pr", `CLOSED ${SHA}\n`);
    expect(release("push", "290", "0.1.1").stderr).toContain("isn't merged (state: CLOSED)");
    expect(log()).not.toContain("git push");
  });

  it("never pushes a commit without notes for the version, or one that isn't on main", () => {
    expect(release("push", "290", "0.1.2").status).toBe(1);
    write("not-ancestor", "");
    expect(release("push", "290", "0.1.1").status).toBe(1);
    expect(log()).not.toContain("git push");
  });

  it("never pushes a version that's already tagged or published", () => {
    write("tags/v0.1.1", `${OTHER}\n`);
    expect(release("push", "300", "0.1.1").stderr).toContain("v0.1.1 is already tagged");
    rmSync(join(fake, "tags/v0.1.1"));
    write("releases/v0.1.1", "old");
    expect(release("push", "300", "0.1.1").stderr).toContain("v0.1.1 is already published");
    expect(log()).not.toContain("git push");
  });

  it("never pushes an older version's section: it must be the newest after Unreleased", () => {
    const { status, stderr } = release("push", "290", "0.1.0");
    expect(status).toBe(1);
    expect(stderr).toContain(
      '[0.1.0] isn\'t the newest version in CHANGELOG.md: "## [0.1.1] - 2026-10-24"',
    );
    expect(log()).not.toContain("git push");
  });

  it("never pushes when package.json isn't at the version (#287)", () => {
    packageAt(SHA, "0.1.0");
    const { status, stderr } = release("push", "290", "0.1.1");
    expect(status).toBe(1);
    expect(stderr).toContain(
      "package.json at 1111111111111111111111111111111111111111 is version 0.1.0",
    );
    expect(log()).not.toContain("git push");
  });
});

describe("publish", () => {
  it("tags the merge commit and creates the Release from its notes", () => {
    const { status } = release("publish", "290", "0.1.1");
    expect(status).toBe(0);
    expect(log()).toContain(`git tag -a v0.1.1 ${SHA} -m v0.1.1`);
    expect(log()).toContain("git push origin refs/tags/v0.1.1");
    expect(log()).toContain(
      "gh release create v0.1.1 --verify-tag --title v0.1.1 --latest --notes-file -",
    );
    expect(read("releases/v0.1.1")).toContain("- Node 24.22.1 (#273).");
    expect(read("releases/v0.1.1")).not.toContain("The first public release.");
  });

  it("stops before tagging unless CI passed on production, which Render waits for (#284)", () => {
    for (const runs of [
      "",
      "completed failure\n",
      "in_progress \n",
      "completed success\ncompleted cancelled\n",
    ]) {
      write("runs", runs);
      const { status, stderr } = release("publish", "290", "0.1.1");
      expect(status).toBe(1);
      expect(stderr).toMatch(runs ? /CI on production for .* is '/ : /no CI run on production/);
    }
    expect(log()).toContain(`gh run list --commit ${SHA} --branch production --event push`);
    expect(log()).not.toContain("git tag");
  });

  it("stops before tagging an older version or a package.json on another version", () => {
    // Before the backfill, 0.1.1's commit still has a [0.1.0] section (round 4).
    packageAt(SHA, "0.1.0");
    expect(release("publish", "290", "0.1.0").stderr).toContain("isn't the newest version");
    expect(release("publish", "290", "0.1.1").stderr).toContain("is version 0.1.0, not 0.1.1");
    expect(log()).not.toContain("git tag");
  });

  it("stops before tagging when production isn't at the merge commit", () => {
    write("production", `${OTHER}\n`);
    const { status, stderr } = release("publish", "290", "0.1.1");
    expect(status).toBe(1);
    expect(stderr).toContain("run push first");
    expect(log()).not.toContain("git tag");
  });

  it("stops before tagging when the notes are empty", () => {
    changelogAt(SHA, "## [0.1.1] - 2026-10-24\n\n### Security\n");
    expect(release("publish", "290", "0.1.1").status).toBe(1);
    expect(log()).not.toContain("git tag");
    expect(log()).not.toContain("gh release create");
  });

  it("can be run again after gh failed past the tag push (#283)", () => {
    write("gh-fails", "");
    expect(release("publish", "290", "0.1.1").status).not.toBe(0);
    expect(read("tags/v0.1.1").trim()).toBe(SHA);
    rmSync(join(fake, "gh-fails"));
    rmSync(join(fake, "log"));
    expect(release("publish", "290", "0.1.1").status).toBe(0);
    expect(log()).not.toContain("git tag");
    expect(read("releases/v0.1.1")).toContain("- Node 24.22.1 (#273).");
  });

  it("refuses a tag on another commit, and a version already published", () => {
    write("tags/v0.1.1", `${OTHER}\n`);
    expect(release("publish", "290", "0.1.1").stderr).toContain(`tag v0.1.1 is on ${OTHER}`);
    rmSync(join(fake, "tags/v0.1.1"));
    write("releases/v0.1.1", "old");
    expect(release("publish", "290", "0.1.1").stderr).toContain("already published");
    expect(log()).not.toContain("gh release create");
  });
});

describe("edit", () => {
  it("replaces published notes with origin/main's", () => {
    write("releases/v0.1.0", "old");
    expect(release("edit", "0.1.0").status).toBe(0);
    expect(read("releases/v0.1.0")).toContain("- The advisor.");
    // Without the fetch, origin/main could still hold the notes being fixed (#286).
    const fetched = calls().findIndex((c) => c.startsWith("git fetch"));
    const shown = calls().findIndex((c) => c === "git show origin/main:CHANGELOG.md");
    expect(fetched).toBeGreaterThanOrEqual(0);
    expect(fetched).toBeLessThan(shown);
  });

  it("never blanks a published release when origin/main has no notes for it", () => {
    write("releases/v0.1.0", "old");
    changelogAt("origin/main", "## [Unreleased]\n");
    expect(release("edit", "0.1.0").status).toBe(1);
    expect(read("releases/v0.1.0")).toBe("old");
  });
});

describe("backfill", () => {
  it("tags c15c109 as v0.1.0 with origin/main's notes", () => {
    expect(release("backfill").status).toBe(0);
    expect(log()).toContain(`git tag -a v0.1.0 ${BACKFILL} -m v0.1.0`);
    expect(read("releases/v0.1.0")).toContain("The first public release.");
  });

  it("never marks v0.1.0 as the Latest release (#285)", () => {
    release("backfill");
    expect(log()).toContain("gh release create v0.1.0 --verify-tag --title v0.1.0 --latest=false");
  });
});
