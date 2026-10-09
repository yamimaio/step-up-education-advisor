import { describe, expect, it } from "vitest";
import { haversineKm, needsLocalPresence, withinCommute } from "./distance";
import { COMMUTE_KM } from "./constants";
import { fixture } from "../../tests/fixtures/dataset";
import { BOSTON, BUENOS_AIRES, CAMBRIDGE_MA, CHICAGO } from "../../tests/fixtures/profiles";

// The fixture programs' campus is in Boston.
const boston = fixture("fake-executive");
const km = (home: { homeLat: number; homeLon: number }) =>
  haversineKm(home.homeLat, home.homeLon, boston.campusLat as number, boston.campusLon as number);

describe("Great-circle distance", () => {
  it("is zero for the same point and symmetric", () => {
    expect(haversineKm(42.3601, -71.0589, 42.3601, -71.0589)).toBe(0);
    expect(haversineKm(10, 20, -30, 40)).toBeCloseTo(haversineKm(-30, 40, 10, 20), 9);
  });

  it("gives real city distances", () => {
    expect(km(CAMBRIDGE_MA)).toBeCloseTo(4.4, 0);
    expect(km(BUENOS_AIRES)).toBeCloseTo(8655, -1);
    expect(km(CHICAGO)).toBeCloseTo(1366, -1);
  });

  it("does not break at opposite points of the globe", () => {
    expect(haversineKm(0, 0, 0, 180)).toBeCloseTo(20015, -1);
    expect(haversineKm(90, 0, -90, 0)).toBeCloseTo(20015, -1);
  });
});

describe("Within commuting distance (COMMUTE_KM = 80)", () => {
  it("puts Cambridge and Boston within it, and Buenos Aires and Boston outside it", () => {
    expect(COMMUTE_KM).toBe(80);
    expect(withinCommute(CAMBRIDGE_MA, boston)).toBe(true);
    expect(withinCommute(BOSTON, boston)).toBe(true);
    expect(withinCommute(BUENOS_AIRES, boston)).toBe(false);
  });

  it("cuts off at 80 km, whatever the city is called", () => {
    // Providence is about 66 km from Boston; Portland, Maine about 158 km.
    expect(withinCommute({ homeLat: 41.824, homeLon: -71.4128 }, boston)).toBe(true);
    expect(withinCommute({ homeLat: 43.6591, homeLon: -70.2568 }, boston)).toBe(false);
    // Due north of the campus, 79.9 and 80.1 km away.
    const degrees = (distance: number) => distance / ((Math.PI * 6371) / 180);
    const lat = boston.campusLat as number;
    const lon = boston.campusLon as number;
    expect(withinCommute({ homeLat: lat + degrees(79.9), homeLon: lon }, boston)).toBe(true);
    expect(withinCommute({ homeLat: lat + degrees(80.1), homeLon: lon }, boston)).toBe(false);
  });

  it("is unknown, not true, when a coordinate is missing on either side", () => {
    expect(withinCommute({ homeLat: null, homeLon: null }, boston)).toBeNull();
    expect(withinCommute({ homeLat: 42.36, homeLon: null }, boston)).toBeNull();
    expect(withinCommute({ homeLat: null, homeLon: -71.05 }, boston)).toBeNull();
    const noCampus = { ...boston, campusLat: null, campusLon: null };
    expect(withinCommute(BOSTON, noCampus)).toBeNull();
    expect(withinCommute(BOSTON, { ...boston, campusLon: null })).toBeNull();
    expect(withinCommute(BOSTON, { ...boston, campusLat: null })).toBeNull();
  });

  it("treats 0 degrees as a coordinate, not as missing", () => {
    expect(withinCommute({ homeLat: 0, homeLon: 0 }, { campusLat: 0, campusLon: 0 })).toBe(true);
  });
});

describe("Which programs need the student near campus", () => {
  it("needs it for full-time in-person and for evening or daily attendance", () => {
    expect(needsLocalPresence(fixture("fake-mba"))).toBe(true);
    expect(needsLocalPresence(fixture("fake-specialized-masters"))).toBe(true);
  });

  it("leaves blended, weekend and online programs to the travel checks", () => {
    expect(needsLocalPresence(fixture("fake-executive"))).toBe(false);
    expect(needsLocalPresence(fixture("fake-emba"))).toBe(false);
    expect(needsLocalPresence(fixture("fake-certificate"))).toBe(false);
  });
});
