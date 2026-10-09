# Persona A: Yami in March ("the step up")

## Who they are

Sixteen years in engineering, twelve of them leading teams, living in Buenos Aires. A manager who wants an executive role and learned that senior classmates matter more to them than another degree. Open to blended programs and happy to travel for them. This is the persona the whole test pipeline runs first, and the true answers below are fixed: the profile built from them must equal `personaAProfile` in `tests/fixtures/profiles.ts`.

## True answers

Chip answers are quoted exactly as the chip label. Free text is outside the backticks. Stage 1 comes first, in the order the advisor asks it. The `home` row gives the city in words, then the region, country code and approximate coordinates the advisor fills in.

### Stage 1

| Entry          | Answer                                                               |
| -------------- | -------------------------------------------------------------------- |
| careerGoal     | `Step up to a bigger leadership role`; "Move into an executive role" |
| needs          | `A senior network`, `Leadership skills`, `Deep expertise in a field` |
| peerPreference | `More senior leaders`                                                |
| time           | `Up to a year`; `5 to 10`                                            |
| keepWorking    | `Yes, I keep working`                                                |
| degreeRequired | `Not needed`                                                         |

### Stage 2 (not wired yet)

| Entry            | Answer                                                     |
| ---------------- | ---------------------------------------------------------- |
| tuition          | `$40k to $80k`; `Installments`                             |
| travelBudget     | `$5k to $10k`                                              |
| travelComfort    | `Part of the appeal`                                       |
| formatPreference | `Blended`                                                  |
| onsite           | `Up to 20`; `About a week`                                 |
| home             | Buenos Aires; C; AR; -34.6037, -58.3816; `No, I would not` |
| airfare          | `$1,000 to $1,500`                                         |
| locationValues   | `Immersion`, `Network density`                             |
| yearsExperience  | 16                                                         |
| degree           | `Bachelor's`; Engineering                                  |
| currentRole      | `Manager`                                                  |
| yearsLeading     | 12                                                         |

## In their voice

- Goal: "I've led teams for twelve years. The next job is running a whole function, and the people who hold those jobs have a different kind of network than I do."
- Why not a degree: "I have a degree. I don't need another one. I need to sit in a room with people who already do this."
- On time: "A year at most, and I can't stop working. Blended is fine, I like going places."
- If asked what they are really after: "Honestly I think I'm after the room, not the curriculum."

## Expected verdict

Hand-computed on the 1 to 5 category table (`docs/need-based-ranking.md`), not an engine run; step 7's run is the check.

### Stage 1

- `goalClarity`: clear
- Category: executive program, 28 (15 + 10 + 3). The EMBA, which would also give senior classmates, scores 22 after −6 for the degree answer and is out anyway: it takes two years against a one-year limit.
- Tension to raise: none. R4 is the only rule stage 1 answers can fire, and 5 to 10 hours doesn't fire it.
- Ends with "Want to see programs that fit?"

### Stage 2 (not wired yet)

- With the current draft data, the MIT TLP record is the likely first program, shown as a near miss because the school publishes no on-site day counts or weekly hours. Expect low confidence on it.
- Tension to raise: none. The contradiction rules stay quiet on the fixed answers.

## What a sharp advisor should notice

- The real need is the network, not the knowledge. The words "the room, not the curriculum" are the reflection beat.
- Twelve years leading means a full-time MBA cohort (about five years of experience) would be the wrong room. The senior peers line on the card (cohort median) should say so with their numbers.
- Do not offer a degree as the headline: they said it is not needed.
- Airfare and lodging from Buenos Aires are real money; the travel estimate should appear apart from tuition, as an estimate.
