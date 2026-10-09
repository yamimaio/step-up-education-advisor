// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { toEngineDirection, type Direction } from "@core/advisor/tools";
import { recommendCategory } from "@core/engine/direction";
import { personaADirection } from "../../tests/fixtures/directions";
import { VerdictBlock } from "./VerdictBlock";

afterEach(cleanup);

const verdictFor = (direction: Direction) => ({
  direction,
  result: recommendCategory(toEngineDirection(direction), []),
});

const block = () => screen.getByRole("region", { name: "Your verdict" }).textContent ?? "";

describe("VerdictBlock", () => {
  it("names the category, the runner-up and the deciding needs from the engine result", () => {
    const verdict = verdictFor(personaADirection);
    render(<VerdictBlock verdict={verdict} />);
    const text = block();
    expect(verdict.result.category.winner).toBe("executive");
    expect(text).toContain("Executive program");
    expect(text).toMatch(/Runner-up: \S/);
    expect(text).toContain("Deciding needs: A senior network");
    expect(text).toContain(`Executive program${verdict.result.category.scores.executive}`);
  });

  it("lists a ruled-out type with the engine's reason", () => {
    render(
      <VerdictBlock verdict={verdictFor({ ...personaADirection, degreeRequired: "required" })} />,
    );
    const text = block();
    expect(text).toContain("CertificateRuled out");
    expect(text).toContain("Out: you need a degree and this type does not award one.");
  });

  it("shows resolved tensions from the confirmed card", () => {
    render(
      <VerdictBlock
        verdict={verdictFor({
          ...personaADirection,
          resolvedTensions: [{ rule: "R4", chosen: "Depth over speed" }],
        })}
      />,
    );
    expect(block()).toContain("You decided: Depth over speed");
  });

  it("says not yet, and names the gap, when the needs were declined", () => {
    render(
      <VerdictBlock
        verdict={verdictFor({ ...personaADirection, needs: null, declined: ["needs"] })}
      />,
    );
    const text = block();
    expect(text).toContain("Not yet.");
    expect(text).toContain("Not answered: What's missing");
  });

  it("names no type to pick when not yet fires but the engine still ranks a winner", () => {
    // Persona B's case: the goal stays unclear, so goal_unclear fires over a ranked winner.
    const verdict = verdictFor({ ...personaADirection, goalClarity: "unclear" });
    expect(verdict.result.noProgram).toEqual({ triggered: true, trigger: "goal_unclear" });
    expect(verdict.result.category.winner).toBe("executive");
    render(<VerdictBlock verdict={verdict} />);
    const text = block();
    expect(text).toContain("Not yet. Your goal isn't clear enough");
    expect(text).not.toContain("Runner-up");
    expect(text).not.toContain("Deciding needs");
    expect(screen.queryByText("Executive program", { selector: ".text-2xl" })).toBeNull();
  });
});
