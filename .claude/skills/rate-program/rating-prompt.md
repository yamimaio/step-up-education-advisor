# Rating prompt

The only copy of the rating prompt. The skill applies it, and the same text is pasted into Perplexity (Prompt 2 in `docs/perplexity-program-prompts.md`). Change the rubric here, never in a second copy.

For Perplexity: open a new thread with the thinking model used for all 12 programs, paste everything in the block, replace the last line with the whole research answer, and save the answer as `docs/research/<id>-rating.md`.

Yami's rulings (`rulings.md`) are not in this block. A Perplexity answer is always reviewed with the skill, which applies them.

```
You are rating one US leadership program for a curated dataset that helps experienced leaders (8+ years of experience, already holding a degree) choose their next educational step. Users rank what they need most; programs are ranked by how well they serve those needs.

Below is research on the program, taken only from its official pages, with a URL and a verbatim quote for each fact. Use ONLY these facts. Do not search the web and do not add facts from memory. If a fact you need is missing, rate from what is there and list that need under lowEvidence.

Rate the program 1 to 5, integers only, on these five needs. Start from the default for the program's category in this table, and move a rating only when the facts justify it:

  category              leadership  deep_expertise  graduate_degree  senior_network  new_industry_or_city
  mba                       5             3                5                1                 5
  emba                      5             3                5                5                 3
  specialized_masters       3             5                5                1                 3
  executive                 5             3                1                5                 3
  certificate               3             3                3                1                 1
  short_course              3             3                1                1                 1

Rubric:
leadership_skills (how central leading people and organizations is to the curriculum):
  1 = little or no leadership content
  2 = one leadership course or module in a program about something else
  3 = leadership is one strand among several
  4 = leadership is a major strand, with required leadership courses, but not taught specifically for experienced leaders
  5 = leadership is the core, taught for experienced leaders (name the modules)
deep_expertise (depth in one field, such as technology strategy, AI in organizations or engineering management):
  1 = a broad overview
  2 = one course or a few sessions in the field
  3 = several courses in one field
  4 = a degree-length program of study in one field, without a capstone or thesis
  5 = sustained, credit-bearing depth in one field with a capstone or thesis
graduate_degree (factual):
  1 = no academic credit
  2 = academic credit or CEUs with no stated path to a degree
  3 = some of its credits officially count toward a graduate degree (quote it)
  4 = all of its credits officially count toward a named graduate degree (quote it)
  5 = awards a graduate degree (master's or MBA)
senior_network (how senior the classmates are, and time together):
  1 = cohort median under 5 years of experience, or no cohort
  2 = median 5 to 9 years
  3 = median 10 to 14 years, or mostly managers
  4 = median 15 to 19 years, or mostly directors and VPs
  5 = median 20+ years, or mostly C-level and VPs, with sustained in-person time
  Use a median or average from the most recent published class profile, even when it describes an earlier class; say which class. A published target audience (for example "C-level positions including CEOs, CTOs") counts as the cohort when admission is by application.
new_industry_or_city (support for changing industry, role or city):
  1 = designed for staying in the current role, no career services
  2 = an alumni or professional network only, with no career services for these students
  3 = career services open to these students, such as advising, webinars or career fairs (quote it)
  4 = career services plus a recruiting channel or dedicated support for career switchers
  5 = structured career switching: recruiting, internships and dedicated career services for switchers

Evidence rules:
- For senior_network and new_industry_or_city, a 4 or 5 needs facts that meet that level. When the research has facts on the need, rate those facts, even below the default. When it has none, use the category default or 3, whichever is lower.
- For leadership_skills and deep_expertise, the category default stands unless the facts move it.
- List every need rated on thin or missing evidence under lowEvidence.

Return one JSON code block, valid JSON, and nothing else:
{
  "ratings": { "leadership_skills": n, "deep_expertise": n, "graduate_degree": n, "senior_network": n, "new_industry_or_city": n },
  "ratingNotes": { "leadership_skills": "...", "deep_expertise": "...", "graduate_degree": "...", "senior_network": "...", "new_industry_or_city": "..." },
  "reasoning": { "leadership_skills": "...", "deep_expertise": "...", "graduate_degree": "...", "senior_network": "...", "new_industry_or_city": "..." },
  "lowEvidence": [ list of needs rated on thin evidence, or empty ]
}

ratingNotes are shown to the user on the program card: plain text, at most 20 words, facts only, no URLs, citations, footnotes or rubric words (no "default", "rubric", "provisionally").
reasoning is for the reviewer: the facts and quotes each rating rests on. When a rating differs from the category default, start with "default X → Y because".

Research:
<paste the whole research answer here>
```
