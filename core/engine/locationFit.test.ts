import { describe, expect, it } from "vitest";
import { locationFit } from "./locationFit";

const program = (offers: string[] = []) =>
  ({ locationOffers: offers }) as Parameters<typeof locationFit>[1];
const user = (locationValues: string[] = []) =>
  ({ locationValues }) as Parameters<typeof locationFit>[0];

describe("Location fit (D9)", () => {
  it("starts at 3 and adds 1 for each matched location value", () => {
    const u = user(["network_density", "immersion"]);
    expect(locationFit(u, program([]))).toBe(3);
    expect(locationFit(u, program(["network_density"]))).toBe(4);
    expect(locationFit(u, program(["network_density", "immersion"]))).toBe(5);
  });

  it("no longer reads travel comfort, which scores as travel fit", () => {
    const appeal = { locationValues: [], travelComfort: "appeal" } as Parameters<
      typeof locationFit
    >[0];
    const burden = { locationValues: [], travelComfort: "burden" } as Parameters<
      typeof locationFit
    >[0];
    expect(locationFit(appeal, program())).toBe(3);
    expect(locationFit(burden, program())).toBe(3);
  });
});
