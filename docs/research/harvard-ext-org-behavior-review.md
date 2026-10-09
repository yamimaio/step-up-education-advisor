# Review checklist: Organizational Behavior Graduate Certificate (Online)

A draft record built from `docs/research/harvard-ext-org-behavior.md`. The first section lists what is uncertain, conflicting, assumed or set by hand; the second lists every set field with the school's verbatim quote and URL. **no quote** means the value was derived or proposed.

## Uncertain, conflicting or set by hand

**Mine (derived, assumed or set by hand):**

- `attendance: none` follows from format online (converter rule); `locationOffers` is my proposal (travel_ease, affordability), not a researched fact.
- Research Part 1 gives `lodgingPerNightUsd: 365`; dropped by the converter because the program is online.
- `durationMonths: 8` is the fastest pace; `durationMaxMonths` is null (no quote for the slowest pace on this program's page).

**From the research file's "uncertain or conflicting" list:**

- **Duration wording conflicts across official pages.** The program-specific page says a student taking two courses per semester can finish in **8 months**, while the general certificate policy page says most four-course certificates can be completed in **one year**. The JSON uses 8 months because the program-specific page is controlling for this program.
- **Total credits are not published on the program page.** Four required courses are explicitly graduate-credit courses, and a current core course is 4 credits, but the total has not been inferred across every possible elective pathway.
- **No exact Spring 2027 start day is published on the program page.** It publishes only “Spring 2027”; registration runs November 5, 2026 through January 19, 2027, which is not the program start date.
- **The GSA lodging rate is seasonal, not one annual number.** FY2027 Boston/Cambridge lodging is $365 in October 2026 and September 2027, $213 from November through February, and $305 from March through August. The JSON scalar uses **$365**, the rate in force on the October 8, 2026 check date; it is not a program cost because the certificate has no on-campus requirement.
- **Current cohort size, median/average experience, and majority seniority are not published.** A 2024 fast-facts document contains historical employment bands and titles but is not a Spring 2027 class profile, so its experience distribution was not transferred into the JSON cohort field. **Update (Oct 9, R9):** the breakdown is now used: "Years of employment 0–4 years 14% 5–10 years 30% 11–20 years 34% 21+ years 22%" (academic year 2024) puts the middle student in the 11–20 band, so the overrides set `cohortMedianExperienceYears: 11` (median, lower edge), and senior peers is 3.
- **Weekly workload is not program-specific.** Harvard publishes a general rule of at least two hours outside class per class hour, but no certificate-specific minimum and maximum weekly hours.
- **Course availability can change.** Harvard says multiple options are available in fall, spring, and summer and that “Offerings vary by term”; therefore, named Spring 2027 options should not be treated as a permanent exhaustive curriculum.
- **Master’s credit is conditional, not automatic for every course.** The certificate can stack into Management or Industrial-Organizational Psychology, but Harvard explicitly warns that “Not every certificate course counts toward a degree.”
- **The accreditation field is intentionally empty under the requested schema for a non-degree certificate.** Harvard Extension School itself states that it is NECHE-accredited, but no separate programmatic accreditation is published for this certificate.
- **No primary on-site city exists for the program.** Cambridge is Harvard Extension School’s institutional location, but all four certificate courses are online and no residency is required.

**Ratings marked low evidence:** network, practicality, costValue.

## Fields, quotes and URLs

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
