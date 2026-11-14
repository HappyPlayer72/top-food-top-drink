import { expect, it } from "vitest";
import { parseVenueIcon } from "./owner.ts";

const PIXEL = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD";

it("pictograma: simbol din listă, poză mică sau resetare; orice altceva e respins", () => {
  expect(parseVenueIcon({ kind: "symbol", symbol: "beer", color: "carou" })).toEqual({ ownerIconSymbol: "beer", ownerIconColor: "carou", ownerIconImage: null });
  expect(parseVenueIcon({ kind: "image", image: PIXEL })).toEqual({ ownerIconSymbol: null, ownerIconColor: null, ownerIconImage: PIXEL });
  expect(parseVenueIcon({ kind: "reset" })).toEqual({ ownerIconSymbol: null, ownerIconColor: null, ownerIconImage: null });

  expect(() => parseVenueIcon({ kind: "symbol", symbol: "<script>", color: "carou" })).toThrow();
  expect(() => parseVenueIcon({ kind: "symbol", symbol: "beer", color: "placuta" })).toThrow(); // albastrul e doar pentru localnic
  expect(() => parseVenueIcon({ kind: "image", image: "data:image/svg+xml;base64,PHN2Zz4=" })).toThrow();
  expect(() => parseVenueIcon({ kind: "image", image: "https://exemplu.ro/poza.jpg" })).toThrow();
  expect(() => parseVenueIcon({ kind: "image", image: `data:image/png;base64,${"A".repeat(30_000)}` })).toThrow();
});
