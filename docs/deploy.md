# Deploying Step Up to Render

Step Up runs on Render as one Docker web service built from the repo's `Dockerfile` (issue #123). The service is defined in `render.yaml`. These are the steps Yami does by hand in the Claude Console and the Render dashboard. Claude Code never sees the production key.

## What the repo provides

- `render.yaml`: one `web` service named `step-up`, Docker runtime, Starter instance (`0.5c-512mb`, never sleeps), region `oregon`, one instance. It deploys the `production` branch, not `main`: merging to `main` changes nothing on the site until you release (see "Releasing"). A release deploys once its CI checks pass (`autoDeployTrigger: checksPass`). The service health-checks `/`. It sets `PORT=3000` and `HOSTNAME=0.0.0.0` to match the image. `MODEL_API_KEY` is listed with `sync: false`, so Render asks for its value when the Blueprint is created and the repo never holds it.
- `.github/workflows/ci.yml`: CI runs on pushes to `main` and `production`, so every release gets its own checks. The `secrets` job runs gitleaks on every commit a PR adds, merge commits included, and fails the PR if it finds a secret.

## Before the first public deploy

- [ ] The per-IP rate limit (#122) is merged.
- [ ] The PR with `render.yaml` and the gitleaks job is merged.
- [ ] The `production` branch exists. After that PR merges, create it from `main` with `git fetch origin` and `git push origin origin/main:refs/heads/production`. The Blueprint is read from it, so it must already hold `render.yaml`.
- [ ] The production key exists, with a spend limit on its workspace (next section).

## 1. Create the production key (Claude Console)

1. Sign in at [platform.claude.com](https://platform.claude.com) (`console.anthropic.com` redirects there).
2. Open the **Step Up** workspace's settings and set its **spend limit**: the most you are willing to lose in a month if the site is abused. Every key in the workspace shares it.
3. Go to **API keys**, choose **Create key**, pick the **Step Up** workspace and name the key `step-up-prod`.
4. Copy the key. The Console shows it only once. Paste it straight into Render in step 2.4 and nowhere else: not in `.env`, a terminal, an issue, a PR or a chat with Claude.

If you lose the key before pasting it, delete it in the Console and create a new one.

## 2. Create the service (Render dashboard)

1. Sign in at [dashboard.render.com](https://dashboard.render.com). Check that the $50 of credits show under **Billing**.
2. Choose **New**, then **Blueprint**. Connect GitHub if Render asks, and give the Render GitHub app access to `yamimaio/step-up-education-advisor` only.
3. Pick the repo and the `production` branch, and give the Blueprint a name (`step-up`). Render reads `render.yaml` and lists one web service, `step-up`.
4. Render asks for `MODEL_API_KEY`. Paste the `step-up-prod` key.
5. Choose **Deploy Blueprint**. Render builds the `Dockerfile` (a few minutes), starts the container and waits for `/` to answer before it sends traffic.
6. The site's URL is on the service page: `https://step-up-<suffix>.onrender.com`.
7. Open the Blueprint's **Settings** page and set **Auto Sync** to **No**. With Auto Sync on, every push to `production` that changes `render.yaml` deploys straight away, and Render doesn't say it waits for CI checks. With it off, `render.yaml` changes wait for a **Manual Sync** (see "Changing `render.yaml`" below).

The region (`oregon`) can't be changed once the service exists. To use another one (`ohio`, `virginia`, `frankfurt` or `singapore`), change `region` in `render.yaml` before step 2.

### Without a Blueprint

If you'd rather create the service by hand (**New**, then **Web Service**), use the same settings:

| Setting | Value |
| --- | --- |
| Repository, branch | `yamimaio/step-up-education-advisor`, `production` |
| Language | Docker |
| Dockerfile path, context | `./Dockerfile`, `.` |
| Region | Oregon |
| Instance type | Starter (0.5 CPU, 512 MB) |
| Health check path | `/` |
| Auto-deploy | After CI checks pass |
| Environment: `MODEL_API_KEY` | the `step-up-prod` key (secret) |
| Environment: `PORT` | `3000` |
| Environment: `HOSTNAME` | `0.0.0.0` |

Keep one instance: the rate limit is held in memory, so a second instance would double it.

## 3. Check it's live

1. Open the URL in a private window. The page loads and the privacy notice shows.
2. Play persona A (`personas/A.md`) to the verdict. The answers come from the real model, not the scripted fake.
3. In Render, open the service's **Logs**. Each chat request logs one `{"event":"chat_request",...}` line with counts and statuses. No line holds message text.
4. In the Console, the Step Up workspace's usage shows the spend from the test run.
5. The rate limit counts each visitor separately. The limiter (#186) keys on `CF-Connecting-IP`, which Cloudflare sets in front of Render, and falls back to the last `X-Forwarded-For` entry when it is missing; that can only be checked live. Do it last, since it uses up your own quota for a minute:
   1. On a laptop on home Wi-Fi, open the site, open the browser's developer console and run this. It sends empty requests, which count toward the limit but never reach the model:
      ```js
      for (let i = 0; i < 25; i++) console.log((await fetch("/api/chat", { method: "POST", body: "{}" })).status);
      ```
      The first ones print `400` (empty request) and the rest `429` once the per-minute limit (`server/limits.ts`) is reached. All `400` means the limit isn't working.
   2. Within that minute, on a phone on mobile data (not the same Wi-Fi), open the site and send a message. It gets an answer. A "Wait … seconds" notice means every visitor shares one address: don't announce the URL, and take it back to #190.

When all five hold, tick the boxes in #123 and close it.

## Releasing

Work merges to `main` as usual; the site doesn't change. A release puts one commit of `main` live: the merge commit of its release PR, pushed to `production`. `scripts/release.sh` does the push and the tagging; the steps are under "Release notes" below.

Render deploys the new `production` commit once CI passes on it. A failed check means no deploy (as long as Auto Sync is off, step 2.7), and a deploy whose health check fails is dropped while the previous one keeps serving. The script pushes only a merged PR's merge commit, to the full `refs/heads/production`: an empty source in a refspec (`:refs/heads/production`) would delete the branch.

`production` only ever moves forward to commits already on `main`. Never commit to it directly. A plain `git push` refuses anything that isn't a fast-forward, and that's the guard: don't add `--force` to get around it.

To see what's live: `git log -1 origin/production`, the latest tag (`git describe --tags origin/production`), or the service's **Events** page in Render.

### Release notes

Every release has a section in `CHANGELOG.md`, a `vX.Y.Z` tag on the `production` commit that went live, and a GitHub Release with the same notes. Every PR adds its line under `## [Unreleased]` in `CHANGELOG.md`; changes that only touch docs, tests or tooling may be grouped. The version rules are in `docs/decisions.md` ("Versions and release notes"): a patch for fixes and security, a minor for features.

1. **Before releasing**, make these changes in a release PR to `main` (or in the last PR going out):
   - rename `## [Unreleased]` to `## [X.Y.Z] - YYYY-MM-DD`, and add a new, empty `## [Unreleased]` above it. The date is the day the release goes live, so merge and release on the same day;
   - update the links at the bottom of `CHANGELOG.md`: `[unreleased]` compares `vX.Y.Z...HEAD`, and a new `[X.Y.Z]` line compares the previous tag with it (`compare/vW.W.W...vX.Y.Z`);
   - set `version` in `package.json` and `package-lock.json` to `X.Y.Z`: `./run npm version X.Y.Z --no-git-tag-version`.

   Merge it.

2. **Put it live** with `scripts/release.sh push <release PR> X.Y.Z`. It pushes **that PR's merge commit** to `production`, not the tip of `main`: a PR merged after it isn't in the version's notes, so it waits for the next release. The script stops, before pushing, in any of these cases:
   - the PR isn't merged, or its merge commit isn't on `main`;
   - `vX.Y.Z` is already tagged on origin or published, or it isn't above every published version;
   - at that commit, `[X.Y.Z]` isn't the newest section after Unreleased, or has no notes;
   - at that commit, a published version's section differs from its published notes (see below);
   - at that commit, `package.json` isn't at `X.Y.Z`.

   **PRs open across a release.** A PR that branched before a release PR, and merges after it, puts its line under the version just released, and git merges it with no conflict. So once a release PR merges, every open PR merges `main` and checks that its line is still under `## [Unreleased]`. If one slips through, the next `push` stops and names the version whose section changed. Move the line back under `[Unreleased]` in a PR. If a released section was changed on purpose (a fix to its notes), run `scripts/release.sh edit` for that version first.

3. **After Render shows the deploy live** (the service's **Events** page names the commit that `push` printed), run `scripts/release.sh publish <release PR> X.Y.Z`. It tags the merge commit `vX.Y.Z`, pushes the tag, and creates the GitHub Release from that commit's `X.Y.Z` section. The release becomes the repo's Latest. It stops, before tagging, in any of these cases:
   - `production` isn't at that commit;
   - CI hasn't passed on that commit's push to `production`. Render deploys only once it has, so a failed or unfinished run means the commit isn't live, and the version keeps its number;
   - the PR isn't merged; `X.Y.Z` isn't above every published version; a section check from `push` fails; or `package.json` isn't at `X.Y.Z`;
   - the tag is already on origin at another commit, or the release is already published.

   If it stops after pushing the tag (a `gh` error), run it again: it reuses a tag that's already on the commit. A tag that only this clone has, left by a failed tag push, is replaced.

The script runs only `git`, `gh` and `docker` on the host. The section is cut out by `scripts/release-notes.awk`, and `package.json` is read, in the dev container. `tests/release.test.ts` covers each check. Two more commands:

- `scripts/release.sh notes X.Y.Z [<ref>]` prints the notes (from `origin/main` by default), to read them before a release.
- If a published release has a mistake, fix `CHANGELOG.md` in a PR and merge it, then run `scripts/release.sh edit X.Y.Z`. It fetches and republishes the notes from `origin/main`, and stops when they're empty.

**If the deploy failed or was rolled back before it was tagged**, the version keeps its number, since no tag points at it. The fix PR adds its line under `## [X.Y.Z]`, not Unreleased, and sets that section's date to the new release day. Any PR merged since the release PR moves its line there too, because releasing the fix PR's merge commit ships it. Then run `push` and `publish` with the fix PR. A rollback after tagging doesn't move or delete the tag: the fix goes out as the next version.

#### The v0.1.0 backfill (once)

`c15c109`, the first public release, went live before `CHANGELOG.md` existed, so its notes come from `main`. Once this changelog is on `main`, run `scripts/release.sh backfill`. It tags `c15c109` as `v0.1.0` and creates its GitHub Release from `origin/main`'s `[0.1.0]` section.

### Rolling back

1. On the service's **Events** page, pick the last good deploy and choose **Rollback**. Render reuses that deploy's build, so it takes seconds. A dashboard rollback also turns auto-deploy off, so a new release can't redeploy the bad change by accident.
2. Fix the problem on `main` (a revert is fine) through the usual PR.
3. In the service's **Settings**, turn auto-deploy back on (**After CI checks pass**), then release the fix with `scripts/release.sh push` and `publish` ("Release notes"), under the same version if the bad one was never tagged.

## Day to day

- **Rotate the key.** Create a new key in the Step Up workspace, replace `MODEL_API_KEY` under the service's **Environment** in Render (saving redeploys), check the site, then delete the old key in the Console.
- **Take the site down.** **Suspend** the service in Render's settings. The URL stops answering until you resume it.
- **Changing `render.yaml`.** A release that changes `render.yaml` deploys its code once CI passes, still with the service's old settings. When CI is green on `production`, click **Manual Sync** on the Blueprint's page to apply the new settings; Render redeploys the service with them. Render never asks again for a `sync: false` value: a new secret is added under **Environment** by hand. If you created the service by hand instead, `render.yaml` isn't read at all: change the setting in the dashboard.

## Never

- Put a key in `render.yaml`, `.env.example`, a Render log or anywhere in the repo. The gitleaks job is a backstop, not permission.
- Treat a gitleaks hit on a real key as fixed by rewriting the commit. The repo is public: an amended or force-pushed commit can still be fetched by its SHA and is linked from the PR. Delete that key in the Console and create a new one first, then remove it from the branch.
- Set `MODEL_FAKE` on Render. It replaces the real model with persona A's script.
- Run more than one instance while the rate limit lives in memory.
