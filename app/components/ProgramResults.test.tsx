// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { toEngineDirection } from "@core/advisor/tools";
import { recommendCategory } from "@core/engine/direction";
import { evaluatePrograms } from "@core/engine/search";
import type { Profile } from "@core/schema/profile";
import type { Program } from "@core/schema/program";
import { fixture, fixtureDataset } from "../../tests/fixtures/dataset";
import { personaADirection } from "../../tests/fixtures/directions";
import { personaAProfile } from "../../tests/fixtures/profiles";
import { ProgramResults } from "./ProgramResults";

afterEach(cleanup);

const today = new Date("2026-10-10");

// Persona A's confirmed verdict (executive program, runner-up certificate) and a search on it.
function renderResults(programs: Program[], profile: Profile = personaAProfile) {
  const category = recommendCategory(
    toEngineDirection(personaADirection),
    fixtureDataset(),
  ).category;
  const result = evaluatePrograms(profile, category, programs, today);
  render(<ProgramResults results={{ profile, result }} programs={programs} />);
  return screen.getByRole("region", { name: "Programs that fit" });
}

// The cards in order, by their names.
const names = (el: HTMLElement) =>
  within(el)
    .queryAllByRole("article")
    .map((a) => within(a).getByRole("heading", { level: 3 }).textContent);

describe("ProgramResults", () => {
  it("lists the confirmed category's programs, then the runner-up under Also worth a look", () => {
    // A certificate within persona A's hours, so the runner-up has a passing program.
    const programs = [
      ...fixtureDataset().filter((p) => p.id !== "fake-certificate"),
      fixture("fake-certificate", { hoursPerWeek: { min: 5, max: 8 } }),
    ];
    const region = renderResults(programs);
    expect(names(region)).toEqual(["Fixture fake-executive", "Fixture fake-certificate"]);
    expect(region.textContent).toContain("Executive program: best fit for your needs first");
    const also = within(region).getByRole("heading", { name: "Also worth a look" });
    expect(also).toBeTruthy();
    expect(region.textContent).toContain("Also worth a look for leadership skills");
    // Nothing failing is listed.
    expect(region.textContent).not.toContain("Fixture fake-mba");
  });

  it("says when the confirmed category has nothing within the limits, and shows the alternative", () => {
    const region = renderResults(fixtureDataset(), { ...personaAProfile, tuitionBudgetUsd: 15000 });
    expect(region.textContent).toContain(
      "No executive program in Step Up's list fits all your limits (tuition). Your verdict stands. The closest type with a program within your limits is Certificate",
    );
    expect(names(region)).toEqual(["Fixture fake-certificate"]);
  });

  it("says when the dataset has no program of the confirmed category", () => {
    const region = renderResults(fixtureDataset().filter((p) => p.category !== "executive"));
    expect(region.textContent).toContain("Step Up's list has no executive program yet.");
    expect(names(region)).toEqual(["Fixture fake-certificate"]);
  });

  it("says not yet when no program anywhere is within the limits", () => {
    const region = renderResults(fixtureDataset(), { ...personaAProfile, tuitionBudgetUsd: 5000 });
    expect(region.textContent).toContain("Not yet. No program in Step Up's list fits");
    expect(within(region).queryAllByRole("article")).toHaveLength(0);
  });

  it("ends with the data-limits note from the records", () => {
    const region = renderResults(fixtureDataset());
    expect(region.textContent).toContain(
      "Step Up's list holds 6 programs, in United States. Facts were checked with the schools on 2026-10-01.",
    );
    expect(region.textContent).toContain("It is not a complete list");
  });

  it("names the answers the ranking went without", () => {
    const region = renderResults(fixtureDataset(), {
      ...personaAProfile,
      declined: ["travelComfort"],
    });
    expect(region.textContent).toContain("Ranked without: Traveling for it");
  });
});
