import type { Program } from "@core/schema/program";
import type { Results, Verdict } from "./chatState";
import type { MessageParam } from "./chatTypes";
import { toTurns, turnText } from "./conversation";
import { directionLines, searchLines } from "./labels";
import {
  DRAFT_LABEL,
  dataLimits,
  isWebLink,
  programRecords,
  resultsView,
  type ProgramView,
} from "./programs";
import { verdictView } from "./verdict";

// The Download transcript file: every message, the chips tapped, the confirmed cards, the
// verdict and the programs, as Markdown. Built in the browser; nothing is sent to the server.

export type TranscriptInput = {
  history: MessageParam[];
  verdict: Verdict | null;
  results: Results | null;
  // The template explanation shown after a failed confirm (not in the history).
  fallbackText: string | null;
  date: Date;
  // The records the program cards were built from: loadPrograms() unless a test passes fixtures.
  programs?: Program[];
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

// Link text: brackets escaped, so a label can't close the link early.
const linkText = (text: string) => text.replace(/[[\]]/g, "\\$&");

function programMarkdown(p: ProgramView): string[] {
  const out = [`### ${p.name}`, "", p.institution];
  if (p.draft) out.push("", `**${DRAFT_LABEL}**`);
  out.push("", p.why, "", "Your limits:", "");
  for (const c of p.checks)
    out.push(`- ${c.statusText}: ${c.label}${c.detail ? `: ${c.detail}` : ""}`);
  out.push("", "The program:", "");
  for (const f of p.facts) out.push(`- ${f.label}: ${f.value}${f.note ? ` (${f.note})` : ""}`);
  out.push("", "How it serves what you need:", "");
  for (const line of p.fit) out.push(`- ${line}`);
  out.push("", `Confidence: ${p.confidence.level}. ${p.confidence.reasons.join(" ")}`.trim());
  if (p.checkedOn)
    out.push("", `${p.draft ? "Sources checked on" : "Verified on"} ${p.checkedOn}.`);
  out.push("", "Sources:", "");
  for (const s of p.sources) {
    const label = linkText(s.label);
    // Only web links become links, as on the card; any other scheme stays text, never a link.
    const where = s.url && isWebLink(s.url) ? `[${label}](<${s.url}>)` : label;
    out.push(`- ${where}, checked ${s.checkedOn}`);
  }
  out.push("");
  return out;
}

export function buildTranscript({
  history,
  verdict,
  results,
  fallbackText,
  date,
  programs = programRecords(),
}: TranscriptInput): string {
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
    out.push("", "| Type | Why |", "| --- | --- |");
    for (const row of v.rows) {
      const name = row.out ? `${row.name} (ruled out)` : row.name;
      out.push(`| ${name} | ${row.reasons.join(" ").replaceAll("|", "\\|")} |`);
    }
    out.push("");
  }

  if (results) {
    out.push("## What you confirmed for the search", "");
    for (const line of searchLines(results.profile, verdict?.direction))
      out.push(`- ${line.label}: ${line.value}`);

    const v = resultsView(results, programs, verdict);
    out.push("", "## Programs", "");
    if (v.notYet) out.push(v.notYet, "");
    if (v.access) out.push(v.access, "");
    if (v.ranked.length > 0 && v.category)
      out.push(`${v.category}: best fit for your needs first.`, "");
    for (const p of v.ranked) out.push(...programMarkdown(p));
    if (v.alsoWorthALook.length > 0) {
      out.push("## Also worth a look", "");
      for (const p of v.alsoWorthALook) out.push(...programMarkdown(p));
    }
    if (v.notAnswered.length) out.push(`Ranked without: ${v.notAnswered.join(", ")}`, "");
    out.push("## About this data", "", dataLimits(programs), "");
  }
  return out.join("\n");
}
