import { describe, expect, it } from "vitest";
import { z } from "zod";
import { personaAProfile } from "../../tests/fixtures/profiles";
import { ProfileSchema } from "../schema/profile";
import { CHIP_TARGET } from "./chips";
import { STAGE_1_CHECKLIST } from "./fields";
import {
  ADVISOR_TOOL_NAMES,
  ADVISOR_TOOLS,
  DECLINED_PLACEHOLDERS,
  AskChoiceInput,
  CheckContradictionsInput,
  DIRECTION_DECLINABLE,
  DirectionSchema,
  ProposeDirectionInput,
  STAGE_1_CHIP_FIELDS,
  STAGE_1_TOOL_NAMES,
  toEngineDirection,
  type Direction,
} from "./tools";

const stage1Fields = STAGE_1_CHECKLIST.flatMap((e) => e.fields);

// Persona A's stage 1 answers, taken from the fixture.
const direction: Direction = {
  careerGoal: personaAProfile.careerGoal,
  goalClarity: personaAProfile.goalClarity,
  needs: personaAProfile.needs,
  peerPreference: personaAProfile.peerPreference,
  maxProgramMonths: personaAProfile.maxProgramMonths,
  hoursPerWeek: personaAProfile.hoursPerWeek,
  keepWorking: personaAProfile.keepWorking,
  degreeRequired: personaAProfile.degreeRequired,
  resolvedTensions: [],
  otherTensions: [],
  declined: [],
};

describe("Stage 1 tools", () => {
  it("sends ask_choice, check_contradictions and propose_direction to the model", () => {
    expect(STAGE_1_TOOL_NAMES).toEqual(["ask_choice", "check_contradictions", "propose_direction"]);
    expect(ADVISOR_TOOL_NAMES.filter((n) => ADVISOR_TOOLS[n].stage === 1)).toEqual([
      ...STAGE_1_TOOL_NAMES,
    ]);
  });

  it("keeps propose_search a stub with no input schema", () => {
    expect(ADVISOR_TOOLS.propose_search.input).toBeNull();
    expect(ADVISOR_TOOLS.propose_search.stage).toBe(2);
  });

  it("pauses on ask_choice and propose_direction only", () => {
    expect(STAGE_1_TOOL_NAMES.filter((n) => ADVISOR_TOOLS[n].pauses)).toEqual([
      "ask_choice",
      "propose_direction",
    ]);
  });

  it("converts every wired input to JSON schema for the server", () => {
    for (const name of STAGE_1_TOOL_NAMES) {
      const input = ADVISOR_TOOLS[name].input;
      expect(() => z.toJSONSchema(input), name).not.toThrow();
    }
  });
});

describe("ask_choice offers exactly the stage 1 chip sets", () => {
  it("matches the stage 1 checklist chips", () => {
    expect([...STAGE_1_CHIP_FIELDS].sort()).toEqual(
      STAGE_1_CHECKLIST.flatMap((e) => e.chips).sort(),
    );
  });

  it("refuses a stage 2 chip set", () => {
    expect(
      AskChoiceInput.safeParse({ field: "tuitionBudgetUsd", question: "Budget?" }).success,
    ).toBe(false);
    expect(AskChoiceInput.safeParse({ field: "needs", question: "What is missing?" }).success).toBe(
      true,
    );
  });

  it("only fills stage 1 fields", () => {
    for (const f of STAGE_1_CHIP_FIELDS)
      expect(stage1Fields).toContain(CHIP_TARGET[f].split(".")[0]);
  });
});

describe("propose_direction carries the stage 1 answers and nothing else", () => {
  it("has every stage 1 field, plus tensions, a tie-breaker and declined", () => {
    expect(Object.keys(DirectionSchema.shape).sort()).toEqual(
      [...stage1Fields, "resolvedTensions", "otherTensions", "tieBreaker", "declined"].sort(),
    );
  });

  it("lets the user decline every stage 1 field but goalClarity", () => {
    expect([...DIRECTION_DECLINABLE].sort()).toEqual(
      stage1Fields.filter((f) => f !== "goalClarity").sort(),
    );
  });

  it("accepts persona A's stage 1 answers", () => {
    expect(ProposeDirectionInput.parse({ direction })).toEqual({ direction });
  });

  it("refuses a budget, a home or a stage 2 field in declined", () => {
    const parse = (d: object) => ProposeDirectionInput.safeParse({ direction: d }).success;
    expect(parse({ ...direction, tuitionBudgetUsd: 5000 })).toBe(false);
    expect(parse({ ...direction, homeCity: "Buenos Aires" })).toBe(false);
    expect(parse({ ...direction, declined: ["tuitionBudgetUsd"] })).toBe(false);
  });

  it("refuses fewer than 3 needs on the card, allows them in a draft", () => {
    const short = { ...direction, needs: ["senior_network"] };
    expect(ProposeDirectionInput.safeParse({ direction: short }).success).toBe(false);
    expect(
      CheckContradictionsInput.safeParse({ profile: { needs: ["senior_network"] } }).success,
    ).toBe(true);
  });
});

describe("A declined stage 1 field holds null, never an invented answer", () => {
  const parse = (d: object) => ProposeDirectionInput.safeParse({ direction: d }).success;

  it("accepts every declinable field as null when declined", () => {
    for (const field of DIRECTION_DECLINABLE) {
      expect(parse({ ...direction, [field]: null, declined: [field] }), field).toBe(true);
    }
  });

  it("refuses a value in a declined field, and null without declined", () => {
    expect(parse({ ...direction, declined: ["hoursPerWeek"] })).toBe(false);
    expect(parse({ ...direction, hoursPerWeek: null })).toBe(false);
  });

  it("gives the engine its placeholders and drops the fields it doesn't take", () => {
    const declined: Direction = {
      ...direction,
      needs: null,
      hoursPerWeek: null,
      declined: ["needs", "hoursPerWeek"],
    };
    const engine = toEngineDirection(declined);
    expect(engine.needs).toEqual(DECLINED_PLACEHOLDERS.needs);
    expect(engine.hoursPerWeek).toEqual(DECLINED_PLACEHOLDERS.hoursPerWeek);
    expect(engine.declined).toEqual(["needs", "hoursPerWeek"]);
    expect(engine).not.toHaveProperty("peerPreference");
    expect(engine).not.toHaveProperty("resolvedTensions");
    expect(engine).not.toHaveProperty("otherTensions");
    // Every field is a valid ProfileSchema value, as the engine's DirectionProfile requires.
    for (const [k, v] of Object.entries(engine)) {
      const schema = ProfileSchema.shape[k as keyof typeof ProfileSchema.shape];
      expect(schema.safeParse(v).success, k).toBe(true);
    }
  });

  it("passes answered fields through unchanged", () => {
    const engine = toEngineDirection(direction);
    expect(engine.needs).toEqual(direction.needs);
    expect(engine.hoursPerWeek).toEqual(direction.hoursPerWeek);
    expect(engine.careerGoal).toEqual(direction.careerGoal);
  });
});

describe("Off-rule tensions are kept for finding new rules", () => {
  const parse = (otherTensions: unknown) =>
    ProposeDirectionInput.safeParse({ direction: { ...direction, otherTensions } }).success;
  const tension = {
    fields: ["needs", "hoursPerWeek"],
    tension: "Wants depth first but can give little time each week",
    chosen: "Time: a shorter, lighter step for now",
  };

  it("accepts up to two, with profile field names", () => {
    expect(parse([tension])).toBe(true);
    expect(parse([tension, { ...tension, fields: ["keepWorking", "tuitionBudgetUsd"] }])).toBe(
      true,
    );
  });

  it("refuses a third, an unknown field, a repeated field or an empty sentence", () => {
    expect(parse([tension, tension, tension])).toBe(false);
    expect(parse([{ ...tension, fields: ["salary"] }])).toBe(false);
    expect(parse([{ ...tension, fields: ["needs", "needs"] }])).toBe(false);
    expect(parse([{ ...tension, tension: "  " }])).toBe(false);
    expect(parse([{ ...tension, fields: [] }])).toBe(false);
  });

  it("never reaches the engine", () => {
    const engine = toEngineDirection({ ...direction, otherTensions: [tension] } as Direction);
    expect(engine).not.toHaveProperty("otherTensions");
    expect(engine).toEqual(toEngineDirection(direction));
  });
});
