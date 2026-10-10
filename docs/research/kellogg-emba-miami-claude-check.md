# Kellogg EMBA Miami: Claude's independent research

Claude's own research on official Kellogg and Northwestern pages (2026-10-10), done without seeing Perplexity's answers. It backs the ratings block Claude added at the end of `kellogg-emba-miami-rating.md`, written before reading Perplexity's rating, and the sourced facts in `kellogg-emba-miami-overrides.json`. The record is built from `kellogg-emba-miami.md` (Perplexity) plus those overrides.

Pages were read through a page reader; the quotes the record or the card notes use were re-checked on the page. The core course list is on the core courses page (https://www.kellogg.northwestern.edu/programs/executive-mba/curriculum-and-faculty/core-courses/).


Checked on 2026-10-10. Sources are official Kellogg/Northwestern pages, plus gsa.gov for the per-diem rate only.

Method note: direct HTTP (curl) to kellogg.northwestern.edu was blocked by the egress proxy. All quotes were taken with WebFetch, asking for character-for-character extracts, and the key ones were re-requested a second time to check them. Quotes are short and should be verbatim. The WebFetch extractor does not guarantee exact punctuation, though, so watch for dashes: the page shows "Thursday–Sunday" with an en dash and dates as "February 4 - 7, 2027".

## PART 1: JSON

```json
{
  "name": "Executive MBA (Miami, monthly)",
  "institution": "Kellogg School of Management, Northwestern University",
  "category": "emba",
  "credential": "MBA (Executive MBA Program; degree title wording not published on the pages checked)",
  "format": "In person, once a month Thursday afternoon to midday Sunday in Coral Gables (Miami), plus 4 intensive weeks (incl. orientation and Global Network Week in Evanston)",
  "durationMonths": 24,
  "credits": null,
  "onsiteDaysPerYear": null,
  "residencyCount": 4,
  "longestStretchDays": 6,
  "hoursPerWeekMin": null,
  "hoursPerWeekMax": null,
  "workCompatible": true,
  "city": "Coral Gables (Miami)",
  "state": "FL",
  "campusAddress": "95 Merrick Way #100, Coral Gables, FL 33134",
  "country": "US",
  "tuitionUsd": 205486,
  "tuitionIncludes": "Published 2026-2027 costs for the whole two-year program: tuition $205,486 plus food and housing $42,986, estimated total $248,472. Billed in 6 equal quarters of $41,412, which add up to $248,472. The total covers classes, e-books, PDF handouts and classroom supplies, a room at the Hyatt Regency Coral Gables for core and elective classes, three meals a day, career services, and one global elective (accommodation, e-books, most meals). Not covered: travel to and from campus, and international travel for a global elective.",
  "paymentOptions": "Billed by academic quarter, six equal quarters, through CAESAR (online or by mail). Federal and private loans, employer sponsorship, scholarships, GI Bill and Yellow Ribbon. Financial sponsorship is not required; time sponsorship is.",
  "minExperienceYears": 8,
  "accreditation": "AACSB (Association to Advance Collegiate Schools of Business), accredited; last review 2022, next 2027-2028",
  "cohortMedianExperienceYears": 15,
  "cohortMedianExperienceYearsBasis": "average (not median)",
  "cohortSeniority": "Senior positions (Director + VP + C-Suite) stated without a percentage; managerial experience across people and/or programs expected. Class size 141 Miami / 144 Chicago (Sept 2024 + Jan 2025 intakes combined); 60-70 per Miami cohort.",
  "lodgingPerNightUsd": 151,
  "lodgingPerNightNote": "GSA FY2027 (Oct 2026-Sep 2027) lodging rate for Miami, Miami-Dade County: $151 in Oct, Nov, Jun, Jul, Aug, Sep; $219 in Dec, Jan; $244 in Feb, Mar; $194 in Apr, May. M&IE $92. Lodging is included in Kellogg program costs anyway.",
  "nextStartDate": "2027-01-11",
  "nextStartDateNote": "January 2027 cohort: check-in January 11, 2027, programming January 12-17, 2027. Last application deadline is October 7, 2026. The next cohort after that is September 2027 (check-in August 24, 2027).",
  "sources": [
    {"field": "format", "url": "https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/miami-monthly/", "quote": "Take classes once a month, beginning Thursday afternoon and ending midday Sunday.", "checkedOn": "2026-10-10"},
    {"field": "format", "url": "https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/", "quote": "1x month", "checkedOn": "2026-10-10"},
    {"field": "format", "url": "https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/", "quote": "Thursday–Sunday", "checkedOn": "2026-10-10"},
    {"field": "durationMonths", "url": "https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/", "quote": "2 years", "checkedOn": "2026-10-10"},
    {"field": "residencyCount", "url": "https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/", "quote": "Includes new student orientation and Global Network Week.", "checkedOn": "2026-10-10"},
    {"field": "residencyCount", "url": "https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/", "quote": "4", "checkedOn": "2026-10-10"},
    {"field": "longestStretchDays", "url": "https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/miami-monthly/", "quote": "Programming: January 12 - 17, 2027", "checkedOn": "2026-10-10"},
    {"field": "credits", "url": "https://www.kellogg.northwestern.edu/programs/executive-mba/curriculum-and-faculty/", "quote": "not published", "checkedOn": "2026-10-10"},
    {"field": "onsiteDaysPerYear", "url": "https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/miami-monthly/", "quote": "August 2027 (Global network week)", "checkedOn": "2026-10-10"},
    {"field": "hoursPerWeekMin", "url": "https://www.kellogg.northwestern.edu/programs/executive-mba/", "quote": "not published", "checkedOn": "2026-10-10"},
    {"field": "workCompatible", "url": "https://www.kellogg.northwestern.edu/admissions/emba-admissions/emba-how-to-apply/", "quote": "The Executive MBA Program is designed for fully-employed professionals with at least eight years of work experience.", "checkedOn": "2026-10-10"},
    {"field": "city", "url": "https://www.kellogg.northwestern.edu/the-experience/campuses/miami/", "quote": "The campus is in Coral Gables, FL., located right outside of downtown Miami.", "checkedOn": "2026-10-10"},
    {"field": "campusAddress", "url": "https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/miami-monthly/", "quote": "95 Merrick Way # 100, Coral Gables, FL 33134", "checkedOn": "2026-10-10"},
    {"field": "tuitionUsd", "url": "https://www.kellogg.northwestern.edu/admissions/financial-aid/emba-fin-aid/", "quote": "2026-2027 tuition and estimated expenses for entirety of the two-year EMBA program", "checkedOn": "2026-10-10"},
    {"field": "tuitionUsd", "url": "https://www.kellogg.northwestern.edu/admissions/financial-aid/emba-fin-aid/", "quote": "$205,486", "checkedOn": "2026-10-10"},
    {"field": "tuitionIncludes", "url": "https://www.kellogg.northwestern.edu/admissions/financial-aid/emba-fin-aid/", "quote": "This means your total costs cover everything from classes and e-books to accommodations on the Miami and Chicago campuses, most meals, career services and more.", "checkedOn": "2026-10-10"},
    {"field": "tuitionIncludes", "url": "https://www.kellogg.northwestern.edu/admissions/financial-aid/emba-fin-aid/", "quote": "Hyatt Regency Coral Gables (Miami campus) for core and elective classes", "checkedOn": "2026-10-10"},
    {"field": "tuitionIncludes", "url": "https://www.kellogg.northwestern.edu/admissions/financial-aid/emba-fin-aid/", "quote": "Three meals a day, unlimited snacks, coffee breaks and more.", "checkedOn": "2026-10-10"},
    {"field": "tuitionIncludes", "url": "https://www.kellogg.northwestern.edu/admissions/financial-aid/emba-fin-aid/", "quote": "All e-books, PDF handouts and classroom supplies (notebooks, pencils, highlighters, etc.).", "checkedOn": "2026-10-10"},
    {"field": "tuitionIncludes", "url": "https://www.kellogg.northwestern.edu/admissions/financial-aid/emba-fin-aid/", "quote": "Travel to and from the campuses for study.", "checkedOn": "2026-10-10"},
    {"field": "paymentOptions", "url": "https://www.kellogg.northwestern.edu/admissions/financial-aid/emba-fin-aid/", "quote": "Tuition is billed by academic quarter.", "checkedOn": "2026-10-10"},
    {"field": "paymentOptions", "url": "https://www.kellogg.northwestern.edu/admissions/emba-admissions/emba-how-to-apply/", "quote": "Kellogg does not require financial sponsorship from its Executive MBA applicants, but we do require time sponsorship.", "checkedOn": "2026-10-10"},
    {"field": "minExperienceYears", "url": "https://www.kellogg.northwestern.edu/admissions/emba-admissions/emba-how-to-apply/", "quote": "with at least eight years of work experience", "checkedOn": "2026-10-10"},
    {"field": "accreditation", "url": "https://www.northwestern.edu/provost/about/university-accreditation/specialized-accreditation.html", "quote": "Association to Advance Collegiate Schools of Business", "checkedOn": "2026-10-10"},
    {"field": "cohortMedianExperienceYears", "url": "https://www.kellogg.northwestern.edu/admissions/emba-admissions/emba-how-to-apply/", "quote": "Students in our program have an average of 15 years of work experience", "checkedOn": "2026-10-10"},
    {"field": "cohortSeniority", "url": "https://www.kellogg.northwestern.edu/programs/executive-mba/emba-experience/class-profile/", "quote": "Hold senior positions", "checkedOn": "2026-10-10"},
    {"field": "cohortSeniority", "url": "https://www.kellogg.northwestern.edu/programs/executive-mba/emba-experience/class-profile/", "quote": "(Director + VP + C-Suite)", "checkedOn": "2026-10-10"},
    {"field": "cohortSeniority", "url": "https://www.kellogg.northwestern.edu/programs/executive-mba/emba-experience/class-profile/", "quote": "Class size: 144 Chicago, 141 Miami", "checkedOn": "2026-10-10"},
    {"field": "cohortSeniority", "url": "https://www.kellogg.northwestern.edu/admissions/emba-admissions/emba-how-to-apply/", "quote": "managerial experience across people and/or programs", "checkedOn": "2026-10-10"},
    {"field": "lodgingPerNightUsd", "url": "https://www.gsa.gov/travel/plan-book/per-diem-rates/per-diem-rates-results?action=perdiems_report&state=FL&fiscal_year=2027&zip=&city=Miami", "quote": "Miami | Miami-Dade | $151 (2026 Oct)", "checkedOn": "2026-10-10"},
    {"field": "nextStartDate", "url": "https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/miami-monthly/", "quote": "Check-in: January 11, 2027", "checkedOn": "2026-10-10"},
    {"field": "nextStartDate", "url": "https://www.kellogg.northwestern.edu/admissions/emba-admissions/emba-how-to-apply/", "quote": "The last deadline to apply for the Winter 2027 start is October 7", "checkedOn": "2026-10-10"}
  ]
}
```

Notes on the JSON values:
- `tuitionUsd` is tuition alone ($205,486). The all-in figure Kellogg bills is $248,472: tuition plus food and housing, 6 x $41,412. Use $248,472 if the dataset compares all-inclusive costs. These are 2026-2027 rates. Kellogg says costs are set each spring and that tuition has historically risen 3-4% a year, so the January 2027 cohort's second year will likely cost more.
- `onsiteDaysPerYear` is null because the length and dates of Global Network Week are not published ("August 2027"). See the count below.
- `lodgingPerNightUsd` is the GSA FY2027 off-peak rate. The February 2027 peak is $244. The GSA row is the whole of Miami-Dade County, which includes Coral Gables.
- `durationMonths` 24 comes from "2 years". The first session is January 2027; the second-year calendar is not published.

### On-site day count (January 2027 cohort, year 1, from the published Miami calendar)

Source: https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/miami-monthly/

| Session | Dates | Days counted |
|---|---|---|
| Orientation/Launch Week | Programming: January 12 - 17, 2027 (check-in Jan 11) | 6 |
| Class weekend | February 4 - 7, 2027 | 4 |
| Class weekend | March 4 - 7, 2027 | 4 |
| Class weekend | April 1 - 4, 2027 | 4 |
| Class weekend | May 20 - May 23, 2027 | 4 |
| Class weekend | June 24 - 27, 2027 | 4 |
| Intensive week | July 13 - 17, 2027 | 5 |
| Global Network Week | August 2027 (dates not published; held in Evanston per global-network page) | unknown |
| Class weekend | September 9 - 12, 2027 | 4 |
| Class weekend | October 7 - 10, 2027 | 4 |
| Class weekend | November 4 - 7, 2027 | 4 |

- Known days: 6 + 8 weekends x 4 + 5 = **43**, plus Global Network Week (length not published). Thursday (classes start in the afternoon) and Sunday (classes end at midday) are each counted as full days.
- Separate trips in year 1: **11** (orientation, 8 weekends, intensive week, GNW).
- Longest stretch: **6 days**, the orientation programming January 12-17, 2027 (7 calendar days if check-in on January 11 counts). GNW might be longer, but its length is not published.
- The second-year schedule is not published: "As class weekend schedules will differ depending on the electives you take, second year schedules are not available."
- The page does not say where orientation and the July intensive week take place (Miami or Evanston).

September 2027 cohort, year 1 (same page): Orientation August 25 - 29, 2027 (check-in August 24); weekends September 16-19, October 14-17, November 11-14 (2027); January 27-30, February 24-27, March 23-26, April 20-23, May 18-21, June 15-18 (2028); intensive week July 12-16, 2028; Global network week August 2028. Count: 5 + 9 x 4 + 5 = 46 days plus GNW; 12 trips.

## PART 2: evidence for ratings

### Leadership content
- Core courses (all required): "You are required to take all core courses, which you take at the same time as other students in your cohort." The page lists 19 core courses: Accounting for Management Planning and Control; Analytical Approach to Uncertainty; Capstone; Economics of Competition; **Executive Perspectives on Leadership**; Financial Reporting Systems; Foundations for Strategy Formulation; Frameworks for Strategic Analysis; **Leadership**; Managerial Economics; Managerial Finance I; Managerial Finance II; Marketing Management; Marketing Strategy; **Negotiation Strategies**; Operations Management; **Purposeful Collaboration**; Statistical Decision Analysis; **Strategic Crisis Management**. The heading reads "Courses designed to create strategic leaders". URL: https://www.kellogg.northwestern.edu/programs/executive-mba/curriculum-and-faculty/core-courses/
- Leadership development programming (https://www.kellogg.northwestern.edu/programs/executive-mba/curriculum-and-faculty/leadership-development.aspx):
  - "The series consists of five workshops." (team-building series)
  - "receive individual coaching sessions with a Kellogg executive leadership coach"
  - "personal assessments are available to help you to know yourself more fully" (ESCI, CareerLeader and StrengthsFinder are named)
  - Session titles include "Values-Based Leadership" and "A Call to Action: How Your Leadership Will Forge Your Legacy", and there is a Lavin-Bernick executive speaker series.

### Depth / majors
- Electives: "a minimum of four and a maximum of eight credits", taken in the second year. The page claims "more than 50 elective courses, including 7 AI-focused electives" in the body, but "40+ electives" in its meta description. Elective categories: Accounting and Finance; Innovation and Entrepreneurship; Management and Organizations; Marketing; Strategy. URL: https://www.kellogg.northwestern.edu/programs/executive-mba/curriculum-and-faculty/elective-courses/
- Specializations: Analytics and AI; Entrepreneurship; Financial Asset Management; Healthcare at Kellogg; Product Management. The page says "These specializations are not recorded on the transcript or diploma." So there are no formal majors. URL: https://www.kellogg.northwestern.edu/programs/executive-mba/curriculum-and-faculty/specializations
- Electives are offered on the Chicago and Miami campuses, at partner campuses and at "pop-up locations around the world".

### Degree
- MBA from Northwestern University's Kellogg School of Management ("Executive MBA Program"). Total credits or units are not published. Kellogg does say "The maximum time limit for completion of the Executive MBA degree is five years." (https://www.kellogg.northwestern.edu/admissions/financial-aid/emba-fin-aid/emba-loans/satisfactory-academic-progress/)
- Accreditation: AACSB. Last review 2022, next review 2027-2028, status "Accredited". URL: https://www.northwestern.edu/provost/about/university-accreditation/specialized-accreditation.html
- Tests: "The Executive MBA Program does not require GMAT, GRE or Executive Assessment scores for most applicants." (how-to-apply page)

### Cohort seniority, time together, network
- "Students in our program have an average of 15 years of work experience" (how-to-apply page). This is an average, not a median. No breakdown by experience band is published.
- Class profile: "Get a sense of the incoming cohorts for Chicago and Miami (combined) from September 2024 and January 2025." It shows "Class size: 144 Chicago, 141 Miami" and "Hold senior positions (Director + VP + C-Suite)", but with no percentage or typical titles. Industry mix (combined): Health/Bio 17%, Tech 16%, Financial Services 13%, Manufacturing 11%, Consulting 8%. Functions: Marketing/Sales 17%, Business Dev/Strategy 16%, Finance/Accounting 13%. URL: https://www.kellogg.northwestern.edu/programs/executive-mba/emba-experience/class-profile/
- Miami cohort size is "60–70" per intake, against "65–75" for Chicago (locations-and-schedule page).
- Time together: core courses are taken with the whole cohort. Year 1 is orientation, about 8-9 four-day weekends, an intensive week and Global Network Week.
- Global Network: "Each year, more than 400 students from Kellogg's six campuses convene in Evanston for Global Network Week". The partner schools are in Beijing, Hong Kong, Toronto and Vallendar. URL: https://www.kellogg.northwestern.edu/programs/executive-mba/global-network/
- Alumni network: "an alumni network of more than 70,000 for life" (career services page).

### Career services / career-switch support
- https://www.kellogg.northwestern.edu/programs/executive-mba/career-services/:
  - "CMC coaching sessions are tailored to experienced professionals making high-impact decisions."
  - "Shift to a new function or industry with tools from the CMC that help you:"
  - "lifetime complimentary coaching" for EMBA alumni
- Class of 2025 outcomes (https://www.kellogg.northwestern.edu/news/blog/2026/09/29/emba-career-outcomes/): 47% promoted; 37% changed job function and 30% changed industry; 12% started or are starting a venture; nearly 1,200 coaching appointments in the past year; half of EMBA students used coaching. These are paraphrased by the extractor; re-check the exact wording before quoting.
- Career services are included in program costs (financial aid page).

### Chicago alternative (twice monthly)
- "Students attending the Chicago campus take classes every other week, beginning Friday afternoon and ending Saturday evening, or, approximately once per quarter on Sunday afternoon." Classes are at Wieboldt Hall; lodging is at the Omni All-Suites Hotel. URL: https://www.kellogg.northwestern.edu/programs/executive-mba/locations-and-schedule/chicago-twice-monthly/
- January 2027 cohort: orientation January 19-24, 2027 (check-in January 18). 15 class sessions of 2-3 days, from February 5-7 to November 12-13. Intensive week June 21-25, 2027; Global Network Week August 2027.
- Same 2-year length, 4 intensive weeks, tuition and deadlines. Cohort size 65–75.

## Uncertain or conflicting
1. **Tuition vs. total.** Tuition is $205,486, but Kellogg bills $248,472: 6 quarters x $41,412, which includes food and housing of $42,986. The page lists "Food and housing" as a separate line even though lodging and meals are provided. These are 2026-2027 rates; second-year rates may rise 3-4%.
2. **On-site days.** These can't be fully counted because Global Network Week has no published dates or length. Known days are 43 for the January 2027 cohort and 46 for the September 2027 cohort, each plus GNW. Thursday and Sunday are partial days. The second year is unpublished.
3. **Where intensive weeks are held.** Only GNW is stated (Evanston). Nothing says where orientation or the July intensive week take place. The new Ann McIlrath Drake Executive Center ("Set to open in 2027") may host EMBA sessions, but no page says so.
4. **Experience figure.** "Average of 15 years" comes from the how-to-apply page. The class profile and admissions pages show "years average work experience" with the number missing in the fetched text, probably a JS counter. No median and no bands are published.
5. **Class size of 141 for Miami** appears to combine the September 2024 and January 2025 intakes, which fits the stated 60–70 per cohort. This is my inference.
6. **Address.** "95 Merrick Way # 100, Coral Gables, FL 33134" appears only in the Google Maps directions link on the Miami page, not as page text. The Miami campus page shows no street address.
7. **Electives count.** The elective page says "more than 50" in the body and "40+" in its meta description.
8. **Credits or units** are not published. "Credits" is used for electives only (4-8 in year 2).
9. **Hours per week** are not published on current official pages.
10. The **career-outcomes figures** are paraphrased by the extractor rather than verbatim quotes.
