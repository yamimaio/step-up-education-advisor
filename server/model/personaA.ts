import { hasConfirmedDirection, latestTaps, type Message } from "../history";
import type { ModelRequest, ModelTurn } from "./adapter";
import { text, toolUse, turn } from "./fake";

// Persona A's stage 1 interview (personas/A.md) as a fake model: the advisor's side of the
// conversation, chosen from what the last message answers. The persona test drives it with the
// persona's taps, and MODEL_FAKE=1 serves it to the page for local work without spend (DQ17).
// The card is built from the taps in the history, so a page that taps other chips still gets a
// card the server accepts; a field with no tap (typed or skipped) is sent as declined.

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
  declined: [],
} as const;

// The direction the taps in the history give, with persona A's goal in words.
export function directionFromTaps(messages: Message[]) {
  const taps = latestTaps(messages);
  const declined: string[] = [];
  const tapped = (chipField: string, field = chipField) => {
    if (taps.has(chipField)) return taps.get(chipField);
    declined.push(field);
    return null;
  };
  const kind = tapped("careerGoalKind", "careerGoal");
  return {
    careerGoal: kind === null ? null : { kind, description: PERSONA_A_GOAL },
    goalClarity: "clear",
    needs: tapped("needs"),
    peerPreference: tapped("peerPreference"),
    maxProgramMonths: tapped("maxProgramMonths"),
    hoursPerWeek: tapped("hoursPerWeek"),
    keepWorking: tapped("keepWorking"),
    degreeRequired: tapped("degreeRequired"),
    resolvedTensions: [],
    declined,
  };
}

// check_contradictions gets the answers so far, without the declined fields (advisor.md).
function draftFromTaps(messages: Message[]) {
  const direction = directionFromTaps(messages);
  return Object.fromEntries(Object.entries(direction).filter(([, value]) => value !== null));
}

const propose = (request: ModelRequest, lead: string) =>
  turn(
    text(lead),
    toolUse(
      "propose_direction",
      { direction: directionFromTaps(request.messages) },
      `toolu_a_propose_${request.messages.length}`,
    ),
  );

const check = (request: ModelRequest) =>
  turn(
    toolUse(
      "check_contradictions",
      { profile: draftFromTaps(request.messages) },
      `toolu_a_check_${request.messages.length}`,
    ),
  );

export const VERDICT_TEXT =
  "An executive program is your step: you want a room of senior leaders more than a curriculum, and you can give it a year while you keep working.\n\nWant to see programs that fit?";

export const SIDE_QUESTION_REPLY =
  "Program facts like prices come from the program records once we look at programs, and admissions questions are for each school. For now, back to this one.";

type Field = (typeof CHIP_ORDER)[number];

const askBlock = (field: Field) =>
  toolUse("ask_choice", { field, question: QUESTIONS[field] }, `toolu_a_${field}`);

// What the user typed instead of tapping, from a chip answer's `typed`.
function typedIn(content: unknown): string | undefined {
  if (typeof content !== "string") return undefined;
  try {
    const typed = (JSON.parse(content) as { typed?: unknown }).typed;
    return typeof typed === "string" ? typed : undefined;
  } catch {
    return undefined;
  }
}

// The tool call the last message answers, if it answers one, whether the server refused it, and
// what the user typed instead of tapping.
function answered(request: ModelRequest): {
  name: string;
  input: Record<string, unknown>;
  isError: boolean;
  typed?: string;
} | null {
  const last = request.messages.at(-1);
  if (!last || typeof last.content === "string") return null;
  const result = last.content.find((b) => b.type === "tool_result");
  if (!result || result.type !== "tool_result") return null;
  const isError = result.is_error === true;
  for (const m of request.messages) {
    if (typeof m.content === "string") continue;
    for (const b of m.content) {
      if (b.type === "tool_use" && b.id === result.tool_use_id) {
        const typed = typedIn(result.content);
        return { name: b.name, input: b.input as Record<string, unknown>, isError, typed };
      }
    }
  }
  return null;
}

// True when the advisor has already shown the card.
const proposed = (request: ModelRequest) =>
  request.messages.some(
    (m) =>
      typeof m.content !== "string" &&
      m.content.some((b) => b.type === "tool_use" && b.name === "propose_direction"),
  );

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
  if (call?.isError) {
    // The server refused the call: say so and stop, rather than send the same call again.
    return turn(text("Something didn't line up on my side. Tell me what to change, or say go on."));
  }
  if (!call) {
    // A typed message: the opening, the goal in words, a reply after a refused call, or a yes to
    // programs after the verdict.
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
    if (asked(request, "degreeRequired") && !hasConfirmedDirection(request.messages)) {
      return check(request);
    }
    return turn(text("The program step is coming next. Your direction stands."));
  }
  if (call.name === "ask_choice") {
    const field = call.input.field as Field;
    const typed = call.typed?.trim() ?? "";
    if (typed.endsWith("?") && !/\bskip\b|rather not/i.test(typed)) {
      // A question typed while the chips are open: a reply in words and the same chips back, in
      // one turn (advisor.md, issue #192). A request to skip is a decline, even with a "?".
      return turn(
        text(SIDE_QUESTION_REPLY),
        toolUse(
          "ask_choice",
          { field, question: QUESTIONS[field] },
          `toolu_a_${field}_${request.messages.length}`,
        ),
      );
    }
    if (field === "careerGoalKind") {
      return turn(text("In your own words, what would that step up look like?"));
    }
    // A field asked again after the card is a correction: go back to the card.
    if (proposed(request)) return check(request);
    const next = CHIP_ORDER[CHIP_ORDER.indexOf(field) + 1];
    return next ? turn(askBlock(next)) : check(request);
  }
  if (call.name === "check_contradictions") return propose(request, "Here's what I understood.");
  // propose_direction: the verdict after a confirm. After a correction, the length is asked
  // again (the answer persona tests correct): a chip field changes only through a new tap.
  return hasConfirmedDirection(request.messages)
    ? turn(text(VERDICT_TEXT))
    : turn(
        text("Got it. Let's set that again."),
        toolUse(
          "ask_choice",
          { field: "maxProgramMonths", question: QUESTIONS.maxProgramMonths },
          `toolu_a_maxProgramMonths_${request.messages.length}`,
        ),
      );
}
