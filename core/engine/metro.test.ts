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

describe("City matching: free-text home cities", () => {
  const boston = fixture("fake-executive", { city: "Boston", metro: "boston" });

  it("ignores a state or country suffix", () => {
    expect(sameMetro("Boston, MA", boston)).toBe(true);
    expect(
      sameMetro("Chicago, IL", fixture("fake-executive", { city: "Chicago", metro: null })),
    ).toBe(true);
    expect(
      sameMetro("Boston, Argentina", fixture("fake-executive", { city: "Chicago", metro: null })),
    ).toBe(false);
  });

  it("falls back to the city when the program's metro label is unknown", () => {
    const palo = fixture("fake-executive", { city: "Palo Alto", metro: "Bay Area" });
    expect(sameMetro("San Francisco", palo)).toBe(true);
  });

  it("does not match names shared by several cities unless they are qualified", () => {
    const dc = fixture("fake-executive", { city: "Washington", metro: "washington_dc" });
    expect(sameMetro("Arlington", dc)).toBe(false);
    expect(sameMetro("Arlington, VA", dc)).toBe(true);
    const sf = fixture("fake-executive", { city: "Palo Alto", metro: "sf_bay_area" });
    expect(sameMetro("San José", sf)).toBe(false);
    expect(sameMetro("San Jose, CA", sf)).toBe(true);
  });

  it("matches a user in Cambridge, MA to Boston, and bare Cambridge to a Cambridge program", () => {
    const cambridge = fixture("fake-executive", { city: "Cambridge", metro: null });
    expect(sameMetro("Boston", cambridge)).toBe(true);
    expect(sameMetro("Cambridge", cambridge)).toBe(true);
    expect(sameMetro("Cambridge, MA", boston)).toBe(true);
  });
});

describe("City matching: city, state and country in one answer", () => {
  it("uses the city with its state when a country follows", () => {
    const sf = fixture("fake-executive", { city: "Palo Alto", metro: "sf_bay_area" });
    expect(sameMetro("San Jose, CA, USA", sf)).toBe(true);
    const boston = fixture("fake-executive", { city: "Boston", metro: "boston" });
    expect(sameMetro("Cambridge, MA, USA", boston)).toBe(true);
    expect(sameMetro("Boston, MA, USA", boston)).toBe(true);
  });
});
