# Step Up · Tools and models log

Which tool and model did what, at every step of the build. Part of the project journey: it feeds the stack and responsible-build fields in the submission, and it goes into the repo as `docs/tools-and-models.md`. Add a row whenever a step uses a tool, or when a choice changes.

## Subscriptions and accounts

| What | Status |
| --- | --- |
| Claude | Max until Oct 7, 2026; Claude Pro from Oct 7. Yami may go back to Max if the weekly quota runs out |
| Perplexity | Pro |
| Claude API (the app's own AI) | Pay-as-you-go key created by Yami, with a monthly spend limit in the Console. No partner credits |
| GitHub | Yami's account, public repo |
| Docker | Local, on Yami's machine |
| Hosting | Render (challenge credits) or Vercel, picked Thursday Oct 8 |

## By step

| Day | Step | Tool | Model | What it did |
| --- | --- | --- | --- | --- |
| Before Oct 6 | Concept brief | Perplexity Pro | (Perplexity default) | Brainstormed the idea and wrote the concept brief used to sign up |
| Oct 6 | Build plan and v1 spec | Claude (project with a shared doc) | Claude | Turned the brief into the 5-day plan; decisions made in doc comments |
| Oct 6 to 7 | Day 1 submission texts and check-in cards | Claude (project threads) | Claude | Drafted the brief, starting point, stack text and the check-in images |
| Oct 7 | Day 2 plan, implementation plan draft, Perplexity prompts | Claude Code in the Claude project (cloud) | Claude | Wrote the Day 2 plan and the draft implementation plan for Yami's review |
| Oct 7 | Detailed build plan | Claude Code, plan mode, local | Opus 5.5 if Pro allows, else Sonnet 5.5 | Plans the build against the real repo; Yami approves before any code |
| Oct 7 | Program research (4 records) | Perplexity Deep Research | (Deep Research) | Facts from official pages only, with a URL and quote per fact. Prompt 1 in `docs/perplexity-program-prompts.md` |
| Oct 7 | Program ratings | Perplexity, thinking model, separate thread | Yami's pick (GPT or Grok); the same one for all 12 programs | Applies the 1 to 5 rubric to the research facts. Prompt 2 in the same file |
| Oct 7 | Record review and PR | Claude Code, local | Sonnet 5.5 | Reviews the research and rating files with Yami; Yami opens the PR |
| Oct 7 | Fact verification | Yami | none | Checks each fact against its quote and link; the commit names the verifier |
| Oct 7 | Build (steps 1 to 7) | Claude Code, local | Sonnet 5.5 | Writes the code, one PR per step |
| Oct 7 | Code review per PR | Claude Code, fresh session, `/code-review` | Sonnet 5.5; Opus 5.5 for the engine and server PRs if quota allows | Posts findings on each PR before Yami reviews |
| Oct 7 | Security review | Claude Code, `/security-review` | Opus 5.5 if quota allows, else Sonnet 5.5 | Checks the server PR: API key, input handling, logging |
| Oct 7 onward | The advisor inside the app | Claude API | Claude Sonnet 5.5 | Runs the conversation and explanations; the scoring engine decides |
| Thursday | Comparison run | Claude API | Claude Opus 5.5 | One run of the 6 personas to compare against Sonnet |

## Changes

- Oct 7: Claude Max expired; the build moved to Sonnet 5.5, with Opus 5.5 kept for planning and the two highest-risk reviews.
- Oct 7: program research and ratings moved from Claude to Perplexity (Yami's call, to save Claude usage).
