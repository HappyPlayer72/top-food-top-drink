import { describe, expect, it } from "vitest";
import { acceptKnown } from "./jobs.ts";

describe("acceptKnown (căutarea țintită pentru localurile noastre)", () => {
  it("nume identic: acceptat până la 1,5 km (coordonatele din seed sunt aproximative)", () => {
    expect(acceptKnown(1, 876)).toBe(true);
    expect(acceptKnown(1, 1600)).toBe(false);
  });
  it("nume aproape identic: doar până la 600 m", () => {
    expect(acceptKnown(0.95, 554)).toBe(true);
    expect(acceptKnown(0.95, 1261)).toBe(false);
  });
  it("nume doar asemănător: doar foarte aproape", () => {
    expect(acceptKnown(0.8, 250)).toBe(true);
    expect(acceptKnown(0.8, 400)).toBe(false);
    expect(acceptKnown(0.6, 10)).toBe(false);
  });
});
