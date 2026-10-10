import { z } from "zod";
import { ProfileSchema, type Profile } from "../schema/profile";
import { CHIP_TARGET, type ChipField } from "./chips";

// The advisor's tools for the two-stage flow (docs/ux-two-stage.md). The server (step 6) sends
// every tool to the model, in this order, and turns each input schema into a strict JSON schema.
// advisor.md names exactly these tools; a test keeps the two in step. Descriptions are frozen
// strings (cached prefix).

const full = ProfileSchema.shape;

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

// The stage 1 fields: the engine always takes them from the confirmed direction.
type Stage1Field =
  | "careerGoal"
  | "goalClarity"
  | "needs"
  | "peerPreference"
  | "maxProgramMonths"
  | "hoursPerWeek"
  | "keepWorking"
  | "degreeRequired"
  | "tieBreaker";
export type SearchPart = Omit<Profile, Stage1Field>;

// The profile stage 2 runs on (evaluatePrograms): the stage 1 answers from the confirmed
// direction and the stage 2 answers from the search card. A declined stage 1 field gets its
// placeholder and stays named in `declined`, so the engine ignores it. Tensions resolved on
// either card are kept, the direction's first.
export function toEngineProfile(direction: Direction, search: SearchPart): Profile {
  const { declined, tieBreaker, ...stage1 } = toEngineDirection(direction);
  const rules = new Set(direction.resolvedTensions.map((t) => t.rule));
  // The tie-breaker belongs to stage 1: only the direction's counts, even if a whole profile
  // is passed in.
  const stage2: SearchPart & Pick<Partial<Profile>, "tieBreaker"> = { ...search };
  delete stage2.tieBreaker;
  return {
    ...stage2,
    ...stage1,
    peerPreference: direction.peerPreference ?? DECLINED_PLACEHOLDERS.peerPreference,
    resolvedTensions: [
      ...direction.resolvedTensions,
      ...search.resolvedTensions.filter((t) => !rules.has(t.rule)),
    ],
    ...(tieBreaker ? { tieBreaker } : {}),
    declined: [...new Set([...declined, ...search.declined])],
  };
}

// The contradiction rules' ids (core/engine/contradictions.ts).
const RuleId = z.enum(["R1", "R2", "R3", "R4", "R5", "R6"]);

// A tension the user resolved, in their words: which side they chose.
const ResolvedTension = z.strictObject({ rule: RuleId, chosen: z.string() });

// The profile fields the contradiction rules read. Every one is a chip field, so the server
// reads them from the user's taps (server/handlers.ts); the model never sends them. A test keeps
// this list in step with the rules.
export const TENSION_FIELDS = [
  "needs",
  "hoursPerWeek",
  "degreeRequired",
  "tuitionBudgetUsd",
  "travelComfort",
  "maxOnsiteDays",
  "maxStretchDays",
  "relocate",
  "locationValues",
] as const satisfies readonly ChipField[];

// The stage 2 profile fields the user may decline (the stage 2 checklist).
export const SEARCH_DECLINABLE = [
  "tuitionBudgetUsd",
  "paymentPlan",
  "travelBudgetUsd",
  "travelComfort",
  "formatPreference",
  "maxOnsiteDays",
  "maxStretchDays",
  "homeCity",
  "homeRegion",
  "homeCountry",
  "homeLat",
  "homeLon",
  "relocate",
  "airfareRange",
  "locationValues",
  "yearsExperience",
  "degree",
  "currentRole",
  "yearsLeading",
] as const;

// What a declined stage 2 chip field holds: a neutral value the engine ignores (normalize.ts).
export const STAGE_2_PLACEHOLDERS = {
  tuitionBudgetUsd: null,
  paymentPlan: "no_preference",
  travelBudgetUsd: null,
  travelComfort: "fine",
  formatPreference: "no_preference",
  maxOnsiteDays: 0,
  maxStretchDays: 0,
  relocate: false,
  airfareRange: "unknown",
  locationValues: [],
  degreeLevel: "other",
  currentRole: "other",
} as const satisfies Record<(typeof STAGE_2_CHIP_FIELDS)[number], unknown>;

// The stage 2 answers that have no chips, which only the model can fill in: where the user
// lives (turned into an ISO code and coordinates), years of experience and leading, and the
// degree's field. Every chip answer comes from the user's taps instead. Every field is required
// and few are nullable: the API compiles strict schemas into a grammar and refuses one that's
// too large (decisions.md, "The real API refused the stage 2 schemas").
export const SearchAnswersSchema = z.strictObject({
  // "" when declined; ProfileSchema checks the rest once the profile is built.
  homeCity: z.string(),
  homeRegion: z.string().nullable(),
  homeCountry: z.string(),
  homeLat: z.number().nullable(),
  homeLon: z.number().nullable(),
  yearsExperience: z.number(),
  yearsLeading: z.number(),
  degreeField: z.string(),
  resolvedTensions: z.array(ResolvedTension),
  declined: z.array(z.enum(SEARCH_DECLINABLE)),
});
export type SearchAnswers = z.infer<typeof SearchAnswersSchema>;

// The stage 2 profile from the search card and the user's latest taps (values by chip field):
// a chip field the user declined gets its placeholder, even after a tap; one neither tapped
// nor declined is listed in `missing`, and the server asks the advisor to ask for it.
export function searchProfile(
  direction: Direction,
  answers: SearchAnswers,
  taps: ReadonlyMap<string, unknown>,
): { profile: Profile; missing: (typeof STAGE_2_CHIP_FIELDS)[number][] } {
  const declined = new Set<string>(answers.declined);
  const missing: (typeof STAGE_2_CHIP_FIELDS)[number][] = [];
  const chip = <F extends (typeof STAGE_2_CHIP_FIELDS)[number]>(field: F) => {
    if (declined.has(CHIP_TARGET[field].split(".")[0]!)) return STAGE_2_PLACEHOLDERS[field];
    if (taps.has(field)) return taps.get(field) as never;
    missing.push(field);
    return STAGE_2_PLACEHOLDERS[field];
  };
  const search = {
    tuitionBudgetUsd: chip("tuitionBudgetUsd"),
    paymentPlan: chip("paymentPlan"),
    travelBudgetUsd: chip("travelBudgetUsd"),
    travelComfort: chip("travelComfort"),
    formatPreference: chip("formatPreference"),
    maxOnsiteDays: chip("maxOnsiteDays"),
    maxStretchDays: chip("maxStretchDays"),
    relocate: chip("relocate"),
    airfareRange: chip("airfareRange"),
    locationValues: [...chip("locationValues")],
    degree: { level: chip("degreeLevel"), field: answers.degreeField },
    currentRole: chip("currentRole"),
    homeCity: answers.homeCity,
    homeRegion: answers.homeRegion,
    homeCountry: answers.homeCountry,
    homeLat: answers.homeLat,
    homeLon: answers.homeLon,
    yearsExperience: answers.yearsExperience,
    yearsLeading: answers.yearsLeading,
    resolvedTensions: answers.resolvedTensions,
    declined: [...answers.declined],
  } as SearchPart;
  return { profile: toEngineProfile(direction, search), missing };
}

export const ASK_CHOICE_FIELDS = [...STAGE_1_CHIP_FIELDS, ...STAGE_2_CHIP_FIELDS] as const;

export const AskChoiceInput = z.strictObject({
  field: z.enum(ASK_CHOICE_FIELDS),
  // The question in the advisor's words, shown above the chips.
  question: z.string().min(1),
});

// The rules run on the user's taps; the model sends only what it learned in conversation: the
// tensions the user resolved, and the rule fields the user declined.
export const CheckContradictionsInput = z.strictObject({
  resolvedTensions: z.array(ResolvedTension),
  declined: z.array(z.enum(TENSION_FIELDS)),
});

export const ProposeDirectionInput = z.strictObject({ direction: DirectionSchema });

// The stage 2 card: the answers only the model knows. The server builds the profile with
// searchProfile and checks it before the card shows.
export const ProposeSearchInput = z.strictObject({ search: SearchAnswersSchema });

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
      "Run the contradiction rules on the user's chip answers, which the system reads from their taps. Send the tensions the user resolved and the rule fields they declined. Returns the tensions that fire, each with an id, a plain sentence and whether the user already resolved it.",
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
      "Show the stage 2 confirm card. Send the answers that have no chips (where the user lives, years of experience and leading, the degree's field), the tensions resolved and the fields declined; the chip answers come from the taps. If the user confirms, the result holds the ranked programs; otherwise it holds their corrections.",
    input: ProposeSearchInput,
  },
} as const satisfies Record<string, ToolSpec>;

export type AdvisorToolName = keyof typeof ADVISOR_TOOLS;
// Every tool, in a fixed order: the server sends them all on every request (cached prefix).
export const ADVISOR_TOOL_NAMES = Object.keys(ADVISOR_TOOLS) as AdvisorToolName[];
