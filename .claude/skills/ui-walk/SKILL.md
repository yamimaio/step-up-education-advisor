---
name: ui-walk
description: Walk Step Up's page in a real browser for a UI PR review. Builds the PR head (or a branch or commit) in its own detached worktree and compose project, serves it with MODEL_FAKE=1, walks persona A through both stages in Chromium at 1440 and 390 px, and prints one summary with numbers - axe-core WCAG A/AA, horizontal scroll, keyboard focus, progress line and panel states, forced states (held reply, failed request, long link) - plus screenshots. Use when reviewing or building a PR that changes the page (app/), or when asked to check the UI in a browser.
argument-hint: "[PR# | branch | commit]"
---

# /ui-walk

Every UI PR review runs this and pastes its summary. It measures; it doesn't judge look and feel.

Files in this skill:

- `ui-walk.sh`: the entry point. On the host it runs `git`, `gh` and `docker` only (CLAUDE.md rule 5); everything else runs in containers.
- `walk.mjs`: persona A through both stages at one viewport, in Playwright. Writes `result-<W>x<H>.json` and the screenshots.
- `summarize.mjs`: one markdown summary from the results.
- `publish-screenshots.sh`: puts screenshots on a never-merged branch and prints raw URLs for a PR body.

Pinned versions, all in `ui-walk.sh`: the image `mcr.microsoft.com/playwright:v1.55.0-noble`, `playwright@1.55.0`, `axe-core@4.10.2`. The npm packages live in a Docker volume named after both versions, never in the repo.

## Run it

1. Run, in the background (a first build takes 3 to 5 minutes), with the output folder in your scratchpad:

   ```sh
   .claude/skills/ui-walk/ui-walk.sh $ARGUMENTS --out <scratchpad>/ui-walk/<label>
   ```

   - `$ARGUMENTS` is a PR number, a branch or a commit. A PR or a branch on origin is walked at origin's tip; with no target, the current HEAD (commit first: it builds the commit, not the working tree).
   - Options: `--port 3100` (default; 3000 is often a builder's `web` container, so leave that alone), `--viewports 1440x900,390x844` (default; add `375x812` if asked), `--keep` to leave the server up for another walk of the same commit, then `--cleanup <target>`. A relative `--out` is made absolute. Only one walk per target at a time: if another session is walking the same target (or one was kept), the script stops and names the `--cleanup` command rather than removing it.

2. Read the summary it prints (also in `<out>/summary.md`). For any failure, open `<out>/result-<W>x<H>.json` for the numbers and the screenshots it names, and check the failure is real before reporting it.
3. Look at the screenshots yourself (`<out>/<W>x<H>-mid.png`, `-card`, `-sending`, `-verdict`, `-search`, `-programs`, `-full`, `-long-link`). Report what you see only as what it is: an observation, not a measured check.
4. Paste the summary into the review as is. In the review, grade each failing check under the review policy in CLAUDE.md like any other finding.

## What it does

`ui-walk.sh`:

1. Resolves the target to a commit and makes a detached worktree at `../step-up-ui-walk-<label>`, with its own compose project `ui-walk-<label>` and so its own `node_modules` and `.next` volumes. A builder's checkout and volumes are never touched. The worktree has no `.env`, so no API key reaches the build or the server.
2. `npm ci` and `npm run build` in that project's dev container (log in `<out>/build.log`), then serves `.next/standalone/server.js` with `MODEL_FAKE=1` on the host port.
3. Runs `walk.mjs` once per viewport in the Playwright container (`--add-host=host.docker.internal:host-gateway`), then `summarize.mjs`.
4. Removes the server, the compose project's volumes and image, and the worktree (unless `--keep`). It clears only the files it writes in `--out` (`result-*.json`, `<W>x<H>-*.png`, `summary.md`).

`walk.mjs`, per viewport, persona A (personas/A.md) with the fake's chip labels:

- **Stage 1:** the first message, the goal tap, the goal in words, a question typed during the needs chips, the three needs and "Send 3 of 3", every other tap, the card, "Change something" with a correction, the length asked again, the card again, "Looks right" held 2 s, the verdict.
- **Stage 2:** "Yes, show me programs." failing once (network error), Retry, the background in words, every stage 2 tap (two for the location, then Send), the search card, its "Looks right", the program cards.
- **A second page:** a long link with a 44-character unbroken run, typed as the answer to the first chips.

At every reply it records horizontal scroll (`scrollWidth - clientWidth`, with the widest elements when it scrolls), where focus landed (expected: the first chip, the card's heading, Retry, the input, or after the programs the "Programs that fit" heading or the input), whether the sticky progress line covers it, the progress line's states and the panel. At the mid-interview chips, the cards, the verdict, the search card and the program cards it runs axe-core (tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`). It Tabs through every control at the mid-interview chips, the stage 1 card and the program cards, and records each stop's outline, its contrast against what is behind it, and `:focus-visible`. It also measures horizontal scroll after opening "How each type compares" and the first card's "Sources".

## The checks

Each check is pass, **FAIL** or n/a, with its numbers.

| Check                          | Passes when                                                                                                                                                                                                                                                                                                     |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Walk                           | It reached the program cards. If not, the summary names the last step and the error.                                                                                                                                                                                                                            |
| axe-core                       | No violations on any screen. Details list each rule with its nodes and screens.                                                                                                                                                                                                                                 |
| Horizontal scroll              | 0 px at every step of the walk, and with the disclosures open.                                                                                                                                                                                                                                                  |
| Focus after each reply         | It lands on what comes next, as above. The detail says where it went after the programs.                                                                                                                                                                                                                        |
| Tab focus ring                 | Every Tab stop matches `:focus-visible` and shows a ring: the browser's own (`outline-style: auto`), an outline at 3:1 or more against what is behind it (WCAG 1.4.11; a transparent one fails), or a box-shadow that focus adds.                                                                               |
| Focus clear of the sticky line | No focused element (after a reply or on Tab) sits under the progress line. n/a without a sticky line.                                                                                                                                                                                                           |
| Progress line states           | At each step, `aria-current="step"` and "(done)" match persona A's expected states. n/a without a progress line.                                                                                                                                                                                                |
| Panel                          | "Not yet" only goes down before the card; at the card the panel shows the card's lines; after "Change something" the note quotes the correction; while "Looks right" sends and at the verdict it shows the card's lines; stage 2 doesn't change it. n/a without a panel, or where it is hidden (below 1024 px). |
| Question typed during chips    | A reply follows the question, and the same chips come back.                                                                                                                                                                                                                                                     |
| Change something               | The length is asked again, the card comes back, and the correction shows in the chat.                                                                                                                                                                                                                           |
| Held reply                     | While "Looks right" sends: "Step Up is thinking…", the input disabled, and the sticky line still at the top.                                                                                                                                                                                                    |
| Failed request                 | The notice shows, focus is on Retry, and after Retry the message shows once.                                                                                                                                                                                                                                    |
| Long link                      | No page scroll, and the text stays inside its bubble.                                                                                                                                                                                                                                                           |
| "You:" lines                   | Every typed answer shows in the chat.                                                                                                                                                                                                                                                                           |
| Program cards                  | At least one card. The detail counts ranked and "also worth a look" cards, and reports rank numbers and a summary row when the page has them (n/a when not).                                                                                                                                                    |
| Rate limit                     | No 429 replies.                                                                                                                                                                                                                                                                                                 |

## Notes

- **Rate limit.** `/api/chat` allows 20 requests a minute and 100 an hour per client, and a walk at one viewport sends about 31. The walk routes `/api/chat` through Playwright and gives each request its own `CF-Connecting-IP`, which `server/rateLimit.ts` uses as the client key when nothing sits in front of the server (local Docker). So no pauses or restarts are needed. If a change to the limiter's key makes this stop working, the rate-limit check fails and says so.
- **Page versions.** The walk detects the progress line (`ol[aria-label="Progress"]`) and the panel (`aside[aria-label="What Step Up has understood"]`; the privacy notice is the page's other `<aside>`), and reports checks that need them as n/a when they are missing or hidden. Chips are picked by their exact name.
- **When the page changes.** A new chip label, question or heading stops the walk at that step, and the summary names it. Update the constants at the top of `walk.mjs` (they mirror `server/model/personaA.ts`) or the selector in `pageHelpers`, and say so in the PR.
- **Overflow claims.** Chromium wraps URLs at slashes and hyphens, so a pasted URL often wraps without help. Trust the measured numbers over reasoning about CSS.
- **Screenshots in a PR body.** `gh` can't attach images. `publish-screenshots.sh <branch> <folder> [--push] <files>` commits them to a never-merged branch (like `ui-polish-screenshots` for #160) without touching the checkout, and prints raw.githubusercontent URLs pinned to the commit. Pushing is outward-facing: only with `--push`, and only when asked.
- **Not checked.** Look and feel (brand, spacing, the mark), a real screen-reader pass, and walks with the real model. Those stay with Yami or a Claude desktop session, once per UI PR. The summary says so.
