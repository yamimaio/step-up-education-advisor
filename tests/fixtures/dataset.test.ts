import { describe, expect, it } from "vitest";
import { fixture } from "./dataset";

describe("fixture()", () => {
  it("defaults to the fake executive program", () => {
    expect(fixture().id).toBe("fake-executive");
  });

  it("throws on an unknown id instead of falling back", () => {
    expect(() => fixture("fake-certificat")).toThrow(/no fixture with id fake-certificat/);
  });
});
