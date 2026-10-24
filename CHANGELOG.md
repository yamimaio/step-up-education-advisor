# Changelog

All notable changes to Step Up are listed here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Each release is the `production` commit tagged `vX.Y.Z`; the steps are in `docs/deploy.md` ("Release notes"). Every PR adds its line under `[Unreleased]` when it merges; changes that only touch docs, tests or tooling may be grouped.

## [Unreleased]

## [0.1.1] - 2026-10-24

### Added

- The test sheet now holds every live test result and the commit it ran on, with the transcripts behind it in `examples/test-runs/` (#261).
- This changelog, and GitHub release notes for every production release (#274).

### Changed

- The README links the live site and explains how Step Up works, plus its independence, privacy, limitations and evidence (#263).

### Security

- The site runs on Node 24.22.1, which fixes TLS certificate hostname-check bypasses and a Brotli decompression flaw, and distrusts the compromised eMudhra intermediate certificates. The production image also upgrades its Alpine packages, including the system CA store (`ca-certificates`) (#273).

## [0.1.0] - 2026-10-11

The first public release: a working prototype, built during the AI Builder Challenge (Oct 6 to 10, 2026) and live at https://step-up-xt5h.onrender.com/. It is **not production-ready yet**: the journey works end to end, but only 7 programs are in the catalog, all in the US, and the advisor speaks English only. Known open issues are labelled `after-challenge`.

### Added

- **Stage 1: the right type of step.** The advisor (Claude Sonnet 5.5) interviews the user in about ten exchanges: their goal in their own words, plus quick taps for their top 3 needs, who they want as classmates, how long and how many hours a week, whether they must keep working and whether they need a degree. It raises tensions, like wanting expert depth on under 5 hours a week, lets the user decide, and shows a confirm card before any verdict. A fixed engine scores the six program types (MBA, Executive MBA, specialized master's, executive program, graduate certificate, short course) on the user's top needs, on one 1 to 5 scale, or answers "not yet". The verdict is written in plain words from the engine's reasons only: no scores, no invented facts.
- **Stage 2: programs, if wanted.** A few practical questions (budget and how they'd pay, travel and time on site, where they live, format, plus their experience, degree and role) and a confirm card of the search, then a ranked shortlist inside the confirmed type, with the runner-up type's best under "Also worth a look". Programs rank by need fit, format fit and travel fit; location and cost only break ties. A program that misses only on a figure the school doesn't publish ranks with the passes (#248).
- **7 hand-verified US programs:** MIT Technology Leadership Program, Harvard Extension's Organizational Behavior graduate certificate, Northwestern's part-time MEM, Wharton EMBA San Francisco, Stanford LEAD, Kellogg EMBA Miami and Kellogg EMBA Chicago. Every fact on a card shows the source it came from, and the card says when a school doesn't publish something.
- **Privacy:** no accounts and no database. The conversation stays in the browser tab and can be downloaded as a transcript. A notice before the first message says what is sent to the model provider (Anthropic). Server logs hold counts and statuses, never message text.
- **Limits that keep cost in check:** 40 messages per conversation (taps and confirms count), 4,000 characters per message, and per visitor at most 20 messages a minute and 100 an hour, keyed on Cloudflare's client IP (#186).

[unreleased]: https://github.com/yamimaio/step-up-education-advisor/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/yamimaio/step-up-education-advisor/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/yamimaio/step-up-education-advisor/releases/tag/v0.1.0
