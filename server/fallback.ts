import type {
  Check,
  CheckId,
  DirectionResult,
  RankedProgram,
  SearchResult,
} from "../core/engine/types";
import { tuitionTotal } from "../core/engine/constraints";
import type { Category, Need } from "../core/schema/enums";
import type { Program } from "../core/schema/program";

// What the user reads when the model can't answer (docs/chat-api.md, "After a notice"). The
// verdict explanation is a template over the engine's result only, so a confirmed card still
// gets its verdict with the model down (DQ3). Labels are plain words, never model text.

export type NoticeKind =
  "retryable" | "auth_or_credit" | "refusal" | "unknown" | "empty_input" | "limit";

export const NOTICE_MESSAGES: Record<NoticeKind, string> = {
  retryable: "The advisor is busy right now. Your answers are safe; try again in a moment.",
  auth_or_credit:
    "The advisor isn't available right now, so the conversation can't continue. Any verdict already shown still stands, and you can download the transcript.",
  refusal: "The advisor couldn't answer that. Try saying it another way, or pick an option again.",
  unknown: "Something went wrong on our side. Your answers are safe; try again.",
  empty_input: "Type an answer first, or tap one of the options.",
  limit:
    "This conversation has reached its message limit. Your verdict and the transcript download still work.",
};

const CATEGORY: Record<Category, string> = {
  mba: "a full-time MBA",
  emba: "an executive MBA",
  specialized_masters: "a specialized master's",
  executive: "an executive program",
  certificate: "a graduate certificate",
  short_course: "a short course",
};

const NEED: Record<Need, string> = {
  leadership_skills: "leadership skills",
  deep_expertise: "deep expertise in a field",
  graduate_degree: "a graduate degree",
  senior_network: "a senior network",
  new_industry_or_city: "access to a new industry or city",
};

const CLOSING = "Want to see programs that fit?";

const list = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;

export function fallbackExplanation(result: DirectionResult): string {
  const { category, noProgram, profileGaps } = result;
  const lines: string[] = [];
  if (noProgram.triggered) {
    lines.push(
      noProgram.trigger === "goal_unclear"
        ? "My verdict: no program yet. The goal, or what you want the step to give you, isn't clear enough to choose a program for."
        : "My verdict: no program yet. None of the types of program fits what you need well enough.",
    );
  } else if (category.winner) {
    lines.push(`My verdict: ${CATEGORY[category.winner]}.`);
    if (category.decidingNeeds.length) {
      lines.push(`It fits best on ${list(category.decidingNeeds.map((n) => NEED[n]))}.`);
    }
    if (category.runnerUp) lines.push(`The runner-up is ${CATEGORY[category.runnerUp]}.`);
  } else if (category.tie) {
    lines.push(`It's a tie between ${CATEGORY[category.tie[0]]} and ${CATEGORY[category.tie[1]]}.`);
  }
  const out = (Object.keys(category.scores) as Category[]).filter(
    (c) => category.scores[c] === "out",
  );
  for (const c of out) {
    // Only the reason that rules it out, not how it fits the needs: "(you need a degree and …)".
    const reasons = category.reasons[c]
      .filter((r) => r.startsWith("Out: "))
      .map((r) => r.slice("Out: ".length).replace(/\.$/, ""));
    lines.push(`Ruled out: ${CATEGORY[c]}${reasons.length ? ` (${reasons.join("; ")})` : ""}.`);
  }
  if (profileGaps.length) {
    lines.push(
      `Answers you chose not to give, so the verdict leaves them out: ${list(fieldWords(profileGaps))}.`,
    );
  }
  lines.push(
    "The advisor can't add its explanation right now; the verdict above comes from the scoring engine.",
  );
  lines.push(CLOSING);
  return lines.join("\n\n");
}

const PROGRAMS_OF: Record<Category, string> = {
  mba: "full-time MBA programs",
  emba: "executive MBA programs",
  specialized_masters: "specialized master's programs",
  executive: "executive programs",
  certificate: "graduate certificates",
  short_course: "short courses",
};

const CHECK: Record<CheckId, string> = {
  tuition: "tuition",
  travelBudget: "the travel budget",
  onsiteDays: "days on site",
  longestStretch: "the longest stretch away",
  length: "program length",
  hours: "hours per week",
  workCompatible: "keeping your job",
  location: "location",
};

// "It's slightly over …": a near miss on a figure the school publishes.
const OVER: Record<CheckId, string> = {
  tuition: "your tuition budget",
  travelBudget: "your travel budget",
  onsiteDays: "the days on site you can give",
  longestStretch: "the longest stretch you can be away",
  length: "the longest program you'd take on",
  hours: "the hours a week you have",
  workCompatible: "keeping your job",
  location: "where you can study",
};

// "The school doesn't publish …": a near miss under the unknown-value rule.
const UNPUBLISHED: Record<CheckId, string> = {
  tuition: "its tuition",
  travelBudget: "the figures a travel estimate needs",
  onsiteDays: "its days on site",
  longestStretch: "its longest stretch on site",
  length: "its length",
  hours: "its weekly hours",
  workCompatible: "whether it fits around a job",
  location: "where its campus is",
};

// A near miss because a figure can't be compared as published, or the user's own answer is
// missing: the program isn't over anything.
const UNCHECKED: Partial<Record<CheckId, (check: Check, record: Program | undefined) => string>> = {
  // checkTuition: a per-course price is published but the total isn't, and the engine decides
  // on the total (core/engine/constraints.ts).
  tuition: (check, record) => {
    const total = record ? tuitionTotal(record) : null;
    return total?.estimated && record?.courseCount
      ? `it's priced per course, about $${total.usd.toLocaleString("en-US")} for ${record.courseCount} ${record.courseCount === 1 ? "course" : "courses"} (an estimate), so its total tuition isn't published`
      : `its tuition can't be compared with your budget${check.note ? ` (${check.note})` : ""}`;
  },
  travelBudget: () => "the travel estimate covers lodging only, because the airfare isn't known",
  location: () =>
    "without where you live, it can't tell whether the campus is within commuting distance",
};

// A published figure past the user's limit. Anything else that is a near miss but not
// `unknown` is a figure the engine can't compare (a per-course price, no published total) or
// the user's own missing answer (a lodging-only travel total under the budget, no home).
function isOver(c: Check): boolean {
  if (c.unknown || c.value === null || c.id === "location") return false;
  if (c.id === "travelBudget" && typeof c.value === "number" && typeof c.limit === "number") {
    return c.value > c.limit;
  }
  return true;
}

// Why a listed program is a near miss, from its checks (core/engine/constraints.ts): over a
// published figure, a figure the school doesn't publish, or one that can't be compared. Never
// "over your limit" for a figure that isn't past it.
function nearMissNote(checks: Check[], record: Program | undefined): string {
  const near = checks.filter((c) => c.status === "near_miss");
  const over = near.filter(isOver);
  const unpublished = near.filter((c) => c.unknown);
  const unchecked = near.filter((c) => !c.unknown && !isOver(c));
  const parts: string[] = [];
  if (over.length) parts.push(`Close: it's slightly over ${list(over.map((c) => OVER[c.id]))}.`);
  if (unpublished.length) {
    parts.push(
      `The school doesn't publish ${list(unpublished.map((c) => UNPUBLISHED[c.id]))}, so that can't be checked against your answers.`,
    );
  }
  for (const c of unchecked) {
    const why = UNCHECKED[c.id]?.(c, record) ?? `${CHECK[c.id]} can't be fully checked`;
    parts.push(`Not fully checked: ${why}.`);
  }
  return parts.join(" ");
}

// Plain words for the profile fields a card can leave out. The five home fields read as one.
const FIELD: Record<string, string> = {
  careerGoal: "your goal",
  needs: "what's missing today",
  peerPreference: "who you want as classmates",
  maxProgramMonths: "the longest program you'd take on",
  hoursPerWeek: "hours a week",
  keepWorking: "whether you keep working",
  degreeRequired: "whether you need a degree",
  tuitionBudgetUsd: "your tuition budget",
  paymentPlan: "how you'd pay",
  travelBudgetUsd: "your travel budget",
  airfareRange: "the airfare from home",
  travelComfort: "how you feel about travel",
  formatPreference: "how you'd like to study",
  maxOnsiteDays: "days on site",
  maxStretchDays: "the longest stretch away",
  homeCity: "where you live",
  homeRegion: "where you live",
  homeCountry: "where you live",
  homeLat: "where you live",
  homeLon: "where you live",
  relocate: "whether you'd relocate",
  locationValues: "what a location should give you",
  yearsExperience: "years of experience",
  yearsLeading: "years leading people",
  degree: "your degree",
  currentRole: "your current role",
};

const fieldWords = (fields: readonly string[]) => [...new Set(fields.map((f) => FIELD[f] ?? f))];

// The stage 2 template: the engine's ranked list with program names from the records, for when
// the model fails after the user confirms the stage 2 card. Never model text. `declined` is the
// searched profile's: the engine also lists an unknown airfare in profileGaps, which the user
// may have tapped ("I don't know") rather than declined.
export function fallbackSearchExplanation(
  result: SearchResult,
  programs: Program[],
  declined: readonly string[],
): string {
  const records = new Map(programs.map((p) => [p.id, p]));
  const evaluations = new Map(result.programs.map((e) => [e.id, e]));
  const line = ({ id, why }: RankedProgram) => {
    const record = records.get(id);
    const name = record ? `${record.name} (${record.institution})` : id;
    const e = evaluations.get(id);
    const near = e?.status === "near_miss" ? nearMissNote(e.checks, record) : "";
    return `- ${name}: ${why}${near ? ` ${near}` : ""}`;
  };
  const { access, ranking, noProgram, profileGaps } = result;
  const lines: string[] = [];
  const alternative = access.alternative
    ? ` The closest type with one is ${CATEGORY[access.alternative]}.`
    : "";
  if (access.status === "no_winner") {
    lines.push("There's no single type of program to search yet, so there's no list.");
  } else if (access.category && access.status === "no_programs") {
    lines.push(`There are no ${PROGRAMS_OF[access.category]} in the data yet.${alternative}`);
  } else if (access.category && access.status === "none_within_limits") {
    const blocked = access.blockedBy.length
      ? ` (mostly ${list(access.blockedBy.map((c) => CHECK[c]))})`
      : "";
    lines.push(
      `None of the ${PROGRAMS_OF[access.category]} in the data fits all your limits${blocked}.${alternative} Your verdict stands.`,
    );
  }
  if (noProgram.triggered) {
    lines.push("Nothing in the data fits within all your limits yet.");
  }
  if (ranking.ranked.length) {
    lines.push(["Programs that fit, best first:", ...ranking.ranked.map(line)].join("\n"));
  }
  if (ranking.alsoWorthALook.length) {
    lines.push(["Also worth a look:", ...ranking.alsoWorthALook.map(line)].join("\n"));
  }
  const left = profileGaps.filter((f) => declined.includes(f));
  if (left.length) {
    lines.push(
      `Answers you chose not to give, so the list leaves them out: ${list(fieldWords(left))}.`,
    );
  }
  if (profileGaps.includes("airfareRange") && !declined.includes("airfareRange")) {
    lines.push(
      "The airfare from where you live isn't known, so travel estimates cover lodging only.",
    );
  }
  lines.push(
    "The advisor can't add its explanation right now; the list above comes from the scoring engine and the program records.",
  );
  return lines.join("\n\n");
}
