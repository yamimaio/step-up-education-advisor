// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toEngineDirection } from "@core/advisor/tools";
import { loadPrograms } from "@core/data/load";
import { recommendCategory } from "@core/engine/direction";
import { evaluatePrograms } from "@core/engine/search";
import { POST } from "@app/api/chat/route";
import type { ChatRequest } from "@app/lib/chatTypes";
import Home from "@app/page";
import {
  BACKGROUND_QUESTION,
  PERSONA_A_BACKGROUND_ANSWER,
  PERSONA_A_PROGRAMS_YES,
} from "@server/model/personaA";
import { chatRateLimiter } from "@server/rateLimit";
import { personaADirection } from "./fixtures/directions";
import { personaAProfile } from "./fixtures/profiles";

// The whole page against the real /api/chat route through a mocked fetch. MODEL_FAKE=1 makes the
// route serve persona A's scripted advisor (server/model/personaA.ts), so the server's rewrites,
// checks and engine run for real with no model call: persona A's answers (personas/A.md) from
// the first message to the verdict, then through stage 2 to the program cards.

let requests: ChatRequest[] = [];

// When set, persona A's fake answers "Looks right" with the same card again instead of the
// verdict text, as the real model did in issue #203.
const fake = vi.hoisted(() => ({ reshowCard: false }));
vi.mock("@server/model/personaA", async (importOriginal) => {
  const real = await importOriginal<typeof import("@server/model/personaA")>();
  const { toolUse, turn } = await import("@server/model/fake");
  const { toolCalls } = await import("@server/history");
  return {
    ...real,
    personaAScript: (request: Parameters<typeof real.personaAScript>[0]) => {
      const card = toolCalls(request.messages).find(
        ({ use, result }) => use.name === "propose_direction" && result && !result.is_error,
      );
      const last = request.messages.at(-1);
      const confirmLast =
        card &&
        typeof last?.content !== "string" &&
        last?.content.some((b) => b.type === "tool_result" && b.tool_use_id === card.use.id);
      return fake.reshowCard && confirmLast
        ? turn(toolUse("propose_direction", card.use.input, "toolu_again"))
        : real.personaAScript(request);
    },
  };
});

beforeEach(() => {
  requests = [];
  fake.reshowCard = false;
  chatRateLimiter.reset();
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

describe("the page with the real route on the fake model", () => {
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

    // Taps show as "question: answer" lines; the progress line and the panel follow the answers.
    const log = screen.getByRole("log", { name: "Conversation" });
    expect(log.textContent).toContain("You: Longest program: Up to a year");
    expect(log.textContent).toContain(
      "You: What's missing: 1. A senior network, 2. Leadership skills, 3. Deep expertise in a field",
    );
    const progress = screen.getByRole("list", { name: "Progress" });
    expect(progress.querySelector('[aria-current="step"]')?.textContent).toContain("Verdict");
    const panel = screen.getByRole("complementary", { name: "What Step Up has understood" });
    expect(panel.textContent).toContain('"Move into an executive role"');
    await user.click(within(card).getByRole("button", { name: "Looks right" }));

    const verdict = await screen.findByRole("region", { name: "Your verdict" });
    expect(verdict.textContent).toContain("Executive program");
    expect(screen.queryByRole("region", { name: "Here's what I understood" })).toBeNull();
    expect(progress.querySelector('[aria-current="step"]')).toBeNull();
    expect(progress.textContent).toContain("Verdict (done)");

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

  it("doesn't show the card again after the verdict, though the model sends it (issue #203)", async () => {
    fake.reshowCard = true;
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
    for (const label of ["More senior leaders", "Up to a year", "5 to 10"]) await tap(label);
    await tap("Yes, I keep working");
    await tap("Not needed");

    const card = await screen.findByRole("region", { name: "Here's what I understood" });
    await user.click(within(card).getByRole("button", { name: "Looks right" }));

    const verdict = await screen.findByRole("region", { name: "Your verdict" });
    expect(verdict.textContent).toContain("Executive program");
    expect(screen.queryByRole("region", { name: "Here's what I understood" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Looks right" })).toBeNull();
  });

  it("keeps the conversation going after a 429: shows the wait, then retries the same history", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementationOnce(async (_url, init) => {
      requests.push(JSON.parse(String(init!.body)) as ChatRequest);
      return Response.json(
        { error: "rate_limited", retryAfter: 12 },
        { status: 429, headers: { "Retry-After": "12" } },
      );
    });
    render(<Home />);
    await user.type(screen.getByLabelText("Your message"), "Hello{Enter}");

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Wait 12 seconds, then retry.");
    expect((screen.getByLabelText("Your message") as HTMLTextAreaElement).disabled).toBe(true);

    await user.click(within(alert).getByRole("button", { name: "Retry" }));
    await screen.findByRole("button", { name: "Step up to a bigger leadership role" });
    expect(requests).toHaveLength(2);
    expect(requests[1]).toEqual(requests[0]);
    expect(screen.queryByRole("alert")).toBeNull();
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

  it("runs persona A through stage 2 to the program cards and downloads them", async () => {
    const user = userEvent.setup();
    render(<Home />);
    const input = () => screen.getByLabelText("Your message");
    const tap = async (label: string) =>
      user.click(
        await screen.findByRole("button", {
          // A picked chip's name ends with its rank (", ranked 1").
          name: new RegExp(`^${label.replace(/[$()]/g, "\\$&")}`),
        }),
      );

    // Stage 1, as above.
    await user.type(input(), "I've led engineering teams for twelve years.{Enter}");
    await tap("Step up to a bigger leadership role");
    await screen.findByText("In your own words, what would that step up look like?");
    await user.type(input(), "Move into an executive role{Enter}");
    for (const label of ["A senior network", "Leadership skills", "Deep expertise in a field"])
      await tap(label);
    await user.click(screen.getByRole("button", { name: /^Send 3 of 3/ }));
    for (const label of ["More senior leaders", "Up to a year", "5 to 10"]) await tap(label);
    await tap("Yes, I keep working");
    await tap("Not needed");
    const first = await screen.findByRole("region", { name: "Here's what I understood" });
    await user.click(within(first).getByRole("button", { name: "Looks right" }));
    await screen.findByRole("region", { name: "Your verdict" });

    // Both stages take about 28 requests in a second or two, past the 20-a-minute rate limit
    // (server/limits.ts) that a real user never meets; start stage 2 with a fresh count.
    chatRateLimiter.reset();

    // Stage 2: opt in, the typed home and background, then persona A's taps (personas/A.md).
    await user.type(input(), `${PERSONA_A_PROGRAMS_YES}{Enter}`);
    await screen.findByText(BACKGROUND_QUESTION);
    await user.type(input(), `${PERSONA_A_BACKGROUND_ANSWER}{Enter}`);
    for (const label of [
      "$40k to $80k",
      "Installments",
      "$5k to $10k",
      "Part of the appeal",
      "Blended",
      "Up to 20",
      "About a week",
      "No, I would not",
      "$1,000 to $1,500",
    ])
      await tap(label);
    await tap("Immersion");
    await tap("Network density");
    await user.click(screen.getByRole("button", { name: /^Send 2 of 2/ }));
    await tap("Bachelor's");
    await tap("Manager");

    const card = await screen.findByRole("region", { name: "Here's what I'll search with" });
    expect(card.textContent).toContain("Where you liveBuenos Aires");
    expect(card.textContent).toContain("A location should give youImmersion, Network density");
    await user.click(within(card).getByRole("button", { name: "Looks right" }));

    // The cards are the engine's result on the confirmed answers, with the records' facts.
    const programs = loadPrograms();
    const category = recommendCategory(toEngineDirection(personaADirection), programs).category;
    const expected = evaluatePrograms(personaAProfile, category, programs, new Date());
    const top = programs.find((p) => p.id === expected.ranking.ranked[0]!.id)!;
    const results = await screen.findByRole("region", { name: "Programs that fit" });
    const article = within(results).getByRole("article", { name: top.name });
    expect(article.textContent).toContain(expected.ranking.ranked[0]!.why);
    expect(screen.getByRole("region", { name: "Your verdict" })).toBeTruthy();

    // The search card's answer went back by its toolUseId, and the page kept the rewrite (the
    // model's summary), one tool result per tool call.
    const last = requests.at(-1)!.messages;
    expect(JSON.stringify(last.at(-1))).toContain('{\\"confirmed\\":true}');
    const ids = last.flatMap((m) =>
      typeof m.content === "string"
        ? []
        : m.content.flatMap((b) => (b.type === "tool_result" ? [b.tool_use_id] : [])),
    );
    expect(new Set(ids).size).toBe(ids.length);

    let saved: Blob | undefined;
    URL.createObjectURL = vi.fn((blob: Blob) => {
      saved = blob;
      return "blob:transcript";
    });
    URL.revokeObjectURL = vi.fn();
    await user.click(screen.getByRole("button", { name: "Download transcript" }));
    const md = await saved!.text();
    expect(md).toContain("## What you confirmed for the search");
    expect(md).toContain(`### ${top.name}`);
    expect(md).toContain("## About this data");
  });
});
