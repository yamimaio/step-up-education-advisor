import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CHIP_FIELDS, CHIP_TARGET, CHIPS, type ChipField } from "../core/advisor/chips";
import { CHECKLIST, STAGE_1_CHECKLIST, STAGE_2_CHECKLIST } from "../core/advisor/fields";
import { DirectionSchema } from "../core/advisor/tools";
import { ProfileSchema, type Profile } from "../core/schema/profile";
import { personaAProfile } from "../tests/fixtures/profiles";

const IDS = ["A", "B", "C", "D", "E", "F"] as const;
const HEADINGS = [
  "Who they are",
  "True answers",
  "In their voice",
  "Expected verdict",
  "What a sharp advisor should notice",
];

const read = (id: string) => readFileSync(new URL(`./${id}.md`, import.meta.url), "utf8");

// The text from a heading to the next heading of the same level.
const section = (text: string, level: string, heading: string) =>
  text.split(new RegExp(`^${level} `, "m")).find((s) => s.startsWith(heading)) ?? "";

// The "True answers" tables (or one stage's table) as entry id -> cell text.
function answers(text: string, stage?: "Stage 1" | "Stage 2"): Record<string, string> {
  const all = section(text, "##", "True answers");
  const part = stage ? section(all, "###", stage) : all;
  const rows: Record<string, string> = {};
  for (const line of part.split("\n")) {
    const m = /^\|\s*([A-Za-z]+)\s*\|\s*(.+?)\s*\|\s*$/.exec(line);
    if (m && m[1] !== "Entry") rows[m[1]!] = m[2]!;
  }
  return rows;
}

const tokens = (cell: string) => [...cell.matchAll(/`([^`]+)`/g)].map((m) => m[1]!);
const freeText = (cell: string) =>
  cell
    .replace(/`[^`]+`/g, "")
    .split(";")
    .map((s) => s.replace(/^[\s,]+|[\s,]+$/g, ""))
    .filter(Boolean);

const chipFor = (field: ChipField, label: string) => CHIPS[field].find((c) => c.label === label);

describe.each(IDS)("Persona %s", (id) => {
  const text = read(id);
  const table = answers(text);

  it("has the required headings", () => {
    for (const h of HEADINGS) expect(text, h).toMatch(new RegExp(`^## ${h}$`, "m"));
  });

  it("answers all 17 checklist entries", () => {
    expect(CHECKLIST).toHaveLength(17);
    expect(Object.keys(table).sort()).toEqual(CHECKLIST.map((e) => e.id).sort());
  });

  it("gives the stage 1 answers first, in the order the advisor asks them", () => {
    const all = section(text, "##", "True answers");
    expect(all.indexOf("### Stage 1")).toBeGreaterThan(-1);
    expect(all.indexOf("### Stage 1")).toBeLessThan(all.indexOf("### Stage 2 (not wired yet)"));
    expect(Object.keys(answers(text, "Stage 1"))).toEqual(STAGE_1_CHECKLIST.map((e) => e.id));
    expect(Object.keys(answers(text, "Stage 2"))).toEqual(STAGE_2_CHECKLIST.map((e) => e.id));
  });

  it("states the stage 1 verdict before stage 2", () => {
    const verdict = section(text, "##", "Expected verdict");
    expect(verdict.indexOf("### Stage 1")).toBeGreaterThan(-1);
    expect(verdict.indexOf("### Stage 1")).toBeLessThan(verdict.indexOf("### Stage 2"));
  });

  it("builds stage 1 answers that propose_direction accepts", () => {
    const p = profileFrom(text, table);
    const direction = Object.fromEntries(
      Object.keys(DirectionSchema.shape).flatMap((k) =>
        k in p ? [[k, p[k as keyof Profile]]] : [],
      ),
    );
    expect(DirectionSchema.safeParse(direction).success).toBe(true);
  });

  it("quotes chip labels exactly, one per chip set (the right number for multi-selects)", () => {
    for (const entry of CHECKLIST) {
      const cell = table[entry.id]!;
      const quoted = tokens(cell);
      for (const label of quoted) {
        const owner = entry.chips.find((f) => chipFor(f, label));
        expect(owner, `${id} ${entry.id}: "${label}" is not a chip label`).toBeDefined();
      }
      for (const f of entry.chips) {
        const hits = quoted.filter((l) => chipFor(f, l)).length;
        if (f === "needs") expect(hits, `${id} needs`).toBe(3);
        else if (f === "locationValues") {
          expect(hits, `${id} locationValues`).toBeGreaterThanOrEqual(1);
          expect(hits).toBeLessThanOrEqual(2);
        } else expect(hits, `${id} ${f}`).toBe(1);
      }
    }
  });

  it("builds a profile that passes ProfileSchema", () => {
    expect(ProfileSchema.safeParse(profileFrom(text, table)).success).toBe(true);
  });

  it("states the expected goalClarity and a verdict", () => {
    expect(text).toMatch(/`goalClarity`: (clear|unclear)/);
  });
});

function profileFrom(text: string, table: Record<string, string>): Profile {
  const p: Record<string, unknown> = {};
  const put = (path: string, value: unknown) => {
    const [head, sub] = path.split(".");
    if (sub) p[head!] = { ...(p[head!] as object), [sub]: value };
    else p[head!] = value;
  };
  for (const entry of CHECKLIST) {
    const cell = table[entry.id]!;
    for (const field of CHIP_FIELDS) {
      if (!entry.chips.includes(field)) continue;
      const matches = tokens(cell).flatMap((l) => {
        const chip = chipFor(field, l);
        return chip ? [chip.value] : [];
      });
      put(
        CHIP_TARGET[field],
        field === "needs" || field === "locationValues" ? matches : matches[0],
      );
    }
  }
  const text1 = (id: string) => freeText(table[id]!);
  p.yearsExperience = Number(table.yearsExperience);
  p.yearsLeading = Number(table.yearsLeading);
  put("degree.field", text1("degree")[0]);
  put("careerGoal.description", text1("careerGoal")[0]!.replace(/^"|"$/g, ""));
  // City; region; country code; latitude, longitude (the region, code and coordinates are
  // what the advisor fills in from the city).
  const [city, region, country, coords] = text1("home");
  const [lat, lon] = coords!.split(",").map(Number);
  p.homeCity = city;
  p.homeRegion = region;
  p.homeCountry = country;
  p.homeLat = lat;
  p.homeLon = lon;
  p.goalClarity = /`goalClarity`: (clear|unclear)/.exec(text)?.[1];
  p.resolvedTensions = [];
  p.declined = [];
  return p as Profile;
}

describe("Persona A's fixed answers", () => {
  it("build exactly the personaAProfile fixture", () => {
    const text = read("A");
    expect(profileFrom(text, answers(text))).toEqual(personaAProfile);
  });
});
