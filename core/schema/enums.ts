import { z } from "zod";

export const Category = z.enum([
  "mba",
  "emba",
  "specialized_masters",
  "executive",
  "certificate",
  "short_course",
]);
export type Category = z.infer<typeof Category>;

export const Format = z.enum(["in_person", "hybrid", "online"]);
export type Format = z.infer<typeof Format>;

// How on-site time recurs. The day and trip counts win when they exist; this only classifies
// the pattern (and says whether the student must live near campus).
export const Attendance = z.enum([
  "none",
  "residencies",
  "recurring_weekends",
  "recurring_evenings",
  "recurring_daily",
]);
export type Attendance = z.infer<typeof Attendance>;

export const LocationValue = z.enum([
  "network_density",
  "industry_hub",
  "relocation_path",
  "immersion",
  "affordability",
  "travel_ease",
  "international",
]);
export type LocationValue = z.infer<typeof LocationValue>;

export const PaymentOption = z.enum([
  "installments",
  "employer_sponsorship",
  "loans",
  "scholarships",
  "early_payment_discount",
]);
export type PaymentOption = z.infer<typeof PaymentOption>;

export const Need = z.enum([
  "leadership_skills",
  "deep_expertise",
  "graduate_degree",
  "senior_network",
  "new_industry_or_city",
]);
export type Need = z.infer<typeof Need>;

export const RatingKey = z.enum(["network", "depth", "practicality", "costValue"]);
export type RatingKey = z.infer<typeof RatingKey>;
