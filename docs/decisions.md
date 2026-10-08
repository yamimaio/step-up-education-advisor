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

## Step 5

- The "17 fields" are the intake table's rows, one entry each, plus the airfare question as its own entry (`core/advisor/fields.ts`). Entries that fill two profile fields (tuition and payment, time, on-site, home) are one entry.
- `chips.ts` adds chip sets the plan's table doesn't list but the profile needs: `degreeLevel`, `careerGoalKind`, `needs`, `paymentPlan`, `relocate`, `locationValues` and `currentRole` with an Executive chip (the schema has it). The plan didn't fix the upper bounds for "Over $10k" (stored as 50,000) and "Over $80k" is 250,000 as listed.
- `needs` and `locationValues` are multi-select chip sets (`pick` 3 and 2 in the checklist); a tap sends one value and the page collects them in order.
- Experience under 8 years: the advisor says Step Up is built for 8 or more and offers to continue; it doesn't refuse. (The plan says "gate at 8" without saying what happens.)
- `goalClarity` is "unclear" only after two follow-up questions, as the plan says; it is a model-set field, not a chip.
- Persona expectations name the category, not exact scores (R8). Those for B to F are hand-computed from the matrix and the draft records; the engine wasn't run on them, because PR 3 wasn't merged when this was written. Step 7's run is the check.
- Tool names live in `core/advisor/tools.ts` so the server (step 6) and `advisor.md` share one list.
