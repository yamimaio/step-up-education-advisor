// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Turn } from "@app/lib/conversation";
import { Message } from "./Message";

afterEach(cleanup);

const show = (turn: Turn) => {
  render(
    <ol>
      <Message turn={turn} />
    </ol>,
  );
  return screen.getByRole("listitem");
};

describe("Message", () => {
  it("shows a tapped answer as one 'label: answer' line, read as the user's", () => {
    const item = show({
      kind: "chips",
      field: "maxProgramMonths",
      question: "The longest program you'd take on now",
      chosen: ["Up to a year"],
    });
    expect(item.textContent).toBe("You: Longest program: Up to a year");
    expect(item.textContent).not.toContain("The longest program");
  });

  it("keeps the order of the needs", () => {
    const item = show({
      kind: "chips",
      field: "needs",
      question: "Rank the top 3",
      chosen: ["A senior network", "Leadership skills", "Deep expertise in a field"],
    });
    expect(item.textContent).toBe(
      "You: What's missing: 1. A senior network, 2. Leadership skills, 3. Deep expertise in a field",
    );
  });

  it("shows the typed words of a typed answer to chips", () => {
    const item = show({
      kind: "chips",
      field: "hoursPerWeek",
      question: "Hours a week",
      chosen: [],
      typed: "Weekends only",
    });
    expect(item.textContent).toBe("You: Hours a week: Weekends only");
  });

  it("labels an unknown field with the question asked", () => {
    const item = show({
      kind: "chips",
      field: "somethingNew",
      question: "How do you feel about travel?",
      chosen: ["Fine"],
    });
    expect(item.textContent).toBe("You: How do you feel about travel: Fine");
  });

  it("keeps typed messages and advisor text in bubbles with who said them", () => {
    expect(show({ kind: "user", text: "I lead teams." }).textContent).toBe("You: I lead teams.");
    cleanup();
    expect(show({ kind: "assistant", text: "Tell me more." }).textContent).toBe(
      "Step Up: Tell me more.",
    );
  });
});
