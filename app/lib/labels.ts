import { CHIPS, type ChipField } from "@core/advisor/chips";
import type { Direction, STAGE_1_CHIP_FIELDS } from "@core/advisor/tools";
import type { Category, Format, PaymentOption } from "@core/schema/enums";
import type { Profile } from "@core/schema/profile";
import type { PendingConfirm } from "./chatTypes";

// Everything the card and the verdict show is a chip label from CHIPS or an engine value,
// never model text (except the goal, which is the user's own words).

export const CATEGORY_LABELS: Record<Category, string> = {
  mba: "Full-time MBA",
  emba: "Executive MBA",
  specialized_masters: "Specialized master's",
  executive: "Executive program",
  certificate: "Certificate",
  short_course: "Short course",
};

export const NOT_ANSWERED = "Not answered";

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export const FORMAT_LABELS: Record<Format, string> = {
  in_person: "In person",
  hybrid: "Blended",
  online: "Online",
};

export const PAYMENT_LABELS: Record<PaymentOption, string> = {
  installments: "Installments",
  employer_sponsorship: "Employer sponsorship",
  loans: "Loans",
  scholarships: "Scholarships",
  early_payment_discount: "Early payment discount",
};

export const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

// The label of the chip whose value this is. A value with no chip (the advisor may record a
// figure the user typed) shows through `fallback`, or as plain text.
export function chipLabel(
  field: ChipField,
  value: unknown,
  fallback: (value: unknown) => string = String,
): string {
  const chip = chipFor(field, value);
  if (chip !== null) return chip;
  if (field === "hoursPerWeek" && value && typeof value === "object") {
    const { min, max } = value as { min: number; max: number };
    return `${min} to ${max} hours`;
  }
  return fallback(value);
}

// The label of the chip whose value this is, or null when no chip has it.
export function chipFor(field: ChipField, value: unknown): string | null {
  const chips: readonly { label: string; value: unknown }[] = CHIPS[field];
  return chips.find((c) => same(c.value, value))?.label ?? null;
}

// Stage 1 field names, for "you chose not to answer" lines.
export const DIRECTION_FIELD_LABELS: Record<string, string> = {
  careerGoal: "Your goal",
  needs: "What's missing",
  peerPreference: "Classmates",
  maxProgramMonths: "Longest program",
  hoursPerWeek: "Hours a week",
  keepWorking: "Keep working",
  degreeRequired: "Degree",
};

// The label of each Stage 1 chip field, for the "question: answer" lines in the chat and the
// "What I've understood" panel. The goal's chips are its kind.
export const CHIP_FIELD_LABELS: Record<string, string> = {
  careerGoalKind: DIRECTION_FIELD_LABELS.careerGoal!,
  needs: DIRECTION_FIELD_LABELS.needs!,
  peerPreference: DIRECTION_FIELD_LABELS.peerPreference!,
  maxProgramMonths: DIRECTION_FIELD_LABELS.maxProgramMonths!,
  hoursPerWeek: DIRECTION_FIELD_LABELS.hoursPerWeek!,
  keepWorking: DIRECTION_FIELD_LABELS.keepWorking!,
  degreeRequired: DIRECTION_FIELD_LABELS.degreeRequired!,
} satisfies Record<(typeof STAGE_1_CHIP_FIELDS)[number], string>;

export type CardLine = { label: string; value: string };

// The "Here's what I understood" lines, shared by the card and the transcript.
export function directionLines(d: Direction): CardLine[] {
  const or = <T>(v: T | null, show: (v: T) => string) => (v === null ? NOT_ANSWERED : show(v));
  const lines: CardLine[] = [
    {
      label: DIRECTION_FIELD_LABELS.careerGoal!,
      value: or(d.careerGoal, (g) => {
        const kind = chipLabel("careerGoalKind", g.kind);
        return g.description.trim() ? `${kind}: "${g.description.trim()}"` : kind;
      }),
    },
    {
      label: "How clear the goal is",
      value: d.goalClarity === "clear" ? "Clear" : "Still taking shape",
    },
    {
      label: DIRECTION_FIELD_LABELS.needs!,
      value: or(d.needs, (n) =>
        n.map((need, i) => `${i + 1}. ${chipLabel("needs", need)}`).join(", "),
      ),
    },
    {
      label: DIRECTION_FIELD_LABELS.peerPreference!,
      value: or(d.peerPreference, (v) => chipLabel("peerPreference", v)),
    },
    {
      label: DIRECTION_FIELD_LABELS.maxProgramMonths!,
      value: or(d.maxProgramMonths, (v) => chipLabel("maxProgramMonths", v)),
    },
    {
      label: DIRECTION_FIELD_LABELS.hoursPerWeek!,
      value: or(d.hoursPerWeek, (v) => chipLabel("hoursPerWeek", v)),
    },
    {
      label: DIRECTION_FIELD_LABELS.keepWorking!,
      value: or(d.keepWorking, (v) => chipLabel("keepWorking", v)),
    },
    {
      label: DIRECTION_FIELD_LABELS.degreeRequired!,
      value: or(d.degreeRequired, (v) => chipLabel("degreeRequired", v)),
    },
  ];
  for (const t of d.resolvedTensions) lines.push({ label: "You decided", value: t.chosen });
  if (d.tieBreaker) {
    lines.push({ label: "If two types tie", value: CATEGORY_LABELS[d.tieBreaker] });
  }
  return lines;
}

// Stage 2 field names, for the search card and "you chose not to answer" lines.
export const SEARCH_FIELD_LABELS: Record<string, string> = {
  tuitionBudgetUsd: "Tuition budget",
  paymentPlan: "How you'd pay",
  travelBudgetUsd: "Travel budget",
  airfareRange: "Typical airfare",
  travelComfort: "Traveling for it",
  formatPreference: "Format",
  maxOnsiteDays: "On-site days a year",
  maxStretchDays: "Longest stretch away",
  homeCity: "Where you live",
  homeRegion: "Where you live",
  homeCountry: "Where you live",
  homeLat: "Where you live",
  homeLon: "Where you live",
  relocate: "Relocate",
  locationValues: "A location should give you",
  yearsExperience: "Experience",
  yearsLeading: "Years leading people",
  degree: "Highest degree",
  currentRole: "Current role",
};

// Any profile field's name, stage 1 or 2, without repeats (the home parts share one name).
export function fieldNames(fields: string[]): string[] {
  const names = fields.map((f) => DIRECTION_FIELD_LABELS[f] ?? SEARCH_FIELD_LABELS[f] ?? f);
  return [...new Set(names)];
}

const money = (v: unknown) => (typeof v === "number" ? usd(v) : String(v));
const days = (v: unknown) => `${String(v)} days`;
const years = (n: number) => `${n} ${n === 1 ? "year" : "years"}`;

// The search card's lines (stage 2 answers only; stage 1 is in the verdict), shared by the card
// and the transcript. Chip labels or the user's own figures; a declined field is "Not answered".
// The home coordinates are the model's estimate for the engine and are never shown. The profile's
// resolvedTensions holds the direction card's, then any resolved in stage 2 (docs/chat-api.md,
// "The search card"); only those not already on `direction`, the confirmed card, are listed.
export function searchLines(p: Profile, direction: Direction | null = null): CardLine[] {
  const declined = new Set(p.declined);
  const line = (field: string, value: () => string): CardLine => ({
    label: SEARCH_FIELD_LABELS[field]!,
    value: declined.has(field) ? NOT_ANSWERED : value(),
  });
  const home = [
    declined.has("homeCity") ? "" : p.homeCity,
    declined.has("homeRegion") ? "" : (p.homeRegion ?? ""),
    declined.has("homeCountry") ? "" : p.homeCountry,
  ].filter((part) => part.trim() !== "");
  const seen = new Set(direction?.resolvedTensions.map((t) => `${t.rule}\n${t.chosen}`));
  const tensions = p.resolvedTensions.filter((t) => !seen.has(`${t.rule}\n${t.chosen}`));
  const lines: CardLine[] = [
    line("tuitionBudgetUsd", () => chipLabel("tuitionBudgetUsd", p.tuitionBudgetUsd, money)),
    line("paymentPlan", () => chipLabel("paymentPlan", p.paymentPlan)),
    line("travelBudgetUsd", () => chipLabel("travelBudgetUsd", p.travelBudgetUsd, money)),
    line("airfareRange", () => chipLabel("airfareRange", p.airfareRange)),
    line("travelComfort", () => chipLabel("travelComfort", p.travelComfort)),
    line("formatPreference", () => chipLabel("formatPreference", p.formatPreference)),
    line("maxOnsiteDays", () => chipLabel("maxOnsiteDays", p.maxOnsiteDays, days)),
    line("maxStretchDays", () => chipLabel("maxStretchDays", p.maxStretchDays, days)),
    { label: SEARCH_FIELD_LABELS.homeCity!, value: home.length ? home.join(", ") : NOT_ANSWERED },
    line("relocate", () => chipLabel("relocate", p.relocate)),
    line("locationValues", () =>
      p.locationValues.length
        ? p.locationValues.map((v) => chipLabel("locationValues", v)).join(", ")
        : "Nothing in particular",
    ),
    line("yearsExperience", () => years(p.yearsExperience)),
    line("yearsLeading", () => years(p.yearsLeading)),
    line("degree", () => {
      const level = chipLabel("degreeLevel", p.degree.level);
      return p.degree.field.trim() ? `${level} in ${p.degree.field.trim()}` : level;
    }),
    line("currentRole", () => chipLabel("currentRole", p.currentRole)),
  ];
  for (const t of tensions) lines.push({ label: "You decided", value: t.chosen });
  return lines;
}

export const DIRECTION_CARD_HEADING = "Here's what I understood";
export const SEARCH_CARD_HEADING = "Here's what I'll search with";

// The pending card's heading and lines, by which tool it answers. `direction`: the confirmed
// stage 1 card, whose tensions the search card doesn't repeat.
export function confirmCard(
  confirm: PendingConfirm,
  direction: Direction | null = null,
): { heading: string; lines: CardLine[] } {
  return "profile" in confirm
    ? { heading: SEARCH_CARD_HEADING, lines: searchLines(confirm.profile, direction) }
    : { heading: DIRECTION_CARD_HEADING, lines: directionLines(confirm.direction) };
}
