<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# You are rating one US leadership program for a curated dataset that helps experienced leaders (8+ years of experience, already holding a degree) choose their next educational step. Users rank what they need most; programs are ranked by how well they serve those needs.

Below is research on the program, taken only from its official pages, with a URL and a verbatim quote for each fact. Use ONLY these facts. Do not search the web and do not add facts from memory. If a fact you need is missing, rate from what is there and list that need under lowEvidence.
Rate the program 1 to 5, integers only, on these five needs. Start from the default for the program’s category in this table, and move a rating only when the facts justify it:
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
1 = no academic credit; 2 = academic credit or CEUs with no stated path to a degree; 3 = credits that officially count toward a graduate degree (quote it); 5 = awards a graduate degree (master’s or MBA).
senior_network (how senior the classmates are, and time together):
1 = cohort median under 5 years of experience, or no cohort; 2 = median 5 to 9 years; 3 = median 10 to 14 years, or mostly managers; 4 = median 15 to 19 years, or mostly directors and VPs; 5 = median 20+ years, or mostly C-level and VPs, with sustained in-person time.
new_industry_or_city (support for changing industry, role or city):
1 = designed for staying in the current role, no career services; 3 = some career services or a network reaching new industries; 5 = structured career switching: recruiting, internships or dedicated career services for switchers.
For each need, give one line citing the facts it rests on. When a rating differs from the category default, start the line with “default X → Y because”.
Return exactly:
“ratings”: { “leadership_skills”: n, “deep_expertise”: n, “graduate_degree”: n, “senior_network”: n, “new_industry_or_city”: n },
“ratingNotes”: { “leadership_skills”: “…”, “deep_expertise”: “…”, “graduate_degree”: “…”, “senior_network”: “…”, “new_industry_or_city”: “…” },
“lowEvidence”: [ list of needs rated on thin evidence, or empty ]

Research attached

{
"ratings": {
"leadership_skills": 5,
"deep_expertise": 3,
"graduate_degree": 5,
"senior_network": 5,
"new_industry_or_city": 3
},
"ratingNotes": {
"leadership_skills": "EMBA default retained on thin evidence: named San Francisco leadership modules and their curricular centrality are not established; the older [2026–2028 calendar](https://executivemba.wharton.upenn.edu/wp-content/uploads/2026/03/cal_52_SF_TY_V6_03192026-1.pdf) lists “Required Co-curricular Leadership Sessions,” but does not establish the 2027 curriculum. ",[^1]
"deep_expertise": "EMBA default retained on thin evidence: the [FAQ](https://executivemba.wharton.upenn.edu/emba-faqs/) states “You must complete 19 course units at Wharton to earn your degree from our program,” but the research does not establish several courses in one field or a field-specific capstone or thesis. ",[^1]
"graduate_degree": "EMBA default confirmed: the credential is an MBA, and the [FAQ](https://executivemba.wharton.upenn.edu/emba-faqs/) states “There is no difference in the degree earned by executive and full-time MBA students.” ",[^1]
"senior_network": "EMBA default retained on thin evidence: the [FAQ](https://executivemba.wharton.upenn.edu/emba-faqs/) establishes an “every-other-weekend residential format,” but 2027 cohort experience and titles are missing; the [class profile](https://executivemba.wharton.upenn.edu/class-profile/) reports “an average of 13-14 years of professional experience” for the different Class of 2028, not a 2027 median or evidence of mostly C-level and VP classmates. ",[^1]
"new_industry_or_city": "EMBA default retained on thin evidence: the [class profile](https://executivemba.wharton.upenn.edu/class-profile/) states students are “required to maintain full-time employment throughout the duration of the program,” but the research establishes neither career-switching services nor network reach into new industries; employment compatibility alone does not justify changing the default. "[^1]
},

"lowEvidence": $$
"leadership_skills",
"deep_expertise",
"senior_network",
"new_industry_or_city"
$$

}

<div align="center">⁂</div>

[^1]: wharton-emba-sf.md

## Reviewed ratings (Yami, Oct 9)

Perplexity's answer above, reviewed under the rating rules from issue #87. The record uses these values; the evidence is in Perplexity's notes above.

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
    "leadership_skills": "MBA curriculum with required co-curricular leadership sessions on the San Francisco calendar.",
    "deep_expertise": "A general MBA of 19 course units.",
    "graduate_degree": "Awards the Wharton MBA, the same degree as the full-time program.",
    "senior_network": "Class of 2028 averages 13 to 14 years of experience; class weekends every other week.",
    "new_industry_or_city": "Students keep full-time jobs throughout; career services for executive students are not described."
  },
  "lowEvidence": [
    "leadership_skills",
    "deep_expertise",
    "new_industry_or_city"
  ]
}
```

Changes from Perplexity's answer:

- senior_network 5 → 3: the most recent class profile now counts (Class of 2028, "an average of 13-14 years of professional experience"), which is level 3. The engine derives the same 3 from the record's 13.5.
- senior_network leaves lowEvidence: it rests on a published class profile.
- new_industry_or_city stays 3: the research has no career facts, so the rule "default or 3, whichever is lower" applies.

## Reviewed ratings (rate-program v3, 2026-10-10; reviewed by: pending)

Full re-review of all five needs under rate-program v3 (PR #135), from the research, the overrides and Wharton's own pages checked on 2026-10-10: the class profile, the EMBA curriculum page, the Penn catalog and the EMBA career services page. The curriculum and career facts are new in the overrides file as `ratingNotes` sources.

```json
{
  "ratings": {
    "leadership_skills": 4,
    "deep_expertise": 3,
    "graduate_degree": 5,
    "senior_network": 3,
    "new_industry_or_city": 4
  },
  "ratingNotes": {
    "leadership_skills": "Required Leadership Essentials core courses, such as Foundations of Teamwork and Leadership, plus co-curricular leadership sessions.",
    "deep_expertise": "A general MBA of 19 course units; optional majors add four course units in one field.",
    "graduate_degree": "Awards the Wharton MBA, the same degree as the full-time program.",
    "senior_network": "Class of 2028 averages 13 to 14 years of experience; class weekends every other week.",
    "new_industry_or_city": "Executive coaches, a job board and resume book, and dedicated support for career changers."
  },
  "reasoning": {
    "leadership_skills": "default 5 → 4 because leadership is a required strand but not the core of the curriculum. The core is 'The core curriculum consists of 9.5 course units.', split into 'Leadership Essentials' (Foundations of Teamwork and Leadership, Management Communication, Responsibility in Global Management) and a longer 'Analytic Foundations' list (accounting, finance, economics, statistics, operations, marketing). The Penn catalog lists MGMT 6100 Foundations of Teamwork and Leadership and WHCP 6140 Management Communication at 0.5 CU each among the core requirements. The SF calendar adds 'Required Co-curricular Leadership Sessions'. Taught to experienced professionals (eight years minimum), but level 5 needs leadership to be the core; per R3, required leadership courses in a program about something else are a 4.",
    "deep_expertise": "Category default 3 stands: a general MBA ('You must complete 19 course units at Wharton to earn your degree from our program.', R8). The curriculum page adds that 'some Wharton majors can be earned by executive students as a result of pursuing four additional credit units in a focused area' (for example Artificial Intelligence for Business, Strategic Management): several courses in one field, level 3. Not 4: the degree as a whole spans many fields, and no capstone or thesis is required.",
    "graduate_degree": "Factual 5: 'There is no difference in the degree earned by executive and full-time MBA students.'",
    "senior_network": "Stays 3 per R2: the Class of 2028 profile, 'an average of 13-14 years of professional experience', midpoint 13.5, band 10 to 14. Re-checked on 2026-10-10: the profile still publishes no breakdown, median, titles or seniority mix (its counters render as 0), so R9 does not apply. The engine derives the same 3 from the record's 13.5.",
    "new_industry_or_city": "default 3 → 4 because the EMBA career services page lists 'Personalized 1:1 support from highly rated executive coaches', 'CareerPath: Centralized hub with job board, resume book, board resume section, and compensation data' (a recruiting channel) and serves 'Career Changers: Pivoting into new industries or functions' (dedicated switcher support). Level 4 needs career services plus either. Not 5: no internships or structured switching; students must 'maintain full-time employment throughout the duration of the program'."
  },
  "lowEvidence": []
}
```

Changes from the reviewed block above (Yami, Oct 9):

- leadership_skills 5 → 4: the curriculum page shows leadership as one required block of the core, not the core (R3, rubric level 4). It leaves lowEvidence.
- new_industry_or_city 3 → 4: the career services page, not in the research, shows a job board with a resume book and support for career changers. It leaves lowEvidence; R6 no longer applies because there are now career facts.
- deep_expertise stays 3 and leaves lowEvidence: the optional majors are several courses in one field.
- Notes for leadership_skills, deep_expertise and new_industry_or_city restate the new facts.

Close calls:

- leadership_skills 4 or 5: the EMBA default is 5, and the classes are taught to experienced professionals, but leadership is about one sixth of the core. Keeping 5 would rank a general EMBA above Harvard's organizational behavior certificate (4) on leadership.
- new_industry_or_city 4 or 3: the services are for students and alumni of the whole EMBA; the page names no restriction, but it doesn't say how many career changers use them.
