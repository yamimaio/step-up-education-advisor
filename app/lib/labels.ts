import { CHIPS, type ChipField } from "@core/advisor/chips";
import type { Direction, STAGE_1_CHIP_FIELDS } from "@core/advisor/tools";
import type { Category } from "@core/schema/enums";

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

// The label of the chip whose value this is; a value with no chip shows as plain text.
export function chipLabel(field: ChipField, value: unknown): string {
  const chips: readonly { label: string; value: unknown }[] = CHIPS[field];
  const chip = chips.find((c) => same(c.value, value));
  if (chip) return chip.label;
  if (field === "hoursPerWeek" && value && typeof value === "object") {
    const { min, max } = value as { min: number; max: number };
    return `${min} to ${max} hours`;
  }
  return String(value);
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
