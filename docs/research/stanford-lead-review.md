# Review checklist: Stanford LEAD Online Business Program

A draft record built from `docs/research/stanford-lead.md` (Perplexity) and `docs/research/stanford-lead-overrides.json`, with ratings from the last block of `docs/research/stanford-lead-rating.md`. The first section compares Perplexity's work with Claude's independent check (`docs/research/stanford-lead-claude-check.md`); the second lists what is uncertain or set by hand; the third lists every set field with the school's verbatim quote and URL.

## Perplexity and Claude compared

The two researches were done separately, and Claude rated before reading Perplexity's rating.

**Facts.** Both researches agree on every fact the record holds: fully online, 12 months, 24 CEUs, 5 to 10 hours a week, US $19,200 (pay in full or four quarterly installments of $4,800), work-compatible, next session March 17, 2027 to March 16, 2028. Claude's check adds:

- The course titles (courses page): two leadership core courses (Intentional Leadership: A 360 Approach; Strategic Leadership) and 15 elective titles, about half of them leadership courses. Perplexity's research said the titles were not published; they are on a separate courses page.
- Selective admission: "LEADers are selected based on professional experience, leadership potential, intellectual curiosity" (participant profile).
- The LEAD community: "nearly 7,000 LEADers" (curriculum page).
- The participant profile's charts are images. Yami's screenshots (Oct 10) give the Position chart, which prints no numbers; measured by pixel against its legend: Manager 33%, Director 23%, C-Suite 14%, Vice-President 6%, Head of Region 5%, Other 19%. Director or above is 48%, so senior_network stays 3 (mostly managers, not mostly directors and VPs). The same page gives an average age of 40, 60% with a post-graduate degree and 110+ countries, but no years of experience, so `cohortMedianExperienceYears` stays null and senior_network stays low evidence. The course guide PDF Yami downloaded lists the same 2 foundation, 2 leadership core and 15 elective titles as the courses page.
- Alumni discounts (15% for GSB Alumni Association members, $1,000 for Stanford Alumni Association members) apply to "most open-enrollment programs"; LEAD is not listed as excluded, but no page confirms it. Not added to `paymentOptions`.
- The application page lists three components; the FAQ says four, including a letter of recommendation.

**Ratings.**

| Need | Perplexity | Claude | Why they differ |
| --- | --- | --- | --- |
| leadership_skills | 3 | 4 | Claude found the named leadership courses (per R3; close call with 5) |
| deep_expertise | 3 (low evidence) | 3 | Same rating; the course list settles the structure |
| graduate_degree | 2 | 2 | |
| senior_network | 3 (low evidence) | 3 (low evidence) | |
| new_industry_or_city | 2 (low evidence) | 2 (low evidence) | |

## Uncertain, conflicting or set by hand

**Mine (derived, assumed or set by hand):**

- `longestStretchDays 0` is set in the overrides file: Perplexity left it null, and the schema requires 0 for an online program. Source: "This program is designed to be completed fully online" (FAQ).
- `locationOffers` (travel_ease, affordability) is my proposal, the same as the other online program (Harvard Extension).
- `cohortSeniority` stays null: the only figure is the target audience ("mid- to senior-career professionals"), which is not a class profile, and the overrides file can't set it.
- `durationMaxMonths` stays null: the payment policy says "You will still have 24 months to enroll in courses and complete the certificate", but that is in the context of deferrals, not the standard pace.
- `nextStartDate` is dropped by the converter (DQ7).

**From the research file's "uncertain or conflicting" list:**

- **Standard duration versus completion allowance:** The program is advertised as year-long, while the payment policy says, “You will still have 24 months to enroll in courses and complete the certificate”; the longer allowance is not coded as standard duration.
- **Optional campus activity:** Fully online completion is explicit, but optional campus-event availability, duration, location, and charges are not established in the reviewed permitted evidence.
- **Cohort evidence:** No dated numeric class profile was established; intended audience descriptions therefore remain separate from measured participant seniority or experience.
- **Alumni and degree rights:** Lifelong community access and CEUs are explicit; formal Stanford alumni status, alumni career-service eligibility, and graduate-degree credit are not established.
- **Fee scope:** Materials and platforms are explicitly included; meals, lodging, and any additional mandatory fees are not explicitly resolved by the LEAD-specific statements.
- **Change notice:** Stanford states, “Program dates, fees, and faculty subject to change.” [Official program page](https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program)

**Ratings marked low evidence:** senior_network (no class profile figures readable; R1 target audience) and new_industry_or_city (no career facts beyond the community; R5).

## Fields, quotes and URLs

Every source in the record, with the value it backs. **no quote** means the value was derived or proposed. Sources with field `ratingNotes` back facts stated in the rating notes.

| Field | Value | Verbatim quote | URL |
| --- | --- | --- | --- |
| name | Stanford LEAD Online Business Program | Stanford LEAD Online Business Program (checked 2026-10-10) | https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program |
| institution | Stanford Graduate School of Business | Stanford Graduate School of Business (checked 2026-10-10) | https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program |
| category | executive | Director, Stanford LEAD Executive Education (checked 2026-10-10) | https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program |
| credential | Stanford GSB Professional Certificate | Earn a Stanford GSB Professional Certificate upon completion (checked 2026-10-10) | https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program/curriculum |
| format | online | This program is designed to be completed fully online (checked 2026-10-10) | https://www.gsb.stanford.edu/exec-ed/admission/faq |
| durationMonths | 12 | Flexible, Year-Long Online Experience (checked 2026-10-10) | https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program |
| credits | 24 CEUs | Earn 24 Continuing Education Units (CEUs) (checked 2026-10-10) | https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program/curriculum |
| onsiteDaysPerYear | 0 | LEAD is designed to be most effective as an online business program and is only offered in this modality. (checked 2026-10-10) | https://www.gsb.stanford.edu/exec-ed/admission/faq |
| residencyCount | 0 | This program is designed to be completed fully online (checked 2026-10-10) | https://www.gsb.stanford.edu/exec-ed/admission/faq |
| hoursPerWeek | {"min": 5, "max": 10} | You can expect to dedicate 5-10 hours weekly to this enriching experience. (checked 2026-10-10) | https://www.gsb.stanford.edu/exec-ed/admission/faq |
| workCompatible | true | while continuing to work full time (checked 2026-10-10) | https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program |
| country | US | Stanford, CA 94305 USA (checked 2026-10-10) | https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program |
| tuitionUsd | 19200 | Pay the entire tuition fee of $19,200 upfront (checked 2026-10-10) | https://www.gsb.stanford.edu/exec-ed/admission/payment-cancellation |
| tuitionIncludes | Tuition, access to course platforms, and all required course materials; 8 courses, live faculty interaction, dedicated time and personalized feedback from course facilitators, and ongoing access to the community. | The program fee includes tuition, access to course platforms, and all required course materials. (checked 2026-10-10) | https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program |
| tuitionIncludes | Tuition, access to course platforms, and all required course materials; 8 courses, live faculty interaction, dedicated time and personalized feedback from course facilitators, and ongoing access to the community. | LEAD tuition includes 8 courses, live faculty interaction, dedicated time and personalized feedback from course facilitators, as well as ongoing access to the community. (checked 2026-10-10) | https://www.gsb.stanford.edu/exec-ed/admission/faq |
| paymentOptions | ["installments"] | pay the tuition fee in four quarterly installments of $4,800 (checked 2026-10-10) | https://www.gsb.stanford.edu/exec-ed/admission/payment-cancellation |
| longestStretchDays | 0 | This program is designed to be completed fully online (checked 2026-10-10) | https://www.gsb.stanford.edu/exec-ed/admission/faq |
| ratingNotes | (rating notes) | Leadership Core (Select 1 of 2 Courses) Intentional Leadership: A 360 Approach Strategic Leadership (checked 2026-10-10) | https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead/curriculum/courses |
| ratingNotes | (rating notes) | Building Power to Lead (checked 2026-10-10) | https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead/curriculum/courses |
| ratingNotes | (rating notes) | Leadership Agility (checked 2026-10-10) | https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead/curriculum/courses |
| ratingNotes | (rating notes) | Electives (Select 5 of 16*) (checked 2026-10-10) | https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead/curriculum/courses |
| ratingNotes | (rating notes) | Join a worldwide community, 10+ years in the making, of nearly 7,000 LEADers across industries, functions, and regions (checked 2026-10-10) | https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program/curriculum |
| ratingNotes | (rating notes) | LEADers are selected based on professional experience, leadership potential, intellectual curiosity (checked 2026-10-10) | https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program/participant-profile |
| attendance | none | **no quote** | |
| accreditation | [] | **no quote** | |
| locationOffers | ["travel_ease", "affordability"] | **no quote** | |

**Ratings** (from the last block of `stanford-lead-rating.md`):

| Need | Score | Note |
| --- | --- | --- |
| leadership_skills | 4 | One required leadership core course, plus leadership electives such as Leadership Agility and Building Power to Lead. |
| deep_expertise | 3 | Eight online courses: two required foundations, one leadership core course and five electives from sixteen. |
| graduate_degree | 2 | A Stanford GSB professional certificate and 24 CEUs; no academic credit is published. |
| senior_network | 3 | Fully online, for mid- to senior-career professionals selected by application; live sessions and group projects. |
| new_industry_or_city | 2 | A community of nearly 7,000 past participants; no career services published. |
