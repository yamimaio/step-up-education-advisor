# Stanford LEAD: Claude's independent research

Claude's own research on the official GSB pages (2026-10-10), done without seeing Perplexity's answers. It backs the ratings block Claude added at the end of `stanford-lead-rating.md`, which was written before reading Perplexity's rating. The record is still built from `stanford-lead.md` (Perplexity) plus the sourced facts in `stanford-lead-overrides.json`.

Pages were read through a page reader; the quotes the record or the card notes use were re-checked on the page.


Method note: direct HTTP download of gsb.stanford.edu was blocked by the egress proxy, so pages were read through WebFetch (a summarizing fetcher). Key quotes on the overview page were re-checked with an exact-string FOUND/NOT FOUND pass (all found). Other quotes were requested "verbatim" but were not exact-string re-verified; treat them as high-confidence, not certain. The course guide PDF and the LEAD payment-options PDF (image.gsbcommunications.stanford.edu) were blocked by robots.txt and were not read.

URLs used:
- OV = https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program
- CUR = https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program/curriculum
- COURSES = https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead/curriculum/courses
- PP = https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program/participant-profile
- IMP = https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program/impact
- FAQ = https://www.gsb.stanford.edu/exec-ed/admission/faq
- PAY = https://www.gsb.stanford.edu/exec-ed/admission/payment-cancellation
- DISC = https://www.gsb.stanford.edu/exec-ed/admission/payment-cancellation/discounts
- APP = https://www.gsb.stanford.edu/exec-ed/admission/application-process/stanford-lead
- ELIG = https://www.gsb.stanford.edu/exec-ed/admission/eligibility

## PART 1: record

```json
{
  "name": "Stanford LEAD Online Business Program",
  "institution": "Stanford Graduate School of Business (Executive Education)",
  "category": "executive",
  "credential": "Stanford GSB Professional Certificate + 24 Continuing Education Units (CEUs); no academic credit published; no GSB alumni status published",
  "format": "online",
  "durationMonths": 12,
  "credits": null,
  "onsiteDaysPerYear": 0,
  "residencyCount": 0,
  "longestStretchDays": 0,
  "hoursPerWeekMin": 5,
  "hoursPerWeekMax": 10,
  "workCompatible": true,
  "city": "Stanford",
  "state": "CA",
  "campusAddress": null,
  "country": "US",
  "tuitionUsd": 19200,
  "tuitionIncludes": "Tuition, access to course platforms, all required course materials; per FAQ: 8 courses, live faculty interaction, personalized feedback from course facilitators, ongoing access to the community",
  "paymentOptions": "Pay in full ($19,200) or 4 quarterly installments of $4,800 (first due before program start); bank wire or credit card; invoice sent on admission. No scholarships/financial aid. Alumni discounts (GSB Alumni Assn 15%, Stanford Alumni Assn $1,000) apply to 'most open-enrollment programs' (LEAD not listed as excluded, not confirmed as included). Nonprofit/NGO 15% case by case. Loans, employer sponsorship and early-bird discount: not published.",
  "minExperienceYears": null,
  "accreditation": null,
  "cohortMedianExperienceYears": null,
  "cohortMedianExperienceKind": "not published (participant-profile statistics are images only, not readable)",
  "cohortSeniority": "mid- to senior-career professionals",
  "lodgingPerNightUsd": null,
  "nextStartDate": "2027-03-17",
  "sources": [
    {"field": "name", "url": "OV", "quote": "Flexible, Year-Long Online Experience", "checkedOn": "2026-10-10"},
    {"field": "format", "url": "FAQ", "quote": "LEAD is designed to be most effective as an online business program and is only offered in this modality.", "checkedOn": "2026-10-10"},
    {"field": "format", "url": "FAQ", "quote": "This program is designed to be completed fully online with elements of self-paced content, live events,", "checkedOn": "2026-10-10"},
    {"field": "durationMonths", "url": "OV", "quote": "17 Mar 2027 – 16 Mar 2028", "checkedOn": "2026-10-10"},
    {"field": "nextStartDate", "url": "OV", "quote": "17 Mar 2027", "checkedOn": "2026-10-10"},
    {"field": "nextStartDate (application deadline 2027-02-03)", "url": "OV", "quote": "03 Feb 2027", "checkedOn": "2026-10-10"},
    {"field": "hoursPerWeekMin/Max", "url": "FAQ", "quote": "You can expect to dedicate 5-10 hours weekly to this enriching experience.", "checkedOn": "2026-10-10"},
    {"field": "workCompatible", "url": "OV", "quote": "while continuing to work full time", "checkedOn": "2026-10-10"},
    {"field": "onsiteDaysPerYear/residencyCount/longestStretchDays", "url": "FAQ", "quote": "LEAD is designed to be most effective as an online business program and is only offered in this modality.", "checkedOn": "2026-10-10"},
    {"field": "tuitionUsd", "url": "OV", "quote": "US $19,200", "checkedOn": "2026-10-10"},
    {"field": "tuitionIncludes", "url": "OV", "quote": "The program fee includes tuition, access to course platforms, and all required course materials.", "checkedOn": "2026-10-10"},
    {"field": "tuitionIncludes", "url": "FAQ", "quote": "LEAD tuition includes 8 courses, live faculty interaction, dedicated time and personalized feedback", "checkedOn": "2026-10-10"},
    {"field": "paymentOptions", "url": "OV", "quote": "4 quarterly installments of $4,800", "checkedOn": "2026-10-10"},
    {"field": "paymentOptions", "url": "PAY", "quote": "The first installment will be due before the start of the program.", "checkedOn": "2026-10-10"},
    {"field": "paymentOptions", "url": "PAY", "quote": "Pay the entire tuition fee of $19,200 upfront with a convenient one-time payment option.", "checkedOn": "2026-10-10"},
    {"field": "paymentOptions", "url": "PAY", "quote": "Payment is accepted by bank wire transfer, or credit card (American Express, MasterCard, Visa, and Discover).", "checkedOn": "2026-10-10"},
    {"field": "paymentOptions", "url": "PAY", "quote": "Stanford GSB does not offer financial assistance for executive education programs.", "checkedOn": "2026-10-10"},
    {"field": "paymentOptions", "url": "FAQ", "quote": "Stanford does not offer scholarships, grants, or financial aid for our Executive Education programs.", "checkedOn": "2026-10-10"},
    {"field": "paymentOptions", "url": "DISC", "quote": "receive a 15% discount on most open-enrollment programs", "checkedOn": "2026-10-10"},
    {"field": "paymentOptions", "url": "DISC", "quote": "receive a US $1,000 discount on most open-enrollment programs", "checkedOn": "2026-10-10"},
    {"field": "paymentOptions (refund)", "url": "PAY", "quote": "You may receive a full refund minus a $500 administrative fee until the program start date.", "checkedOn": "2026-10-10"},
    {"field": "credential", "url": "FAQ", "quote": "LEAD participants earn a GSB Professional Certificate and 24 Continuing Education Units.", "checkedOn": "2026-10-10"},
    {"field": "credential", "url": "OV", "quote": "Stanford GSB Professional Certificate and continuing education units", "checkedOn": "2026-10-10"},
    {"field": "credits", "url": "FAQ", "quote": "not published (no FAQ on academic credit or transfer to a degree)", "checkedOn": "2026-10-10"},
    {"field": "minExperienceYears", "url": "ELIG", "quote": "not published (\"There are no specific educational requirements.\"; no minimum experience stated on OV, PP, APP or ELIG)", "checkedOn": "2026-10-10"},
    {"field": "cohortSeniority", "url": "OV", "quote": "LEAD is designed for mid- to senior-career professionals preparing for broader leadership responsibility", "checkedOn": "2026-10-10"},
    {"field": "cohortMedianExperienceYears", "url": "PP", "quote": "not published (statistics shown only as images)", "checkedOn": "2026-10-10"},
    {"field": "accreditation", "url": "OV", "quote": "not published", "checkedOn": "2026-10-10"},
    {"field": "lodgingPerNightUsd", "url": "FAQ", "quote": "not applicable: fully online (\"only offered in this modality\")", "checkedOn": "2026-10-10"}
  ]
}
```

Field notes:
- `credits`: null. 24 CEUs are continuing-education units, not academic credit.
- `city/state`: the institution's home (Stanford, CA). The program has no campus component, so `campusAddress` is null (not researched).
- `durationMonths` 12: from the session dates 17 Mar 2027 to 16 Mar 2028 and "Year-Long".
- `onsiteDaysPerYear`, `residencyCount`, `longestStretchDays` = 0: the FAQ says LEAD is only offered online. Optional "self-organized ... in-person gatherings" for the community are not part of the program.
- `accreditation`: none named on the LEAD pages. Stanford's institutional accreditation was not checked.

## PART 2: evidence for ratings

### Leadership content
- Structure: "Stanford LEAD is a custom combination of 8 courses" (CUR). It is 2 required Foundations courses, "Leadership Core (Select 1 of 2 Courses)" (CUR), and 5 electives from 16.
- Leadership Core description: "Develop the leadership capabilities needed to communicate clearly, foster alignment, lead through ambiguity, and guide teams" (CUR).
- Course titles from COURSES (titles as listed there):
  - Foundations (required): Critical Analytical Thinking; Financing Innovation: The Creation of Value.
  - Leadership Core (1 of 2): Intentional Leadership: A 360 Approach; Strategic Leadership.
  - Electives (5 of 16; only 14 titles plus the unchosen core course were readable): A New Type of Leader; Building Power to Lead; Business Model Analysis and Design; Communicating with Impact; Crisis Management; Decision Making; Design for Disruption; Design Thinking: From Insights to Viability; Getting (More of) What You Want: Negotiating, Collaborative Problem-Solving, and Value-Claiming; Leadership Agility; Leading with Insight: Self-Awareness and Team Dynamics; The Friction Project: Leading Successful Change; Neuroscience and the Connection to Exemplary Leadership; Persuasion: Principles and Practice; Power of Story.
  - At least 8 of the readable titles are explicitly leadership, people or change courses.
- Coaching: "Personalized Feedback and Coaching: Ongoing feedback, guidance, and support throughout the program" (OV).
- Applied work: "Practical exercises and real-world application that reinforce immediate on-the-job impact" (CUR). No capstone on the participant's own organization is described on the pages read. The admission essay is about the applicant's organization: "Write a statement of 500 words or less describing an area of your organization where you'd like to make an impact." (APP). That is an application requirement, not a program project.

### Depth in one field
- It is a general-management breadth program. Finance and critical thinking are required, and the rest is chosen from leadership, innovation, strategy, communication and decision electives.
- A participant could concentrate on leadership: 1 core plus 5 electives, all in leadership.
- No specialization or track is published.
- Faculty: "Peter M. DeMarzo, The John G. McDonald Professor of Finance" is the Faculty Director (OV, per fetch summary).

### Academic credit / path to a degree
- Only "a GSB Professional Certificate and 24 Continuing Education Units" (FAQ).
- CUR says CEUs can support professional recertification or employer tuition reimbursement (paraphrased by the fetcher, not verbatim).
- No academic credit and no path to a degree are published.
- FAQ contrasts it with the MBA: "While there is some overlap in course content between the MBA program and LEAD," / "the two programs are distinct in their design."

### Cohort seniority, time together, network
- Seniority: "LEAD is designed for mid- to senior-career professionals preparing for broader leadership responsibility" (OV). Who should attend (OV):
  - "Managers leading teams through transformation and organizational change"
  - "Functional experts transitioning into broader business leadership roles"
  - "Entrepreneurs and operators strengthening strategic and leadership capabilities"
- Cohort size: "Cohort size is limited, in order to guarantee high-touch guidance, engagement, and support with faculty and peers." (PP). No number is given.
- Selection: "LEADers are selected based on professional experience, leadership potential, intellectual curiosity" (PP).
- Time together: one year as a fixed session (17 Mar 2027 to 16 Mar 2028). "Live sessions, discussions, collaboration, and peer engagement are woven throughout the experience" (OV). The FAQ mentions "group projects, collaboration, and networking."
- Network:
  - "Join a worldwide community, 10+ years in the making, of nearly 7,000 LEADers across industries, functions, and regions" (CUR)
  - "Participants join a lifelong community of accomplished professionals" (OV)
  - "participants are invited to attend select Stanford and Stanford GSB speaker events" (OV)
  - "Participate in self-organized virtual and in-person gatherings" (CUR)
- Alumni status: not granted per the published pages. The FAQ states alumni status only for SEP: "SEP participants earn Stanford Graduate School of Business Alumni Status and a Stanford GSB Professional Certificate." No LEAD page mentions GSB alumni status.

### Career services / career-change support
- No career services are published (OV, CUR, IMP, FAQ).
- Outcomes are qualitative only. IMP: "For more than a decade, Stanford LEAD has delivered measurable impact across thousands of participants." It cites a survey of 1,695 participants (2020 to 2025) with no figures published. It says (paraphrased) that some took higher-level roles, made career transitions or started businesses.

## Uncertain or conflicting
1. **Application components:** APP says "three components: the online application, a short essay, and an online video interview". The FAQ says "four components" and "The only programs that require a letter of recommendation are LEAD and Stanford Ignite."
2. **Tuition-includes wording:** OV says "access to course platforms, and all required course materials". PAY says "access to online course platforms, and all course materials". The meaning is the same.
3. **Elective count:** COURSES says "Select 5 of 16", but only 14 elective titles (plus the unchosen core course) were readable.
4. **Unread PDFs:** the course guide PDF and the LEAD payment-options PDF were blocked by robots.txt. They may hold weekly hours, live-session timing, a sample schedule, employer-sponsorship or loan details.
5. **Discounts:** LEAD is not on the exclusion list. The alumni discounts say "most open-enrollment programs", so whether they apply to LEAD is not confirmed.
6. **Outdated page ignored:** online.stanford.edu/programs/stanford-lead-program is an old Stanford Online listing. It shows "Program Fee: US $19,000", "9 courses, 2 per quarter" and an August 2021 deadline. The current GSB pages ($19,200, 8 courses) were used instead.
7. **Participant profile:** the statistics (experience, titles, industries) are images only. Median or average experience is not published in text.
8. **Two seniority phrasings on OV:** "mid- to senior-career professionals preparing for broader leadership responsibility" and "mid- to senior-level professionals seeking to expand their leadership capabilities". Both were confirmed present.
