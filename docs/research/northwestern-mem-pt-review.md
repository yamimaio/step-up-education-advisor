# Review checklist: Master of Engineering Management

A draft record built from `docs/research/northwestern-mem-pt.md` and `docs/research/northwestern-mem-pt-overrides.json`. The first section lists what is uncertain, conflicting, assumed or set by hand; the second lists every set field with the school's verbatim quote and URL. **no quote** means the value was derived or proposed.

## Uncertain, conflicting or set by hand

**Mine (derived, assumed or set by hand):**

- `format: in_person` is now sourced: "All courses are offered on the Evanston campus." (flexible-format page, checked 2026-10-10), set in the overrides file (rate-program v3, PR #135). It replaces the earlier hand-set assumption.
- `cohortMedianExperienceYears 7.6` (`cohortExperienceBasis: average`) is the part-time students' average from the student body profile, dated Fall 2021 (R2; caveat in `figureNotes`). The homepage's undated "avg. seven years STEM experience" lands in the same band.
- `durationMonths 24` and `durationMaxMonths 36` come from the quote "Part-time option: 2-3 years" (a range, not a typical value).
- `courseCount: 12` is the published minimum, not a fixed total; `tuitionUsd` stays null, so the tuition check shows "about $97,200 at 12 courses (estimate)" only as a note, from the 2026–27 rate.
- `attendance: recurring_evenings` is set from the schedule quote and also covers the Saturday mornings: both mean weekly presence near campus, and `onsiteNote` keeps the full schedule. `recurring_weekends` would instead cost travel trips. `locationOffers` is my proposal (industry_hub).
- `state: Illinois` comes from the campus address ("Evanston, IL 60208"), set in the overrides file.
- `onsiteDaysPerYear` stays null: the school publishes no meeting count per course or quarter length, and the days depend on the student's load (one or two courses a quarter, quarters optional). The engine treats evening attendance as needing the student nearby, so commuting distance and the location check decide; only a user who caps on-site days sees it as not published.

**From the research file's "uncertain or conflicting" list:**

- **Intake versus price year:** Fall 2027 is the latest named part-time intake, while verified prices cover 2026–2027; those prices cannot be represented as Fall 2027 tuition.
- **Course versus unit:** The program publishes US\$8,100 **per course**, while Student Finance publishes US\$8,100 **per unit**; the captured evidence does not explicitly establish a one-to-one mapping for every required course.
- **Seminar counting:** The curriculum states a 12-course minimum and separately identifies a zero-unit seminar; its counting treatment needs confirmation before assigning total awarded units.
- **Experience statistic:** The seven-year homepage reference lacks a verified mean/median label, cohort year, and part-time/full-time split in the captured evidence.
- **Credential naming:** The program says “Master of Engineering Management,” while an older financial-aid page says “Master of Science in Engineering Management”; the exact diploma title needs confirmation.
- **Older costs:** The financial-aid cost-of-attendance page describes 2025–2026, so its fees and living-cost figures are not valid evidence for the latest intake.
- **Attendance and workload:** Evening/Saturday scheduling does not establish annual on-site days, separate trips, online percentage, or weekly study hours.
- **Unresolved evidence:** Full-time experience profile, cohort size, alumni access, seniority distribution, accreditation, tuition inclusions, exact start date, and Evanston’s FY2027 GSA lodging rate remain unverified.

**Ratings marked low evidence:** new_industry_or_city (career offices are listed, but access for part-time students is not stated). All five needs were re-reviewed under rate-program v3 on Oct 10 with Northwestern's pages; no rating changed, and senior_network now rests on the part-time average. Close calls: new_industry_or_city 3 or 2 (see the last block of `northwestern-mem-pt-rating.md`).

## Fields, quotes and URLs

Every source in the record, with the value it backs. **no quote** means the value was derived or proposed. Sources with field `ratingNotes` back facts stated in the rating notes.

| Field | Value | Verbatim quote | URL |
| --- | --- | --- | --- |
| name | Master of Engineering Management | Master of Engineering Management (checked 2026-10-08) | https://www.mccormick.northwestern.edu/engineering-management/ |
| institution | Northwestern University | Northwestern University’s Evanston campus (checked 2026-10-08) | https://www.mccormick.northwestern.edu/engineering-management/ |
| category | specialized_masters | Master of Engineering Management degree (checked 2026-10-08) | https://www.mccormick.northwestern.edu/engineering-management/curriculum/ |
| credential | Master of Engineering Management | Master of Engineering Management degree (checked 2026-10-08) | https://www.mccormick.northwestern.edu/engineering-management/curriculum/ |
| workCompatible | true | Choose the part-time option to accommodate work or personal needs (checked 2026-10-08) | https://www.mccormick.northwestern.edu/engineering-management/ |
| city | Evanston | Northwestern University’s Evanston campus (checked 2026-10-08) | https://www.mccormick.northwestern.edu/engineering-management/ |
| paymentOptions | ["scholarships", "loans"] | The Albert H. Rubenstein Memorial Scholarship is based on merit and is awarded during the application process. (checked 2026-10-08) | https://www.mccormick.northwestern.edu/engineering-management/overview/tuition/financial-aid.html |
| paymentOptions | ["scholarships", "loans"] | master’s students are provided with a variety of federal and private loan options (checked 2026-10-08) | https://www.mccormick.northwestern.edu/academics/graduate/prospective-student-resources/financial-aid.html |
| durationMonths | 24 | Part-time option: 2-3 years (checked 2026-10-08) | https://www.mccormick.northwestern.edu/engineering-management/ |
| attendance | recurring_evenings | Classes held Monday - Thursday evenings + Saturday mornings (checked 2026-10-08) | https://www.mccormick.northwestern.edu/engineering-management/ |
| credits | A minimum number of 12 courses is required | A minimum number of 12 courses is required (checked 2026-10-08) | https://www.mccormick.northwestern.edu/engineering-management/curriculum/ |
| tuitionPerCourseUsd | 8100 | $8,100 per course for part-time students (checked 2026-10-08) | https://www.mccormick.northwestern.edu/engineering-management/overview/tuition/ |
| campusAddress | 2311 N. Campus Drive, Office Suite 1400 (first floor), Evanston, IL 60208 | Northwestern University 2311 N. Campus Drive, Office Suite 1400 (first floor), Evanston, IL 60208 (checked 2026-10-08) | https://www.mccormick.northwestern.edu/engineering-management/ |
| format | in_person | All courses are offered on the Evanston campus. (checked 2026-10-10) | https://www.mccormick.northwestern.edu/engineering-management/overview/flexible-format.html |
| cohortMedianExperienceYears | 7.6 | Note: Data below is from Fall 2021 ... Average Work Experience ... Part-Time Students: 7.6 years (checked 2026-10-10) | https://www.mccormick.northwestern.edu/engineering-management/overview/student-body-profile.html |
| ratingNotes | (rating evidence) | Choose one (1) of the following Capstone courses: ... MEM 436: Technology Strategy for Products ... MEM 437: Strategic Management for Engineers (checked 2026-10-10) | https://www.mccormick.northwestern.edu/engineering-management/curriculum/ |
| ratingNotes | (rating evidence) | 20-30 students in each academic course (checked 2026-10-10) | https://www.mccormick.northwestern.edu/engineering-management/ |
| ratingNotes | (rating evidence) | Program is not a cohort format to allow additional flexibility (checked 2026-10-10) | https://www.mccormick.northwestern.edu/engineering-management/ |
| ratingNotes | (rating evidence) | The Engineering Career Development Office helps provide career advice to engineering students (checked 2026-10-10) | https://www.mccormick.northwestern.edu/engineering-management/overview/career-development.html |
| ratingNotes | (rating evidence) | Northwestern Career Advancement offers comprehensive career services including career counseling and assessment (checked 2026-10-10) | https://www.mccormick.northwestern.edu/engineering-management/overview/career-development.html |
| durationMaxMonths | 36 | **no quote** | |
| onsiteNote | Classes held Monday - Thursday evenings + Saturday mornings | **no quote** | |
| state | Illinois | **no quote** | |
| campusLat | 42.0565 | **no quote** | |
| campusLon | -87.6753 | **no quote** | |
| country | US | **no quote** | |
| courseCount | 12 | **no quote** | |
| cohortExperienceBasis | average | **no quote** | |
| locationOffers | ["industry_hub"] | **no quote** | |
| figureNotes | {"tuitionPerCourseUsd": "2026-27 rate; the Fall 2027 rate is not published.", "courseCount": "A minimum; the school publishes no fixed total.", "durationMonths": "The school publishes a 2-3 year range for the part-time option.", "campusLat": "Derived from campusAddress (approximate, from the street address).", "campusLon": "Derived from campusAddress (approximate, from the street address).", "cohortMedianExperienceYears": "Average for part-time students in Fall 2021, the latest student body profile the school publishes."} | **no quote** | |

**Ratings** (from the last block of `northwestern-mem-pt-rating.md`):

| Need | Score | Note |
| --- | --- | --- |
| leadership_skills | 4 | Required Leadership and Organizational Behavior course and rotating leadership roles in a simulation. |
| deep_expertise | 5 | Twelve-course master's in engineering management with a required strategy capstone course. |
| graduate_degree | 5 | Awards the Master of Engineering Management. |
| senior_network | 2 | Part-time students averaged 7.6 years of experience (Fall 2021); 20 to 30 students per course. |
| new_industry_or_city (low evidence) | 3 | Engineering career office and Northwestern Career Advancement offer advising; access for part-time students is not stated. |
