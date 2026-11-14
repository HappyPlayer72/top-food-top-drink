import { afterEach, describe, expect, it } from "vitest";
import { geocodeAddress, type BBox } from "./geocode.ts";

const BBOX: BBox = [21.15, 45.7, 21.32, 45.81];
const reply = (body: unknown, ok = true) => (async () => ({ ok, json: async () => body })) as unknown as typeof fetch;

describe("geocodeAddress", () => {
  afterEach(() => { delete process.env.GEOAPIFY_API_KEY; });

  it("fără cheie nu cheamă nimic", async () => {
    expect(await geocodeAddress("Str. Test 1", BBOX, reply({ results: [{ lat: 1, lon: 2 }] }))).toBeNull();
  });

  it("întoarce coordonatele rezultatului sigur", async () => {
    process.env.GEOAPIFY_API_KEY = "k";
    const r = await geocodeAddress("Bd. Dâmbovița 40", BBOX, reply({ results: [{ lat: 45.74, lon: 21.2, formatted: "Bd. Dâmbovița 40", rank: { confidence: 0.9 } }] }));
    expect(r).toEqual({ lat: 45.74, lng: 21.2, formatted: "Bd. Dâmbovița 40" });
  });

  it("un rezultat nesigur sau o eroare → null (se folosește centrul cartierului)", async () => {
    process.env.GEOAPIFY_API_KEY = "k";
    expect(await geocodeAddress("x", BBOX, reply({ results: [{ lat: 1, lon: 2, rank: { confidence: 0.2 } }] }))).toBeNull();
    expect(await geocodeAddress("x", BBOX, reply({}, false))).toBeNull();
  });
});
