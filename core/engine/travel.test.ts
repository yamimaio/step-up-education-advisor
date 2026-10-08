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
    expect(travelEstimate(fixture(), { ...buenosAires, homeCity: "Cambridge" }).totalUsd).toBe(0);
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
