# Review checklist: MBA Program for Executives

A draft record built from `docs/research/wharton-emba-sf.md` and `docs/research/wharton-emba-sf-overrides.json`. The first section lists what is uncertain, conflicting, assumed or set by hand; the second lists every set field with the school's verbatim quote and URL. **no quote** means the value was derived or proposed.

## Uncertain, conflicting or set by hand

**Mine (derived, assumed or set by hand):**

- `tuitionUsd 243000`, `tuitionIncludes` and `paymentOptions` are for the class entering in **2026** (B1: stored with the caveat in `figureNotes`); the research nulled them because admissions describe the 2027 intake. They are set in the overrides file with sources re-checked on 2026-10-10 (rate-program v3, PR #135). A converter rebuild had dropped them from this record before.
- `cohortMedianExperienceYears 13.5` is the midpoint of "13-14" (B2) for the **Class of 2028**; the page says average, so `cohortExperienceBasis: average`. Set in the overrides file; the research's bare "Class of 2028" quote is replaced by the one with the figure.
- `paymentOptions` now lists employer sponsorship, loans and scholarships as well as installments, from the tuition page re-checked on 2026-10-10.
- `durationMonths 22` is the school's published length ("22 months, plus an Orientation Program Session in Philadelphia"), set in the overrides file on Oct 10 after Yami's review; the 2027-2029 San Francisco calendar runs from May 29, 2027 to May 15, 2029. With it the card can estimate travel: about 26 weekend trips a year, airfare only.
- `onsiteDaysPerYear 52.5` and `longestStretchDays 8` are counted from the highlighted dates of the 2027-2029 San Francisco calendar (Yami's screenshot of the PDF, colours checked against the legend). They replace the research's source, which quoted only the old calendar's title. The count, per term (San Francisco class days / weekends): Term 1 14/6, Term 2 16/7, Term 3 17/8, Term 4 16/7, Term 5 17/8, Term 6 11/5, so 91 days on 41 weekends. Add the Philadelphia opening session (May 29 to June 5, 2027, 8 days) and Global Business Week (January 10 to 15, 2028, 6 days): 105 days and 43 trips in total, 61 days in the first year and 44 in the second. 52.5 is 105 over the two years the travel estimate multiplies by. Two weekends (August 4-5 and October 13-14, 2028) use a slightly lighter navy that the legend doesn't name; they are counted as San Francisco class days. A tiny mark on July 4, 2027 is not a highlighted cell and is not counted.
- `residencyCount` (43 trips, so 22 a year) can't be set yet: the overrides file doesn't allow it. Until it can, the travel estimate counts 27 weekends a year from the on-site days. Hours, accreditation and the lodging rate are null (not published).
- `lodgingIncluded: true`: the program provides a hotel room on Friday nights of class weekends and charges housing to every student; the FAQ's recommended hotels are for extra Thursday or Saturday nights at a student rate, which the student pays.
- `tuitionIncludes` now lists what is not included (books and supplies, travel, personal expenses, hotels for elective modular courses or extra weekends, Global Business Week airfare), from the tuition page and the MBA-or-EMBA page.
- `attendance: recurring_weekends` and `onsiteNote` come from "every-other-weekend residential format" and the academic calendar page (Friday and Saturday classes every other week, some three-day weekends, opening sessions in Philadelphia, Global Business Week); `locationOffers` is my proposal (network_density, industry_hub).
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
| tuitionUsd | 243000 | Tuition and fees for the class entering in 2026 is $243,000 or $40,500 per academic term. (checked 2026-10-10) | https://executivemba.wharton.upenn.edu/emba-tuition-financial-aid/ |
| paymentOptions | ["installments", "employer_sponsorship", "loans", "scholarships"] | Many of Wharton’s EMBA students receive some level of sponsorship from their employer. Others finance their degree through personal funds, loans and scholarships. (checked 2026-10-10) | https://executivemba.wharton.upenn.edu/emba-tuition-financial-aid/ |
| paymentOptions | ["installments", "employer_sponsorship", "loans", "scholarships"] | Program tuition is due in six equal installments. (checked 2026-10-08) | https://executivemba.wharton.upenn.edu/emba-tuition-financial-aid/ |
| durationMonths | 22 | 22 months, plus an Orientation Program Session in Philadelphia (checked 2026-10-10) | https://executivemba.wharton.upenn.edu/mba-or-emba/ |
| attendance | recurring_weekends | every-other-weekend residential format (checked 2026-10-10) | https://executivemba.wharton.upenn.edu/emba-faqs/ |
| attendance | recurring_weekends | Classes on Friday and Saturday, every other week, with some three-day weekends. (checked 2026-10-10) | https://executivemba.wharton.upenn.edu/emba-academic-calendar/ |
| onsiteNote | Friday and Saturday classes every other week in San Francisco, with some three-day weekends; an eight-day opening session in Philadelphia and a six-day Global Business Week trip. | All students (San Francisco, Philadelphia, and Global) start in Philadelphia with opening class sessions. (checked 2026-10-10) | https://executivemba.wharton.upenn.edu/emba-academic-calendar/ |
| onsiteNote | Friday and Saturday classes every other week in San Francisco, with some three-day weekends; an eight-day opening session in Philadelphia and a six-day Global Business Week trip. | All students participate in Global Business Week, a week-long global experience in the second year. (checked 2026-10-10) | https://executivemba.wharton.upenn.edu/emba-academic-calendar/ |
| onsiteNote | Friday and Saturday classes every other week in San Francisco, with some three-day weekends; an eight-day opening session in Philadelphia and a six-day Global Business Week trip. | Students attend classes every other weekend, with several additional extended sessions through the program. (checked 2026-10-10) | https://executivemba.wharton.upenn.edu/emba-program-details/ |
| onsiteDaysPerYear | 52.5 | ATTENDANCE REQUIRED ON ALL HIGHLIGHTED DATES (checked 2026-10-10) | https://executivemba.wharton.upenn.edu/wp-content/uploads/2026/09/cal_53_SF_TY_V1_09122026.pdf |
| longestStretchDays | 8 | Class Sessions in Philadelphia (checked 2026-10-10) | https://executivemba.wharton.upenn.edu/wp-content/uploads/2026/09/cal_53_SF_TY_V1_09122026.pdf |
| onsiteNote | Friday and Saturday classes every other week in San Francisco, with some three-day weekends; an eight-day opening session in Philadelphia and a six-day Global Business Week trip. | Global Business Week Trip (checked 2026-10-10) | https://executivemba.wharton.upenn.edu/wp-content/uploads/2026/09/cal_53_SF_TY_V1_09122026.pdf |
| tuitionIncludes | Tuition, program fees, and housing and dining for regular class weekends and required modular courses (a hotel room on Friday nights). Not included: books and supplies, travel to and from campus (including Global Business Week airfare), personal expenses during class weekends, and hotels and dining for elective modular courses or additional class weekends. | Housing and dining for regular class weekends and for required modular courses (checked 2026-10-10) | https://executivemba.wharton.upenn.edu/emba-tuition-financial-aid/ |
| tuitionIncludes | Tuition, program fees, and housing and dining for regular class weekends and required modular courses (a hotel room on Friday nights). Not included: books and supplies, travel to and from campus (including Global Business Week airfare), personal expenses during class weekends, and hotels and dining for elective modular courses or additional class weekends. | Please note that this does not include the cost of textbooks. (checked 2026-10-10) | https://executivemba.wharton.upenn.edu/emba-tuition-financial-aid/ |
| tuitionIncludes | Tuition, program fees, and housing and dining for regular class weekends and required modular courses (a hotel room on Friday nights). Not included: books and supplies, travel to and from campus (including Global Business Week airfare), personal expenses during class weekends, and hotels and dining for elective modular courses or additional class weekends. | Books and supplies (checked 2026-10-10) | https://executivemba.wharton.upenn.edu/emba-tuition-financial-aid/ |
| tuitionIncludes | Tuition, program fees, and housing and dining for regular class weekends and required modular courses (a hotel room on Friday nights). Not included: books and supplies, travel to and from campus (including Global Business Week airfare), personal expenses during class weekends, and hotels and dining for elective modular courses or additional class weekends. | Travel to and from campus (checked 2026-10-10) | https://executivemba.wharton.upenn.edu/emba-tuition-financial-aid/ |
| tuitionIncludes | Tuition, program fees, and housing and dining for regular class weekends and required modular courses (a hotel room on Friday nights). Not included: books and supplies, travel to and from campus (including Global Business Week airfare), personal expenses during class weekends, and hotels and dining for elective modular courses or additional class weekends. | Personal expenses during class weekends (checked 2026-10-10) | https://executivemba.wharton.upenn.edu/emba-tuition-financial-aid/ |
| tuitionIncludes | Tuition, program fees, and housing and dining for regular class weekends and required modular courses (a hotel room on Friday nights). Not included: books and supplies, travel to and from campus (including Global Business Week airfare), personal expenses during class weekends, and hotels and dining for elective modular courses or additional class weekends. | Hotels and dining for elective modular courses or for additional class weekends (checked 2026-10-10) | https://executivemba.wharton.upenn.edu/emba-tuition-financial-aid/ |
| tuitionIncludes | Tuition, program fees, and housing and dining for regular class weekends and required modular courses (a hotel room on Friday nights). Not included: books and supplies, travel to and from campus (including Global Business Week airfare), personal expenses during class weekends, and hotels and dining for elective modular courses or additional class weekends. | Transportation, airfare for Global Business Week, and parking are not included. (checked 2026-10-10) | https://executivemba.wharton.upenn.edu/mba-or-emba/ |
| lodgingIncluded | true | The program provides hotel rooms on Friday night during program weekends. (checked 2026-10-10) | https://executivemba.wharton.upenn.edu/emba-faqs/ |
| lodgingIncluded | true | All charges are mandatory for all students, regardless of whether they choose to stay in a provided hotel space (checked 2026-10-10) | https://executivemba.wharton.upenn.edu/emba-tuition-financial-aid/ |
| cohortMedianExperienceYears | 13.5 | an average of 13-14 years of professional experience (checked 2026-10-08) | https://executivemba.wharton.upenn.edu/class-profile/ |
| campusAddress | 2 Harrison Street (Harrison & Spear) Sixth Floor San Francisco, CA 94105 | 2 Harrison Street (Harrison & Spear) Sixth Floor San Francisco, CA 94105 (checked 2026-10-08) | https://sf.wharton.upenn.edu/connect/directions/ |
| ratingNotes | (rating evidence) | Leadership Essentials ... Foundations of Teamwork and Leadership ... Management Communication ... Responsibility in Global Management (checked 2026-10-10) | https://executivemba.wharton.upenn.edu/emba-curriculum/ |
| ratingNotes | (rating evidence) | some Wharton majors can be earned by executive students as a result of pursuing four additional credit units in a focused area. (checked 2026-10-10) | https://executivemba.wharton.upenn.edu/emba-curriculum/ |
| ratingNotes | (rating evidence) | Personalized 1:1 support from highly rated executive coaches (checked 2026-10-10) | https://executivemba.wharton.upenn.edu/emba-career-services/ |
| ratingNotes | (rating evidence) | CareerPath: Centralized hub with job board, resume book, board resume section, and compensation data (checked 2026-10-10) | https://executivemba.wharton.upenn.edu/emba-career-services/ |
| ratingNotes | (rating evidence) | Career Changers: Pivoting into new industries or functions (checked 2026-10-10) | https://executivemba.wharton.upenn.edu/emba-career-services/ |
| state | California | **no quote** | |
| campusLat | 37.7916 | **no quote** | |
| campusLon | -122.3893 | **no quote** | |
| country | US | **no quote** | |
| cohortExperienceBasis | average | **no quote** | |
| locationOffers | ["network_density", "industry_hub"] | **no quote** | |
| figureNotes | {"tuitionUsd": "Price for the class entering in 2026; the 2027 price is not published.", "cohortMedianExperienceYears": "Midpoint of the published 13-14 years average for the Class of 2028.", "campusLat": "Derived from campusAddress (approximate, from the street address).", "campusLon": "Derived from campusAddress (approximate, from the street address).", "durationMonths": "The school's published length; the 2027-2029 San Francisco calendar runs from May 29, 2027 to May 15, 2029.", "onsiteDaysPerYear": "Counted from the highlighted dates of the 2027-2029 San Francisco calendar: 105 days over two program years (91 San Francisco class days on 41 weekends, 8 days in Philadelphia from May 29 to June 5, 2027, and 6 days of Global Business Week from January 10 to 15, 2028); 61 in the first year, 44 in the second.", "longestStretchDays": "The opening session in Philadelphia, May 29 to June 5, 2027, on the 2027-2029 San Francisco calendar."} | **no quote** | |

**Ratings** (from the last block of `wharton-emba-sf-rating.md`):

| Need | Score | Note |
| --- | --- | --- |
| leadership_skills | 4 | Required Leadership Essentials core courses, such as Foundations of Teamwork and Leadership, plus co-curricular leadership sessions. |
| deep_expertise | 3 | A general MBA of 19 course units; optional majors add four course units in one field. |
| graduate_degree | 5 | Awards the Wharton MBA, the same degree as the full-time program. |
| senior_network | 3 | Class of 2028 averages 13 to 14 years of experience; class weekends every other week. |
| new_industry_or_city | 4 | Executive coaches, a job board and resume book, and dedicated support for career changers. |
