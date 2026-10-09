import { CHIPS, type ChipField } from "@core/advisor/chips";
import { CHECKLIST } from "@core/advisor/fields";
import { toEngineDirection, type Direction } from "@core/advisor/tools";
import { loadPrograms } from "@core/data/load";
import { recommendCategory } from "@core/engine/direction";
import { blocksOf, type Block, type ChatResponse, type MessageParam } from "@app/lib/chatTypes";

// TEMPORARY: a scripted Stage 1 interview that answers in the docs/chat-api.md shapes, so the
// page runs before step 6's /api/chat lands. Step 6 replaces this file and route.ts. No model
// call: the advisor's lines are fixed, the chip values come from CHIPS and the verdict from
// recommendCategory, like the real server.

type Step =
  { kind: "ask"; text: string; field: ChipField; question: string } | { kind: "say"; text: string };

const SCRIPT: Step[] = [
  {
    kind: "ask",
    text: "Thanks, that helps. Which of these is closer to what you want next?",
    field: "careerGoalKind",
    question: "What you want next",
  },
  { kind: "say", text: "What does that look like for you, in a sentence or two?" },
  {
    kind: "ask",
    text: "What's missing today that a program should give you?",
    field: "needs",
    question: "What's missing, most important first",
  },
  {
    kind: "ask",
    text: "Who would you want in the room with you?",
    field: "peerPreference",
    question: "Your classmates",
  },
  {
    kind: "ask",
    text: "How long a program could you take on right now?",
    field: "maxProgramMonths",
    question: "The longest program you'd take on now",
  },
  {
    kind: "ask",
    text: "And how many hours a week could you give it?",
    field: "hoursPerWeek",
    question: "Hours a week",
  },
  {
    kind: "ask",
    text: "Would you keep working while you study?",
    field: "keepWorking",
    question: "Keep working",
  },
  {
    kind: "ask",
    text: "Last one: do you need the program to give you a degree?",
    field: "degreeRequired",
    question: "A degree",
  },
];

const AFTER_VERDICT =
  "Program matching is the next part of Step Up and isn't connected yet. You can download the transcript to keep this verdict.";

const pick = (field: ChipField) => CHECKLIST.find((e) => e.chips.includes(field))?.pick ?? 1;
const json = (value: unknown) => JSON.stringify(value);

function parse(content: unknown): Record<string, unknown> | null {
  try {
    return typeof content === "string" ? (JSON.parse(content) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function assistant(id: string, text: string, tool?: { name: string; input: unknown }) {
  const content: Block[] = [{ type: "text", text }];
  if (tool) content.push({ type: "tool_use", id, ...tool });
  return { role: "assistant", content } satisfies MessageParam;
}

function toolUses(history: MessageParam[]): Map<string, Block> {
  const uses = new Map<string, Block>();
  for (const m of history) {
    if (m.role !== "assistant") continue;
    for (const b of blocksOf(m)) if (b.type === "tool_use") uses.set(String(b.id), b);
  }
  return uses;
}

// The value of each chip the user tapped, read from the (rewritten) results in the history.
function tapped(history: MessageParam[]): Map<ChipField, unknown> {
  const uses = toolUses(history);
  const taps = new Map<ChipField, unknown>();
  for (const m of history) {
    if (m.role !== "user") continue;
    for (const b of blocksOf(m)) {
      if (b.type !== "tool_result") continue;
      const use = uses.get(String(b.tool_use_id));
      const answer = parse(b.content);
      if (use?.name !== "ask_choice" || !Array.isArray(answer?.chosen)) continue;
      const field = (use.input as { field: ChipField }).field;
      const values = (answer.chosen as { value: unknown }[]).map((c) => c.value);
      if (values.length > 0) taps.set(field, pick(field) > 1 ? values : values[0]);
    }
  }
  return taps;
}

function userTexts(history: MessageParam[]): string[] {
  return history
    .filter((m) => m.role === "user")
    .flatMap((m) => blocksOf(m))
    .flatMap((b) => (b.type === "text" && typeof b.text === "string" ? [b.text] : []));
}

function buildDirection(history: MessageParam[]): Direction {
  const taps = tapped(history);
  const declined: Direction["declined"] = [];
  const get = <T>(field: ChipField, name: Direction["declined"][number]): T | null => {
    if (taps.has(field)) return taps.get(field) as T;
    declined.push(name);
    return null;
  };
  const kind = get<"step_up" | "grow_in_role">("careerGoalKind", "careerGoal");
  // The user's words after the goal question (the second thing they typed).
  const description = userTexts(history)[1] ?? "";
  return {
    careerGoal: kind ? { kind, description } : null,
    goalClarity: "clear",
    needs: get("needs", "needs"),
    peerPreference: get("peerPreference", "peerPreference"),
    maxProgramMonths: get("maxProgramMonths", "maxProgramMonths"),
    hoursPerWeek: get("hoursPerWeek", "hoursPerWeek"),
    keepWorking: get("keepWorking", "keepWorking"),
    degreeRequired: get("degreeRequired", "degreeRequired"),
    resolvedTensions: [],
    declined,
  };
}

const EMPTY: ChatResponse = {
  replaceLastUserMessage: null,
  messages: [],
  text: "",
  chips: null,
  confirm: null,
  direction: null,
  counter: null,
  notice: null,
};

export class BadRequest extends Error {}

export function fakeChat(history: MessageParam[]): ChatResponse {
  const last = history.at(-1);
  if (!last || last.role !== "user") throw new BadRequest();
  const n = history.length;
  const uses = toolUses(history);
  const lastBlock = blocksOf(last)[0];

  // Rewrite the answer to a pending tool, as the real server does.
  let replace: MessageParam | null = null;
  if (lastBlock?.type === "tool_result") {
    const use = uses.get(String(lastBlock.tool_use_id));
    const answer = parse(lastBlock.content);
    if (!use || !answer) throw new BadRequest();
    if (use.name === "propose_direction") {
      if (answer.confirmed === true) {
        const direction = (use.input as { direction: Direction }).direction;
        const result = recommendCategory(toEngineDirection(direction), loadPrograms());
        const rewritten = {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: use.id,
              content: json({ confirmed: true, result }),
            },
          ],
        } satisfies MessageParam;
        const winner = result.category.winner;
        const text = result.noProgram.triggered
          ? "Here's my honest read: not yet. The card above says why. Want to talk through what would change that?"
          : `Here's my read, from your answers: ${winner ? "the type of program on the card above" : "two types tie"} fits best. Want to see programs that fit?`;
        return {
          ...EMPTY,
          replaceLastUserMessage: rewritten,
          messages: [assistant(`toolu_fake_${n}`, text)],
          text,
          direction: result,
        };
      }
      // A correction: show the card again (the fake doesn't apply it).
      return propose(history, n, null, "Thanks, I've noted that. Here's the updated picture.");
    }
    if (use.name === "ask_choice") {
      const field = (use.input as { field: ChipField }).field;
      const chips: readonly { label: string; value: unknown }[] = CHIPS[field];
      const labels = Array.isArray(answer.chosen) ? (answer.chosen as unknown[]) : [];
      const chosen = labels.map((label) => {
        const chip = chips.find((c) => c.label === label);
        if (!chip) throw new BadRequest();
        return { label: chip.label, value: chip.value };
      });
      if (chosen.length > 0) {
        replace = {
          role: "user",
          content: [{ type: "tool_result", tool_use_id: use.id, content: json({ chosen }) }],
        };
      }
    }
  } else if (lastBlock?.type === "text" && !String(lastBlock.text ?? "").trim()) {
    return {
      ...EMPTY,
      notice: { kind: "empty_input", message: "Tell me a little more, in your own words." },
    };
  }

  // After the verdict, the interview is over.
  if ([...uses.values()].some((u) => u.name === "propose_direction")) {
    return {
      ...EMPTY,
      replaceLastUserMessage: replace,
      messages: [assistant("", AFTER_VERDICT)],
      text: AFTER_VERDICT,
    };
  }

  // The next script step: one per assistant turn so far.
  const asked = history.filter((m) => m.role === "assistant").length;
  const step = SCRIPT[asked];
  if (!step) return propose([...history.slice(0, -1), replace ?? last], n, replace, "");
  const id = `toolu_fake_${n}`;
  if (step.kind === "say") {
    return {
      ...EMPTY,
      replaceLastUserMessage: replace,
      messages: [assistant(id, step.text)],
      text: step.text,
    };
  }
  const input = { field: step.field, question: step.question };
  return {
    ...EMPTY,
    replaceLastUserMessage: replace,
    messages: [assistant(id, step.text, { name: "ask_choice", input })],
    text: step.text,
    chips: {
      toolUseId: id,
      field: step.field,
      question: step.question,
      options: CHIPS[step.field].map((c) => ({ label: c.label, value: c.value })),
      pick: pick(step.field),
    },
  };
}

// check_contradictions as a server round (no tensions fire in the fake), then the confirm card.
function propose(
  history: MessageParam[],
  n: number,
  replace: MessageParam | null,
  lead: string,
): ChatResponse {
  const direction = buildDirection(history);
  const checkId = `toolu_fake_${n}_check`;
  const id = `toolu_fake_${n}`;
  const text = lead || "Here's what I understood. Does it look right?";
  const messages: MessageParam[] = [
    {
      role: "assistant",
      content: [
        {
          type: "tool_use",
          id: checkId,
          name: "check_contradictions",
          input: { profile: direction },
        },
      ],
    },
    {
      role: "user",
      content: [{ type: "tool_result", tool_use_id: checkId, content: json({ tensions: [] }) }],
    },
    assistant(id, text, { name: "propose_direction", input: { direction } }),
  ];
  return {
    ...EMPTY,
    replaceLastUserMessage: replace,
    messages,
    text,
    confirm: { toolUseId: id, direction },
  };
}
