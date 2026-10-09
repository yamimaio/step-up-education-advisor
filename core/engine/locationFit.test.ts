import { describe, expect, it } from "vitest";
import { locationFit } from "./locationFit";

const program = (format: "in_person" | "hybrid" | "online", offers: string[] = []) =>
  ({ format, locationOffers: offers }) as Parameters<typeof locationFit>[1];
const user = (travelComfort: "appeal" | "fine" | "burden", locationValues: string[] = []) =>
  ({ travelComfort, locationValues }) as Parameters<typeof locationFit>[0];

describe("Location fit (D9)", () => {
  it("starts at 3 and adds 1 for each matched location value", () => {
    const u = user("fine", ["network_density", "immersion"]);
    expect(locationFit(u, program("hybrid", []))).toBe(3);
    expect(locationFit(u, program("hybrid", ["network_density"]))).toBe(4);
    expect(locationFit(u, program("hybrid", ["network_density", "immersion"]))).toBe(5);
  });

  it("adds 0.5 when travel is appealing and subtracts 1 when it is a burden, for on-site formats", () => {
    expect(locationFit(user("appeal"), program("in_person"))).toBe(3.5);
    expect(locationFit(user("burden"), program("hybrid"))).toBe(2);
    expect(locationFit(user("burden"), program("online"))).toBe(3);
  });

  it("clamps at 5, and the lowest reachable score is 2", () => {
    const u = user("appeal", ["network_density", "immersion"]);
    expect(locationFit(u, program("hybrid", ["network_density", "immersion"]))).toBe(5);
    expect(locationFit(user("burden"), program("in_person"))).toBe(2);
  });
});
