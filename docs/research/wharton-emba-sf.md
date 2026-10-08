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

Program: The Wharton School MBA for Executives (University of Pennsylvania).
Start from: https://executivemba.wharton.upenn.edu/class-profile/
Category: emba.
Wharton runs this program in Philadelphia and San Francisco, and may also offer a hybrid option. Research the San Francisco option. If a hybrid option exists, note its schedule in Part 2 as an alternative.
Pay special attention to: the class schedule (how often class weekends happen and how many days each lasts), the total on-site days per year, the residencies (week-long sessions), tuition for the full program and what it covers, and the class profile (average or median years of experience, typical titles).

**The most recent intake described is the class entering in 2027; however, the available tuition, San Francisco calendar, and class-profile evidence concerns the 2026 intake / Class of 2028.** I have not carried those cohort-specific figures into the 2027 record.[^1][^2][^3]

## PART 1: JSON

For null fields, **“not published” means not established for the selected intake by the official evidence available here**, not a claim that no official page could contain it. In `sources`, that phrase is a missing-evidence marker, not a verbatim quotation.

```json
{
  "name": "MBA Program for Executives",
  "institution": "The Wharton School, University of Pennsylvania",
  "category": "emba",
  "credential": "MBA",
  "format": "in_person",
  "durationMonths": null,
  "credits": "19 course units",
  "onsiteDaysPerYear": null,
  "residencyCount": null,
  "longestStretchDays": null,
  "hoursPerWeekMin": null,
  "hoursPerWeekMax": null,
  "workCompatible": true,
  "city": "San Francisco",
  "country": "US",
  "tuitionUsd": null,
  "tuitionIncludes": null,
  "paymentOptions": null,
  "minExperienceYears": 8,
  "accreditation": null,
  "cohortMedianExperienceYears": null,
  "cohortSeniority": null,
  "lodgingPerNightUsd": null,
  "nextStartDate": null,
  "sources": [
    {
      "field": "name",
      "url": "https://executivemba.wharton.upenn.edu/emba-faqs/",
      "quote": "MBA Program for Executives",
      "checkedOn": "2026-10-08"
    },
    {
      "field": "institution",
      "url": "https://executivemba.wharton.upenn.edu/global-cohort/",
      "quote": "University of Pennsylvania’s campus in Philadelphia",
      "checkedOn": "2026-10-08"
    },
    {
      "field": "category",
      "url": "https://executivemba.wharton.upenn.edu/class-profile/",
      "quote": "Executive MBA Class Profile",
      "checkedOn": "2026-10-08"
    },
    {
      "field": "credential",
      "url": "https://executivemba.wharton.upenn.edu/emba-faqs/",
      "quote": "There is no difference in the degree earned by executive and full-time MBA students.",
      "checkedOn": "2026-10-08"
    },
    {
      "field": "format",
      "url": "https://executivemba.wharton.upenn.edu/emba-faqs/",
      "quote": "every-other-weekend residential format",
      "checkedOn": "2026-10-08"
    },
    {
      "field": "credits",
      "url": "https://executivemba.wharton.upenn.edu/emba-faqs/",
      "quote": "You must complete 19 course units at Wharton to earn your degree from our program.",
      "checkedOn": "2026-10-08"
    },
    {
      "field": "workCompatible",
      "url": "https://executivemba.wharton.upenn.edu/class-profile/",
      "quote": "Executive MBA students are required to maintain full-time employment throughout the duration of the program.",
      "checkedOn": "2026-10-08"
    },
    {
      "field": "city",
      "url": "https://executivemba.wharton.upenn.edu/emba-faqs/",
      "quote": "Philadelphia and San Francisco cohort members",
      "checkedOn": "2026-10-08"
    },
    {
      "field": "minExperienceYears",
      "url": "https://executivemba.wharton.upenn.edu/emba-application-requirements/",
      "quote": "at least eight (8)",
      "checkedOn": "2026-10-08"
    },
    {
      "field": "tuitionUsd",
      "url": "https://executivemba.wharton.upenn.edu/emba-tuition-financial-aid/",
      "quote": "Tuition and fees for the class entering in 2026 is $243,000 or $40,500 per academic term.",
      "checkedOn": "2026-10-08"
    },
    {
      "field": "cohortMedianExperienceYears",
      "url": "https://executivemba.wharton.upenn.edu/class-profile/",
      "quote": "Class of 2028",
      "checkedOn": "2026-10-08"
    },
    {
      "field": "onsiteDaysPerYear",
      "url": "https://executivemba.wharton.upenn.edu/wp-content/uploads/2026/03/cal_52_SF_TY_V6_03192026-1.pdf",
      "quote": "ACADEMIC CALENDAR: 2026–2028",
      "checkedOn": "2026-10-08"
    },
    {
      "field": "lodgingPerNightUsd",
      "url": "https://www.gsa.gov/travel/plan-a-trip/per-diem-rates",
      "quote": "FY 2027 per diem rates now available.",
      "checkedOn": "2026-10-08"
    },
    {
      "field": "nextStartDate",
      "url": "https://executivemba.wharton.upenn.edu/emba-faqs/",
      "quote": "The program begins in May each year.",
      "checkedOn": "2026-10-08"
    }
  ]
}
```

**Intake evidence:** [Application requirements](https://executivemba.wharton.upenn.edu/emba-application-requirements/), exact quote: “Class Entering in 2027.” The published application deadlines are October 19, 2026 and January 19, 2027, but these are not program start dates.[^3]

## PART 2: Rating evidence

### Network

| Fact | Value | Exact official URL and supporting quote |
| :-- | :-- | :-- |
| Incoming 2027 cohort size | **null — not published** in the available evidence | [Class profile](https://executivemba.wharton.upenn.edu/class-profile/); “Class of 2028.” That is a different cohort. |
| Alumni network size or access | **null — not published** in the available evidence | No supporting official statement established. |
| Regular in-person frequency | **Every other weekend**, for San Francisco and Philadelphia | [FAQ](https://executivemba.wharton.upenn.edu/emba-faqs/); “every-other-weekend residential format.” [^4] |
| Regular weekend length | **null — not published** in the available evidence | The FAQ states hotel provision, not a complete day-by-day timetable: “The program provides hotel rooms on Friday night during program weekends.” [^4] |
| Total on-site days per year | **null — not published** for the 2027 intake | [San Francisco calendar](https://executivemba.wharton.upenn.edu/wp-content/uploads/2026/03/cal_52_SF_TY_V6_03192026-1.pdf); “ACADEMIC CALENDAR: 2026–2028.” [^1] |
| Residency trips and longest residency | **null — not published** for the 2027 San Francisco intake | No applicable, explicit count or duration established. |
| Typical titles / seniority | **null — not published** in the available class-profile evidence | [Class profile](https://executivemba.wharton.upenn.edu/class-profile/); “seasoned working professionals” does not establish directors, VPs, or other typical titles. |
| Incoming cohort experience | **null — not published** for the 2027 intake | [Class profile](https://executivemba.wharton.upenn.edu/class-profile/); “Class of 2028.” |

The Class of 2028 page describes experience as an **average**, not a median, using the wording “an average of 13-14 years of professional experience”; that range must not become a single numeric value or a 2027 cohort statistic. [Official class profile](https://executivemba.wharton.upenn.edu/class-profile/)

### Academic depth

| Fact | Value | Exact official URL and supporting quote |
| :-- | :-- | :-- |
| Graduation requirement | **19 course units**; not converted into semester credit hours | [FAQ](https://executivemba.wharton.upenn.edu/emba-faqs/); “You must complete 19 course units at Wharton to earn your degree from our program.” [^4] |
| Research or thesis requirement | **null — not published** in the available evidence | No supporting official statement established. |
| Faculty involvement, San Francisco | **null — not published** in the available evidence | No San Francisco-specific supporting statement established. |
| Faculty involvement, hybrid alternative | **Live instruction by Wharton faculty** | [Global cohort](https://executivemba.wharton.upenn.edu/global-cohort/); “Taught live by Wharton’s esteemed faculty.” [^5] |

### Practicality

| Fact | Value | Exact official URL and supporting quote |
| :-- | :-- | :-- |
| Full-time employment compatibility | **Designed for employed professionals; maintaining employment is required** | [Class profile](https://executivemba.wharton.upenn.edu/class-profile/); “required to maintain full-time employment throughout the duration of the program.” |
| Weekly workload estimate | **null — not published** as a numeric school estimate in the available evidence | No supporting numeric statement established. |
| Applied or capstone project | **null — not published** in the available evidence | No supporting official statement established. |
| San Francisco online share | **null — not published** | The residential format does not establish a precise online percentage. [FAQ](https://executivemba.wharton.upenn.edu/emba-faqs/); “every-other-weekend residential format.” [^4] |

**Hybrid alternative:** The Global cohort publishes synchronous virtual classes every other weekend: Thursday 7–10 p.m., Friday 7–10 a.m., and Saturday 7–10 a.m., all Eastern Time. Exact source: [Global cohort](https://executivemba.wharton.upenn.edu/global-cohort/), quoted entries: “Thursday,” “7:00 p.m. – 10:00 p.m. ET”; “Friday,” “7:00 a.m. – 10:00 a.m. ET”; “Saturday,” “7:00 a.m. – 10:00 a.m. ET.”[^5]

Its page gives **22 months**, but contains incompatible residency descriptions: “four in-person residencies” versus “eight in-person extended class sessions, each lasting about 5-7 days.” These cannot safely be treated as a settled trip count. [Global cohort](https://executivemba.wharton.upenn.edu/global-cohort/)[^5]

### Cost value

**For the incoming 2027 San Francisco class, total tuition, inclusions, payment options, and exact duration in months remain null — not published in the applicable evidence.** The credential and graduation requirement are an MBA and 19 course units, respectively. [FAQ](https://executivemba.wharton.upenn.edu/emba-faqs/), quotes: “earn your degree” and “19 course units.”[^4]

For reference only—not transferred into the 2027 record—the **2026 entering class** has the following published figures.[^2]


| Historical fact | Published value | Exact official URL and supporting quote |
| :-- | :-- | :-- |
| Full-program tuition and fees | \*\*\$243,000** | [Tuition and financing](https://executivemba.wharton.upenn.edu/emba-tuition-financial-aid/); “class entering in 2026 is \$243,000.” [^2] |
| Fees | **Included** | Same URL; “Executive MBA Program Fees.” [^2] |
| Lodging and meals | **Included for regular class weekends and required modular courses** | Same URL; “Housing and dining for regular class weekends and for required modular courses.” [^2] |
| Textbooks | **Excluded**; other materials not established | Same URL; “this does not include the cost of textbooks.” [^2] |
| Installments | **Six equal installments** | Same URL; “Program tuition is due in six equal installments.” [^2] |

### Leadership focus

**Specific San Francisco leadership course/module names: null — not published in the available evidence.** The Global alternative explicitly identifies leadership fundamentals and workshops, but these are curriculum descriptions rather than named courses.[^5]


| Published description | Exact official URL and supporting quote |
| :-- | :-- |
| Leadership fundamentals | [Global cohort](https://executivemba.wharton.upenn.edu/global-cohort/); “Begin with business and leadership fundamentals.” [^5] |
| Leadership workshops | [Global cohort](https://executivemba.wharton.upenn.edu/global-cohort/); “Classroom learning is supported by leadership workshops.” [^5] |
| Required leadership sessions in the older San Francisco calendar | [2026–2028 calendar](https://executivemba.wharton.upenn.edu/wp-content/uploads/2026/03/cal_52_SF_TY_V6_03192026-1.pdf); “Required Co-curricular Leadership Sessions.” [^1] |

## Uncertainties and conflicts

- **Intake mismatch:** Admissions describes entry in 2027; tuition, the San Francisco calendar, and the class profile describe the 2026 intake / Class of 2028.[^1][^2][^3]
- **San Francisco attendance totals:** No applicable 2027 calendar or explicit annual total was established; biweekly attendance must not be multiplied into an estimated day or trip count.[^4][^1]
- **Hybrid residency conflict:** The Global page states both four residencies and eight extended in-person sessions; it does not clearly reconcile them.[^5]
- **Experience threshold exception:** Eight years is the standard requirement, not an absolute minimum for every applicant; the profile says, “If you have less than eight (8) years … you can apply as a Fellows candidate.” [Official class profile](https://executivemba.wharton.upenn.edu/class-profile/)
- **Profile rendering:** Several extracted profile counters display “0”; these are not accepted as verified cohort statistics. [Official class profile](https://executivemba.wharton.upenn.edu/class-profile/)
- **Current-year lodging:** FY2027 rates are available, but the San Francisco FY2027 amount was not established; the surfaced FY2026 rates are inapplicable. [GSA per diem](https://www.gsa.gov/travel/plan-a-trip/per-diem-rates), quote: “FY 2027 per diem rates now available.”[^6]
- **Other unresolved fields:** Exact 2027 start date, numeric weekly workload, accreditation, alumni access/size, typical participant titles, thesis/capstone requirements, and named leadership courses remain **null — not published in the available evidence**.

<span style="display:none">[^10][^11][^12][^13][^14][^15][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://executivemba.wharton.upenn.edu/wp-content/uploads/2026/03/cal_52_SF_TY_V6_03192026-1.pdf

[^2]: https://executivemba.wharton.upenn.edu/emba-tuition-financial-aid/

[^3]: https://executivemba.wharton.upenn.edu/emba-application-requirements/

[^4]: https://executivemba.wharton.upenn.edu/emba-faqs/

[^5]: https://executivemba.wharton.upenn.edu/global-cohort/

[^6]: https://www.gsa.gov/travel/plan-a-trip/per-diem-rates

[^7]: https://executivemba.wharton.upenn.edu/wp-content/uploads/2026/03/cal_52_PH_TY_V6_03192026-1.pdf

[^8]: https://executivemba.wharton.upenn.edu/wp-content/uploads/2026/03/cal_52_GL_TY_V7_03192026-1.pdf

[^9]: https://www.gsa.gov/travel/plan-a-trip/lodging

[^10]: https://www.gsa.gov/travel/plan-book/per-diem-rates/per-diem-rates-results?action=perdiems_report\&fiscal_year=2026\&form_build_id=form-TNFjDGlMJLI0lV2tdom1sLpOCIEhX1Hg-XJRRV-oEYA\&form_id=perdiem_form\&op=Find%20Rates\&perdiemSearchVO_city=San%20Francisco\&state=CA\&zip=

[^11]: https://www.gsa.gov/travel

[^12]: https://www.gsa.gov/travel/plan-a-trip/lodging/fedrooms

[^13]: https://www.gsa.gov/travel/plan-a-trip/transportation-airfare-rates-pov-rates/airfare-rates-city-pair-program

[^14]: https://www.gsa.gov/real-estate/explore-historic-buildings/find-a-historic-federal-building/senator-dianne-feinstein-federal-building-san-francisco-ca

[^15]: https://executivemba.wharton.upenn.edu/emba-stories-career-advancement-transition/

