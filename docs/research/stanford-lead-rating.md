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
    "leadership_skills": 3,
    "deep_expertise": 3,
    "graduate_degree": 2,
    "senior_network": 3,
    "new_industry_or_city": 2
  },
  "ratingNotes": {
    "leadership_skills": "One required leadership course plus electives spanning leadership, innovation, communication, strategy, organizational design, and decision-making.",
    "deep_expertise": "Eight courses cover business and leadership; specialized study depth, academic credit hours, and capstone requirements are not published.",
    "graduate_degree": "Awards a Stanford GSB Professional Certificate and 24 CEUs; graduate-degree credit applicability is not published.",
    "senior_network": "Designed for mid- to senior-career professionals, with online peer interaction; cohort experience and title distribution are not published.",
    "new_industry_or_city": "Offers a lifelong professional community; career services, recruiting, internships, and relocation support are not published for LEAD."
  },
  "reasoning": {
    "leadership_skills": "default 5 → 3 because the documented curriculum makes leadership one strand among several, rather than establishing it as the core. Participants complete two foundation courses, one leadership course, and five electives. The curriculum states 'Leadership Core (Select 1 of 2 Courses)' and 'applied learning across leadership, strategy, innovation, finance, and critical thinking'. Although aimed at experienced professionals, the research does not name the individual leadership courses or establish predominantly leadership-focused study. Source: https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program/curriculum. [file:1]",
    "deep_expertise": "The executive category's rating of 3 stands. The curriculum states 'Stanford LEAD is a custom combination of 8 courses' and describes 'applied learning across leadership, strategy, innovation, finance, and critical thinking'. This supports multi-course business study but does not establish sustained specialization in a narrower field. Academic credit hours, a capstone, and a thesis are not published; evidence for depth within one field is thin. Source: https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program/curriculum. [file:1]",
    "graduate_degree": "default 1 → 2 because the curriculum explicitly states 'Earn 24 Continuing Education Units (CEUs)' and 'Earn a Stanford GSB Professional Certificate upon completion'. CEUs meet level 2; no official applicability toward a graduate degree is stated in the supplied research. Source: https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program/curriculum. [file:1]",
    "senior_network": "default 5 → 3 because the supplied research does not establish the seniority or sustained in-person time required for 4 or 5. The program states 'LEAD is designed for mid- to senior-career professionals' and describes 'collaboration with a diverse cohort of accomplished professionals'. The FAQ says it is 'designed to be completed fully online'. No dated class profile, median, average, experience breakdown, or measured title distribution is published in the research, so 3 is a conservative fallback rather than a verified cohort-seniority finding. Sources: https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program and https://www.gsb.stanford.edu/exec-ed/admission/faq. [file:1]",
    "new_industry_or_city": "default 3 → 2 because the documented benefit is a professional network, without published evidence of career services available to LEAD participants. The program states 'Participants join a lifelong community of accomplished professionals'. The participant profile's 'Preparing for broader leadership responsibility or career growth' describes positioning, not advising, recruiting, internships, or dedicated switching support. Service eligibility remains unestablished, rather than proven absent. Sources: https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program and https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program/participant-profile. [file:1]"
  },
  "lowEvidence": [
    "deep_expertise",
    "senior_network",
    "new_industry_or_city"
  ]
}
```

<span style="display:none">[^1]</span>

<div align="center">⁂</div>

[^1]: stanford-lead.md


## Reviewed ratings (rate-program v3, 2026-10-10; reviewed by: pending)

Claude's independent rating under rate-program v3, from Claude's own official-page research (`stanford-lead-claude-check.md`) and Perplexity's research file, written before reading Perplexity's rating answer above.

```json
{
  "ratings": {
    "leadership_skills": 4,
    "deep_expertise": 3,
    "graduate_degree": 2,
    "senior_network": 3,
    "new_industry_or_city": 2
  },
  "ratingNotes": {
    "leadership_skills": "One required leadership core course, plus leadership electives such as Leadership Agility and Building Power to Lead.",
    "deep_expertise": "Eight online courses: two required foundations, one leadership core course and five electives from sixteen.",
    "graduate_degree": "A Stanford GSB professional certificate and 24 CEUs; no academic credit is published.",
    "senior_network": "Fully online, for mid- to senior-career professionals selected by application; live sessions and group projects.",
    "new_industry_or_city": "A community of nearly 7,000 past participants; no career services published."
  },
  "reasoning": {
    "leadership_skills": "default 5 → 4 because the required courses are Critical Analytical Thinking, Financing Innovation and 'Leadership Core (Select 1 of 2 Courses)' (Intentional Leadership: A 360 Approach; Strategic Leadership): leadership is a major strand with a required, named course, but one of several in a general business program (per R3). Close call: about half the electives are leadership courses (A New Type of Leader, Building Power to Lead, Leadership Agility, Leading with Insight, The Friction Project: Leading Successful Change) and the audience is 'mid- to senior-career professionals preparing for broader leadership responsibility', which argues for 5.",
    "deep_expertise": "default 3 stands: 'a custom combination of 8 courses' across leadership, strategy, innovation, finance and critical thinking; a participant can take up to six leadership courses, which is 'several courses in one field'. No capstone or thesis. Close call with 2 for someone who picks broadly.",
    "graduate_degree": "default 1 → 2 because it awards 'a Stanford GSB Professional Certificate' and '24 Continuing Education Units (CEUs)'; no academic credit or path to a degree is published (level 2).",
    "senior_network": "default 5 → 3 because no median or average is published (the participant profile's figures are images) and the program is fully online. The target audience is 'mid- to senior-career professionals' and admission is selective ('LEADers are selected based on professional experience, leadership potential'), so per R1 the audience counts as the cohort; 'mid- to senior' reads as mostly managers (level 3). 4 and 5 need directors and VPs or sustained in-person time, which the facts don't show.",
    "new_industry_or_city": "default 3 → 2 because the only career-related facts are a community ('nearly 7,000 LEADers', 'a lifelong community of accomplished professionals'); no career services are published for LEAD (per R5)."
  },
  "lowEvidence": ["senior_network", "new_industry_or_city"]
}
```
