# Changelog

All notable changes to Step Up are listed here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Each release is the `production` commit tagged `vX.Y.Z`; the steps are in `docs/deploy.md` ("Releasing").

## [Unreleased]

### Added

- The test sheet now holds every live test result and the commit it ran on, with the transcripts behind it in `examples/test-runs/` (#261).
- This changelog, and GitHub release notes for every production release (#274).

### Changed

- The README links the live site and explains how Step Up works, plus its independence, privacy, limitations and evidence (#263).

### Security

- The site runs on Node 24.22.1, which fixes TLS certificate hostname-check bypasses and a Brotli decompression flaw, and distrusts the compromised eMudhra intermediate certificates. The image's system CA store (Alpine `ca-certificates`) is also upgraded when the image is built (#273).

## [0.1.0] - 2026-10-11

The first public release, live at https://step-up-xt5h.onrender.com/. It is a **prototype**, not a production-ready service: the journey works end to end, but only 7 programs are in the catalog.

### Added

- An AI advisor (Claude Sonnet 5.5) that interviews experienced professionals in about ten exchanges: their goal in their own words, plus quick taps for needs and limits (time, length, degree, budget, travel). It raises tensions, like wanting expert depth on under 5 hours a week, and lets the user decide.
- A confirm card of what the advisor understood, shown before any verdict.
- A verdict on the type of step that fits, or "not yet", decided by a fixed engine that scores six program types on the user's top needs and written in plain words from the engine's reasons only: no scores, no invented facts.
- On request, a ranked shortlist from 7 hand-verified US programs (Harvard Extension, MIT Professional Education, Northwestern, Stanford GSB and Wharton). Every fact on a card shows the source it came from, and the card says when a school doesn't publish something.
- No accounts and no database: the conversation stays in the browser tab, and it can be downloaded as a transcript. A notice before the first message says what is sent to the model provider (Anthropic).
- A per-visitor rate limit on the chat.

[unreleased]: https://github.com/yamimaio/step-up-education-advisor/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/yamimaio/step-up-education-advisor/releases/tag/v0.1.0
