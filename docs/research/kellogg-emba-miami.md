<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# You are researching one US university program for a curated dataset. Accuracy matters more than completeness.

Rules:

1. Use ONLY the program’s or university’s official web pages (its own domain). Never use rankings, aggregators, news, forums, Wikipedia or third-party course sites. The one exception is the GSA per diem site (gsa.gov) for the lodging rate.
2. For every fact, give: the value, the exact URL it came from, and a short verbatim quote from that page that shows it.
3. If an official page does not state a fact, write null and say “not published”. Do not estimate, infer, average or round. A fact from a page about a different year or intake counts as not published unless the page says it still applies. Exception: for cohort facts (experience, titles, class size), use the most recent published class profile even when it describes an earlier class, and say which class.
4. Use the most recent intake or cohort the official pages describe, and say which one.
5. Money in US dollars as published. Say whether tuition includes fees, materials, lodging or meals.
Return two parts.
PART 1: a JSON object with exactly these fields (null where not published):
{
“name”: string, // as on the official page
“institution”: string,
“category”: “mba” | “emba” | “specialized_masters” | “executive” | “certificate” | “short_course”,
“credential”: string, // e.g. “MBA”, “Certificate of completion”
“format”: “in_person” | “hybrid” | “online”,
“durationMonths”: number,
“credits”: string, // what it awards beyond the certificate: “none”, “42 CEUs”, “16 graduate credits”
“onsiteDaysPerYear”: number, // total on-site days incl. residencies and weekend sessions; 0 if online
“residencyCount”: number, // separate on-site trips per year; 0 if online
“longestStretchDays”: number, // days of the longest single on-site trip
“hoursPerWeekMin”: number, // the school’s own estimate only; if it gives one number, use it for both min and max
“hoursPerWeekMax”: number,
“workCompatible”: boolean, // designed for people working full time
“city”: string, “country”: “US”, // primary on-site location
“tuitionUsd”: number, // total program tuition
“tuitionIncludes”: string, // what the tuition covers
“paymentOptions”: string[], // only those published: installments, employer sponsorship, loans, scholarships, early payment discount
“minExperienceYears”: number,
“accreditation”: string[], // e.g. [“AACSB”]; [] for non-degree
“cohortMedianExperienceYears”: number,// median, or average if only the average is published (say which)
“cohortSeniority”: string, // e.g. “mostly directors and VPs”, from the class profile
“lodgingPerNightUsd”: number, // GSA per diem lodging rate for the program city, current fiscal year
“nextStartDate”: string,
“sources”: [ { “field”: string, “url”: string, “quote”: string, “checkedOn”: “YYYY-MM-DD” } ]
// For an in-person or hybrid program, include one source with field “campusAddress”: the street address of the campus where classes meet, quoted verbatim from the school’s official page.
}
PART 2: evidence for ratings (facts with sources, no scores):
• Leadership focus: how central leading people and organizations is to the curriculum (list the leadership modules or courses).
• Depth: the main field of study, credit hours, capstone, research or thesis content, faculty involvement.
• Degree path: the credential awarded, academic credit or CEUs, and whether credits officially count toward a graduate degree (quote it).
• Classmates: cohort size, median or average years of experience, typical titles, in-person time together, alumni access.
• Career change: career services, recruiting, internships or support for changing industry, role or city.
• Cost: tuition against duration and credential.
End with a list of anything uncertain or conflicting between official pages.

Program: Kellogg School of Management Executive MBA (Northwestern University).
Start from: https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/
Category: emba.
Kellogg runs this program in Chicago (classes twice a month) and Miami (classes once a month, Thursday to Sunday). Research the Miami option. Note the Chicago schedule in Part 2 as an alternative.
Pay special attention to: the Miami class schedule (how many class sessions a year, the days each lasts, the program length in months), the intensive weeks (how many, how long, where, including Global Network Week), the total on-site days per year, tuition for the full program and what it covers (lodging, meals, materials), the class profile (median or average years of experience, typical titles, class size), career services open to EMBA students, and the next start date.

**The Miami option is a two-year Executive MBA with monthly Thursday–Sunday classes and four intensive weeks across the program, including orientation and Global Network Week.** The most recent intake explicitly identified in the available Miami calendar is **January 2027**; annual attendance totals and several other requested details remain unverified and are left null rather than inferred.[^1][^2]

## PART 1: JSON

```json
{
  "name": "Executive MBA Program",
  "institution": "Northwestern University",
  "category": "emba",
  "credential": "MBA",
  "format": "in_person",
  "durationMonths": 24,
  "credits": null,
  "onsiteDaysPerYear": null,
  "residencyCount": null,
  "longestStretchDays": null,
  "hoursPerWeekMin": null,
  "hoursPerWeekMax": null,
  "workCompatible": null,
  "city": "Coral Gables",
  "country": "US",
  "tuitionUsd": 205486,
  "tuitionIncludes": "The 2026–2027 two-year estimated expense table lists tuition separately from required food and housing: tuition $205,486; food and housing $42,986; total $248,472. Inclusion of fees and materials is not published in the verified evidence.",
  "paymentOptions": [
    "installments"
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
      "url": "https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/",
      "quote": "The Kellogg Executive MBA Program",
      "checkedOn": "2026-10-10"
    },
    {
      "field": "institution",
      "url": "https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/",
      "quote": "Northwestern University",
      "checkedOn": "2026-10-10"
    },
    {
      "field": "category",
      "url": "https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/",
      "quote": "Executive MBA",
      "checkedOn": "2026-10-10"
    },
    {
      "field": "credential",
      "url": "https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/",
      "quote": "earn your MBA in two years flat.",
      "checkedOn": "2026-10-10"
    },
    {
      "field": "format",
      "url": "https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/",
      "quote": "once a month on the Miami, FL, campus.",
      "checkedOn": "2026-10-10"
    },
    {
      "field": "durationMonths",
      "url": "https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/",
      "quote": "earn your MBA in two years flat.",
      "checkedOn": "2026-10-10"
    },
    {
      "field": "city",
      "url": "https://www.kellogg.northwestern.edu/programs/executive-mba/global-network/miami-kellogg/",
      "quote": "Located in Coral Gables, Florida",
      "checkedOn": "2026-10-10"
    },
    {
      "field": "country",
      "url": "https://www.kellogg.northwestern.edu/programs/executive-mba/",
      "quote": "two prime U.S. locations",
      "checkedOn": "2026-10-10"
    },
    {
      "field": "tuitionUsd",
      "url": "https://www.kellogg.northwestern.edu/admissions/financial-aid/emba-fin-aid/",
      "quote": "Tuition\nFood and housing\nEstimated expenses\n$205,486\n$42,986\n$248,472",
      "checkedOn": "2026-10-10"
    },
    {
      "field": "tuitionIncludes",
      "url": "https://www.kellogg.northwestern.edu/admissions/financial-aid/emba-fin-aid/",
      "quote": "Tuition and Food and Housing are both required expenses for the Kellogg EMBA program.",
      "checkedOn": "2026-10-10"
    },
    {
      "field": "paymentOptions",
      "url": "https://www.kellogg.northwestern.edu/admissions/financial-aid/emba-fin-aid/",
      "quote": "Tuition is billed by academic quarter. There are six academic quarters in the program and tuition is divided equally over them.",
      "checkedOn": "2026-10-10"
    },
    {
      "field": "nextStartDate",
      "url": "https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/miami-monthly/",
      "quote": "January 2027 - First Year Calendar",
      "checkedOn": "2026-10-10"
    },
    {
      "field": "campusAddress",
      "url": "https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/miami-monthly/",
      "quote": null,
      "checkedOn": "2026-10-10"
    }
  ]
}
```

**Null interpretation:** “Not published” in the verified official-page evidence—not a claim that the information appears nowhere on the university’s website. The required Miami street address was not established; the Evanston footer address must not be substituted.

**Duration treatment:** 24 months is an exact unit conversion of the published “2 years,” not a separately published month count.[^2]

## PART 2: Rating evidence

### Schedule and intensive weeks

| Fact | Value | Exact official URL | Short verbatim evidence |
| :-- | :-- | :-- | :-- |
| Miami frequency | Once monthly; an exact annual session count is not published in the verified evidence | [https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/](https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/) | “1x month” [^2] |
| Regular Miami session | Thursday afternoon to midday Sunday; partial arrival/departure days, not four full teaching days | [https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/miami-monthly/](https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/miami-monthly/) | “beginning Thursday afternoon and ending midday Sunday” [^1] |
| Program length | Two years | [https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/](https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/) | “Program Duration” / “2 years” [^2] |
| Intensive weeks | Four across the program; annual distribution and complete locations/durations not published in the verified evidence | [https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/](https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/) | “Intensive Weeks” / “4”; “Includes new student orientation and Global Network Week.” [^2] |
| January 2027 launch | Check-in January 11; programming January 12–17 | [https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/miami-monthly/](https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/miami-monthly/) | “Check-in: January 11, 2027”; “Programming: January 12 - 17, 2027” [^1] |
| Published summer intensive | July 13–17, 2027; location not established | [https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/miami-monthly/](https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/miami-monthly/) | “July 13 - 17, 2027 (Intensive week)” [^1] |
| Global Network Week | August 2027; exact dates, duration and location not established | [https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/miami-monthly/](https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/miami-monthly/) | “August 2027 (Global network week)” [^1] |
| Chicago alternative | Twice monthly, Friday–Saturday and most Sundays; two years, four intensive weeks | [https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/](https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/) | “2x month”; “Friday–Saturday, most Sundays”; “4”; “2 years” [^2] |

**Total on-site days, separate trips per year and longest trip: null — not published in the verified evidence.** Monthly frequency is insufficient to establish annual totals, particularly when intensive weeks and Global Network Week are additional schedule components.[^1][^2]

### Leadership focus

- **Leadership modules or courses:** null — not published in the verified evidence.
- **Centrality of leadership to the curriculum:** null — no verified course-level evidence sufficient for a rating.


### Depth

| Fact | Value | Exact official URL | Short verbatim evidence |
| :-- | :-- | :-- | :-- |
| Field and degree | MBA | [https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/](https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/) | “earn your MBA” [^2] |
| Faculty involvement | Students learn from Kellogg faculty | [https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/](https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/) | “learn from Kellogg’s leading faculty” [^2] |
| Academic credits | null — not published in the verified evidence | — | — |
| Capstone, research or thesis | null — not published in the verified evidence | — | — |
| Detailed curriculum | null — not published in the verified evidence | — | — |

### Degree path

- **Credential:** MBA; URL: [https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/](https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/); quote: “earn your MBA.”[^2]
- **Academic credits or CEUs:** null — not published in the verified evidence.
- **Official statement about credits counting toward a graduate degree:** null — not published in the verified evidence; no credit-transfer or degree-applicability claim is made.


### Classmates

| Fact | Value | Exact official URL | Short verbatim evidence |
| :-- | :-- | :-- | :-- |
| Most recent identified profile | September 2024 and January 2025 entrants | [https://www.kellogg.northwestern.edu/programs/executive-mba/emba-experience/class-profile/](https://www.kellogg.northwestern.edu/programs/executive-mba/emba-experience/class-profile/) | “September 2024 and January 2025” [^3] |
| Profile class size | 141 Miami; not established as one intake’s cohort size | [https://www.kellogg.northwestern.edu/programs/executive-mba/emba-experience/class-profile/](https://www.kellogg.northwestern.edu/programs/executive-mba/emba-experience/class-profile/) | “Class size: 144 Chicago, 141 Miami” [^3] |
| General Miami cohort range | 60–70; not a January 2027 actual enrollment count | [https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/](https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/) | “Cohort Size” / “60–70” [^2] |
| Seniority categories shown | Director, VP and C-suite; proportion not established, so no “mostly” claim | [https://www.kellogg.northwestern.edu/programs/executive-mba/emba-experience/class-profile/](https://www.kellogg.northwestern.edu/programs/executive-mba/emba-experience/class-profile/) | “Hold senior positions (Director + VP + C-Suite)” [^3] |
| Median or average experience | null — not published in the verified evidence | — | — |
| In-person time together | Monthly Thursday–Sunday sessions plus intensive weeks; annual day total unknown | [https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/](https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/) | “Thursday–Sunday”; “4” [^2] |
| Alumni access rights | null — specific access provisions not published in the verified evidence | — | — |

### Career change

**EMBA-specific career coaching, recruiting eligibility, internships and support for changing industry, role or city: null — not published in the verified evidence.** No inference is made from general Kellogg MBA services.

### Cost

| Fact | Value | Exact official URL | Short verbatim evidence |
| :-- | :-- | :-- | :-- |
| Published period | 2026–2027 academic-year expense table, covering the entire two-year program | [https://www.kellogg.northwestern.edu/admissions/financial-aid/emba-fin-aid/](https://www.kellogg.northwestern.edu/admissions/financial-aid/emba-fin-aid/) | “2026-2027 tuition and estimated expenses for entirety of the two-year EMBA program” [^4] |
| Tuition component | \$205,486, within an estimated expense table | [https://www.kellogg.northwestern.edu/admissions/financial-aid/emba-fin-aid/](https://www.kellogg.northwestern.edu/admissions/financial-aid/emba-fin-aid/) | “Tuition” / “\$205,486” [^4] |
| Required food and housing | \$42,986, separately itemized | [https://www.kellogg.northwestern.edu/admissions/financial-aid/emba-fin-aid/](https://www.kellogg.northwestern.edu/admissions/financial-aid/emba-fin-aid/) | “Food and housing” / “\$42,986” [^4] |
| Total estimated expense | \$248,472 | [https://www.kellogg.northwestern.edu/admissions/financial-aid/emba-fin-aid/](https://www.kellogg.northwestern.edu/admissions/financial-aid/emba-fin-aid/) | “Estimated expenses” / “\$248,472” [^4] |
| Quarterly billing | Six quarters, equal division; published quarterly amount \$41,412 | [https://www.kellogg.northwestern.edu/admissions/financial-aid/emba-fin-aid/](https://www.kellogg.northwestern.edu/admissions/financial-aid/emba-fin-aid/) | “the quarterly tuition is \$41,412” [^4] |
| University confirmation | \$41,412 per quarter for 2026–2027 | [https://www.northwestern.edu/sfs/tuition/graduate/kellogg.html](https://www.northwestern.edu/sfs/tuition/graduate/kellogg.html) | “Full-time Tuition \$41,412/quarter” [^5] |
| Fees and materials inclusion | null — not published in the verified evidence | — | — |
| GSA lodging rate | null — Miami/Coral Gables FY2027 rate not established from GSA | [https://www.gsa.gov/travel/plan-book/per-diem-rates?topnav=2027-fy-gsa-per-diem-rates](https://www.gsa.gov/travel/plan-book/per-diem-rates?topnav=2027-fy-gsa-per-diem-rates) | “FY 2027 per diem rates now available” establishes availability, not the local rate [^6] |

### Uncertainties and conflicts

- **Tuition terminology:** The financial-aid table separates \$205,486 tuition from \$42,986 food and housing, but its billing paragraph calls \$41,412 the quarterly “tuition.” These labels need reconciliation before treating \$205,486 as an unqualified contractual tuition figure.[^4][^5]
- **Intake applicability:** The cost page identifies academic year 2026–2027, not an explicit guaranteed January 2027 intake price.[^4]
- **Next start:** January 2027 is explicitly named, with January 11 check-in and January 12–17 launch programming; neither is explicitly labeled the official program start date, so `nextStartDate` remains null.[^1]
- **Application timing:** October 7, 2026 is labeled the last deadline for Winter 2027, preceding the October 10 check date; a forthcoming intake should not be mistaken for an intake still accepting applications.[^2]
- **Cohort size:** The profile’s 141 Miami students and the schedule’s 60–70 cohort range have different stated contexts; they should not be substituted for one another.[^3][^2]
- **Attendance:** A complete annual calendar, intensive-week locations, Global Network Week dates and all required arrival/departure days are needed before calculating days or trips.[^1][^2]
- **Still unverified:** Miami street address, credits, workload, explicit full-time-work compatibility, minimum experience, accreditation, cohort experience, detailed curriculum, alumni access, career services and the local FY2027 GSA lodging rate.

<span style="display:none">[^10][^11][^12][^13][^14][^15][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/miami-monthly/

[^2]: https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/

[^3]: https://www.kellogg.northwestern.edu/programs/executive-mba/emba-experience/class-profile/

[^4]: https://www.kellogg.northwestern.edu/admissions/financial-aid/emba-fin-aid/

[^5]: https://www.northwestern.edu/sfs/tuition/graduate/kellogg.html

[^6]: https://www.gsa.gov/travel/plan-book/per-diem-rates?topnav=2027-fy-gsa-per-diem-rates

[^7]: https://www.kellogg.northwestern.edu/programs/executive-mba/

[^8]: https://www.kellogg.northwestern.edu/programs/executive-mba/global-network/miami-kellogg/

[^9]: https://www.kellogg.northwestern.edu/the-experience/campuses/miami/

[^10]: https://www.joinleland.com/library/a/kellogg-executive-mba-program-overview

[^11]: https://gradsmatch.com/programs/northwestern-university/kellogg-miami-executive-mba-33804

[^12]: https://perdiemworld.com/us/florida/miami/

[^13]: https://www.federalpay.org/perdiem/2027/florida/miami

[^14]: https://www.libertify.com/universities/kellogg-executive-mba-guide/

[^15]: https://perdiemworld.com/gsa/fy2027-preview/

