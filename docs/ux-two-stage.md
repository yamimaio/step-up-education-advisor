# Step Up: two-stage advisor flow (approved by Yami, Oct 8)

Written in answer to Yami's question in the project chat (Oct 8, 23:16 UTC): should the advisor settle what kind of program fits first, and only ask about city, budget and so on when the user wants concrete programs?

## Short answer

Yes. The instinct is right, and it exposes a real mistake. The approved plan already said "category first, then programs", but the build turned that into **one long interview of 17 fields, one confirm card and one `evaluate` call**. So the user answers questions about city and budget before getting any value, and the engine has to handle every messy address before anyone has seen a single recommendation.

## What the build shows (evidence)

- Nothing has merged since the schemas (PR #13). The engine (PR #22) has been through 4+ review rounds, and most of the recent work is about **parsing where the user lives**:
  - #35: structured home location, blocking #22
  - #37: "Washington" spelled out as a state disables the check
  - #38: a ZIP with no comma breaks the state split
  - #36: chips and stored country lists, pushed to after the challenge
  - #34: location fit rebalance
- The engine has `places.ts`, `metro.ts`, `normalize.ts` and a `METRO_STATES` table, all to answer one question: does this person live near this program?
- Day 3 of 5, and there has been **no real AI conversation yet**. Every UX decision so far was made through unit tests. That is why edge cases dominate: tests reward covering inputs, not finding out what a user needs.

## Why the city problem is a symptom

The engine is treating a fuzzy human answer ("I'm in Cambridge") as precise data, in a part of the flow where it rarely matters. Per the plan's own rule (implementation plan §4), home city only matters for **full-time in-person programs** (live there or relocate) and for picking the airfare question. For everything else, the travel answers decide. Yet the whole conversation, and the engine, pay its cost.

## Your own story says the same thing

In March the category was decided by the career goal, classmates' seniority and length (you would not do two years). Logistics such as flights and housing came last, once you were comparing a short list (memory: yami-founder-story). The magic moment in the plan (reflect the real need, name the tension, give a verdict) needs **none** of: city, budget or payment.

## The experience I'd build

**Stage 1: "What kind of step fits me?"** (the magic moment)
- Asks: the goal, the gap, who you want as classmates, how long you'd commit, hours a week, whether you must keep working, and whether you need a degree.
- These are the only constraints that remove a whole category: length, keep working and degree.
- Gives: a category verdict, why the others lost, the one tension, or an honest "not yet". It closes with what that category typically costs and looks like, from the dataset's ranges.
- Ends with: "Want to see programs that fit?"

**Stage 2: "Show me programs"** (opt-in)
- Only now asks the practical questions: budget, travel (how often, how long away, airfare range, comfort) and payment.
- **Location, asked naturally, never parsed by the engine** (revised after Yami's comment, Oct 8): the advisor asks where you live and whether you're willing to travel, in plain conversation. The model turns the answer into structured fields (`homeCity`, `homeCountry` as an ISO code, and approximate `homeLat`/`homeLon` for the city). Each program record carries its campus coordinates. The engine only compares distances: a weekly in-person program passes if it is within commuting distance (default 80 km) or the user would relocate; everything else is judged by the travel answers, so the best options show up wherever they are. This scales to any country and any number of programs, with no city lists, metro tables or spelling rules.
- Gives: the three shortlists, with near misses. If the budget rules out the whole recommended category, the card says so and points to the runner-up category, rather than quietly changing the verdict.

## Why this is better (and what it costs)

Better:
- Value arrives after about 6 to 8 questions, not 17.
- "Not yet" lands without ever asking about money.
- Each logistics question has an obvious reason when it's asked.
- Stage 1 alone is a complete, demoable product if time runs out. That makes it the cut line.

Costs:
- Two confirm cards instead of one, and the profile splits in two.
- The engine already separates Steps 1 and 2 (category, no-program) from Steps 3 and 4 (constraints, scenarios), so the split is mostly in the server loop and the advisor rules, not the maths.
  - **Correction (Oct 9, PR #22):** it didn't. One `evaluate` call ran everything, and category fit ruled a type out using all eight checks, so a budget or a location could silently change the verdict. The engine now has one function per stage: `recommendCategory` (stage 1, whose input type has no budget, travel or location) and `evaluatePrograms` (stage 2, which takes the confirmed category as an input). See implementation plan sections 4 and 12.

Risk to watch: a few people do need logistics up front ("I can't travel at all", "I have $5k"). The advisor should take those whenever they come up and keep them for stage 2. It should not refuse them.

## What I'd change in the repo (smallest path)

1. **Reshape #35 and PR #39; close #37 and #38 (spelling bugs that disappear).** Keep the structured home fields from #35 and add `homeLat`/`homeLon` (filled by the model) plus campus coordinates on each program. Delete `places.ts`, `metro.ts` and `METRO_STATES` (`normalize.ts` stays for `applyDeclinedDefaults`); `sameMetro` becomes a distance check. This is less code, not more.
2. Merge #22 with that change, and stop polishing the engine. Remaining Low findings become issues.
3. Server and advisor (#25, step 6): two tool pauses, `propose_direction` (then the category verdict) and `propose_search` (then the shortlists).
4. Next priority, above everything else: **one real conversation with persona A**, stage 1 only if needed. Day 3's checkpoint is someone using it without instructions, and only a real conversation tells us whether the UX works.
