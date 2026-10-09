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
"leadership_skills": 4,
"deep_expertise": 3,
"graduate_degree": 3,
"senior_network": 1,
"new_industry_or_city": 3
},
"ratingNotes": {
"leadership_skills": "default 3 → 4 because leading people and organizations is central: required components are Organizational Behavior and Conflict Management, with options including Leading Through Change and Advanced Negotiation and Conflict Resolution Strategies; a curriculum specifically for experienced leaders is not established, preventing a 5. [https://extension.harvard.edu/academics/programs/organizational-behavior-certificate/](https://extension.harvard.edu/academics/programs/organizational-behavior-certificate/) ",[^1]
"deep_expertise": "Four graduate-credit courses focus on organizational behavior: one organizational behavior course, one conflict management course, and two electives; this supports several courses in one field, but no required capstone or thesis is documented. [https://extension.harvard.edu/academics/programs/organizational-behavior-certificate/](https://extension.harvard.edu/academics/programs/organizational-behavior-certificate/) ",[^1]
"graduate_degree": "The official degree pathway states: “you can earn this graduate certificate along the way by completing courses that fulfill both certificate and degree requirements.” This applies to the Management or Industrial-Organizational Psychology master’s pathways, subject to course selection; not every certificate course counts toward a degree. [https://extension.harvard.edu/academics/programs/organizational-behavior-certificate/](https://extension.harvard.edu/academics/programs/organizational-behavior-certificate/) and [https://extension.harvard.edu/registration-admissions/pursuing-a-certificate/](https://extension.harvard.edu/registration-admissions/pursuing-a-certificate/) ",[^1]
"senior_network": "Retained the certificate default because published participant titles range from Business Analyst to Vice President without a current cohort experience median or majority seniority; four online courses establish no required in-person time, and selected titles do not justify an upgrade. [https://extension.harvard.edu/academics/programs/organizational-behavior-certificate/](https://extension.harvard.edu/academics/programs/organizational-behavior-certificate/) ",[^1]
"new_industry_or_city": "default 1 → 3 because certificate benefits explicitly include career webinars, advising, career fairs, and Harvard Extension Alumni Association affiliate membership; dedicated switching support, internships, or structured recruiting are not documented. [https://extension.harvard.edu/academics/programs/organizational-behavior-certificate/](https://extension.harvard.edu/academics/programs/organizational-behavior-certificate/) "[^1]
},

"lowEvidence": $$
"leadership_skills",
"senior_network"
$$

}

<div align="center">⁂</div>

[^1]: harvard-ext-org-behavior.md

## Reviewed ratings (Yami, Oct 9)

Perplexity's answer above, reviewed under the rating rules from issue #87. The record uses these values; the evidence is in Perplexity's notes above.

```json
{
  "ratings": {
    "leadership_skills": 4,
    "deep_expertise": 3,
    "graduate_degree": 3,
    "senior_network": 1,
    "new_industry_or_city": 3
  },
  "ratingNotes": {
    "leadership_skills": "Required organizational behavior and conflict management courses, with electives such as Leading Through Change.",
    "deep_expertise": "Four graduate-credit courses in organizational behavior, without a capstone.",
    "graduate_degree": "Courses can count toward a Harvard Extension master's in management or industrial-organizational psychology.",
    "senior_network": "Online, with no required time together; earner titles range from business analyst to vice president.",
    "new_industry_or_city": "Career webinars, advising and career fairs are open to certificate students."
  },
  "lowEvidence": [
    "senior_network"
  ]
}
```

Changes from Perplexity's answer:

- No rating changes. leadership_skills 4 now matches a defined level (required leadership courses, not built for experienced leaders), so it leaves lowEvidence.
- graduate_degree stays 3, not the new 4: not every certificate course counts toward the master's.
