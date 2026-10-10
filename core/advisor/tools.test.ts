import { describe, expect, it } from "vitest";
import { z } from "zod";
import { fixtureDataset } from "../../tests/fixtures/dataset";
import { personaAProfile } from "../../tests/fixtures/profiles";
import { checkContradictions } from "../engine/contradictions";
import { ProfileSchema, type Profile } from "../schema/profile";
import { CHIP_FIELDS, CHIP_TARGET } from "./chips";
import { pickOf, STAGE_1_CHECKLIST, STAGE_2_CHECKLIST } from "./fields";
import {
  ADVISOR_TOOL_NAMES,
  ADVISOR_TOOLS,
  DECLINED_PLACEHOLDERS,
  AskChoiceInput,
  CheckContradictionsInput,
  DIRECTION_DECLINABLE,
  DirectionSchema,
  ProposeDirectionInput,
  ProposeSearchInput,
  SEARCH_DECLINABLE,
  searchProfile,
  STAGE_1_CHIP_FIELDS,
  STAGE_2_CHIP_FIELDS,
  STAGE_2_PLACEHOLDERS,
  TENSION_FIELDS,
  toEngineDirection,
  toEngineProfile,
  type Direction,
  type SearchAnswers,
} from "./tools";

const stage1Fields = STAGE_1_CHECKLIST.flatMap((e) => e.fields);
const stage2Fields = STAGE_2_CHECKLIST.flatMap((e) => e.fields);

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
  declined: [],
};

describe("the tools sent to the model", () => {
  it("are every advisor tool, both stages, in a fixed order", () => {
    expect(ADVISOR_TOOL_NAMES).toEqual([
      "ask_choice",
      "check_contradictions",
      "propose_direction",
      "propose_search",
    ]);
    expect(ADVISOR_TOOLS.propose_search.stage).toBe(2);
  });

  it("pause on ask_choice and the two cards only", () => {
    expect(ADVISOR_TOOL_NAMES.filter((n) => ADVISOR_TOOLS[n].pauses)).toEqual([
      "ask_choice",
      "propose_direction",
      "propose_search",
    ]);
  });

  it("convert every input to JSON schema for the server", () => {
    for (const name of ADVISOR_TOOL_NAMES) {
      expect(() => z.toJSONSchema(ADVISOR_TOOLS[name].input), name).not.toThrow();
    }
  });
});

describe("ask_choice offers every chip set, split by stage", () => {
  it("matches the checklist chips of each stage", () => {
    expect([...STAGE_1_CHIP_FIELDS].sort()).toEqual(
      STAGE_1_CHECKLIST.flatMap((e) => e.chips).sort(),
    );
    expect([...STAGE_2_CHIP_FIELDS].sort()).toEqual(
      STAGE_2_CHECKLIST.flatMap((e) => e.chips).sort(),
    );
    expect([...STAGE_1_CHIP_FIELDS, ...STAGE_2_CHIP_FIELDS].sort()).toEqual(
      [...CHIP_FIELDS].sort(),
    );
  });

  it("accepts a stage 2 chip set (the server keeps it for after the direction)", () => {
    expect(
      AskChoiceInput.safeParse({ field: "tuitionBudgetUsd", question: "Budget?" }).success,
    ).toBe(true);
    expect(AskChoiceInput.safeParse({ field: "homeCity", question: "Where?" }).success).toBe(false);
  });

  it("fills stage 1 fields from stage 1 chips and stage 2 fields from stage 2 chips", () => {
    for (const f of STAGE_1_CHIP_FIELDS)
      expect(stage1Fields).toContain(CHIP_TARGET[f].split(".")[0]);
    for (const f of STAGE_2_CHIP_FIELDS)
      expect(stage2Fields).toContain(CHIP_TARGET[f].split(".")[0]);
  });

  it("takes 3 needs and 2 location values, one of everything else", () => {
    expect(pickOf("needs")).toBe(3);
    expect(pickOf("locationValues")).toBe(2);
    expect(pickOf("tuitionBudgetUsd")).toBe(1);
    expect(pickOf("degreeLevel")).toBe(1);
  });
});

// The real API refused bigger schemas (decisions.md, "The real API refused the stage 2
// schemas"): the model sends only what it learned in conversation, the taps give the rest.
describe("check_contradictions takes only the resolved tensions and the declined fields", () => {
  it("accepts them, and nothing else", () => {
    const input = { resolvedTensions: [{ rule: "R4", chosen: "time" }], declined: ["needs"] };
    expect(CheckContradictionsInput.safeParse(input).success).toBe(true);
    expect(
      CheckContradictionsInput.safeParse({ ...input, needs: ["senior_network"] }).success,
    ).toBe(false);
    expect(CheckContradictionsInput.safeParse({ resolvedTensions: [] }).success).toBe(false);
  });

  it("refuses a rule that doesn't exist and a field no rule reads", () => {
    expect(
      CheckContradictionsInput.safeParse({
        resolvedTensions: [{ rule: "R9", chosen: "x" }],
        declined: [],
      }).success,
    ).toBe(false);
    expect(
      CheckContradictionsInput.safeParse({ resolvedTensions: [], declined: ["paymentPlan"] })
        .success,
    ).toBe(false);
  });
});

const answersA: SearchAnswers = {
  homeCity: personaAProfile.homeCity,
  homeRegion: personaAProfile.homeRegion,
  homeCountry: personaAProfile.homeCountry,
  homeLat: personaAProfile.homeLat,
  homeLon: personaAProfile.homeLon,
  yearsExperience: personaAProfile.yearsExperience,
  yearsLeading: personaAProfile.yearsLeading,
  degreeField: personaAProfile.degree.field,
  resolvedTensions: [],
  declined: [],
};

// Persona A's latest taps as values by chip field (personas/A.md).
const tapsA = new Map<string, unknown>([
  ["tuitionBudgetUsd", 80000],
  ["paymentPlan", "installments"],
  ["travelBudgetUsd", 10000],
  ["travelComfort", "appeal"],
  ["formatPreference", "blended"],
  ["maxOnsiteDays", 20],
  ["maxStretchDays", 7],
  ["relocate", false],
  ["airfareRange", "1000_1500"],
  ["locationValues", ["immersion", "network_density"]],
  ["degreeLevel", "bachelor"],
  ["currentRole", "manager"],
]);

describe("propose_search takes only the answers with no chips", () => {
  it("accepts persona A's answers, and refuses a chip or stage 1 answer", () => {
    expect(ProposeSearchInput.parse({ search: answersA })).toEqual({ search: answersA });
    for (const extra of [{ tuitionBudgetUsd: 5000 }, { needs: ["senior_network"] }]) {
      expect(ProposeSearchInput.safeParse({ search: { ...answersA, ...extra } }).success).toBe(
        false,
      );
    }
  });

  it("declines only stage 2 fields", () => {
    expect([...SEARCH_DECLINABLE].sort()).toEqual(stage2Fields.sort());
  });
});

describe("searchProfile builds the stage 2 profile from the taps", () => {
  it("rebuilds persona A's profile", () => {
    const { profile, missing } = searchProfile(direction, answersA, tapsA);
    expect(missing).toEqual([]);
    expect(profile).toEqual(personaAProfile);
  });

  it("lists a chip field neither tapped nor declined", () => {
    const taps = new Map(tapsA);
    taps.delete("currentRole");
    taps.delete("degreeLevel");
    expect(searchProfile(direction, answersA, taps).missing).toEqual([
      "degreeLevel",
      "currentRole",
    ]);
  });

  it("gives a declined chip field its placeholder, even after a tap", () => {
    const answers: SearchAnswers = { ...answersA, declined: ["travelBudgetUsd", "degree"] };
    const { profile, missing } = searchProfile(direction, answers, tapsA);
    expect(missing).toEqual([]);
    expect(profile.travelBudgetUsd).toBe(STAGE_2_PLACEHOLDERS.travelBudgetUsd);
    expect(profile.degree.level).toBe(STAGE_2_PLACEHOLDERS.degreeLevel);
    expect(profile.declined).toEqual(["travelBudgetUsd", "degree"]);
    expect(ProfileSchema.safeParse(profile).success).toBe(true);
  });

  it("gives every declined chip field a value ProfileSchema accepts", () => {
    const all = { ...answersA, declined: [...SEARCH_DECLINABLE] };
    const home = { homeCity: "", homeRegion: null, homeCountry: "", homeLat: null, homeLon: null };
    const { profile, missing } = searchProfile(direction, { ...all, ...home }, new Map());
    expect(missing).toEqual([]);
    expect(ProfileSchema.safeParse(profile).success).toBe(true);
  });

  it("takes stage 1 answers from the direction, never from the taps", () => {
    const taps = new Map([...tapsA, ["maxProgramMonths", 24]]);
    expect(searchProfile(direction, answersA, taps).profile.maxProgramMonths).toBe(12);
  });
});

describe("toEngineProfile runs stage 2 on the confirmed direction", () => {
  it("rebuilds persona A's profile from the direction and the card", () => {
    expect(toEngineProfile(direction, personaAProfile)).toEqual(personaAProfile);
  });

  it("takes stage 1 answers from the direction, never from the card", () => {
    const card = {
      ...personaAProfile,
      maxProgramMonths: 24,
      needs: ["graduate_degree", "deep_expertise", "senior_network"],
    } as typeof personaAProfile;
    const engine = toEngineProfile(direction, card);
    expect(engine.maxProgramMonths).toBe(12);
    expect(engine.needs).toEqual(direction.needs);
  });

  it("gives a declined stage 1 field its placeholder and keeps both declined lists", () => {
    const declined: Direction = {
      ...direction,
      hoursPerWeek: null,
      peerPreference: null,
      declined: ["hoursPerWeek", "peerPreference"],
    };
    const card = { ...personaAProfile, declined: ["travelBudgetUsd", "hoursPerWeek"] };
    const engine = toEngineProfile(declined, card);
    expect(engine.hoursPerWeek).toEqual(DECLINED_PLACEHOLDERS.hoursPerWeek);
    expect(engine.peerPreference).toBe(DECLINED_PLACEHOLDERS.peerPreference);
    expect(engine.declined).toEqual(["hoursPerWeek", "peerPreference", "travelBudgetUsd"]);
    expect(ProfileSchema.safeParse(engine).success).toBe(true);
  });

  it("keeps the direction's tie-breaker and the tensions of both cards", () => {
    const tied: Direction = {
      ...direction,
      tieBreaker: "executive",
      resolvedTensions: [{ rule: "R4", chosen: "time" }],
    };
    const card = {
      ...personaAProfile,
      tieBreaker: "emba" as const,
      resolvedTensions: [
        { rule: "R4", chosen: "depth" },
        { rule: "R1", chosen: "network" },
      ],
    };
    const engine = toEngineProfile(tied, card);
    expect(engine.tieBreaker).toBe("executive");
    expect(engine.resolvedTensions).toEqual([
      { rule: "R4", chosen: "time" },
      { rule: "R1", chosen: "network" },
    ]);
  });
});

describe("propose_direction carries the stage 1 answers and nothing else", () => {
  it("has every stage 1 field, plus tensions, a tie-breaker and declined", () => {
    expect(Object.keys(DirectionSchema.shape).sort()).toEqual(
      [...stage1Fields, "resolvedTensions", "tieBreaker", "declined"].sort(),
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

  it("refuses fewer than 3 needs on the card", () => {
    const short = { ...direction, needs: ["senior_network"] };
    expect(ProposeDirectionInput.safeParse({ direction: short }).success).toBe(false);
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

// check_contradictions runs the rules on the user's taps for TENSION_FIELDS only (the server's
// tensionDraft), so every field a rule reads must be listed there, and must be a chip field,
// or the rule can never fire.
describe("TENSION_FIELDS hold every field the rules read, each a chip field", () => {
  const programs = fixtureDataset();
  const draftOf = (profile: Profile) =>
    Object.fromEntries(
      Object.entries(profile).filter(([k]) => (TENSION_FIELDS as readonly string[]).includes(k)),
    );

  // One profile per rule, each built to fire it. A new rule needs a line here.
  const firing: [string, Profile][] = [
    ["R1", { ...personaAProfile, maxOnsiteDays: 5 }],
    ["R2", { ...personaAProfile, degreeRequired: "required", tuitionBudgetUsd: 1000 }],
    [
      "R3",
      {
        ...personaAProfile,
        needs: ["new_industry_or_city", "leadership_skills", "deep_expertise"],
        relocate: false,
        maxOnsiteDays: 0,
      },
    ],
    ["R4", { ...personaAProfile, hoursPerWeek: { min: 0, max: 5 } }],
    ["R5", { ...personaAProfile, travelComfort: "burden" }],
    [
      "R6",
      {
        ...personaAProfile,
        needs: ["deep_expertise", "leadership_skills", "senior_network"],
        maxStretchDays: 7,
      },
    ],
  ];

  it("has a firing profile for every rule", () => {
    const fired = new Set(
      firing.flatMap(([, p]) => checkContradictions(p, programs).map((t) => t.id)),
    );
    expect([...fired].sort()).toEqual(["R1", "R2", "R3", "R4", "R5", "R6"]);
  });

  it.each(firing)("%s fires the same on the tension fields as on the whole profile", (id, p) => {
    const whole = checkContradictions(p, programs);
    expect(whole.map((t) => t.id)).toContain(id);
    expect(checkContradictions(draftOf(p), programs)).toEqual(whole);
  });

  it("are all chip fields whose tap lands on the field of the same name", () => {
    for (const field of TENSION_FIELDS) {
      expect(CHIP_FIELDS, field).toContain(field);
      expect(CHIP_TARGET[field]).toBe(field);
    }
  });
});
