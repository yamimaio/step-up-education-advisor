# Step Up · Day 2 plan (Wed Oct 7): Build the core

Based on the approved build plan (`docs/build-plan.md`). Nothing here reopens its decisions.

## Goal for today

Organizers' checkpoint: **one working end-to-end AI result for a realistic input, rough UI is fine; save an example; note the biggest gap.**

Done means: on `localhost` in Docker, persona A (your own March decision) chats with the advisor from the first message to a verdict, the verdict and shortlists come from the real engine and real (verified) program records, the transcript is saved, and the biggest gap is written down.

## Step 0: your review, before anything else (about 30 to 45 minutes)

First thing today, before setup or any building, you review two documents:

1. This Day 2 plan.
2. The draft implementation plan (`docs/implementation-plan.md`), starting with its section 1, the design decisions. Mark each one OK or change it.

Anything you change gets folded into both documents before Part A starts.

## Part A: what only you can do (about 30 to 45 minutes, first thing)

These unblock everything else. Claude can't do them for you because they need your accounts.

1. **Create the GitHub repo.** Public, named `step-up` (or your pick), with a README and a `.gitignore` for Node. Add an MIT license if you want it open for the portfolio.
2. **Connect the repo to this project** in Project settings, so the build thread can clone it and push. If GitHub asks, install the Claude GitHub App on that repo.
3. **Create the Claude API key.** In the Anthropic Console: create the account (or sign in), add a payment method, and create a key named `step-up-local`.
   - Create a **workspace** named Step Up (Settings, then Workspaces) and create the key inside it, so all Step Up spending sits in one place.
   - Set a **monthly spend limit** right away: on the workspace's Limits tab, or for the whole account under Settings, then Limits. Suggested: **$20**. Today's expected spend is a few dollars (see Cost below). Menu names in the Console may differ slightly.
   - When the site goes live (Thursday), create a second key, `step-up-prod`, stored only on the host. Each key can then be revoked without breaking the other, and the Console shows local testing and public use separately.
   - Keep the key on your machine only. Don't paste it into any chat. It goes into `.env` as `MODEL_API_KEY` once the repo is cloned.
4. **Check Docker** runs on your machine (`docker run hello-world`).
5. **Tell the project "repo is ready"** in the project chat. That starts the build thread.

## Part A2: plan the build in Claude Code plan mode, then you approve (about 45 min, 15 to 30 of them yours)

Before any code, Claude Code plans the build in **plan mode**, where it can read and explore but can't change anything until you approve.

1. Open the cloned repo in Claude Code, switch the model to Opus 5.5 for this planning session if your plan allows it, and turn on plan mode. The build itself then runs on Sonnet 5.5 to save your Pro quota.
2. Give it the approved build plan (`docs/build-plan.md`) and this Day 2 plan. Also give it the draft implementation plan (`docs/implementation-plan.md`) as a starting point, not as decisions already made.
3. Ask it to plan the layout, data shapes, engine functions, AI tools, build order and tests. Where something is open, it picks a default and lists it as a design question instead of stopping.
4. **You review the plan:** answer the design questions and approve or change it. Claude Code builds only after you approve.

## Part B: what Claude builds (in order, one commit or PR per step)

Claude Code builds locally, in the same session on your machine that made the plan in Part A2. The code, Docker and the API key all stay on your machine, and it pushes to GitHub after each step. Unit tests use a fake AI, so building costs nothing; only real conversations spend credits. Keep the machine awake and stay close enough to answer its permission prompts.

The builder runs on Sonnet 5.5 to save your Pro quota. Before you review each PR, a fresh Claude Code session runs `/code-review` on it and posts findings as PR comments, which the builder fixes first; the engine and server PRs get that review on Opus 5.5 if quota allows, and the server PR also gets `/security-review` (implementation plan, D15). Every tool and model used is logged in `docs/tools-and-models.md`.

| # | Step | What it delivers | Your review |
| --- | --- | --- | --- |
| 1 | **Scaffold** | Next.js (App Router) + TypeScript + Tailwind; `/core` and `/app` folders with a lint rule that `/core` never imports `/app`; Vitest; zod; `Dockerfile` and `docker-compose.yml`; `.env.example` with `MODEL_API_KEY`; the approved plan copied to `docs/build-plan.md` | **Architecture check (10 min):** folder layout and the core/app boundary |
| 2 | **Dataset schema + 4 programs** | zod schema matching the plan's fields (incl. `credits`, `paymentOptions`, `residencyCount`, `longestStretchDays`, cohort fields; `verifiedOn` and `confidence` computed). You run Perplexity on 4 programs with the prompts in `docs/perplexity-program-prompts.md`: Deep Research for the facts (official pages only, a quote per fact), then a thinking model in a separate thread for the ratings; Claude Code turns the answers into draft records: **MIT Technology Leadership Program** (executive), **Wharton MBA for Executives** (EMBA), **Northwestern MEM** (specialized master's), **a Harvard Extension graduate certificate** (certificate). These are the plan's own examples and give persona A a real choice across four types | **Verify the 4 records (about 60 to 90 min, can run in parallel with steps 3 to 6):** open each source link, confirm or fix each field. Commit message names you as verifier |
| 3 | **Engine + tests** | Pure TS: `categoryFit`, the four adjustments, `noProgramRule`, `checkConstraints` (with 15% near miss), `scoreScenarios` (the real weights + 0.5 category bonus), `peerFit`, `confidence`, `travelEstimate`. Vitest reproduces the plan's worked example exactly (executive program 11, EMBA and full-time MBA ruled out on length, specialized master's 1) | **Skim the tests (15 min):** do they encode the rules as you meant them? |
| 4 | **Advisor rules + personas** | `core/advisor.md` v0 written as a valid SKILL.md: interview order (open questions first, constraints last), the 17-field checklist, the six contradiction checks, the no-program rule, the three magic-moment beats, scope refusals, tone. `core/personas.md`: the 6 test personas (A is you in March; B can't name a goal; one grows in the current role; plus three others) | **Read advisor.md (20 min):** does it sound like the advisor you'd want? |
| 5 | **Server endpoint** | `/api/chat` calling Claude Sonnet 5.5 through a small adapter (`core/model.ts`, swappable later). Tools: `propose_profile` (AI hands over the filled intake), `search_programs`, `check_constraints`, `score_scenarios`. Cost controls built in: prompt caching on the system prompt and tools, low effort for chat turns, a per-conversation message cap, no logging of message content | Optional |
| 6 | **Bare chat page** | One page: chat, quick-reply chips for numbers, the "Here's what I understood" confirm card, then plain result cards (verdict, runner-up, deciding needs, three shortlists, sources, confidence, data-limits footer). Step Up wordmark and the deep teal accent from the Day 1 cards so it doesn't look broken; full level 0 polish is Thursday. A **Download transcript** button saves the conversation and the engine result as a Markdown file, built in the browser so nothing is stored on the server | — |
| 7 | **Friendly failures (minimum)** | API down or key missing shows a plain message and the engine results still render with a fallback explanation (test 6). Empty input gives a friendly nudge | — |

## Part C: the end-to-end run (you and Claude, about 30 to 45 min)

1. Add the key to `.env`, run `docker compose up`, open `localhost:3000`.
2. **Run persona A yourself**, answering as you would have in March. Keep `personas/A.md` (written in build step 4) open while you chat. It holds persona A's fixed answers to all 17 intake questions, so you answer from it rather than from memory, and every later run of persona A gets the same answers.
3. **Save the example:** click **Download transcript** at the end of the run. It saves the whole conversation plus the verdict and shortlists as a Markdown file. Also take a screenshot of the verdict screen. Give both to Claude Code, which commits them as `examples/persona-a-day2.md` (plus the image) and copies them to `day2/` in the project files for the check-in.
4. **Score it** 1 to 5 on the plan's five questions: found the real need, raised the right tension, verdict right, every fact from the dataset, felt like a sharp human advisor.
5. **Name the biggest gap.** The lowest score, or whatever felt most wrong. That becomes Thursday's first fix.

If time remains: run persona B ("not yet") once. Not required today.

## Suggested day shape (your time)

| Block | You | Claude |
| --- | --- | --- |
| First (30 to 45 min) | Step 0: review this plan and the implementation plan | Fold in your changes |
| Start (45 min) | Part A setup | Waiting on the repo |
| Plan (15 to 30 min) | Review and approve the plan-mode plan | Plans in plan mode (Part A2) |
| Middle (2 to 3 h) | Review checkpoints for steps 1, 3, 4; verify the 4 records | Steps 1 to 7 |
| End (45 min to 1 h) | Run persona A, score it, name the gap | Save the example, draft the check-in |

That comes to about 5 to 6 hours, the top of your range. If the day runs short, verification of records 3 and 4 can finish tomorrow morning; the run still works with 2 verified records plus 2 marked "draft, unverified" in the UI.

## Cost

Claude Sonnet 5.5 costs $2 per million input tokens and $10 per million output tokens; cached input reads cost $0.20 per million. One persona run (about 10 to 15 turns, with the system prompt and tools cached) should land around **$0.10 to $0.30**. Today should cost **under $5** even with a dozen trial runs. Claude will report each day's spend from the Console for the worksheet. The one-time Opus 5.5 comparison run from the plan waits until all six personas exist (Thursday).

## Cut lines if the day runs behind (in this order)

1. Chips become plain buttons with no styling.
2. Result cards show text only, no layout.
3. Only the "best for network" shortlist renders; the other two follow Thursday.
4. Two verified programs instead of four.

Never cut: the real engine deciding the verdict, sources and confidence on the cards, and the saved example.

## Day 2 check-in (draft shape, at most 500 characters)

A short list, filled in tonight from what actually happened:

- Engine + tests: category fit, constraints, 3 scenarios
- Advisor conversation on Claude, calling the engine as tools
- 4 programs verified from official pages
- Persona A ran end to end: verdict "…"
- Biggest gap: "…"

Claude will count the characters before you paste it.
