# Review checklist: Blended Professional Certificate: Technology Leadership Program

A draft record built from `docs/research/mit-tlp.md`. The first section lists what is uncertain, conflicting, assumed or set by hand; the second lists every set field with the school's verbatim quote and URL. **no quote** means the value was derived or proposed.

## Uncertain, conflicting or set by hand

**Mine (derived, assumed or set by hand):**

- `workCompatible: true` now also rests on the MIT TLP brochure (July 2026, a gated download, so `school_correspondence`): "it offers continuing education and lifelong learning opportunities for working professionals at all levels". The participant testimonial stays as a second source.
- `cohortMedianExperienceYears: 19` with `cohortExperienceBasis: average` comes from the same brochure: "With an average of 19 years of professional experience and representation from 20+ industries". It is set in the overrides file with that quote, and `figureNotes` says it is an average.
- `attendance: residencies` is derived from `residencyCount: 3`; `onsiteNote` is the school's own phrase from the residencies quote; `locationOffers` is my proposal (network_density, industry_hub).
- `lodgingPerNightUsd {213, 365}` is the range of the three GSA seasonal rates in the quote (the engine uses the max).
- `category: executive` and `state` ("Massachusetts", split from the research city) have no quote of their own.

**From the research file's "uncertain or conflicting" list:**

- **Next cohort status:** MIT’s official catalog lists September 11, 2026 to April 30, 2027, while the MIT/Great Learning landing page says “Next Cohort TBD” and “Hybrid · To be announced.” The catalog dates are used because they are the only published specific dates.
- **Immersion locations:** The landing page describes “3 residential weeks at MIT, Cambridge, Boston,” while the catalog lists “MIT Campus \& Live-Online.” The exact campus venue and exact schedule for each residential week are not published.
- **Onsite-day counts:** “Three residential weeks” is published, but neither official source defines the number of instructional or travel days in each week. Total onsite days and longest trip length are therefore not published.
- **Weekly workload:** The program publishes 14+ live online sessions but not their length, total online hours, asynchronous-study expectations, or a weekly workload range.
- **Cohort statistics** (settled by the brochure for average experience; see above)**:** No official cohort size, median/average work experience, or systematic title distribution is published. Participant testimonials are not treated as a class profile.
- **Tuition coverage:** The \$28,000 program fee is published, but inclusions and exclusions—especially lodging, meals, travel, materials, and residency expenses—are not specified.
- **Lodging value:** GSA publishes a monthly seasonal rate for Boston/Cambridge, so there is no truthful single current-fiscal-year lodging number without knowing residence dates.

**Ratings marked low evidence:** deep_expertise, new_industry_or_city. senior_network was re-rated 5 → 4 with rate-program v1 after the brochure's class profile (see the last block of `mit-tlp-rating.md`).

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
