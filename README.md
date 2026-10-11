# Step Up

MBA, executive program, or nothing at all: Step Up helps leaders find the next step that fits how they want to grow.

**Try it:** https://step-up-xt5h.onrender.com/ (no account needed)

Step Up is an AI advisor for experienced professionals (8+ years, with a degree) who want to grow as leaders, either into a bigger role or by leading better in the one they have. In about ten exchanges it works out what they need, picks the type of step that fits (or says "not yet"), and, if they want, shows a ranked shortlist of hand-verified US programs. Built during the AI Builder Challenge, Oct 6 to 10, 2026.

## How it works

1. **The AI interviews.** Claude Sonnet 5.5 asks about the goal in the user's own words, plus quick taps for needs and limits (time, length, degree, budget, travel). It raises tensions, like wanting expert depth on under 5 hours a week, and lets the user decide. Before any verdict it shows a confirm card of what it understood.
2. **A fixed engine decides.** A deterministic TypeScript engine (`core/engine/`) scores the six program types on the user's top needs, on one 1 to 5 scale, and rules a type out only when every verified program of that type misses a hard limit. The rules are in `docs/need-based-ranking.md`.
3. **The AI explains.** The verdict is written in plain words, using only the reasons the engine gave. No scores, no invented facts.
4. **Programs, if wanted.** A few practical questions lead to a ranked shortlist from 7 verified programs (`core/data/programs.json`). Every fact (tuition, format, days on site, cohort experience) carries the official URL and quoted text it came from, and each record was checked by hand. When a school doesn't publish something, the card says so.

## Independent

No school pays to be listed or ranked, there are no sponsored placements or referral fees, and every program is scored by the same published rules. The author is an MIT Technology Leadership Program participant; MIT is scored by those same rules.

## Privacy

No accounts and no database. The conversation lives only in the browser tab and is gone when it's closed, unless the user downloads the transcript. A notice before the first message says what is sent to the model provider (Anthropic). Server logs hold counts and statuses, never message text.

## Limitations

- US programs only, English only, and 7 verified programs so far.
- Not admissions, financial, immigration or legal advice; the advisor points to admissions offices or an immigration attorney.
- Known open issues are labelled `after-challenge`.

## Evidence

- Test sheet with every live result: `docs/test-sheet.md`
- Transcripts of the live test runs: `examples/test-runs/`
- Program research behind each record: `docs/research/`
- Design and decisions: `docs/implementation-plan.md`, `docs/decisions.md`; tools and models used: `docs/tools-and-models.md`

## Run it

Everything runs in Docker. Nothing needs Node on your machine.

```sh
cp .env.example .env            # then add MODEL_API_KEY (server-only, never commit it)
./run npm ci                    # first time only: installs into the container's node_modules volume
docker compose up dev           # dev server on http://localhost:3000
docker compose up --build web   # production image on http://localhost:3000
HOST_PORT=3100 docker compose up web   # if port 3000 is taken
```

Run any command in the dev container with `./run`:

```sh
./run npm run ci      # lint, typecheck, format check, tests
./run npm test
./run --ports npm run dev   # same as `docker compose up dev`, publishing port 3000
```

On Linux, files the container writes are root-owned unless you run it as yourself: `export UID GID`, then once
`docker compose run --rm -u 0 dev chown -R "$UID:$GID" node_modules .next`. Docker Desktop on macOS needs nothing.
Docker Compose 2.24 or newer is required.

The public site runs on Render: see `docs/deploy.md`.

## Layout

- `core/`: data, schemas, engine and advisor rules. No web or model code; it never imports `app/` or `server/` (enforced by ESLint)
- `server/`: model adapter and chat loop (website only)
- `app/`: the Next.js page and `/api/chat`
- `personas/`, `examples/`, `docs/` (`docs/research/` holds the Perplexity research behind each program record)
