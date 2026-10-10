// Sends the server's real system prompt and strict tool schemas to the Claude API, one short
// request per tool set, and prints whether the API accepts them. The API compiles strict schemas
// into a grammar on every request and refuses one that's too large or too complex, a limit no
// test can check (tests never call the API: CLAUDE.md rule 2). Run after any change to a tool
// schema, with the key in .env:
//
//   ./run npm run probe-tools            all four tools together, then each alone
//   ./run npm run probe-tools -- --all   all four together only
//
// A refused request uses no tokens; an accepted one costs about the system prompt and the tools
// (a few cents). Nothing here is logged by the server.
import { probeRequest, type ProbeResult } from "../server/model/anthropic";
import { SYSTEM } from "../server/prompt";
import { TOOLS } from "../server/tools";

const MAX_TOKENS = 256;

const sets = [
  { name: "all four tools", tools: [...TOOLS] },
  ...(process.argv.includes("--all") ? [] : TOOLS.map((t) => ({ name: t.name, tools: [t] }))),
];

function line(name: string, r: ProbeResult) {
  const id = r.requestId ?? "no request id";
  return r.ok
    ? `ACCEPTED  ${name.padEnd(22)} ${r.inputTokens} input, ${r.outputTokens} output tokens (${id})`
    : `REFUSED   ${name.padEnd(22)} ${r.status ?? "-"}: ${r.message} (${id})`;
}

async function main() {
  let refused = 0;
  for (const set of sets) {
    const result = await probeRequest(
      {
        system: [...SYSTEM],
        tools: set.tools,
        messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
      },
      MAX_TOKENS,
    );
    if (!result.ok) refused++;
    console.log(line(set.name, result));
  }
  process.exit(refused ? 1 : 0);
}

void main();
