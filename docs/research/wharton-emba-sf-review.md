# Review checklist: MBA Program for Executives

A draft record built from `docs/research/wharton-emba-sf.md`. The first section lists what is uncertain, conflicting, assumed or set by hand; the second lists every set field with the school's verbatim quote and URL. **no quote** means the value was derived or proposed.

## Uncertain, conflicting or set by hand

**Mine (derived, assumed or set by hand):**

- **Set by hand from the research's own quotes (the converter's overrides can't carry them):** `tuitionUsd 243000` (price for the class entering in **2026**; B1 says store with a caveat, see `figureNotes`), `cohortMedianExperienceYears 13.5` (midpoint of "13-14", B2; the page says average, not median; it is the **Class of 2028** profile), `paymentOptions: [installments]`, `tuitionIncludes`.
- The research's Part 1 left all of those null because the application page is for the **2027** intake. The prices and class profile are for a different year; you decide whether to keep them.
- `durationMonths`, on-site days, residencies, hours, accreditation, lodging rate are all null (not published for San Francisco). `lodgingIncluded: true` comes from the tuition-includes quote, so the travel estimate skips lodging.
- All four ratings are marked low evidence by the rating run.
- `attendance: recurring_weekends` and `onsiteNote` come from the "every-other-weekend residential format" quote; `locationOffers` is my proposal (network_density, industry_hub).
- `workCompatible: true` rests on "required to maintain full-time employment". Several class-profile counters in the research displayed 0 and were not used.

**From the research file's "uncertain or conflicting" list:**

- **Intake mismatch:** Admissions describes entry in 2027; tuition, the San Francisco calendar, and the class profile describe the 2026 intake / Class of 2028.
- **San Francisco attendance totals:** No applicable 2027 calendar or explicit annual total was established; biweekly attendance must not be multiplied into an estimated day or trip count.
- **Hybrid residency conflict:** The Global page states both four residencies and eight extended in-person sessions; it does not clearly reconcile them.
- **Experience threshold exception:** Eight years is the standard requirement, not an absolute minimum for every applicant; the profile says, “If you have less than eight (8) years … you can apply as a Fellows candidate.” [Official class profile](https://executivemba.wharton.upenn.edu/class-profile/)
- **Profile rendering:** Several extracted profile counters display “0”; these are not accepted as verified cohort statistics. [Official class profile](https://executivemba.wharton.upenn.edu/class-profile/)
- **Current-year lodging:** FY2027 rates are available, but the San Francisco FY2027 amount was not established; the surfaced FY2026 rates are inapplicable. [GSA per diem](https://www.gsa.gov/travel/plan-a-trip/per-diem-rates), quote: “FY 2027 per diem rates now available.”
- **Other unresolved fields:** Exact 2027 start date, numeric weekly workload, accreditation, alumni access/size, typical participant titles, thesis/capstone requirements, and named leadership courses remain **null — not published in the available evidence**.

**Ratings marked low evidence:** network, depth, practicality, costValue.

## Fields, quotes and URLs

| Field | Value | Verbatim quote | URL |
| --- | --- | --- | --- |
| name | MBA Program for Executives | MBA Program for Executives (checked 2026-10-08) | https://executivemba.wharton.upenn.edu/emba-faqs/ |
| institution | The Wharton School, University of Pennsylvania | University of Pennsylvania’s campus in Philadelphia (checked 2026-10-08) | https://executivemba.wharton.upenn.edu/global-cohort/ |
| category | emba | Executive MBA Class Profile (checked 2026-10-08) | https://executivemba.wharton.upenn.edu/class-profile/ |
| credential | MBA | There is no difference in the degree earned by executive and full-time MBA students. (checked 2026-10-08) | https://executivemba.wharton.upenn.edu/emba-faqs/ |
| format | in_person | every-other-weekend residential format (checked 2026-10-08) | https://executivemba.wharton.upenn.edu/emba-faqs/ |
| credits | 19 course units | You must complete 19 course units at Wharton to earn your degree from our program. (checked 2026-10-08) | https://executivemba.wharton.upenn.edu/emba-faqs/ |
| attendance | recurring_weekends | every-other-weekend residential format (checked 2026-10-08) | https://executivemba.wharton.upenn.edu/emba-faqs/ |
| onsiteNote | every-other-weekend residential format | **no quote** | |
| workCompatible | true | Executive MBA students are required to maintain full-time employment throughout the duration of the program. (checked 2026-10-08) | https://executivemba.wharton.upenn.edu/class-profile/ |
| city | San Francisco | Philadelphia and San Francisco cohort members (checked 2026-10-08) | https://executivemba.wharton.upenn.edu/emba-faqs/ |
| country | US | **no quote** | |
| tuitionUsd | 243000 | Tuition and fees for the class entering in 2026 is $243,000 or $40,500 per academic term. (checked 2026-10-08) | https://executivemba.wharton.upenn.edu/emba-tuition-financial-aid/ |
| tuitionIncludes | Housing and dining for regular class weekends and for required modular courses; textbooks are not included. | Housing and dining for regular class weekends and for required modular courses. (checked 2026-10-08) | https://executivemba.wharton.upenn.edu/emba-tuition-financial-aid/ |
| lodgingIncluded | true | **no quote** | |
| paymentOptions | ["installments"] | Program tuition is due in six equal installments. (checked 2026-10-08) | https://executivemba.wharton.upenn.edu/emba-tuition-financial-aid/ |
| minExperienceYears | 8 | at least eight (8) (checked 2026-10-08) | https://executivemba.wharton.upenn.edu/emba-application-requirements/ |
| cohortMedianExperienceYears | 13.5 | Class of 2028 (checked 2026-10-08) | https://executivemba.wharton.upenn.edu/class-profile/ |
| cohortMedianExperienceYears | 13.5 | an average of 13-14 years of professional experience (checked 2026-10-08) | https://executivemba.wharton.upenn.edu/class-profile/ |
| cohortExperienceBasis | average | **no quote** | |
| figureNotes | {"tuitionUsd":"Price for the class entering in 2026; the 2027 price is not published.","cohortMedianExperienceYears":"Midpoint of the published 13-14 years average for the Class of 2028."} | **no quote** | |
| locationOffers | ["network_density","industry_hub"] | **no quote** | |
| onsiteDaysPerYear | (null in the record) | ACADEMIC CALENDAR: 2026–2028 (checked 2026-10-08) | https://executivemba.wharton.upenn.edu/wp-content/uploads/2026/03/cal_52_SF_TY_V6_03192026-1.pdf |

**Ratings** (from `wharton-emba-sf-rating.md`):

| Rating | Score | Note |
| --- | --- | --- |
| network (low evidence) | 4 | Low evidence: Every-other-weekend residential attendance and an eight-year standard experience requirement support 4; incoming-cohort seniority and alumni size/access are not established, so 5 is unsupported. |
| depth (low evidence) | 4 | Low evidence: An MBA requiring 19 course units supports a provisional master's-level 4; applied content and San Francisco faculty involvement are not established, and research/thesis evidence needed for 5 is missing. |
| practicality (low evidence) | 3 | Low evidence: Required full-time employment and every-other-weekend attendance support a provisional 3 for work compatibility; workload, schedule flexibility and applied projects are not established. |
| costValue (low evidence) | 3 | Low evidence: 3 is a provisional midpoint, not a verified peer-value assessment; 2027 tuition and duration and comparable-program prices are missing, while the $243,000 tuition and fees apply only to the 2026 intake. |
