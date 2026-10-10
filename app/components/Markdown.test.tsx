// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Markdown } from "./Markdown";
import { Message } from "./Message";

afterEach(cleanup);

// The start of the verdict message from the first real persona A run (examples/persona-a-day2.md).
const VERDICT = [
  "**Verdict: an executive program is the type of step that fits you best.**",
  "",
  "**Why it won.** It scored highest on the two needs that decided it.",
  "",
  "**Why the others lost.**",
  "- **Executive MBA (runner-up):** It matched your needs as well as the executive type did.",
  "- **MBA:** It scored lowest.",
  "",
  "Want to see programs that fit?",
].join("\n");

describe("Markdown", () => {
  it("renders the verdict message with bold and a list, and no raw markers", () => {
    const { container } = render(<Markdown text={VERDICT} />);
    expect(container.textContent).not.toContain("**");
    expect(container.textContent).not.toMatch(/(^|\n)- /);
    expect(
      screen.getByText("Verdict: an executive program is the type of step that fits you best.")
        .tagName,
    ).toBe("STRONG");
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(within(items[0]!).getByText("Executive MBA (runner-up):").tagName).toBe("STRONG");
    expect(container.querySelectorAll("p")).toHaveLength(4);
  });

  it("renders numbered lists and italic", () => {
    render(<Markdown text={"1. _first_ step\n2. second step"} />);
    const list = screen.getByRole("list");
    expect(list.tagName).toBe("OL");
    expect(screen.getByText("first").tagName).toBe("EM");
  });

  it("never turns model text into HTML", () => {
    const { container } = render(
      <Markdown text={'<img src=x onerror="alert(1)"> **<b>hi</b>**'} />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
    expect(container.textContent).toContain("<img src=x");
  });

  it("leaves an unmatched marker and snake_case words as typed", () => {
    const { container } = render(
      <Markdown text={"2 * 3 is **six, and max_program_months stays"} />,
    );
    expect(container.textContent).toBe("2 * 3 is **six, and max_program_months stays");
    expect(container.querySelector("strong, em")).toBeNull();
  });
});

describe("Message", () => {
  it("shows the user's own words exactly as typed, markdown and all", () => {
    render(
      <ul>
        <Message turn={{ kind: "user", text: "I want **strategy**" }} />
      </ul>,
    );
    expect(screen.getByText(/I want \*\*strategy\*\*/)).toBeTruthy();
  });
});
