<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# You are researching one US university program for a curated dataset. Accuracy matters more than completeness.

Rules:

1. Use ONLY the program's or university's official web pages (its own domain). Never use rankings, aggregators, news, forums, Wikipedia or third-party course sites. The one exception is the GSA per diem site (gsa.gov) for the lodging rate.
2. For every fact, give: the value, the exact URL it came from, and a short verbatim quote from that page that shows it.
3. If an official page does not state a fact, write null and say "not published". Do not estimate, infer, average or round. A fact from a page about a different year or intake counts as not published unless the page says it still applies. Exception: for cohort facts (experience, titles, class size), use the most recent published class profile even when it describes an earlier class, and say which class.
4. Use the most recent intake or cohort the official pages describe, and say which one.
5. Money in US dollars as published. Say whether tuition includes fees, materials, lodging or meals.

Return two parts.

PART 1: a JSON object with exactly these fields (null where not published):
{
"name": string, // as on the official page
"institution": string,
"category": "mba" | "emba" | "specialized_masters" | "executive" | "certificate" | "short_course",
"credential": string, // e.g. "MBA", "Certificate of completion"
"format": "in_person" | "hybrid" | "online",
"durationMonths": number,
"credits": string, // what it awards beyond the certificate: "none", "42 CEUs", "16 graduate credits"
"onsiteDaysPerYear": number, // total on-site days incl. residencies and weekend sessions; 0 if online
"residencyCount": number, // separate on-site trips per year; 0 if online
"longestStretchDays": number, // days of the longest single on-site trip
"hoursPerWeekMin": number, // the school's own estimate only; if it gives one number, use it for both min and max
"hoursPerWeekMax": number,
"workCompatible": boolean, // designed for people working full time
"city": string, "country": "US", // primary on-site location
"tuitionUsd": number, // total program tuition
"tuitionIncludes": string, // what the tuition covers
"paymentOptions": string[], // only those published: installments, employer sponsorship, loans, scholarships, early payment discount
"minExperienceYears": number,
"accreditation": string[], // e.g. ["AACSB"]; [] for non-degree
"cohortMedianExperienceYears": number,// median, or average if only the average is published (say which)
"cohortSeniority": string, // e.g. "mostly directors and VPs", from the class profile
"lodgingPerNightUsd": number, // GSA per diem lodging rate for the program city, current fiscal year
"nextStartDate": string,
"sources": [ { "field": string, "url": string, "quote": string, "checkedOn": "YYYY-MM-DD" } ]
// For an in-person or hybrid program, include one source with field "campusAddress": the street address of the campus where classes meet, quoted verbatim from the school's official page.
}

PART 2: evidence for ratings (facts with sources, no scores):

- Leadership focus: how central leading people and organizations is to the curriculum (list the leadership modules or courses).
- Depth: the main field of study, credit hours, capstone, research or thesis content, faculty involvement.
- Degree path: the credential awarded, academic credit or CEUs, and whether credits officially count toward a graduate degree (quote it).
- Classmates: cohort size, median or average years of experience, typical titles, in-person time together, alumni access.
- Career change: career services, recruiting, internships or support for changing industry, role or city.
- Cost: tuition against duration and credential.

End with a list of anything uncertain or conflicting between official pages.

Program: Stanford LEAD Online Business Program (Stanford Graduate School of Business, Executive Education).
Start from: https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program
Category: executive.
Pay special attention to: whether the program is fully online or has any on-campus session (optional or required, how many days, where); the length in months and the published weekly time; whether there are live sessions or a fixed cohort and how big it is; the credential (certificate of completion, any academic credit or CEUs) and Stanford alumni status or network access; tuition and what it covers; who the program is aimed at and any published participant profile (years of experience, titles); the next start date.

**Stanford LEAD is a fully online executive program awarding a Stanford GSB Professional Certificate and 24 CEUs; the currently advertised intake runs March 17, 2027–March 16, 2028, at US \$19,200.** Stanford publishes a workload of 5–10 hours weekly, but the reviewed non-news pages do not establish cohort size, average experience, graduate-credit applicability, or the details of any optional campus gathering.[^1][^2][^3]

## PART 1: Dataset JSON

```json
{
  "name": "Stanford LEAD Online Business Program",
  "institution": "Stanford Graduate School of Business",
  "category": "executive",
  "credential": "Stanford GSB Professional Certificate",
  "format": "online",
  "durationMonths": 12,
  "credits": "24 CEUs",
  "onsiteDaysPerYear": 0,
  "residencyCount": 0,
  "longestStretchDays": null,
  "hoursPerWeekMin": 5,
  "hoursPerWeekMax": 10,
  "workCompatible": true,
  "city": null,
  "country": "US",
  "tuitionUsd": 19200,
  "tuitionIncludes": "Tuition, access to course platforms, and all required course materials; 8 courses, live faculty interaction, dedicated time and personalized feedback from course facilitators, and ongoing access to the community.",
  "paymentOptions": [
    "installments"
  ],
  "minExperienceYears": null,
  "accreditation": [],
  "cohortMedianExperienceYears": null,
  "cohortSeniority": null,
  "lodgingPerNightUsd": null,
  "nextStartDate": "2027-03-17",
  "sources": [
    {
      "field": "name",
      "url": "https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program",
      "quote": "Stanford LEAD Online Business Program",
      "checkedOn": "2026-10-10"
    },
    {
      "field": "institution",
      "url": "https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program",
      "quote": "Stanford Graduate School of Business",
      "checkedOn": "2026-10-10"
    },
    {
      "field": "category",
      "url": "https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program",
      "quote": "Director, Stanford LEAD Executive Education",
      "checkedOn": "2026-10-10"
    },
    {
      "field": "credential",
      "url": "https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program/curriculum",
      "quote": "Earn a Stanford GSB Professional Certificate upon completion",
      "checkedOn": "2026-10-10"
    },
    {
      "field": "format",
      "url": "https://www.gsb.stanford.edu/exec-ed/admission/faq",
      "quote": "This program is designed to be completed fully online",
      "checkedOn": "2026-10-10"
    },
    {
      "field": "durationMonths",
      "url": "https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program",
      "quote": "Flexible, Year-Long Online Experience",
      "checkedOn": "2026-10-10"
    },
    {
      "field": "credits",
      "url": "https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program/curriculum",
      "quote": "Earn 24 Continuing Education Units (CEUs)",
      "checkedOn": "2026-10-10"
    },
    {
      "field": "onsiteDaysPerYear",
      "url": "https://www.gsb.stanford.edu/exec-ed/admission/faq",
      "quote": "LEAD is designed to be most effective as an online business program and is only offered in this modality.",
      "checkedOn": "2026-10-10"
    },
    {
      "field": "residencyCount",
      "url": "https://www.gsb.stanford.edu/exec-ed/admission/faq",
      "quote": "This program is designed to be completed fully online",
      "checkedOn": "2026-10-10"
    },
    {
      "field": "hoursPerWeekMin",
      "url": "https://www.gsb.stanford.edu/exec-ed/admission/faq",
      "quote": "You can expect to dedicate 5-10 hours weekly to this enriching experience.",
      "checkedOn": "2026-10-10"
    },
    {
      "field": "hoursPerWeekMax",
      "url": "https://www.gsb.stanford.edu/exec-ed/admission/faq",
      "quote": "You can expect to dedicate 5-10 hours weekly to this enriching experience.",
      "checkedOn": "2026-10-10"
    },
    {
      "field": "workCompatible",
      "url": "https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program",
      "quote": "while continuing to work full time",
      "checkedOn": "2026-10-10"
    },
    {
      "field": "country",
      "url": "https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program",
      "quote": "Stanford, CA 94305\nUSA",
      "checkedOn": "2026-10-10"
    },
    {
      "field": "tuitionUsd",
      "url": "https://www.gsb.stanford.edu/exec-ed/admission/payment-cancellation",
      "quote": "Pay the entire tuition fee of $19,200 upfront",
      "checkedOn": "2026-10-10"
    },
    {
      "field": "tuitionIncludes",
      "url": "https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program",
      "quote": "The program fee includes tuition, access to course platforms, and all required course materials.",
      "checkedOn": "2026-10-10"
    },
    {
      "field": "tuitionIncludes",
      "url": "https://www.gsb.stanford.edu/exec-ed/admission/faq",
      "quote": "LEAD tuition includes 8 courses, live faculty interaction, dedicated time and personalized feedback from course facilitators, as well as ongoing access to the community.",
      "checkedOn": "2026-10-10"
    },
    {
      "field": "paymentOptions",
      "url": "https://www.gsb.stanford.edu/exec-ed/admission/payment-cancellation",
      "quote": "pay the tuition fee in four quarterly installments of $4,800",
      "checkedOn": "2026-10-10"
    },
    {
      "field": "nextStartDate",
      "url": "https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program",
      "quote": "17 Mar 2027 – 16 Mar 2028",
      "checkedOn": "2026-10-10"
    }
  ]
}
```


### Coding and missing values

- **Duration:** 12 months normalizes Stanford’s explicit “Year-Long” description; it is not an estimate based on the dates.[^2]
- **On-site totals:** The two zeros follow your rule for online programs and Stanford’s statement that LEAD is completed fully online; they do not establish that optional campus events never occur.[^3]
- **Accreditation:** `[]` follows your instruction for the executive certificate record; it is not a statement about Stanford’s institutional accreditation.
- **Country:** `US` identifies the institution’s country, not a required attendance location; the official page lists “Stanford, CA 94305 / USA.” [Official program page](https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program)

| Null field | Publication status |
| :-- | :-- |
| `longestStretchDays` | **Not published:** no on-site trip length established for this intake on the reviewed pages; Stanford describes completion as fully online. [^3] |
| `city` | **Not published:** no primary on-site teaching location established; “Online” is the published modality. [^2] |
| `minExperienceYears` | **Not published:** the participant page mentions selection based on “professional experience” without a numeric minimum in the retrieved evidence. [^4] |
| `cohortMedianExperienceYears` | **Not published:** no numeric median or average, or dated class profile containing one, established on the reviewed participant page. [^4] |
| `cohortSeniority` | **Not published:** audience descriptions are available, but no dated cohort title distribution is established. [^4][^2] |
| `lodgingPerNightUsd` | **Not published:** no primary on-site program city established; no GSA lodging rate is asserted. [^2][^3] |

No `campusAddress` source is included because the program is classified as online; Stanford’s footer address is not presented as a required LEAD classroom location.[^3]

## PART 2: Rating evidence

### Leadership focus

Leadership is an explicit curriculum component: participants complete two foundation courses, one leadership course, and five electives.[^1]


| Fact | Value and short verbatim evidence | Exact official URL |
| :-- | :-- | :-- |
| Leadership requirement | **Select one of two leadership-core courses.** “Leadership Core (Select 1 of 2 Courses)” [^1] | [Curriculum](https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program/curriculum) |
| Leading people and organizations | **Communication, alignment, ambiguity, teams, and transformation.** “communicate clearly, foster alignment, lead through ambiguity” [^1] | [Curriculum](https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program/curriculum) |
| Elective areas | **Leadership, innovation, communication, strategy, organizational design, and decision-making.** “electives spanning leadership, innovation, communication, strategy, organizational design, and decision-making” [^1] | [Curriculum](https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program/curriculum) |
| Individual leadership course names | **null — not published in the retrieved curriculum evidence.** The available wording identifies “Leadership Core,” not individual course titles. [^1] | [Curriculum](https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program/curriculum) |

### Depth

| Fact | Value and short verbatim evidence | Exact official URL |
| :-- | :-- | :-- |
| Main field | **Business and leadership, including strategy, innovation, finance, and critical thinking.** “applied learning across leadership, strategy, innovation, finance, and critical thinking” [^1] | [Curriculum](https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program/curriculum) |
| Course count | **8 courses.** “Stanford LEAD is a custom combination of 8 courses” [^1] | [Curriculum](https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program/curriculum) |
| Academic credit hours | **null — not published in the reviewed evidence; the stated award is 24 CEUs.** “Earn 24 Continuing Education Units (CEUs)” [^1] | [Curriculum](https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program/curriculum) |
| Applied work | **Group projects and collaboration.** “live events, group projects, collaboration, and networking” [^3] | [Executive Education FAQ](https://www.gsb.stanford.edu/exec-ed/admission/faq) |
| Capstone, thesis, research requirement | **null — not published in the reviewed curriculum evidence.** [^1] | [Curriculum](https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program/curriculum) |
| Faculty involvement | **Stanford GSB faculty teach the courses, including faculty who teach in the MBA program.** “Courses are taught by Stanford GSB faculty who also teach in Stanford’s MBA program” [^2] | [Program](https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program) |

### Degree path

| Fact | Value and short verbatim evidence | Exact official URL |
| :-- | :-- | :-- |
| Credential | **Stanford GSB Professional Certificate.** “Earn a Stanford GSB Professional Certificate upon completion” [^1] | [Curriculum](https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program/curriculum) |
| Continuing education | **24 CEUs.** “Earn 24 Continuing Education Units (CEUs)” [^1] | [Curriculum](https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program/curriculum) |
| Published CEU uses | **Potential professional recertification and employer development/reimbursement uses.** “CEUs may be used to support professional recertification requirements” [^1] | [Curriculum](https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program/curriculum) |
| Credits officially count toward a graduate degree | **null — not published in the reviewed evidence; no supporting graduate-degree-credit quote obtained.** [^1][^3] | [Curriculum](https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program/curriculum), [FAQ](https://www.gsb.stanford.edu/exec-ed/admission/faq) |

The CEU statement does **not** establish graduate-credit transferability, so neither graduate credit nor an MBA pathway is asserted.[^1]

### Classmates and interaction

| Fact | Value and short verbatim evidence | Exact official URL |
| :-- | :-- | :-- |
| Advertised intake | **March 17, 2027–March 16, 2028.** “17 Mar 2027 – 16 Mar 2028” [^2] | [Program](https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program) |
| Cohort-based interaction | **Collaboration with a cohort is explicitly described.** “collaboration with a diverse cohort of accomplished professionals” [^2] | [Program](https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program) |
| Fixed cohort membership | **null — not published explicitly in the reviewed evidence.** A dated session and cohort interaction are published, but a fixed-membership policy is not established. [^2] | [Program](https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program) |
| Cohort size and experience | **null — not published in the reviewed participant-profile evidence; no class year established for a numeric profile.** [^4] | [Participant profile](https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program/participant-profile) |
| Intended seniority | **Mid- to senior-career professionals; not a measured cohort distribution.** “LEAD is designed for mid- to senior-career professionals” [^2] | [Program](https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program) |
| Intended roles | **Managers, functional experts, entrepreneurs, and operators.** “Entrepreneurs and operators” [^2] | [Program](https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program) |
| Live sessions | **Yes.** “Live sessions, discussions, collaboration, and peer engagement are woven throughout the experience” [^2] | [Program](https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program) |
| Live-session attendance rules and frequency | **null — not published in the retrieved evidence.** [^2][^3] | [Program](https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program), [FAQ](https://www.gsb.stanford.edu/exec-ed/admission/faq) |
| Required in-person time | **0 under the dataset’s online-program rule.** “designed to be completed fully online” [^3] | [FAQ](https://www.gsb.stanford.edu/exec-ed/admission/faq) |
| Optional campus session: days and location | **null — not published in the reviewed non-news evidence.** [^2][^3] | [Program](https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program), [FAQ](https://www.gsb.stanford.edu/exec-ed/admission/faq) |
| Continuing peer access | **Lifelong peer community.** “Participants join a lifelong community of accomplished professionals” [^2] | [Program](https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program) |
| Continued Stanford engagement | **Invitations to select speaker events during and after completion.** “participants are invited to attend select Stanford and Stanford GSB speaker events” [^2] | [Program](https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program) |
| Formal Stanford alumni status or association membership | **null — not published in the reviewed LEAD evidence.** Peer-network access is published, but formal alumni status is not established. [^2][^3] | [Program](https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program), [FAQ](https://www.gsb.stanford.edu/exec-ed/admission/faq) |

### Career change

| Fact | Value and short verbatim evidence | Exact official URL |
| :-- | :-- | :-- |
| Career-development positioning | **Preparation for broader leadership responsibility or career growth.** “Preparing for broader leadership responsibility or career growth” [^4] | [Participant profile](https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program/participant-profile) |
| Personalized learning support | **Feedback from course facilitators.** “dedicated time and personalized feedback from course facilitators” [^3] | [FAQ](https://www.gsb.stanford.edu/exec-ed/admission/faq) |
| Career services, recruiting, internships, placement, or relocation support | **null — not published for LEAD in the reviewed evidence.** [^2][^4][^3] | [Program](https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program), [Participant profile](https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program/participant-profile), [FAQ](https://www.gsb.stanford.edu/exec-ed/admission/faq) |

Learning feedback and career-growth positioning are not evidence of recruiting access or job-placement services.[^4][^3]

### Cost and payment

| Fact | Value and short verbatim evidence | Exact official URL |
| :-- | :-- | :-- |
| Tuition against duration and credential | \*\*US \$19,200; year-long program; Professional Certificate plus 24 CEUs.** “US \$19,200”; “Flexible, Year-Long Online Experience”; “Earn 24 Continuing Education Units (CEUs)” [^2][^1] | [Program](https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program), [Curriculum](https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program/curriculum) |
| Materials and platform access | **Included.** “The program fee includes tuition, access to online course platforms, and all course materials.” [^5] | [Payment \& Cancellation](https://www.gsb.stanford.edu/exec-ed/admission/payment-cancellation) |
| Additional mandatory fees | **null — not published in the reviewed LEAD fee statements.** [^2][^5] | [Program](https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program), [Payment \& Cancellation](https://www.gsb.stanford.edu/exec-ed/admission/payment-cancellation) |
| Lodging and meals included | **null — not published as LEAD inclusions.** The LEAD-specific list names tuition, platforms, and materials. [^5] | [Payment \& Cancellation](https://www.gsb.stanford.edu/exec-ed/admission/payment-cancellation) |
| Installments | \*\*Four quarterly payments of US \$4,800.** “four quarterly installments of \$4,800” [^5] | [Payment \& Cancellation](https://www.gsb.stanford.edu/exec-ed/admission/payment-cancellation) |
| Installment timing | **First before the program; remaining three before each quarter.** “The first installment will be due before the start of the program” [^5] | [Payment \& Cancellation](https://www.gsb.stanford.edu/exec-ed/admission/payment-cancellation) |
| Upfront payment | \*\*US \$19,200 in one payment.** “Pay the entire tuition fee of \$19,200 upfront” [^5] | [Payment \& Cancellation](https://www.gsb.stanford.edu/exec-ed/admission/payment-cancellation) |
| Early-payment discount | **null — not published in the LEAD payment statement.** Upfront payment is offered without a stated discount. [^5] | [Payment \& Cancellation](https://www.gsb.stanford.edu/exec-ed/admission/payment-cancellation) |
| Employer sponsorship, loans, scholarships | **null — no LEAD-specific entitlement or offer established in the reviewed evidence.** The curriculum says CEUs may qualify for employer development/reimbursement programs, which is conditional. [^1][^5] | [Curriculum](https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program/curriculum), [Payment \& Cancellation](https://www.gsb.stanford.edu/exec-ed/admission/payment-cancellation) |

## Uncertainties and conflicts

- **Standard duration versus completion allowance:** The program is advertised as year-long, while the payment policy says, “You will still have 24 months to enroll in courses and complete the certificate”; the longer allowance is not coded as standard duration.[^5][^2]
- **Optional campus activity:** Fully online completion is explicit, but optional campus-event availability, duration, location, and charges are not established in the reviewed permitted evidence.[^2][^3]
- **Cohort evidence:** No dated numeric class profile was established; intended audience descriptions therefore remain separate from measured participant seniority or experience.[^4][^2]
- **Alumni and degree rights:** Lifelong community access and CEUs are explicit; formal Stanford alumni status, alumni career-service eligibility, and graduate-degree credit are not established.[^2][^3][^1]
- **Fee scope:** Materials and platforms are explicitly included; meals, lodging, and any additional mandatory fees are not explicitly resolved by the LEAD-specific statements.[^5][^2]
- **Change notice:** Stanford states, “Program dates, fees, and faculty subject to change.” [Official program page](https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program)

<span style="display:none">[^10][^11][^12][^13][^14][^15][^6][^7][^8][^9]</span>

<div align="center">⁂</div>

[^1]: https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program/curriculum

[^2]: https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program

[^3]: https://www.gsb.stanford.edu/exec-ed/admission/faq

[^4]: https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program/participant-profile

[^5]: https://www.gsb.stanford.edu/exec-ed/admission/payment-cancellation

[^6]: https://www.gsb.stanford.edu/alumni/career-resources/video-library?page=1

[^7]: https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program/impact

[^8]: https://www.gsb.stanford.edu/exec-ed/programs/stanford-lead-online-business-program/faculty

[^9]: https://www.gsb.stanford.edu/experience/news-history/stanford-lead-celebrates-its-10th-anniversary

[^10]: https://www.gsb.stanford.edu/experience/news-history/ae

[^11]: https://www.gsb.stanford.edu/programs/mba/life-community/alumni

[^12]: https://www.gsb.stanford.edu/exec-ed/admission/payment-cancellation/discounts

[^13]: https://www.gsb.stanford.edu/alumni/career-resources

[^14]: https://www.gsb.stanford.edu/experience/news-history/office-artifact-erica-plambecks-miniature-rickshaw

[^15]: https://www.gsb.stanford.edu/exec-ed/programs/stanford-executive-program

