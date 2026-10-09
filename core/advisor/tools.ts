import { z } from "zod";
import { PartialProfileSchema, ProfileSchema } from "../schema/profile";
import type { ChipField } from "./chips";

// The advisor's tools for the two-stage flow (docs/ux-two-stage.md). Stage 1 is wired: the
// server (step 6) sends only STAGE_1_TOOL_NAMES to the model and turns each input schema into a
// strict JSON schema. propose_search is a stub until stage 2 is wired. advisor.md names exactly
// these tools; a test keeps the two in step. Descriptions are frozen strings (cached prefix).

const full = ProfileSchema.shape;
const partial = PartialProfileSchema.shape;

// The chip sets stage 1 may show: the chips of the stage 1 checklist entries.
export const STAGE_1_CHIP_FIELDS = [
  "careerGoalKind",
  "needs",
  "peerPreference",
  "maxProgramMonths",
  "hoursPerWeek",
  "keepWorking",
  "degreeRequired",
] as const satisfies readonly ChipField[];

// Stage 1 fields the user may decline. goalClarity is the advisor's call, never declined.
export const DIRECTION_DECLINABLE = [
  "careerGoal",
  "needs",
  "peerPreference",
  "maxProgramMonths",
  "hoursPerWeek",
  "keepWorking",
  "degreeRequired",
] as const;

// What stage 1 confirms: the answers that decide the category (the engine's DirectionProfile),
// plus classmates, which the card shows and stage 2 scoring uses, and the tensions the user
// resolved. Each field reuses its ProfileSchema rule, so stage 2 can extend it unchanged.
export const DirectionSchema = z.strictObject({
  careerGoal: full.careerGoal,
  goalClarity: full.goalClarity,
  needs: full.needs,
  peerPreference: full.peerPreference,
  maxProgramMonths: full.maxProgramMonths,
  hoursPerWeek: full.hoursPerWeek,
  keepWorking: full.keepWorking,
  degreeRequired: full.degreeRequired,
  resolvedTensions: full.resolvedTensions,
  tieBreaker: full.tieBreaker,
  declined: z.array(z.enum(DIRECTION_DECLINABLE)),
});
export type Direction = z.infer<typeof DirectionSchema>;

// The stage 1 answers so far: every field optional, and needs may still be short.
export const DirectionDraftSchema = z.strictObject({
  careerGoal: partial.careerGoal,
  goalClarity: partial.goalClarity,
  needs: partial.needs,
  peerPreference: partial.peerPreference,
  maxProgramMonths: partial.maxProgramMonths,
  hoursPerWeek: partial.hoursPerWeek,
  keepWorking: partial.keepWorking,
  degreeRequired: partial.degreeRequired,
  resolvedTensions: partial.resolvedTensions,
  declined: z.array(z.enum(DIRECTION_DECLINABLE)).optional(),
});
export type DirectionDraft = z.infer<typeof DirectionDraftSchema>;

export const AskChoiceInput = z.strictObject({
  field: z.enum(STAGE_1_CHIP_FIELDS),
  // The question in the advisor's words, shown above the chips.
  question: z.string().min(1),
});

export const CheckContradictionsInput = z.strictObject({ profile: DirectionDraftSchema });

export const ProposeDirectionInput = z.strictObject({ direction: DirectionSchema });

type ToolSpec = {
  stage: 1 | 2;
  // True when the server stops and waits for the user (a chip tap or the confirm card).
  pauses: boolean;
  description: string;
  // null: not wired yet, so the tool is never sent to the model.
  input: z.ZodType | null;
};

export const ADVISOR_TOOLS = {
  ask_choice: {
    stage: 1,
    pauses: true,
    description:
      "Show quick-reply chips for one profile field. The chip options come from the system; do not list them. The user's choice comes back as the result.",
    input: AskChoiceInput,
  },
  check_contradictions: {
    stage: 1,
    pauses: false,
    description:
      "Send the stage 1 answers so far. Returns the tensions that fire, each with an id, a plain sentence and whether the user already resolved it.",
    input: CheckContradictionsInput,
  },
  propose_direction: {
    stage: 1,
    pauses: true,
    description:
      "Show the stage 1 confirm card. If the user confirms, the result holds the category verdict; otherwise it holds their corrections.",
    input: ProposeDirectionInput,
  },
  // Stage 2, not wired yet: its input (the stage 2 answers) lands with the stage 2 server work.
  propose_search: {
    stage: 2,
    pauses: true,
    description:
      "Show the stage 2 confirm card. If the user confirms, the result holds the ranked programs.",
    input: null,
  },
} as const satisfies Record<string, ToolSpec>;

export type AdvisorToolName = keyof typeof ADVISOR_TOOLS;
export const ADVISOR_TOOL_NAMES = Object.keys(ADVISOR_TOOLS) as AdvisorToolName[];
// The tools the server sends to the model today. Listed, not filtered, so their inputs type as
// zod schemas (never null); a test checks the list against `stage`.
export const STAGE_1_TOOL_NAMES = [
  "ask_choice",
  "check_contradictions",
  "propose_direction",
] as const satisfies readonly AdvisorToolName[];
