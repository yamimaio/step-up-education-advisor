// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CHIPS } from "@core/advisor/chips";
import { toEngineDirection } from "@core/advisor/tools";
import { loadPrograms } from "@core/data/load";
import { recommendCategory } from "@core/engine/direction";
import { evaluatePrograms } from "@core/engine/search";
import type { ChatRequest, ChatResponse, MessageParam } from "@app/lib/chatTypes";
import Home from "@app/page";
import { personaADirection } from "./fixtures/directions";
import { personaAProfile } from "./fixtures/profiles";

// Stage 2 on the page against short scripted /api/chat responses (docs/chat-api.md, "Stage 2"):
// the verdict, a stage 2 chip set, the search card, then the programs. It checks where each card's
// result sits in the chat. tests/page.fake.test.tsx walks persona A through both stages on the
// real route.

const programs = loadPrograms();
const direction = recommendCategory(toEngineDirection(personaADirection), programs);
const search = evaluatePrograms(personaAProfile, direction.category, programs, new Date());
const top = programs.find((p) => p.id === search.ranking.ranked[0]?.id)!;

const assistant = (...content: MessageParam["content"][number][]): MessageParam => ({
  role: "assistant",
  content: content as MessageParam["content"],
});
const toolUse = (id: string, name: string, input: unknown) => ({
  type: "tool_use",
  id,
  name,
  input,
});
const rewritten = (id: string, body: unknown): MessageParam => ({
  role: "user",
  content: [{ type: "tool_result", tool_use_id: id, content: JSON.stringify(body) }],
});

const ok: ChatResponse = {
  replaceLastUserMessage: null,
  messages: [],
  text: "",
  chips: null,
  confirm: null,
  direction: null,
  programs: null,
  counter: null,
  notice: null,
};

const script: ChatResponse[] = [
  // "Hello" → the stage 1 card.
  {
    ...ok,
    messages: [assistant(toolUse("d1", "propose_direction", { direction: personaADirection }))],
    confirm: { toolUseId: "d1", direction: personaADirection },
  },
  // "Looks right" → the verdict.
  {
    ...ok,
    replaceLastUserMessage: rewritten("d1", { confirmed: true, result: direction }),
    messages: [assistant({ type: "text", text: "Want to see programs that fit?" })],
    text: "Want to see programs that fit?",
    direction,
  },
  // "Yes please" → a stage 2 chip set.
  {
    ...ok,
    messages: [
      assistant(
        { type: "text", text: "How would you rather study?" },
        toolUse("c1", "ask_choice", { field: "formatPreference", question: "Your format" }),
      ),
    ],
    chips: {
      toolUseId: "c1",
      field: "formatPreference",
      question: "Your format",
      options: CHIPS.formatPreference.map((c) => ({ ...c })),
      pick: 1,
    },
  },
  // "Blended" → the search card.
  {
    ...ok,
    replaceLastUserMessage: rewritten("c1", { chosen: [{ label: "Blended", value: "blended" }] }),
    messages: [assistant(toolUse("s1", "propose_search", { profile: personaAProfile }))],
    confirm: { toolUseId: "s1", profile: personaAProfile },
  },
  // "Looks right" → the programs. The model sees a summary; the page gets the full result.
  {
    ...ok,
    replaceLastUserMessage: rewritten("s1", { confirmed: true, result: { summary: true } }),
    messages: [assistant({ type: "text", text: "Here is what fits." })],
    text: "Here is what fits.",
    programs: search,
  },
];

let requests: ChatRequest[] = [];
// What fetch answers next: a scripted response, or a raw Response (a failure).
let queue: (ChatResponse | Response)[] = [];

beforeEach(() => {
  requests = [];
  queue = [...script];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init: RequestInit) => {
      requests.push(JSON.parse(String(init.body)) as ChatRequest);
      const next = queue.shift();
      return next instanceof Response ? next : Response.json(next);
    }),
  );
});

// From the first message to the first search card's programs.
async function walkToPrograms(user: ReturnType<typeof userEvent.setup>) {
  render(<Home />);
  const input = () => screen.getByLabelText("Your message");
  await user.type(input(), "Hello{Enter}");
  const first = await screen.findByRole("region", { name: "Here's what I understood" });
  await user.click(within(first).getByRole("button", { name: "Looks right" }));
  await screen.findByRole("region", { name: "Your verdict" });
  await user.type(input(), "Yes please{Enter}");
  await user.click(await screen.findByRole("button", { name: "Blended" }));
  const card = await screen.findByRole("region", { name: "Here's what I'll search with" });
  await user.click(within(card).getByRole("button", { name: "Looks right" }));
  return screen.findByRole("region", { name: "Programs that fit" });
}

const follows = (a: Node, b: Node) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

// jsdom has no scrollIntoView: record each call, with the element it was called on.
let scrolled: { el: Element; options: unknown }[] = [];
beforeEach(() => {
  scrolled = [];
  Element.prototype.scrollIntoView = function (this: Element, options?: unknown) {
    scrolled.push({ el: this, options });
  };
});

afterEach(() => {
  delete (Element.prototype as Partial<Element>).scrollIntoView;
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the page, stage 2", () => {
  it("goes from the verdict through the search card to the program cards", async () => {
    expect(search.ranking.ranked.length).toBeGreaterThan(0);
    const user = userEvent.setup();
    render(<Home />);
    const input = () => screen.getByLabelText("Your message");

    await user.type(input(), "Hello{Enter}");
    const first = await screen.findByRole("region", { name: "Here's what I understood" });
    await user.click(within(first).getByRole("button", { name: "Looks right" }));
    await screen.findByRole("region", { name: "Your verdict" });

    await user.type(input(), "Yes please{Enter}");
    await user.click(await screen.findByRole("button", { name: "Blended" }));

    const card = await screen.findByRole("region", { name: "Here's what I'll search with" });
    expect(card.textContent).toContain("Tuition budget$40k to $80k");
    expect(screen.queryByRole("region", { name: "Programs that fit" })).toBeNull();
    await user.click(within(card).getByRole("button", { name: "Looks right" }));

    const results = await screen.findByRole("region", { name: "Programs that fit" });
    expect(within(results).getByRole("article", { name: top.name })).toBeTruthy();
    expect(results.textContent).toContain(search.ranking.ranked[0]!.why);
    expect(results.textContent).toContain("It is not a complete list");
    expect(screen.queryByRole("region", { name: "Here's what I'll search with" })).toBeNull();

    // The confirm answered the search card, and the page kept the server's rewrite.
    const posted = requests.at(-1)!.messages;
    expect(posted.at(-1)).toEqual(rewritten("s1", { confirmed: true }));

    // The verdict stays at the first card's answer; the programs follow the second.
    const log = screen.getByRole("log", { name: "Conversation" });
    const verdict = within(log).getByRole("region", { name: "Your verdict" });
    const answers = within(log).getAllByText("Looks right");
    expect(follows(answers[0]!, verdict)).toBe(true);
    expect(follows(verdict, answers[1]!)).toBe(true);
    expect(follows(answers[1]!, results)).toBe(true);
    expect(follows(results, within(log).getByText("Here is what fits."))).toBe(true);

    // The transcript holds the stage 2 answers and the programs.
    let saved: Blob | undefined;
    URL.createObjectURL = vi.fn((blob: Blob) => {
      saved = blob;
      return "blob:transcript";
    });
    URL.revokeObjectURL = vi.fn();
    await user.click(screen.getByRole("button", { name: "Download transcript" }));
    const md = await saved!.text();
    expect(md).toContain("- Your format: Blended");
    expect(md).toContain("## What you confirmed for the search");
    expect(md).toContain(`### ${top.name}`);
    expect(md).toContain("## About this data");
  });

  it("keeps the cards out of the log's announcements and announces one short line", async () => {
    const results = await walkToPrograms(userEvent.setup());
    const log = screen.getByRole("log", { name: "Conversation" });
    expect(log.contains(results)).toBe(true);
    expect(results.closest("[aria-live]")?.getAttribute("aria-live")).toBe("off");
    const listed = search.ranking.ranked.length + search.ranking.alsoWorthALook.length;
    const line = within(log).getByText(
      `${listed === 1 ? "1 program" : `${listed} programs`} listed below, under Programs that fit.`,
    );
    // The log is live by its role; the line sits in it, outside the silenced cards.
    expect(log.contains(line)).toBe(true);
    expect(line.closest('[aria-live="off"]')).toBeNull();
  });

  it("starts the view at Programs that fit and puts focus on its heading when the cards arrive", async () => {
    const results = await walkToPrograms(userEvent.setup());
    const heading = within(results).getByRole("heading", { level: 2, name: "Programs that fit" });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    // The last scroll is to the heading's top, after the usual scroll to the end of the chat.
    expect(scrolled.at(-1)).toEqual({ el: heading, options: { block: "start" } });
    expect(scrolled.some((s) => s.el !== heading)).toBe(true);

    // A later turn scrolls to the end as usual and leaves the heading alone.
    queue.push({
      ...ok,
      messages: [assistant({ type: "text", text: "Anything else?" })],
      text: "Anything else?",
    });
    await userEvent.setup().type(screen.getByLabelText("Your message"), "Thanks{Enter}");
    await screen.findByText("Anything else?");
    expect(scrolled.at(-1)!.el).not.toBe(heading);
  });

  it("leaves focus and the view on Retry after a failed reply, and lands once Retry succeeds", async () => {
    // The confirm's reply fails but carries the programs; Retry gets the scripted success.
    queue.splice(-1, 0, {
      ...ok,
      programs: search,
      text: "Here is what fits.",
      notice: { kind: "retryable", message: "Try again" },
    });
    const user = userEvent.setup();
    const results = await walkToPrograms(user);
    const heading = within(results).getByRole("heading", { level: 2, name: "Programs that fit" });
    const retry = await screen.findByRole("button", { name: "Retry" });
    await waitFor(() => expect(document.activeElement).toBe(retry));
    // No scroll to the heading, which would leave the focused Retry below the view.
    expect(scrolled.some((s) => s.el === heading)).toBe(false);

    await user.click(retry);
    await screen.findByText("Here is what fits.", { selector: "li *" });
    await waitFor(() => expect(document.activeElement?.textContent).toBe("Programs that fit"));
    const landed = document.activeElement!;
    expect(scrolled.at(-1)).toEqual({ el: landed, options: { block: "start" } });
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
  });

  it("keeps the programs under their own card's answer when a later search confirm fails", async () => {
    const user = userEvent.setup();
    const changed = { ...personaAProfile, tuitionBudgetUsd: 40000 };
    queue.push(
      // "Lower my budget" → a second search card.
      {
        ...ok,
        messages: [assistant(toolUse("s2", "propose_search", { profile: changed }))],
        confirm: { toolUseId: "s2", profile: changed },
      },
      // Its "Looks right" fails.
      new Response("", { status: 503 }),
    );
    await walkToPrograms(user);
    await user.type(screen.getByLabelText("Your message"), "Lower my budget{Enter}");
    const second = await screen.findByRole("region", { name: "Here's what I'll search with" });
    await user.click(within(second).getByRole("button", { name: "Looks right" }));
    await screen.findByRole("button", { name: "Retry" });

    const log = screen.getByRole("log", { name: "Conversation" });
    const results = within(log).getByRole("region", { name: "Programs that fit" });
    const answers = within(log).getAllByText("Looks right");
    expect(answers).toHaveLength(3);
    // Under the first search card's answer, before the second's.
    expect(follows(answers[1]!, results)).toBe(true);
    expect(follows(results, answers[2]!)).toBe(true);
  });
});
