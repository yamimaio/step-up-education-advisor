// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Markdown } from "./Markdown";
import { Message } from "./Message";

afterEach(cleanup);

// The verdict message from the first real persona A run (examples/persona-a-day2.md, lines 49 to
// 61, without the "> " quote prefix).
const VERDICT = `**Verdict: an executive program is the type of step that fits you best.**

**Why it won.** It scored highest on the two needs that decided it: a senior network (your first pick) and leadership skills (your second). You said you want to learn next to more senior leaders, and you can give about a year at 10 to 15 hours a week while you keep working. Executive programs are built around that kind of schedule and that kind of room. No tensions came up between your answers.

**Why the others lost.**

- **Executive MBA (runner-up):** It matched your needs as well as the executive type did, with the same subtotal of 28. But you said you don't need a degree, and that cost it 6 points. It's also a longer commitment than your one-year limit suggests.
- **MBA:** It scored lowest. Its needs fit was weaker, and the "degree not needed" answer cost it points too.
- **Specialized master's, certificate and short course:** They scored lower on your needs. A short course or certificate could build strategy knowledge, but neither puts you in a room of senior peers.

**One thing to keep in mind.** You named strategy expertise as the goal, but you ranked deep expertise third. An executive program will teach strategy, but it works mainly as a place to meet senior people and learn how they think. If you find you want strategy mastery more than the network, tell me, and we can revisit this.

**What this step asks of you.** It's usually taught in short, intensive blocks or a part-time format, with case discussion and peer exchange. The other people in the room are mostly senior leaders from many industries.

Want to see programs that fit?`;

describe("Markdown", () => {
  it("renders the verdict message from the transcript with no raw markers", () => {
    const { container } = render(<Markdown text={VERDICT} />);
    expect(container.textContent).not.toContain("**");
    expect(container.textContent).not.toMatch(/(^|\n)- /);
    expect(
      screen.getByText("Verdict: an executive program is the type of step that fits you best.")
        .tagName,
    ).toBe("STRONG");
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items.map((li) => li.querySelector("strong")?.textContent)).toEqual([
      "Executive MBA (runner-up):",
      "MBA:",
      "Specialized master's, certificate and short course:",
    ]);
    expect(container.querySelectorAll("p")).toHaveLength(6);
    expect(container.querySelector("p:last-of-type")?.textContent).toBe(
      "Want to see programs that fit?",
    );
  });

  it("keeps a numbered list with blank lines between items as one list", () => {
    render(
      <Markdown
        text={"1. **Executive program** fits.\n\n2. **EMBA** is close.\n\n3. **MBA** lost."}
      />,
    );
    const lists = screen.getAllByRole("list");
    expect(lists).toHaveLength(1);
    expect(lists[0]!.tagName).toBe("OL");
    expect(within(lists[0]!).getAllByRole("listitem")).toHaveLength(3);
  });

  it("starts a numbered list at its first number", () => {
    render(<Markdown text="3. Then apply." />);
    expect(screen.getByRole("list").getAttribute("start")).toBe("3");
  });

  it("nests indented bullets under their item", () => {
    const { container } = render(
      <Markdown text={"- Executive MBA\n  - longer than a year\n  - costs more\n- MBA"} />,
    );
    expect(container.querySelectorAll(":scope > div > ul > li")).toHaveLength(2);
    expect(container.querySelectorAll("ul > li > ul > li")).toHaveLength(2);
  });

  it("keeps the numbering of a list with bullets under an item", () => {
    const { container } = render(
      <Markdown text={"1. Executive program\n   - fits your year\n2. EMBA"} />,
    );
    expect(container.querySelectorAll("ol")).toHaveLength(1);
    expect(container.querySelectorAll("ol > li")).toHaveLength(2);
    expect(container.querySelector("ol > li > ul > li")?.textContent).toBe("fits your year");
  });

  it("renders ***bold italic*** and markers nested inside bold or italic", () => {
    const { container } = render(
      <Markdown
        text={
          "***Verdict: executive program.***\n\n**Executive MBA (_runner-up_):** close\n\n_See **Why it won** above_"
        }
      />,
    );
    expect(container.textContent).not.toMatch(/[*_]/);
    const verdict = screen.getByText("Verdict: executive program.");
    expect(verdict.tagName).toBe("STRONG");
    expect(verdict.parentElement?.tagName).toBe("EM");
    expect(screen.getByText("runner-up").closest("strong")).not.toBeNull();
    expect(screen.getByText("Why it won").closest("em")).not.toBeNull();
  });

  it("renders bold across a line break", () => {
    const { container } = render(<Markdown text={"**Why it\nwon.** It scored highest."} />);
    expect(container.querySelector("strong")?.textContent).toBe("Why it\nwon.");
    expect(container.textContent).not.toContain("**");
  });

  it("shows an escaped marker as typed", () => {
    const { container } = render(<Markdown text={"costs \\*about\\* 5"} />);
    expect(container.textContent).toBe("costs *about* 5");
    expect(container.querySelector("em")).toBeNull();
  });

  it("keeps a continuation line in its bullet", () => {
    const { container } = render(
      <Markdown text={"- **MBA:** It scored lowest.\n  Its needs fit was weaker."} />,
    );
    expect(container.querySelectorAll("li")).toHaveLength(1);
    expect(container.querySelector("li")?.textContent).toBe(
      "MBA: It scored lowest.\nIts needs fit was weaker.",
    );
    expect(container.querySelector("p")).toBeNull();
  });

  it("never turns model text into HTML", () => {
    const { container } = render(
      <Markdown text={'<img src=x onerror="alert(1)"> **<b>hi</b>**'} />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("b")).toBeNull();
    expect(container.innerHTML).not.toContain("onerror");
    expect(container.querySelector("strong")?.textContent).toBe("hi");
  });

  it("leaves an unmatched marker and snake_case words as typed", () => {
    const { container } = render(
      <Markdown text={"2 * 3 is **six, and max_program_months stays"} />,
    );
    expect(container.textContent).toBe("2 * 3 is **six, and max_program_months stays");
    expect(container.querySelector("strong, em")).toBeNull();
  });

  it("shows headings, links and images as plain text", () => {
    const { container } = render(
      <Markdown text={"# Verdict\n\nSee [the site](https://example.com) ![logo](x.png)"} />,
    );
    expect(container.querySelector("h1, a, img")).toBeNull();
    expect(container.textContent).toContain("Verdict");
    expect(container.textContent).toContain("See the site");
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
