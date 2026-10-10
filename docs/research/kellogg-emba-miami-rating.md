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
Use a median or average from the most recent published class profile, even when it describes an earlier class; say which class. When the profile also publishes an experience breakdown (share of the class per band of years), use the median that breakdown implies instead of an average: the lower edge of the band that holds the middle participant (when exactly half the class is at or above a band's lower edge, that edge). The record stores that number with `cohortExperienceBasis: median`. A published target audience (for example "C-level positions including CEOs, CTOs") counts as the cohort when admission is by application.
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

Research attached

```json
{
  "ratings": {
    "leadership_skills": 5,
    "deep_expertise": 3,
    "graduate_degree": 5,
    "senior_network": 3,
    "new_industry_or_city": 3
  },
  "ratingNotes": {
    "leadership_skills": "Leadership courses and curriculum emphasis are not established in the supplied research.",
    "deep_expertise": "MBA taught by Kellogg faculty; specialized coursework, credits and capstone requirements are not established.",
    "graduate_degree": "Awards an MBA after two years.",
    "senior_network": "Monthly in-person sessions; the published profile lists senior titles without proportions or years of experience.",
    "new_industry_or_city": "EMBA-specific career services, recruiting and career-switching support are not established in the supplied research."
  },
  "reasoning": {
    "leadership_skills": "The EMBA category default of 5 stands because the supplied research contains no curriculum facts that justify moving it. Leadership modules and their centrality are explicitly unverified; no modules can be named, so this rating lacks evidence establishing experienced-leader instruction. [file:1]",
    "deep_expertise": "The EMBA category default of 3 stands because the supplied research does not establish specialized depth that justifies moving it. The schedule page states 'earn your MBA' and 'learn from Kellogg’s leading faculty'; detailed coursework, academic credits and capstone or thesis requirements are unverified. Source: https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/ [file:1]",
    "graduate_degree": "The rating of 5 is supported by the explicit degree award: 'earn your MBA in two years flat.' Published credit totals are unnecessary to establish that the program awards a graduate degree. Source: https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/ [file:1]",
    "senior_network": "default 5 → 3 because the supplied profile does not establish experience or title proportions sufficient for 4 or 5. The most recent identified profile covers 'September 2024 and January 2025' entrants and lists 'Hold senior positions (Director + VP + C-Suite)', but supplies neither a verified median or average nor an experience breakdown or senior-title percentage. The schedule establishes sustained in-person contact through 'Thursday–Sunday' sessions, '1x month' and four intensive weeks, but attendance alone does not establish seniority. Use 3 as the capped fallback for missing cohort-seniority evidence, not as a claim that median experience is 10–14 years. Sources: https://www.kellogg.northwestern.edu/programs/executive-mba/emba-experience/class-profile/ and https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/ [file:1]",
    "new_industry_or_city": "The EMBA category default of 3 remains under the missing-evidence rule. The supplied research explicitly leaves EMBA-specific career coaching, recruiting eligibility, internships and career-switching support unverified, with no supporting official quote. This score does not establish that career services are available, and missing evidence does not establish their absence. [file:1]"
  },
  "lowEvidence": [
    "leadership_skills",
    "deep_expertise",
    "senior_network",
    "new_industry_or_city"
  ]
}
```

<span style="display:none">[^1]</span>

<div align="center">⁂</div>

[^1]: kellogg-emba-miami.md


## Reviewed ratings (rate-program v3, 2026-10-10; reviewed by: pending)

Claude's independent rating under rate-program v3, from Claude's own official-page research (`kellogg-emba-miami-claude-check.md`) and Perplexity's research file, written before reading Perplexity's rating answer above.

```json
{
  "ratings": {
    "leadership_skills": 4,
    "deep_expertise": 3,
    "graduate_degree": 5,
    "senior_network": 4,
    "new_industry_or_city": 4
  },
  "ratingNotes": {
    "leadership_skills": "Required core courses Leadership and Executive Perspectives on Leadership, five team workshops and an executive leadership coach.",
    "deep_expertise": "A general MBA of 19 required core courses, including a capstone; specializations are not recorded on the diploma.",
    "graduate_degree": "Awards an MBA after two years.",
    "senior_network": "Classmates average 15 years of experience and hold director, VP and C-suite roles; four days together monthly.",
    "new_industry_or_city": "Career coaching for experienced professionals, including tools to shift to a new function or industry."
  },
  "reasoning": {
    "leadership_skills": "default 5 → 4 because leadership is a major strand with required, named courses ('You are required to take all core courses': Leadership; Executive Perspectives on Leadership; Purposeful Collaboration; Negotiation Strategies) plus a five-workshop team series and 'individual coaching sessions with a Kellogg executive leadership coach', but it sits inside a general MBA core of 19 courses; the same call as Wharton EMBA SF (R3). Close call: the coaching and assessments (ESCI, CareerLeader, StrengthsFinder) are built for executives, which argues for 5.",
    "deep_expertise": "default 3 stands: a general management core of 19 courses with a capstone, 4 to 8 elective credits in year 2, and specializations that 'are not recorded on the transcript or diploma'.",
    "graduate_degree": "awards an MBA ('earn your MBA in two years flat'), level 5.",
    "senior_network": "default 5 → 4 because the only experience figure is 'an average of 15 years of work experience' (no median or breakdown; band 15 to 19 → 4), and the class profile says students 'Hold senior positions (Director + VP + C-Suite)' with no shares, which also reads as 4. Monthly Thursday-to-Sunday sessions give sustained in-person time, but 5 needs a median of 20+ or mostly C-level.",
    "new_industry_or_city": "default 3 → 4 because career services are open to EMBA students ('CMC coaching sessions are tailored to experienced professionals') with dedicated support for switchers ('Shift to a new function or industry with tools from the CMC'). No recruiting channel or internships are published, so not 5."
  },
  "lowEvidence": []
}
```

Changes from Perplexity's answer:

- leadership_skills 5 → 4: Perplexity kept the default because its research had no curriculum facts (and listed it as low evidence). The core courses page names the required leadership courses inside a general MBA core of 19, the same case as Wharton EMBA SF (R3). Close call between 4 and 5.
- senior_network 3 → 4: Perplexity's research had no experience figure. The admissions page gives "an average of 15 years of work experience" (band 15 to 19), and the class profile says students hold director, VP and C-suite positions.
- new_industry_or_city 3 → 4: Perplexity's research had no career facts (missing-evidence rule). The career services page offers CMC coaching to EMBA students and tools to "Shift to a new function or industry".
- lowEvidence: Perplexity listed four needs; with the curriculum, profile and career facts found, none is on thin evidence.
- deep_expertise and graduate_degree agree (3, 5).
