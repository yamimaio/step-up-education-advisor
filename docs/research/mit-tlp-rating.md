<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# You are rating one US leadership program for a curated dataset that helps experienced leaders (8+ years of experience, already holding a degree) choose their next educational step. Users rank what they need most; programs are ranked by how well they serve those needs.

Below is research on the program, taken only from its official pages, with a URL and a verbatim quote for each fact. Use ONLY these facts. Do not search the web and do not add facts from memory. If a fact you need is missing, rate from what is there and list that need under lowEvidence.

Rate the program 1 to 5, integers only, on these five needs. Start from the default for the program's category in this table, and move a rating only when the facts justify it:

category leadership deep_expertise graduate_degree senior_network new_industry_or_city
mba 5 3 5 1 5
emba 5 3 5 5 3
specialized_masters 3 5 5 1 3
executive 5 3 1 5 3
certificate 3 3 3 1 1
short_course 3 3 1 1 1

Rubric:
leadership_skills (how central leading people and organizations is to the curriculum):
1 = little or no leadership content; 3 = leadership is one strand among several; 5 = leadership is the core, taught for experienced leaders (name the modules).
deep_expertise (depth in one field, such as technology strategy, AI in organizations or engineering management):
1 = a broad overview; 3 = several courses in one field; 5 = sustained, credit-bearing depth in one field with a capstone or thesis.
graduate_degree (factual):
1 = no academic credit; 2 = academic credit or CEUs with no stated path to a degree; 3 = credits that officially count toward a graduate degree (quote it); 5 = awards a graduate degree (master's or MBA).
senior_network (how senior the classmates are, and time together):
1 = cohort median under 5 years of experience, or no cohort; 2 = median 5 to 9 years; 3 = median 10 to 14 years, or mostly managers; 4 = median 15 to 19 years, or mostly directors and VPs; 5 = median 20+ years, or mostly C-level and VPs, with sustained in-person time.
new_industry_or_city (support for changing industry, role or city):
1 = designed for staying in the current role, no career services; 3 = some career services or a network reaching new industries; 5 = structured career switching: recruiting, internships or dedicated career services for switchers.

For each need, give one line citing the facts it rests on. When a rating differs from the category default, start the line with "default X → Y because".

Return exactly:
"ratings": { "leadership_skills": n, "deep_expertise": n, "graduate_degree": n, "senior_network": n, "new_industry_or_city": n },
"ratingNotes": { "leadership_skills": "...", "deep_expertise": "...", "graduate_degree": "...", "senior_network": "...", "new_industry_or_city": "..." },
"lowEvidence": [ list of needs rated on thin evidence, or empty ]

Research attached

{
"ratings": {
"leadership_skills": 5,
"deep_expertise": 3,
"graduate_degree": 2,
"senior_network": 5,
"new_industry_or_city": 3
},
"ratingNotes": {
"leadership_skills": "Leadership is central: pillars include “Leading and Managing Strategic Change” and “Leading the Human Side of Technology”; modules include Leadership Development, Build and Lead Innovation Teams, and Coaching and Developing Others, with experienced managers and executives among the intended participants. ",[^1]
"deep_expertise": "Retains default 3: technology-related modules include Leading Corporate and Technology Strategy, Lead Open Innovation in a Rapidly Changing World, and AI and Ethics; participants undertake strategy projects throughout the program, but sustained academic-credit depth in one field is not established. ",[^1]
"graduate_degree": "default 1 → 2 because “Technology Leadership Program participants are eligible to earn 42 Continuing Education Units (CEUs)”; the stated credential is a Certificate of Completion, with no published graduate-degree credit pathway. ",[^1]
"senior_network": "Retains default 5 provisionally: relevant roles include C-level positions, Heads of Engineering/Technology, and managers; “3 residential weeks and 14+ live online sessions” establish sustained interaction, but eligible roles do not establish actual cohort composition, and neither median experience nor a predominantly C-level/VP cohort is published. ",[^1]
"new_industry_or_city": "Retains default 3 provisionally: participants can “expand your professional network by joining the global MIT Professional Education Alumni LinkedIn Group”; the research does not establish cross-industry reach, career services, recruiting, internships, or relocation support. "[^1]
},

"lowEvidence": $$
"deep_expertise",
"senior_network",
"new_industry_or_city"
$$

}

<div align="center">⁂</div>

[^1]: mit-tlp.md

## Reviewed ratings (Yami, Oct 9)

Perplexity's answer above, reviewed under the rating rules from issue #87. The record uses these values; the evidence is in Perplexity's notes above.

```json
{
  "ratings": {
    "leadership_skills": 5,
    "deep_expertise": 3,
    "graduate_degree": 2,
    "senior_network": 5,
    "new_industry_or_city": 2
  },
  "ratingNotes": {
    "leadership_skills": "Leadership is the core: leading strategic change, the human side of technology, and innovation teams.",
    "deep_expertise": "Several technology strategy modules and strategy projects throughout, without academic credit.",
    "graduate_degree": "Certificate of completion with 42 CEUs; no stated path to a graduate degree.",
    "senior_network": "Aimed at C-level and heads of engineering, admitted by application, with three residential weeks at MIT.",
    "new_industry_or_city": "An MIT Professional Education alumni LinkedIn group; no career services published."
  },
  "lowEvidence": [
    "deep_expertise",
    "senior_network",
    "new_industry_or_city"
  ]
}
```

Changes from Perplexity's answer:

- senior_network stays 5 (Perplexity kept it only as the default). Yami: the target audience is C-level ("C-level positions including CEOs, CTOs, COOs, CIOs") and admission is by application ($200 application fee), so the standard is enforced. Yami's own cohort averages about 22 years. Still low evidence: no published median.
- new_industry_or_city 3 → 2: the only fact is the alumni LinkedIn group, a network with no career services (new rubric level 2).

## Reviewed ratings (rate-program v2, 2026-10-09; reviewed by: Yami)

Re-rated under rate-program v2 (R9) after the MIT TLP brochure (July 2026) published a class profile with an experience breakdown. Those facts are in `mit-tlp-overrides.json` with their quotes, not in `mit-tlp.md`.

```json
{
  "ratings": {
    "leadership_skills": 5,
    "deep_expertise": 3,
    "graduate_degree": 2,
    "senior_network": 5,
    "new_industry_or_city": 2
  },
  "ratingNotes": {
    "leadership_skills": "Leadership is the core: leading strategic change, the human side of technology, and innovation teams.",
    "deep_expertise": "Several technology strategy modules and strategy projects throughout, without academic credit.",
    "graduate_degree": "Certificate of completion with 42 CEUs; no stated path to a graduate degree.",
    "senior_network": "Half of past participants have 20+ years of experience, across 20+ industries; three residential weeks at MIT.",
    "new_industry_or_city": "An MIT Professional Education alumni LinkedIn group; no career services published."
  },
  "reasoning": {
    "leadership_skills": "Category default 5 stands: pillars 'Leading and Managing Strategic Change' and 'Leading the Human Side of Technology'; modules Leadership Development, Build and Lead Innovation Teams, Coaching and Developing Others.",
    "deep_expertise": "Category default 3 stands: several technology strategy modules and strategy projects throughout; no academic credit, capstone or thesis.",
    "graduate_degree": "default 1 → 2 because participants 'are eligible to earn 42 Continuing Education Units (CEUs)'; the credential is a Certificate of Completion with no stated path to a degree.",
    "senior_network": "Category default 5 stands, per R9: the brochure's breakdown (25+ years 21%, 20-25 years 29%, 15-20 years 26%, 10-15 years 17%, less than 10 years 7%) puts exactly half the participants at 20+ years, so the median is 20 (band 20+). The stated average of 19 is in figureNotes. Three residential weeks give sustained in-person time. The engine derives the same 5 from the record's 20.",
    "new_industry_or_city": "default 3 → 2 per R5: the only career-related fact is the MIT Professional Education Alumni LinkedIn Group; no career services published."
  },
  "lowEvidence": [
    "deep_expertise",
    "new_industry_or_city"
  ]
}
```

Changes from the reviewed block above:

- senior_network stays 5, now on a published class profile (R9) instead of the target audience (R1).
- senior_network leaves lowEvidence: it rests on a published class profile.
