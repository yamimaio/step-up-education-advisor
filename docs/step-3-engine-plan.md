# PR 3: Scoring engine (issue #5)

> **Oct 9:** Stage 2 scoring (scenarios, lenses, category bonus, peer fit points) is replaced by `docs/need-based-ranking.md`, and the category table moves to 1–5. That file wins where this plan differs.

## Context

Step 3 builds the pure TypeScript engine from implementation plan section 4. It follows the two-stage flow with one function per stage: `recommendCategory` turns the stage-1 answers (`DirectionProfile`) and the dataset into the category verdict and the stage-1 no-program trigger; `evaluatePrograms` turns the full `Profile`, the confirmed category and the dataset into the constraint checks per program, three scenario shortlists, the stage-2 trigger and `access`. `evaluate` runs both in order and returns one `EngineResult`. Every number on a card comes from this engine (rule 7), so each rule needs a named test. Section 12 and the section 11 follow-ups (travel, metro, unknown duration/tuition) take precedence over `docs/build-plan.md`. DQ10 and DQ11 in `docs/build-steps.md` fix near-miss-at-0 and the six contradiction predicates. DQ18 (city matching) is superseded by the 80 km distance check (`distance.ts`).

Branch `step-3-engine` from `main` (PR 2 is merged). The PR body starts with `Closes #5`. After the build, a fresh **Opus 5.5** session reviews it with `/code-review --comment`.

## Files

All files sit in `core/engine/`. They are pure: no I/O, no `node:` imports, and `today` is passed in. Each `X.ts` has a `X.test.ts` beside it.

| File | Exports |
| --- | --- |
| `types.ts` | `CheckId` (8), `CheckStatus`, `Check { id, status, value, limit, unit, unknown, note? }`, `ProgramEvaluation`, `CategoryResult`, `NoProgramResult`, `EffectiveDirection`, `DirectionResult`, `CategoryAccess`, `SearchResult`, `EngineResult`, `Contradiction` |
| `constants.ts` | `TYPE_RATINGS` matrix, `NEED_WEIGHTS [3,2,1]`, `DEGREE_ADJUST {no:-6, unsure:-4, preferred:-2}`, `DEGREE_ADJUSTED_TYPES`, `REQUIRED_RULES_OUT`, `GROW_IN_ROLE_BONUS 4` + types, `NO_PROGRAM_THRESHOLD 14`, `NEAR_MISS_PCT 15`, `HOURS_PASS_PCT 25`, `HOURS_NEAR_PCT 50`, `SCENARIO_WEIGHTS`, `CATEGORY_BONUS 0.5`, `PEER_FIT`, `LOCATION_FIT`, `AIRFARE_MIDPOINTS`, `CONFIDENCE_WINDOW_DAYS 60`, `WEEKEND_TRIPS_PER_YEAR 26`, `COMMUTE_KM 80` (commuting distance) |
| `normalize.ts` | `applyDirectionDefaults(directionProfile)` (stage 1) and `applyDeclinedDefaults(profile)` (stage 2, which reuses it) → the profile the engine actually uses plus `profileGaps` |
| `distance.ts` | `withinCommute(home, program)`: great-circle distance between `{ homeLat, homeLon }` and `{ campusLat, campusLon }` against `COMMUTE_KM` (replaces the city-matching code: `places.ts`, `metro.ts` and `METRO_STATES`; `normalize.ts` stays for `applyDeclinedDefaults`; see `docs/ux-two-stage.md`) |
| `travel.ts` | `travelEstimate(program, profile)` |
| `constraints.ts` | `overshoot()` helper, one function per check, `checkDirection(program, profile)` (stage 1: length, hours, work-compatible) and `checkConstraints(program, profile, travel)` (stage 2: all eight) → `{ checks, status }` |
| `categoryFit.ts` | `categoryFit(profile, programs, evaluations)` on the stage-1 checks; `rankCategories`, `failedChecks` |
| `noProgram.ts` | `noProgramForDirection(profile, category)` (`goal_unclear`, `no_type_fits`) and `noProgramForSearch(category, evaluations)` (`nothing_passes`) |
| `peerFit.ts` | `peerFit(profile, program)` → `{ points, text }` |
| `locationFit.ts` | `locationFit(profile, program)` → 1 to 5 |
| `confidence.ts` | `confidence(program, checks, today)` → `{ level, reasons[] }` |
| `scenarios.ts` | `scenarioScores(...)`, `shortlists(...)` |
| `contradictions.ts` | `checkContradictions(partial, programs)` (signature from DQ11) |
| `direction.ts` | `recommendCategory(directionProfile, programs)` → `DirectionResult` (stage 1) |
| `search.ts` | `evaluatePrograms(profile, category, programs, today)` → `SearchResult`, and `categoryAccess` (stage 2) |
| `evaluate.ts` | `evaluate(profile, programs, today)`: both stages in order |

Also:
- `core/index.ts` exports `recommendCategory`, `evaluatePrograms`, `evaluate`, `checkContradictions`, `DirectionProfileSchema` and the engine types.
- `tests/fixtures/profiles.ts` adds `workedExampleProfile` and a `makeProfile(overrides)` helper.
- `.github/workflows/ci.yml` adds a coverage report for `core/engine` with no threshold (DQ15). `@vitest/coverage-v8` is already installed.
- `docs/decisions.md` gets a "Step 3" section that records the defaults below.

**Order of the two stages** (from build-steps; split on Oct 9, `docs/decisions.md` "Engine split by stage"):

`recommendCategory` (stage 1):
1. Apply the declined-field defaults to the stage-1 answers.
2. Run the stage-1 checks (length, hours, work-compatible) for each program.
3. Run category fit.
4. Run the stage-1 no-program rule (`goal_unclear`, `no_type_fits`).

`evaluatePrograms` (stage 2, given the confirmed category):
1. Apply all the declined-field defaults.
2. Compute the travel estimate and the eight constraint checks for each program.
3. Compute peer fit, location fit, confidence and scenario scores (bonus for the confirmed winner).
4. Build the shortlists.
5. Run the stage-2 no-program rule (`nothing_passes`) and `access`.
6. List the profile gaps.

`evaluate` runs stage 1, then stage 2 with stage 1's category.

## Rule → function → test

**"Unknown-value rule"** (section 4) means the program doesn't publish a figure, so the record holds `null` (for example, no tuition total). The check is a **near miss** if the user set a limit for it and a **pass** if they didn't. Either way the card shows "not published" and confidence drops.

`describe` titles are the rules in plain words, so the test list reads as the rulebook. `S8-n` marks the nine tests from section 8; `E` marks the build-steps edge tests.

| Rule | Function | Test |
| --- | --- | --- |
| Needs weighted 3/2/1 × matrix (Strong 5, Some 3, Little 1) | `categoryFit` | **S8-1** "reproduces the plan's worked example": executive 28, EMBA and MBA out because of length, specialized master's 8, certificate 12, short course 12, run on the fixtures |
| Degree `no` −6, `unsure` −4, `preferred` −2 on MBA, EMBA and specialized master's | `categoryFit` | one case per value |
| Degree `required` rules out executive, certificate and short course | `categoryFit` | **S8-2** |
| `grow_in_role` adds +4 to executive, certificate and short course | `categoryFit` | **S8-3** |
| `step_up` adds nothing to any type; the matrix alone decides (MBA, EMBA and master's win through the degree and network ratings) | `categoryFit` | a `step_up` profile scores exactly its matrix subtotal plus degree adjustments |
| A type with records but none passing or near-missing the stage-1 checks (length, hours, work-compatible) is out; budget, travel and location never rule a type out | `categoryFit` | covered by S8-1 (EMBA, MBA); E: the verdict is the same whatever the budget, travel or location |
| A type with no records is never ruled out (D6) | `categoryFit` | **S8-9** |
| A tie returns `tie: [A, B]`; `tieBreaker` resolves it | `categoryFit` | E: tie, and tie plus tieBreaker |
| No type ≥ 4 → `no_type_fits` (stage 1) | `noProgramForDirection` | **S8-6a**: the degree is required but the user allows only 3 months. Executive, certificate and short course are ruled out by the degree rule; MBA, EMBA and master's are out on length; no type is left |
| Nothing passes or near-misses (types that aren't out only) → `nothing_passes` (stage 2) | `noProgramForSearch` | **S8-6b**: $3k budget and 0 on-site days (2 h/week, in the original example, is now a stage-1 answer and gives `no_type_fits`) |
| Stage 2 keeps the confirmed category; when its programs are out of reach, `access` names the failing checks and the best-scoring alternative | `evaluatePrograms`, `categoryAccess` | E: a $20k budget against the $30k executive program keeps the verdict, `none_within_limits`, `blockedBy: [tuition]`, alternative certificate; a given category is used, not recomputed |
| `goalClarity` unclear → `goal_unclear` (stage 1) | `noProgramForDirection` | **S8-6c** |
| Near miss when 15% or less over the limit | `overshoot` | **S8-4**: 14% near miss and named, 16% fails. E: exactly 15% is a near miss, 15.01% fails |
| A limit of 0 has no near miss (DQ10) | `overshoot` | E |
| Tuition ≤ budget; null tuition with a budget set → near miss, "not published"; with no limit → pass | `checkTuition` | **S8-5**, including that both cases lower confidence |
| Travel cost ≤ travel budget (when one is set) | `checkTravelBudget` | pass, near miss and fail; null budget passes |
| On-site days for every program; longest stretch for programs reached by travel (a program that needs the student near campus has no time away and passes it with a note) | `checkOnsiteDays`, `checkLongestStretch` | pass, near miss and fail; null → unknown rule; a local MBA's 240 days fail a limit of 10; a local evening program passes the stretch even with a null; a multi-week residency is reached by travel |
| Length ≤ `maxProgramMonths` | `checkLength` | EMBA 24 against 12 fails (S8-1); null → unknown rule |
| Hours: overlap or ≤ +25% passes with a note; ≤ +50% near miss; beyond fails | `checkHours` | E: overlap passes; 12 against 5–10 passes with "about 2 hours a week more"; 15 against 10 near miss; 16 against 10 fails |
| Work-compatible when `keepWorking` (boolean, no near miss) | `checkWorkCompatible` | pass and fail |
| Location: a full-time in-person program needs a campus within commuting distance (80 km) or relocation; evenings or daily attendance outside commuting distance fails; everything else passes and is left to the travel checks | `checkLocation` + `withinCommute` | E: in-person non-work-compatible fails unless within 80 km or relocating; a Boston user is local to Cambridge, a Buenos Aires user is not; null coordinates on either side are a near miss when the distance decides; no spelling rules |
| Program status = worst check | `checkConstraints` | small case |
| Travel (D8 + §11): trips, nights, lodging max, airfare midpoint, `lodgingIncluded`, within commuting distance → 0 | `travelEstimate` | E: D8 numbers (fake-executive from Buenos Aires: 3 × (1,250 + 5 × 365) = 9,225); airfare `unknown` → lodging only with the flag set; lodging included; weekends estimate labelled |
| Location fit (D9): 3, +1 per matched value, appeal +0.5 and burden −1 for hybrid and in-person, clamped 1 to 5 | `locationFit` | E: clamps at 1 and at 5 |
| Peer fit: `more_senior` below the user −1, at or above +0.5; `same_level` gap > 5 −1; otherwise 0 | `peerFit` | **S8-7**: 16 against median 5 gives −1, and the text says "about 5 years … you have 16" |
| Confidence: high, medium or low (60 days, cost and on-site time from an official page, no near miss) | `confidence` | E: day 60 vs day 61; one condition missing → medium; draft → low (D7); a real near miss (10% over budget, all figures published) stays high |
| Scenario score = weighted sum + 0.5 for the winning category + peer fit | `scenarioScores` | E: every weight row sums to 1; a hand-computed score |
| Top 3 per scenario: passes first, near misses only fill empty slots and are labelled | `shortlists` | E |
| The six contradiction rules (DQ11 predicates) | `checkContradictions` | **S8-8**: each rule fires on its example; a clean profile and an empty partial are quiet |
| Declined fields get neutral defaults and appear in `profileGaps` | `applyDeclinedDefaults` | declined tuition → no limit, and a gap is listed |
| Deterministic | `evaluate` | E: two runs are deep-equal; input not mutated |

**Implementation notes:**
- Percent checks use integer arithmetic (`value * 100 <= limit * (100 + pct)`), so the exactly-15% edge doesn't fail on float error.
- Shortlist ties are broken by program id, so the order is deterministic.
- Fixtures are parsed through `FixtureDatasetSchema` before use, so `evaluate` gets real `Program` objects.

## Ambiguous rules and the defaults I'll use

Each default goes into `docs/decisions.md` and the PR body (CLAUDE.md rule 8). ★ marks the ones that change results and that I'd like you to look at.

1. ★ **The no-program "no type fits" example doesn't reproduce.** The plan's example is "the only real need is a new city". With a new city ranked first, the full-time MBA scores 3 × 2 = 6, or 3 even after the −3 degree adjustment plus its other needs, so the rule stays above 4. In practice the trigger fires only when the strong types are out. **Default:** keep the threshold at 4. (On the 1–5 scale of Oct 9 the same holds: the MBA scores 16 against a threshold of 14.) Test 6a uses "a degree is required, but 3 months at most", which fires through rule-outs. I'll note that the plan's prose example doesn't fire the trigger.
2. ★ **Programs of a type that is "out" in step 1.** If the degree is required, executive programs are ruled out, but an executive program can still pass every constraint. **Default:** programs of an out type are left out of the shortlists. They keep their evaluations, so the card or the advisor can still show them.
3. ★ **Which length the length check uses.** **Default:** `durationMonths`, the fastest published pace. Null falls back to `durationMaxMonths`, and when both are null the unknown-value rule applies.
4. ★ **Per-course tuition.** **Default:** the tuition check uses only `tuitionUsd`, so null follows the unknown-value rule. The "about $X at N courses" estimate goes in the check's `note` for the card and never decides pass or fail. It does count elsewhere: R2 uses it as the program's price, and an official source on `tuitionPerCourseUsd` meets confidence's published-price condition (`docs/decisions.md`).
5. ★ **Nights per trip (D8: on-site days ÷ residencies).** Five on-site days is 4 nights. **Default:** follow D8 as written (days = nights). It overestimates a little, it is labelled as an estimate, and it matches persona A's fixture numbers. I'll note it for Thursday's tuning.
6. **Trips across years.** `residencyCount` is per year (schema comment). Trips = `residencyCount × ceil(durationMonths / 12)`.
7. **Weekend programs with no counts.** Use 26 trips a year at 2 nights each, labelled as an estimate.
8. **Missing data in the travel estimate.** If on-site counts or lodging are null (and lodging isn't included), the estimate is `unknown`, and the travel-budget check follows the unknown-value rule.
9. **Hours compared against a program range.** The program's `min` is compared with the user's `max`. A program's `max` below the user's `min` passes, since needing fewer hours is fine. The note is the rounded gap between the program's `min` and the user's `max`.
10. **Unknown-value rule for limits the user always sets.** `maxOnsiteDays`, `maxStretchDays`, `maxProgramMonths` and `hoursPerWeek` are always set unless declined. A null program value is therefore always a near miss. With today's data, many real programs will be near misses only because a figure is unpublished. That is the approved rule; I'll flag it for Thursday.
11. **Declined fields.** The profile still carries a value, and the engine ignores it. Defaults:
    - budgets and limits: no limit
    - `peerPreference`: `doesnt_matter`
    - `travelComfort`: `fine`
    - `airfareRange`: `unknown`
    - `degreeRequired`: no adjustment (not specified anywhere)
    - `homeCity`, `homeRegion`, `homeCountry`, `homeLat`, `homeLon`: no distance (unknown location). A program that needs you local is a **near miss** unless you'd relocate, never a pass or a fail (`docs/decisions.md`, "Location by distance")
    - `goalClarity`: `clear` (the AI marks it unclear only after follow-ups, so a declined value is never "unclear")
    - `locationValues`: none, so no location-fit points
    - `needs`: none, so no type wins, there are no deciding needs, and stage 1 fires `goal_unclear` (there is no neutral ranking; `docs/decisions.md`, "Round 4 review")

    `profileGaps` = the `declined` fields plus `airfareRange: unknown`.
12. **No-program precedence when several triggers fire.** Stage 1 first: `goal_unclear`, then `no_type_fits`; then stage 2's `nothing_passes` (changed from `goal_unclear`, `nothing_passes`, `no_type_fits` when the engine split by stage on Oct 9). An empty dataset counts as `nothing_passes`. Shortlists are still built ("if you decide to go anyway"), and with no winner there's no +0.5 bonus.
13. **Winner when every type is out.** `winner` and `runnerUp` are `Category | null`, and `no_type_fits` fires.
14. **Ties.** A tie exists only between the top two non-out scores. A three-way tie takes the first two in matrix order. `tieBreaker` makes that type the winner only if it's one of the tied pair.
15. **`decidingNeeds` ("the two needs that decided it").** No formula is given. **Default:** the two needs where `weight × (winner rating − runner-up rating)` is largest, with ties broken by need rank.
16. **Confidence (your decision, Oct 8: data gaps only).** The definition is build-plan.md's, read through section 4 ("confidence describes the data, not the fit"). There are four conditions:
    - verified, with `verifiedOn` (the oldest `checkedOn`) within 60 days
    - tuition published, from an `official_page` source
    - on-site time published, from an `official_page` source
    - no check that hit the unknown-value rule (a real fit near miss, like 10% over budget, does **not** count)

    All four → high; exactly one missing → medium; two or more → low. A draft record is capped at low (D7). The reasons are returned for the card.

    "Unsure" answers beyond `degreeRequired` stay out of step 3 (your decision). No issue for now.
17. **Contradictions.**
    - The signature takes `programs`, because DQ11's R2 needs the dataset.
    - R2 counts only degree-granting types (MBA, EMBA, specialized master's) with a known `tuitionUsd` at or under the budget. A null budget never fires.
    - Missing partial fields never fire a rule.
    - Rules already in `resolvedTensions` are still returned, marked `resolved: true`, so the advisor can skip them.
18. ~~**Metro table contents.**~~ Superseded: there is no metro table. Location is a distance check between the home and campus coordinates against `COMMUTE_KM` (80 km), in `distance.ts` (`docs/decisions.md`, "Location by distance").

## Verification

- `./run npm test`: all engine tests pass, and the worked-example test's name says "reproduces the plan's worked example".
- `./run npm run lint`: the core boundary rule is green (no `node:` or web imports in `core/engine`).
- `./run npm run typecheck` and `./run npm run format:check`
- `./run npx vitest run --coverage core/engine` prints a report; CI shows the same, with no gate.
- Skim check: read the `describe` titles as the rule list above.
- Then open the PR (`Closes #5`, decisions listed), and ask for the fresh Opus 5.5 review.
