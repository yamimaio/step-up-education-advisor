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
"deep_expertise": 5,
"graduate_degree": 5,
"senior_network": 1,
"new_industry_or_city": 3
},
"ratingNotes": {
"leadership_skills": "default 3 → 5 because the program targets “experienced STEM professionals” and states “leadership is core component of our coursework”; required courses include MEM 424: Leadership and Organizational Behavior and MEM 402: Engineering Management, with rotating leadership roles in a simulation. Sources: [https://www.mccormick.northwestern.edu/engineering-management/](https://www.mccormick.northwestern.edu/engineering-management/) and [https://www.mccormick.northwestern.edu/engineering-management/overview/innovation-strategic-thinking-leadership.html](https://www.mccormick.northwestern.edu/engineering-management/overview/innovation-strategic-thinking-leadership.html) and [https://www.mccormick.northwestern.edu/engineering-management/curriculum/](https://www.mccormick.northwestern.edu/engineering-management/curriculum/) ",[^1]
"deep_expertise": "Retain default 5: sustained master's-level engineering-management study requires “A minimum number of 12 courses,” including seven core courses, at least two advanced-engineering courses, and a required capstone choice: MEM 436: Technology Strategy for Products or MEM 437: Strategic Management for Engineers; total awarded units are unverified. Source: [https://www.mccormick.northwestern.edu/engineering-management/curriculum/](https://www.mccormick.northwestern.edu/engineering-management/curriculum/) ",[^1]
"graduate_degree": "Retain default 5: the curriculum explicitly identifies the awarded credential as the “Master of Engineering Management degree.” Source: [https://www.mccormick.northwestern.edu/engineering-management/curriculum/](https://www.mccormick.northwestern.edu/engineering-management/curriculum/) ",[^1]
"senior_network": "Retain default 1 on thin evidence, not a demonstrated junior cohort: “seven years STEM experience” is not verified as a mean, median, or part-time-specific statistic; participant titles and sustained in-person time are also unverified, so no adjustment is justified. Source: [https://www.mccormick.northwestern.edu/engineering-management/](https://www.mccormick.northwestern.edu/engineering-management/) ",[^1]
"new_industry_or_city": "Retain default 3 on thin evidence: published student projects offer work “similar to that of an internship,” but availability to employed part-time students is unverified; the research does not establish part-time career services, recruiting, or cross-industry network access. Source: [https://www.mccormick.northwestern.edu/engineering-management/curriculum/student-projects/](https://www.mccormick.northwestern.edu/engineering-management/curriculum/student-projects/) "[^1]
},

"lowEvidence": $$
"senior_network",
"new_industry_or_city"
$$

}

<div align="center">⁂</div>

[^1]: northwestern-mem-pt.md

## Reviewed ratings (Yami, Oct 9)

Perplexity's answer above, reviewed under the rating rules from issue #87. The record uses these values; the evidence is in Perplexity's notes above.

```json
{
  "ratings": {
    "leadership_skills": 4,
    "deep_expertise": 5,
    "graduate_degree": 5,
    "senior_network": 2,
    "new_industry_or_city": 3
  },
  "ratingNotes": {
    "leadership_skills": "Required Leadership and Organizational Behavior course and rotating leadership roles in a simulation.",
    "deep_expertise": "Twelve-course master's in engineering management with a required strategy capstone course.",
    "graduate_degree": "Awards the Master of Engineering Management.",
    "senior_network": "Designed for experienced STEM professionals; the school cites seven years of STEM experience.",
    "new_industry_or_city": "Internship-like client projects exist; access for part-time students and career services are not confirmed."
  },
  "lowEvidence": [
    "senior_network",
    "new_industry_or_city"
  ]
}
```

Changes from Perplexity's answer:

- leadership_skills 5 → 4: one required leadership course plus a simulation is a major strand with required courses, not a curriculum built for experienced leaders (new rubric level 4).
- senior_network 1 → 2: the homepage's "seven years STEM experience" falls in the 5 to 9 band. Still low evidence: not labelled as a median or a part-time figure.
- new_industry_or_city stays 3: no career facts for part-time students, so the default (3) applies.

## Reviewed ratings (rate-program v3, 2026-10-10; reviewed by: Yami)

Full re-review of all five needs under rate-program v3 (PR #135), from the research, the overrides and Northwestern's own pages checked on 2026-10-10: the program homepage, the curriculum, the student body profile, the flexible-format page and the MEM career development page. New in the overrides file: `format` (sourced), the part-time experience average, and `ratingNotes` sources for the capstone, class size and career services.

```json
{
  "ratings": {
    "leadership_skills": 4,
    "deep_expertise": 5,
    "graduate_degree": 5,
    "senior_network": 2,
    "new_industry_or_city": 3
  },
  "ratingNotes": {
    "leadership_skills": "Required Leadership and Organizational Behavior course and rotating leadership roles in a simulation.",
    "deep_expertise": "Twelve-course master's in engineering management with a required strategy capstone course.",
    "graduate_degree": "Awards the Master of Engineering Management.",
    "senior_network": "Part-time students averaged 7.6 years of experience (Fall 2021); 20 to 30 students per course.",
    "new_industry_or_city": "Engineering career office and Northwestern Career Advancement offer advising; access for part-time students is not stated."
  },
  "reasoning": {
    "leadership_skills": "default 3 → 4 per R3: required core course 'MEM 424: Leadership and Organizational Behavior' and, in MEM 402, 'Students take turns performing in leadership roles in a competitive scenario.' The program is about engineering management, not built for experienced leaders, so not 5. Re-checked on the curriculum page on 2026-10-10.",
    "deep_expertise": "Category default 5 stands: at least 12 courses in engineering management ('A minimum number of 12 courses is required') with a required capstone: 'Choose one (1) of the following Capstone courses:' MEM 436 Technology Strategy for Products or MEM 437 Strategic Management for Engineers. Sustained, credit-bearing depth in one field with a capstone is level 5. The research called these a capstone choice; the curriculum page now confirms the label.",
    "graduate_degree": "Factual 5: awards the 'Master of Engineering Management degree'.",
    "senior_network": "default 1 → 2 per R2 and R10: the student body profile ('Note: Data below is from Fall 2021') gives 'Part-Time Students: 7.6 years' of average work experience, band 5 to 9. It is the latest published profile and the figure for this part-time option; the homepage's 'Students possess an avg. seven years STEM experience' (R4) lands in the same band. Per R10, 'Program is not a cohort format' does not make it 'no cohort': there are '20-30 students in each academic course'. The engine derives the same 2 from the record's 7.6.",
    "new_industry_or_city": "default 3 stands, on thin evidence: the MEM career development page lists 'The Engineering Career Development Office helps provide career advice to engineering students' and 'Northwestern Career Advancement offers comprehensive career services including career counseling and assessment', and an annual MEM Industry Night. None of these says it is open to part-time students, and the page describes part-time graduates as those 'who maintain their current employment'. The optional summer internship is described for the full-time course of study. Not 4: no recruiting channel or career-switcher support quoted."
  },
  "lowEvidence": [
    "new_industry_or_city"
  ]
}
```

Changes from the reviewed block above (Yami, Oct 9):

- No rating changes.
- senior_network leaves lowEvidence: the 7.6-year average is labelled and specific to part-time students, from the latest published profile (Fall 2021). The record now stores it, so the engine derives the 2 instead of reading the rating.
- Notes for senior_network and new_industry_or_city restate the new facts.

Close calls:

- new_industry_or_city 3 or 2: if the career offices turn out not to serve part-time students, only the network is left and R5 gives 2.
- senior_network: the profile is from Fall 2021, five years old; the homepage's current but unlabelled "avg. seven years" agrees.
