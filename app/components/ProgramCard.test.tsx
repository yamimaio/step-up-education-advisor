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
import { CHICAGO, NO_HOME, NO_HOME_DECLINED, personaAProfile } from "../../tests/fixtures/profiles";
import { ProgramCard } from "./ProgramCard";

afterEach(cleanup);

const today = new Date("2026-10-10");
const WHY = "Ranked first for senior peers (cohort median 15 years) and leadership skills.";

// The card for one program, with the engine's evaluation of it for persona A.
function renderCard(
  program: Program = fixture(),
  profile: Profile = personaAProfile,
  rank?: number,
) {
  const category = recommendCategory(toEngineDirection(personaADirection), [program]).category;
  const result = evaluatePrograms(profile, category, [program], today);
  render(
    <ProgramCard program={programView(program, result.programs[0]!, profile, WHY)} rank={rank} />,
  );
  return screen.getByRole("article", { name: program.name });
}

const text = (el: HTMLElement) => el.textContent ?? "";

describe("ProgramCard", () => {
  it("shows the record's facts and the engine's why line, checks and confidence", () => {
    const card = text(renderCard());
    expect(card).toContain("Fake University (test fixture)");
    expect(card).toContain(WHY);
    expect(card).toContain("Tuition$30,000");
    expect(card).toContain("FitsTuition: $30,000; you chose $40k to $80k");
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

  it("repeats format, length, place and total cost under the name, with the confidence level", () => {
    const card = renderCard();
    const summary = within(card).getAllByRole("definition")[0]!.closest("dl")!;
    expect(
      within(summary)
        .getAllByRole("term")
        .map((dt) => dt.textContent),
    ).toEqual(["Format", "Length", "Where", "Tuition plus travel"]);
    expect(summary.textContent).toContain("FormatBlended");
    expect(summary.textContent).toContain("Length8 months");
    // The same values as the full list below.
    const below = text(card).slice(text(card).indexOf("The program"));
    for (const dt of within(summary).getAllByRole("term")) {
      expect(below).toContain(`${dt.textContent}${dt.nextElementSibling!.textContent}`);
    }
    expect(within(card).getByText("Confidence: High")).toBeTruthy();
  });

  it("numbers a ranked card before its name, hidden from screen readers", () => {
    const card = renderCard(fixture(), personaAProfile, 2);
    const marker = within(card).getByText("2");
    expect(marker.getAttribute("aria-hidden")).toBe("true");
    // The heading, and so the card's name, is the program name alone.
    expect(within(card).getByRole("heading", { level: 3 }).textContent).toBe(fixture().name);
  });

  it("has no number without a rank", () => {
    const card = renderCard();
    expect(within(card).queryByText(/^\d+$/)).toBeNull();
  });

  it('shows "not published" for a null tuition, and lowers confidence for it', () => {
    const card = text(renderCard(fixture("fake-executive", { tuitionUsd: null })));
    expect(card).toContain("Tuitionnot published");
    expect(card).toContain("Near missTuition: not published; you chose $40k to $80k");
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
    // The link says it opens a new tab, to screen readers only.
    expect(links[0]!.textContent).toBe(
      "Campus address, format, length, tuition, class experience (opens in a new tab)",
    );
    expect(within(links[0]!).getByText("(opens in a new tab)").className).toBe("sr-only");
    expect(links[0]!.getAttribute("rel")).toBe("noopener noreferrer");
    expect(text(card)).toContain("Lodging rate (opens in a new tab), checked 2026-10-01");
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
    // The last line with the label: the summary row at the top repeats four of them, without notes.
    const fact = (label: string) =>
      within(card).getAllByText(label, { selector: "dt" }).at(-1)?.nextElementSibling
        ?.textContent ?? "";
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

  describe("a near miss that isn't over the limit", () => {
    it("reads Not fully checked for a per-course price with no published total", () => {
      const card = text(
        renderCard(
          fixture("fake-executive", {
            tuitionUsd: null,
            tuitionPerCourseUsd: 8100,
            courseCount: 12,
          }),
          { ...personaAProfile, tuitionBudgetUsd: 250000 },
        ),
      );
      expect(card).toContain(
        "Not fully checkedTuition: you chose Over $80k, counted as up to $250,000; priced per course; about $97,200 at 12 courses (estimate)",
      );
      expect(card).not.toContain("Near missTuition");
    });

    it("reads Not fully checked for a location with no home", () => {
      // An evening program needs the student nearby; with the home declined it can't be checked.
      const card = text(
        renderCard(fixture("fake-executive", { attendance: "recurring_evenings" }), {
          ...personaAProfile,
          ...NO_HOME,
          declined: NO_HOME_DECLINED,
        }),
      );
      expect(card).toContain("Not fully checkedLocation: Boston");
    });

    it("keeps Near miss for a published figure slightly over", () => {
      const card = text(renderCard(fixture(), { ...personaAProfile, tuitionBudgetUsd: 27000 }));
      expect(card).toContain("Near missTuition: $30,000; your limit $27,000");
    });
  });

  it("shows a passing check's note, such as a move the program needs", () => {
    // An evening program needs the student nearby; persona A would relocate from Chicago.
    const card = text(
      renderCard(fixture("fake-executive", { attendance: "recurring_evenings" }), {
        ...personaAProfile,
        ...CHICAGO,
        relocate: true,
      }),
    );
    expect(card).toContain("FitsLocation: Boston; requires relocating");
  });

  it("shows the chip the user tapped as their side of a check, never a stored ceiling", () => {
    const card = text(
      renderCard(fixture(), {
        ...personaAProfile,
        tuitionBudgetUsd: 250000, // "Over $80k"
        maxProgramMonths: 3, // "About 2 months"
        hoursPerWeek: { min: 20, max: 40 }, // "More than 20"
        maxOnsiteDays: 365, // "More"
      }),
    );
    expect(card).toContain("Tuition: $30,000; you chose Over $80k");
    expect(card).toContain("Program length: 8 months; you chose About 2 months");
    expect(card).toContain("Hours a week: 8-10 hours a week; you chose More than 20");
    expect(card).toContain("On-site days a year: 15 days a year; you chose More");
    expect(card).not.toMatch(/\$250,000|365 days|20-40/);
  });

  it("shows the figure when the user's answer matches no chip", () => {
    const card = text(renderCard(fixture(), { ...personaAProfile, tuitionBudgetUsd: 27000 }));
    expect(card).toContain("Tuition: $30,000; your limit $27,000");
  });

  it("gives the figure an open-ended chip counts as when a check doesn't pass", () => {
    const over = { ...personaAProfile, tuitionBudgetUsd: 250000 }; // "Over $80k"
    expect(text(renderCard(fixture("fake-executive", { tuitionUsd: 300000 }), over))).toContain(
      "Doesn't fitTuition: $300,000; you chose Over $80k, counted as up to $250,000",
    );
    cleanup();
    expect(text(renderCard(fixture("fake-executive", { tuitionUsd: 270000 }), over))).toContain(
      "Near missTuition: $270,000; you chose Over $80k, counted as up to $250,000",
    );
    cleanup();
    const short = { ...personaAProfile, maxProgramMonths: 3 }; // "About 2 months"
    expect(text(renderCard(fixture(), short))).toContain(
      "Doesn't fitProgram length: 8 months; you chose About 2 months, counted as up to 3 months",
    );
    cleanup();
    const busy = { ...personaAProfile, hoursPerWeek: { min: 20, max: 40 } }; // "More than 20"
    expect(
      text(renderCard(fixture("fake-executive", { hoursPerWeek: { min: 60, max: 70 } }), busy)),
    ).toContain("you chose More than 20, counted as 20-40 hours a week");
  });
});
