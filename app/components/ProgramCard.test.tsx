// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { toEngineDirection } from "@core/advisor/tools";
import { recommendCategory } from "@core/engine/direction";
import { evaluatePrograms } from "@core/engine/search";
import { loadPrograms } from "@core/data/load";
import type { Profile } from "@core/schema/profile";
import type { Program } from "@core/schema/program";
import { programView } from "@app/lib/programs";
import { fixture } from "../../tests/fixtures/dataset";
import { personaADirection } from "../../tests/fixtures/directions";
import { personaAProfile } from "../../tests/fixtures/profiles";
import { ProgramCard } from "./ProgramCard";

afterEach(cleanup);

const today = new Date("2026-10-10");
const WHY = "Ranked first for senior peers (cohort median 15 years) and leadership skills.";

// The card for one program, with the engine's evaluation of it for persona A.
function renderCard(program: Program = fixture(), profile: Profile = personaAProfile) {
  const category = recommendCategory(toEngineDirection(personaADirection), [program]).category;
  const result = evaluatePrograms(profile, category, [program], today);
  render(<ProgramCard program={programView(program, result.programs[0]!, profile, WHY)} />);
  return screen.getByRole("article", { name: program.name });
}

const text = (el: HTMLElement) => el.textContent ?? "";

describe("ProgramCard", () => {
  it("shows the record's facts and the engine's why line, checks and confidence", () => {
    const card = text(renderCard());
    expect(card).toContain("Fake University (test fixture)");
    expect(card).toContain(WHY);
    expect(card).toContain("Tuition$30,000");
    expect(card).toContain("FitsTuition: $30,000; your limit $80,000");
    expect(card).toContain("FormatBlended");
    expect(card).toContain("Length8 months");
    expect(card).toContain("On site15 days a year");
    expect(card).toContain(
      "Payment optionsInstallments, Employer sponsorship, Early payment discount",
    );
    expect(card).toContain("How you'd payInstallments: offered");
    expect(card).toContain("Who's in the classMostly directors and VPs");
    // Derived from the published cohort figure, which the line names.
    expect(card).toContain("A senior network: 4 of 5. cohort median 15 years");
    expect(card).toContain("Blended, as you prefer.");
    expect(card).toContain("Confidence: High.");
    expect(card).not.toContain("Draft, not yet verified");
  });

  it('shows "not published" for a null tuition, and lowers confidence for it', () => {
    const card = text(renderCard(fixture("fake-executive", { tuitionUsd: null })));
    expect(card).toContain("Tuitionnot published");
    expect(card).toContain("Near missTuition: not published; your limit $80,000");
    expect(card).toContain("Tuition plus travelcan't be added up: a figure is not published");
    expect(card).toContain("Tuition is not published on an official page.");
  });

  it('shows "not published" for every other null fact', () => {
    const card = text(
      renderCard(
        fixture("fake-executive", {
          durationMonths: null,
          hoursPerWeek: null,
          paymentOptions: null,
          cohortSeniority: null,
          tuitionIncludes: null,
        }),
      ),
    );
    expect(card).toContain("Lengthnot published");
    expect(card).toContain("Hours a weeknot published");
    expect(card).toContain("Payment optionsnot published");
    expect(card).toContain("How you'd payInstallments: not published");
    expect(card).toContain("Who's in the classnot published");
    expect(card).toContain("Tuition includesnot published");
  });

  it("labels a draft record and says its sources were checked, not verified", () => {
    const card = renderCard(
      fixture("fake-executive", { verification: { status: "draft", verifiedBy: null } }),
    );
    expect(within(card).getByText("Draft, not yet verified")).toBeTruthy();
    expect(text(card)).toContain("Sources checked on 2026-10-01");
    expect(text(card)).not.toContain("Verified on");
    expect(text(card)).toContain("Draft record, not yet verified.");
  });

  it("lists each source page as a link with its checked-on date, and the verified-on date", () => {
    const card = renderCard();
    expect(text(card)).toContain("Verified on 2026-10-01");
    const links = within(card).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "https://example.edu/fake-executive",
      "https://www.gsa.gov/travel/plan-book/per-diem-rates",
    ]);
    // One line per page, naming every fact it backs.
    expect(links[0]!.textContent).toBe("Campus address, format, length, tuition, class experience");
    expect(links[0]!.getAttribute("rel")).toBe("noopener noreferrer");
    expect(text(card)).toContain("Lodging rate, checked 2026-10-01");
  });

  it("shows a fact the school gave directly without a link", () => {
    const card = renderCard(
      fixture("fake-executive", {
        sources: [
          ...fixture().sources,
          {
            field: "cohortSeniority",
            quote: "Mostly directors and VPs.",
            checkedOn: "2026-09-20",
            kind: "school_correspondence",
          },
        ],
      }),
    );
    expect(text(card)).toContain("classmates (from the school), checked 2026-09-20");
    expect(within(card).getAllByRole("link")).toHaveLength(2);
    expect(text(card)).toContain("Verified on 2026-09-20");
  });

  it("shows each figure's caveat next to it (Northwestern's real record)", () => {
    const northwestern = loadPrograms().find((p) => p.id === "northwestern-mem-pt")!;
    const card = renderCard(northwestern);
    const fact = (label: string) =>
      within(card).getByText(label, { selector: "dt" }).nextElementSibling?.textContent ?? "";
    expect(fact("Tuition")).toContain("2026-27 rate; the Fall 2027 rate is not published.");
    expect(fact("Tuition")).toContain("A minimum; the school publishes no fixed total.");
    expect(fact("Length")).toContain("The school publishes a 2-3 year range");
    expect(fact("Classmates")).toContain("Average for part-time students in Fall 2021");
    // The coordinates aren't on the card, so their "derived from" notes aren't either.
    expect(text(card)).not.toContain("Derived from campusAddress");
  });

  it("puts a note on a field no line shows under Other notes, so no caveat is lost", () => {
    const card = renderCard(
      fixture("fake-executive", {
        figureNotes: { ...fixture().figureNotes, workCompatible: "Fixture caveat." },
      }),
    );
    expect(text(card)).toContain("Other notesWork compatible: Fixture caveat.");
  });

  it("leaves out what the location gives when the user declined location values", () => {
    const card = renderCard(fixture(), {
      ...personaAProfile,
      locationValues: ["immersion"],
      declined: ["locationValues"],
    });
    expect(text(card)).not.toContain("What the location gives you");
  });

  it("links only web pages: another URL scheme shows as text", () => {
    const card = renderCard(
      fixture("fake-executive", {
        sources: [
          ...fixture().sources,
          {
            field: "cohortSeniority",
            url: "javascript:alert(1)",
            quote: "Mostly directors and VPs.",
            checkedOn: "2026-10-01",
            kind: "official_page",
          },
        ],
      }),
    );
    expect(within(card).getAllByRole("link")).toHaveLength(2);
    expect(text(card)).toContain("Classmates, checked 2026-10-01");
  });
});
