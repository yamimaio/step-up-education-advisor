import type { Program } from "../schema/program";
import type { PartialProfile } from "../schema/profile";
import type { Contradiction } from "./types";

const DEGREE_TYPES = ["mba", "emba", "specialized_masters"];

// The six rules (DQ11). A rule needs every field it reads; a missing one never fires it.
// Rules already in resolvedTensions are still returned, marked resolved.
export function checkContradictions(
  partial: PartialProfile,
  programs: Pick<Program, "category" | "tuitionUsd">[],
): Contradiction[] {
  const needs = partial.needs ?? [];
  const top = needs[0];
  const found: Omit<Contradiction, "resolved">[] = [];

  if (
    top === "senior_network" &&
    partial.maxOnsiteDays !== undefined &&
    partial.maxOnsiteDays < 10
  ) {
    found.push({
      id: "R1",
      text: "You ranked a senior network first, but you can spend fewer than 10 days a year on site. Networks are mostly built in person.",
    });
  }
  if (
    partial.degreeRequired === "required" &&
    partial.tuitionBudgetUsd !== undefined &&
    partial.tuitionBudgetUsd !== null &&
    !programs.some(
      (p) =>
        DEGREE_TYPES.includes(p.category) &&
        p.tuitionUsd !== null &&
        p.tuitionUsd <= (partial.tuitionBudgetUsd as number),
    )
  ) {
    found.push({
      id: "R2",
      text: "You need a degree, but no degree program here fits your tuition budget.",
    });
  }
  if (
    needs.includes("new_industry_or_city") &&
    partial.relocate === false &&
    partial.maxOnsiteDays === 0
  ) {
    found.push({
      id: "R3",
      text: "You want access to a new industry or city, but you won't relocate and can't be on site at all.",
    });
  }
  if (
    partial.hoursPerWeek !== undefined &&
    partial.hoursPerWeek.max < 5 &&
    needs.includes("deep_expertise")
  ) {
    found.push({
      id: "R4",
      text: "You want deep expertise, but you can give under 5 hours a week. Depth usually takes more time than that.",
    });
  }
  if (
    partial.travelComfort === "burden" &&
    (top === "senior_network" ||
      partial.locationValues?.[0] === "network_density" ||
      partial.locationValues?.[0] === "immersion")
  ) {
    found.push({
      id: "R5",
      text: "You find travel a burden, but the things you want most (network, immersion) are built on being there.",
    });
  }
  if (
    top === "deep_expertise" &&
    partial.maxStretchDays !== undefined &&
    partial.maxStretchDays <= 7
  ) {
    found.push({
      id: "R6",
      text: "You want deep expertise first, but you can be away for a week at most. Depth-focused programs often ask for longer stretches.",
    });
  }

  const resolved = new Set((partial.resolvedTensions ?? []).map((t) => t.rule));
  return found.map((c) => ({ ...c, resolved: resolved.has(c.id) }));
}
