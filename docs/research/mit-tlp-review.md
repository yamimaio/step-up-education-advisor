# Review checklist: Blended Professional Certificate: Technology Leadership Program

A draft record built from `docs/research/mit-tlp.md`. The first section lists what is uncertain, conflicting, assumed or set by hand; the second lists every set field with the school's verbatim quote and URL. **no quote** means the value was derived or proposed.

## Uncertain, conflicting or set by hand

**Mine (derived, assumed or set by hand):**

- `workCompatible: true` now also rests on the MIT TLP brochure (July 2026, a gated download, so `school_correspondence`): "it offers continuing education and lifelong learning opportunities for working professionals at all levels". The published schedule backs it too: three Monday-to-Friday weeks on campus, with live online modules spread over the months between (14+ sessions in eight months). The participant testimonial stays as a further source.
- `cohortMedianExperienceYears: 20` with `cohortExperienceBasis: median` comes from the same brochure's experience breakdown (25+ years 21%, 20-25 years 29%, 15-20 years 26%, 10-15 years 17%, under 10 years 7%): exactly half the participants have 20+ years. The brochure's stated average of 19 is in `figureNotes`. Ruling R9 (rate-program v2) prefers the breakdown's median.
- `attendance: residencies` is derived from `residencyCount: 3`; `onsiteNote` is the school's own phrase from the residencies quote; `locationOffers` is my proposal (network_density, industry_hub).
- `lodgingPerNightUsd {213, 365}` is the range of the three GSA seasonal rates in the quote (the engine uses the max).
- `category: executive` and `state` ("Massachusetts", split from the research city) have no quote of their own.

**From the research file's "uncertain or conflicting" list:**

- **Next cohort status:** MIT’s official catalog lists September 11, 2026 to April 30, 2027, while the MIT/Great Learning landing page says “Next Cohort TBD” and “Hybrid · To be announced.” The catalog dates are used because they are the only published specific dates.
- **Immersion locations:** The landing page describes “3 residential weeks at MIT, Cambridge, Boston,” while the catalog lists “MIT Campus \& Live-Online.” The exact campus venue and exact schedule for each residential week are not published.
- **Onsite-day counts** (settled by the public program schedule PDF, checked 2026-10-09)**:** on campus Sept 21–25, 2026, Jan 25–29, 2027 and April 26–30, 2027, each Monday to Friday, so `onsiteDaysPerYear: 15` and `longestStretchDays: 5`, set in the overrides file with that quote. Travel days are not counted, and the schedule says it is subject to change.
- **Weekly workload:** still unpublished. The schedule and the 14+ live online sessions show a part-time load, but neither the session length nor reading and project time is published, so `hoursPerWeek` stays null rather than an estimate.
- **Cohort statistics** (settled by the brochure for average experience; see above)**:** No official cohort size, median/average work experience, or systematic title distribution is published. Participant testimonials are not treated as a class profile.
- **Tuition coverage:** The \$28,000 program fee is published, but inclusions and exclusions—especially lodging, meals, travel, materials, and residency expenses—are not specified.
- **Lodging value:** GSA publishes a monthly seasonal rate for Boston/Cambridge, so there is no truthful single current-fiscal-year lodging number without knowing residence dates.

**Ratings marked low evidence:** deep_expertise, new_industry_or_city. senior_network stays 5, now on the brochure's class profile under R9 (see the last block of `mit-tlp-rating.md`).

## Fields, quotes and URLs

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
| workCompatible | true | Brochure (July 2026): "it offers continuing education and lifelong learning opportunities for working professionals at all levels"; schedule: live online modules between three on-campus weeks; testimonial: "I wouldn't have to stop my work" (checked 2026-10-07 to 2026-10-09) | brochure (school_correspondence); https://d1vwxdpzbgdqj.cloudfront.net/s3-public-files/mit-tlp/mittlpprogram_schedule.pdf; https://professional.mit.edu/course-catalog/technology-leadership-program |
| city | Cambridge | MIT Professional Education 700 Technology Square Building NE48-200 Cambridge, MA 02139 USA (checked 2026-10-07) | https://professional.mit.edu/course-catalog/technology-leadership-program |
| state | Massachusetts | **no quote** | |
| country | US | **no quote** | |
| tuitionUsd | 28000 | Program Fee $28,000 (checked 2026-10-07) | https://professional.mit.edu/course-catalog/technology-leadership-program |
| minExperienceYears | 6 | A minimum of 6+ years of work experience in functional, technical, or business roles. (checked 2026-10-07) | https://professional.mit.edu/course-catalog/technology-leadership-program |
| cohortMedianExperienceYears | 20 (median; basis `median`) | Brochure (July 2026): "Typical Work Experience 25+ years 21% 20-25 years 29% 15-20 years 26% 10-15 years 17% Less than 10 years 7%"; stated average 19 in figureNotes (checked 2026-10-09) | brochure (school_correspondence) |
| cohortSeniority | Technology leaders and experienced practitioners; relevant roles include C-level positions, Heads of Engineering/Technology, engineering managers, product managers, team leaders, senior functional managers, and delivery heads. | Relevant roles include: C-level positions including CEOs, CTOs, COOs, CIOs, Chief Architects, etc.; Head of Engineering, Head of Technology; Engineering managers, product managers, and team leaders with a significant team size and budget responsibility. (checked 2026-10-07) | https://professional.mit.edu/course-catalog/technology-leadership-program |
| lodgingPerNightUsd | {"min":213,"max":365} | Boston / Cambridge ... $365 [October], $213 [November–February], $305 [March–August], $365 [September]. (checked 2026-10-07) | https://www.gsa.gov/travel/plan-book/per-diem-rates/per-diem-rates-results?action=perdiems_report&city=Boston&state=MA&fiscal_year=2027 |
| locationOffers | ["network_density","industry_hub"] | **no quote** | |
| onsiteDaysPerYear | 15 | Module 2 On Campus Sept 21 - 25, 2026 ... Module 4 On Campus Jan 25 - 29, 2027 ... Module 6 On Campus 26 April - 30 April, 2027 (checked 2026-10-09) | https://d1vwxdpzbgdqj.cloudfront.net/s3-public-files/mit-tlp/mittlpprogram_schedule.pdf |
| longestStretchDays | 5 | Same schedule quote: each on-campus module is Monday to Friday (checked 2026-10-09) | https://d1vwxdpzbgdqj.cloudfront.net/s3-public-files/mit-tlp/mittlpprogram_schedule.pdf |
| tuitionIncludes | (null in the record) | The program fee is USD 28,000 (checked 2026-10-07) | https://professional-education-gl.mit.edu/technology-leadership-program-mit |

**Ratings** (from the last block of `mit-tlp-rating.md`):

| Need | Score | Note |
| --- | --- | --- |
| leadership_skills | 5 | Leadership is the core: leading strategic change, the human side of technology, and innovation teams. |
| deep_expertise (low evidence) | 3 | Several technology strategy modules and strategy projects throughout, without academic credit. |
| graduate_degree | 2 | Certificate of completion with 42 CEUs; no stated path to a graduate degree. |
| senior_network | 5 | Half of past participants have 20+ years of experience, across 20+ industries; three residential weeks at MIT. |
| new_industry_or_city (low evidence) | 2 | An MIT Professional Education alumni LinkedIn group; no career services published. |
