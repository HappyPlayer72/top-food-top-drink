/**
 * 30 de locale INVENTATE din Timișoara (20 food, 10 drink), pentru demo.
 * Numele nu aparțin unor localuri reale; review-urile sunt generate (seed/generate.ts).
 * Pentru date reale: packages/ingestion cu GOOGLE_PLACES_API_KEY.
 *
 * `profile` descrie cum arată review-urile generate:
 *  localMean / touristMean = nota medie (0–10) dată de localnici / turiști
 *  locals / tourists = câte review-uri din fiecare grup
 *  fakeBurst = câte review-uri false de 10 în ultimele 24h (scenariul de demo 3)
 *  weekendNight / weekday = nota medie la drink, pe momente (scenariul 5)
 */
export type SeedVenue = {
  name: string;
  slug: string;
  vertical: "food" | "drink";
  categories: string[];
  neighborhood: string;
  lat: number;
  lng: number;
  address: string;
  priceMinLei?: number;
  priceMaxLei?: number;
  drinkPrices?: { beer05l?: number; cocktail?: number };
  profile: {
    localMean: number;
    touristMean: number;
    locals: number;
    tourists: number;
    fakeBurst?: number;
    weekendNight?: number;
    weekday?: number;
  };
};

const food = (
  name: string,
  slug: string,
  categories: string[],
  neighborhood: string,
  lat: number,
  lng: number,
  price: [number, number],
  profile: SeedVenue["profile"],
): SeedVenue => ({
  name, slug, vertical: "food", categories, neighborhood, lat, lng,
  address: `Str. Exemplu, ${neighborhood}, Timișoara`,
  priceMinLei: price[0], priceMaxLei: price[1], profile,
});

const drink = (
  name: string,
  slug: string,
  categories: string[],
  neighborhood: string,
  lat: number,
  lng: number,
  prices: { beer05l?: number; cocktail?: number },
  profile: SeedVenue["profile"],
): SeedVenue => ({
  name, slug, vertical: "drink", categories, neighborhood, lat, lng,
  address: `Str. Exemplu, ${neighborhood}, Timișoara`,
  drinkPrices: prices, profile,
});

export const SEED_VENUES: SeedVenue[] = [
  // ---------- FOOD (20) ----------
  // Scenariul 1: favoritul localnicilor
  food("Ciorba lui Sandu", "ciorba-lui-sandu", ["romanesc"], "Iosefin", 45.7489, 21.2087, [35, 60], { localMean: 9.4, touristMean: 8.2, locals: 40, tourists: 8 }),
  food("Pizzeria din Fabric", "pizzeria-din-fabric", ["pizza"], "Fabric", 45.7594, 21.2461, [30, 50], { localMean: 8.9, touristMean: 8.4, locals: 30, tourists: 6 }),
  food("Plăcintăria Elisabetin", "placintaria-elisabetin", ["patiserie"], "Elisabetin", 45.7462, 21.2265, [10, 25], { localMean: 8.9, touristMean: 8.0, locals: 28, tourists: 3 }),
  food("Bucătăria Mamei Veta", "bucataria-mamei-veta", ["romanesc"], "Circumvalațiunii", 45.7621, 21.2124, [30, 45], { localMean: 8.6, touristMean: 8.0, locals: 25, tourists: 2 }),
  food("Shaorma de la Gară", "shaorma-de-la-gara", ["street-food"], "Gara de Nord", 45.7503, 21.2071, [20, 30], { localMean: 8.4, touristMean: 7.0, locals: 22, tourists: 6 }),
  food("Burgerul din Mehala", "burgerul-din-mehala", ["burger"], "Mehala", 45.7688, 21.2049, [35, 55], { localMean: 8.2, touristMean: 7.8, locals: 18, tourists: 3 }),
  food("Gustul Banatului", "gustul-banatului", ["romanesc"], "Calea Aradului", 45.7751, 21.2248, [35, 55], { localMean: 8.0, touristMean: 7.6, locals: 16, tourists: 4 }),
  food("Tăiței și Bambus", "taitei-si-bambus", ["asiatic"], "Complexul Studențesc", 45.7471, 21.2402, [30, 50], { localMean: 7.9, touristMean: 7.5, locals: 20, tourists: 5 }),
  food("Verde pe Farfurie", "verde-pe-farfurie", ["vegan"], "Elisabetin", 45.7448, 21.2241, [35, 55], { localMean: 7.8, touristMean: 8.2, locals: 14, tourists: 6 }),
  food("Cantina Studentului", "cantina-studentului", ["romanesc"], "Complexul Studențesc", 45.7465, 21.2386, [18, 30], { localMean: 7.2, touristMean: 6.5, locals: 20, tourists: 1 }),
  food("Pizza la Felie Soarelui", "pizza-la-felie-soarelui", ["pizza", "street-food"], "Soarelui", 45.7372, 21.2431, [12, 25], { localMean: 7.4, touristMean: 7.0, locals: 12, tourists: 1 }),
  food("Bistro Bega", "bistro-bega", ["bistro"], "Cetate", 45.7521, 21.2311, [50, 90], { localMean: 7.3, touristMean: 7.8, locals: 15, tourists: 15 }),
  food("Hanul cu Tei", "hanul-cu-tei", ["romanesc"], "Fratelia", 45.7302, 21.2187, [35, 55], { localMean: 7.6, touristMean: 7.0, locals: 11, tourists: 2 }),
  food("Ramen Bastion", "ramen-bastion", ["asiatic"], "Cetate", 45.7593, 21.2329, [45, 70], { localMean: 7.0, touristMean: 8.0, locals: 10, tourists: 14 }),
  food("Clătitele Ronaț", "clatitele-ronat", ["patiserie"], "Ronaț", 45.7682, 21.1895, [10, 20], { localMean: 7.7, touristMean: 7.0, locals: 8, tourists: 0 }),
  // Scenariul 3: rafală de review-uri false
  food("Grill Nou Freidorf", "grill-nou-freidorf", ["burger"], "Freidorf", 45.7385, 21.1962, [40, 60], { localMean: 6.8, touristMean: 6.5, locals: 14, tourists: 2, fakeBurst: 20 }),
  // Capcane turistice în centru
  food("Terasa Grand Unirii", "terasa-grand-unirii", ["romanesc"], "Cetate", 45.7582, 21.2294, [60, 95], { localMean: 4.9, touristMean: 8.6, locals: 14, tourists: 36 }),
  food("Café Domului", "cafe-domului", ["bistro"], "Cetate", 45.7577, 21.2283, [65, 100], { localMean: 6.2, touristMean: 8.0, locals: 12, tourists: 24 }),
  food("Pizzeria Victoriei Centrale", "pizzeria-victoriei-centrale", ["pizza"], "Cetate", 45.7541, 21.2259, [50, 75], { localMean: 5.8, touristMean: 7.9, locals: 12, tourists: 22 }),
  food("Pasaj Gourmet", "pasaj-gourmet", ["bistro"], "Cetate", 45.7562, 21.2272, [55, 85], { localMean: 6.9, touristMean: 7.6, locals: 13, tourists: 12 }),

  // ---------- DRINK (10) ----------
  drink("Pivnița cu Boltă", "pivnita-cu-bolta", ["pub"], "Cetate", 45.7569, 21.2304, { beer05l: 14, cocktail: 30 }, { localMean: 8.9, touristMean: 8.4, locals: 30, tourists: 10, weekendNight: 9.2, weekday: 8.3 }),
  drink("Bar Elisabetin", "bar-elisabetin", ["cocktail-bar"], "Elisabetin", 45.7455, 21.2253, { beer05l: 16, cocktail: 32 }, { localMean: 8.6, touristMean: 8.2, locals: 22, tourists: 5, weekendNight: 8.7, weekday: 8.5 }),
  // Scenariul 5: excelent vineri noaptea, slab marțea
  drink("Depoul de Tramvaie", "depoul-de-tramvaie", ["club"], "Fabric", 45.7612, 21.2493, { beer05l: 15, cocktail: 30 }, { localMean: 8.2, touristMean: 8.0, locals: 26, tourists: 6, weekendNight: 9.1, weekday: 6.0 }),
  drink("Berăria din Iosefin", "beraria-din-iosefin", ["pub"], "Iosefin", 45.7483, 21.2112, { beer05l: 11, cocktail: 25 }, { localMean: 8.3, touristMean: 7.5, locals: 20, tourists: 2, weekendNight: 8.4, weekday: 8.2 }),
  drink("Cafeneaua de Noapte", "cafeneaua-de-noapte", ["cafenea-de-seara"], "Fabric", 45.7588, 21.2442, { beer05l: 13, cocktail: 28 }, { localMean: 8.0, touristMean: 7.8, locals: 16, tourists: 3, weekendNight: 7.9, weekday: 8.1 }),
  drink("Jazz în Pivniță", "jazz-in-pivnita", ["pub", "muzica-live"], "Cetate", 45.7551, 21.2318, { beer05l: 15, cocktail: 33 }, { localMean: 8.4, touristMean: 8.6, locals: 15, tourists: 9, weekendNight: 8.8, weekday: 8.0 }),
  drink("Studio 19", "studio-19", ["club"], "Complexul Studențesc", 45.7476, 21.2415, { beer05l: 10, cocktail: 22 }, { localMean: 7.6, touristMean: 7.2, locals: 24, tourists: 2, weekendNight: 8.0, weekday: 6.8 }),
  drink("Bodega Mehala", "bodega-mehala", ["pub"], "Mehala", 45.7693, 21.2061, { beer05l: 9, cocktail: 20 }, { localMean: 7.4, touristMean: 6.5, locals: 12, tourists: 0, weekendNight: 7.4, weekday: 7.4 }),
  // Capcane pentru băutură
  drink("Terasa de pe Bega", "terasa-de-pe-bega", ["terasa"], "Cetate", 45.7518, 21.2296, { beer05l: 19, cocktail: 42 }, { localMean: 6.4, touristMean: 7.9, locals: 12, tourists: 18, weekendNight: 7.0, weekday: 7.2 }),
  drink("Sky Bar Unirii", "sky-bar-unirii", ["cocktail-bar"], "Cetate", 45.7584, 21.2286, { beer05l: 24, cocktail: 52 }, { localMean: 5.2, touristMean: 8.3, locals: 12, tourists: 30, weekendNight: 7.4, weekday: 7.0 }),
];
