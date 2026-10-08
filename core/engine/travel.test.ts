import { describe, expect, it } from "vitest";
import { travelEstimate } from "./travel";
import { fixture } from "../../tests/fixtures/dataset";

const buenosAires = { homeCity: "Buenos Aires", airfareRange: "1000_1500" as const };

describe("Travel estimate (D8 and the section 11 follow-ups)", () => {
  it("is trips x (airfare midpoint + nights x top lodging rate)", () => {
    // 3 residencies x (1,250 + 5 nights x 365) = 9,225
    const t = travelEstimate(fixture("fake-executive"), buenosAires);
    expect(t).toMatchObject({ kind: "estimate", totalUsd: 9225, trips: 3, nightsPerTrip: 5 });
  });

  it("multiplies trips by the program years, rounded up", () => {
    const t = travelEstimate(fixture("fake-executive", { durationMonths: 13 }), buenosAires);
    expect(t.trips).toBe(6);
  });

  it("covers lodging only, with the flag set, when airfare is unknown", () => {
    const t = travelEstimate(fixture("fake-executive"), {
      ...buenosAires,
      airfareRange: "unknown",
    });
    expect(t).toMatchObject({ totalUsd: 3 * 5 * 365, lodgingOnly: true });
  });

  it("skips lodging when tuition includes it", () => {
    const t = travelEstimate(fixture("fake-emba"), buenosAires);
    expect(t.totalUsd).toBe(48 * 1250);
  });

  it("estimates recurring weekends at 26 trips a year when there are no counts, and says so", () => {
    const emba = fixture("fake-emba", { residencyCount: null, onsiteDaysPerYear: null });
    const t = travelEstimate(emba, buenosAires);
    expect(t).toMatchObject({ trips: 52, nightsPerTrip: 2, tripsEstimated: true });
    expect(t.notes.join(" ")).toMatch(/estimated/);
  });

  it("is zero in the home metro, for online programs and with no on-site time", () => {
    expect(travelEstimate(fixture(), { ...buenosAires, homeCity: "Cambridge, MA" }).totalUsd).toBe(
      0,
    );
    expect(travelEstimate(fixture("fake-certificate"), buenosAires).totalUsd).toBe(0);
  });

  it("is unknown when counts or the lodging rate are missing", () => {
    const noLodging = fixture("fake-executive", { lodgingPerNightUsd: null });
    expect(travelEstimate(noLodging, buenosAires)).toMatchObject({
      kind: "unknown",
      totalUsd: null,
    });
    const noCounts = fixture("fake-executive", { residencyCount: null });
    expect(travelEstimate(noCounts, buenosAires).kind).toBe("unknown");
    const noLength = fixture("fake-executive", { durationMonths: null });
    expect(travelEstimate(noLength, buenosAires).kind).toBe("unknown");
  });
});

describe("Travel estimate: published counts and relocation", () => {
  it("is zero for a hybrid program with no on-site days", () => {
    const hybrid = fixture("fake-executive", { onsiteDaysPerYear: 0 });
    expect(travelEstimate(hybrid, buenosAires)).toMatchObject({ kind: "none", totalUsd: 0 });
  });

  it("keeps a published weekend trip count when on-site days are null", () => {
    const emba = fixture("fake-emba", {
      residencyCount: 12,
      onsiteDaysPerYear: null,
      durationMonths: 12,
    });
    const t = travelEstimate(emba, buenosAires);
    expect(t).toMatchObject({ trips: 12, nightsPerTrip: 2, tripsEstimated: false });
    expect(t.totalUsd).toBe(12 * 1250);
    expect(t.notes.join(" ")).toMatch(/Nights per trip estimated/);
  });

  it("names the figure that is missing", () => {
    const noDays = fixture("fake-executive", { onsiteDaysPerYear: null });
    expect(travelEstimate(noDays, buenosAires).notes).toEqual([
      "On-site days a year not published.",
    ]);
    const noTrips = fixture("fake-executive", { residencyCount: null });
    expect(travelEstimate(noTrips, buenosAires).notes).toEqual(["Number of trips not published."]);
    const neither = fixture("fake-executive", { residencyCount: null, onsiteDaysPerYear: null });
    expect(travelEstimate(neither, buenosAires).notes).toEqual([
      "On-site days and trips not published.",
    ]);
  });

  it("needs no recurring travel for a user who would relocate to a full-time program", () => {
    const mba = fixture("fake-mba");
    const t = travelEstimate(mba, { ...buenosAires, relocate: true });
    expect(t).toMatchObject({ kind: "none", totalUsd: 0 });
    expect(travelEstimate(mba, { ...buenosAires, relocate: false }).kind).not.toBe("none");
  });

  it("mentions the GSA rate only when lodging is charged", () => {
    const paid = travelEstimate(fixture("fake-executive"), buenosAires).notes.join(" ");
    expect(paid).toMatch(/GSA/);
    const included = travelEstimate(fixture("fake-emba"), buenosAires).notes.join(" ");
    expect(included).toMatch(/Tuition includes lodging/);
    expect(included).not.toMatch(/GSA/);
  });
});
