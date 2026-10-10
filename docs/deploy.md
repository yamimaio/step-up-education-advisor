# Deploying Step Up to Render

Step Up runs on Render as one Docker web service built from the repo's `Dockerfile` (issue #123). The service is defined in `render.yaml`. These are the steps Yami does by hand in the Claude Console and the Render dashboard. Claude Code never sees the production key.

## What the repo provides

- `render.yaml`: one `web` service named `step-up`, Docker runtime, Starter instance (`0.5c-512mb`, never sleeps), region `oregon`, one instance. It deploys the `production` branch, not `main`: merging to `main` changes nothing on the site until you release (see "Releasing"). A release deploys once its CI checks pass (`autoDeployTrigger: checksPass`). The service health-checks `/`. It sets `PORT=3000` and `HOSTNAME=0.0.0.0` to match the image. `MODEL_API_KEY` is listed with `sync: false`, so Render asks for its value when the Blueprint is created and the repo never holds it.
- `.github/workflows/ci.yml`: CI runs on pushes to `main` and `production`, so every release gets its own checks. The `secrets` job runs gitleaks on every commit a PR adds, merge commits included, and fails the PR if it finds a secret.

## Before the first public deploy

- [ ] The per-IP rate limit (#122) is merged.
- [ ] The PR with `render.yaml` and the gitleaks job is merged.
- [ ] The `production` branch exists. After that PR merges, create it from `main` with the two commands under "Releasing". The Blueprint is read from it, so it must already hold `render.yaml`.
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
5. The rate limit counts each visitor separately. The limiter (#124) keys on the last `X-Forwarded-For` entry, which assumes Render's proxy is the only one in front of the app; that can only be checked live. Do it last, since it uses up your own quota for a minute:
   1. On a laptop on home Wi-Fi, open the site, open the browser's developer console and run this. It sends empty requests, which count toward the limit but never reach the model:
      ```js
      for (let i = 0; i < 25; i++) console.log((await fetch("/api/chat", { method: "POST", body: "{}" })).status);
      ```
      The first ones print `400` (empty request) and the rest `429` once the per-minute limit (`server/limits.ts`) is reached. All `400` means the limit isn't working.
   2. Within that minute, on a phone on mobile data (not the same Wi-Fi), open the site and send a message. It gets an answer. A "Wait … seconds" notice means every visitor shares one address: don't announce the URL, and take it back to #124.

When all five hold, tick the boxes in #123 and close it.

## Releasing

Work merges to `main` as usual; the site doesn't change. To put `main` live:

```sh
git fetch origin
git push origin origin/main:refs/heads/production
```

Render deploys the new `production` commit once CI passes on it. A failed check means no deploy (as long as Auto Sync is off, step 2.7), and a deploy whose health check fails is dropped while the previous one keeps serving. To release only part of `main`, push an older commit of it instead: `git push origin <sha>:refs/heads/production`. The full `refs/heads/` name is needed: without it, git can't create `production` on the first release.

`production` only ever moves forward to commits already on `main`. Never commit to it directly. A plain `git push` refuses anything that isn't a fast-forward, and that's the guard: don't add `--force` to get around it.

To see what's live: `git log -1 origin/production`, or the service's **Events** page in Render.

### Rolling back

1. On the service's **Events** page, pick the last good deploy and choose **Rollback**. Render reuses that deploy's build, so it takes seconds. A dashboard rollback also turns auto-deploy off, so a new release can't redeploy the bad change by accident.
2. Fix the problem on `main` (a revert is fine) through the usual PR.
3. In the service's **Settings**, turn auto-deploy back on (**After CI checks pass**), then release as above.

## Day to day

- **Rotate the key.** Create a new key in the Step Up workspace, replace `MODEL_API_KEY` under the service's **Environment** in Render (saving redeploys), check the site, then delete the old key in the Console.
- **Take the site down.** **Suspend** the service in Render's settings. The URL stops answering until you resume it.
- **Changing `render.yaml`.** A release that changes `render.yaml` deploys its code once CI passes, still with the service's old settings. When CI is green on `production`, click **Manual Sync** on the Blueprint's page to apply the new settings; Render redeploys the service with them. Render never asks again for a `sync: false` value: a new secret is added under **Environment** by hand. If you created the service by hand instead, `render.yaml` isn't read at all: change the setting in the dashboard.

## Never

- Put a key in `render.yaml`, `.env.example`, a Render log or anywhere in the repo. The gitleaks job is a backstop, not permission.
- Treat a gitleaks hit on a real key as fixed by rewriting the commit. The repo is public: an amended or force-pushed commit can still be fetched by its SHA and is linked from the PR. Delete that key in the Console and create a new one first, then remove it from the branch.
- Set `MODEL_FAKE` on Render. It replaces the real model with persona A's script.
- Run more than one instance while the rate limit lives in memory.
