// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@app/api/chat/route";
import type { ChatRequest } from "@app/lib/chatTypes";
import Home from "@app/page";

// The whole page against the real /api/chat route through a mocked fetch. MODEL_FAKE=1 makes the
// route serve persona A's scripted advisor (server/model/personaA.ts), so the server's rewrites,
// checks and engine run for real with no model call: persona A's answers (personas/A.md) from
// the first message to the verdict.

let requests: ChatRequest[] = [];

beforeEach(() => {
  requests = [];
  vi.stubEnv("MODEL_FAKE", "1");
  // The route logs one line of numbers per request; keep the test output clean.
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      requests.push(JSON.parse(String(init.body)) as ChatRequest);
      return POST(
        new Request(new URL(url, "http://localhost"), { method: "POST", body: init.body }),
      );
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("the Stage 1 page with the real route on the fake model", () => {
  it("shows the wordmark and the privacy notice before the first message", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: "Step Up" })).toBeTruthy();
    expect(screen.getByText(/don.t share names, employers or contact details/)).toBeTruthy();
  });

  it("runs persona A to the verdict and downloads the transcript", async () => {
    const user = userEvent.setup();
    render(<Home />);
    const input = () => screen.getByLabelText("Your message");
    const tap = async (label: string) =>
      user.click(await screen.findByRole("button", { name: label }));

    await user.type(input(), "I've led engineering teams for twelve years.{Enter}");
    await tap("Step up to a bigger leadership role");
    await screen.findByText("In your own words, what would that step up look like?");
    await user.type(input(), "Move into an executive role{Enter}");
    await tap("A senior network");
    await tap("Leadership skills");
    await tap("Deep expertise in a field");
    await user.click(screen.getByRole("button", { name: /^Send 3 of 3/ }));
    await tap("More senior leaders");
    await tap("Up to a year");
    await tap("5 to 10");
    await tap("Yes, I keep working");
    await tap("Not needed");

    const card = await screen.findByRole("region", { name: "Here's what I understood" });
    expect(card.textContent).toContain('"Move into an executive role"');
    await user.click(within(card).getByRole("button", { name: "Looks right" }));

    const verdict = await screen.findByRole("region", { name: "Your verdict" });
    expect(verdict.textContent).toContain("Executive program");
    expect(screen.queryByRole("region", { name: "Here's what I understood" })).toBeNull();

    // The page sent labels only, and kept the server's rewrites: one tool result per tool call.
    const last = requests.at(-1)!.messages;
    expect(JSON.stringify(last.at(-1))).toContain('{\\"confirmed\\":true}');
    expect(JSON.stringify(last)).toContain('{\\"label\\":\\"Up to a year\\",\\"value\\":12}');
    const ids = last.flatMap((m) =>
      typeof m.content === "string"
        ? []
        : m.content.flatMap((b) => (b.type === "tool_result" ? [b.tool_use_id] : [])),
    );
    expect(new Set(ids).size).toBe(ids.length);

    // Download transcript builds the file in the browser.
    let saved: Blob | undefined;
    URL.createObjectURL = vi.fn((blob: Blob) => {
      saved = blob;
      return "blob:transcript";
    });
    URL.revokeObjectURL = vi.fn();
    const fetches = requests.length;
    await user.click(screen.getByRole("button", { name: "Download transcript" }));
    const md = await saved!.text();
    expect(md).toContain("I've led engineering teams for twelve years.");
    expect(md).toContain("- Best next step: Executive program");
    expect(requests.length).toBe(fetches);
  });

  it("doesn't send an empty message", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await user.type(screen.getByLabelText("Your message"), "   {Enter}");
    expect(requests).toHaveLength(0);
  });

  it("doesn't send on the Enter that commits an IME composition", () => {
    render(<Home />);
    const input = screen.getByLabelText("Your message");
    fireEvent.change(input, { target: { value: "\u65e5\u672c" } });
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    expect(requests).toHaveLength(0);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(requests).toHaveLength(1);
  });

  it("announces replies in a log and moves focus to the next chips", async () => {
    const user = userEvent.setup();
    render(<Home />);
    const log = screen.getByRole("log", { name: "Conversation" });
    await user.type(screen.getByLabelText("Your message"), "Hello{Enter}");
    const chip = await screen.findByRole("button", { name: "Step up to a bigger leadership role" });
    expect(log.textContent).toContain("Let's find the step that fits. First, your goal.");
    await waitFor(() => expect(document.activeElement).toBe(chip));
    // After a typed answer with no chips, focus goes back to the input box.
    await user.click(chip);
    await screen.findByText("In your own words, what would that step up look like?");
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText("Your message")));
  });
});
