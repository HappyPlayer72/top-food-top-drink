/**
 * 30 de locale REALE din Timișoara (20 food, 10 drink), cu adrese, coordonate, fotografii și informații de livrare.
 * În bază intră doar datele reale (nume, adresă, coordonate, poze, prețuri). Review-urile și ratingurile vin din
 * Google Places (`npm run import:real`).
 *
 * `profile` descrie distribuția review-urilor sintetice din teste (seed/generate.ts), nu ajunge în bază:
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
  photos?: string[];
  priceMinLei?: number;
  priceMaxLei?: number;
  drinkPrices?: { beer05l?: number; cocktail?: number };
  delivery?: {
    available: boolean;
    platforms?: string[];
    ownDelivery?: boolean;
    note?: string;
  };
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
  address: string,
  price: [number, number],
  profile: SeedVenue["profile"],
  delivery?: SeedVenue["delivery"],
  photoUrl?: string,
): SeedVenue => ({
  name, slug, vertical: "food", categories, neighborhood, lat, lng,
  address,
  photos: photoUrl ? [photoUrl] : [],
  priceMinLei: price[0], priceMaxLei: price[1], delivery, profile,
});

const drink = (
  name: string,
  slug: string,
  categories: string[],
  neighborhood: string,
  lat: number,
  lng: number,
  address: string,
  prices: { beer05l?: number; cocktail?: number },
  profile: SeedVenue["profile"],
  delivery?: SeedVenue["delivery"],
  photoUrl?: string,
): SeedVenue => ({
  name, slug, vertical: "drink", categories, neighborhood, lat, lng,
  address,
  photos: photoUrl ? [photoUrl] : [],
  drinkPrices: prices, delivery, profile,
});

export const SEED_VENUES: SeedVenue[] = [
  // ---------- FOOD (20) ----------
  // Scenariul 1: favoritul localnicilor
  food("Restaurant Nora", "restaurant-nora", ["romanesc"], "Iosefin", 45.7418, 21.2046, "Bd. Dâmbovița nr. 40, Timișoara", [35, 60], { localMean: 9.4, touristMean: 8.2, locals: 40, tourists: 8 }, { available: true, platforms: ["Wolt", "Livrare proprie"], ownDelivery: true }, "https://restaurantnora.ro/wp-content/uploads/2024/04/catering-nora-timisoara-16.webp"),
  food("La Focacceria", "la-focacceria", ["pizza"], "Cetate", 45.7556, 21.2273, "Piața Libertății nr. 4, Timișoara", [30, 50], { localMean: 8.9, touristMean: 8.4, locals: 30, tourists: 6 }, { available: true, platforms: ["Wolt", "Glovo"] }, "https://img.meniu.menu/storage/media/company_gallery/26747429/conversions/contribution_gallery.jpg"),
  food("Neața Omelette Bistro", "neata-omelette-bistro", ["patiserie"], "Cetate", 45.7558, 21.2286, "Str. Vasile Alecsandri nr. 2, Timișoara", [10, 25], { localMean: 8.9, touristMean: 8.0, locals: 28, tourists: 3 }, { available: true, platforms: ["Wolt", "Glovo", "Bolt Food"] }, "https://zilesinopti.ro/wp-content/uploads/2022/08/mic-dejun-Neata-Omlette-Bistro-Timisoara.jpg"),
  food("Casa Bunicii", "casa-bunicii", ["romanesc"], "Elisabetin", 45.7453, 21.2285, "Str. Mareșal Alexandru Averescu nr. 1B, Timișoara", [30, 45], { localMean: 8.6, touristMean: 8.0, locals: 25, tourists: 2 }, { available: true, platforms: ["Wolt", "Glovo", "Livrare proprie"], ownDelivery: true }, "https://visit-timis.ro/rails/active_storage/representations/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTI0NDIzLCJwdXIiOiJibG9iX2lkIn19--34e75a9e59fb8a2efd4f1cea65daa2f8c907d416/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJ3ZWJwIiwicmVzaXplX3RvX2ZpdCI6WzE0MDAsMTQwMF19LCJwdXIiOiJ2YXJpYXRpb24ifX0=--7cf04819a75bca128464c01137eb4f04b496c065/casa%20bunicii%20interior5.jpg"),
  food("Little Hanoi", "little-hanoi", ["street-food"], "Cetate", 45.7549, 21.2261, "Str. Mărășești nr. 9, Timișoara", [20, 30], { localMean: 8.4, touristMean: 7.0, locals: 22, tourists: 6 }, { available: true, platforms: ["Wolt", "Glovo", "Bolt Food"] }, "https://cdn.prod.website-files.com/63f778c6a6ba81aed737cc77/63f830e9e09698f30e6e96af_Little%20Hanoi%20-%20059.webp"),
  food("Jack's Bistro", "jacks-bistro", ["burger"], "Cetate", 45.7559, 21.2285, "Str. Vasile Alecsandri nr. 3, Timișoara", [35, 55], { localMean: 8.2, touristMean: 7.8, locals: 18, tourists: 3 }, { available: true, platforms: ["Wolt", "Glovo"] }, "https://zilesinopti.ro/wp-content/uploads/2022/01/341103464_246598061177174_3163952283878690225_n-1024x424.jpg"),
  food("Grădina Bănățeană", "gradina-banateana", ["romanesc"], "Elisabetin", 45.7501, 21.2269, "Splaiul Spiru Haret nr. 1, Timișoara", [35, 55], { localMean: 8.0, touristMean: 7.6, locals: 16, tourists: 4 }, { available: false, note: "Doar servire în local" }, "https://www.gradinabanateana.ro/wp-content/uploads/2023/11/About-1.webp"),
  food("Riyo Wok & Sushi", "riyo-wok-sushi", ["asiatic"], "Cetate", 45.7553, 21.2259, "Str. Mărășești nr. 12, Timișoara", [30, 50], { localMean: 7.9, touristMean: 7.5, locals: 20, tourists: 5 }, { available: true, platforms: ["Wolt", "Glovo", "Bolt Food"] }, "https://visit-timis.ro/rails/active_storage/representations/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTI1OTY0LCJwdXIiOiJibG9iX2lkIn19--27548d229936b286eacafddfae96d1866d8e973b/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJ3ZWJwIiwicmVzaXplX3RvX2ZpdCI6WzE0MDAsMTQwMF19LCJwdXIiOiJ2YXJpYXRpb24ifX0=--7cf04819a75bca128464c01137eb4f04b496c065/650379514_881363088287028_164620244827919358_n.jpg"),
  food("Biofresh", "biofresh-timisoara", ["vegan"], "Cetate", 45.7574, 21.2288, "Str. Francesco Griselini nr. 2, Timișoara", [35, 55], { localMean: 7.8, touristMean: 8.2, locals: 14, tourists: 6 }, { available: true, platforms: ["Wolt", "Glovo"] }, "https://bookingham.ro/upload/business/1053/photo_large.webp"),
  food("Suppa Bar", "suppa-bar", ["romanesc"], "Cetate", 45.7568, 21.2275, "Str. Emanoil Ungureanu nr. 17, Timișoara", [18, 30], { localMean: 7.2, touristMean: 6.5, locals: 20, tourists: 1 }, { available: true, platforms: ["Wolt", "Glovo"] }, "https://zilesinopti.ro/wp-content/uploads/2023/10/ciorba-buna-timisoara-suppa-bar-2.jpg"),
  food("Pizza Napoleon", "pizza-napoleon", ["pizza", "street-food"], "Complexul Studențesc", 45.7478, 21.2398, "Aleea Studenților nr. 5, Timișoara", [12, 25], { localMean: 7.4, touristMean: 7.0, locals: 12, tourists: 1 }, { available: true, platforms: ["Wolt", "Glovo", "Bolt Food", "Livrare proprie"], ownDelivery: true }, "https://www.timisoreni.ro/upload/photo/2026-10/napoleon-timisoara-complex-stundentesc_large.jpg"),
  food("Vinto Gastro Wine Bar", "vinto-gastro-wine-bar", ["bistro"], "Cetate", 45.7571, 21.2286, "Str. Florimund Mercy nr. 4, Timișoara", [50, 90], { localMean: 7.3, touristMean: 7.8, locals: 15, tourists: 15 }, { available: false, note: "Doar servire în local" }, "https://zilesinopti.ro/wp-content/uploads/2017/04/248530404_1437094670004583_3605134225583201781_n-1024x640.jpg"),
  food("Restaurant Sabres", "sabres-restaurant", ["romanesc"], "Elisabetin", 45.7441, 21.2266, "Str. Craiova nr. 1, Timișoara", [35, 55], { localMean: 7.6, touristMean: 7.0, locals: 11, tourists: 2 }, { available: false, note: "Doar servire în local" }, "https://www.sabres.ro/wp-content/uploads/2026/06/AND09489-1.jpg"),
  food("Sushi Ya", "sushi-ya-timisoara", ["asiatic"], "Cetate", 45.7538, 21.2257, "Piața Victoriei nr. 5, Timișoara", [45, 70], { localMean: 7.0, touristMean: 8.0, locals: 10, tourists: 14 }, { available: true, platforms: ["Wolt", "Glovo"] }, "https://sushi-ya.ro/wp-content/uploads/2019/03/53165249_2271655193106091_4132520569029525504_o.jpg"),
  food("Prospero Iulius Town", "prospero-iulius-town", ["patiserie"], "Calea Aradului", 45.7662, 21.2288, "Str. Aristide Demetriade nr. 1, Timișoara", [10, 20], { localMean: 7.7, touristMean: 7.0, locals: 8, tourists: 0 }, { available: true, platforms: ["Wolt", "Glovo"] }, "https://www.timisoreni.ro/upload/photo/2026-06/iulius-photo-rp4zwx_large.jpg"),
  // Scenariul 3: rafală de review-uri false
  food("Harold's", "harolds-restaurant", ["burger"], "Complexul Studențesc", 45.7469, 21.2408, "Aleea Studenților nr. 17, Timișoara", [40, 60], { localMean: 6.8, touristMean: 6.5, locals: 14, tourists: 2, fakeBurst: 20 }, { available: true, platforms: ["Wolt", "Glovo", "Bolt Food"] }, "https://harolds.ro/wp-content/uploads/2025/10/interior.jpg"),
  // Zone foarte turistice în centru
  food("Miorița", "restaurant-miorita-unirii", ["romanesc"], "Cetate", 45.7582, 21.2294, "Str. Florimund Mercy nr. 7, Timișoara", [60, 95], { localMean: 4.9, touristMean: 8.6, locals: 14, tourists: 36 }, { available: false, note: "Doar servire în local" }, "https://www.timisoreni.ro/upload/photo/2018-01/miorita_large.jpg"),
  food("Bruck", "bruck-cafe-unirii", ["bistro"], "Cetate", 45.7577, 21.2283, "Str. Florimund Mercy nr. 9, Timișoara", [65, 100], { localMean: 6.2, touristMean: 8.0, locals: 12, tourists: 24 }, { available: false, note: "Doar servire în local" }, "https://bookingham.ro/upload/business/1545/photo.webp"),
  food("Lloyd", "restaurant-lloyd-victoriei", ["pizza"], "Cetate", 45.7541, 21.2259, "Piața Victoriei nr. 2, Timișoara", [50, 75], { localMean: 5.8, touristMean: 7.9, locals: 12, tourists: 22 }, { available: false, note: "Doar servire în local" }, "https://ghidulbanatului.ro/wp-content/uploads/2025/07/restaurant-lloyd-timisoara-redeschidere-2025-chef-valentin-pupaza-meniu-nou-banat-3.jpg"),
  food("Restaurant Dinar", "restaurant-dinar", ["bistro"], "Elisabetin", 45.7467, 21.2279, "Str. Barbu Iscovescu nr. 2, Timișoara", [55, 85], { localMean: 6.9, touristMean: 7.6, locals: 13, tourists: 12 }, { available: true, platforms: ["Wolt", "Glovo"] }, "https://zilesinopti.ro/wp-content/uploads/2021/08/74451565155548f792575f6.42280889.jpg"),

  // ---------- DRINK (10) ----------
  drink("Scârț Loc Lejer", "scart-loc-lejer", ["pub"], "Elisabetin", 45.7462, 21.2288, "Str. Arhitect László Székely nr. 1, Timișoara", { beer05l: 14, cocktail: 30 }, { localMean: 8.9, touristMean: 8.4, locals: 30, tourists: 10, weekendNight: 9.2, weekday: 8.3 }, { available: false, note: "Doar servire în local" }, "https://visit-timis.ro/rails/active_storage/representations/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTI2NTczLCJwdXIiOiJibG9iX2lkIn19--b7c1d725ef6c6c5f38f08d8f8e47fbfe11d6dc0a/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJ3ZWJwIiwicmVzaXplX3RvX2ZpdCI6WzE0MDAsMTQwMF19LCJwdXIiOiJ2YXJpYXRpb24ifX0=--7cf04819a75bca128464c01137eb4f04b496c065/482087203_1056715446496858_7353868285113030005_n.jpg"),
  drink("Aethernativ Café", "aethernativ-cafe", ["cocktail-bar"], "Cetate", 45.7554, 21.2261, "Str. Mărășești nr. 14, Timișoara", { beer05l: 16, cocktail: 32 }, { localMean: 8.6, touristMean: 8.2, locals: 22, tourists: 5, weekendNight: 8.7, weekday: 8.5 }, { available: false, note: "Doar servire în local" }, "https://visit-timis.ro/rails/active_storage/representations/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTI2MDM0LCJwdXIiOiJibG9iX2lkIn19--0ef0d169416bc77bce0491b81bc981a3085b1c57/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJ3ZWJwIiwicmVzaXplX3RvX2ZpdCI6WzE0MDAsMTQwMF19LCJwdXIiOiJ2YXJpYXRpb24ifX0=--7cf04819a75bca128464c01137eb4f04b496c065/36176495_1736196776429041_2013076460402638848_n.jpg"),
  // Scenariul 5: excelent vineri noaptea, slab marțea
  drink("The 80's Pub", "the-80s-pub", ["club"], "Elisabetin", 45.7438, 21.2339, "Str. Arieș nr. 19, Timișoara", { beer05l: 15, cocktail: 30 }, { localMean: 8.2, touristMean: 8.0, locals: 26, tourists: 6, weekendNight: 9.1, weekday: 6.0 }, { available: false, note: "Doar servire în local" }, "https://visit-timis.ro/rails/active_storage/representations/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTI2MDUxLCJwdXIiOiJibG9iX2lkIn19--75c0ba8c28c22aa938174c4e7f6552b6eb241a14/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJ3ZWJwIiwicmVzaXplX3RvX2ZpdCI6WzE0MDAsMTQwMF19LCJwdXIiOiJ2YXJpYXRpb24ifX0=--7cf04819a75bca128464c01137eb4f04b496c065/477341347_3169178599908948_5445388176706805250_n.jpg"),
  drink("Berăria 700", "beraria-700", ["pub"], "Cetate", 45.7556, 21.2207, "Str. Coriolan Brediceanu nr. 4, Timișoara", { beer05l: 11, cocktail: 25 }, { localMean: 8.3, touristMean: 7.5, locals: 20, tourists: 2, weekendNight: 8.4, weekday: 8.2 }, { available: true, platforms: ["Wolt", "Glovo"], note: "Livrează preparate calde din meniu" }, "https://visit-timis.ro/rails/active_storage/representations/redirect/eyJfcmFpbHMiOnsiZGF0YSI6MTI0ODE3LCJwdXIiOiJibG9iX2lkIn19--af7d745af1a157059c0583b7270c1d2f24cba1e9/eyJfcmFpbHMiOnsiZGF0YSI6eyJmb3JtYXQiOiJ3ZWJwIiwicmVzaXplX3RvX2ZpdCI6WzE0MDAsMTQwMF19LCJwdXIiOiJ2YXJpYXRpb24ifX0=--7cf04819a75bca128464c01137eb4f04b496c065/14570728_201289543627472_2323011334516176166_o.jpg"),
  drink("FABER", "faber-timisoara", ["cafenea-de-seara"], "Fabric", 45.7568, 21.2465, "Splaiul Peneș Curcanul nr. 4-5, Timișoara", { beer05l: 13, cocktail: 28 }, { localMean: 8.0, touristMean: 7.8, locals: 16, tourists: 3, weekendNight: 7.9, weekday: 8.1 }, { available: false, note: "Doar servire în local" }, "https://faber.ro/media/images/faber_front_mies01.width-1200.height-630.jpegquality-85.jpg"),
  drink("Manufactura", "manufactura-pub", ["pub", "muzica-live"], "Iosefin", 45.7484, 21.2121, "Splaiul Tudor Vladimirescu nr. 9, Timișoara", { beer05l: 15, cocktail: 33 }, { localMean: 8.4, touristMean: 8.6, locals: 15, tourists: 9, weekendNight: 8.8, weekday: 8.0 }, { available: false, note: "Doar servire în local" }, "https://zilesinopti.ro/wp-content/uploads/2021/08/131481281358e2423f275615.91094417-1024x661.jpg"),
  drink("No Name Club", "no-name-club", ["club"], "Complexul Studențesc", 45.7433, 21.2421, "Bd. Doctor Iosif Bulbuca nr. 11, Timișoara", { beer05l: 10, cocktail: 22 }, { localMean: 7.6, touristMean: 7.2, locals: 24, tourists: 2, weekendNight: 8.0, weekday: 6.8 }, { available: false, note: "Doar în local" }, "https://www.timisoreni.ro/upload/photo/2020-05/club-no-name-timisoara_large.jpg"),
  drink("Reciproc Café", "reciproc-cafe", ["pub"], "Cetate", 45.7568, 21.2335, "Piața Ionel I.C. Brătianu, Timișoara", { beer05l: 9, cocktail: 20 }, { localMean: 7.4, touristMean: 6.5, locals: 12, tourists: 0, weekendNight: 7.4, weekday: 7.4 }, { available: false, note: "Doar în local" }, "https://zilesinopti.ro/wp-content/uploads/2016/12/448463600_990204699774017_432062526128582077_n-1024x683.jpg"),
  // Zone turistice de noapte / panoramă
  drink("D'arc pe Mal", "darc-pe-mal", ["terasa"], "Cetate", 45.7518, 21.2296, "Splaiul Tudor Vladimirescu / Podul Mihai Viteazul, Timișoara", { beer05l: 19, cocktail: 42 }, { localMean: 6.4, touristMean: 7.9, locals: 12, tourists: 18, weekendNight: 7.0, weekday: 7.2 }, { available: false, note: "Doar servire în local" }, "https://timisoara2023.eu/images/BCnNry-P4UQPJQaiQCrKoaIUC9M=/3233/width-640%7Cformat-webp/35442313-bbc4-46ee-b1f9-569169e63676"),
  drink("Sky Restaurant & Lounge", "sky-restaurant-timisoara", ["cocktail-bar"], "Cetate", 45.7584, 21.2286, "Str. Coriolan Brediceanu nr. 10, Timișoara", { beer05l: 24, cocktail: 52 }, { localMean: 5.2, touristMean: 8.3, locals: 12, tourists: 30, weekendNight: 7.4, weekday: 7.0 }, { available: false, note: "Doar servire în local" }, "https://www.timisoreni.ro/upload/photo/2014-12/gustare_vitello_tonnato_large.jpg"),
];
