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

- **Where the numbers come from:** the Perplexity rating prompt (Prompt 2 in `docs/perplexity-program-prompts.md`). It starts from the program's category default (the table above) and moves a rating only on quoted evidence, saying so in the note ("category default 3 → 5 because …"). This is the "program facts override the category" step.
- **Senior peers is derived from facts when it can be.** When `cohortMedianExperienceYears` is published, the engine computes the rating from it and ignores the prompt's value: under 5 years → 1, 5–9 → 2, 10–14 → 3, 15–19 → 4, 20 or more → 5. The card says "cohort median N years". When it is null, the record's value is used and confidence drops.
- **Degree follows a factual rubric** in the prompt: 5 awards a graduate degree; 3 its credits officially count toward a graduate degree (quoted); 2 academic credit or CEUs with no stated path; 1 no credit.

## 3. Program score and order

- **Score** = 3 × rating on the user's top need + 2 × second + 1 × third, using the program's own ratings. Range 6 to 30. Same formula as Stage 1, so the explanation reads the same.
- **Who is listed:** programs that pass or are near misses, in a category that isn't ruled out. Budget, hours, travel and distance stay filters with near misses, unchanged.
- **Order:** the confirmed category's programs first (passing before near misses, then by score). Then up to 2 passing programs of the runner-up category under "Also worth a look". No category bonus to tune.
- **Ties:** higher location fit, then lower known total cost (tuition + travel estimate; unknown last), then id.
- **Why line on each card:** the two needs that contributed most, with their notes, for example "Ranked first for senior peers (cohort median 18 years) and leadership skills."

## 4. What goes away

- The three lenses: `SCENARIO_WEIGHTS`, the `network` / `depth` / `practicality` lists and `CATEGORY_BONUS`.
- Peer fit as a separate score adjustment (`PEER_FIT`): seniority is now the senior peers rating, so it doesn't count twice. The card still shows the cohort median.
- Location fit and cost only break ties.

## 5. Order of work

1. **#22 (engine):** the distance check, plus the 1–5 rescale of the Stage 1 table and its three constants. Merge.
2. **Need-based ranking (its own issue and PR):** schema (`ratings` keyed by need), converter, fixtures, `scenarios.ts` replaced by the ranking above, peer fit and lenses removed, tests. Reviewed on Opus.
3. **Ratings:** Yami re-runs the new Prompt 2 on the 4 researched programs (no new research) and uses it for the other 8. The step 4 record PRs pick up the new rating files.
4. Then #25 (advisor), step 6 (server) and step 7 (page, one ranked list instead of three).
