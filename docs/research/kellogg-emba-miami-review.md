# Review checklist: Kellogg Executive MBA, Miami

A draft record built from `docs/research/kellogg-emba-miami.md` (Perplexity) and `docs/research/kellogg-emba-miami-overrides.json`, with ratings from the last block of `docs/research/kellogg-emba-miami-rating.md`. The first section compares Perplexity's work with Claude's independent check (`docs/research/kellogg-emba-miami-claude-check.md`); the second lists what is uncertain or set by hand; the third lists every set field with the school's verbatim quote and URL.

## Perplexity and Claude compared

The two researches were done separately, and Claude rated before reading Perplexity's rating.

**Facts.** Where Perplexity's research has a value, the two agree: Executive MBA, in person, 24 months, Coral Gables, tuition $205,486 for 2026-2027 plus $42,986 food and housing, billed by quarter. Perplexity left most schedule and cohort facts null; Claude's check found them on official pages and they are set in the overrides file, each with a re-checked quote:

| Field | Perplexity | Claude's check |
| --- | --- | --- |
| workCompatible | null | true ("designed for fully-employed professionals") |
| campusAddress | none | 95 Merrick Way # 100, Coral Gables, FL 33134 |
| attendance | n/a | recurring_weekends (once a month, Thursday afternoon to midday Sunday) |
| residencyCount | null | 11 trips in year 1 (January 2027 calendar) |
| longestStretchDays | null | 6 (orientation, January 12-17, 2027) |
| onsiteDaysPerYear | null | still null: 43 known days plus Global Network Week, whose length isn't published |
| cohortMedianExperienceYears | null | 15 (average, admissions page) |
| paymentOptions | installments | installments, employer sponsorship |
| minExperienceYears | null | 8 (not overridable; stays null) |
| accreditation | null | AACSB on Northwestern's Provost page (not overridable; stays null) |
| career services | not found | CMC coaching and tools to shift function or industry |
| curriculum | not found | 19 required core courses incl. Leadership, Executive Perspectives on Leadership and a capstone |

**Ratings.**

| Need | Perplexity | Claude | Why they differ |
| --- | --- | --- | --- |
| leadership_skills | 5 (low evidence) | 4 | Named leadership courses inside a general MBA core (R3, as Wharton); close call with 5 |
| deep_expertise | 3 (low evidence) | 3 | |
| graduate_degree | 5 | 5 | |
| senior_network | 3 (low evidence) | 4 | 15-year average and director/VP/C-suite profile |
| new_industry_or_city | 3 (low evidence) | 4 | Career coaching with support for switching function or industry |

## Uncertain, conflicting or set by hand

**Decisions for Yami:**

- **Tuition basis.** `tuitionUsd` is tuition alone ($205,486), as both researches have it. Kellogg bills food and housing ($42,986) as a separate required charge, for $248,472 in total. Wharton's $243,000 includes housing and dining, so the two are not on the same basis. Keep $205,486, or set $248,472 to match Wharton?
- **On-site days.** `onsiteDaysPerYear` is null because Global Network Week's dates and length are not published ("August 2027"). If you know or can find its length, the January 2027 year-1 count is 43 + that.
- **Address.** The street address appears only in the directions link on the Miami schedule page, not as page text. Please check it on the page.

**Mine (derived, assumed or set by hand):**

- `campusLat` and `campusLon` are approximate, from the street address.
- `residencyCount 11` counts the January 2027 first-year calendar: orientation, eight class weekends, the July intensive week and Global Network Week. The second-year calendar is not published ("second year schedules are not available").
- `longestStretchDays 6` is the orientation (January 12-17, 2027); Global Network Week might be longer.
- `lodgingIncluded: true`: the costs cover a room at the Hyatt Regency Coral Gables and most meals. `lodgingPerNightUsd` stays null, as for Wharton.
- `paymentOptions`: Kellogg also mentions loans and scholarships on its financial aid page, but no verbatim quote could be captured, so they are left out.
- `institution` is "Northwestern University" as Perplexity's research has it; the school is the Kellogg School of Management, which the converter can't override.
- `locationOffers` (network_density, travel_ease) is my proposal.

**From the research file's "uncertain or conflicting" list:**

- **Tuition terminology:** The financial-aid table separates \$205,486 tuition from \$42,986 food and housing, but its billing paragraph calls \$41,412 the quarterly “tuition.” These labels need reconciliation before treating \$205,486 as an unqualified contractual tuition figure.
- **Intake applicability:** The cost page identifies academic year 2026–2027, not an explicit guaranteed January 2027 intake price.
- **Next start:** January 2027 is explicitly named, with January 11 check-in and January 12–17 launch programming; neither is explicitly labeled the official program start date, so `nextStartDate` remains null.
- **Application timing:** October 7, 2026 is labeled the last deadline for Winter 2027, preceding the October 10 check date; a forthcoming intake should not be mistaken for an intake still accepting applications.
- **Cohort size:** The profile’s 141 Miami students and the schedule’s 60–70 cohort range have different stated contexts; they should not be substituted for one another.
- **Attendance:** A complete annual calendar, intensive-week locations, Global Network Week dates and all required arrival/departure days are needed before calculating days or trips.
- **Still unverified:** Miami street address, credits, workload, explicit full-time-work compatibility, minimum experience, accreditation, cohort experience, detailed curriculum, alumni access, career services and the local FY2027 GSA lodging rate.

**Ratings marked low evidence:** none.

## Fields, quotes and URLs

Every source in the record, with the value it backs. **no quote** means the value was derived or proposed. Sources with field `ratingNotes` back facts stated in the rating notes.

| Field | Value | Verbatim quote | URL |
| --- | --- | --- | --- |
| name | Executive MBA Program | The Kellogg Executive MBA Program (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/ |
| institution | Northwestern University | Northwestern University (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/ |
| category | emba | Executive MBA (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/ |
| credential | MBA | earn your MBA in two years flat. (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/ |
| format | in_person | once a month on the Miami, FL, campus. (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/ |
| durationMonths | 24 | earn your MBA in two years flat. (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/ |
| city | Coral Gables | Located in Coral Gables, Florida (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/global-network/miami-kellogg/ |
| country | US | two prime U.S. locations (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/ |
| tuitionUsd | 205486 | Tuition Food and housing Estimated expenses $205,486 $42,986 $248,472 (checked 2026-10-10) | https://www.kellogg.northwestern.edu/admissions/financial-aid/emba-fin-aid/ |
| tuitionIncludes | Tuition only ($205,486 for 2026-2027). Food and housing ($42,986) are a separate required charge, for an estimated $248,472 in total; the total covers classes, e-books, a hotel room on the Miami campus, most meals, career services and accommodation for one global elective. Not covered: travel to and from campus and international travel for global electives. | Tuition and Food and Housing are both required expenses for the Kellogg EMBA program. (checked 2026-10-10) | https://www.kellogg.northwestern.edu/admissions/financial-aid/emba-fin-aid/ |
| paymentOptions | ["installments", "employer_sponsorship"] | Tuition is billed by academic quarter. There are six academic quarters in the program and tuition is divided equally over them. (checked 2026-10-10) | https://www.kellogg.northwestern.edu/admissions/financial-aid/emba-fin-aid/ |
| workCompatible | true | The Executive MBA Program is designed for fully-employed professionals with at least eight years of work experience. (checked 2026-10-10) | https://www.kellogg.northwestern.edu/admissions/emba-admissions/emba-how-to-apply/ |
| campusAddress | 95 Merrick Way # 100, Coral Gables, FL 33134 | 95 Merrick Way # 100, Coral Gables, FL 33134 (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/miami-monthly/ |
| attendance | recurring_weekends | Take classes once a month, beginning Thursday afternoon and ending midday Sunday. (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/miami-monthly/ |
| residencyCount | 11 | February 4 - 7, 2027 March 4 - 7, 2027 April 1 - 4, 2027 May 20 - May 23, 2027 June 24 - 27, 2027 July 13 - 17, 2027 (Intensive week) August 2027 (Global network week) September 9 - 12, 2027 October 7 - 10, 2027 November 4 - 7, 2027 (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/miami-monthly/ |
| longestStretchDays | 6 | Programming: January 12 - 17, 2027 (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/miami-monthly/ |
| paymentOptions | ["installments", "employer_sponsorship"] | Tuition is billed by academic quarter. (checked 2026-10-10) | https://www.kellogg.northwestern.edu/admissions/financial-aid/emba-fin-aid/ |
| paymentOptions | ["installments", "employer_sponsorship"] | If your organization is providing financial sponsorship, please state that in the letter as well. (checked 2026-10-10) | https://www.kellogg.northwestern.edu/admissions/emba-admissions/emba-how-to-apply/ |
| tuitionIncludes | Tuition only ($205,486 for 2026-2027). Food and housing ($42,986) are a separate required charge, for an estimated $248,472 in total; the total covers classes, e-books, a hotel room on the Miami campus, most meals, career services and accommodation for one global elective. Not covered: travel to and from campus and international travel for global electives. | designed to be comprehensive and all-inclusive (checked 2026-10-10) | https://www.kellogg.northwestern.edu/admissions/financial-aid/emba-fin-aid/ |
| cohortMedianExperienceYears | 15 | Students in our program have an average of 15 years of work experience, including military service, (checked 2026-10-10) | https://www.kellogg.northwestern.edu/admissions/emba-admissions/emba-how-to-apply/ |
| ratingNotes | (rating notes) | Hold senior positions (Director + VP + C-Suite) (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/emba-experience/class-profile/ |
| ratingNotes | (rating notes) | You are required to take all core courses, which you take at the same time as other students in your cohort. (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/curriculum-and-faculty/core-courses/ |
| ratingNotes | (rating notes) | The series consists of five workshops (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/curriculum-and-faculty/leadership-development.aspx |
| ratingNotes | (rating notes) | Executive Perspectives on Leadership (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/curriculum-and-faculty/core-courses/ |
| ratingNotes | (rating notes) | receive individual coaching sessions with a Kellogg executive leadership coach (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/curriculum-and-faculty/leadership-development.aspx |
| ratingNotes | (rating notes) | These specializations are not recorded on the transcript or diploma. (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/curriculum-and-faculty/specializations |
| ratingNotes | (rating notes) | Shift to a new function or industry with tools from the CMC that help you: (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/career-services/ |
| ratingNotes | (rating notes) | CMC coaching sessions are tailored to experienced professionals making high-impact decisions. (checked 2026-10-10) | https://www.kellogg.northwestern.edu/programs/executive-mba/career-services/ |
| onsiteNote | Thursday afternoon to midday Sunday once a month in Coral Gables (Miami), plus four intensive weeks a program, including orientation and Global Network Week in Evanston. | **no quote** | |
| state | Florida | **no quote** | |
| campusLat | 25.7497 | **no quote** | |
| campusLon | -80.2588 | **no quote** | |
| lodgingIncluded | true | **no quote** | |
| cohortExperienceBasis | average | **no quote** | |
| locationOffers | ["network_density", "travel_ease"] | **no quote** | |

**Ratings** (from the last block of `kellogg-emba-miami-rating.md`):

| Need | Score | Note |
| --- | --- | --- |
| leadership_skills | 4 | Required core courses Leadership and Executive Perspectives on Leadership, five team workshops and an executive leadership coach. |
| deep_expertise | 3 | A general MBA of 19 required core courses, including a capstone; specializations are not recorded on the diploma. |
| graduate_degree | 5 | Awards an MBA after two years. |
| senior_network | 4 | Classmates average 15 years of experience and hold director, VP and C-suite roles; four days together monthly. |
| new_industry_or_city | 4 | Career coaching for experienced professionals, including tools to shift to a new function or industry. |
