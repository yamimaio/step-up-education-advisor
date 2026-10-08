# Step Up: rules for Claude Code

Step Up is an AI advisor that recommends a leader's best next educational step. Read these first, in this order:

- `docs/build-steps.md`: the approved build plan for steps 1 to 7 (files, versions, scripts, tests, "done when")
- `docs/implementation-plan.md`: the approved design. Decisions D1 to D15 stand, and its section 12 wins wherever it differs from the build plan
- `docs/build-plan.md`, `docs/day2-plan.md`, `docs/perplexity-program-prompts.md`, `docs/tools-and-models.md`: background

## Rules

1. **`core/` has no web or model code.** It never imports from `app/` or `server/`, nor from `next`, `react`, `@anthropic-ai/*` or Node built-ins. An ESLint rule enforces it; never disable it.
2. **Tests never call the real Claude API.** They use the fake model adapter (`server/model/fake.ts`).
3. **The API key lives only in `.env` as `MODEL_API_KEY`.** It is never committed, logged or sent to the browser. Only `server/model/anthropic.ts` reads it.
4. **The server never logs message content.** Logs hold counts, statuses and error kinds only.
5. **Nothing runs on the host except `git`, `gh` and `docker`.** Run every `npm`, `npx`, `node`, `tsx`, test, lint, build and dev server through `./run` (for example `./run npm test`). In `docs/build-steps.md`, `npm …` means `./run npm …`.
6. **One GitHub issue per step, one PR per issue.** Each PR body starts with `Closes #N`. Work outside a step gets its own issue. Step 4 is one PR per program, each closing its own sub-issue.
7. **The build runs on Sonnet 5.5.** Facts and numbers on cards come from program records and the engine, never from model text.
8. Don't reopen approved decisions. Where the docs are silent, pick a default, record it in `docs/decisions.md` and say so in the PR.

## Session workflow

1. A builder session builds one step on branch `step-N-<slug>` and opens the PR.
2. A different, fresh session reviews it with `/code-review --comment`. Step 3 and step 6 reviews use Opus 5.5; step 6 also gets `/security-review`. Step 4 data PRs skip the review.
3. The builder session fixes the High and Medium findings. Low findings are filed as issues (see Review policy).
4. After the merge, **start a new session for the next step.** This file and `docs/build-steps.md` carry the context; nothing may depend on chat history.

Commits end with the Co-Authored-By line given in the session; PR bodies end with the "Generated with Claude Code" line.

## Review policy

A review session follows this whatever the command arguments. The goal is a clear stop, not zero findings.

**Report only findings with a concrete failure scenario** (specific input or state, wrong result). No "could be hardened" without one. Start each finding's summary with its severity tag.

- `[HIGH]`: breaks a rule above in practice, leaks the API key or message content, or is a correctness bug on the main path. Blocks the merge.
- `[MEDIUM]`: a real bug or rule gap reachable with realistic inputs or setups. Blocks the merge.
- `[LOW]`: hardening, edge cases needing contrived inputs, style, nice-to-haves. Never blocks.

**Verdict.** End every review with one line: `APPROVED` (no High or Medium findings) or `CHANGES REQUESTED` (list the blockers). When the review posts with `--comment`, the verdict goes in the summary comment.

**Low findings** become one GitHub issue each, labelled `low-priority`, linked from the PR. They are not fixed in the PR.

**Round cap.** At most two review rounds per PR. In the second round, review only whether the previous High and Medium fixes work and whether they introduced new High or Medium problems. Anything else new and not High goes to a `low-priority` issue. Approve once none remain.
