import { z } from "zod";
import { HoursRange, Text } from "./common";
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
  hoursPerWeek: HoursRange,
  maxProgramMonths: z.number().nonnegative(),
  keepWorking: z.boolean(),
  maxOnsiteDays: z.number().nonnegative(),
  maxStretchDays: z.number().nonnegative(),
  homeCity: z.string().trim(),
  // null when the country has no state or province and the user said so.
  homeRegion: z.string().trim().nullable(),
  homeCountry: z.string(),
  relocate: z.boolean(),
  locationValues: z
    .array(LocationValue)
    .max(2)
    .refine((a) => new Set(a).size === a.length, "must not repeat a value"),
  resolvedTensions: z.array(z.strictObject({ rule: z.string(), chosen: z.string() })),
  tieBreaker: Category.optional(),
  declined: z.array(z.string()),
});

const HomeCity = Text;
const HomeRegion = Text.nullable();
const HomeCountry = z.string().regex(/^[A-Z]{2}$/, "use a two-letter ISO country code like US");

// A declined home part is stored as "" (city, country) or null (region) and the engine ignores it.
// Any part not declined must be real: a non-blank city, a region or null, an ISO country code.
export const ProfileSchema = ProfileObject.superRefine((p, ctx) => {
  const checks = [
    ["homeCity", HomeCity],
    ["homeRegion", HomeRegion],
    ["homeCountry", HomeCountry],
  ] as const;
  for (const [field, schema] of checks) {
    if (p.declined.includes(field)) continue;
    const r = schema.safeParse(p[field]);
    if (!r.success) {
      for (const issue of r.error.issues) ctx.addIssue({ ...issue, path: [field] });
    }
  }
});
export type Profile = z.infer<typeof ProfileSchema>;

export const PROFILE_FIELDS = Object.keys(ProfileObject.shape);

// What the interview has collected so far: every field optional, and needs may still be short.
// Nested objects can be set piecemeal too (a degree level before its field).
export const PartialProfileSchema = ProfileObject.partial().extend({
  degree: ProfileObject.shape.degree.partial().optional(),
  careerGoal: ProfileObject.shape.careerGoal.partial().optional(),
  resolvedTensions: z.array(ProfileObject.shape.resolvedTensions.element.partial()).optional(),
  homeCity: HomeCity.optional(),
  homeRegion: HomeRegion.optional(),
  homeCountry: HomeCountry.optional(),
  needs: z
    .array(Need)
    .max(3)
    .refine((a) => new Set(a).size === a.length, "must not repeat a need")
    .optional(),
});
export type PartialProfile = z.infer<typeof PartialProfileSchema>;
