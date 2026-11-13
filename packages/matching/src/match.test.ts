import { describe, expect, it } from "vitest";
import { findMatch, nameSimilarity, normalizeName, normalizePhone } from "./match.ts";
import { slugify } from "./persist.ts";

const sandu = { name: "Ciorba lui Sandu", lat: 45.7489, lng: 21.2087, phone: "0256 123 456" };

describe("potrivire", () => {
  it("normalizează numele", () => {
    expect(normalizeName("Restaurantul Ciorba lui Sandu SRL")).toBe("ciorba lui sandu");
    expect(normalizePhone("+40 256 123 456")).toBe("0256123456");
  });
  it("același nume, la 20 m → același local", () => {
    const d = findMatch({ name: "Restaurant Ciorba lui Sandu", lat: 45.74905, lng: 21.2088 }, [sandu]);
    expect(d.status).toBe("match");
  });
  it("nume scurtat, același telefon, la 30 m → același local", () => {
    const d = findMatch({ name: "La Sandu", lat: 45.7491, lng: 21.2089, phone: "+40256123456" }, [sandu]);
    expect(d.status).toBe("match");
  });
  it("nume asemănător la 100 m, fără telefon comun → nesigur, merge la admin", () => {
    const d = findMatch({ name: "Ciorbăria Sandu", lat: 45.7498, lng: 21.2087 }, [sandu]);
    expect(d.status).toBe("uncertain");
  });
  it("același nume în alt cartier → local nou", () => {
    expect(findMatch({ name: "Ciorba lui Sandu", lat: 45.77, lng: 21.25 }, [sandu]).status).toBe("none");
  });
  it("similaritatea numelor", () => {
    expect(nameSimilarity("Pizzeria din Fabric", "Pizza din Fabric")).toBeGreaterThan(0.85);
    expect(nameSimilarity("Bar Elisabetin", "Depoul de Tramvaie")).toBeLessThan(0.6);
  });
  it("slug fără diacritice", () => {
    expect(slugify("Plăcintăria Elisabetin")).toBe("placintaria-elisabetin");
  });
});
