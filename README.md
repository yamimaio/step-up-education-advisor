# Step Up

MBA, executive program, or nothing at all: Step Up helps leaders find the next step that fits how they want to grow. It is an AI advisor that works out what you need, picks the type of program that fits (or tells you "not yet"), and backs the verdict with shortlists from hand-verified programs.

Status: scaffold only. See `docs/build-steps.md` for the build plan and `CLAUDE.md` for the working rules.

## Run it

Everything runs in Docker. Nothing needs Node on your machine.

```sh
cp .env.example .env            # then add MODEL_API_KEY (server-only, never commit it)
docker compose up dev           # dev server on http://localhost:3000
docker compose up --build web   # production image on http://localhost:3000
HOST_PORT=3100 docker compose up web   # if port 3000 is taken
```

Run any command in the dev container with `./run`:

```sh
./run npm ci
./run npm run ci      # lint, typecheck, format check, tests
./run npm test
```

## Layout

- `core/`: data, schemas, engine and advisor rules. No web or model code; it never imports `app/` or `server/` (enforced by ESLint)
- `server/`: model adapter and chat loop (website only)
- `app/`: the Next.js page and `/api/chat`
- `personas/`, `examples/`, `research/`, `docs/`
