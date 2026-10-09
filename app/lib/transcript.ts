import type { Verdict } from "./chatState";
import type { MessageParam } from "./chatTypes";
import { toTurns, turnText } from "./conversation";
import { directionLines } from "./labels";
import { verdictView } from "./verdict";

// The Download transcript file: every message, the chips tapped, the confirmed card and the
// verdict, as Markdown. Built in the browser; nothing is sent to the server.

export type TranscriptInput = {
  history: MessageParam[];
  verdict: Verdict | null;
  // The template explanation shown after a failed confirm (not in the history).
  fallbackText: string | null;
  date: Date;
};

// The user's local date as YYYY-MM-DD (toISOString would give the UTC date, a day off at night).
export function localDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const quote = (text: string) =>
  text
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");

export function buildTranscript({ history, verdict, fallbackText, date }: TranscriptInput): string {
  const out: string[] = [`# Step Up transcript`, "", `Saved ${localDate(date)}.`];

  const turns = toTurns(history);
  out.push("", "## Conversation", "");
  for (const turn of turns) {
    const who = turn.kind === "assistant" ? "Step Up" : "You";
    const how = turn.kind === "chips" ? (turn.typed ? " (typed)" : " (tapped)") : "";
    out.push(`**${who}${how}:**`, "", quote(turnText(turn)), "");
  }
  if (fallbackText) out.push("**Step Up:**", "", quote(fallbackText), "");

  const taps = turns.filter((t) => t.kind === "chips" && !t.typed);
  if (taps.length > 0) {
    out.push("## Chips tapped", "");
    for (const t of taps)
      if (t.kind === "chips") out.push(`- ${t.question}: ${t.chosen.join(", ")}`);
    out.push("");
  }

  if (verdict) {
    out.push("## What you confirmed", "");
    for (const line of directionLines(verdict.direction))
      out.push(`- ${line.label}: ${line.value}`);

    const v = verdictView(verdict);
    out.push("", "## Verdict", "");
    if (v.notYet) out.push(v.notYet, "");
    if (v.winner) out.push(`- Best next step: ${v.winner}`);
    if (v.runnerUp) out.push(`- Runner-up: ${v.runnerUp}`);
    if (v.tie) out.push(`- A tie between ${v.tie[0]} and ${v.tie[1]}`);
    if (v.decidingNeeds.length) out.push(`- Deciding needs: ${v.decidingNeeds.join(", ")}`);
    for (const t of v.tensions) out.push(`- You decided: ${t}`);
    if (v.notAnswered.length) out.push(`- Not answered: ${v.notAnswered.join(", ")}`);
    out.push("", "| Type | Score | Why |", "| --- | --- | --- |");
    for (const row of v.rows) {
      out.push(`| ${row.name} | ${row.score} | ${row.reasons.join(" ").replaceAll("|", "\\|")} |`);
    }
    out.push("");
  }
  return out.join("\n");
}
