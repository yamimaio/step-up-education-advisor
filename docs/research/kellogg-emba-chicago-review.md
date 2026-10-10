# Review checklist: Kellogg Executive MBA, Chicago

A draft record built from `docs/research/kellogg-emba-chicago.md` and `docs/research/kellogg-emba-chicago-overrides.json`, with ratings from `docs/research/kellogg-emba-chicago-rating.md`. Kellogg runs one Executive MBA on two campuses with different schedules; this is the Chicago campus, and `kellogg-emba-miami` is the Miami one (PR #180).

## How this record was made

No Perplexity research was run for this campus (Yami added it on Oct 10 as a 7th program). Everything the campuses share (name, curriculum, cost, class profile, admissions, career services, ratings) reuses the official-page facts already checked for `kellogg-emba-miami`, with the same quotes. Only the Chicago facts are new, each checked on Kellogg's pages on Oct 10: the schedule, the Wieboldt Hall address, and the January 2027 first-year Chicago calendar.

## Uncertain or set by hand

- `onsiteDaysPerYear 54`, from the January 2027 first-year Chicago calendar: 6 days of orientation (January 19-24), 14 class sessions (10 of three days, 4 of two days: 38 days), a 5-day intensive week (June 21-25) and 5 days of Global Network Week in Evanston. Weekends marked with an asterisk "may include Sunday classes"; every listed date is counted, so this may be a day or two high. The second-year calendar is not published.
- `residencyCount 17`: orientation, 14 class sessions, the intensive week and Global Network Week.
- `longestStretchDays 6`: orientation.
- `campusLat` and `campusLon` are approximate, from the Wieboldt Hall street address.
- `tuitionUsd 248472`: Kellogg's billed total, as for Miami (Yami's tuition rule, `docs/decisions.md` in PR #180). The Chicago hotel is the Omni All Suites Hotel.
- `locationOffers` (network_density, industry_hub) is my proposal for downtown Chicago.
- Ratings are Miami's (shared curriculum, profile and career services); only the senior_network note says "every other weekend" instead of "monthly".

## Fields, quotes and URLs

Every source in the record, with the value it backs. **no quote** means the value was derived or proposed. Sources with field `ratingNotes` back facts stated in the rating notes.

| Field | Value | Verbatim quote | URL |
| --- | --- | --- | --- |
| name | Executive MBA Program | The Kellogg Executive MBA Program (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/ |
| institution | Northwestern University | Northwestern University (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/ |
| category | emba | Executive MBA (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/ |
| credential | MBA | earn your MBA in two years flat. (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/ |
| durationMonths | 24 | earn your MBA in two years flat. (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/ |
| country | US | two prime U.S. locations (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/ |
| tuitionUsd | 248472 | Tuition Food and housing Estimated expenses $205,486 $42,986 $248,472 (checked 2026-10-10) | https://www.kellogg.northwestern.edu/admissions/financial-aid/emba-fin-aid/ |
| paymentOptions | ["installments", "employer_sponsorship"] | Tuition is billed by academic quarter. There are six academic quarters in the program and tuition is divided equally over them. (checked 2026-10-10) | https://www.kellogg.northwestern.edu/admissions/financial-aid/emba-fin-aid/ |
| workCompatible | true | The Executive MBA Program is designed for fully-employed professionals with at least eight years of work experience. (checked 2026-10-10) | https://www.kellogg.northwestern.edu/admissions/emba-admissions/emba-how-to-apply/ |
| paymentOptions | ["installments", "employer_sponsorship"] | Tuition is billed by academic quarter. (checked 2026-10-10) | https://www.kellogg.northwestern.edu/admissions/financial-aid/emba-fin-aid/ |
| paymentOptions | ["installments", "employer_sponsorship"] | If your organization is providing financial sponsorship, please state that in the letter as well. (checked 2026-10-10) | https://www.kellogg.northwestern.edu/admissions/emba-admissions/emba-how-to-apply/ |
| tuitionUsd | 248472 | 2026-2027 tuition and estimated expenses for entirety of the two-year EMBA program (checked 2026-10-10) | https://www.kellogg.northwestern.edu/admissions/financial-aid/emba-fin-aid/ |
| cohortMedianExperienceYears | 15 | Students in our program have an average of 15 years of work experience, including military service, (checked 2026-10-10) | https://www.kellogg.northwestern.edu/admissions/emba-admissions/emba-how-to-apply/ |
| cohortMedianExperienceYears | 15 | 15 Average years of work experience 9 23 Work experience range (mid-80%) (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/emba-experience/class-profile/ |
| format | in_person | Students attending the Chicago campus take classes every other week, beginning Friday afternoon and ending Saturday evening (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/chicago-twice-monthly/ |
| city | Chicago | 340 E. Superior St. Chicago, Illinois 60611 (checked 2026-10-10) | https://www.kellogg.northwestern.edu/facilities/wieboldt-hall/ |
| tuitionIncludes | Kellogg's published 2026-2027 estimated expenses for the whole two-year program: tuition $205,486 plus required food and housing $42,986. It covers classes, e-books, a room at the Omni All Suites Hotel on the Chicago campus, most meals, career services and accommodation for one global elective. Not covered: travel to and from campus and international travel for global electives. | Tuition and Food and Housing are both required expenses for the Kellogg EMBA program. (checked 2026-10-10) | https://www.kellogg.northwestern.edu/admissions/financial-aid/emba-fin-aid/ |
| tuitionIncludes | Kellogg's published 2026-2027 estimated expenses for the whole two-year program: tuition $205,486 plus required food and housing $42,986. It covers classes, e-books, a room at the Omni All Suites Hotel on the Chicago campus, most meals, career services and accommodation for one global elective. Not covered: travel to and from campus and international travel for global electives. | Individual rooms at the Omni All Suites Hotel (Chicago campus) or Hyatt Regency Coral Gables (Miami campus) (checked 2026-10-10) | https://www.kellogg.northwestern.edu/admissions/financial-aid/emba-fin-aid/ |
| campusAddress | 340 E. Superior St. Chicago, Illinois 60611 | 340 E. Superior St. Chicago, Illinois 60611 (checked 2026-10-10) | https://www.kellogg.northwestern.edu/facilities/wieboldt-hall/ |
| attendance | recurring_weekends | Students attending the Chicago campus take classes every other week, beginning Friday afternoon and ending Saturday evening (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/chicago-twice-monthly/ |
| onsiteDaysPerYear | 54 | Programming: January 19 - January 24, 2027 (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/chicago-twice-monthly/ |
| onsiteDaysPerYear | 54 | June 21 - 25, 2027 (Intensive week) (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/chicago-twice-monthly/ |
| onsiteDaysPerYear | 54 | Students based on U.S. campuses (Miami or Chicago) take courses for 5 days. (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/curriculum-and-faculty/global-network-week/ |
| residencyCount | 17 | An asterisk (*) indicates weekends that may include Sunday classes. (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/chicago-twice-monthly/ |
| longestStretchDays | 6 | Programming: January 19 - January 24, 2027 (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/chicago-twice-monthly/ |
| ratingNotes | (rating notes) | 70% Hold senior positions (Director + VP + C-Suite) (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/emba-experience/class-profile/ |
| ratingNotes | (rating notes) | You are required to take all core courses, which you take at the same time as other students in your cohort. (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/curriculum-and-faculty/core-courses/ |
| ratingNotes | (rating notes) | The series consists of five workshops (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/curriculum-and-faculty/leadership-development.aspx |
| ratingNotes | (rating notes) | Executive Perspectives on Leadership (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/curriculum-and-faculty/core-courses/ |
| ratingNotes | (rating notes) | receive individual coaching sessions with a Kellogg executive leadership coach (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/curriculum-and-faculty/leadership-development.aspx |
| ratingNotes | (rating notes) | These specializations are not recorded on the transcript or diploma. (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/curriculum-and-faculty/specializations |
| ratingNotes | (rating notes) | Shift to a new function or industry with tools from the CMC that help you: (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/career-services/ |
| ratingNotes | (rating notes) | CMC coaching sessions are tailored to experienced professionals making high-impact decisions. (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/career-services/ |
| ratingNotes | (rating notes) | Career levels 32% Director 25% Manager 20% VP 18% C-Suite 5% Other (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/emba-experience/class-profile/ |
| minExperienceYears | 8 | The Executive MBA Program is designed for fully-employed professionals with at least eight years of work experience. (checked 2026-10-10) | https://www.kellogg.northwestern.edu/admissions/emba-admissions/emba-how-to-apply/ |
| accreditation | ["AACSB"] | Association to Advance Collegiate Schools of Business (checked 2026-10-10) | https://www.northwestern.edu/provost/about/university-accreditation/specialized-accreditation.html |
| cohortSeniority | Career levels: 32% director, 20% VP and 18% C-suite (70% director or above), 25% manager, 5% other. | Career levels 32% Director 25% Manager 20% VP 18% C-Suite 5% Other (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/emba-experience/class-profile/ |
| onsiteNote | Friday afternoon to Saturday evening every other week in Chicago, with some Sunday classes, plus four intensive weeks a program, including orientation and Global Network Week in Evanston. | **no quote** | |
| state | Illinois | **no quote** | |
| campusLat | 41.8957 | **no quote** | |
| campusLon | -87.6189 | **no quote** | |
| lodgingIncluded | true | **no quote** | |
| cohortExperienceBasis | average | **no quote** | |
| locationOffers | ["network_density", "industry_hub"] | **no quote** | |

**Ratings** (from the last block of `kellogg-emba-chicago-rating.md`):

| Need | Score | Note |
| --- | --- | --- |
| leadership_skills | 4 | Required core courses Leadership and Executive Perspectives on Leadership, five team workshops and an executive leadership coach. |
| deep_expertise | 3 | A general MBA of 19 required core courses, including a capstone; specializations are not recorded on the diploma. |
| graduate_degree | 5 | Awards an MBA after two years. |
| senior_network | 4 | 70% hold director, VP or C-suite roles; classmates average 15 years of experience; together every other weekend. |
| new_industry_or_city | 4 | Career coaching for experienced professionals, including tools to shift to a new function or industry. |
