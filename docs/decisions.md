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

## Step 3

Defaults chosen where `docs/step-3-engine-plan.md` and the approved docs were silent, or where a build detail needed a call. ★ marks the ones that change results.

- ★ The plan's "no type fits" example (the only real need is a new city) doesn't fire the trigger: a full-time MBA scores 6 on that need alone. The threshold stays 4. Test 6a fires it through rule-outs (a required degree with 3 months at most).
- ★ Programs of a type that is "out" are left out of the shortlists, but keep their evaluations.
- ★ The length check uses `durationMonths`, falling back to `durationMaxMonths`, then to the unknown-value rule.
- ★ Per-course tuition never decides the tuition check; "about $X at N courses" goes in the check's note.
- ★ Nights per trip are on-site days ÷ residencies (D8), which slightly overestimates (5 days = 5 nights).
- Trips = `residencyCount` × `ceil(durationMonths / 12)`. Recurring weekends with no counts: 26 trips a year, 2 nights each, labelled as an estimate. Missing counts or lodging make the estimate `unknown`.
- Hours: the program's `min` is compared with the user's `max`; a program needing fewer hours passes.
- Unknown-value rule: `maxOnsiteDays`, `maxStretchDays`, `maxProgramMonths` and `hoursPerWeek` are always set, so an unpublished figure is always a near miss. Many real programs will near-miss only for that reason.
- Declined fields (see round 1 for the rest): limits become "no limit"; `peerPreference` → `doesnt_matter`; `travelComfort` → `fine`; `airfareRange` → `unknown`; `degreeRequired` → no adjustment; `homeCity` → no metro match. `profileGaps` lists the declined fields plus `airfareRange: unknown`.
- No-program precedence: `goal_unclear`, then `nothing_passes`, then `no_type_fits`. An empty dataset is `nothing_passes`. Shortlists are still built.
- When every type is out, `winner` and `runnerUp` are `null`. A tie exists only between the top two non-out scores (a three-way tie takes the first two in matrix order); `tieBreaker` wins only if it is one of the pair. While a tie is unresolved no program gets the +0.5 category bonus.
- `decidingNeeds`: the two needs with the largest `weight × (winner rating − runner-up rating)`, ties by need rank.
- Confidence (data gaps only, your decision): four conditions (verified within 60 days, tuition from an official page, on-site time from an official page, no unknown-value check). All four → high, one missing → medium, two or more → low; a draft is capped at low. Any official source whose field is one of `onsiteDaysPerYear`, `residencyCount`, `longestStretchDays`, `onsiteNote`, `attendance` or `format` counts as on-site evidence.
- Contradictions: `checkContradictions(partial, programs)` takes the programs for R2. R2 counts only degree-granting types with a known tuition at or under the budget; a null budget never fires. A rule with a missing field never fires. Ids are `R1` to `R6`; a rule already in `resolvedTensions` is returned with `resolved: true`.
- Location: evening or daily attendance outside the home metro fails unless the user would relocate (the same exception as full-time in-person).
- Location fit starts at 3, so with the D9 adjustments the lowest reachable score is 2; the clamp at 1 is kept but can't trigger.
- Metro table (see round 1 for ambiguous names): Boston/Cambridge, SF Bay Area, New York, Chicago/Evanston, Washington DC, Philadelphia, New Haven, Los Angeles, plus exact city names.
- Shortlists hold program ids; the card labels near misses from the program's `status`.

### Round 1 review fixes (PR #22)
- Unknown value against a limit of 0 (DQ10): fails (still marked "not published"). Against a limit above 0 it stays a near miss.
- Declined fields, all of them neutral: `keepWorking` → no work constraint; `relocate` → null, which rules nothing out and adds "may require relocating"; `yearsExperience` → no peer-fit points and no "you have N". Unknown names in `declined` are ignored and repeats collapse. `checkContradictions` drops declined fields before running R1 to R6.
- Home city is free text. Only the part before the first comma is matched ("Boston, MA"). Names shared by several cities (Cambridge, Arlington, Washington, San Jose) don't match a metro bare; "Cambridge, MA", "Arlington, VA", "San Jose, CA" and "Washington, DC" do. A program's own bare city is trusted. A program `metro` the table doesn't know falls back to its city.
- Travel budget with airfare unknown: the total is lodging only, so a pass becomes an unknown near miss ("Airfare unknown"); a fail stays a fail; a budget of 0 fails.
- Travel notes name the missing figure (on-site days, trips, or both). A published `residencyCount` on a weekend program is used even when on-site days are null (nights per trip estimated at 2, labelled). The 26-a-year guess is for weekends with no count.
- A user who would relocate to a program that needs them local has no recurring travel (`kind: none`, "You'd relocate").
- Money is rounded to cents and comparisons to six decimals, so exactly 15% over is a near miss and float noise never decides a status.
- R4 fires at `max <= 5`, because the lowest hours chip stores `{0, 5}`.
- An unresolved tie has `winner`, `runnerUp` and `decidingNeeds` empty.
- A type ruled out by its programs says which checks did it ("program length"). The runner-up is still chosen among types that aren't out, so section 9's "EMBA ruled out on length" is the reason shown for EMBA, not its `runnerUp`.
- Confidence reasons use plain check names. A missing price still counts twice (unpublished and unknown), as in default 16.
- `nothing_passes` needs no passing program at all; passing programs that all belong to ruled-out types give `no_type_fits`.
- The category bonus still goes to the winner while a "not yet" result shows (only an unresolved tie or no winner removes it).
- Scenario scores are rounded to 9 places and ties break by id code unit.
