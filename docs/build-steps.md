# Step Up · Day 2 build plan for this repo (steps 1 to 7)

## Context

The repo has only `docs/` right now. The approved implementation plan (`docs/implementation-plan.md`, D1 to D15 plus section 12) sets the design. This file turns its build sequence (section 7) into concrete work for this repo: the files, pinned versions, scripts, CI, tests and a "how to check it's done" for each step, so the build (on Sonnet 5.5) can run one issue and one PR per step without making design calls along the way. It doesn't reopen any decision. Where the docs say nothing, it picks a default and lists it under Design questions.

**Precedence I applied:** implementation plan section 12 > the rest of the implementation plan > `docs/day2-plan.md` > `docs/build-plan.md`. So step numbering, file paths (`core/advisor/advisor.md`, `personas/A.md`, model code in `server/`) and settings (one fixed effort `medium`, D4) follow the implementation plan wherever the Day 2 plan says something else.

**Checked against the real registry today (Oct 7, 2026):** Node 23.7.0 locally, Docker 29.8, gh 2.102, repo `yamimaio/step-up-education-advisor` (public, no open issues). Two of the newest versions don't work together, so I pinned below them (see Risks R1 and R2).

### Pinned packages (exact versions, `save-exact`)

| Package | Version | Note |
| --- | --- | --- |
| next, eslint-config-next | 16.4.0 | App Router, `output: "standalone"` |
| react, react-dom, @types/react, @types/react-dom | 19.3.0 | |
| typescript | **6.0.3** | not 7.0.2: typescript-eslint 8.71 supports TS below 6.1 only |
| eslint | **9.39.5** | not 10.x: eslint-plugin-import, react and jsx-a11y (used by eslint-config-next) stop at ESLint 9 |
| typescript-eslint | 8.71.1 | |
| tailwindcss, @tailwindcss/postcss | 4.3.3 | |
| vitest, @vitest/coverage-v8 | 5.0.3 | needs Node 22.12+, 24 or 26+, **not 23** |
| zod | 4.6.5 | `z.toJSONSchema` for tool schemas (step 6) |
| tsx | 4.23.15 | runs `scripts/*.ts` |
| json5 | 2.2.3 | step 2: reads Perplexity JSON with comments or trailing commas |
| @types/node | 26.6.4 | ok for Node 24 |
| prettier | 3.9.9 | |
| server-only | latest 0.0.x | step 6: stops server modules from being bundled for the browser |
| @anthropic-ai/sdk | 0.132.0 | step 6 only |
| @testing-library/react, @testing-library/user-event, jsdom | 16.3.3, latest 14.x, 30.1.2 | step 7 only |

Runtime: **Node 24 LTS**, inside Docker only (`node:24-alpine`). `.nvmrc` = `24` and `"engines": {"node": ">=24 <25"}` pin it for CI (`actions/setup-node` reads `.nvmrc`) and for the container.

### Working agreement (Yami, Oct 7)

- **Nothing runs on the host except `git`, `gh` and `docker`.** Every `npm`, `npx`, `node`, `tsx`, test, lint, build and dev server runs in a container. The repo gets a `./run` wrapper (`docker compose run --rm dev "$@"`), so `./run npm test` runs the tests. Even step 1's `npm install` that creates `package-lock.json` runs in the container. Host Node 23 doesn't matter.
- **Before any code, as the first commits of the step 1 PR:**
  - this approved plan, saved as `docs/build-steps.md`
  - a `CLAUDE.md` with the rules: the core boundary; tests only use the fake model; the key lives only in `.env` as `MODEL_API_KEY` and is never committed, logged or sent to the browser; the server never logs message content; one issue per step and `Closes #N` at the top of each PR body, other work in its own issue; Sonnet 5.5 for the build; Docker-only execution; the session workflow below; and pointers to `docs/build-steps.md` and `docs/implementation-plan.md`
- **Session workflow:**
  1. One builder session per step builds it and opens the PR.
  2. A different, fresh session reviews the PR (`/code-review --comment`; plus `/security-review` on step 6).
  3. The builder session fixes the findings.
  4. Once the fixes are in and the PR is merged, **a new session starts the next step.** `CLAUDE.md` and `docs/build-steps.md` carry the context between sessions, so nothing depends on this conversation.
- **Step 4 is one PR per program**, each verified by Yami and merged as soon as it's ready, so the records land as the research comes in.
- Order after approval: you run `/model claude-sonnet-5-5` → I create branch `step-1-scaffold` and commit `docs/build-steps.md` + `CLAUDE.md` → open the 7 issues (they'll be #3 to #9, since #1 and #2 are taken) → build step 1. I also save the working agreement to my memory, so later sessions in this repo follow it.

---

## 1. Step-by-step plan

Each step follows the same routine:

1. A new builder session reads `CLAUDE.md`, `docs/build-steps.md` and its issue.
2. It branches `step-N-<slug>` off `main`, builds the step (every command through `./run`) and opens a PR whose body starts with `Closes #N`.
3. CI goes green.
4. A different session runs `/code-review --comment`: Opus for steps 3 and 6, and `/security-review` on step 6 too (D15).
5. The builder session fixes the findings.
6. Yami reviews and merges, and the next step starts in a new session.

Commits end with the Co-Authored-By line. Anything found that's outside the step gets its own issue.

### Step 1: Scaffold

**Files**
- First commits, before any code: `docs/build-steps.md` (this plan as approved) and `CLAUDE.md` (the rules in the working agreement)
- `Dockerfile.dev` (`node:24-alpine`, workdir `/repo`) and a `dev` service in `docker-compose.yml`:
  - the repo bind-mounted at `/repo`
  - **a named volume for `/repo/node_modules`**, so Linux binaries (Next SWC, Tailwind's lightningcss) never mix with macOS
  - port 3000, default command `npm run dev -- --hostname 0.0.0.0`
  - `env_file` `.env` with `required: false`
- `run`: an executable wrapper, `docker compose run --rm --service-ports dev "$@"` (`--service-ports` only for `npm run dev`, through a flag)
- `package.json`, `package-lock.json` (generated in the container), `.nvmrc`, `.npmrc` (`save-exact=true`, `engine-strict=true`)
- `tsconfig.json`: strict, `noUncheckedIndexedAccess`, `resolveJsonModule`, path aliases `@core/*`, `@server/*`, `@app/*`
- `next.config.ts`: `output: "standalone"`, `poweredByHeader: false`
- `postcss.config.mjs`, `app/globals.css` (Tailwind 4 `@import "tailwindcss"`, theme tokens for deep teal, warm paper and one font)
- `app/layout.tsx`, `app/page.tsx`: a placeholder page with the Step Up wordmark and "Coming soon"
- `eslint.config.mjs` (flat config): eslint-config-next + typescript-eslint, plus these **boundary rules**:
  - `core/**`: `no-restricted-imports` blocks `@app/*`, `@server/*`, `**/app/**`, `**/server/**`, `next`, `next/*`, `react`, `react-dom`, `@anthropic-ai/*`, `node:*`, `fs`, `path`. That keeps core free of web and model code and safe to run in the browser (the build plan's client-side re-ranking).
  - `server/**`: blocks `@app/*` and `**/app/**`.
  - `app/components/**`: blocks `@server/*` and `**/server/**`. Only `app/api/**` may import server code.
  - `no-console: error` everywhere except `server/log.ts` (step 6) and `scripts/**`.
- `vitest.config.ts`: node environment by default, aliases matching tsconfig, includes `**/*.test.ts(x)`
- `tests/boundary.test.ts`: lints probe code through ESLint's Node API (`lintText` with `filePath: "core/__probe__.ts"`) and expects an error for `import x from "../server/x"`, `"@app/page"` and `"@anthropic-ai/sdk"`. A probe with a clean import must produce no error. This proves the rule bites and keeps biting.
- `core/index.ts` (empty public API with a comment), `server/.gitkeep`, `personas/.gitkeep`, `examples/.gitkeep`, `docs/research/.gitkeep`
- `Dockerfile`: multi-stage on `node:24-alpine` (deps → `npm ci`; build → `next build`; runner → standalone output as user `node`, `EXPOSE 3000`, `CMD ["node","server.js"]`). No key in any layer.
- `.dockerignore`: `.env*` (keeps `.env.example`), `node_modules`, `.next`, `.git`, `research`
- `docker-compose.yml`: service `web` (the production image: `build: .`, `ports: ["3000:3000"]`, `env_file: [{ path: .env, required: false }]` so the placeholder works before the key exists) plus the `dev` service above. `web` and `dev` both use port 3000, so run one at a time.
- `.env.example`: `MODEL_API_KEY=` with a one-line comment saying it's server-only and never committed
- `.gitignore`: Node defaults plus `.env`, `.env.*`, `!.env.example`, `.next`, `coverage`
- `.prettierrc.json`, `.prettierignore` (ignores `docs/`, which includes `docs/research/`)
- `.github/workflows/ci.yml` (below)
- `docs/decisions.md`: a log of the Design-question answers from this plan, one line each
- `README.md`: a short what-it-is and how to run it (dev, Docker, tests). It grows on Saturday.

`docs/` is already in the repo, so the "`docs/` copies" item in the plan is done. Step 1 only adds `docs/decisions.md`.

**npm scripts** (stable from step 1; later steps add only the ones marked)
```
dev            next dev
build          next build
start          node .next/standalone/server.js
lint           eslint . --max-warnings 0
typecheck      tsc --noEmit
test           vitest run
test:watch     vitest
format         prettier --write .
format:check   prettier --check .
validate-data  tsx scripts/validate-data.ts          (step 2)
draft-records  tsx scripts/draft-records.ts          (step 2)
check-bundle   tsx scripts/check-bundle.ts           (step 6)
ci             npm run lint && npm run typecheck && npm run format:check && npm test && npm run validate-data --if-present
```

**CI (`.github/workflows/ci.yml`)** runs on `pull_request` and on `push` to `main`, with `permissions: contents: read` and concurrency that cancels superseded runs.
- Job `check` (ubuntu-latest): checkout → setup-node from `.nvmrc` with the npm cache → `npm ci` → `lint` → `typecheck` → `format:check` → `test` → `validate-data` (from step 2) → `build` with `MODEL_API_KEY=ci-canary-not-a-key` → `check-bundle` (from step 6).
- Job `docker`: `docker build .`, so the Dockerfile can't quietly break. No push.
- No secrets in CI. Tests use the fake model, so CI never needs a real key.

**Tests:** `tests/boundary.test.ts`, plus a smoke test that `app/page.tsx` renders the wordmark (a server component render with `react-dom/server`, so no jsdom yet).

**How you check it's done**
1. `./run npm ci && ./run npm run ci` passes, with nothing installed on the host.
2. `docker compose up --build web`, then open `http://localhost:3000` and see the placeholder.
3. The PR shows both CI jobs green.
4. Architecture check: add `import "../server/x"` to a file in `core/`, run `./run npm run lint`, and it fails.
5. `CLAUDE.md` and `docs/build-steps.md` are the first commits in the PR.

From here on, every command in this plan written as `npm …` means `./run npm …`.

### Step 2: Schemas (and the research-to-record converter)

**Files**
- `core/schema/enums.ts`: `Category`, `Format`, `LocationValue` (the seven values), `PaymentOption` (5 values), `Need` (5), `RatingKey`
- `core/schema/program.ts`: `ProgramSchema` + `type Program`. Fields follow the plan's schema table, plus D7 `verification`, D8 `lodgingPerNightUsd`, `ratingNotes` keyed by rating, `paymentOptions: PaymentOption[] | null`, and `hoursPerWeek: { min, max } | null` (section 12). `sources: { field, url, quote, checkedOn }[]`. The research prompt returns a quote for every fact, so the quote is kept for the verifier. Rules checked with `superRefine`:
  - fact-group coverage: tuition group (`tuitionUsd`, `tuitionIncludes`, `paymentOptions`) has at least one source unless tuition is null; the schedule group (`durationMonths`, `onsiteDaysPerYear`, `residencyCount`, `longestStretchDays`, `hoursPerWeek`, `format`) has at least one; the class-profile group (`cohortMedianExperienceYears`, `cohortSeniority`) has at least one
  - a non-null `lodgingPerNightUsd` needs a source on `gsa.gov` (D8)
  - each `source.field` is a real Program key; each `checkedOn` is a valid ISO date
  - ratings are integers from 1 to 5
  - an `online` program has `onsiteDaysPerYear`, `residencyCount` and `longestStretchDays` = 0
  - `hoursPerWeek.min ≤ max`
  - `verification.status === "verified"` requires a non-null `verifiedBy`
- `core/schema/dataset.ts`: `DatasetSchema` = array of programs with unique ids, and no `fake-` ids (those belong to fixtures)
- `core/schema/profile.ts`: `ProfileSchema` exactly as in implementation plan section 3 (`needs` = exactly 3 unique; `locationValues` at most 2; `hoursPerWeek` a range), plus `PartialProfileSchema`
- `core/schema/derived.ts`: `verifiedOn(program)` = the oldest `checkedOn`. Pure, used by the engine and the cards.
- `core/data/programs.json`: `[]` (real records land in step 4)
- `core/data/load.ts`: `loadPrograms()` imports the JSON and parses it with `DatasetSchema`, then is exported from `core/index.ts`
- `scripts/validate-data.ts`: parses `core/data/programs.json`, prints every problem as `id › field: message`, exits 1 on any problem, and also fails on a `checkedOn` later than today
- `tests/fixtures/programs.ts`: six realistic but clearly fake records, one per type (`fake-executive`, `fake-emba`, …). They're shaped so the worked example works out: the executive program is 8 months, both MBAs are 24 months, and the specialized master's, certificate and short course fit inside 12 months.
- `tests/fixtures/profiles.ts`: persona-A-like profile for the worked example
- **Converter, built now and run in step 4** (rule 6): `scripts/draft-records.ts` + `scripts/lib/research.ts`
  - Input: `docs/research/<id>.md` (Perplexity Prompt 1 answer), `docs/research/<id>-rating.md` (Prompt 2 answer), and `docs/research/<id>-overrides.json` for the facts the research doesn't produce: `locationOffers` (see DQ6) and the campus location (`campusAddress`, `campusLat`, `campusLon`, the `campusAddress` source and the two `figureNotes`; see DQ6).
  - Parse PART 1: take the first fenced code block that parses as an object (otherwise the first balanced `{…}` after "PART 1"), read with `json5` (allows `//` comments and trailing commas).
  - Map to a Program:
    - the file name becomes `id`
    - `hoursPerWeekMin/Max` become `hoursPerWeek {min,max}`, or null when both are null
    - free-text `paymentOptions` become the fixed enum through a lowercase lookup table ("employer sponsorship" → `employer_sponsorship`, …). An unknown string is a hard error that names the string. An empty list becomes `null`.
    - source `field` names are normalized (`hoursPerWeekMin` → `hoursPerWeek`)
    - extra fields are kept or dropped as DQ7 says
    - `verification = { status: "draft", verifiedBy: null }`
  - Parse ratings: wrap the answer's `"ratings": …, "ratingNotes": …, "lowEvidence": …` text in `{}` and read it with json5. This sets `ratings`, `ratingNotes`, `ratingLowEvidence`.
  - Validate with `ProgramSchema` and print the errors per field. Write the record into `programs.json`, sorted by id, 2-space JSON. It **refuses to overwrite a `verified` record** without `--force`. `--dry-run` prints the record without writing it.
  - It also prints the research file's "uncertain or conflicting" list, which goes straight into the step-4 PR body for Yami.
- `tests/fixtures/research/fake-sample.md`, `fake-sample-rating.md`: a realistic Perplexity-style answer, with comments, a trailing comma, prose around the JSON and one null field

**npm scripts:** `validate-data` and `draft-records` go live. CI's `validate-data` step starts doing real work.

**Tests**
- `core/schema/program.test.ts`: the fixture dataset passes. **A record with the schedule source removed is rejected** with a message that names the group (the Done-when). Also rejected: a rating of 6, an online program with on-site days, `verified` without `verifiedBy`, lodging without a gsa.gov source, a duplicate id.
- `core/schema/profile.test.ts`: needs of length 2 or 4 is rejected; duplicate needs are rejected; three location values are rejected.
- `scripts/lib/research.test.ts`: the fake sample converts to a valid draft record; an unknown payment option fails with a clear message; ratings are parsed; a verified record isn't overwritten.

**How you check it's done:** `npm test` is green. `npm run validate-data` passes on `[]`. Delete the `schedule` source from the fixture in a scratch copy and run the validator on it to see it fail with the field named. `npm run draft-records -- --dry-run tests/fixtures/research/fake-sample` prints a draft record.

### Step 3: Engine

**Files (all pure, no I/O; `today` is passed in)**
- `core/engine/types.ts`: `Check`, `CheckId` (8: `tuition`, `travelBudget`, `onsiteDays`, `longestStretch`, `length`, `hours`, `workCompatible`, `location`), `ProgramEvaluation`, `DirectionResult`, `SearchResult`, `CategoryAccess`, `EngineResult` (implementation plan section 4 shape)
- `core/engine/constants.ts`: the type ratings matrix, need weights 3/2/1, degree adjustments (−3/−2/−1), the `required` rule-outs, the `grow_in_role` +2, the no-program threshold 4, near miss 0.15, hours +25% pass and +50% near miss, the scenario weight rows, the category bonus 0.5, peer fit (−1 / +0.5 / −1 when the gap is over 5 years), location fit (D9), the D8 airfare midpoints, and the confidence window of 60 days
- `categoryFit.ts`, `constraints.ts`, `noProgram.ts`, `scenarios.ts`, `peerFit.ts`, `locationFit.ts`, `travel.ts`, `confidence.ts`, `contradictions.ts`, `distance.ts`, `normalize.ts`, `direction.ts` (stage 1: `recommendCategory`), `search.ts` (stage 2: `evaluatePrograms`), `evaluate.ts` (both in order), each as in implementation plan section 4
- `core/index.ts` exports `recommendCategory`, `evaluatePrograms`, `evaluate`, `checkContradictions`, schemas (including `DirectionProfileSchema`), types, `loadPrograms`

**Two stages (implementation plan section 4).** `recommendCategory` (stage 1): declined-field defaults for the stage-1 answers → the stage-1 checks for every program (length, hours, work-compatible) → category fit (whose "type with records but none passing or near-missing → out" rule uses only those checks) → the stage-1 no-program rule (`goal_unclear`, `no_type_fits`). `evaluatePrograms` (stage 2, given the confirmed category): all declined-field defaults → travel and all eight checks → peer fit, location fit, confidence, scenarios with the bonus for the confirmed winner → shortlists → `nothing_passes` → `access` → profile gaps. `evaluate` runs both in order. Declined fields get neutral defaults: no limit, `doesnt_matter`, `fine`.

**Tests**
- `core/engine/*.test.ts`: the nine tests in implementation plan section 8, one `describe` each. Test 1 is the worked example, run on the fixtures: executive 11, EMBA and MBA out because of length, specialized master's 1, certificate 3, short course 3.
- Edge tests added here:
  - exactly 15% over is a near miss, 15.01% fails
  - a limit of 0 has no near miss (DQ10)
  - hours: an overlap passes; 12 hours against a 5 to 10 range passes with the note "about 2 hours a week more"; 15 against 10 is a near miss; 16 against 10 fails
  - location: an in-person, non-work-compatible program fails unless it's in the home city or the user would relocate
  - travel estimate for D8, plus airfare `unknown` → lodging only, with the flag set
  - location fit clamps at 1 and 5
  - confidence high, medium and low around the 60-day line
  - draft records cap confidence at low (D7)
  - scenarios: passing programs come first, near misses fill empty slots and are labelled
  - a tie returns `tie`
  - every weight row sums to 1
  - `evaluate` is deterministic (same input, deep-equal output)
  - stage 1 gives the same verdict whatever the budget, travel or location; stage 2 keeps the confirmed category and reports `access`
- Coverage: `vitest run --coverage` for `core/engine` reported in CI, but **no threshold gate** (DQ15).

**How you check it's done:** `npm test` passes and the worked-example test's name says "reproduces the plan's worked example". Your 15-minute skim: each `describe` has the plan's rule as its title, so you can read the test titles as a list of rules.

### Step 4: Data (4 draft records from your Perplexity files)

Can run in parallel with steps 5 and 6. It blocks only step 7's real run, and D7 means draft records still run.

**One PR per program, merged as each one is verified.** Step 4 has a parent issue (opened with the other six) and one sub-issue per program, opened when that program's research files land in `docs/research/`. Each program PR starts with `Closes #<sub-issue>`. The parent issue closes when the fourth sub-issue does (DQ12). Each program PR is its own short session: draft → you verify → merge.

**Programs and ids (the file names become the record ids):**

| Program | Research file | Rating file |
| --- | --- | --- |
| MIT TLP | `docs/research/mit-tlp.md` | `docs/research/mit-tlp-rating.md` |
| Wharton MBA for Executives, San Francisco | `docs/research/wharton-emba-sf.md` | `docs/research/wharton-emba-sf-rating.md` |
| Northwestern MEM, part-time | `docs/research/northwestern-mem-pt.md` | `docs/research/northwestern-mem-pt-rating.md` |
| Harvard Extension leadership certificate | `docs/research/harvard-ext-<cert-slug>.md` | `docs/research/harvard-ext-<cert-slug>-rating.md` |

**Work per program PR** (branch `step-4-<id>`)
1. Claude Code reads the pair with you, runs `npm run draft-records -- docs/research/<id>` and fixes only *parsing* problems. Any fact that doesn't fit the schema goes back to you; it isn't edited away.
2. It proposes `locationOffers` in `docs/research/<id>-overrides.json`, and for an in-person or hybrid program the campus location: `campusAddress` (the street address from the school's official page, with an `extraSources` entry of kind `official_page` whose quote contains it), `campusLat` and `campusLon` (approximate, derived from the address), and `figureNotes` for both saying "derived from campusAddress". An online program leaves all three null. That's one file per program, so parallel PRs never conflict on it.
3. It opens the PR with the one `draft` record. The body lists the file's "uncertain or conflicting" items and any rating marked `lowEvidence`.
4. You verify each fact against its quote and link, and flip it to `"status": "verified", "verifiedBy": "Yami Maio"` in **your own commit on that PR** (message: `Verify <id> (verified by Yami Maio)`). Then you merge.
5. If another program merged first, `programs.json` may conflict. The fix is to rebase and re-run `draft-records` for this id, since the records are sorted by id and the conflict is only where this one is inserted.
6. The first program PR adds a row to `docs/tools-and-models.md` naming the rating model you picked.

Program PRs are data plus your own verification, so they skip the fresh-session `/code-review` (DQ20). CI's `validate-data` is the automated check.

**Files per PR:** one record in `core/data/programs.json`, `docs/research/<id>.md`, `docs/research/<id>-rating.md` and `docs/research/<id>-overrides.json`, committed as provenance (DQ5).

**Tests:** CI's `validate-data` on the real file. The first program PR also adds `core/data/load.test.ts`:
- `loadPrograms()` returns records whose categories are all valid and whose ids are unique. It checks no fixed count, so it holds after each merge.
- a smoke test runs `evaluate(personaAProfile, loadPrograms(), today)` and checks only that it doesn't throw, because real numbers change as the data is verified.

**How you check each PR is done:** `npm run validate-data` prints `n records OK (n verified, 0 draft)`; the record says `verified` with your name; `git log` shows your verifying commit. The step is done after the fourth merge.

### Step 5: Advisor

**Files**
- `core/advisor/advisor.md`: SKILL.md frontmatter (`name: step-up-advisor`, `description`), then the sections from implementation plan section 5's outline. No dates, ids or anything that changes between runs (it's part of the cached prefix). It names every tool and when each one is required: `ask_choice` for every numeric or enum field, `check_contradictions` before each confirm pause (`propose_direction`, `propose_search`), and the verdict told only from the confirmed pause's tool result.
- `core/advisor/chips.ts`: the chip sets from section 3 as `Record<ChipField, { label, value }[]>`, with labels exactly as in the table
- `core/advisor/fields.ts`: the 17-field checklist as data (field, step, question intent, chip field or free text). `advisor.md` and the server's "set by chip" check both use it.
- `personas/A.md` … `F.md`: who they are, their true answers to all 17 fields (chip labels quoted exactly), the open-question answers in their voice, the expected verdict, and what a sharp advisor should notice (section 9)

**Tests**
- `core/advisor/advisor.test.ts`: the frontmatter parses, with `name` and `description` present; every tool name mentioned exists in the tool list (a constant shared with step 6); the file has no dates or ISO timestamps.
- `core/advisor/chips.test.ts`: every chip value passes the matching `ProfileSchema` field; every numeric profile field has a chip set; the labels are unique.
- `personas/personas.test.ts`: each persona file has the required headings and 17 answers, and each answer matches a chip label where the field uses chips.

**How you check it's done:** you've read `advisor.md` (the Done-when). The tests keep it in step with the chips and fields.

### Step 6: Server

Before writing code, the builder loads the `claude-api` skill so the details are current: Sonnet 5.5's adaptive thinking and effort parameters, `cache_control` placement, the subset of JSON Schema that strict tools allow, and the rules for replaying thinking blocks.

**Files**
- `server/model/adapter.ts`: the `ModelClient` interface (section 5). `ModelTurn` carries content blocks, `stop_reason` and usage numbers. `ModelError` has kinds `retryable | auth_or_credit | refusal | unknown`.
- `server/model/anthropic.ts`: the only file that reads `process.env.MODEL_API_KEY`, enforced by an ESLint `no-restricted-properties`/syntax rule everywhere else. It uses `claude-sonnet-5-5`, adaptive thinking, effort `medium`, `max_tokens` 16000, SDK `maxRetries: 2`, a cache breakpoint after the system prompt and automatic caching on messages. It maps SDK errors to `ModelError` and starts with `import "server-only"`.
- `server/model/fake.ts`: `FakeModelClient(script)` replays turns, either from an array or a function of the request. It records every request so tests can assert the system prompt, tools, cache markers and that history arrives unchanged.
- `server/tools.ts`: the 5 tool definitions (`ask_choice`, `check_contradictions`, `propose_direction`, `propose_search`, `search_programs`) with `strict: true`. Input schemas are generated from the zod schemas with `z.toJSONSchema` and then adjusted to the strict subset (DQ14). These are frozen constants.
- `server/prompt.ts`: reads `core/advisor/advisor.md` once (via `fs` at module load), strips the frontmatter and builds the frozen system blocks.
- `server/handlers.ts`: `check_contradictions` → `checkContradictions`; `search_programs` → filters over `loadPrograms()` and returns facts plus sources. For `propose_direction` the server validates with `DirectionProfileSchema`, and for `propose_search` with `ProfileSchema`. Either returns `is_error` with the problems so the model asks again when:
  - `check_contradictions` hasn't been called in the history
  - a chip field's value doesn't match a chip the user tapped (risk table, section 10)
- `server/chatLoop.ts`: one request, as in implementation plan section 5. Up to 5 server-tool rounds. It stops at `end_turn` or a pausing tool and returns `{ messages: newMessages, ui, counter? }`, where `ui` is one of:
  - `{kind:"chips", field, question, options}`
  - `{kind:"confirm_direction", profile}` (stage 1's answers)
  - `{kind:"direction", result, explanation?}` (`DirectionResult`: the verdict, or "not yet")
  - `{kind:"confirm_search", profile}` (the full profile, after the user opts in)
  - `{kind:"results", result, explanation?}` (`SearchResult`: the shortlists and `access`)
  - `{kind:"none"}`

  **On confirm**, the browser sends `tool_result {confirmed:true}`. The server rewrites it to `{confirmed:true, result}` by running the stage's engine function on that pause's input from the history (never a profile the client sends): `recommendCategory` for `propose_direction`, and for `propose_search`, `evaluatePrograms` with the `category` from the last confirmed `propose_direction` result in the history. If the stage-1 answers changed since then, the server asks for `propose_direction` again before running stage 2. and returns that rewritten user message, so the browser stores the same bytes and the cache stays warm. It also handles the message counter at 30, the wrap-up system note at 35, and a polite refusal at 41 that still allows results and transcript.
- `server/fallback.ts`: a template explanation built only from the `DirectionResult` or `SearchResult` for when the model fails after a confirmed pause, plus plain messages for the three error kinds
- `server/log.ts`: the only logger. `logRequest({ status, rounds, inputTokens, cacheReadTokens, outputTokens, errorKind? })` takes a typed object of numbers and enums only, so message content can't be logged by type. `no-console` is allowed only in this file.
- `server/requestSchema.ts`: zod for the request body. `messages` holds the SDK's block types, at most 120 messages, at most 4,000 characters per user text block, and the body at most 1 MB. Empty or whitespace-only user text becomes a friendly nudge without calling the model (plan test 4).
- `app/api/chat/route.ts`: `POST` only, `runtime = "nodejs"`, `dynamic = "force-dynamic"`. It parses the body → `chatLoop` → JSON. The model client is chosen by a factory: `MODEL_FAKE=1` gives the fake (for local UI work without spend), otherwise Anthropic. A missing key gives an `auth_or_credit` UI message, not a crash.
- `scripts/check-bundle.ts`: after `next build` with the canary key, it scans `.next/static/**` and fails if `ci-canary-not-a-key` or `MODEL_API_KEY` appears. It also fails if `@anthropic-ai/sdk` shows up in client chunks.
- `next.config.ts`: `outputFileTracingIncludes: { "/api/chat": ["./core/advisor/advisor.md"] }` so Docker's standalone output includes the prompt

**npm scripts:** `check-bundle` goes live in CI.

**Tests (fake model only, `server/**/*.test.ts`)**
- `chatLoop.personaA.test.ts`: **the Done-when.** A scripted walk of persona A, with answers from `personas/A.md` and fixture programs, from the first message through `ask_choice` taps, `check_contradictions`, `propose_direction`, confirm, `ui.kind === "direction"` with the verdict equal to `recommendCategory(...)` called directly, then the opt-in, `propose_search`, confirm, and `ui.kind === "results"` equal to `evaluatePrograms(...)` with that category.
- In the same suite: the history is sent to the model byte-for-byte as received; the system prompt and tools are identical across requests and carry the cache marker; the 5-round limit; a confirm pause before `check_contradictions` comes back as `is_error`; a chip-field mismatch comes back as `is_error`.
- `fallback.test.ts`: the fake throws `auth_or_credit` on the turn after confirm, yet the results still render with the template explanation (plan test 6). A missing key on the first message gives the friendly message.
- `limits.test.ts`: empty input gives the nudge with no model call; the counter appears at message 30; the wrap-up note goes in at 35 when there's no confirmed profile; message 41 gets a polite refusal while results still come back.
- `privacy.test.ts`: a spy on `server/log.ts` and `console.*` during the persona A run. No persona text, profile value or tool input appears in any log line.
- `route.test.ts`: a bad body gives 400 with a generic message (no echo of the input); `GET` gives 405.

**How you check it's done:** `npm test` passes, including persona A on the fake. CI's `check-bundle` is green. The `/security-review` findings are fixed. Optionally, as a manual check that costs a few cents: `MODEL_API_KEY=… npm run dev`, then `curl -X POST localhost:3000/api/chat -d '{"messages":[{"role":"user","content":"hi"}]}'` returns an assistant turn, and the server logs show only numbers.

### Step 7: Page

**Files**
- `app/page.tsx`: holds the chat state (`useReducer`, kept in memory only, D3)
- `app/lib/chatClient.ts`: posts the full history and appends `messages` from the response unchanged
- `app/lib/transcript.ts`: a pure function `buildTranscript(history, chipsTapped, profile, result)` that returns Markdown
- `app/components/`: `PrivacyNotice`, `Chat`, `Message`, `ChipRow` (real `<button>`s with text labels in a `role="group"` labelled by the question), `ProfileCard` ("Looks right" / "Change something"), `VerdictBlock` (category, runner-up, deciding needs, resolved tensions or the "not yet" trigger), `ProgramCard` (the fields from section 6, "Draft, not yet verified" for drafts, "not published" for nulls), `DataLimitsFooter`, `MessageCounter`, `DownloadTranscript` (a `Blob` and object URL, nothing sent to the server)
- Cards take program facts from `loadPrograms()`, imported on the client because core is browser-safe (DQ13), and the checks and scores from `EngineResult`. Nothing on a card comes from model text.

**Tests (jsdom via `// @vitest-environment jsdom`)**
- `ChipRow.test.tsx`: chips can be reached with Tab, Enter on one sends its value, and the labels are visible text.
- `ProfileCard.test.tsx`: "Looks right" sends confirm; "Change something" opens corrections.
- `ProgramCard.test.tsx`: a null tuition shows "not published"; a draft record shows the draft label; sources and the verified-on date render.
- `transcript.test.ts`: the Markdown holds every message, the chips tapped, the profile and the result.
- `page.fake.test.tsx`: the whole page with a mocked `fetch` replaying the step-6 persona A responses ends on the results view.

**How you check it's done (the Done-when):** put the key in `.env`, run `docker compose up --build`, open `localhost:3000` and run persona A with the real model using `personas/A.md`. It reaches the verdict and the shortlists, and Download transcript saves a `.md`. Then Part C of the Day 2 plan follows: `examples/persona-a-day2.md` plus the screenshot, scored, with the biggest gap named. That's tracked in its own issue (see below).

---

## 2. Issues to open after you approve

Each issue's body has the goal and the acceptance checklist. Each PR body starts with `Closes #N`. Every issue also gets the standing criteria "CI green" and "`/code-review` findings fixed before Yami's review" (D14, D15).

1. **Step 1: Scaffold the app, the core/app boundary, Docker and CI**
   Goal: a runnable Next.js + TS + Tailwind skeleton with the folder layout, an ESLint rule that keeps `core/` free of `app/`, `server/`, web and model imports, Vitest, Docker, `.env.example` and CI.
   - [ ] `docker compose up` serves a placeholder page
   - [ ] CI green
   - [ ] the boundary test proves `core/` can't import from `app/` or `server/`

2. **Step 2: Program and profile schemas, validator, fixtures and the research converter**
   Goal: zod schemas for Program and Profile, `validate-data` in CI, a fake fixture program per type, and the converter that turns Perplexity research and rating files into draft records.
   - [ ] the validator rejects a record missing a source
   - [ ] the fixture dataset (clearly fake ids) validates
   - [ ] `draft-records` converts the sample research files into a valid draft record

3. **Step 3: Scoring engine with tests**
   Goal: the pure TS engine from implementation plan section 4 (category fit, constraints, no-program rule, scenarios, peer fit, location fit, travel, confidence, contradictions, `evaluate`).
   - [ ] the plan's worked example reproduces exactly (executive 11, EMBA and full-time MBA out on length, specialized master's 1, certificate 3, short course 3)
   - [ ] all nine engine tests from implementation plan section 8 pass

4. **Step 4: First 4 program records from the Perplexity research** (parent issue)
   Goal: verified records for MIT TLP, Wharton MBA for Executives (SF), Northwestern MEM (part-time) and a Harvard Extension leadership certificate, built from `docs/research/` and checked by the schema. Each program is its own sub-issue and its own PR, merged as you verify it.
   - [ ] the records validate
   - [ ] Yami verifies each record and flips it to `verified` (the commit names the verifier)
   - [ ] four sub-issues closed, one per program

   **Sub-issue template**, opened when that program's research files land: **"Step 4: Record for `<id>`"**. Acceptance: the record validates; Yami has verified every fact against its quote and link; the verifying commit names Yami. I link it to the parent with `gh api` (the GitHub sub-issues endpoint).

5. **Step 5: Advisor rules, chip sets and test personas**
   Goal: `core/advisor/advisor.md` v0 as a valid SKILL.md, `chips.ts`, the field checklist, and `personas/A.md` to `F.md`.
   - [ ] Yami has read `advisor.md`
   - [ ] chip and persona consistency tests pass

6. **Step 6: Chat server: model adapter, fake, tools, chat loop, route and fallback**
   Goal: `/api/chat` running the advisor loop from implementation plan section 5 with cost controls, privacy-safe logging and friendly failures.
   - [ ] a fake-model test walks persona A from the first message to `results`
   - [ ] the server tests from implementation plan section 8 pass (missing key, empty input, counter at 30, wrap-up at 35, refusal at 41)
   - [ ] the key never reaches the client bundle (`check-bundle`), and `/security-review` findings are fixed

7. **Step 7: Chat page with chips, confirm card, results and transcript download**
   Goal: the Day 2 page from implementation plan section 6.
   - [ ] persona A runs on localhost with the real model

Work outside the steps gets its own issue, opened when it's needed. One I already expect: **"Day 2 end-to-end run: save persona A's example and name the biggest gap"**, after step 7.

---

## 3. Design questions (each with the default I'll build unless you change it)

| # | Question | Recommended default |
| --- | --- | --- |
| DQ1 | Your rule 6 says "step 2's program records", but implementation plan section 7 puts records in step 4 and schemas in step 2 | Follow section 7. **Step 2 builds and tests the converter on a fake sample; step 4 runs it on your files.** The converter is ready the moment your files land, and no step waits on research |
| DQ2 | The Day 2 plan's step 7 is "Friendly failures"; the implementation plan's step 7 is "Page" | Follow the implementation plan. Failures land in step 6 (`fallback.ts`, the error kinds, the nudge) and show on the page in step 7 |
| DQ3 | Plan test 6 says results render with the API down, but results need a confirmed profile, which needs the model | The fallback covers failure **after** confirm (the server already has the profile and runs the engine). Failure before confirm shows the friendly message only. I'll note this in `docs/decisions.md` |
| DQ4 | What counts toward the 40-message cap | **Every user turn, chip taps and confirms included**, because each one costs a model call. If persona A runs past about 30, I'll open an issue to retune it |
| DQ5 | Commit `docs/research/*.md`? | **Yes**, as provenance. The quotes are what you verify against, and they're small. Kept out of the Docker image |
| DQ6 | `locationOffers` isn't in the Perplexity output | `docs/research/<id>-overrides.json`, one file per program so parallel PRs don't conflict. Claude Code proposes values in that program's PR and you confirm. The campus address, its official-page quote and the derived coordinates go in the same file (schema rules in `docs/decisions.md`). The converter fails if it's missing, so it's never left empty by accident |
| DQ7 | Perplexity fields that aren't in the schema: `tuitionIncludes`, `nextStartDate`, `country`, the median vs average basis, `lowEvidence` | Keep `tuitionIncludes` (the card needs it), `cohortExperienceBasis: "median" \| "average"`, `ratingLowEvidence: RatingKey[]` (shown on the card), and `country: "US"`. Drop `nextStartDate` for now (it goes stale fastest) |
| DQ8 | Which numeric fields can be null | Nullable: `tuitionUsd`, `paymentOptions`, `hoursPerWeek`, `onsiteDaysPerYear`, `residencyCount`, `longestStretchDays`, `minExperienceYears`, the cohort fields and `lodgingPerNightUsd`, all handled by the engine's unknown-value rule. Required: `id`, `name`, `institution`, `category`, `credential`, `format`, `durationMonths`, `workCompatible`, `city`, ratings and sources |
| DQ9 | Where `source.field` points | Record field names, one source per fact, as Perplexity returns them. The validator enforces the plan's three fact groups on top. It doesn't require a source for every field |
| DQ10 | Near miss when the user's limit is 0 (for example 0 on-site days) | No near miss: any value above 0 fails. Boolean checks (work-compatible, location) never near-miss |
| DQ11 | Exact predicates for the six contradiction rules | R1: `needs[0]=senior_network` and `maxOnsiteDays<10`. R2: degree `required` and no non-certificate program in the dataset at or under the budget (so `checkContradictions(partial, programs)` also takes the programs). R3: `new_industry_or_city` among the needs, `relocate=false` and `maxOnsiteDays=0`. R4: `hoursPerWeek.max<5` and `deep_expertise` among the needs. R5: `travelComfort=burden` and (`needs[0]=senior_network` or `locationValues[0]` in {network_density, immersion}). R6: `needs[0]=deep_expertise` and `maxStretchDays≤7` |
| DQ12 | How step 4's one-PR-per-program fits "one issue per step, `Closes #N`" | A parent issue for step 4 plus one GitHub sub-issue per program. Each PR closes its sub-issue, and your verifying commit sits on that same PR before merge. The parent closes after the fourth |
| DQ13 | Program facts for the cards | The client imports `loadPrograms()` from core (core is browser-safe; 4 to 12 records are tiny). This keeps the payload small and gets the future re-rank slider ready |
| DQ14 | Strict tool schemas from zod | Generate with `z.toJSONSchema`, then run a unit test that checks the output stays inside the strict subset the claude-api skill documents (no unsupported keywords, `additionalProperties:false`, optional fields as nullable). If the generator can't comply, write the four schemas by hand and test them against zod |
| DQ15 | Coverage gate in CI | Report only, no threshold. The named rule tests matter more than a percentage on Day 2 |
| DQ16 | Prettier | Yes, `format:check` in CI, with `docs/` (including `docs/research/`) ignored so your prose is never reformatted |
| DQ17 | A local fake mode | `MODEL_FAKE=1` runs the page against the scripted persona A with no spend. Useful while building step 7 |
| DQ18 | City matching for travel (is the program in the home city?) | Case-insensitive and accent-insensitive equality on the city name. If a city matches, there's no airfare or lodging |
| DQ19 | A secret scanner in CI (for example gitleaks) | Not on Day 2. `.gitignore` and `.dockerignore` plus `check-bundle` cover the paths that matter. Add it Thursday, before the public deploy |
| DQ20 | Fresh-session `/code-review` on the step-4 data PRs | Skip it. They contain only JSON plus research files; schema CI and your fact-by-fact verification are the real review. If a step-4 PR touches code (for example a converter fix), it goes in a separate PR under its own issue, and that one gets reviewed |
| DQ21 | CI inside Docker too? | No. CI runs natively on GitHub's runner with Node 24 from `.nvmrc`, which is fast and isn't your host. The `docker` job builds the production image, so the container path is still tested |
| DQ22 | Where Claude Code's own commands run | `git` and `gh` on the host (they need your credentials); everything else through `./run` or `docker compose`. `CLAUDE.md` says so, so later sessions follow it |

---

## 4. Risks

| # | Risk | Mitigation |
| --- | --- | --- |
| R1 | Docker-only execution on macOS: slow bind-mount file watching in `next dev`, and native packages built for the wrong platform | `node_modules` in a named volume (never on the host). If hot reload lags, set `WATCHPACK_POLLING=true` in the `dev` service. Host Node 23 is never used, since Vitest 5 wouldn't run on it anyway |
| R2 | The newest TypeScript (7.0.2) and ESLint (10.x) break typescript-eslint and the Next ESLint plugins | Pinned to TypeScript 6.0.3 and ESLint 9.39.5, exact versions. Upgrading is a separate issue after the challenge |
| R3 | Standalone Docker output can leave out `advisor.md` (read with `fs`), so the advisor runs with no prompt | `outputFileTracingIncludes`, and `server/prompt.ts` throws at startup if the file is missing or empty. The step-6 `docker build` job catches it |
| R4 | Strict tool schemas generated from zod may use JSON Schema features strict mode rejects | DQ14's subset test, plus hand-written schemas as the fallback |
| R5 | Client-held history makes `/api/chat` usable as a general Claude proxy once it's public (forged turns, long inputs) | Request-schema limits, the fixed server-side system prompt and tools, the message cap and the Console spend limit for Day 2. Per-IP rate limiting before Thursday's deploy, as its own issue |
| R6 | Thinking blocks must go back to the API unchanged, or Sonnet 5.5 rejects the request | The client stores server responses as returned; a fake-model test asserts byte-identical history; the confirm rewrite happens on the server and is returned to the client |
| R7 | The fake can drift from real API shapes, so tests pass and the real run fails | The fake builds turns from SDK types. Step 6's optional curl check and step 7's real run catch drift early, on day 2, not day 5 |
| R8 | With real records, persona A's result may differ from the worked example (Northwestern MEM part-time is likely longer than 12 months, so specialized master's could be ruled out) | The worked example stays on fixtures. `personas/A.md` states the expected **category**, not exact scores. Real scores are read from the step-7 run |
| R9 | Perplexity output varies (prose around the JSON, comments, renamed fields) | json5 and a tolerant extractor. Unknown fields and values are hard errors with clear messages, never guessed. A hand fix to a research file is noted in the PR |
| R10 | Seven PRs, each with a fresh-session review, is a lot for one day on a Pro quota | Steps 4 and 5 can run beside steps 3 and 6. The Day 2 cut lines still apply to step 7. If time runs short, step 7 ships with only the network shortlist (cut line 3) |
| R11 | I can't switch my own model | After you approve, you run `/model claude-sonnet-5-5` in this session. I then commit `docs/build-steps.md` + `CLAUDE.md` on `step-1-scaffold`, open the 7 issues with `gh issue create` and build step 1 |
| R12 | A new session per step loses this conversation's reasoning | `docs/build-steps.md` (the full plan) and `CLAUDE.md` (the rules and workflow) are the handoff. Each issue body links to its section of `docs/build-steps.md`. Decisions made during a step go into `docs/decisions.md`, never only into chat |
| R13 | Four step-4 PRs all edit `programs.json` | Records are sorted by id, so a conflict is only where one record is inserted. Re-running `draft-records` after a rebase fixes it |

---

## Verification (end to end, after step 7)

1. `./run npm run ci` is green, and both CI jobs are green on `main`.
2. `docker compose up --build web` with `MODEL_API_KEY` in `.env`, then persona A runs to a verdict on `localhost:3000` with the real model. The cards show sources, confidence and the "draft" label where it applies.
3. The transcript download produces Markdown with the messages, chips, profile and engine result. `examples/persona-a-day2.md` and the screenshot are committed under the Day 2 run issue.
4. The server log for that run holds only status, round and token-count lines (`cache_read_input_tokens` above 0 after the first turn shows caching works), and no message text.
