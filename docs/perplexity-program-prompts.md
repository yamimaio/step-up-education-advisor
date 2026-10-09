# Perplexity prompts: first 4 program records

Two prompts per program, each run in its own Perplexity thread:

1. **Prompt 1, research** (Deep Research): paste the research instructions followed by one program block. Save the whole answer as a file, for example `docs/research/mit-tlp.md`.
2. **Prompt 2, rating** (a thinking model, in a new thread): paste the rating prompt and then the whole research answer where it says so. Use the **same model for all 12 programs**, so the ratings are comparable. Save the answer as `docs/research/mit-tlp-rating.md`.

Then you review both files with Claude and open the pull request with the `draft` record; the schema check in CI catches any field that doesn't fit. You verify each fact against its quote and link, and the verifying commit names you.

Which tool and model ran each step is recorded in `docs/tools-and-models.md`.

---

## Prompt 1, research: instructions (paste first, every time)

```
You are researching one US university program for a curated dataset. Accuracy matters more than completeness.

Rules:
1. Use ONLY the program's or university's official web pages (its own domain). Never use rankings, aggregators, news, forums, Wikipedia or third-party course sites. The one exception is the GSA per diem site (gsa.gov) for the lodging rate.
2. For every fact, give: the value, the exact URL it came from, and a short verbatim quote from that page that shows it.
3. If an official page does not state a fact, write null and say "not published". Do not estimate, infer, average or round. A fact from a page about a different year or intake counts as not published unless the page says it still applies. Exception: for cohort facts (experience, titles, class size), use the most recent published class profile even when it describes an earlier class, and say which class.
4. Use the most recent intake or cohort the official pages describe, and say which one.
5. Money in US dollars as published. Say whether tuition includes fees, materials, lodging or meals.

Return two parts.

PART 1: a JSON object with exactly these fields (null where not published):
{
  "name": string,                       // as on the official page
  "institution": string,
  "category": "mba" | "emba" | "specialized_masters" | "executive" | "certificate" | "short_course",
  "credential": string,                 // e.g. "MBA", "Certificate of completion"
  "format": "in_person" | "hybrid" | "online",
  "durationMonths": number,
  "credits": string,                    // what it awards beyond the certificate: "none", "42 CEUs", "16 graduate credits"
  "onsiteDaysPerYear": number,          // total on-site days incl. residencies and weekend sessions; 0 if online
  "residencyCount": number,             // separate on-site trips per year; 0 if online
  "longestStretchDays": number,         // days of the longest single on-site trip
  "hoursPerWeekMin": number,            // the school's own estimate only; if it gives one number, use it for both min and max
  "hoursPerWeekMax": number,
  "workCompatible": boolean,            // designed for people working full time
  "city": string, "country": "US",      // primary on-site location
  "tuitionUsd": number,                 // total program tuition
  "tuitionIncludes": string,            // what the tuition covers
  "paymentOptions": string[],           // only those published: installments, employer sponsorship, loans, scholarships, early payment discount
  "minExperienceYears": number,
  "accreditation": string[],            // e.g. ["AACSB"]; [] for non-degree
  "cohortMedianExperienceYears": number,// median, or average if only the average is published (say which)
  "cohortSeniority": string,            // e.g. "mostly directors and VPs", from the class profile
  "lodgingPerNightUsd": number,         // GSA per diem lodging rate for the program city, current fiscal year
  "nextStartDate": string,
  "sources": [ { "field": string, "url": string, "quote": string, "checkedOn": "YYYY-MM-DD" } ]
  // For an in-person or hybrid program, include one source with field "campusAddress": the street address of the campus where classes meet, quoted verbatim from the school's official page.
}

PART 2: evidence for ratings (facts with sources, no scores):
- Leadership focus: how central leading people and organizations is to the curriculum (list the leadership modules or courses).
- Depth: the main field of study, credit hours, capstone, research or thesis content, faculty involvement.
- Degree path: the credential awarded, academic credit or CEUs, and whether credits officially count toward a graduate degree (quote it).
- Classmates: cohort size, median or average years of experience, typical titles, in-person time together, alumni access.
- Career change: career services, recruiting, internships or support for changing industry, role or city.
- Cost: tuition against duration and credential.

End with a list of anything uncertain or conflicting between official pages.
```

---

## Prompt 1, research: program blocks (paste one after the instructions)

### Program 1: MIT Technology Leadership Program

```
Program: MIT Technology Leadership Program (MIT Professional Education).
Start from: https://professional.mit.edu/course-catalog/technology-leadership-program
Category: executive.
Pay special attention to: the number, length and location of campus immersions; the weekly time for the live online part; whether continuing-education units (CEUs) are awarded and how many; who the program is aimed at and any published participant profile.
```

### Program 2: Wharton MBA for Executives

```
Program: The Wharton School MBA for Executives (University of Pennsylvania).
Start from: https://executivemba.wharton.upenn.edu/class-profile/
Category: emba.
Wharton runs this program in Philadelphia and San Francisco, and may also offer a hybrid option. Research the San Francisco option. If a hybrid option exists, note its schedule in Part 2 as an alternative.
Pay special attention to: the class schedule (how often class weekends happen and how many days each lasts), the total on-site days per year, the residencies (week-long sessions), tuition for the full program and what it covers, and the class profile (average or median years of experience, typical titles).
```

### Program 3: Northwestern Master of Engineering Management

```
Program: Northwestern University Master of Engineering Management (MEM), McCormick School of Engineering.
Start from: https://mccormick.northwestern.edu/engineering-management/
Category: specialized_masters.
Research the part-time option, which is aimed at working professionals. Note the full-time option's experience profile in Part 2 for comparison.
Pay special attention to: whether classes are evenings, weekends or online; the number of courses or units and the typical time to finish; tuition per unit or course and the total; the student body profile (average years of experience).
```

### Program 4: Harvard Extension School graduate certificate (leadership)

```
Program: a Harvard Extension School graduate certificate focused on leadership or management.
Start from: https://extension.harvard.edu/academics/graduate-certificates/
Category: certificate.
First, list the graduate certificates whose main focus is leadership or management (for example Leadership and Management, or Strategic Management). Pick the one most focused on leading people and organizations, say why, and research that one.
Pay special attention to: the number of courses and how many can be taken online; any on-campus requirement; tuition per course and the total; whether the credits can count toward a Harvard Extension master's degree; admission requirements.
```

---

## Prompt 2, rating (new thread, thinking model)

Updated Oct 9 for need-based ranking (`docs/need-based-ranking.md`): the program is rated on the same five needs the user ranks, 1 to 5. Paste everything in the block, then replace the last line with the whole research answer for one program.

Updated again Oct 9 after Yami's review of the first 4 ratings (issue #87): evidence rules for senior peers and career change, the latest class profile counts, every rubric level defined, and one valid JSON answer with short card-ready notes. The reviewed values sit at the end of each `docs/research/<id>-rating.md`, under "Reviewed ratings".

**Re-rating a program already researched** (MIT TLP, Wharton EMBA SF, Northwestern MEM, Harvard Extension): no new research. Open a new thread with the same thinking model, paste this prompt, paste the saved `docs/research/<id>.md` at the end, and save the answer over `docs/research/<id>-rating.md`.

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
