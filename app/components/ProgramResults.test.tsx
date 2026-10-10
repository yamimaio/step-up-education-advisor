// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { toEngineDirection } from "@core/advisor/tools";
import { recommendCategory } from "@core/engine/direction";
import { evaluatePrograms } from "@core/engine/search";
import type { Profile } from "@core/schema/profile";
import type { Program } from "@core/schema/program";
import type { Verdict } from "@app/lib/chatState";
import { fixture, fixtureDataset } from "../../tests/fixtures/dataset";
import { personaADirection } from "../../tests/fixtures/directions";
import { personaAProfile } from "../../tests/fixtures/profiles";
import { ProgramResults } from "./ProgramResults";

afterEach(cleanup);

const today = new Date("2026-10-10");

// Persona A's confirmed verdict: executive program, runner-up certificate.
const directionResult = recommendCategory(toEngineDirection(personaADirection), fixtureDataset());
const personaAVerdict: Verdict = { direction: personaADirection, result: directionResult };

// A search on a confirmed verdict.
function renderResults(
  programs: Program[],
  profile: Profile = personaAProfile,
  verdict: Verdict = personaAVerdict,
) {
  const result = evaluatePrograms(profile, verdict.result.category, programs, today);
  render(
    <ProgramResults
      results={{ toolUseId: "t1", profile, result }}
      verdict={verdict}
      programs={programs}
    />,
  );
  return screen.getByRole("region", { name: "Programs that fit" });
}

// A certificate within persona A's hours, so its one program passes every check. (The fixture
// certificate is a near miss on hours for persona A.)
const withPassingCertificate = [
  ...fixtureDataset().filter((p) => p.id !== "fake-certificate"),
  fixture("fake-certificate", { hoursPerWeek: { min: 5, max: 8 } }),
];

// The cards in order, by their names.
const names = (el: HTMLElement) =>
  within(el)
    .queryAllByRole("article")
    .map((a) => within(a).getByRole("heading", { level: 3 }).textContent);

describe("ProgramResults", () => {
  it("lists the confirmed category's programs, then the runner-up under Also worth a look", () => {
    const region = renderResults(withPassingCertificate);
    expect(names(region)).toEqual(["Fixture fake-executive", "Fixture fake-certificate"]);
    expect(region.textContent).toContain("Executive program: best fit for your needs first");
    const also = within(region).getByRole("heading", { name: "Also worth a look" });
    expect(also).toBeTruthy();
    expect(region.textContent).toContain("Also worth a look for leadership skills");
    // Nothing failing is listed.
    expect(region.textContent).not.toContain("Fixture fake-mba");
  });

  it("numbers the ranked cards and leaves Also worth a look unnumbered", () => {
    const region = renderResults(withPassingCertificate);
    const [ranked, also] = within(region).getAllByRole("article");
    expect(within(ranked!).getByText("1").getAttribute("aria-hidden")).toBe("true");
    expect(within(also!).queryByText(/^\d+$/)).toBeNull();
  });

  it("says when the confirmed category has nothing within the limits, and shows the alternative", () => {
    const region = renderResults(withPassingCertificate, {
      ...personaAProfile,
      tuitionBudgetUsd: 15000,
    });
    expect(region.textContent).toContain(
      "No executive program in Step Up's list fits all your limits (tuition). Your verdict stands. The closest type with a program within your limits is Certificate",
    );
    expect(names(region)).toEqual(["Fixture fake-certificate"]);
  });

  it("says the alternative nearly fits when its programs are near misses", () => {
    const region = renderResults(fixtureDataset(), { ...personaAProfile, tuitionBudgetUsd: 15000 });
    expect(region.textContent).toContain(
      "The closest type with a program that nearly fits your limits is Certificate",
    );
    expect(region.textContent).not.toContain("within your limits is");
    expect(within(region).getByRole("article").textContent).toContain("Near miss");
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

  describe("with no type to search (no_winner)", () => {
    it("after declined needs, asks for the needs instead of a pick", () => {
      const direction = { ...personaADirection, needs: null, declined: ["needs" as const] };
      const verdict = {
        direction,
        result: recommendCategory(toEngineDirection(direction), fixtureDataset()),
      };
      expect(verdict.result.category.winner).toBeNull();
      expect(verdict.result.category.tie).toBeUndefined();
      const text =
        renderResults(fixtureDataset(), { ...personaAProfile, declined: ["needs"] }, verdict)
          .textContent ?? "";
      expect(text).toContain("you chose not to say");
      expect(text).toContain("Tell Step Up what's missing");
      expect(text).not.toContain("tied");
    });

    it("after an unresolved tie, names the two types", () => {
      const tie: ["executive", "emba"] = ["executive", "emba"];
      const category = { ...directionResult.category, winner: null, runnerUp: null, tie };
      const text =
        renderResults(fixtureDataset(), personaAProfile, {
          direction: personaADirection,
          result: { ...directionResult, category },
        }).textContent ?? "";
      expect(text).toContain("Executive program and Executive MBA tied");
    });

    it("otherwise says there's no single type to search, without a tie or a pick", () => {
      const category = { ...directionResult.category, winner: null };
      const text =
        renderResults(fixtureDataset(), personaAProfile, {
          direction: personaADirection,
          result: { ...directionResult, category },
        }).textContent ?? "";
      expect(text).toContain("There's no single type of program to search yet");
      expect(text).not.toContain("tied");
      expect(text).not.toContain("Pick one");
    });
  });
});
