import { z } from "zod";

// A real calendar date written YYYY-MM-DD.
export const IsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must be a date like 2026-10-08")
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, "not a real calendar date");

// Non-blank text, trimmed so "Boston " compares equal to "Boston".
export const Text = z.string().trim().min(1);

// A two-letter ISO country code; shared by program records and the user's home country.
export const CountryCode = z
  .string()
  .regex(/^[A-Z]{2}$/, "use a two-letter ISO country code like US");

// Used for the user's hours per week and a program's published estimate.
export const HoursRange = z
  .object({ min: z.number().nonnegative(), max: z.number().nonnegative() })
  .strict()
  .refine((h) => h.min <= h.max, "min must not exceed max");
export type HoursRange = z.infer<typeof HoursRange>;
