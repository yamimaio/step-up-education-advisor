import { describe, expect, it } from "vitest";
import { normalizeCity, sameMetro } from "./metro";
import { fixture } from "../../tests/fixtures/dataset";

describe("City matching (DQ18 plus the metro table)", () => {
  const cambridge = fixture("fake-executive", { city: "Cambridge", metro: "boston" });

  it("is case and accent insensitive", () => {
    expect(normalizeCity("  São  Paulo ")).toBe("sao paulo");
    expect(sameMetro("BÓSTON", fixture("fake-executive", { city: "Boston" }))).toBe(true);
  });

  it("treats a Boston user as local to Cambridge", () => {
    expect(sameMetro("Boston", cambridge)).toBe(true);
  });

  it("matches an unknown city only on its exact name", () => {
    const springfield = fixture("fake-executive", { city: "Springfield", metro: null });
    expect(sameMetro("springfield", springfield)).toBe(true);
    expect(sameMetro("Shelbyville", springfield)).toBe(false);
  });

  it("does not match a different metro, a declined home city or an online program", () => {
    expect(sameMetro("Chicago", cambridge)).toBe(false);
    expect(sameMetro(null, cambridge)).toBe(false);
    expect(sameMetro("Boston", fixture("fake-certificate"))).toBe(false);
  });
});
