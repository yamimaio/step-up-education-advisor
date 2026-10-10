---
name: rate-program
description: Rate a Step Up program on the five needs (1 to 5) from its saved research, or review a Perplexity rating answer, using the rating prompt and Yami's rulings. Use when rating or re-rating a program, reviewing a docs/research/<id>-rating.md file, or when Yami corrects a rating.
---

# Rate a program

**Version 2 (Oct 9, 2026).** Bump the version whenever `rating-prompt.md` or `rulings.md` changes, and add a line to the changelog at the end.

Files in this skill:

- `rating-prompt.md`: the rubric, evidence rules and output format. It is the only copy, also pasted into Perplexity.
- `rulings.md`: Yami's decisions from past reviews, each with its facts and when it applies again.

## Rules

- Start from the facts in `docs/research/<id>.md` and `docs/research/<id>-overrides.json`. When a rating turns on a fact the research lacks or got wrong, verify it on the school's own pages or documents (a web search is fine for finding them) and add it to the overrides file: the value, plus an `extraSources` entry with the URL, the verbatim quote and `checkedOn`. `docs/decisions.md` lists the facts the overrides file may set. Never use what you know about the program without such a source. Yami's first-hand knowledge enters only through a ruling.
- Every card note (`ratingNotes`) states facts from the research. Judgments go in `reasoning` (R8).
- Never change the research file or edit `core/data/programs.json` by hand. The overrides file changes only to add a verified fact as above. The converter (`draft-records --force docs/research/<id>`) reads the ratings from the rating file and the facts from the overrides.

## Steps

1. Read `rating-prompt.md` and `rulings.md` in full.
2. Read `docs/research/<id>.md` and `docs/research/<id>-overrides.json`, and take the category from the research's Part 1 JSON.
3. Rate each need as the prompt says: start from the category default and apply the rubric and the evidence rules. When a ruling matches the case, follow it and cite it ("per R4"). When no ruling fits and the call is close, say so in the report instead of picking quietly.
4. If `docs/research/<id>-rating.md` already holds a Perplexity answer, compare need by need, and list each difference with its reason.
5. Write the result at the end of `docs/research/<id>-rating.md`, replacing an earlier block from this skill and leaving Perplexity's answer as provenance. If the file doesn't exist, create it with only this block:

   ````markdown
   ## Reviewed ratings (rate-program v1, YYYY-MM-DD; reviewed by: pending)

   One line on what was reviewed, under which skill version.

   ```json
   {
     "ratings": { ... },
     "ratingNotes": { ... },
     "reasoning": { ... },
     "lowEvidence": [ ... ]
   }
   ```

   Changes from Perplexity's answer:

   - need old → new: why, citing the ruling or rubric level.
   ````

6. Check before reporting:
   - The JSON parses, and it is the last `"ratings": {` object in the file. The converter (`parseRatings` in `scripts/lib/research.ts`) reads only that one.
   - Every note is 20 words or fewer, with no URLs, footnotes or rubric words.
   - Every fact in a note appears in the research.
7. Report to Yami: a table of the five ratings, the differences from Perplexity, and the close calls.

## When Yami reviews

- **Approves:** change "reviewed by: pending" to "reviewed by: Yami".
- **Corrects a rating:**
  1. Apply the correction.
  2. Add a ruling to `rulings.md` with the next number, in the same shape as the others.
  3. If the ruling generalizes, also change `rating-prompt.md`.
  4. Bump the version and add a changelog line.
  5. List the programs already rated that the new ruling could change, and ask before re-rating them.

Prompt and skill changes go in their own issue and PR, separate from the step 4 record PRs.

## Changelog

- v1 (Oct 9, 2026): first version. The rating prompt moved here from `docs/perplexity-program-prompts.md`, with the rules from issue #87. Rulings R1 to R8 come from Yami's review of MIT TLP, Wharton EMBA SF, Northwestern MEM and Harvard Extension.
- v2 (Oct 9, 2026): R9 and the senior_network rubric line: a published experience breakdown gives the median, which beats a stated average (Yami, MIT TLP review). Facts the research lacks may now be verified on official pages and added to the overrides file with a source (Yami: re-rate every program ourselves, verifying where needed).
