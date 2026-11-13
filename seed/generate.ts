/**
 * Generează useri și review-uri INVENTATE pentru localele din seed/venues.ts.
 * Determinist (același rezultat la fiecare rulare), relativ la data `now`.
 */
import type { SeedVenue } from "./venues.ts";

export type SeedUser = {
  key: string;
  username: string;
  displayName: string;
  /** Localnic verificat (cu cartier) sau user obișnuit. */
  localNeighborhood: string | null;
  roles: ("user" | "local" | "owner" | "influencer")[];
  /** true = cont nou fără istoric (pentru rafala de review-uri false). */
  fresh?: boolean;
};

export type SeedReview = {
  venueSlug: string;
  source: "native" | "google" | "tripadvisor";
  externalId: string | null;
  authorKey: string | null;
  externalAuthor: { name: string; reviewCount: number; citiesReviewed: number } | null;
  originalRating: number;
  originalScale: 5 | 10;
  text: string;
  postedAt: Date;
  visitWeekendNight: boolean | null;
  verifiedVisit: boolean;
  servedBy: string | null;
};

export type SeedCheckin = { userKey: string; venueSlug: string | null; day: string };

// ---------- PRNG determinist ----------
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["Andreea", "Radu", "Ioana", "Mihai", "Alexandra", "Vlad", "Bianca", "Cristian", "Diana", "Paul", "Raluca", "Sorin", "Larisa", "Tudor", "Oana", "Dan", "Ana", "Marius", "Carmen", "Bogdan"];
const LAST = ["M.", "B.", "P.", "C.", "D.", "R.", "S.", "T.", "V.", "G."];
const TOURIST_NAMES = ["Sarah K.", "Thomas W.", "Giulia R.", "Lukas H.", "Emma J.", "Péter N.", "Marco B.", "Anna S.", "James L.", "Julia F.", "Andrei (Cluj)", "Elena (București)"];

const RO_TEXT = {
  food: {
    good: [
      "Mâncare cinstită, porții mari și prețuri corecte. Revin sigur.",
      "Ciorba e excelentă, personalul amabil și nu te grăbește nimeni.",
      "Cel mai bun loc din cartier pentru prânz. Totul gătit în casă.",
      "Vin aici de ani de zile și calitatea a rămas la fel. Recomand cu drag.",
    ],
    mid: [
      "Mâncare bună, dar am așteptat cam mult. Desertul a fost slăbuț.",
      "Ok pentru o masă rapidă, nimic special. Prețul e corect.",
      "Porția a fost mai mică decât data trecută, dar gustul e bun.",
    ],
    bad: [
      "Scump pentru ce primești. Mâncarea a venit rece și ospătarul a fost nepoliticos.",
      "Prețuri de turist, porții mici. Localnicii nu mănâncă aici.",
      "Am plătit dublu față de alte locuri și mâncarea a fost banală.",
    ],
  },
  drink: {
    good: [
      "Atmosferă super, muzica bună și berea rece. Vineri e plin, vino devreme.",
      "Barmanii știu ce fac, cocktailurile sunt bune și prețurile ok.",
      "Locul meu preferat de ieșit. Lume faină, muzică live joia.",
    ],
    mid: [
      "Atmosferă ok, dar e prea aglomerat și greu de găsit loc.",
      "Bere bună, muzica prea tare ca să poți vorbi.",
    ],
    bad: [
      "Cocktail de 50 de lei, slab și cu gheață multă. Doar pentru priveliște.",
      "Gol în timpul săptămânii, servire lentă și prețuri mari.",
    ],
  },
};
const FOREIGN_TEXT: Record<string, { good: string[]; bad: string[] }> = {
  en: {
    good: ["Lovely place right in the old town, great atmosphere and friendly staff. Highly recommended!", "Beautiful terrace on the square, the food was tasty and the view amazing."],
    bad: ["Overpriced for what you get, but the location on the square is nice.", "Very touristy, the food was average and the service slow."],
  },
  de: {
    good: ["Sehr schönes Lokal am Platz, freundliche Bedienung und leckeres Essen.", "Tolle Atmosphäre in der Altstadt, wir kommen gerne wieder."],
    bad: ["Zu teuer für die Qualität, aber die Lage ist schön.", "Typisches Touristenlokal, das Essen war nur durchschnittlich."],
  },
  it: {
    good: ["Posto molto carino in centro, cibo buono e personale gentile.", "Bellissima terrazza nella piazza, consigliato!"],
    bad: ["Troppo caro per quello che offre, il cibo era nella media.", "Molto turistico, servizio lento."],
  },
};
const FAKE_TEXT = ["Super! Recomand!", "Top, recomand", "Cel mai bun! Super!", "Excelent, recomand!", "Perfect! Super!"];

const DAY = 86_400_000;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export function generate(venues: SeedVenue[], now: Date) {
  const rand = mulberry32(42);
  const pick = <T>(xs: T[]) => xs[Math.floor(rand() * xs.length)]!;
  const normal = (mean: number, sd: number) => {
    const u = 1 - rand();
    const v = rand();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

  // Început luna trecută (pentru leaderboard) și „acum”
  const prevMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const thisMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const inPrevMonth = () => new Date(prevMonthStart.getTime() + rand() * (thisMonthStart.getTime() - prevMonthStart.getTime() - DAY));
  const inLast150Days = () => new Date(now.getTime() - (2 + rand() * 148) * DAY);

  // ---------- Useri ----------
  const neighborhoods = [...new Set(venues.map((v) => v.neighborhood))];
  const users: SeedUser[] = [];
  for (let i = 0; i < 60; i++) {
    const name = `${FIRST[i % FIRST.length]} ${LAST[Math.floor(i / FIRST.length) % LAST.length]}`;
    const isLocal = i < 48;
    users.push({
      key: `u${i}`,
      username: `${FIRST[i % FIRST.length]!.toLowerCase()}${i}`,
      displayName: name,
      localNeighborhood: isLocal ? neighborhoods[i % neighborhoods.length]! : null,
      roles: isLocal ? ["user", "local"] : ["user"],
    });
  }
  users.push({ key: "owner-sandu", username: "sandu.proprietar", displayName: "Sandu D.", localNeighborhood: "Iosefin", roles: ["user", "local", "owner"] });
  users.push({ key: "influencer", username: "mananca.in.tm", displayName: "Mănâncă în TM", localNeighborhood: null, roles: ["user", "influencer"] });

  const localUsers = users.filter((u) => u.roles.includes("local") && u.key.startsWith("u"));
  const plainUsers = users.filter((u) => !u.roles.includes("local") && u.key.startsWith("u"));

  const reviews: SeedReview[] = [];
  const checkins: SeedCheckin[] = [];
  let ext = 0;

  for (const v of venues) {
    const texts = RO_TEXT[v.vertical];
    const textFor = (rating: number) => pick(rating >= 8 ? texts.good : rating >= 6 ? texts.mid : texts.bad);
    const drinkRating = (weekend: boolean) => (weekend ? v.profile.weekendNight : v.profile.weekday) ?? v.profile.localMean;

    // Localnici: jumătate în luna trecută (pentru topul lunii), restul în ultimele 150 de zile
    const usedAuthors = new Set<string>();
    for (let i = 0; i < v.profile.locals; i++) {
      const pool = i % 4 === 3 ? plainUsers : localUsers;
      let author = pick(pool);
      for (let t = 0; t < 10 && usedAuthors.has(author.key); t++) author = pick(pool);
      usedAuthors.add(author.key);
      const weekend = v.vertical === "drink" ? rand() < 0.5 : null;
      const mean = weekend === null ? v.profile.localMean : drinkRating(weekend);
      const rating = Math.round(clamp(normal(mean, 0.9), 1, 10));
      const postedAt = i < v.profile.locals / 2 ? inPrevMonth() : inLast150Days();
      reviews.push({
        venueSlug: v.slug,
        source: "native",
        externalId: null,
        authorKey: author.key,
        externalAuthor: null,
        originalRating: rating,
        originalScale: 10,
        text: textFor(rating),
        postedAt,
        visitWeekendNight: weekend,
        verifiedVisit: rand() < 0.4,
        servedBy: v.slug === "ciorba-lui-sandu" && rand() < 0.6 ? "Ioana" : null,
      });
      // Check-in-uri: localnicii fideli revin (mai multe zile la același local)
      const visits = rating >= 8 ? 2 + Math.floor(rand() * 3) : 1;
      for (let d = 0; d < visits; d++) checkins.push({ userKey: author.key, venueSlug: v.slug, day: isoDay(new Date(postedAt.getTime() - d * 9 * DAY)) });
    }

    // Turiști: review-uri de pe Google / Tripadvisor, mai ales în limbi străine
    for (let i = 0; i < v.profile.tourists; i++) {
      const lang = rand() < 0.75 ? pick(["en", "en", "de", "it"]) : "ro";
      const weekend = v.vertical === "drink" ? rand() < 0.6 : null;
      const rating10 = clamp(normal(v.profile.touristMean, 0.9), 2, 10);
      const stars = Math.round(rating10 / 2);
      const text =
        lang === "ro"
          ? `${textFor(stars * 2)} Am fost în vizită în Timișoara.`
          : pick(stars >= 4 ? FOREIGN_TEXT[lang]!.good : FOREIGN_TEXT[lang]!.bad);
      reviews.push({
        venueSlug: v.slug,
        source: rand() < 0.7 ? "google" : "tripadvisor",
        externalId: `seed-ext-${ext++}`,
        authorKey: null,
        externalAuthor: { name: pick(TOURIST_NAMES), reviewCount: 5 + Math.floor(rand() * 60), citiesReviewed: 4 + Math.floor(rand() * 20) },
        originalRating: stars,
        originalScale: 5,
        text,
        postedAt: i % 2 ? inPrevMonth() : inLast150Days(),
        visitWeekendNight: weekend,
        verifiedVisit: false,
        servedBy: null,
      });
    }

    // Scenariul 3: rafală de review-uri false, conturi noi, în ultimele 24h
    for (let i = 0; i < (v.profile.fakeBurst ?? 0); i++) {
      const key = `fake${i}`;
      if (!users.some((u) => u.key === key)) {
        users.push({ key, username: `user${9000 + i}`, displayName: `User ${9000 + i}`, localNeighborhood: null, roles: ["user"], fresh: true });
      }
      reviews.push({
        venueSlug: v.slug,
        source: "native",
        externalId: null,
        authorKey: key,
        externalAuthor: null,
        originalRating: 10,
        originalScale: 10,
        text: pick(FAKE_TEXT),
        postedAt: new Date(now.getTime() - rand() * DAY),
        visitWeekendNight: null,
        verifiedVisit: false,
        servedBy: null,
      });
    }
  }

  // Influencer cu colaborare plătită declarată la Bistro Bega
  reviews.push({
    venueSlug: "bistro-bega",
    source: "native",
    externalId: null,
    authorKey: "influencer",
    externalAuthor: null,
    originalRating: 10,
    originalScale: 10,
    text: "Cel mai elegant bistro din Timișoara, meniu nou de toamnă. #colaborare",
    postedAt: new Date(now.getTime() - 5 * DAY),
    visitWeekendNight: null,
    verifiedVisit: true,
    servedBy: null,
  });

  // Check-in-uri de verificare: fiecare localnic a fost în oraș în ≥ 5 zile din ultimele 30
  for (const u of users.filter((x) => x.roles.includes("local"))) {
    for (let d = 1; d <= 6; d++) checkins.push({ userKey: u.key, venueSlug: null, day: isoDay(new Date(now.getTime() - d * 4 * DAY)) });
  }

  return { users, reviews, checkins };
}
