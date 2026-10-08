<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# You are researching one US university program for a curated dataset. Accuracy matters more than completeness.

Rules:

1. Use ONLY the program's or university's official web pages (its own domain). Never use rankings, aggregators, news, forums, Wikipedia or third-party course sites. The one exception is the GSA per diem site (gsa.gov) for the lodging rate.
2. For every fact, give: the value, the exact URL it came from, and a short verbatim quote from that page that shows it.
3. If an official page does not state a fact, write null and say "not published". Do not estimate, infer, average or round. A fact from a page about a different year or intake counts as not published unless the page says it still applies.
4. Use the most recent intake or cohort the official pages describe, and say which one.
5. Money in US dollars as published. Say whether tuition includes fees, materials, lodging or meals.

Return two parts.

PART 1: a JSON object with exactly these fields (null where not published):
{
"name": string, // as on the official page
"institution": string,
"category": "mba" | "emba" | "specialized_masters" | "executive" | "certificate" | "short_course",
"credential": string, // e.g. "MBA", "Certificate of completion"
"format": "in_person" | "hybrid" | "online",
"durationMonths": number,
"credits": string, // what it awards beyond the certificate: "none", "42 CEUs", "16 graduate credits"
"onsiteDaysPerYear": number, // total on-site days incl. residencies and weekend sessions; 0 if online
"residencyCount": number, // separate on-site trips per year; 0 if online
"longestStretchDays": number, // days of the longest single on-site trip
"hoursPerWeekMin": number, // the school's own estimate only; if it gives one number, use it for both min and max
"hoursPerWeekMax": number,
"workCompatible": boolean, // designed for people working full time
"city": string, "country": "US", // primary on-site location
"tuitionUsd": number, // total program tuition
"tuitionIncludes": string, // what the tuition covers
"paymentOptions": string[], // only those published: installments, employer sponsorship, loans, scholarships, early payment discount
"minExperienceYears": number,
"accreditation": string[], // e.g. ["AACSB"]; [] for non-degree
"cohortMedianExperienceYears": number,// median, or average if only the average is published (say which)
"cohortSeniority": string, // e.g. "mostly directors and VPs", from the class profile
"lodgingPerNightUsd": number, // GSA per diem lodging rate for the program city, current fiscal year
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

Program: Northwestern University Master of Engineering Management (MEM), McCormick School of Engineering.
Start from: https://mccormick.northwestern.edu/engineering-management/
Category: specialized_masters.
Research the part-time option, which is aimed at working professionals. Note the full-time option's experience profile in Part 2 for comparison.
Pay special attention to: whether classes are evenings, weekends or online; the number of courses or units and the typical time to finish; tuition per unit or course and the total; the student body profile (average years of experience).

The latest named **part-time intake is Fall 2027**, but the published tuition evidence is for **2026–2027**, not that intake. I have kept unpublished totals, year-mismatched figures, and unsupported conversions out of the JSON.[^1][^2][^3]

**Verification limitation:** The evidence below comes from official-page search excerpts, not a complete review of every linked page. Accordingly, “not published” means **not published in the verified evidence available here**, rather than a definitive claim that Northwestern publishes it nowhere.

## Part 1: JSON

```json
{
  "name": "Master of Engineering Management",
  "institution": "Northwestern University",
  "category": "specialized_masters",
  "credential": "Master of Engineering Management",
  "format": null,
  "durationMonths": null,
  "credits": null,
  "onsiteDaysPerYear": null,
  "residencyCount": null,
  "longestStretchDays": null,
  "hoursPerWeekMin": null,
  "hoursPerWeekMax": null,
  "workCompatible": true,
  "city": "Evanston",
  "country": "US",
  "tuitionUsd": null,
  "tuitionIncludes": null,
  "paymentOptions": [
    "scholarships",
    "loans"
  ],
  "minExperienceYears": null,
  "accreditation": null,
  "cohortMedianExperienceYears": null,
  "cohortSeniority": null,
  "lodgingPerNightUsd": null,
  "nextStartDate": null,
  "sources": [
    {
      "field": "name",
      "url": "https://www.mccormick.northwestern.edu/engineering-management/",
      "quote": "Master of Engineering Management",
      "checkedOn": "2026-10-08"
    },
    {
      "field": "institution",
      "url": "https://www.mccormick.northwestern.edu/engineering-management/",
      "quote": "Northwestern University’s Evanston campus",
      "checkedOn": "2026-10-08"
    },
    {
      "field": "category",
      "url": "https://www.mccormick.northwestern.edu/engineering-management/curriculum/",
      "quote": "Master of Engineering Management degree",
      "checkedOn": "2026-10-08"
    },
    {
      "field": "credential",
      "url": "https://www.mccormick.northwestern.edu/engineering-management/curriculum/",
      "quote": "Master of Engineering Management degree",
      "checkedOn": "2026-10-08"
    },
    {
      "field": "workCompatible",
      "url": "https://www.mccormick.northwestern.edu/engineering-management/",
      "quote": "Choose the part-time option to accommodate work or personal needs",
      "checkedOn": "2026-10-08"
    },
    {
      "field": "city",
      "url": "https://www.mccormick.northwestern.edu/engineering-management/",
      "quote": "Northwestern University’s Evanston campus",
      "checkedOn": "2026-10-08"
    },
    {
      "field": "paymentOptions",
      "url": "https://www.mccormick.northwestern.edu/engineering-management/overview/tuition/financial-aid.html",
      "quote": "The Albert H. Rubenstein Memorial Scholarship is based on merit and is awarded during the application process.",
      "checkedOn": "2026-10-08"
    },
    {
      "field": "paymentOptions",
      "url": "https://www.mccormick.northwestern.edu/academics/graduate/prospective-student-resources/financial-aid.html",
      "quote": "master’s students are provided with a variety of federal and private loan options",
      "checkedOn": "2026-10-08"
    }
  ]
}
```

`country` follows the requested US-program scope; a separate country statement was not captured. `category` is the requested classification, supported by the published master’s-degree description.[^4]

### Intake and null handling

| Field | Value or reason | Official URL and evidence |
| :-- | :-- | :-- |
| Latest named part-time intake | **Fall 2027**; exact first class date **not published** | [Program homepage](https://www.mccormick.northwestern.edu/engineering-management/), quote: “Fall: May 1, 2027” under part-time admissions; this is a deadline, not a start date. [^1] |
| `durationMonths` | **null — not published as a single month value**; the published typical range is **2–3 years** | [Program homepage](https://www.mccormick.northwestern.edu/engineering-management/), quote: “Part-time option: 2-3 years”. [^1] |
| `format` | **null — exact modality not published in the captured evidence**; campus location and scheduled classes are published, but no verified statement establishes the online share | [Program homepage](https://www.mccormick.northwestern.edu/engineering-management/), quote: “Classes held Monday - Thursday evenings + Saturday mornings”. [^1] |
| `credits` | **null — total credit/unit award not published in the captured evidence**; **12 courses minimum** is published | [Curriculum](https://www.mccormick.northwestern.edu/engineering-management/curriculum/), quote: “A minimum number of 12 courses is required”. [^4] |
| `tuitionUsd` | **null — fixed total not published**; do not multiply a current rate across a multiyear degree | [Tuition](https://www.mccormick.northwestern.edu/engineering-management/overview/tuition/), quote: “A student's total tuition cost will depend on the number of courses taken per quarter”. [^3] |
| `tuitionIncludes` | **null — not published** for the relevant intake; fees, materials, lodging, and meals cannot be marked included or excluded | [Tuition](https://www.mccormick.northwestern.edu/engineering-management/overview/tuition/) publishes tuition rates but the captured evidence does not specify an inclusion package. [^3] |
| `lodgingPerNightUsd` | **null — Evanston’s FY2027 lodging rate not verified**; the standard national rate cannot be substituted | [GSA per diem rates](https://www.gsa.gov/travel/plan-a-trip/per-diem-rates), quote: “FY 2027 per diem rates now available”. [^5] |

The following remain **null — not published in verified evidence**: annual on-site days, annual separate trips, longest trip, weekly workload minimum/maximum, minimum experience, accreditation, cohort median/average experience, and cohort seniority. No absence-supporting quotations are supplied, because a quotation cannot establish that a fact is absent from an entire website.

## Part 2: Rating evidence

### Network

| Fact | Value | Exact official URL and short quote |
| :-- | :-- | :-- |
| Cohort size | **null — not published** in verified evidence | No supporting statement captured |
| Alumni network size/access | **null — not published** in verified evidence | No supporting statement captured |
| In-person time | Evening/Saturday schedule published; total physical attendance and online share **null — not published** | [Program homepage](https://www.mccormick.northwestern.edu/engineering-management/), quote: “Classes held Monday - Thursday evenings + Saturday mornings”. [^1] |
| Target participant background | Experienced STEM professionals; not a cohort-specific seniority distribution | [Program homepage](https://www.mccormick.northwestern.edu/engineering-management/), quote: “designed for experienced STEM professionals”. [^1] |
| Student experience reference | Homepage mentions **seven years of STEM experience**, but the captured excerpt does not establish whether this is a mean, median, or part-time-only figure | [Program homepage](https://www.mccormick.northwestern.edu/engineering-management/), quote: “seven years STEM experience”. [^1] |
| Typical participant titles | **null — not published** in verified evidence | No supporting class-profile statement captured |
| Full-time experience profile | **null — not published** in verified evidence; the seven-year reference must not be assigned to full-time students | No verified full-time-specific experience statistic captured |

### Academic depth

| Fact | Value | Exact official URL and short quote |
| :-- | :-- | :-- |
| Required coursework | Minimum **12 courses**; do not relabel this as 12 credit hours | [Curriculum](https://www.mccormick.northwestern.edu/engineering-management/curriculum/), quote: “A minimum number of 12 courses is required”. [^4] |
| Core curriculum | **7 core courses** | [Curriculum](https://www.mccormick.northwestern.edu/engineering-management/curriculum/), quote: “Core Courses (7 Courses)”. [^4] |
| Advanced engineering requirement | At least **2 courses** from the specified advanced-engineering list | [Curriculum](https://www.mccormick.northwestern.edu/engineering-management/curriculum/), quote: “You must select at least two from this list of advanced engineering courses.” [^4] |
| Seminar | MEM 490; **0 units** | [Curriculum](https://www.mccormick.northwestern.edu/engineering-management/curriculum/), quote: “The MEM seminar is a 0-unit course”. [^4] |
| Academic scope | Management, quantitative analysis, behavioral science, and advanced engineering electives | [Curriculum](https://www.mccormick.northwestern.edu/engineering-management/curriculum/), quote: “management, quantitative analysis, and behavioral science”. [^4] |
| Research/thesis requirement | **null — not published** in verified evidence | No verified thesis or research requirement captured |
| Faculty involvement | **null — not published** at the requested level of specificity | No verified teaching or project-supervision description captured |

### Practicality

| Fact | Value | Exact official URL and short quote |
| :-- | :-- | :-- |
| Class schedule | Monday–Thursday evenings and Saturday mornings; exact clock times **not published** in verified evidence | [Program homepage](https://www.mccormick.northwestern.edu/engineering-management/), quote: “Classes held Monday - Thursday evenings + Saturday mornings”. [^1] |
| Saturday option | Saturday classes are available; an entirely Saturday-only degree is not established | [Program homepage](https://www.mccormick.northwestern.edu/engineering-management/), quote: “including the option of taking Saturday classes”. [^1] |
| Typical part-time completion | **2–3 years** | [Program homepage](https://www.mccormick.northwestern.edu/engineering-management/), quote: “Part-time option: 2-3 years”. [^1] |
| Entry flexibility | May start in any academic quarter | [Program homepage](https://www.mccormick.northwestern.edu/engineering-management/), quote: “Start in any academic quarter”. [^1] |
| Required capstone choice | MEM 436 in fall **or** MEM 437 in spring | [Curriculum](https://www.mccormick.northwestern.edu/engineering-management/curriculum/), quotes: “MEM 436: Technology Strategy for Products (offered in Fall)” and “MEM 437: Strategic Management for Engineers (offered in Spring)”. [^4] |
| Applied simulation | Engineering Management includes team decisions and rotating leadership roles | [Areas of Focus](https://www.mccormick.northwestern.edu/engineering-management/overview/innovation-strategic-thinking-leadership.html), quote: “Students take turns performing in leadership roles in a competitive scenario.” [^6] |
| External-client projects | Published summer projects involve full-time paid work; availability for employed part-time students is **not established** | [Student Projects](https://www.mccormick.northwestern.edu/engineering-management/curriculum/student-projects/), quote: “work full-time as a paid experience, similar to that of an internship”. [^7] |
| Online share | **null — not published** in verified evidence | No supporting percentage or modality statement captured |

### Cost value

These are **2026–2027 reference rates**, not verified Fall 2027 intake prices.[^2][^3]


| Fact | Value | Exact official URL and short quote |
| :-- | :-- | :-- |
| Part-time tuition per course | \*\*US\$8,100**, 2026–2027 | [Program Tuition](https://www.mccormick.northwestern.edu/engineering-management/overview/tuition/), quote: “\$8,100 per course for part-time students”. [^3] |
| Part-time tuition per unit | \*\*US\$8,100**, 2026–2027 | [Student Finance](https://www.northwestern.edu/sfs/tuition/graduate/mccormick.html), quote: “Part-time Tuition \$8,100/unit”. [^2] |
| Part-time registration definition | Fewer than **3 units** | [Student Finance](https://www.northwestern.edu/sfs/tuition/graduate/mccormick.html), quote: “Part-time is less than 3 units.” [^2] |
| Billing timing | First invoice each quarter; this does **not** establish an installment plan | [Student Finance](https://www.northwestern.edu/sfs/tuition/graduate/mccormick.html), quote: “Tuition is billed on the first invoice for each quarter.” [^2] |
| Total tuition | **null — not published** as a fixed total | [Program Tuition](https://www.mccormick.northwestern.edu/engineering-management/overview/tuition/), quote: “A student's total tuition cost will depend”. [^3] |
| Credential and duration | Master’s degree; typical part-time duration **2–3 years** | [Curriculum](https://www.mccormick.northwestern.edu/engineering-management/curriculum/), quote: “Master of Engineering Management degree”; [Program homepage](https://www.mccormick.northwestern.edu/engineering-management/), quote: “Part-time option: 2-3 years”. [^4][^1] |
| Scholarship | Merit-based Albert H. Rubenstein Memorial Scholarship; individual eligibility/award not guaranteed | [Financial Aid](https://www.mccormick.northwestern.edu/engineering-management/overview/tuition/financial-aid.html), quote: “based on merit and is awarded during the application process”. [^8] |
| Loans | Federal/private loans described for McCormick master’s students; individual eligibility not established | [Graduate Financial Aid](https://www.mccormick.northwestern.edu/academics/graduate/prospective-student-resources/financial-aid.html), quote: “a variety of federal and private loan options”. [^9] |

### Leadership focus

Leadership is explicitly identified as a central curriculum component.[^6]


| Course or component | Published evidence | Exact official URL and short quote |
| :-- | :-- | :-- |
| MEM 424: Leadership and Organizational Behavior | Required core course | [Curriculum](https://www.mccormick.northwestern.edu/engineering-management/curriculum/), quote: “MEM 424: Leadership and Organizational Behavior”. [^4] |
| MEM 402: Engineering Management | Required core course; leadership-role practice | [Curriculum](https://www.mccormick.northwestern.edu/engineering-management/curriculum/), quote: “MEM 402: Engineering Management”; [Areas of Focus](https://www.mccormick.northwestern.edu/engineering-management/overview/innovation-strategic-thinking-leadership.html), quote: “Students take turns performing in leadership roles”. [^4][^6] |
| Leadership curriculum emphasis | Explicit program emphasis, not merely an inferred benefit | [Areas of Focus](https://www.mccormick.northwestern.edu/engineering-management/overview/innovation-strategic-thinking-leadership.html), quote: “leadership is core component of our coursework”. [^6] |
| Self-management and execution | Task orientation and self-management are identified components | [Areas of Focus](https://www.mccormick.northwestern.edu/engineering-management/overview/innovation-strategic-thinking-leadership.html), quote: “task orientation and self management”. [^6] |

## Uncertainties and conflicts

- **Intake versus price year:** Fall 2027 is the latest named part-time intake, while verified prices cover 2026–2027; those prices cannot be represented as Fall 2027 tuition.[^3][^1][^2]
- **Course versus unit:** The program publishes US\$8,100 **per course**, while Student Finance publishes US\$8,100 **per unit**; the captured evidence does not explicitly establish a one-to-one mapping for every required course.[^2][^3]
- **Seminar counting:** The curriculum states a 12-course minimum and separately identifies a zero-unit seminar; its counting treatment needs confirmation before assigning total awarded units.[^4]
- **Experience statistic:** The seven-year homepage reference lacks a verified mean/median label, cohort year, and part-time/full-time split in the captured evidence.[^1]
- **Credential naming:** The program says “Master of Engineering Management,” while an older financial-aid page says “Master of Science in Engineering Management”; the exact diploma title needs confirmation.[^10][^4]
- **Older costs:** The financial-aid cost-of-attendance page describes 2025–2026, so its fees and living-cost figures are not valid evidence for the latest intake.[^10]
- **Attendance and workload:** Evening/Saturday scheduling does not establish annual on-site days, separate trips, online percentage, or weekly study hours.[^1]
- **Unresolved evidence:** Full-time experience profile, cohort size, alumni access, seniority distribution, accreditation, tuition inclusions, exact start date, and Evanston’s FY2027 GSA lodging rate remain unverified.

<span style="display:none">[^11][^12][^13][^14][^15][^16][^17][^18][^19][^20][^21][^22][^23][^24][^25][^26]</span>

<div align="center">⁂</div>

[^1]: https://www.mccormick.northwestern.edu/engineering-management/

[^2]: https://www.northwestern.edu/sfs/tuition/graduate/mccormick.html

[^3]: https://www.mccormick.northwestern.edu/engineering-management/overview/tuition/

[^4]: https://www.mccormick.northwestern.edu/engineering-management/curriculum/

[^5]: https://www.gsa.gov/travel/plan-a-trip/per-diem-rates

[^6]: https://www.mccormick.northwestern.edu/engineering-management/overview/innovation-strategic-thinking-leadership.html

[^7]: https://www.mccormick.northwestern.edu/engineering-management/curriculum/student-projects/

[^8]: https://www.mccormick.northwestern.edu/engineering-management/overview/tuition/financial-aid.html

[^9]: https://www.mccormick.northwestern.edu/academics/graduate/prospective-student-resources/financial-aid.html

[^10]: https://www.northwestern.edu/evanston-graduate-financial-aid/getting-started/tuition-cost-of-attendance/meas/mem.html

[^11]: https://www.gsa.gov/travel/plan-book/per-diem-rates/per-diem-rates-results?action=perdiems_report\&fiscal_year=2027\&city=\&state=IL\&zip=61242

[^12]: https://www.gsa.gov/policy-regulations/regulations/federal-travel-regulation/ftr-and-related-files/gsa-per-diem-bulletin-ftr-2701

[^13]: https://www.gsa.gov/travel/plan-a-trip/per-diem-rates/per-diem-files

[^14]: https://www.gsa.gov/travel/plan-a-trip/per-diem-rates/faqs

[^15]: https://www.mccormick.northwestern.edu/

[^16]: https://sgmp.memberclicks.net/gsa-per-diem-rates

[^17]: https://blog.data-basics.com/gsa-per-diem-rates-fy2027

[^18]: https://nbyula.com/study-abroad/northwestern-university/mccormick/master-of-engineering-management/

[^19]: https://www.mccormick.northwestern.edu/engineering-management/current-students/once-accepted.html

[^20]: https://www.mccormick.northwestern.edu/academics/graduate/programs/full-time-masters.html

[^21]: https://www.mccormick.northwestern.edu/students/graduate/

[^22]: https://www.mccormick.northwestern.edu/academics/undergraduate/

[^23]: https://yocket.com/universities/northwestern-university/engineering-management-25845

[^24]: https://www.mccormick.northwestern.edu/academics/graduate/

[^25]: https://www.edc.northwestern.edu/index.html

[^26]: https://www.gyandhan.com/study-abroad/usa/universities/northwestern-university-kellogg-mccormick/courses/master-of-engineering-management-mem

