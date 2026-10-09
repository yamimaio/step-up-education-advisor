# Step Up · Day 2 implementation plan

**Status: approved by Yami on Oct 8, 2026 (00:33 UTC).** Defaults D1 to D15 stand as written, with the review changes in section 12.

Oct 7, 2026. This is the detailed design for building the happy path, written in plan mode before any code. It sits under the approved build plan (`docs/build-plan.md`) and the Day 2 plan (`docs/day2-plan.md`), and does not change their decisions.

**How to review it (about 30 minutes):** read section 1 (design decisions) first. Each decision has a default, and the build follows the defaults unless you change one. Mark each one OK or change it. Sections 2 to 9 are the detail behind them; skim what you care about.

---

## 1. Design decisions for your approval

| # | Question | Default I picked | Why |
| --- | --- | --- | --- |
| D1 | Who decides when to score: the AI calling a scoring tool, or the server after you confirm the profile? | **The server.** The AI calls a confirm tool (`propose_profile` when decided; now `propose_direction` and `propose_search`, section 12); the page shows the "Here's what I understood" card; when the user taps "Looks right", the server runs the engine and hands the result back to the AI to explain. Since the two-stage split (section 12), there are two such pauses: `propose_direction` runs stage 1 (`recommendCategory`) and `propose_search` runs stage 2 (`evaluatePrograms` with the confirmed category). The AI never calls `score_scenarios` itself | Matches the plan's rule that the profile is the only thing crossing from AI to engine and the user confirms first. Also means the verdict can never be skipped or faked by the model |
| D2 | How do quick-reply chips work? | **The AI calls an `ask_choice` tool naming a field** (for example `tuitionBudgetUsd`); the chip options come from a fixed table in the code, not from the AI. A tap sends the chip's value | Numbers stay structured and identical every run, so scoring never parses free text |
| D3 | Where does conversation state live? | **In the browser tab only.** Each request sends the full message history; the server is stateless and logs nothing but counts and errors | The privacy promise (no DB, no logs). Costs a bit more input per turn, which prompt caching mostly absorbs |
| D4 | Model settings | **`claude-sonnet-5-5`, adaptive thinking, effort `medium`, one fixed effort for the whole conversation**, no streaming on Day 2 | `medium` is a safe middle for the verdict turn. Changing effort mid-conversation breaks the cache, so it stays fixed. Streaming is a Thursday polish item |
| D5 | Cost controls built in on Day 2 | Prompt caching on tools + system prompt + history; **40 user messages max per conversation** (server-enforced); `max_tokens` 16,000; spend limit set in the Console | The plan's cost controls; the cap stops a runaway loop |
| D6 | Program types with **no record in the dataset yet** (Day 2 has only 4 programs, so full-time MBA and short course have none) | **Not ruled out.** They show as "no verified programs yet" and can still win the category step | Otherwise the plan's rule "a type with no program inside your limits is ruled out" would wrongly kill two types just because data isn't entered yet |
| D7 | Unverified records | Records carry `verification.status` = `draft` or `verified` plus `verifiedBy`. **Draft records still score**, but the card says "Draft, not yet verified" and confidence is capped at low | Lets the end-to-end run work even if you only verified 2 of 4 by evening, without hiding it |
| D8 | Travel estimate details the plan left open | Trips = `residencyCount` × program years (rounded up); nights per trip = on-site days ÷ residencies; lodging = a `lodgingPerNightUsd` field per program with its GSA source and date; airfare = the midpoint of the chosen chip ($400, $750, $1,250, $1,750 for "over $1,500") | Plan says computed, not searched. The midpoints are labelled as estimates on the card |
| D9 | Location fit (the fifth rating, computed per user) | Start at 3; +1 for each of the user's two location values the program offers; travel "part of the appeal" adds 0.5 to hybrid and in-person programs, "a burden" subtracts 1; clamp to 1 to 5 | Simple and explainable; tuned with personas on Thursday |
| D10 | Contradictions | **A server tool `check_contradictions`** the AI must call after the constraints questions and before each confirm pause (`propose_direction`, `propose_search`); a rule whose fields aren't answered yet doesn't fire. It runs the plan's six coded rules; the AI raises each one and records which side the user picked | The plan's "fixed rules, raised in plain words before results" |
| D11 | Ties in the category step | Engine returns `tie: [A, B]`; the AI asks one separating question, then calls `propose_direction` again with `tieBreaker` set (a tie is a stage-1 result). **No second confirm card** when only the tie-breaker changed | Plan: "a tie is not broken by formula". Low priority for Day 2; persona A has no tie |
| D12 | Where the Claude API code lives | A `server/` folder beside `app/`, not in `core/`. `core/` stays data + engine + `advisor.md`, as the plan says, so a later MCP server reuses it without the web or model code | Keeps the core/app boundary clean |
| D13 | How the 4 programs get drafted | **Perplexity Deep Research does the research** (your call, Oct 7), one run per program with the prompts in `docs/perplexity-program-prompts.md`: official pages only, a URL and a verbatim quote per fact, null when not published. The same Perplexity thread then applies the rating rubric (one model for all 12 programs, so the ratings are comparable). You review the result with Claude and open the PR; the zod check in CI rejects anything that doesn't fit the schema. You verify each fact against its quote and link; the verifying commit names you | Quotes make your verification quick, the research runs in parallel with the build, and it saves Claude usage |
| D14 | Repo hygiene | One `main` branch, one GitHub issue per build step and one PR per issue that closes it (`Closes #N`), about 7 of each, CI on every PR: lint, typecheck, unit tests, data validation. You merge | Gives you a review point per step without slowing the day |
| D15 | A code review besides yours | **Builder: Claude Code on Sonnet 5.5** (lighter on your Pro quota). Before you review each PR, **a fresh Claude Code session runs `/code-review` on it** and posts its findings as PR comments (`--comment`); the building session fixes them, then you review. Fresh sessions run on Sonnet 5.5 too, except the two PRs where a miss costs most, the engine (step 3) and the server (step 6), which get Opus 5.5 if your quota allows. The server PR also gets `/security-review` (API key handling, user input, what gets logged) | A fresh session doesn't share the builder's reasoning or blind spots, which matters more than switching models. Spending Opus only where it matters keeps the day inside Pro limits; if you go back to Max, everything can run on Opus |

Anything you'd want to change that isn't in this table, add it as a note and I'll fold it in.

---

## 2. Repo layout

```
step-up/
├─ core/                      # the advisor core: no web, no model SDK
│  ├─ data/programs.json      # 4 records today, 12 by Friday
│  ├─ schema/
│  │  ├─ program.ts           # zod schema + inferred Program type
│  │  └─ profile.ts           # zod schema + inferred Profile type
│  ├─ engine/
│  │  ├─ constants.ts         # type ratings matrix, scenario weights, thresholds
│  │  ├─ categoryFit.ts       # Step 1
│  │  ├─ constraints.ts       # Step 3
│  │  ├─ scenarios.ts         # Step 4
│  │  ├─ peerFit.ts
│  │  ├─ locationFit.ts
│  │  ├─ travel.ts
│  │  ├─ confidence.ts
│  │  ├─ contradictions.ts
│  │  ├─ noProgram.ts         # Step 2 (stage-1 and stage-2 triggers)
│  │  ├─ distance.ts          # commuting distance (80 km)
│  │  ├─ normalize.ts         # declined-field defaults, per stage
│  │  ├─ direction.ts         # stage 1: recommendCategory (Steps 1 and 2)
│  │  ├─ search.ts            # stage 2: evaluatePrograms (Steps 3 and 4)
│  │  └─ evaluate.ts          # both stages in order, one EngineResult
│  ├─ advisor/
│  │  ├─ advisor.md           # SKILL.md format; loaded as the system prompt
│  │  └─ chips.ts             # the fixed chip sets per field
│  └─ index.ts                # public API of the core
├─ server/                    # website-only server code
│  ├─ model/
│  │  ├─ adapter.ts           # ModelClient interface (swap to an open model later)
│  │  ├─ anthropic.ts         # Claude implementation
│  │  └─ fake.ts              # scripted responses for tests, costs nothing
│  ├─ tools.ts                # tool definitions for the model
│  ├─ handlers.ts             # runs server-side tools against core
│  ├─ chatLoop.ts             # one request: call model, run tools, stop at a UI pause
│  └─ fallback.ts             # template explanation when the model is unreachable
├─ app/                       # Next.js App Router
│  ├─ layout.tsx, page.tsx, globals.css
│  ├─ api/chat/route.ts
│  └─ components/             # Chat, Message, ChipRow, ProfileCard, VerdictBlock,
│                             # ProgramCard, DataLimitsFooter, PrivacyNotice
├─ personas/                  # A.md … F.md, the 6 test personas
├─ examples/                  # saved runs (persona-a-day2.md)
├─ scripts/validate-data.ts   # zod check on programs.json, used by CI
├─ docs/build-plan.md, docs/implementation-plan.md, docs/decisions.md
├─ Dockerfile, docker-compose.yml, .env.example
└─ .github/workflows/ci.yml
```

An ESLint `no-restricted-imports` rule fails the build if anything in `core/` imports from `app/` or `server/`.

---

## 3. Data shapes

### Program (zod, follows the plan's schema)

Everything in the plan's schema table, plus three additions from the decisions above:

- `verification: { status: "draft" | "verified", verifiedBy: string | null }` (D7)
- `lodgingPerNightUsd: { min, max } | null` with its own `sources` entry (GSA, date) (D8). GSA lodging varies by month, so this is the range across the fiscal year, and the travel estimate uses `max`. It is null for online programs
- Changes after reading the first four research files (PR 2, approved Oct 8):
  - `durationMonths` is nullable (the typical or fastest published length) and `durationMaxMonths` is the slowest allowed pace
  - `credits`, `accreditation` and `tuitionIncludes` are nullable; for `accreditation`, `[]` means none or non-degree and null means not published
  - `attendance: "none" | "residencies" | "recurring_weekends" | "recurring_evenings" | "recurring_daily"` (daily means full-time on campus) and `onsiteNote` (the published wording). The day and trip counts win when they exist; `attendance` classifies the pattern and says whether the student must live near campus
  - `tuitionPerCourseUsd` and `courseCount`; `tuitionUsd` stays null when no total is published
  - `lodgingIncluded: boolean | null`, so the travel estimate doesn't count lodging the tuition already covers
  - `city` is the bare city name, null only for online programs; `state`; `campusAddress` (sourced street address), `campusLat`/`campusLon` (approximate campus coordinates in degrees, derived from the address and noted as such in `figureNotes`) are null only for online programs; `country` is an ISO 3166 alpha-2 code, not fixed to US; `metro` (kept in the schema, no longer used by the engine) groups cities that share a commute (Boston and Cambridge)
  - `cohortExperienceBasis: "median" | "average" | "unspecified"`, set whenever the cohort years are
  - `figureNotes`: a short caveat per field, shown next to the value (a price for the previous entering class, a range stored as its midpoint)
  - sources carry `kind: "official_page" | "school_correspondence"`; a correspondence source needs no URL. `nextStartDate` stays out (DQ7)
- `ratingNotes` as an object keyed by rating, not one string, so the card can show the right note per rating
- `paymentOptions` as a list of fixed values, not free text: `installments`, `employer_sponsorship`, `loans`, `scholarships`, `early_payment_discount` (null when the page doesn't say). They match the user's `paymentPlan`: installments to installments, employer to employer_sponsorship, loans to loans; savings, mixed and no_preference need no match, and the card then lists every payment option the program publishes, so the user still learns how they could pay. A match or a gap is a line on the card ("Installments: offered" or "Installments: not published"). It never filters or scores a program, because schools often arrange payment on request

`verifiedOn` and `confidence` are not stored. `verifiedOn` is computed as the oldest `checkedOn` in `sources`; confidence is computed per user (it depends on near misses).

Validation rules beyond types: a fact group (tuition, schedule, class profile) needs at least one source whenever one of its fields has a value; ratings are integers 1 to 5; an online program has 0 on-site days, residencies and stretch, attendance `none`, and no lodging; every other program has a city; a US lodging rate needs a gsa.gov source; every source names a real program field and carries a real quote (never "not published").

### Profile (what the confirm pauses send and the user confirms)

Stage 1 (`propose_direction`) sends the `DirectionProfile` subset: `careerGoal`, `goalClarity`, `needs`, `degreeRequired`, `maxProgramMonths`, `hoursPerWeek`, `keepWorking`, `tieBreaker` and `declined`. Stage 2 (`propose_search`) sends the full profile below.

| Field | Type |
| --- | --- |
| `yearsExperience`, `yearsLeading` | number |
| `degree` | `{ level: "bachelor" \| "master" \| "doctorate" \| "other", field: string }` |
| `currentRole` | `"ic" \| "manager" \| "director" \| "executive" \| "other"` |
| `careerGoal` | `{ kind: "step_up" \| "grow_in_role", description: string }` |
| `goalClarity` | `"clear" \| "unclear"` (the AI sets "unclear" only after two follow-ups) |
| `needs` | exactly 3 of `leadership_skills`, `deep_expertise`, `graduate_degree`, `senior_network`, `new_industry_or_city`, in rank order |
| `peerPreference` | `"more_senior" \| "same_level" \| "doesnt_matter"` |
| `degreeRequired` | `"required" \| "preferred" \| "no" \| "unsure"` |
| `tuitionBudgetUsd` | number or null (no limit) |
| `paymentPlan` | `"savings" \| "installments" \| "employer" \| "loans" \| "mixed" \| "no_preference"` |
| `travelBudgetUsd` | number or null ("not a concern") |
| `airfareRange` | `"under_500" \| "500_1000" \| "1000_1500" \| "over_1500" \| "unknown"` |
| `travelComfort` | `"appeal" \| "fine" \| "burden"` |
| `hoursPerWeek` | `{ min: number, max: number }`, a range from the chip |
| `maxProgramMonths` | number |
| `keepWorking` | boolean |
| `maxOnsiteDays`, `maxStretchDays` | number |
| `homeCity`, `homeRegion`, `homeCountry`, `homeLat`, `homeLon`, `relocate` | non-empty string; string or null (null when the country has no state or province and the user said so); two-letter ISO country code (`/^[A-Z]{2}$/`, the same rule as `country` in the program schema); latitude (-90 to 90) and longitude (-180 to 180) of the approximate city centre, filled by the model; boolean. When named in `declined`, the part holds `""` (city, country) or `null` (region, lat, lon) and the engine ignores it |
| `locationValues` | up to 2 of the plan's seven location values |
| `resolvedTensions` | `{ rule: string, chosen: string }[]` |
| `tieBreaker` | category, optional (D11) |
| `declined` | list of fields the user chose not to answer |

Declined fields use a neutral default in the engine (for example no budget limit) and the verdict says which answers were missing.

### Chip sets (`core/advisor/chips.ts`)

| Field | Chips (label → stored value) |
| --- | --- |
| `tuitionBudgetUsd` | Under $5k → 5,000 · $5k to $15k → 15,000 · $15k to $40k → 40,000 · $40k to $80k → 80,000 · Over $80k → 250,000 · No set limit → null |
| `travelBudgetUsd` | Under $2k · $2k to $5k · $5k to $10k · Over $10k · Not a concern → null |
| `airfareRange` | the plan's four ranges + "I don't know" |
| `hoursPerWeek` | Under 5 → 0 to 5 · 5 to 10 → 5 to 10 · 10 to 15 → 10 to 15 · 15 to 20 → 15 to 20 · More than 20 → 20 to 40 (stored as a range) |
| `maxProgramMonths` | About 2 months → 3 · Up to 6 months → 6 · Up to a year → 12 · Up to 2 years → 24 · Longer is fine → 60 |
| `maxOnsiteDays` | None → 0 · Up to 10 → 10 · Up to 20 → 20 · Up to 40 → 40 · More → 365 |
| `maxStretchDays` | Can't travel → 0 · A few days → 4 · About a week → 7 · Two weeks → 14 · Longer → 60 |
| `travelComfort`, `peerPreference`, `degreeRequired`, `keepWorking`, `relocate`, `currentRole` | one chip per enum value |

A range chip stores its upper bound, so a program at the edge of the range passes. Hours are the exception: they are stored as a range, because both the user's answer and the school's figure are estimates.

---

## 4. Engine API (`core/engine`)

All pure functions, no I/O, deterministic. The engine follows the two-stage flow (section 12): one function per stage, and the category confirmed in stage 1 is an input to stage 2, so stage 2 can never change it.

```ts
// Stage 1, "what kind of step fits me?" (at propose_direction)
recommendCategory(profile: DirectionProfile, programs: Program[]): DirectionResult
// Stage 2, "show me programs" (at propose_search), with the category the user confirmed
evaluatePrograms(profile: Profile, category: CategoryResult, programs: Program[], today: Date): SearchResult
// Both in order, for tests and one-call use
evaluate(profile: Profile, programs: Program[], today: Date): EngineResult
```

`DirectionProfile` holds only the answers that decide the category (section 3), so category fit can't read a budget, travel or location answer: the type system enforces it.

`DirectionResult` holds:

- `category`: `{ scores: Record<Category, number | "out">, reasons: Record<Category, string[]>, winner, runnerUp, tie?: [Category, Category], decidingNeeds: Need[] }`
- `noProgram`: `{ triggered: boolean, trigger?: "goal_unclear" | "no_type_fits" }`
- `profileGaps`: the declined stage-1 fields

`SearchResult` holds:

- `programs`: for every program, `{ id, checks: Check[], status: "pass" | "near_miss" | "fail", peerFit, locationFit, travelEstimate, confidence, scenarioScores }`
- `scenarios`: `{ network: id[3], depth: id[3], practicality: id[3] }`, passes first, near misses only to fill empty slots and labelled as such
- `noProgram`: `{ triggered: boolean, trigger?: "nothing_passes" }`
- `access`: `{ category, status: "available" | "none_within_limits" | "no_programs" | "no_winner", blockedBy: CheckId[], alternative }`. When the confirmed category has no program within the limits, the verdict stands and the card says why, naming the best-scoring category that has one (`docs/ux-two-stage.md`: "rather than quietly changing the verdict")
- `profileGaps`: declined or defaulted fields

`EngineResult` (from `evaluate`) is `category` from stage 1 plus everything from stage 2, with `noProgram` taken from stage 1 when it fires and from stage 2 otherwise.

Steps, as the plan defines them:

1. **`categoryFit`** (stage 1): weights 3, 2, 1 on the ranked needs × the type ratings matrix (Strong 2, Some 1, Little 0). Adjustments in this order: degree `no` → MBA, EMBA, specialized master's −3, `unsure` → −2, `preferred` → −1 (graded, Yami's review Oct 8; the approved plan had −3 for all three); `required` → executive, certificate, short course out; goal `grow_in_role` → executive, certificate, short course +2; a type with records but none passing or near-missing **the stage-1 checks (length, hours, work-compatible)** → out (D6: a type with no records is never ruled out on this rule). Budget, travel and location never rule a type out.
2. **`noProgram`**: stage 1 fires `goal_unclear` (`goalClarity` = unclear) or `no_type_fits` (no type ≥ 4, including every type out); stage 2 fires `nothing_passes` (no program of a type that isn't out passes or near-misses all eight checks).
3. **`checkConstraints`** (stage 2; stage 1 runs only length, hours and work-compatible): the plan's eight checks per program. Each returns pass, near miss (fails by 15% or less) or fail, with the numbers used. **Location** follows the travel answers, not the format label: a program needs the student nearby only when it is full-time and in person (`format` in_person and not `workCompatible`) or meets in the evenings or daily (`attendance`), and then it passes only if the campus is within commuting distance (80 km) of home or they would relocate. Every other program is reachable by travel, and whether that travel works is decided by the on-site days, longest stretch away and travel budget checks. The home country and region also set which airfare question to ask. **Hours are looser**, because both sides are estimates: the program's hours (a range when the school gives one) pass if they overlap the user's range or sit up to 25% above its top, with a note on the card (for example a user at 5 to 10 and a program at 12: "about 2 hours a week more than you planned"); up to 50% above is a near miss; beyond that it fails. Unknown values (null tuition) count as a near miss only when the user set a limit for that check; with no limit ("No set limit", "Not a concern") the check passes. Either way the card shows "not published" and confidence is lowered, because confidence describes the data, not the fit.
4. **`scoreScenarios`** (stage 2): weighted sum with the plan's three weight rows, +0.5 when the program's category is the confirmed winner, plus peer fit (−1, +0.5, or −1 for a gap over 5 years at the same level).

Thresholds and weights live in `constants.ts` so Thursday's tuning is one file.

`checkContradictions(partialProfile)` returns the plan's six rules that fire, each with an id and a plain-words sentence the AI can adapt.

---

## 5. Advisor loop (`server/`)

### Tools the model sees

| Tool | Runs where | Purpose |
| --- | --- | --- |
| `ask_choice({ field, question })` | **pauses for the user** | Shows the chip set for that field. The tool result is the user's tap |
| `check_contradictions({ profile })` | server | Partial profile in, rules that fire out |
| `propose_direction({ profile })` | **pauses for the user** | Stage 1. Shows the confirm card for the stage-1 answers (`DirectionProfile`). On "Looks right" the server runs `recommendCategory` and returns `{ confirmed: true, result }`; on a correction it returns `{ confirmed: false, corrections }` |
| `propose_search({ profile })` | **pauses for the user** | Stage 2, opt-in. Shows the confirm card for the full profile. On "Looks right" the server runs `evaluatePrograms` with the category confirmed at `propose_direction` (taken from the history, never from the model or the client) and returns `{ confirmed: true, result }`; on a correction, `{ confirmed: false, corrections }` |
| `search_programs({ category?, query? })` | server | Lets the advisor answer "what about Wharton?" from records only; returns facts plus sources |

All tools use `strict: true`. `tool_choice` stays `auto` (Sonnet 5.5 rejects forced tool choice); `advisor.md` tells the model when each tool is required.

### One request to `/api/chat`

1. The browser posts `{ messages }` (the full history, assistant turns unchanged, thinking blocks included) and, after a pause, the user's chip tap or confirm as a `tool_result`.
2. The server checks the message cap, prepends the cached system prompt and tools, and calls the model.

   **The cap never throws work away.** From message 30 the page shows a quiet counter ("10 messages left"). If the direction isn't confirmed by message 35, the server adds a mid-conversation system note telling the advisor to wrap up the intake and call `propose_direction`, so the verdict still arrives. Results and the Download transcript button keep working after the cap, because they come from the engine and the browser, not the model.
3. If the model calls a server tool, the server runs it and calls the model again (at most 5 rounds per request).
4. The server stops and returns when the model ends its turn or calls a pausing tool. The response carries the new assistant blocks and a `ui` hint: `chips`, `confirm_direction`, `direction` (with the `DirectionResult`), `confirm_search`, or `results` (with the `SearchResult`), so the cards render from engine data, never from model text.

History is append-only: nothing is edited or removed, which keeps the cache warm and satisfies Sonnet 5.5's rule about replayed thinking blocks.

### Model adapter

```ts
interface ModelClient {
  send(req: { system: SystemBlock[]; tools: Tool[]; messages: MessageParam[] }): Promise<ModelTurn>
}
```

`anthropic.ts` implements it with the official `@anthropic-ai/sdk`, key from `MODEL_API_KEY`. `fake.ts` replays scripted turns for tests. Errors map to three cases: retryable (the SDK retries twice), out of credit or bad key, and refusal. Each one gives the user a plain message.

### Prompt caching

The tools and the system prompt are frozen strings (no dates or ids inside them), with a cache breakpoint after the system prompt and automatic caching on the messages. The server logs `cache_read_input_tokens` per request (a number, never content), so we can see that caching works.

### `advisor.md` v0 outline

Frontmatter (`name`, `description`) so it is a valid SKILL.md. Sections: who you're talking to and the scope; the interview order (open questions first, constraints last, chips for numbers via `ask_choice`); the 17-field checklist; when to call `check_contradictions` and how to raise a tension; when to call `propose_direction` and, if the user opts in, `propose_search`; how to deliver the verdict (the three magic-moment beats, why the other types lost, programs as evidence); the "not yet" rule; facts only from tool results, never from memory; out-of-scope requests and where to refer them (including PhDs: research degrees of 4 to 6 years, mostly full time, aimed at research careers, so the advisor explains why and points to what fits; executive doctorates are a post-challenge follow-up); tone (lively, direct, says "leaders", no put-downs of other options).

---

## 6. Page (Day 2 level: rough but not broken)

- A privacy notice before the first message: what is sent to the model provider and a request not to share names, employers or contact details.
- A chat column with message bubbles and a chip row under the latest question. The chips are real buttons with text labels, so they work by keyboard.
- The confirm card lists each profile line, with "Looks right" and "Change something".
- Results: a verdict block (category, runner-up, deciding needs, resolved tensions, or the "not yet" trigger), three shortlists of program cards (checks, classmates, credential, tuition and payment options, travel estimate, on-site time, city fit, confidence with reason, sources and verified-on date), and the data-limits footer.
- A **Download transcript** button that builds a Markdown file in the browser: every message, the chips tapped, the confirmed profile and the engine result. Nothing goes to the server, which keeps the privacy promise.
- Branding: Step Up wordmark, the deep teal accent and warm paper background from the Day 1 cards, one font. Full level 0 polish waits for Thursday.

---

## 7. Build sequence (one PR each, CI green before the next)

**Working convention: one issue per PR.** Once you approve the plan, Claude Code opens one GitHub issue per step below (title, goal, and the "Done when" line as acceptance criteria). Each PR body starts with `Closes #<issue>`, so merging the PR closes the issue. Work found along the way that doesn't fit a step gets its own issue rather than widening a PR.

| PR | Contents | Done when |
| --- | --- | --- |
| 1 Scaffold | Next.js + TS + Tailwind, folder layout, ESLint boundary rule, Vitest, Dockerfile, compose, `.env.example`, CI, `docs/` copies | `docker compose up` serves a placeholder page; CI green |
| 2 Schemas | `program.ts`, `profile.ts`, `validate-data.ts`, a fixture dataset with one realistic program per type (test-only, clearly fake ids) | validator rejects a record missing a source |
| 3 Engine | everything in section 4 with tests | the plan's worked example reproduces exactly; tests below pass |
| 4 Data | 4 draft records built from your Perplexity research files | records validate; you verify and flip them to `verified` |
| 5 Advisor | `advisor.md`, `chips.ts`, `personas/A.md` to `F.md` | you've read `advisor.md` |
| 6 Server | adapter, fake, tools, handlers, chat loop, route, fallback | a fake-model test walks persona A from first message to `results` |
| 7 Page | the components in section 6 | persona A runs on localhost with the real model |

Then the end-to-end run and saved example from the Day 2 plan.

---

## 8. Tests that ship today

Engine (Vitest, no model):

1. The plan's worked example: executive program 11, EMBA and full-time MBA out on length, specialized master's 1, certificate 3, short course 3.
2. `degreeRequired: "required"` rules out executive, certificate and short course.
3. `grow_in_role` gives +2 to executive, certificate and short course.
4. A near miss at 14% stays visible and named; at 16% it fails.
5. Null tuition with a tuition budget set is a near miss shown as "not published"; with no budget set it passes. Both lower confidence.
6. Each no-program trigger fires on its own example from the plan.
7. Peer fit: 16 years of experience against a cohort median of 5 with `more_senior` gives −1, and the card text says so.
8. Each of the six contradiction rules fires on its example and stays quiet on a clean profile.
9. A type with no records isn't ruled out (D6).
10. Stage 2 never changes the confirmed category: a budget that rules out its programs keeps the verdict, and `access` says `none_within_limits`, names the failing checks and the best-scoring alternative.

Server (fake model): persona A's scripted run reaches `results`; a missing key shows the friendly message and still renders engine results (plan test 6); empty input gets a nudge (plan test 4); the counter appears at message 30; a profile still open at message 35 triggers the wrap-up note; the 41st message is refused politely while results and the transcript download still work.

---

## 9. Personas (`personas/`)

Each file holds: who they are, their true answers to all 17 fields, what they say if asked open questions (in their voice), the expected verdict, and what a sharp advisor should notice.

- **A, you in March 2026:** 16 years in, 12 leading, Argentina, wants executive roles, senior classmates, a year at most, blended is fine. Expected: executive program, EMBA as runner-up ruled out on length.
- **B, not yet:** can't name a goal after two follow-ups. Expected: "No program yet", goal unclear.
- **C, grow in role:** new director, wants to lead better where they are, little time. Expected: certificate or short course.
- **D, the EMBA case from the demo:** VP move, needs a degree the next employer recognizes and network density in a hub. Expected: hybrid EMBA.
- **E, contradiction:** ranks network first but allows 0 on-site days. Expected: tension raised before results.
- **F, out of scope:** wants an admissions prediction and visa advice. Expected: polite refusal and referral (plan test 7).

---

## 10. Risks for today

| Risk | Mitigation |
| --- | --- |
| The model skips `ask_choice` and asks for numbers in free text | `advisor.md` makes it a rule; the server rejects a confirm pause (`propose_direction`, `propose_search`) if numeric fields weren't set by a chip and tells the model to ask again |
| The model states a fact not in the records | Facts only come from tool results; the number check from the plan's risk table lands Thursday |
| Verification takes longer than expected | D7: draft records run, labelled |
| A design decision changes after you review | Each one is isolated (a constant, one tool, or one component), so a change is a small PR |

---

## 11. Follow-ups noted during review

- Executive doctorates (part-time DBA or leadership doctorates for working senior leaders) as a possible seventh type after the challenge (agreed with Yami, Oct 8). PhDs stay out of scope.

Engine follow-ups from the PR 2 schema changes (for step 3):

- Travel: use lodging `max`; derive trips and nights from `residencyCount` and `onsiteDaysPerYear` when they exist, and only when they are null estimate from `attendance: "recurring_weekends"` (every other weekend is about 26 trips a year), labelled as an estimate; skip lodging when `lodgingIncluded` is true.
- Location: resolve cities through a small city-to-metro table, so a user in Boston is local to Cambridge. Same metro means no airfare or lodging. A `recurring_evenings` or `recurring_daily` program outside the user's metro fails the location check, because it needs the student within commuting distance; the advisor can ask "could you commute weekly?" (step 5).
- Unknown `durationMonths` or `tuitionUsd` follow the existing unknown-value rule; a program with `tuitionPerCourseUsd` and `courseCount` may show "about $X at N courses" as a labelled estimate.

## 12. Refinements to the approved build plan

These came out of Yami's review on Oct 7 and 8 and take precedence over `docs/build-plan.md` where the two differ:

- `hoursPerWeek` is a range on both the user and program side, with a looser check (section 4).
- `paymentPlan` gains `no_preference`; `paymentOptions` uses fixed values and never filters or scores (section 3).
- "Reachable location" is defined: only full-time in-person programs need home city or relocation; everything else is decided by the travel checks (section 4).
- Degree adjustment is graded: `no` −3, `unsure` −2, `preferred` −1 for MBA, EMBA and specialized master's (the approved plan used −3 for all three).
- PhDs are out of scope and referred; executive doctorates are a follow-up (section 11).
- Program research and ratings run in Perplexity, not Claude (D13); the build runs on Sonnet 5.5 with fresh-session code reviews (D15).
- Program schema changed after reading the first four research files: lodging as a range, `attendance`, per-course tuition, `lodgingIncluded`, nullable duration, credits and accreditation, ISO `country`, `metro`, `figureNotes` and `source.kind` (section 3).
- **Two-stage flow (Oct 8, `docs/ux-two-stage.md`):** stage 1 asks only what decides the category (goal, gap, classmates, length, hours, keep working, degree) and ends in the verdict or "not yet"; stage 2 is opt-in ("Want to see programs that fit?") and asks budget, travel and where the user lives, then shows the shortlists. Two confirm pauses (`propose_direction`, `propose_search`) replace the single `propose_profile`.
- **Location by coordinates (Oct 8):** the model turns where the user lives into `homeCity`, `homeCountry` (ISO) and approximate `homeLat`/`homeLon`; programs carry campus coordinates. The engine compares distance only: weekly in-person programs pass within 80 km (default) or if the user would relocate; everything else is judged by travel answers. No city lists, metro tables or spelling rules.
- **Engine split by stage (Oct 9, PR #22):** the engine has one function per stage. `recommendCategory(directionProfile, programs)` answers stage 1 from the answers that decide the category only, and its input type has no budget, travel or location. `evaluatePrograms(profile, confirmedCategory, programs, today)` answers stage 2 and takes the category the user confirmed instead of recomputing it, so a budget or a location can never change the verdict; when they rule out the category's programs, `access` says so and names the best-scoring alternative. `evaluate` runs both in order for tests and one-call use. A category is now ruled out only by length, hours or keeping a job (and the degree rule), never by budget, travel or location (section 4). Details and the test changes are in `docs/decisions.md` ("Engine split by stage").
