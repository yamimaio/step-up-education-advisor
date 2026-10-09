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

