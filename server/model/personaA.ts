import { CHIP_TARGET } from "../../core/advisor/chips";
import { STAGE_2_CHIP_FIELDS, type SearchAnswers } from "../../core/advisor/tools";
import { hasConfirmedDirection, latestTaps, parseJson, type Message } from "../history";
import type { ModelRequest, ModelTurn } from "./adapter";
import { text, toolUse, turn } from "./fake";

// Persona A's interview, both stages (personas/A.md), as a fake model: the advisor's side of
// the conversation, chosen from what the last message answers. The persona test drives it with
// the persona's taps, and MODEL_FAKE=1 serves it to the page for local work without spend (DQ17).
// The cards are built from the taps in the history, so a page that taps other chips still gets
// cards the server accepts; a field with no tap (typed or skipped) is sent as declined. Free-text
// answers (the goal, the home, the background) are persona A's, whatever the page typed.

const CHIP_ORDER = [
  "careerGoalKind",
  "needs",
  "peerPreference",
  "maxProgramMonths",
  "hoursPerWeek",
  "keepWorking",
  "degreeRequired",
] as const;

// Stage 2's chips, asked after the typed home and background question.
const STAGE_2_ORDER = [
  "tuitionBudgetUsd",
  "paymentPlan",
  "travelBudgetUsd",
  "travelComfort",
  "formatPreference",
  "maxOnsiteDays",
  "maxStretchDays",
  "relocate",
  "airfareRange",
  "locationValues",
  "degreeLevel",
  "currentRole",
] as const;

type Field = (typeof CHIP_ORDER)[number] | (typeof STAGE_2_ORDER)[number];

const QUESTIONS: Record<Field, string> = {
  careerGoalKind: "Which is closer to your goal?",
  needs: "Rank the top 3 things missing today",
  peerPreference: "Who do you want as classmates?",
  maxProgramMonths: "The longest program you'd take on now",
  hoursPerWeek: "Hours a week you could give it",
  keepWorking: "Do you need to keep working?",
  degreeRequired: "Does the role you want require a graduate degree?",
  tuitionBudgetUsd: "Your tuition budget",
  paymentPlan: "How would you pay for it?",
  travelBudgetUsd: "A separate budget for travel and housing",
  travelComfort: "How do you feel about traveling for a program?",
  formatPreference: "How would you like to study?",
  maxOnsiteDays: "Days a year you could spend on site",
  maxStretchDays: "The longest stretch you could be away",
  relocate: "Would you relocate for a program?",
  airfareRange: "A typical round trip to the US from home",
  locationValues: "What should a location give you? Pick 2",
  degreeLevel: "Your highest degree",
  currentRole: "Your current role",
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

// Persona A's free-text stage 2 answers, as the advisor would fill them in (personas/A.md).
const PERSONA_A_HOME = {
  homeCity: "Buenos Aires",
  homeRegion: "C",
  homeCountry: "AR",
  homeLat: -34.6037,
  homeLon: -58.3816,
};
const PERSONA_A_BACKGROUND = { yearsExperience: 16, yearsLeading: 12, degreeField: "Engineering" };

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

// The search card persona A's advisor sends: the home and background in persona A's words, and
// every stage 2 chip field with no tap in the history named in `declined` (the server fills the
// chip answers from the taps).
export function searchFromTaps(messages: Message[]): SearchAnswers {
  const taps = latestTaps(messages);
  const declined = STAGE_2_CHIP_FIELDS.filter((f) => !taps.has(f)).map(
    (f) => CHIP_TARGET[f].split(".")[0] as SearchAnswers["declined"][number],
  );
  return {
    ...PERSONA_A_HOME,
    yearsExperience: PERSONA_A_BACKGROUND.yearsExperience,
    yearsLeading: PERSONA_A_BACKGROUND.yearsLeading,
    degreeField: PERSONA_A_BACKGROUND.degreeField,
    resolvedTensions: [],
    declined,
  };
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

const proposeSearch = (request: ModelRequest) =>
  turn(
    text("Here's what I'll search with."),
    toolUse(
      "propose_search",
      { search: searchFromTaps(request.messages) },
      `toolu_a_search_${request.messages.length}`,
    ),
  );

// The rules run on the taps; persona A resolves no tension and declines no rule field.
const check = (request: ModelRequest) =>
  turn(
    toolUse(
      "check_contradictions",
      { resolvedTensions: [], declined: [] },
      `toolu_a_check_${request.messages.length}`,
    ),
  );

export const VERDICT_TEXT =
  "An executive program is your step: you want a room of senior leaders more than a curriculum, and you can give it a year while you keep working.\n\nWant to see programs that fit?";

export const PERSONA_A_PROGRAMS_YES = "Yes, show me programs.";

export const BACKGROUND_QUESTION =
  "Where do you live? And a little background: years of experience, years leading people, and what your degree is in.";

export const PERSONA_A_BACKGROUND_ANSWER =
  "Buenos Aires. Sixteen years of experience, twelve of them leading teams, and a degree in engineering.";

export const RESULTS_TEXT =
  "Here are the programs that fit, ranked by the three needs you named. Each card shows the program's own facts and how sure the data is.";

export const SIDE_QUESTION_REPLY =
  "Program facts like prices come from the program records once we look at programs, and admissions questions are for each school. For now, back to this one.";

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

// The tool call the last message answers, if it answers one, whether the server refused it,
// whether the user confirmed it, and what the user typed instead of tapping.
function answered(request: ModelRequest): {
  name: string;
  input: Record<string, unknown>;
  isError: boolean;
  confirmed: boolean;
  typed?: string;
} | null {
  const last = request.messages.at(-1);
  if (!last || typeof last.content === "string") return null;
  const result = last.content.find((b) => b.type === "tool_result");
  if (!result || result.type !== "tool_result") return null;
  const isError = result.is_error === true;
  const answer = parseJson(result.content) as { confirmed?: unknown } | undefined;
  const confirmed = answer?.confirmed === true;
  for (const m of request.messages) {
    if (typeof m.content === "string") continue;
    for (const b of m.content) {
      if (b.type === "tool_use" && b.id === result.tool_use_id) {
        const typed = typedIn(result.content);
        return {
          name: b.name,
          input: b.input as Record<string, unknown>,
          isError,
          confirmed,
          typed,
        };
      }
    }
  }
  return null;
}

// True when the advisor has already shown this card.
const proposed = (request: ModelRequest, card: "propose_direction" | "propose_search") =>
  request.messages.some(
    (m) =>
      typeof m.content !== "string" &&
      m.content.some((b) => b.type === "tool_use" && b.name === card),
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

// True when the advisor has already said this text.
const said = (request: ModelRequest, words: string) =>
  request.messages.some(
    (m) =>
      m.role === "assistant" &&
      typeof m.content !== "string" &&
      m.content.some((b) => b.type === "text" && b.text === words),
  );

// After the verdict: a typed message is the yes to programs, then the home and background.
function stage2Typed(request: ModelRequest): ModelTurn {
  if (!said(request, BACKGROUND_QUESTION)) return turn(text(BACKGROUND_QUESTION));
  if (!asked(request, STAGE_2_ORDER[0])) {
    return turn(text("Thanks. Now the practical side."), askBlock(STAGE_2_ORDER[0]));
  }
  if (said(request, RESULTS_TEXT)) return turn(text("Your shortlist stands."));
  return check(request);
}

export function personaAScript(request: ModelRequest): ModelTurn {
  const call = answered(request);
  if (call?.isError) {
    // The server refused the call: say so and stop, rather than send the same call again.
    return turn(text("Something didn't line up on my side. Tell me what to change, or say go on."));
  }
  if (!call) {
    // A typed message: the opening, the goal in words, a reply after a refused call, the yes to
    // programs after the verdict, or the home and background.
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
    if (hasConfirmedDirection(request.messages)) return stage2Typed(request);
    if (asked(request, "degreeRequired")) return check(request);
    return turn(text("Tell me a bit more."));
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
    const stage2 = (STAGE_2_ORDER as readonly Field[]).includes(field);
    // A field asked again after its stage's card is a correction: go back to the card.
    if (proposed(request, stage2 ? "propose_search" : "propose_direction")) return check(request);
    const order: readonly Field[] = stage2 ? STAGE_2_ORDER : CHIP_ORDER;
    const next = order[order.indexOf(field) + 1];
    return next ? turn(askBlock(next)) : check(request);
  }
  if (call.name === "check_contradictions") {
    return hasConfirmedDirection(request.messages)
      ? proposeSearch(request)
      : propose(request, "Here's what I understood.");
  }
  if (call.name === "propose_search") {
    // After a correction, the tuition budget is asked again: a chip field changes only
    // through a new tap.
    return call.confirmed
      ? turn(text(RESULTS_TEXT))
      : turn(
          text("Got it. Let's set that again."),
          toolUse(
            "ask_choice",
            { field: "tuitionBudgetUsd", question: QUESTIONS.tuitionBudgetUsd },
            `toolu_a_tuitionBudgetUsd_${request.messages.length}`,
          ),
        );
  }
  // propose_direction: the verdict after a confirm. After a correction, the length is asked
  // again (the answer persona tests correct): a chip field changes only through a new tap.
  return call.confirmed
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
