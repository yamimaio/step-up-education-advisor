import { describe, expect, it } from "vitest";
import { Category } from "../schema/enums";
import { loadPrograms } from "./load";

describe("loadPrograms", () => {
  const programs = loadPrograms();

  it("returns records with valid categories and unique ids", () => {
    for (const p of programs) expect(Category.options).toContain(p.category);
    expect(new Set(programs.map((p) => p.id)).size).toBe(programs.length);
  });
});
