# Step Up: programs ranked by the user's needs (approved by Yami, Oct 9)

Stage 2 used to show three fixed shortlists: best for network, best for depth and best for practicality. Those are the engine's words, not the user's. Someone who said "senior peers matter most" has no reason to care which program is "best for practicality". Stage 2 now shows **one list ranked by the same three needs the user ranked in Stage 1**, and each card says why in those words.

This file wins over older text in `docs/implementation-plan.md` §4 and `docs/step-3-engine-plan.md` where they differ (section 12 points here).

## 1. One scale: every rating is 1 to 5

Yami's rule: every rating in the product uses 1 to 5, integers.

**Stage 1 category table.** `TYPE_RATINGS` moves from 0–2 to 1–5 with the linear map 0→1, 1→3, 2→5 (new = 2 × old + 1). With weights 3, 2 and 1 (sum 6), every category score becomes 2 × old + 6, so the order never changes. The constants tied to the old scale double with it:

| Constant | Old | New |
|---|---|---|
| `NO_PROGRAM_THRESHOLD` (best category score below it means "no type fits") | 4 | 14 |
| `DEGREE_ADJUST` no / unsure / preferred | −3 / −2 / −1 | −6 / −4 / −2 |
| `GROW_IN_ROLE_BONUS` | +2 | +4 |

Worked example (needs: senior network, leadership skills, deep expertise; no degree; at most about a year): executive 28 (was 11), certificate 12 (was 3), short course 12 (was 3), specialized master's 8 (14 − 6, was 1), EMBA and full-time MBA out on length. Same verdict, same order. The test asserts the new numbers.

Category table after the map (before any change Yami makes in the #22 review):

| | leadership | deep expertise | degree | senior peers | career change |
|---|---|---|---|---|---|
| mba | 5 | 3 | 5 | 1 | 5 |
| emba | 5 | 3 | 5 | 5 | 3 |
| specialized_masters | 3 | 5 | 5 | 1 | 3 |
| executive | 5 | 3 | 1 | 5 | 3 |
| certificate | 3 | 3 | 3 | 1 | 1 |
| short_course | 3 | 3 | 1 | 1 | 1 |

(Needs keep their code names: `leadership_skills`, `deep_expertise`, `graduate_degree`, `senior_network`, `new_industry_or_city`. The rename to career change stays in #52.)

## 2. Program ratings: the same five needs, 1 to 5

Each program record carries `ratings` keyed by the five needs, integers 1 to 5, with `ratingNotes` keyed the same way and `ratingLowEvidence` listing needs rated on thin evidence. The old `network`, `depth`, `practicality` and `costValue` ratings are removed.

- **Where the numbers come from:** the Perplexity rating prompt (Prompt 2 in `docs/perplexity-program-prompts.md`). It starts from the program's category default (the table above) and moves a rating only on quoted evidence, saying so in its `reasoning` ("default 3 → 5 because …"). This is the "program facts override the category" step. For senior peers and career change, a 4 or 5 needs facts that meet that level, and with no facts at all the rating is the default or 3, whichever is lower (Yami's review, issue #87). `ratingNotes` are the short, card-ready lines (at most 20 words, no URLs); the `reasoning` stays in the rating file.
- **Senior peers is derived from facts when it can be.** When `cohortMedianExperienceYears` is published, the engine computes the rating from it and ignores the prompt's value: under 5 years → 1, 5–9 → 2, 10–14 → 3, 15–19 → 4, 20 or more → 5. The card says "cohort median N years". When it is null, the record's value is used and confidence drops.
- **When the median is null**, the prompt uses the latest published class profile (an average counts; say which class), or a published target audience when admission is by application (Yami's review, issue #87: MIT TLP's C-level target is enforced by admission).
- **Degree follows a factual rubric** in the prompt: 5 awards a graduate degree; 4 all its credits officially count toward a named graduate degree (quoted); 3 some of its credits do (quoted); 2 academic credit or CEUs with no stated path; 1 no credit.

## 3. Program score and order

- **Score** = 3 × rating on the user's top need + 2 × second + 1 × third, using the program's own ratings, **+ 2 × format fit + 1 × travel fit** (section 3a). Range 9 to 45. The needs part is the same formula as Stage 1, so the explanation reads the same.
- **Who is listed:** programs that pass or are near misses, in a category that isn't ruled out. Budget, hours, travel and distance stay filters with near misses, unchanged.
- **Order:** the confirmed category's programs first (passing before near misses, then by score). Then up to 2 passing programs of the runner-up category under "Also worth a look". No category bonus to tune.
  - **Refined Oct 10 (#247):** a near miss whose only non-passing checks are values the school doesn't publish ranks with the passes, by score. Only a near miss with a published value over a limit goes after the passes. "Also worth a look" uses the same order. Scores, statuses and the card don't change: such a program still shows "Near miss: not published". See `docs/decisions.md`.
- **Ties:** higher location fit, then lower known total cost (tuition + travel estimate; unknown last), then id.
- **Why line on each card:** the two needs that contributed most, with their notes, for example "Ranked first for senior peers (cohort median 18 years) and leadership skills."

## 3a. Format preference (added Oct 9, Yami)

Yami's own case: among executive programs there were options in Buenos Aires, but they preferred blended with travel over fully on site or fully remote. That preference belongs in program scoring, never in the category verdict.

- **Stage 2 question:** "How would you like to study? Online, blended (a few trips a year), in person, or no preference." New profile field `formatPreference`: `online | blended | in_person | no_preference`.
- **Program format** comes from the existing `format` field, so no new research: `online` → online, `hybrid` → blended, `in_person` → in person.
- **Format fit, 1 to 5:** exact match 5; a neighbouring format 3 (blended neighbours both online and in person); the opposite format 1 (online vs in person); `no_preference` 3 for every program. Weight 2, so it can lift a blended program above an otherwise equal one without beating a much better fit on needs.
- **Card line:** "Blended, as you prefer." (or "In person; you prefer online" when it doesn't match).
- **Travel fit, 1 to 5, kept separate (Yami: format and travel are different traits).** Someone can have no format preference but love travel, or want on-site study but find travel a burden. `travelComfort` (appeal / fine / burden) stays, with its question and contradiction R5 unchanged. It now scores by whether the program needs trips for this user (on site and beyond commuting distance, so not online and not local): appeal → 5 if it needs trips, 3 if not; burden → 1 if it needs trips, 3 if not; fine → 3 for every program. Weight 1.
- **Card lines:** "Three trips a year, which you said you enjoy" / "Needs travel, which you said is a burden".
- **No double counting:** `travelComfort` leaves location fit (the +0.5 / −1 terms are removed), so location fit only carries `locationValues`, as a tie-breaker. The hard limits (on-site days, longest stretch, relocate, distance) stay as they are.

## 4. What goes away

- The three lenses: `SCENARIO_WEIGHTS`, the `network` / `depth` / `practicality` lists and `CATEGORY_BONUS`.
- Peer fit as a separate score adjustment (`PEER_FIT`): seniority is now the senior peers rating, so it doesn't count twice. The card still shows the cohort median.
- Location fit (now only `locationValues`) and cost only break ties. `travelComfort` moves from location fit to its own travel fit term (section 3a).

## 5. Order of work

1. **#22 (engine):** the distance check, plus the 1–5 rescale of the Stage 1 table and its three constants. Merge.
2. **Need-based ranking (its own issue and PR):** schema (`ratings` keyed by need), converter, fixtures, `scenarios.ts` replaced by the ranking above, peer fit and lenses removed, tests. Reviewed on Opus.
3. **Ratings:** Yami re-runs the new Prompt 2 on the 4 researched programs (no new research) and uses it for the other 8. The step 4 record PRs pick up the new rating files.
4. Then #25 (advisor), step 6 (server) and step 7 (page, one ranked list instead of three).
