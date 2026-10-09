# Deploying Step Up to Render

Step Up runs on Render as one Docker web service built from the repo's `Dockerfile` (issue #123). The service is defined in `render.yaml`. These are the steps Yami does by hand in the Claude Console and the Render dashboard. Claude Code never sees the production key.

## What the repo provides

- `render.yaml`: one `web` service named `step-up`, Docker runtime, Starter instance (`0.5c-512mb`, never sleeps), region `oregon`, one instance. It deploys `main` automatically once a commit's CI checks pass (`autoDeployTrigger: checksPass`) and health-checks `/`. It sets `PORT=3000` and `HOSTNAME=0.0.0.0` to match the image. `MODEL_API_KEY` is listed with `sync: false`, so Render asks for its value when the Blueprint is created and the repo never holds it.
- `.github/workflows/ci.yml`: the `secrets` job runs gitleaks on every commit a PR adds and fails the PR if it finds a secret.

## Before the first public deploy

- [ ] The per-IP rate limit (#122) is merged.
- [ ] The PR with `render.yaml` and the gitleaks job is merged.
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
3. Pick the repo and the `main` branch, and give the Blueprint a name (`step-up`). Render reads `render.yaml` and lists one web service, `step-up`.
4. Render asks for `MODEL_API_KEY`. Paste the `step-up-prod` key.
5. Choose **Deploy Blueprint**. Render builds the `Dockerfile` (a few minutes), starts the container and waits for `/` to answer before it sends traffic.
6. The site's URL is on the service page: `https://step-up-<suffix>.onrender.com`.

The region (`oregon`) can't be changed once the service exists. To use another one (`ohio`, `virginia`, `frankfurt` or `singapore`), change `region` in `render.yaml` before step 2.

### Without a Blueprint

If you'd rather create the service by hand (**New**, then **Web Service**), use the same settings:

| Setting | Value |
| --- | --- |
| Repository, branch | `yamimaio/step-up-education-advisor`, `main` |
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

When all four hold, tick the boxes in #123 and close it.

## Day to day

- **Deploys.** Merging to `main` deploys once CI passes on the merge commit. A failed check means no deploy. A deploy whose health check fails is dropped and the previous one keeps serving.
- **Rollback.** On the service's **Events** page, pick an earlier deploy and choose **Rollback**.
- **Rotate the key.** Create a new key in the Step Up workspace, replace `MODEL_API_KEY` under the service's **Environment** in Render (saving redeploys), check the site, then delete the old key in the Console.
- **Take the site down.** **Suspend** the service in Render's settings. The URL stops answering until you resume it.
- **Changing `render.yaml`.** Render applies changes from `main` to the service. It never asks again for a `sync: false` value: a new secret is added under **Environment** by hand.

## Never

- Put a key in `render.yaml`, `.env.example`, a Render log or anywhere in the repo. The gitleaks job is a backstop, not permission.
- Set `MODEL_FAKE` on Render. It replaces the real model with persona A's script.
- Run more than one instance while the rate limit lives in memory.
