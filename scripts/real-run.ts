// Runs a whole conversation against the real Claude API, as the page would: chatLoop with the
// real model client and the real program data, and a simulated user who answers as persona A
// (personas/A.md). It's the only end-to-end check of the prompt and the strict tool schemas on
// the real model; tests never call the API (CLAUDE.md rule 2). Run by hand, with the key in .env:
//
//   ./run npm run real-run -- persona-a       both stages to the programs
//   ./run npm run real-run -- declined-home   the user won't say where they live
//   ./run npm run real-run -- stage1-change   the user changes the length in stage 2
//   ./run npm run real-run -- tension         no days on site, so a contradiction fires (R1)
//
// It prints every turn (the advisor's words included, so keep the output local), each refused
// tool call with the server's problems, the token use and its cost, and whether the programs
// equal the engine run directly on the confirmed cards. Cost: about $0.50 to $1 a run.
import { CHIPS } from "../core/advisor/chips";
import { STAGE_2_CHIP_FIELDS, toEngineDirection, type Direction } from "../core/advisor/tools";
import { evaluatePrograms, loadPrograms, recommendCategory } from "../core/index";
import type { Profile } from "../core/schema/profile";
import type { ChatResponse } from "../server/chatLoop";
import type { RequestLog } from "../server/log";
import { ModelError, type ModelClient } from "../server/model/adapter";
import { createAnthropicClient, probeRequest } from "../server/model/anthropic";
import { Page, PERSONA_A_OPENING, PERSONA_A_TAPS, TODAY } from "../tests/fixtures/chat";

type Scenario = {
  // Persona A's taps, with these replacing some (chip field -> labels).
  taps?: Record<string, string[]>;
  // What the user types when asked where they live and about their background.
  home: string;
  // What the user types after that, for example to answer a tension the advisor raises.
  later?: string;
  // Typed instead of the first stage 2 chips, to change a stage 1 answer, and the taps that
  // replace persona A's from then on.
  change?: { say: string; taps: Record<string, string[]> };
};

const BACKGROUND =
  "Sixteen years of experience, twelve of them leading teams, and my degree is a bachelor's in engineering.";

const SCENARIOS: Record<string, Scenario> = {
  "persona-a": { home: `I live in Buenos Aires, Argentina. ${BACKGROUND}` },
  "declined-home": { home: `I'd rather not say where I live. ${BACKGROUND}` },
  tension: {
    home: `I live in Buenos Aires, Argentina. ${BACKGROUND}`,
    taps: { maxOnsiteDays: ["None"] },
    later:
      "The network matters most to me, so I'd still look at programs that need a few days on site.",
  },
  "stage1-change": {
    home: `I live in Buenos Aires, Argentina. ${BACKGROUND}`,
    change: {
      say: "Before we talk money: actually I could do a program of up to two years.",
      taps: { maxProgramMonths: ["Up to 2 years"] },
    },
  },
};

// What persona A says in words before the verdict (personas/A.md, "In their voice"), in order.
const STAGE_1_WORDS = [
  "Move into an executive role: running a whole engineering function.",
  "The people who hold those jobs have a different kind of network than I do. Honestly I think I'm after the room, not the curriculum.",
  "I have a degree and I don't need another one. A year at most, and I can't stop working.",
];
const PROGRAMS_YES = "Yes, show me programs.";
const GO_ON = "That's everything I can tell you. Please go on.";

const MAX_TURNS = 45;
// Sonnet 5.5 per million tokens: input, cache write (1.25×), cache read, output.
const PRICE = { input: 2, cacheWrite: 2.5, cacheRead: 0.2, output: 10 };

const short = (s: string, n = 240) => (s.length > n ? `${s.slice(0, n)}…` : s);

// The real client, plus the API's own error message when a call fails (the server maps it to a
// notice kind), fetched by sending the same request once more: a refused one costs nothing.
function diagnosingClient(): ModelClient {
  const real = createAnthropicClient();
  return {
    async send(request) {
      try {
        return await real.send(request);
      } catch (error) {
        if (error instanceof ModelError && error.kind !== "retryable") {
          const probe = await probeRequest(request, 64);
          if (!probe.ok) console.log(`  API ERROR ${probe.status}: ${probe.message}`);
        }
        throw error;
      }
    },
  };
}

function report(r: ChatResponse) {
  if (r.text) console.log(`  advisor: ${r.text.replace(/\n+/g, " / ")}`);
  for (const m of r.messages) {
    if (typeof m.content === "string") continue;
    for (const b of m.content) {
      if (b.type === "tool_use")
        console.log(`  tool_use ${b.name} ${short(JSON.stringify(b.input), 400)}`);
      if (b.type === "tool_result") {
        const content = typeof b.content === "string" ? b.content : JSON.stringify(b.content);
        console.log(
          `  ${b.is_error ? "REFUSED" : "result"}: ${short(content, b.is_error ? 1200 : 300)}`,
        );
      }
    }
  }
  if (r.chips)
    console.log(`  -> chips ${r.chips.field} (pick ${r.chips.pick}): ${r.chips.question}`);
  if (r.confirm?.direction)
    console.log(`  -> direction card ${JSON.stringify(r.confirm.direction)}`);
  if (r.confirm?.profile) console.log(`  -> search card ${JSON.stringify(r.confirm.profile)}`);
  if (r.direction) console.log(`  -> verdict ${r.direction.category.winner ?? "none"}`);
  if (r.programs) console.log(`  -> programs ${JSON.stringify(r.programs.ranking)}`);
  if (r.notice) console.log(`  -> NOTICE ${r.notice.kind}: ${r.notice.message}`);
}

async function main() {
  const name = process.argv[2] ?? "persona-a";
  const scenario = SCENARIOS[name];
  if (!scenario) throw new Error(`unknown scenario ${name}: ${Object.keys(SCENARIOS).join(", ")}`);
  const taps = { ...PERSONA_A_TAPS, ...scenario.taps };
  const programs = loadPrograms();
  const page = new Page(diagnosingClient(), programs);
  // The logger gets numbers only (server/log.ts): the cost comes from page.logs.
  const logs: RequestLog[] = page.logs;

  let direction: Direction | null = null;
  let search: Profile | null = null;
  let verdicts = 0;
  let optedIn = false;
  let changed = false;
  let words = 0;
  let homeGiven = false;
  let plainInARow = 0;
  let refusedCalls = 0;
  let result: ChatResponse | null = null;

  console.log(`scenario ${name}\n> ${PERSONA_A_OPENING}`);
  let r = await page.type(PERSONA_A_OPENING);
  report(r);
  for (let turn = 1; turn < MAX_TURNS; turn++) {
    refusedCalls += r.messages
      .flatMap((m) => (typeof m.content === "string" ? [] : m.content))
      .filter((b) => b.type === "tool_result" && b.is_error).length;
    if (r.direction) verdicts++;
    if (r.notice || r.programs) break;
    if (r.chips) {
      plainInARow = 0;
      const field = r.chips.field;
      if (
        scenario.change &&
        !changed &&
        (STAGE_2_CHIP_FIELDS as readonly string[]).includes(field)
      ) {
        changed = true;
        console.log(`> (typed instead of tapping) ${scenario.change.say}`);
        r = await page.post({
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: r.chips.toolUseId,
              content: JSON.stringify({ chosen: [], typed: scenario.change.say }),
            },
          ],
        });
      } else {
        const labels = (changed && scenario.change?.taps[field]) || taps[field];
        if (!labels) throw new Error(`no tap for ${field}`);
        const known = (CHIPS[field] as readonly { label: string }[]).map((c) => c.label);
        if (!labels.every((l) => known.includes(l))) throw new Error(`bad label for ${field}`);
        console.log(`> (taps) ${labels.join(", ")}`);
        r = await page.tap(...labels);
      }
    } else if (r.confirm) {
      plainInARow = 0;
      if (r.confirm.direction) direction = r.confirm.direction;
      if (r.confirm.profile) search = r.confirm.profile;
      console.log(`> (confirms the ${r.confirm.direction ? "direction" : "search"} card)`);
      r = await page.confirm();
    } else {
      if (++plainInARow > 4) {
        console.log("STUCK: five plain turns in a row");
        break;
      }
      let say: string;
      if (verdicts === 0) say = STAGE_1_WORDS[words++] ?? GO_ON;
      else if (!optedIn) {
        optedIn = true;
        say = PROGRAMS_YES;
      } else if (!homeGiven) {
        homeGiven = true;
        say = scenario.home;
      } else say = scenario.later ?? GO_ON;
      console.log(`> ${say}`);
      r = await page.type(say);
    }
    report(r);
    result = r;
  }

  console.log("\n=== summary");
  const usage = logs.reduce(
    (u, l) => ({
      calls: u.calls + l.rounds,
      input: u.input + l.inputTokens,
      cacheRead: u.cacheRead + l.cacheReadTokens,
      cacheWrite: u.cacheWrite + l.cacheCreationTokens,
      output: u.output + l.outputTokens,
    }),
    { calls: 0, input: 0, cacheRead: 0, cacheWrite: 0, output: 0 },
  );
  const cost =
    (usage.input * PRICE.input +
      usage.cacheWrite * PRICE.cacheWrite +
      usage.cacheRead * PRICE.cacheRead +
      usage.output * PRICE.output) /
    1e6;
  console.log(
    `requests ${logs.length}, model calls ${usage.calls}, refused tool calls ${refusedCalls}`,
  );
  console.log(
    `tokens: ${usage.input} input, ${usage.cacheWrite} cache write, ${usage.cacheRead} cache read, ${usage.output} output; about $${cost.toFixed(2)}`,
  );
  console.log(`statuses: ${logs.map((l) => l.status).join(", ")}`);
  const programs_ = r.programs ?? result?.programs ?? null;
  if (!programs_ || !direction || !search) {
    console.log("RESULT: did not reach the programs");
    process.exit(1);
  }
  const { category } = recommendCategory(toEngineDirection(direction), programs);
  const expected = evaluatePrograms(search, category, programs, TODAY);
  const same = JSON.stringify(expected) === JSON.stringify(programs_);
  console.log(
    `direction ${category.winner}; search home "${search.homeCity}" ${search.homeCountry}; months ${search.maxProgramMonths}`,
  );
  console.log(`RESULT: reached the programs; equal to evaluatePrograms: ${same}`);
  process.exit(same ? 0 : 1);
}

void main();
