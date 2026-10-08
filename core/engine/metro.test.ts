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

describe("City matching: a qualifier that contradicts the program", () => {
  const mit = fixture("fake-executive", {
    city: "Cambridge",
    metro: "boston",
    state: "MA",
    country: "US",
  });
  const sj = fixture("fake-executive", {
    city: "San Jose",
    metro: "sf_bay_area",
    state: "CA",
    country: "US",
  });

  it("does not match the same city name in another country", () => {
    expect(sameMetro("Cambridge, UK", mit)).toBe(false);
    expect(sameMetro("Cambridge, England", mit)).toBe(false);
    expect(sameMetro("San José, Costa Rica", sj)).toBe(false);
    expect(sameMetro("San Jose, CA, USA", sj)).toBe(true);
  });

  it("does not match the same city name in another state", () => {
    expect(sameMetro("Cambridge, MD", mit)).toBe(false);
    expect(sameMetro("Cambridge, MA", mit)).toBe(true);
  });
});

describe("City matching: spelled-out states and no comma", () => {
  const boston = fixture("fake-executive", { city: "Boston", metro: "boston" });
  const dc = fixture("fake-executive", { city: "Washington", metro: "washington_dc" });

  it("reads a full state name", () => {
    expect(sameMetro("Cambridge, Massachusetts", boston)).toBe(true);
    expect(sameMetro("Cambridge, Massachusetts, USA", boston)).toBe(true);
    expect(sameMetro("Arlington, Virginia", dc)).toBe(true);
  });

  it("reads a state without a comma", () => {
    expect(sameMetro("Boston MA", boston)).toBe(true);
    expect(sameMetro("Cambridge Massachusetts", boston)).toBe(true);
    expect(sameMetro("Washington DC", dc)).toBe(true);
    expect(
      sameMetro("New York", fixture("fake-executive", { city: "Brooklyn", metro: null })),
    ).toBe(true);
  });
});

describe("City matching: the round 3 probe table", () => {
  const prog = (city: string, state: string | null, country: string, metro: string | null) =>
    fixture("fake-executive", { city, state, country, metro });

  it.each([
    ["Washington, D.C.", prog("Washington", "DC", "US", null), true],
    ["New York, N.Y.", prog("New York", "NY", "US", null), true],
    ["Seattle, Washington", prog("Seattle", "WA", "US", null), true],
    ["Seattle Washington", prog("Seattle", "WA", "US", null), true],
    ["Toronto, Ontario, Canada", prog("Toronto", "ON", "CA", null), true],
    ["Sao Paulo, SP, Brazil", prog("Sao Paulo", "SP", "BR", null), true],
    ["Brooklyn, NY 11201", prog("New York", "NY", "US", null), true],
    ["Cambridge, MA", prog("Cambridge", null, "GB", null), false],
    ["Manhattan, KS", prog("New York", "NY", "US", null), false],
    ["Brooklyn, MI", prog("New York", "NY", "US", null), false],
    ["Oakland, MD", prog("San Francisco", "CA", "US", null), false],
    ["Brooklyn, NY", prog("New York", "NY", "US", null), true],
  ])("%s", (home, program, expected) => {
    expect(sameMetro(home, program)).toBe(expected);
  });
});

describe("City matching: round 4", () => {
  const prog = (city: string, state: string | null, country: string, metro: string | null) =>
    fixture("fake-executive", { city, state, country, metro });

  it.each([
    ["Philadelphia, MS", prog("Philadelphia", "PA", "US", "philadelphia"), false],
    ["Boston, GA", prog("Boston", "MA", "US", "boston"), false],
    ["Philadelphia, PA", prog("Philadelphia", "PA", "US", "philadelphia"), true],
    ["Perth, WA, Australia", prog("Perth", "WA", "AU", null), true],
    ["Florianopolis, SC, Brazil", prog("Florianopolis", "SC", "BR", null), true],
    ["Perth, WA, USA", prog("Perth", "WA", "AU", null), false],
    ["NYC", prog("New York", "NY", "US", "new_york"), true],
    ["nyc", prog("Brooklyn", "NY", "US", null), true],
    ["SF", prog("San Francisco", "CA", "US", null), true],
    ["LA", prog("Los Angeles", "CA", "US", null), true],
    ["DC", prog("Washington", "DC", "US", null), true],
    ["D.C.", prog("Washington", "DC", "US", null), true],
  ])("%s", (home, program, expected) => {
    expect(sameMetro(home, program)).toBe(expected);
  });
});
