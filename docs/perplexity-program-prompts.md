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
3. If an official page does not state a fact, write null and say "not published". Do not estimate, infer, average or round. A fact from a page about a different year or intake counts as not published unless the page says it still applies.
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
}

PART 2: evidence for ratings (facts with sources, no scores):
- Network: cohort size, alumni network size or access, in-person time, typical titles of participants.
- Academic depth: credit hours, research or thesis content, faculty involvement.
- Practicality: schedule flexibility, applied or capstone projects, online share.
- Cost value: tuition against duration and credential.
- Leadership focus: how central leadership is to the curriculum (list the leadership modules or courses).

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

Paste everything in the block, then replace the last line with the whole research answer for one program.

```
You are rating one US leadership program for a curated dataset that helps senior tech, product and engineering leaders (8+ years of experience, already holding a degree) choose their next educational step.

Below is research on the program, taken only from its official pages, with a URL and a verbatim quote for each fact. Use ONLY these facts. Do not search the web and do not add facts from memory. If a fact you need is missing, say so and rate from what is there, marking that rating "low evidence".

Rate the program 1 to 5 on four ratings, integers only, against this rubric:

Network (cohort and alumni access, in-person time):
  1 = self-paced or no cohort; 2 = online cohort, little interaction; 3 = live cohort, mostly online, or a short in-person stint;
  4 = several in-person residencies with a senior cohort; 5 = sustained in-person time with a senior cohort plus a large, active alumni network.
Academic depth (credit hours, research or thesis content, faculty):
  1 = a few hours on one skill; 2 = a short course or non-credit program of a few weeks; 3 = a substantial non-degree program or a credit-bearing certificate;
  4 = a master's-level degree with applied focus; 5 = a full degree with research or a thesis and core faculty.
Practicality (schedule fit for someone working full time, applied projects):
  1 = needs a full-time break and offers no applied work; 3 = workable with effort, some applied work;
  5 = designed for working leaders, flexible schedule, projects on the participant's own organization.
Cost value (tuition against duration and credential; ignore travel):
  1 = high price for a short program or weak credential; 3 = in line with similar programs of its type;
  5 = low price for its length and credential.

For each rating, give one line saying why, citing the facts it rests on.

Return exactly:
"ratings": { "network": n, "depth": n, "practicality": n, "costValue": n },
"ratingNotes": { "network": "...", "depth": "...", "practicality": "...", "costValue": "..." },
"lowEvidence": [ list of ratings marked low evidence, or empty ]

Research:
<paste the whole research answer here>
```
