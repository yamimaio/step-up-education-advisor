# Decisions log

Choices made while building, where the approved docs were silent. Each links to a design question in `docs/build-steps.md`.

## Step 1

- Runtime is Node 24 in Docker only; CI reads `.nvmrc`. TypeScript is pinned to 6.0.3 and ESLint to 9.39.5, because typescript-eslint 8.71 and the Next ESLint plugins don't support TypeScript 7 or ESLint 10 yet.
- DQ16: Prettier runs in CI; `docs/` (including `docs/research/`) is ignored.
- DQ21: CI runs natively on GitHub's runner; a separate job builds the production Docker image.
- DQ22: `git` and `gh` run on the host; everything else goes through `./run`.
- `HOST_PORT` sets the host port in `docker-compose.yml` (default 3000), since another project may hold 3000.
- `npm audit` reports a high-severity `braces` issue inside `eslint-config-next`'s dev-only lint chain. It isn't shipped; revisit when Next publishes a fix.

## Step 2

- Program schema changes from the research review are listed in `docs/implementation-plan.md` section 3. They change DQ7 and DQ8: `durationMonths`, `credits`, `accreditation` and `city` can be null as described there, and `country` is an ISO code.
- B1: a price or class profile from another year is stored, not nulled, with a `figureNotes` caveat (Wharton's 2026 tuition, Northwestern's 2026–27 rate). The card must show the caveat.
- B2: a published range of years (Wharton's "13-14") is stored as its midpoint, with the range in `figureNotes` and the basis in `cohortExperienceBasis`.
- B3: the research-to-record converter (`scripts/draft-records.ts`) is built in this step, as `docs/build-steps.md` says.
- The converter sets `cohortExperienceBasis` to `unspecified` and leaves `figureNotes`, `onsiteNote`, `metro`, `durationMaxMonths`, `tuitionPerCourseUsd`, `courseCount`, `lodgingIncluded` and `attendance` (unless residencies or online) to the overrides file. It turns a lone GSA number into a range by reading the dollar amounts in the GSA quote, and refuses if the quote has none.
- `validate-data` also fails on a `checkedOn` later than today. `fake-` ids pass only through `FixtureDatasetSchema`.
- The overrides file may set only an allow-list of keys (never `id`, `sources`, `ratings` or `verification`), plus `extraSources` to append sources the research kept in its Part 2 tables. A lodging quote that mentions meals or totals is refused unless the overrides give `lodgingPerNightUsd`. A source with no URL converts as `school_correspondence`.

## Structured home location (issue #35)

- `homeCity` was one free-text string, and the engine had to parse spellings like "Cambridge, MA" and "Washington, D.C.". The profile now holds `homeCity` (non-empty), `homeRegion` (string or null) and `homeCountry` (two-letter ISO code, same rule as `country` in the program schema). The model fills them in from the conversation.
- `homeRegion` is null only when the country has no state or province and the user said so. A missing part is asked again, not guessed.
- The partial profile has the same fields, all optional. `declined` may name any of them; a declined country or region is a gap, not an error.
- A declined part is stored as `""` (city, country) or `null` (region), in both `ProfileSchema` and `PartialProfileSchema`. A part named in `declined` must hold exactly that placeholder, and `""` without a `declined` entry is an error. Field rules (trimmed text, ISO code) run first; the declined pairing check runs after them, so a re-ask can need a second round. The engine ignores declined parts. `CountryCode` is shared with the program schema.
- City and region are trimmed, with the same rule as program text fields (`Text` in `core/schema/common.ts`).
- Engine matching (now a distance check, see the next section), the advisor wording and the server's validation and re-ask error land in #22, #25 and step 6.

## Home coordinates and campus coordinates (issue #35, reshaped by docs/ux-two-stage.md)

- Location is compared by distance, not parsed. The profile gains `homeLat` and `homeLon` (degrees, the model's approximate city centre); programs gain `campusLat` and `campusLon`. Ranges are -90 to 90 and -180 to 180, shared as `Latitude` and `Longitude` in `core/schema/common.ts`.
- Declined: `homeLat` and `homeLon` hold `null`, and `null` without a `declined` entry is an error, the same pairing rule as the other home parts (the placeholders are `""` for city and country, `null` for region, latitude and longitude). Declining the city does not force declining the coordinates; the model sets both.
- Campus coordinates are null only for online programs; any in-person or hybrid program must have `campusAddress`, `campusLat` and `campusLon`, like `city`, so the distance check never silently skips a program (validate-data fails otherwise).
- The coordinates are checkable: `campusAddress` is the school's street address with an official-page source whose quote contains it (checked by an explicit rule, ignoring case, line breaks and punctuation; not a fact group, so a missing source gives one error), and `figureNotes` for `campusLat` and `campusLon` say they are derived from it. The research converter leaves them null and the overrides file sets them (`campusAddress`, `campusLat` and `campusLon` joined the allow-list), with the address source in `extraSources`. An online program must have all three null.
- Commuting distance is 80 km by default, in `core/engine/constants.ts` (#22 adds it). `metro` stays in the program schema for now; #22 stops using it. Dropping the field is a later choice.
- The step 4 records on the open PRs need `campusAddress`, `campusLat`, `campusLon`, an official-page `campusAddress` source and `figureNotes` for both coordinates once this merges; the values are in each PR's notes.
- `homeLat` and `homeLon` are declined together: one `null` and one number is an error, so a half pair never reaches the engine.

## Need-based ranking and one 1–5 scale (Oct 9, docs/need-based-ranking.md)

- Approved by Yami for this week: Stage 2 ranks programs by the user's own needs, not by three fixed lenses. Every rating in the product is 1 to 5 ("keep everything consistent").
- Default taken, not yet contested: rank inside the confirmed category, with up to 2 runner-up programs under "Also worth a look", instead of a category bonus.
- Senior peers is computed from `cohortMedianExperienceYears` when published (bands under 5, 5–9, 10–14, 15–19, 20+ → 1 to 5); the prompt's value is used only when the median is null. This replaces the separate peer fit adjustment.
- Ties: location fit, then lower known total cost, then id. Cost value is no longer a rating.
- The rating prompt starts from the category default and records every change as "default X → Y because …", so each override has its evidence.
- Yami confirmed both defaults on Oct 9: the 1 to 5 scale everywhere, and ranking inside the confirmed category.
- Format preference (Oct 9): new `formatPreference`; program format is read from `format` (`hybrid` = blended). Format fit 5 / 3 / 1, no preference 3, weight 2.
- Travel comfort stays (Yami, Oct 9: format and travel are different traits) and scores 1 × travel fit: appeal 5 / burden 1 when the program needs trips for this user, 3 otherwise; fine 3. It leaves location fit. R5 is unchanged.

## Step 5

- The "17 fields" are the intake table's rows, one entry each, plus the airfare question as its own entry (`core/advisor/fields.ts`). Entries that fill two profile fields (tuition and payment, time, on-site, home) are one entry.
- `chips.ts` adds chip sets the plan's table doesn't list but the profile needs: `degreeLevel`, `careerGoalKind`, `needs`, `paymentPlan`, `relocate`, `locationValues` and `currentRole` with an Executive chip (the schema has it). The plan didn't fix the upper bounds for "Over $10k" (stored as 50,000) and "Over $80k" is 250,000 as listed.
- `needs` and `locationValues` are multi-select chip sets (`pick` 3 and 2 in the checklist); a tap sends one value and the page collects them in order.
- Experience under 8 years: the advisor says Step Up is built for 8 or more and offers to continue; it doesn't refuse. (The plan says "gate at 8" without saying what happens.)
- `goalClarity` is "unclear" only after two follow-up questions, as the plan says; it is a model-set field, not a chip.
- Persona expectations name the category, not exact scores (R8). Those for B to F are hand-computed from the matrix and the draft records; the engine wasn't run on them, because PR 3 wasn't merged when this was written. Step 7's run is the check.
- Tool names live in `core/advisor/tools.ts` so the server (step 6) and `advisor.md` share one list.

### Stage 1 of the two-stage flow (docs/ux-two-stage.md)

- The checklist keeps its 17 entries, each tagged `stage: 1 | 2`. Stage 1 is the six entries that decide the category or that the user asked for there: goal, the gap (needs), classmates, time (length and hours), keep working, degree requirement.
- Background (years of experience, degree, role, years leading) is in neither stage list of the request. Default: it moves to stage 2, asked only if the user hasn't said it, and isn't asked in stage 1. The fewer-than-8-years note applies when the user says so.
- `propose_direction` takes `DirectionSchema`: the engine's stage 1 fields plus `peerPreference` (shown on the card, used by stage 2 scoring) and `resolvedTensions`. The server drops those two before `recommendCategory`. Each field reuses its `ProfileSchema` rule; `declined` may name only stage 1 fields.
- `ask_choice` accepts only the stage 1 chip sets. `search_programs` leaves the stage 1 tools: stage 1 names no programs. It can come back with stage 2.
- `propose_search` is a stub (no input schema) and is never sent to the model until stage 2 is wired. If the user says yes to "Want to see programs that fit?", the advisor says programs come next.
- Stage 1 doesn't state typical costs for the category: `DirectionResult` carries no price ranges, and facts come from tool results only. The verdict describes the step in words, without figures.
- Persona verdicts are hand-computed on the 1 to 5 table from PR #22. Two expectations changed: C's stage 1 verdict is now an executive program (the budget no longer rules it out; stage 2 shows it out of reach and points to the certificate), and C raises R4 (deep expertise with under 5 hours), which the old file missed. E's R1 tension moves to stage 2, because on-site days are a stage 2 answer.
- Review round 1: a declined stage 1 field holds `null` in `propose_direction`, paired with `declined` like the home fields; `toEngineDirection` fills the placeholders the engine requires and ignores (`DECLINED_PLACEHOLDERS`), so the model never invents an answer and the chip-tap check exempts declined fields.
- Review round 1: the page sends chip labels only; the server resolves values through `CHIPS[field]` and returns the rewritten tool result in `replaceLastUserMessage`, which replaces the page's last message (one tool result per `tool_use_id`). Model calls set `disable_parallel_tool_use`, and a turn with several tool calls is answered with `is_error` and retried. This replaces "a tap sends one value" above.
- Review round 2: a failed model call returns `replaceLastUserMessage: null` and no messages, so the page's last message stays in its raw form and a retry posts the same history; a rewritten result is refused as the last message. Declining `needs` is not neutral (the engine then says "not yet", `goal_unclear`, on #22): the advisor warns and offers the chips again first, and the "not yet" explanation names the missing gap.
- `formatPreference` is in the stage 2 section of `advisor.md` as pending: the profile field comes with #65, and its chip set, checklist entry and persona answers go with it.
- `docs/chat-api.md` returns separate `chips`, `confirm` and `direction` fields instead of build-steps' single `ui` union, so a turn can carry the assistant's text and the verdict together.
