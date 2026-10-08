import { z } from "zod";
import { HoursRange } from "./common";
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
  homeCity: z.string(),
  relocate: z.boolean(),
  locationValues: z
    .array(LocationValue)
    .max(2)
    .refine((a) => new Set(a).size === a.length, "must not repeat a value"),
  resolvedTensions: z.array(z.strictObject({ rule: z.string(), chosen: z.string() })),
  tieBreaker: Category.optional(),
  declined: z.array(z.string()),
});

export const ProfileSchema = ProfileObject;
export type Profile = z.infer<typeof ProfileSchema>;

export const PROFILE_FIELDS = Object.keys(ProfileObject.shape);

// What the interview has collected so far: every field optional, and needs may still be short.
export const PartialProfileSchema = ProfileObject.partial().extend({
  needs: z
    .array(Need)
    .max(3)
    .refine((a) => new Set(a).size === a.length, "must not repeat a need")
    .optional(),
});
export type PartialProfile = z.infer<typeof PartialProfileSchema>;
