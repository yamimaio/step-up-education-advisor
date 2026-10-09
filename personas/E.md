# Persona E: The contradiction ("network first, no time on campus")

## Who they are

Twelve years in, six leading, a manager in Denver who wants to be a VP of engineering. They rank the senior network first and then say they can spend no days on site and cannot travel at all.

## True answers

Chip answers are quoted exactly as the chip label. Free text is outside the backticks. Stage 1 comes first, in the order the advisor asks it. The `home` row gives the city in words, then the region, country code and approximate coordinates the advisor fills in.

### Stage 1

| Entry          | Answer                                                              |
| -------------- | ------------------------------------------------------------------- |
| careerGoal     | `Step up to a bigger leadership role`; "Become a VP of engineering" |
| needs          | `A senior network`, `Leadership skills`, `A graduate degree`        |
| peerPreference | `More senior leaders`                                               |
| time           | `Up to a year`; `5 to 10`                                           |
| keepWorking    | `Yes, I keep working`                                               |
| degreeRequired | `Preferred`                                                         |

### Stage 2 (not wired yet)

| Entry           | Answer                                                |
| --------------- | ----------------------------------------------------- |
| tuition         | `$40k to $80k`; `Savings`                             |
| travelBudget    | `$2k to $5k`                                          |
| travelComfort   | `Fine`                                                |
| onsite          | `None`; `Can't travel`                                |
| home            | Denver; CO; US; 39.7392, -104.9903; `No, I would not` |
| airfare         | `Under $500`                                          |
| locationValues  | `Network density`                                     |
| yearsExperience | 12                                                    |
| degree          | `Master's`; Engineering                               |
| currentRole     | `Manager`                                             |
| yearsLeading    | 6                                                     |

## In their voice

- What is missing: "The network, no question. I want to know who is running engineering at the big companies."
- On time on site: "I can't take days off for this. None. And I can't be away from home."

## Expected verdict

Hand-computed on the 1 to 5 category table and the category rules on #22 (`docs/need-based-ranking.md`), not an engine run; step 7's run is the check.

### Stage 1

- `goalClarity`: clear
- Category: executive MBA, 28 (15 + 10 + 5, minus 2 for a preferred degree), with the executive program the runner-up at 26 (15 + 10 + 1). The only EMBA record publishes no duration, so its length check is a near miss, not a fail, and the EMBA is not ruled out on a one-year limit. If a record with a published length over 12 months ever makes every EMBA fail, the executive program wins instead; that belongs in the records, not here.
- Tension to raise: none yet. R1 reads on-site days, which stage 1 doesn't ask.
- Ends with "Want to see programs that fit?"

### Stage 2 (not wired yet)

- Once the on-site answers are in, and before `propose_search`, the advisor raises R1: the senior network is ranked first but the person allows fewer than 10 on-site days a year, and networks are mostly built in person. It names both sides and lets the user choose.
- What follows depends on the choice. If they raise their on-site limit, expect the EMBA record, as a near miss on its unpublished figures. If they keep it at zero, the verdict stays an executive MBA, the card says none is within their limits (the only record is in person) and points to an alternative category, and the advisor says the network will be thinner than they want.

## What a sharp advisor should notice

- The tension is the whole point: do not bury it in the verdict, raise it as soon as the on-site answers are in, before `propose_search`.
- The user decides which side wins. The choice is recorded in `resolvedTensions` and mentioned in the final explanation.
- Do not lecture; one clear sentence naming both sides and the cost of each.
