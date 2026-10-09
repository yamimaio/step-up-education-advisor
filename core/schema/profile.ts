import { z } from "zod";
import { CountryCode, HoursRange, Latitude, Longitude, Text } from "./common";
import { Category, LocationValue, Need } from "./enums";

const AirfareRange = z.enum(["under_500", "500_1000", "1000_1500", "over_1500", "unknown"]);

const ProfileObject = z.strictObject({
  yearsExperience: z.number().nonnegative(),
  yearsLeading: z.number().nonnegative(),
  degree: z.strictObject({
    level: z.enum(["bachelor", "master", "doctorate", "other"]),
    field: z.string(),
  }),
  currentRole: z.enum(["ic", "manager", "director", "executive", "other"]),
  careerGoal: z.strictObject({
    kind: z.enum(["step_up", "grow_in_role"]),
    description: z.string(),
  }),
  goalClarity: z.enum(["clear", "unclear"]),
  // Exactly three, most important first.
  needs: z
    .array(Need)
    .length(3)
    .refine((a) => new Set(a).size === a.length, "must not repeat a need"),
  peerPreference: z.enum(["more_senior", "same_level", "doesnt_matter"]),
  degreeRequired: z.enum(["required", "preferred", "no", "unsure"]),
  tuitionBudgetUsd: z.number().nonnegative().nullable(),
  paymentPlan: z.enum(["savings", "installments", "employer", "loans", "mixed", "no_preference"]),
  travelBudgetUsd: z.number().nonnegative().nullable(),
  airfareRange: AirfareRange,
  travelComfort: z.enum(["appeal", "fine", "burden"]),
  // Stage 2: how the user would like to study. A program's `hybrid` format counts as blended.
  formatPreference: z.enum(["online", "blended", "in_person", "no_preference"]),
  hoursPerWeek: HoursRange,
  maxProgramMonths: z.number().nonnegative(),
  keepWorking: z.boolean(),
  maxOnsiteDays: z.number().nonnegative(),
  maxStretchDays: z.number().nonnegative(),
  // "" is the placeholder for a declined city or country, null for region, lat and lon; checkDeclinedHome pairs it with `declined`.
  homeCity: Text.or(z.literal("")),
  // null when the country has no state or province and the user said so, or when declined.
  homeRegion: Text.nullable(),
  homeCountry: CountryCode.or(z.literal("")),
  // Approximate centre of the home city, filled by the model; null when the home is declined.
  homeLat: Latitude.nullable(),
  homeLon: Longitude.nullable(),
  relocate: z.boolean(),
  locationValues: z
    .array(LocationValue)
    .max(2)
    .refine((a) => new Set(a).size === a.length, "must not repeat a value"),
  resolvedTensions: z.array(z.strictObject({ rule: z.string(), chosen: z.string() })),
  tieBreaker: Category.optional(),
  declined: z.array(z.string()),
});

// A declined home part holds the placeholder ("" for city and country, null for region) and the
// engine ignores it. A placeholder without `declined` is an error, as is a real value that is
// declined. Field-level errors show in the first parse; this pairing check runs only once every
// field has passed, so it can need a second round.
const textPlaceholder = new Set(["homeCity", "homeCountry"]);
function checkDeclinedHome(
  p: {
    homeCity?: string;
    homeRegion?: string | null;
    homeCountry?: string;
    homeLat?: number | null;
    homeLon?: number | null;
    declined?: string[];
  },
  ctx: z.RefinementCtx,
) {
  for (const field of ["homeCity", "homeRegion", "homeCountry", "homeLat", "homeLon"] as const) {
    const value = p[field];
    if (value === undefined) continue;
    const declined = p.declined?.includes(field) ?? false;
    const placeholder = textPlaceholder.has(field) ? "" : null;
    if (declined && value !== placeholder) {
      ctx.addIssue({
        code: "custom",
        path: [field],
        message: `declined, so must be ${JSON.stringify(placeholder)}`,
      });
    } else if (!declined && (value === "" || (value === null && field !== "homeRegion"))) {
      ctx.addIssue({
        code: "custom",
        path: [field],
        message: "empty: ask again, or name it in declined",
      });
    }
  }
  // The pair moves together: a distance needs both, and a half pair would read as 0.
  if (
    p.homeLat !== undefined &&
    p.homeLon !== undefined &&
    (p.homeLat === null) !== (p.homeLon === null)
  ) {
    ctx.addIssue({
      code: "custom",
      path: [p.homeLat === null ? "homeLat" : "homeLon"],
      message: "homeLat and homeLon are both numbers or both declined",
    });
  }
}

export const ProfileSchema = ProfileObject.superRefine(checkDeclinedHome);
export type Profile = z.infer<typeof ProfileSchema>;

export const PROFILE_FIELDS = Object.keys(ProfileObject.shape);

// Stage 1, "what kind of step fits me?" (docs/ux-two-stage.md): only the answers that decide the
// category. The engine's recommendCategory takes this shape, so category fit cannot read a
// budget, travel or location answer. The rest of the interview (peers, experience) is asked in
// stage 1 too, but only program scoring in stage 2 uses it.
export const DirectionProfileSchema = ProfileObject.pick({
  careerGoal: true,
  goalClarity: true,
  needs: true,
  degreeRequired: true,
  maxProgramMonths: true,
  hoursPerWeek: true,
  keepWorking: true,
  tieBreaker: true,
  declined: true,
});
export type DirectionProfile = z.infer<typeof DirectionProfileSchema>;
export const DIRECTION_FIELDS = Object.keys(DirectionProfileSchema.shape);

// What the interview has collected so far: every field optional, and needs may still be short.
// Nested objects can be set piecemeal too (a degree level before its field).
export const PartialProfileSchema = ProfileObject.partial()
  .extend({
    degree: ProfileObject.shape.degree.partial().optional(),
    careerGoal: ProfileObject.shape.careerGoal.partial().optional(),
    resolvedTensions: z.array(ProfileObject.shape.resolvedTensions.element.partial()).optional(),
    needs: z
      .array(Need)
      .max(3)
      .refine((a) => new Set(a).size === a.length, "must not repeat a need")
      .optional(),
  })
  .superRefine(checkDeclinedHome);
export type PartialProfile = z.infer<typeof PartialProfileSchema>;
