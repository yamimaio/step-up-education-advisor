# Browser QA with Claude Desktop

A repeatable test pass that Claude runs in a real browser, before or after a release. Claude clicks through the app like a user, and you get back rows ready for `docs/test-sheet.md`. It doesn't replace the unit tests or the deploy checks in `docs/deploy.md`; it covers what only a browser shows: the chips, cards, layout, wording and the download.

## Which browser

- **Claude in Chrome** (the Chrome extension, used from Claude Desktop). Use it for the pre-release pass: it drives your own Chrome, so it can open `http://localhost:3000` served by Docker on your machine.
- **The built-in browser pane** in Claude Desktop. Fine for the production site. Use it for a local build only if it can open `http://localhost:3000` on your machine; if it can't, switch to Chrome.

Give the extension access to `localhost` and `step-up-xt5h.onrender.com` only. Nothing in this pass needs a sign-in.

## One-time setup

1. Install Claude in Chrome and turn it on in Claude Desktop. In a new chat, ask "open http://example.com in Chrome" to confirm it works.
2. Check that `.env` holds the local key (`MODEL_API_KEY`, the `step-up-local` key). The pass uses the real model, because the fixes it checks (#193, #200, #203, #157) are wording that the scripted fake can't show. Expect about 60 model calls for the whole pass.

## Before each pre-release pass

```sh
git checkout main && git pull
git rev-parse --short HEAD        # the commit for every row
docker compose up --build web     # the production image Render builds, on http://localhost:3000
```

Run `web`, not `dev`: it is the same `Dockerfile` that Render deploys. Stop `dev` first if it is running (both use port 3000).

## The QA prompt (paste into Claude Desktop)

Replace `<URL>` and `<COMMIT>`. Pre-release: `http://localhost:3000` and the `main` head. After a release: `https://step-up-xt5h.onrender.com/` and the `production` head.

```
You are running a browser QA pass on Step Up, an AI advisor web app, at <URL>, commit <COMMIT>.
Use the browser (Claude in Chrome, or the built-in browser if Chrome isn't available). Work in one new tab.

Rules:
- Act like a user. Tap chips by their exact label; type only where the steps say to type.
- Reload the page before each check so it starts a fresh conversation.
- Wait for each reply to finish before acting. If you see a rate-limit notice, wait 60 seconds and continue.
- Never type anything personal, any key or password. Don't open other sites.
- Don't fix, file or change anything. Only observe and report.
- Read the page as text where you can; take a screenshot when the check is about layout, and keep it.
- If a check gets stuck (a chip set never comes, the page errors), write down exactly what you saw and move on.

Checks:

P1. Persona A, both stages, desktop width.
  Type: "I've led teams for twelve years. The next job is running a whole function, and the people who hold those jobs have a different kind of network than I do."
  Stage 1 taps: "Step up to a bigger leadership role" (if asked to say more, type "Move into an executive role"); needs "A senior network", "Leadership skills", "Deep expertise in a field" in that order, then Send; "More senior leaders"; "Up to a year"; "5 to 10"; "Yes, I keep working"; "Not needed". On the card press "Looks right".
  Expect: verdict "Executive program". The reasons are needs in words, never scores. No price words (cheaper, pricier, more expensive, lighter, tuition, $) unless the card's own reasons say so (#193).
  Then type "yes" to see programs. Stage 2 taps: "$40k to $80k"; "Installments"; "$5k to $10k"; "Part of the appeal"; "Blended"; "Up to 20"; "About a week"; for home type "Buenos Aires, Argentina"; "No, I would not"; "$1,000 to $1,500"; "Immersion", "Network density" then Send; years of experience type "16"; "Bachelor's", field type "Engineering"; "Manager"; years leading type "12". On the search card press "Looks right".
  Expect: every advisor turn after a typed message has text, not only chips. Programs are in the confirmed category. The page scrolls to "Programs that fit". Each program card shows its facts with a source and a confidence; missing values say "not published". The program cards look like the rest of the page (one style: same colours, fonts and card shape as the stage 1 card, #219). The advisor's text about the programs never calls a limit the user set unknown, never says the result "doesn't give" it, and never says to confirm with the school a limit that passed, in particular "Longest stretch away" (#200).
  Finally press "Download transcript". Report the file name and whether it contains the stage 2 answers and the program list.

P2. Phone width. Resize the window to 390 px wide (or the narrowest the tool allows) on the finished P1 conversation and scroll top to bottom.
  Expect: no sideways scroll (if you can run JavaScript, report document.documentElement.scrollWidth and window.innerWidth), text and chips readable, the progress line and the summary panel fit and don't cover the chat. Screenshot the verdict card and the first program card.

P3. "Not yet" path (#203). Back to desktop width.
  Type: "I want to grow as a leader." Taps: "Step up to a bigger leadership role" (if asked, type "Move into an executive role"); needs "Leadership skills", "A senior network", "Access to a new industry or city", Send; "More senior leaders"; "About 2 months"; "Under 5"; "Yes, I keep working"; "Not sure". On the card press "Looks right" once.
  Expect: a "no program yet" verdict (or another verdict; report which). After the one press you get words, and the confirm card does NOT come back. Same price-words check as P1.

P4. Tension after a change (T3, decides #157).
  Type: "I was promoted to director a year ago and I'm managing managers for the first time. I want to be better at this job." Taps: "Lead better in my current role"; needs "Deep expertise in a field" first, then "Leadership skills", "A graduate degree", Send; "Peers at my level"; "Up to a year"; "5 to 10"; "Yes, I keep working"; "Not needed".
  When the card shows, press "Change something" and change the hours to "Under 5".
  Expect: after the change, the advisor names the trade-off (deep expertise needs more than under 5 hours a week) and lets the user choose BEFORE the verdict. Report whether it did, quoting it. Then finish to the verdict and run the price-words check.

P5. Questions the data can't answer (T2). New conversation, persona A's opening. While the goal chips are open, type: "How much does MIT's Technology Leadership Program cost, and what's the GMAT average for Wharton's EMBA?"
  Expect: no number invented; it says programs come after the verdict, from verified records; the chips come back or the interview carries on.

P6. Empty input (T6). Press Send with an empty box, then with only spaces.
  Expect: nothing is sent; Send stays disabled or a notice asks for an answer.

Report: one markdown table with columns ID | Commit | What happened (short quotes from the page) | Pass / Fail / Partial | Blocks the release?
A failure blocks the release only when it touches #193, #200, #203 or #219. Then list the screenshots and the transcript file you kept, and anything odd you noticed outside the checks.
```

P1 to P6 map to the test sheet: P1 is T1 and X4 plus the #193, #200 and #219 checks, P2 is Q5, P3 is the #203 rerun, P4 is the T3 step for #157, P5 is T2 and P6 is T6. Put each row in the test sheet with its commit, and an issue (with its priority) for each failure.

## After a release

Run the same prompt against `https://step-up-xt5h.onrender.com/` with the `production` head. If time is short, run P1, P2 and P6 only: they prove the release works end to end. The deploy checks in `docs/deploy.md` still apply.
