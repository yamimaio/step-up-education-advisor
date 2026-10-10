import { z } from "zod";
import { PartialProfileSchema, ProfileSchema, type Profile } from "../schema/profile";
import type { ChipField } from "./chips";

// The advisor's tools for the two-stage flow (docs/ux-two-stage.md). The server (step 6) sends
// every tool to the model, in this order, and turns each input schema into a strict JSON schema.
// advisor.md names exactly these tools; a test keeps the two in step. Descriptions are frozen
// strings (cached prefix).

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

// The chip sets of the stage 2 checklist entries. The server shows them only once a direction
// is confirmed.
export const STAGE_2_CHIP_FIELDS = [
  "tuitionBudgetUsd",
  "paymentPlan",
  "travelBudgetUsd",
  "travelComfort",
  "formatPreference",
  "maxOnsiteDays",
  "maxStretchDays",
  "relocate",
  "airfareRange",
  "locationValues",
  "degreeLevel",
  "currentRole",
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

type Declinable = (typeof DIRECTION_DECLINABLE)[number];

// A declined field holds null and is named in `declined`; null without `declined` is an error,
// as is a value that is declined. So the model never invents an answer the user didn't give.
function checkDeclined(
  d: Partial<Record<Declinable, unknown>> & { declined?: readonly string[] },
  ctx: z.RefinementCtx,
) {
  for (const field of DIRECTION_DECLINABLE) {
    const declined = d.declined?.includes(field) ?? false;
    if (declined && d[field] !== null) {
      ctx.addIssue({ code: "custom", path: [field], message: "declined, so must be null" });
    } else if (!declined && d[field] === null) {
      ctx.addIssue({
        code: "custom",
        path: [field],
        message: "null: ask again, or name it in declined",
      });
    }
  }
}

// What stage 1 confirms: the answers that decide the category (the engine's DirectionProfile),
// plus classmates, which the card shows and stage 2 scoring uses, and the tensions the user
// resolved. Each field reuses its ProfileSchema rule, so stage 2 can extend it unchanged.
export const DirectionSchema = z
  .strictObject({
    careerGoal: full.careerGoal.nullable(),
    goalClarity: full.goalClarity,
    needs: full.needs.nullable(),
    peerPreference: full.peerPreference.nullable(),
    maxProgramMonths: full.maxProgramMonths.nullable(),
    hoursPerWeek: full.hoursPerWeek.nullable(),
    keepWorking: full.keepWorking.nullable(),
    degreeRequired: full.degreeRequired.nullable(),
    resolvedTensions: full.resolvedTensions,
    tieBreaker: full.tieBreaker,
    declined: z.array(z.enum(DIRECTION_DECLINABLE)),
  })
  .superRefine(checkDeclined);
export type Direction = z.infer<typeof DirectionSchema>;

// The values the engine's stage 1 input needs in a declined field. recommendCategory ignores
// them (applyDirectionDefaults), so they never reach the verdict or the card. Declined needs
// become [] there, so stage 1 says "not yet" (goal_unclear); advisor.md warns before that decline.
export const DECLINED_PLACEHOLDERS = {
  careerGoal: { kind: "step_up", description: "" },
  needs: ["leadership_skills", "deep_expertise", "graduate_degree"],
  peerPreference: "doesnt_matter",
  maxProgramMonths: 0,
  hoursPerWeek: { min: 0, max: 0 },
  keepWorking: false,
  degreeRequired: "unsure",
} as const satisfies { [K in Declinable]: NonNullable<Direction[K]> };

// The engine's stage 1 input (DirectionProfile, PR #22) from a confirmed direction: declined
// fields get their placeholder, and the two fields the engine doesn't take are dropped.
export function toEngineDirection(d: Direction) {
  const p = DECLINED_PLACEHOLDERS;
  return {
    careerGoal: d.careerGoal ?? { ...p.careerGoal },
    goalClarity: d.goalClarity,
    needs: d.needs ?? [...p.needs],
    degreeRequired: d.degreeRequired ?? p.degreeRequired,
    maxProgramMonths: d.maxProgramMonths ?? p.maxProgramMonths,
    hoursPerWeek: d.hoursPerWeek ?? { ...p.hoursPerWeek },
    keepWorking: d.keepWorking ?? p.keepWorking,
    ...(d.tieBreaker ? { tieBreaker: d.tieBreaker } : {}),
    declined: [...d.declined],
  };
}

// The profile stage 2 runs on (evaluatePrograms): the stage 1 answers from the confirmed
// direction, never from the propose_search card, and the stage 2 answers from the card. A
// declined stage 1 field gets its placeholder and stays named in `declined`, so the engine
// ignores it. Tensions resolved on either card are kept, the direction's first.
export function toEngineProfile(direction: Direction, profile: Profile): Profile {
  const { declined, tieBreaker, ...stage1 } = toEngineDirection(direction);
  const rules = new Set(direction.resolvedTensions.map((t) => t.rule));
  // The tie-breaker belongs to stage 1: only the direction's counts.
  const stage2: Profile = { ...profile };
  delete stage2.tieBreaker;
  return {
    ...stage2,
    ...stage1,
    peerPreference: direction.peerPreference ?? DECLINED_PLACEHOLDERS.peerPreference,
    resolvedTensions: [
      ...direction.resolvedTensions,
      ...profile.resolvedTensions.filter((t) => !rules.has(t.rule)),
    ],
    ...(tieBreaker ? { tieBreaker } : {}),
    declined: [...new Set([...declined, ...profile.declined])],
  };
}

// The stage 2 fields the contradiction rules read (R1, R2, R3, R5, R6). check_contradictions
// takes only these on top of the stage 1 answers: the API caps optional parameters across the
// strict tool schemas of a request at 24 (decisions.md, Step 6).
export const TENSION_FIELDS_STAGE_2 = [
  "tuitionBudgetUsd",
  "travelComfort",
  "maxOnsiteDays",
  "maxStretchDays",
  "relocate",
  "locationValues",
] as const;

// The answers so far: every field optional, and needs may still be short. Stage 1 sends the
// stage 1 answers; stage 2 adds the stage 2 answers the rules read.
export const DirectionDraftSchema = z.strictObject({
  careerGoal: partial.careerGoal,
  goalClarity: partial.goalClarity,
  needs: partial.needs,
  peerPreference: partial.peerPreference,
  maxProgramMonths: partial.maxProgramMonths,
  hoursPerWeek: partial.hoursPerWeek,
  keepWorking: partial.keepWorking,
  degreeRequired: partial.degreeRequired,
  tuitionBudgetUsd: partial.tuitionBudgetUsd,
  travelComfort: partial.travelComfort,
  maxOnsiteDays: partial.maxOnsiteDays,
  maxStretchDays: partial.maxStretchDays,
  relocate: partial.relocate,
  locationValues: partial.locationValues,
  resolvedTensions: partial.resolvedTensions,
  declined: z.array(z.enum([...DIRECTION_DECLINABLE, ...TENSION_FIELDS_STAGE_2])).optional(),
});
export type DirectionDraft = z.infer<typeof DirectionDraftSchema>;

export const ASK_CHOICE_FIELDS = [...STAGE_1_CHIP_FIELDS, ...STAGE_2_CHIP_FIELDS] as const;

export const AskChoiceInput = z.strictObject({
  field: z.enum(ASK_CHOICE_FIELDS),
  // The question in the advisor's words, shown above the chips.
  question: z.string().min(1),
});

export const CheckContradictionsInput = z.strictObject({ profile: DirectionDraftSchema });

export const ProposeDirectionInput = z.strictObject({ direction: DirectionSchema });

// The stage 2 card: the full profile. Its stage 1 answers must equal the confirmed direction;
// the server checks that and runs the engine on toEngineProfile.
export const ProposeSearchInput = z.strictObject({ profile: ProfileSchema });

type ToolSpec = {
  stage: 1 | 2;
  // True when the server stops and waits for the user (a chip tap or the confirm card).
  pauses: boolean;
  description: string;
  input: z.ZodType;
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
      "Send the answers so far: the stage 1 answers, and in stage 2 the stage 2 answers it takes too. Returns the tensions that fire, each with an id, a plain sentence and whether the user already resolved it.",
    input: CheckContradictionsInput,
  },
  propose_direction: {
    stage: 1,
    pauses: true,
    description:
      "Show the stage 1 confirm card. If the user confirms, the result holds the category verdict; otherwise it holds their corrections.",
    input: ProposeDirectionInput,
  },
  propose_search: {
    stage: 2,
    pauses: true,
    description:
      "Show the stage 2 confirm card with the full profile. If the user confirms, the result holds the ranked programs; otherwise it holds their corrections.",
    input: ProposeSearchInput,
  },
} as const satisfies Record<string, ToolSpec>;

export type AdvisorToolName = keyof typeof ADVISOR_TOOLS;
// Every tool, in a fixed order: the server sends them all on every request (cached prefix).
export const ADVISOR_TOOL_NAMES = Object.keys(ADVISOR_TOOLS) as AdvisorToolName[];
