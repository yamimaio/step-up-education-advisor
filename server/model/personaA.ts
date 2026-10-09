import type { ModelRequest, ModelTurn } from "./adapter";
import { text, toolUse, turn } from "./fake";

// Persona A's stage 1 interview (personas/A.md) as a fake model: the advisor's side of the
// conversation, chosen from what the last message answers. The persona test drives it with the
// persona's taps, and MODEL_FAKE=1 serves it to the page for local work without spend (DQ17).

const CHIP_ORDER = [
  "careerGoalKind",
  "needs",
  "peerPreference",
  "maxProgramMonths",
  "hoursPerWeek",
  "keepWorking",
  "degreeRequired",
] as const;

const QUESTIONS: Record<(typeof CHIP_ORDER)[number], string> = {
  careerGoalKind: "Which is closer to your goal?",
  needs: "Rank the top 3 things missing today",
  peerPreference: "Who do you want as classmates?",
  maxProgramMonths: "The longest program you'd take on now",
  hoursPerWeek: "Hours a week you could give it",
  keepWorking: "Do you need to keep working?",
  degreeRequired: "Does the role you want require a graduate degree?",
};

export const PERSONA_A_GOAL = "Move into an executive role";

// Persona A's stage 1 answers as chip values (personas/A.md, "True answers").
export const PERSONA_A_DIRECTION = {
  careerGoal: { kind: "step_up", description: PERSONA_A_GOAL },
  goalClarity: "clear",
  needs: ["senior_network", "leadership_skills", "deep_expertise"],
  peerPreference: "more_senior",
  maxProgramMonths: 12,
  hoursPerWeek: { min: 5, max: 10 },
  keepWorking: true,
  degreeRequired: "no",
  resolvedTensions: [],
  // Strict tool inputs send every property; an unset optional one is null.
  tieBreaker: null,
  declined: [],
} as const;

export const VERDICT_TEXT =
  "An executive program is your step: you want a room of senior leaders more than a curriculum, and you can give it a year while you keep working.\n\nWant to see programs that fit?";

type Field = (typeof CHIP_ORDER)[number];

const askBlock = (field: Field) =>
  toolUse("ask_choice", { field, question: QUESTIONS[field] }, `toolu_a_${field}`);

// The tool call the last message answers, if it answers one.
function answered(request: ModelRequest): { name: string; input: Record<string, unknown> } | null {
  const last = request.messages.at(-1);
  if (!last || typeof last.content === "string") return null;
  const result = last.content.find((b) => b.type === "tool_result");
  if (!result || result.type !== "tool_result") return null;
  for (const m of request.messages) {
    if (typeof m.content === "string") continue;
    for (const b of m.content) {
      if (b.type === "tool_use" && b.id === result.tool_use_id) {
        return { name: b.name, input: b.input as Record<string, unknown> };
      }
    }
  }
  return null;
}

// True when the advisor has already shown the chips for this field.
const asked = (request: ModelRequest, field: Field) =>
  request.messages.some(
    (m) =>
      typeof m.content !== "string" &&
      m.content.some(
        (b) => b.type === "tool_use" && (b.input as { field?: unknown }).field === field,
      ),
  );

export function personaAScript(request: ModelRequest): ModelTurn {
  const call = answered(request);
  if (!call) {
    // A typed message: the opening, the goal in words, or a yes to programs after the verdict.
    if (!asked(request, "careerGoalKind")) {
      return turn(
        text("Let's find the step that fits. First, your goal."),
        askBlock("careerGoalKind"),
      );
    }
    if (!asked(request, "needs")) {
      return turn(
        text("So the next job is running a whole function. What's missing today to get there?"),
        askBlock("needs"),
      );
    }
    return turn(text("The program step is coming next. Your direction stands."));
  }
  if (call.name === "ask_choice") {
    const field = call.input.field as Field;
    if (field === "careerGoalKind") {
      return turn(text("In your own words, what would that step up look like?"));
    }
    const next = CHIP_ORDER[CHIP_ORDER.indexOf(field) + 1];
    if (next) return turn(askBlock(next));
    // check_contradictions takes the draft, which has no tieBreaker.
    const profile = Object.fromEntries(
      Object.entries(PERSONA_A_DIRECTION).filter(([key]) => key !== "tieBreaker"),
    );
    return turn(toolUse("check_contradictions", { profile }, "toolu_a_check"));
  }
  if (call.name === "check_contradictions") {
    return turn(
      text("Here's what I understood."),
      toolUse("propose_direction", { direction: PERSONA_A_DIRECTION }, "toolu_a_propose"),
    );
  }
  // propose_direction: the verdict after a confirm; after a correction, the card again.
  const last = request.messages.at(-1)!;
  const confirmed =
    typeof last.content !== "string" &&
    last.content.some(
      (b) =>
        b.type === "tool_result" &&
        typeof b.content === "string" &&
        b.content.startsWith('{"confirmed":true'),
    );
  if (!confirmed) {
    return turn(
      text("Thanks, here's the card again."),
      toolUse(
        "propose_direction",
        { direction: PERSONA_A_DIRECTION },
        `toolu_a_propose_${request.messages.length}`,
      ),
    );
  }
  return turn(text(VERDICT_TEXT));
}
