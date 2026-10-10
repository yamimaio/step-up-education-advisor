# Review checklist: MBA Program for Executives

A draft record built from `docs/research/wharton-emba-sf.md` and `docs/research/wharton-emba-sf-overrides.json`. The first section lists what is uncertain, conflicting, assumed or set by hand; the second lists every set field with the school's verbatim quote and URL. **no quote** means the value was derived or proposed.

## Uncertain, conflicting or set by hand

**Mine (derived, assumed or set by hand):**

- `tuitionUsd 243000`, `tuitionIncludes` and `paymentOptions` are for the class entering in **2026** (B1: stored with the caveat in `figureNotes`); the research nulled them because admissions describe the 2027 intake. They are set in the overrides file with sources re-checked on 2026-10-10 (rate-program v3, PR #135). A converter rebuild had dropped them from this record before.
- `cohortMedianExperienceYears 13.5` is the midpoint of "13-14" (B2) for the **Class of 2028**; the page says average, so `cohortExperienceBasis: average`. Set in the overrides file; the research's bare "Class of 2028" quote is replaced by the one with the figure.
- `paymentOptions` now lists employer sponsorship, loans and scholarships as well as installments, from the tuition page re-checked on 2026-10-10.
- `durationMonths`, on-site days, residencies, hours, accreditation and the lodging rate are null (not published for San Francisco). `lodgingIncluded: true` comes from the tuition-includes quote, so the travel estimate skips lodging.
- `attendance: recurring_weekends` and `onsiteNote` come from the "every-other-weekend residential format" quote; `locationOffers` is my proposal (network_density, industry_hub).
- `workCompatible: true` rests on "required to maintain full-time employment". The class profile's counters render as 0 and were not used.
- `state: California` comes from the campus address ("San Francisco, CA 94105"), set in the overrides file.

**From the research file's "uncertain or conflicting" list:**

- **Intake mismatch:** Admissions describes entry in 2027; tuition, the San Francisco calendar, and the class profile describe the 2026 intake / Class of 2028.
- **San Francisco attendance totals:** No applicable 2027 calendar or explicit annual total was established; biweekly attendance must not be multiplied into an estimated day or trip count.
- **Hybrid residency conflict:** The Global page states both four residencies and eight extended in-person sessions; it does not clearly reconcile them.
- **Experience threshold exception:** Eight years is the standard requirement, not an absolute minimum for every applicant; the profile says, “If you have less than eight (8) years … you can apply as a Fellows candidate.” [Official class profile](https://executivemba.wharton.upenn.edu/class-profile/)
- **Profile rendering:** Several extracted profile counters display “0”; these are not accepted as verified cohort statistics. [Official class profile](https://executivemba.wharton.upenn.edu/class-profile/)
- **Current-year lodging:** FY2027 rates are available, but the San Francisco FY2027 amount was not established; the surfaced FY2026 rates are inapplicable. [GSA per diem](https://www.gsa.gov/travel/plan-a-trip/per-diem-rates), quote: “FY 2027 per diem rates now available.”
- **Other unresolved fields:** Exact 2027 start date, numeric weekly workload, accreditation, alumni access/size, typical participant titles, thesis/capstone requirements, and named leadership courses remain **null — not published in the available evidence**.

**Ratings marked low evidence:** none. All five needs were re-reviewed under rate-program v3 on Oct 10 with Wharton's pages: leadership_skills 5 → 4 and new_industry_or_city 3 → 4. Close calls: leadership_skills 4 or 5, new_industry_or_city 4 or 3 (see the last block of `wharton-emba-sf-rating.md`).

## Fields, quotes and URLs

Every source in the record, with the value it backs. **no quote** means the value was derived or proposed. Sources with field `ratingNotes` back facts stated in the rating notes.

| Field | Value | Verbatim quote | URL |
| --- | --- | --- | --- |
| name | MBA Program for Executives | MBA Program for Executives (checked 2026-10-08) | https://executivemba.wharton.upenn.edu/emba-faqs/ |
| institution | The Wharton School, University of Pennsylvania | University of Pennsylvania’s campus in Philadelphia (checked 2026-10-08) | https://executivemba.wharton.upenn.edu/global-cohort/ |
| category | emba | Executive MBA Class Profile (checked 2026-10-08) | https://executivemba.wharton.upenn.edu/class-profile/ |
| credential | MBA | There is no difference in the degree earned by executive and full-time MBA students. (checked 2026-10-08) | https://executivemba.wharton.upenn.edu/emba-faqs/ |
| format | in_person | every-other-weekend residential format (checked 2026-10-08) | https://executivemba.wharton.upenn.edu/emba-faqs/ |
| credits | 19 course units | You must complete 19 course units at Wharton to earn your degree from our program. (checked 2026-10-08) | https://executivemba.wharton.upenn.edu/emba-faqs/ |
| workCompatible | true | Executive MBA students are required to maintain full-time employment throughout the duration of the program. (checked 2026-10-08) | https://executivemba.wharton.upenn.edu/class-profile/ |
| city | San Francisco | Philadelphia and San Francisco cohort members (checked 2026-10-08) | https://executivemba.wharton.upenn.edu/emba-faqs/ |
| minExperienceYears | 8 | at least eight (8) (checked 2026-10-08) | https://executivemba.wharton.upenn.edu/emba-application-requirements/ |
| onsiteDaysPerYear | (null in the record) | ACADEMIC CALENDAR: 2026–2028 (checked 2026-10-08) | https://executivemba.wharton.upenn.edu/wp-content/uploads/2026/03/cal_52_SF_TY_V6_03192026-1.pdf |
| tuitionUsd | 243000 | Tuition and fees for the class entering in 2026 is $243,000 or $40,500 per academic term. (checked 2026-10-10) | https://executivemba.wharton.upenn.edu/emba-tuition-financial-aid/ |
| tuitionIncludes | Tuition, program fees, and housing and dining for regular class weekends and required modular courses; textbooks are not included. | Please note that this does not include the cost of textbooks. (checked 2026-10-10) | https://executivemba.wharton.upenn.edu/emba-tuition-financial-aid/ |
| paymentOptions | ["installments", "employer_sponsorship", "loans", "scholarships"] | Many of Wharton’s EMBA students receive some level of sponsorship from their employer. Others finance their degree through personal funds, loans and scholarships. (checked 2026-10-10) | https://executivemba.wharton.upenn.edu/emba-tuition-financial-aid/ |
| attendance | recurring_weekends | every-other-weekend residential format (checked 2026-10-08) | https://executivemba.wharton.upenn.edu/emba-faqs/ |
| tuitionIncludes | Tuition, program fees, and housing and dining for regular class weekends and required modular courses; textbooks are not included. | Housing and dining for regular class weekends and for required modular courses. (checked 2026-10-08) | https://executivemba.wharton.upenn.edu/emba-tuition-financial-aid/ |
| paymentOptions | ["installments", "employer_sponsorship", "loans", "scholarships"] | Program tuition is due in six equal installments. (checked 2026-10-08) | https://executivemba.wharton.upenn.edu/emba-tuition-financial-aid/ |
| cohortMedianExperienceYears | 13.5 | an average of 13-14 years of professional experience (checked 2026-10-08) | https://executivemba.wharton.upenn.edu/class-profile/ |
| campusAddress | 2 Harrison Street (Harrison & Spear) Sixth Floor San Francisco, CA 94105 | 2 Harrison Street (Harrison & Spear) Sixth Floor San Francisco, CA 94105 (checked 2026-10-08) | https://sf.wharton.upenn.edu/connect/directions/ |
| ratingNotes | (rating evidence) | Leadership Essentials ... Foundations of Teamwork and Leadership ... Management Communication ... Responsibility in Global Management (checked 2026-10-10) | https://executivemba.wharton.upenn.edu/emba-curriculum/ |
| ratingNotes | (rating evidence) | some Wharton majors can be earned by executive students as a result of pursuing four additional credit units in a focused area. (checked 2026-10-10) | https://executivemba.wharton.upenn.edu/emba-curriculum/ |
| ratingNotes | (rating evidence) | Personalized 1:1 support from highly rated executive coaches (checked 2026-10-10) | https://executivemba.wharton.upenn.edu/emba-career-services/ |
| ratingNotes | (rating evidence) | CareerPath: Centralized hub with job board, resume book, board resume section, and compensation data (checked 2026-10-10) | https://executivemba.wharton.upenn.edu/emba-career-services/ |
| ratingNotes | (rating evidence) | Career Changers: Pivoting into new industries or functions (checked 2026-10-10) | https://executivemba.wharton.upenn.edu/emba-career-services/ |
| onsiteNote | every-other-weekend residential format | **no quote** | |
| state | California | **no quote** | |
| campusLat | 37.7916 | **no quote** | |
| campusLon | -122.3893 | **no quote** | |
| country | US | **no quote** | |
| lodgingIncluded | true | **no quote** | |
| cohortExperienceBasis | average | **no quote** | |
| locationOffers | ["network_density", "industry_hub"] | **no quote** | |
| figureNotes | {"tuitionUsd": "Price for the class entering in 2026; the 2027 price is not published.", "cohortMedianExperienceYears": "Midpoint of the published 13-14 years average for the Class of 2028.", "campusLat": "Derived from campusAddress (approximate, from the street address).", "campusLon": "Derived from campusAddress (approximate, from the street address)."} | **no quote** | |

**Ratings** (from the last block of `wharton-emba-sf-rating.md`):

| Need | Score | Note |
| --- | --- | --- |
| leadership_skills | 4 | Required Leadership Essentials core courses, such as Foundations of Teamwork and Leadership, plus co-curricular leadership sessions. |
| deep_expertise | 3 | A general MBA of 19 course units; optional majors add four course units in one field. |
| graduate_degree | 5 | Awards the Wharton MBA, the same degree as the full-time program. |
| senior_network | 3 | Class of 2028 averages 13 to 14 years of experience; class weekends every other week. |
| new_industry_or_city | 4 | Executive coaches, a job board and resume book, and dedicated support for career changers. |
