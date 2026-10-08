# Morning review checklist

Four draft records, built from `docs/research/`. Tables list every set field with the school's verbatim quote and URL. A value in a row marked **no quote** was derived or proposed (see the lists below).

## Uncertain, conflicting or set by hand

### Organizational Behavior Graduate Certificate (Online) (`harvard-ext-org-behavior`)

**Mine (derived, assumed or set by hand):**

- `attendance: none` follows from format online (converter rule); `locationOffers` is my proposal (travel_ease, affordability), not a researched fact.
- Research Part 1 gives `lodgingPerNightUsd: 365`; dropped by the converter because the program is online.
- `durationMonths: 8` is the fastest pace; `durationMaxMonths` is null (no quote for the slowest pace on this program's page).

**From the research file's "uncertain or conflicting" list:**

- **Duration wording conflicts across official pages.** The program-specific page says a student taking two courses per semester can finish in **8 months**, while the general certificate policy page says most four-course certificates can be completed in **one year**. The JSON uses 8 months because the program-specific page is controlling for this program.
- **Total credits are not published on the program page.** Four required courses are explicitly graduate-credit courses, and a current core course is 4 credits, but the total has not been inferred across every possible elective pathway.
- **No exact Spring 2027 start day is published on the program page.** It publishes only “Spring 2027”; registration runs November 5, 2026 through January 19, 2027, which is not the program start date.
- **The GSA lodging rate is seasonal, not one annual number.** FY2027 Boston/Cambridge lodging is $365 in October 2026 and September 2027, $213 from November through February, and $305 from March through August. The JSON scalar uses **$365**, the rate in force on the October 8, 2026 check date; it is not a program cost because the certificate has no on-campus requirement.
- **Current cohort size, median/average experience, and majority seniority are not published.** A 2024 fast-facts document contains historical employment bands and titles but is not a Spring 2027 class profile, so its experience distribution was not transferred into the JSON cohort field.
- **Weekly workload is not program-specific.** Harvard publishes a general rule of at least two hours outside class per class hour, but no certificate-specific minimum and maximum weekly hours.
- **Course availability can change.** Harvard says multiple options are available in fall, spring, and summer and that “Offerings vary by term”; therefore, named Spring 2027 options should not be treated as a permanent exhaustive curriculum.
- **Master’s credit is conditional, not automatic for every course.** The certificate can stack into Management or Industrial-Organizational Psychology, but Harvard explicitly warns that “Not every certificate course counts toward a degree.”
- **The accreditation field is intentionally empty under the requested schema for a non-degree certificate.** Harvard Extension School itself states that it is NECHE-accredited, but no separate programmatic accreditation is published for this certificate.
- **No primary on-site city exists for the program.** Cambridge is Harvard Extension School’s institutional location, but all four certificate courses are online and no residency is required.

**Ratings marked low evidence:** network, practicality, costValue.

### Blended Professional Certificate: Technology Leadership Program (`mit-tlp`)

**Mine (derived, assumed or set by hand):**

- `workCompatible: true` rests only on a participant testimonial ("I wouldn't have to stop my work…"); MIT publishes no workload or part-time policy. Please confirm or flip it.
- `attendance: residencies` is derived from `residencyCount: 3`; `onsiteNote` is the school's own phrase from the residencies quote; `locationOffers` is my proposal (network_density, industry_hub).
- `lodgingPerNightUsd {213, 365}` is the range of the three GSA seasonal rates in the quote (the engine uses the max).
- `category: executive` and `state` ("Massachusetts", split from the research city) have no quote of their own.

**From the research file's "uncertain or conflicting" list:**

- **Next cohort status:** MIT’s official catalog lists September 11, 2026 to April 30, 2027, while the MIT/Great Learning landing page says “Next Cohort TBD” and “Hybrid · To be announced.” The catalog dates are used because they are the only published specific dates.
- **Immersion locations:** The landing page describes “3 residential weeks at MIT, Cambridge, Boston,” while the catalog lists “MIT Campus \& Live-Online.” The exact campus venue and exact schedule for each residential week are not published.
- **Onsite-day counts:** “Three residential weeks” is published, but neither official source defines the number of instructional or travel days in each week. Total onsite days and longest trip length are therefore not published.
- **Weekly workload:** The program publishes 14+ live online sessions but not their length, total online hours, asynchronous-study expectations, or a weekly workload range.
- **Cohort statistics:** No official cohort size, median/average work experience, or systematic title distribution is published. Participant testimonials are not treated as a class profile.
- **Tuition coverage:** The \$28,000 program fee is published, but inclusions and exclusions—especially lodging, meals, travel, materials, and residency expenses—are not specified.
- **Lodging value:** GSA publishes a monthly seasonal rate for Boston/Cambridge, so there is no truthful single current-fiscal-year lodging number without knowing residence dates.

**Ratings marked low evidence:** practicality, costValue.

### Master of Engineering Management (`northwestern-mem-pt`)

**Mine (derived, assumed or set by hand):**

- **`format: in_person` is my assumption.** The research leaves format null (schema requires a value). The only evidence is the on-campus Monday–Thursday evening and Saturday schedule. Please confirm; hybrid or online would change the location checks.
- `durationMonths 24` and `durationMaxMonths 36` come from the quote "Part-time option: 2-3 years" (a range, not a typical value).
- `courseCount: 12` is the published minimum, not a fixed total; `tuitionUsd` stays null, so the tuition check shows "about $97,200 at 12 courses (estimate)" only as a note, from the 2026–27 rate.
- `attendance: recurring_evenings` is set by hand from the schedule quote; `locationOffers` is my proposal (industry_hub).

**From the research file's "uncertain or conflicting" list:**

- **Intake versus price year:** Fall 2027 is the latest named part-time intake, while verified prices cover 2026–2027; those prices cannot be represented as Fall 2027 tuition.
- **Course versus unit:** The program publishes US\$8,100 **per course**, while Student Finance publishes US\$8,100 **per unit**; the captured evidence does not explicitly establish a one-to-one mapping for every required course.
- **Seminar counting:** The curriculum states a 12-course minimum and separately identifies a zero-unit seminar; its counting treatment needs confirmation before assigning total awarded units.
- **Experience statistic:** The seven-year homepage reference lacks a verified mean/median label, cohort year, and part-time/full-time split in the captured evidence.
- **Credential naming:** The program says “Master of Engineering Management,” while an older financial-aid page says “Master of Science in Engineering Management”; the exact diploma title needs confirmation.
- **Older costs:** The financial-aid cost-of-attendance page describes 2025–2026, so its fees and living-cost figures are not valid evidence for the latest intake.
- **Attendance and workload:** Evening/Saturday scheduling does not establish annual on-site days, separate trips, online percentage, or weekly study hours.
- **Unresolved evidence:** Full-time experience profile, cohort size, alumni access, seniority distribution, accreditation, tuition inclusions, exact start date, and Evanston’s FY2027 GSA lodging rate remain unverified.

**Ratings marked low evidence:** network, costValue.

### MBA Program for Executives (`wharton-emba-sf`)

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

---

## Tables

### Organizational Behavior Graduate Certificate (Online) (`harvard-ext-org-behavior`)

| Field | Value | Verbatim quote | URL |
| --- | --- | --- | --- |
| name | Organizational Behavior Graduate Certificate (Online) | Organizational Behavior Graduate Certificate (Online) (checked 2026-10-08) | https://extension.harvard.edu/academics/programs/organizational-behavior-certificate/ |
| institution | Harvard Extension School | Institution Harvard Extension School (checked 2026-10-08) | https://coursebrowser.dce.harvard.edu/program/organizational-behavior-graduate-certificate/ |
| category | certificate | Program Type Graduate Certificate (checked 2026-10-08) | https://coursebrowser.dce.harvard.edu/program/organizational-behavior-graduate-certificate/ |
| credential | Graduate Certificate | Program Type Graduate Certificate (checked 2026-10-08) | https://coursebrowser.dce.harvard.edu/program/organizational-behavior-graduate-certificate/ |
| format | online | Format Online (checked 2026-10-08) | https://coursebrowser.dce.harvard.edu/program/organizational-behavior-graduate-certificate/ |
| durationMonths | 8 | Finish in 8 Months – 3 Years (checked 2026-10-08) | https://extension.harvard.edu/academics/programs/organizational-behavior-certificate/ |
| attendance | none | **no quote** | |
| onsiteDaysPerYear | 0 | All graduate certificates may be completed entirely through online education. (checked 2026-10-08) | https://extension.harvard.edu/about/faq/ |
| residencyCount | 0 | All graduate certificates may be completed entirely through online education. (checked 2026-10-08) | https://extension.harvard.edu/about/faq/ |
| longestStretchDays | 0 | The Organizational Behavior Graduate Certificate includes four online courses (checked 2026-10-08) | https://extension.harvard.edu/academics/programs/organizational-behavior-certificate/ |
| workCompatible | true | The courses can be completed on a part-time basis, allowing many to continue working full time. (checked 2026-10-08) | https://extension.harvard.edu/academics/graduate-certificates/ |
| country | US | 51 Brattle Street Cambridge, MA 02138 (checked 2026-10-08) | https://extension.harvard.edu/registration-admissions/for-students/support-and-services/sexual-assault-and-harassment-resources/ |
| tuitionUsd | 14320 | Tuition $14,320 (checked 2026-10-08) | https://extension.harvard.edu/academics/programs/organizational-behavior-certificate/ |
| tuitionPerCourseUsd | 3580 | Tuition $3,580 per course (checked 2026-10-08) | https://coursebrowser.dce.harvard.edu/program/organizational-behavior-graduate-certificate/ |
| courseCount | 4 | The Organizational Behavior Graduate Certificate includes four online courses (checked 2026-10-08) | https://extension.harvard.edu/academics/programs/organizational-behavior-certificate/ |
| tuitionIncludes | Tuition for four courses at the published 2026–27 rate of $3,580 per course. Harvard states that books, course materials, supplies, equipment, and certain transaction-related fees may be additional; lodging and meals are not included. | some courses may require additional lab fees or the purchase of specific books and materials relevant to that class (checked 2026-10-08) | https://extension.harvard.edu/paying-for-school/ |
| paymentOptions | ["installments","employer_sponsorship","loans","scholarships"] | These interest-free plans allow you to pay your tuition in four installments. (checked 2026-10-08) | https://extension.harvard.edu/paying-for-school/payment-options/ |
| paymentOptions | ["installments","employer_sponsorship","loans","scholarships"] | You can use TAP to pursue an undergraduate or graduate degree or certificate (checked 2026-10-08) | https://extension.harvard.edu/paying-for-school/harvard-employees/ |
| paymentOptions | ["installments","employer_sponsorship","loans","scholarships"] | You may consider applying for a credit-based private student loan (checked 2026-10-08) | https://extension.harvard.edu/paying-for-school/payment-options/financing-options-for-nonadmitted-students/ |
| paymentOptions | ["installments","employer_sponsorship","loans","scholarships"] | Limited scholarship funds are available for non-admitted students at Harvard Extension School. (checked 2026-10-08) | https://extension.harvard.edu/paying-for-school/payment-options/financing-options-for-nonadmitted-students/ |
| cohortSeniority | Select certificate-earner titles published by the school: Business Analyst, Customer Success Manager, Director of Operations, Program Manager, Principal, and Vice President; the school does not say these titles represent a majority. | They hold such titles as: Business Analyst ... Director of Operations ... Principal ... Vice President (checked 2026-10-08) | https://extension.harvard.edu/academics/programs/organizational-behavior-certificate/ |
| locationOffers | ["travel_ease","affordability"] | **no quote** | |
| credits | (null in the record) | Complete the four certificate courses for graduate credit. (checked 2026-10-08) | https://extension.harvard.edu/academics/programs/organizational-behavior-certificate/ |

**Ratings** (from `harvard-ext-org-behavior-rating.md`):

| Rating | Score | Note |
| --- | --- | --- |
| network (low evidence) | 3 | Online synchronous instruction is available, and certificate earners receive affiliate Harvard Extension Alumni Association membership; no in-person time is required, while a fixed cohort, seniority mix and alumni activity are not established (low evidence). |
| depth | 3 | Four required graduate-credit courses meet the credit-bearing certificate tier; featured faculty are identified, but total credit hours and a research/thesis requirement are not published. |
| practicality (low evidence) | 4 | Part-time study compatible with full-time work, an 8-month–3-year completion window, online delivery and applied leadership practice support 4 rather than 5; participant-organization projects and program-specific weekly workload are not documented (low evidence). |
| costValue (low evidence) | 4 | Tuition is $14,320 for four graduate-credit courses over 8 months–3 years; the research includes a school-published comparison of $3,580 per course versus $5,476 at peer institutions, supporting favorable value, but peer duration and credential comparability are not documented (low evidence). |

### Blended Professional Certificate: Technology Leadership Program (`mit-tlp`)

| Field | Value | Verbatim quote | URL |
| --- | --- | --- | --- |
| name | Blended Professional Certificate: Technology Leadership Program | Blended Professional Certificate: Technology Leadership Program (checked 2026-10-07) | https://professional.mit.edu/course-catalog/technology-leadership-program |
| institution | MIT Professional Education | MIT Professional Education (checked 2026-10-07) | https://professional.mit.edu/course-catalog/technology-leadership-program |
| category | executive | **no quote** | |
| credential | Certificate of Completion from MIT Professional Education | All the participants who successfully complete Technology Leadership Program will receive a Certificate of Completion from MIT Professional Education. (checked 2026-10-07) | https://professional-education-gl.mit.edu/technology-leadership-program-mit |
| format | hybrid | Location MIT Campus & Live-Online (checked 2026-10-07) | https://professional.mit.edu/course-catalog/technology-leadership-program |
| durationMonths | 8 | Program Length 8 Months (checked 2026-10-07) | https://professional.mit.edu/course-catalog/technology-leadership-program |
| credits | 42 CEUs | CEUs 42 (checked 2026-10-07) | https://professional.mit.edu/course-catalog/technology-leadership-program |
| attendance | residencies | **no quote** | |
| onsiteNote | 3 residential weeks and 14+ live online sessions | **no quote** | |
| residencyCount | 3 | Experience a unique blended learning journey featuring 3 residential weeks and 14+ live online sessions (checked 2026-10-07) | https://professional-education-gl.mit.edu/technology-leadership-program-mit |
| workCompatible | true | I also was looking for a program which was an extended program and a hybrid ... as well as I wouldn't have to stop my work or you could accommodate according to my schedule. (checked 2026-10-07) | https://professional.mit.edu/course-catalog/technology-leadership-program |
| city | Cambridge | MIT Professional Education 700 Technology Square Building NE48-200 Cambridge, MA 02139 USA (checked 2026-10-07) | https://professional.mit.edu/course-catalog/technology-leadership-program |
| state | Massachusetts | **no quote** | |
| country | US | **no quote** | |
| tuitionUsd | 28000 | Program Fee $28,000 (checked 2026-10-07) | https://professional.mit.edu/course-catalog/technology-leadership-program |
| minExperienceYears | 6 | A minimum of 6+ years of work experience in functional, technical, or business roles. (checked 2026-10-07) | https://professional.mit.edu/course-catalog/technology-leadership-program |
| cohortSeniority | Technology leaders and experienced practitioners; relevant roles include C-level positions, Heads of Engineering/Technology, engineering managers, product managers, team leaders, senior functional managers, and delivery heads. | Relevant roles include: C-level positions including CEOs, CTOs, COOs, CIOs, Chief Architects, etc.; Head of Engineering, Head of Technology; Engineering managers, product managers, and team leaders with a significant team size and budget responsibility. (checked 2026-10-07) | https://professional.mit.edu/course-catalog/technology-leadership-program |
| lodgingPerNightUsd | {"min":213,"max":365} | Boston / Cambridge ... $365 [October], $213 [November–February], $305 [March–August], $365 [September]. (checked 2026-10-07) | https://www.gsa.gov/travel/plan-book/per-diem-rates/per-diem-rates-results?action=perdiems_report&city=Boston&state=MA&fiscal_year=2027 |
| locationOffers | ["network_density","industry_hub"] | **no quote** | |
| onsiteDaysPerYear | (null in the record) | 3 residential weeks (checked 2026-10-07) | https://professional-education-gl.mit.edu/technology-leadership-program-mit |
| longestStretchDays | (null in the record) | 3 residential weeks (checked 2026-10-07) | https://professional-education-gl.mit.edu/technology-leadership-program-mit |
| tuitionIncludes | (null in the record) | The program fee is USD 28,000 (checked 2026-10-07) | https://professional-education-gl.mit.edu/technology-leadership-program-mit |

**Ratings** (from `mit-tlp-rating.md`):

| Rating | Score | Note |
| --- | --- | --- |
| network | 4 | Three residential weeks, 14+ live online sessions, a senior-leader target audience, and Professional Education alumni access support 4; network size and activity are not established for 5. |
| depth | 3 | Eight months, 42 CEUs, 20+ MIT faculty, and strategy projects support a substantial non-degree program; graduate academic credit and research/thesis requirements are not published. |
| practicality (low evidence) | 3 | Low evidence: hybrid delivery, applied projects, and a work-compatibility testimonial support 3; weekly workload, schedule flexibility, and projects on participants' own organizations are not established. |
| costValue (low evidence) | 3 | Low evidence: $28,000 covers an eight-month completion-certificate program with eligibility for 42 CEUs; 3 is a provisional midpoint because no comparable tuition benchmarks establish relative value. |

### Master of Engineering Management (`northwestern-mem-pt`)

| Field | Value | Verbatim quote | URL |
| --- | --- | --- | --- |
| name | Master of Engineering Management | Master of Engineering Management (checked 2026-10-08) | https://www.mccormick.northwestern.edu/engineering-management/ |
| institution | Northwestern University | Northwestern University’s Evanston campus (checked 2026-10-08) | https://www.mccormick.northwestern.edu/engineering-management/ |
| category | specialized_masters | Master of Engineering Management degree (checked 2026-10-08) | https://www.mccormick.northwestern.edu/engineering-management/curriculum/ |
| credential | Master of Engineering Management | Master of Engineering Management degree (checked 2026-10-08) | https://www.mccormick.northwestern.edu/engineering-management/curriculum/ |
| format | in_person | **no quote** | |
| durationMonths | 24 | Part-time option: 2-3 years (checked 2026-10-08) | https://www.mccormick.northwestern.edu/engineering-management/ |
| durationMaxMonths | 36 | **no quote** | |
| credits | A minimum number of 12 courses is required | A minimum number of 12 courses is required (checked 2026-10-08) | https://www.mccormick.northwestern.edu/engineering-management/curriculum/ |
| attendance | recurring_evenings | Classes held Monday - Thursday evenings + Saturday mornings (checked 2026-10-08) | https://www.mccormick.northwestern.edu/engineering-management/ |
| onsiteNote | Classes held Monday - Thursday evenings + Saturday mornings | **no quote** | |
| workCompatible | true | Choose the part-time option to accommodate work or personal needs (checked 2026-10-08) | https://www.mccormick.northwestern.edu/engineering-management/ |
| city | Evanston | Northwestern University’s Evanston campus (checked 2026-10-08) | https://www.mccormick.northwestern.edu/engineering-management/ |
| country | US | **no quote** | |
| tuitionPerCourseUsd | 8100 | $8,100 per course for part-time students (checked 2026-10-08) | https://www.mccormick.northwestern.edu/engineering-management/overview/tuition/ |
| courseCount | 12 | **no quote** | |
| paymentOptions | ["scholarships","loans"] | The Albert H. Rubenstein Memorial Scholarship is based on merit and is awarded during the application process. (checked 2026-10-08) | https://www.mccormick.northwestern.edu/engineering-management/overview/tuition/financial-aid.html |
| paymentOptions | ["scholarships","loans"] | master’s students are provided with a variety of federal and private loan options (checked 2026-10-08) | https://www.mccormick.northwestern.edu/academics/graduate/prospective-student-resources/financial-aid.html |
| figureNotes | {"tuitionPerCourseUsd":"2026-27 rate; the Fall 2027 rate is not published.","courseCount":"A minimum; the school publishes no fixed total.","durationMonths":"The school publishes a 2-3 year range for the part-time option."} | **no quote** | |
| locationOffers | ["industry_hub"] | **no quote** | |

**Ratings** (from `northwestern-mem-pt-rating.md`):

| Rating | Score | Note |
| --- | --- | --- |
| network (low evidence) | 3 | Low evidence: scheduled evening/Saturday classes and an experienced-STEM target audience support a provisional 3; cohort interaction, actual in-person time, seniority and alumni access are not established. |
| depth | 4 | Master’s degree requiring at least 12 courses, including 7 core courses and at least 2 advanced-engineering courses, supports 4; research/thesis requirements and faculty involvement are not established for 5. |
| practicality | 4 | The work-accommodating part-time option offers evening/Saturday classes, entry in any quarter, a capstone choice and applied leadership simulations; projects in participants’ own organizations are not established for 5. |
| costValue (low evidence) | 3 | Low evidence: $8,100 per course is published for 2026–2027 for a master’s typically lasting 2–3 years, but total tuition, Fall 2027 pricing and comparable-program costs are missing; 3 is provisional, not a verified market-value assessment. |

### MBA Program for Executives (`wharton-emba-sf`)

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
