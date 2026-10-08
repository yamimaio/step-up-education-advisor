# Fake Leadership Institute: Technology Leadership Intensive (test fixture, not a real program)

The most recent intake described is the January 2027 cohort. Everything below is invented for tests.

## PART 1: JSON

```json
{
  // Perplexity sometimes leaves comments and trailing commas in the JSON.
  "name": "Technology Leadership Intensive",
  "institution": "Fake Leadership Institute",
  "category": "executive",
  "credential": "Certificate of completion",
  "format": "hybrid",
  "durationMonths": 6,
  "credits": "30 CEUs",
  "onsiteDaysPerYear": 10,
  "residencyCount": 2,
  "longestStretchDays": 5,
  "hoursPerWeekMin": null,
  "hoursPerWeekMax": null,
  "workCompatible": true,
  "city": "Boston, Massachusetts",
  "country": "US",
  "tuitionUsd": 24000,
  "tuitionIncludes": "not published",
  "paymentOptions": ["installments", "employer sponsorship"],
  "minExperienceYears": 7,
  "accreditation": [],
  "cohortMedianExperienceYears": 14,
  "cohortSeniority": "Mostly directors and VPs",
  "lodgingPerNightUsd": 365,
  "nextStartDate": "2027-01-15",
  "sources": [
    {
      "field": "format",
      "url": "https://example.edu/fake-sample",
      "quote": "Blended: two residencies and live online sessions",
      "checkedOn": "2026-10-01"
    },
    {
      "field": "durationMonths",
      "url": "https://example.edu/fake-sample",
      "quote": "Program length: 6 months",
      "checkedOn": "2026-10-01"
    },
    {
      "field": "tuitionUsd",
      "url": "https://example.edu/fake-sample/fees",
      "quote": "Program fee $24,000",
      "checkedOn": "2026-10-01"
    },
    {
      "field": "paymentOptions.installments",
      "url": "https://example.edu/fake-sample/fees",
      "quote": "Pay in three installments",
      "checkedOn": "2026-10-01"
    },
    {
      "field": "hoursPerWeekMin",
      "url": "https://example.edu/fake-sample",
      "quote": "not published",
      "checkedOn": "2026-10-01"
    },
    {
      "field": "cohortMedianExperienceYears",
      "url": "https://example.edu/fake-sample/class",
      "quote": "Median experience: 14 years",
      "checkedOn": "2026-10-01"
    },
    {
      "field": "lodgingPerNightUsd",
      "url": "https://www.gsa.gov/travel/plan-book/per-diem-rates",
      "quote": "Boston / Cambridge ... $365 ... $213 ... $305 ... $365",
      "checkedOn": "2026-10-01"
    },
    {
      "field": "nextStartDate",
      "url": "https://example.edu/fake-sample",
      "quote": "Next start: January 15, 2027",
      "checkedOn": "2026-10-01"
    }
  ]
}
```

**Important data-treatment notes:** GSA lodging varies by month, so the scalar above is one month's rate.

## PART 2: Rating evidence

| Fact    | Value   | Quote                 |
| :------ | :------ | :-------------------- |
| Tuition | $24,000 | "Program fee $24,000" |

## Uncertain or conflicting items

- The program page says six months; the brochure says "about half a year".[^2]
- Cohort size is **not published**.
- Weekly workload is not published, so `hoursPerWeek` is null.

---

## References

1. [Fake program page](https://example.edu/fake-sample)
