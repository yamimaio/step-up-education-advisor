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
- The partial profile has the same three fields, all optional. `declined` may name any of them; a declined country or region is a gap, not an error.
- A declined part is stored as `""` (city, country) or `null` (region), in both `ProfileSchema` and `PartialProfileSchema`. A part named in `declined` must hold exactly that placeholder, and `""` without a `declined` entry is an error. Field rules (trimmed text, ISO code) run first; the declined pairing check runs after them, so a re-ask can need a second round. The engine ignores declined parts. `CountryCode` is shared with the program schema.
- City and region are trimmed, with the same rule as program text fields (`Text` in `core/schema/common.ts`).
- Engine matching (now a distance check, see the next section), the advisor wording and the server's validation and re-ask error land in #22, #25 and step 6.

## Home coordinates and campus coordinates (issue #35, reshaped by docs/ux-two-stage.md)

- Location is compared by distance, not parsed. The profile gains `homeLat` and `homeLon` (degrees, the model's approximate city centre); programs gain `campusLat` and `campusLon`. Ranges are -90 to 90 and -180 to 180, shared as `Latitude` and `Longitude` in `core/schema/common.ts`.
- Declined: `homeLat` and `homeLon` hold `null`, and `null` without a `declined` entry is an error, the same pairing rule as the other home parts. Declining the city does not force declining the coordinates; the model sets both.
- Campus coordinates are null only for online programs; any in-person or hybrid program must have `campusAddress`, `campusLat` and `campusLon`, like `city`, so the distance check never silently skips a program (validate-data fails otherwise).
- The coordinates are checkable: `campusAddress` is the school's street address with an official-page source whose quote contains it (fact group "campus location"), and `figureNotes` for `campusLat` and `campusLon` say they are derived from it. The research converter leaves them null and the overrides file sets them (`campusLat` and `campusLon` joined the allow-list).
- Commuting distance is 80 km by default, in `core/engine/constants.ts` (#22 adds it). `metro` stays in the program schema for now; #22 stops using it. Dropping the field is a later choice.
- The step 4 records on the open PRs need `campusLat` and `campusLon` once this merges; their values are in each PR's notes.
