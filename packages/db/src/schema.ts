/**
 * Modelul de date TOP FOOD / TOP DRINK (docs/ARHITECTURA.md → Modelul de date).
 *
 * Coloanele sunt camelCase în TypeScript și snake_case în Postgres (casing: "snake_case").
 * Regula 1: tabelele de monetizare (partnerships, adSlots) NU se citesc din scoring sau leaderboard.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  date,
  geometry,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

// ---------- Tipuri comune ----------

/** Poligon PostGIS pentru granițele orașului (GeoJSON la intrare/ieșire prin ST_GeomFromGeoJSON). */
const multiPolygon = customType<{ data: string }>({
  dataType: () => "geometry(MultiPolygon, 4326)",
});

/** Bytes brute (poza bonului). Se șterg după decizia adminului (GDPR). */
const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

const point = () => geometry({ type: "point", mode: "xy", srid: 4326 });
const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();

export const vertical = pgEnum("vertical", ["food", "drink"]);
export const reviewSource = pgEnum("review_source", ["native", "google", "tripadvisor", "facebook", "tiktok", "instagram"]);
export const socialPlatform = pgEnum("social_platform", ["tiktok", "instagram", "facebook", "youtube"]);
export const authorType = pgEnum("author_type", ["local", "tourist", "unknown"]);
export const reviewStatus = pgEnum("review_status", ["published", "flagged", "hidden"]);
/** `pending` = adăugat de un user de mână, așteaptă aprobarea unui admin. */
export const venueStatus = pgEnum("venue_status", ["active", "closed", "pending"]);
export const userRole = pgEnum("user_role", ["user", "local", "influencer", "owner", "employee", "admin"]);
export const verificationMethod = pgEnum("verification_method", ["gps", "university_email", "vouch"]);
export const verificationStatus = pgEnum("verification_status", ["pending", "verified", "rejected", "expired"]);
export const claimMethod = pgEnum("claim_method", ["google_business", "phone_code", "cui"]);
export const claimStatus = pgEnum("claim_status", ["pending", "verified", "rejected"]);
export const managerRole = pgEnum("manager_role", ["owner", "manager"]);
export const postType = pgEnum("post_type", ["menu", "event", "offer", "news"]);
export const submissionStatus = pgEnum("submission_status", ["pending", "processed", "failed"]);
export const partnershipPlan = pgEnum("partnership_plan", ["basic", "highlight"]);
export const paymentStatus = pgEnum("payment_status", ["pending", "paid", "failed", "cancelled"]);
export const reportTarget = pgEnum("report_target", ["review", "venue", "owner_claim", "trap_appeal", "user", "post"]);
export const reportStatus = pgEnum("report_status", ["open", "resolved", "rejected"]);
export const matchStatus = pgEnum("match_status", ["pending", "confirmed", "rejected"]);
/** Ce îl interesează pe user (opțional): alege întrebările din review și ordinea topurilor. Nu e o declarație despre dizabilitate. */
export const interest = pgEnum("interest", ["accesibilitate", "lucru", "iesiri", "mancare"]);
/** Răspunsul unui client la o întrebare din review; „nu am observat” nu intră în procente. */
export const featureAnswer = pgEnum("feature_answer", ["yes", "no", "not_observed"]);
/** Declarația owner-ului; „nespecificat” = lipsa rândului. */
export const declarationValue = pgEnum("declaration_value", ["yes", "no"]);
/** Voturile rapide din bara localului: siguranță 1–5, zgomot 1–4 (liniștit … zgomotos). */
export const quickVoteKind = pgEnum("quick_vote_kind", ["safety", "noise"]);
/** Cum s-a dovedit vizita la local (pondere ×1,3): check-in GPS la local sau poza bonului aprobată de admin. */
export const visitProofMethod = pgEnum("visit_proof_method", ["gps", "receipt"]);

// ---------- Oraș ----------

export const cities = pgTable("cities", {
  slug: text().primaryKey(), // "timisoara"
  name: text().notNull(), // "Timișoara"
  boundary: multiPolygon(),
  neighborhoods: text().array().notNull().default(sql`'{}'::text[]`),
  /** Prețuri medii locale: { food: { romanesc: 45, pizza: 40 }, drink: { beer05l: 14, cocktail: 32 } } (lei). */
  localAveragePrices: jsonb().$type<CityPrices>().notNull().default({ food: {}, drink: {} }),
  /** Media orașului pe scara 0–10, recalculată de scoring; ancora din formula Scorului Onest. */
  meanScore: jsonb().$type<{ food: number; drink: number }>().notNull().default({ food: 7, drink: 7 }),
  updatedAt: createdAt(),
});

export const touristZones = pgTable(
  "tourist_zones",
  {
    id: uuid().primaryKey().defaultRandom(),
    citySlug: text().notNull().references(() => cities.slug),
    name: text().notNull(),
    location: point().notNull(),
    radiusM: integer().notNull().default(300),
  },
  (t) => [index().using("gist", t.location)],
);

// ---------- Local ----------

export const venues = pgTable(
  "venues",
  {
    id: uuid().primaryKey().defaultRandom(),
    citySlug: text().notNull().references(() => cities.slug),
    vertical: vertical().notNull(),
    name: text().notNull(),
    slug: text().notNull(),
    categories: text().array().notNull().default(sql`'{}'::text[]`),
    location: point().notNull(),
    address: text(),
    neighborhood: text(),
    phone: text(),
    website: text(),
    /** 1–4, ca la Google ($–$$$$). */
    priceLevel: integer(),
    /** Interval de preț în lei pe persoană (food) sau, pentru drink, prețul berii 0,5 l / cocktail. */
    priceMinLei: integer(),
    priceMaxLei: integer(),
    drinkPrices: jsonb().$type<{ beer05l?: number; cocktail?: number }>(),
    openingHours: jsonb().$type<OpeningHours>(),
    status: venueStatus().notNull().default("active"),
    /** Cine l-a adăugat (null = ingestia automată sau seed). */
    addedBy: uuid(),

    // Prezentare (scrisă de owner sau de echipă)
    photos: text().array().notNull().default(sql`'{}'::text[]`),
    editorialHeadline: text(),
    editorialWriteup: text().array().notNull().default(sql`'{}'::text[]`),
    /** „prânz rapid”, „întâlnire”, „cu copiii”… */
    occasionTags: text().array().notNull().default(sql`'{}'::text[]`),
    /** TOP DRINK: „muzica-live”, „se-danseaza”… */
    drinkTags: text().array().notNull().default(sql`'{}'::text[]`),
    /** Media aspectelor din review-uri, pe scara 0–10 (scrisă de scoring). */
    aspectScores: jsonb().$type<Record<string, number>>(),

    /** Pictograma din lista /owner, aleasă de owner: simbol + culoare (chei validate în packages/owner) sau poză mică (data URL, ≤ 30 000 de caractere). */
    ownerIconSymbol: text(),
    ownerIconColor: text(),
    ownerIconImage: text(),

    // Scoruri (scrise DOAR de packages/scoring)
    honestScore: real(),
    localsScore: real(),
    touristsScore: real(),
    totalWeight: real(),
    touristTrapIndex: integer(),
    /** Motivele afișate la „De ce?” (regula 3). */
    scoreExplanation: jsonb().$type<ScoreExplanation>(),
    scoreUpdatedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex().on(t.citySlug, t.vertical, t.slug),
    index().using("gist", t.location),
    index().on(t.citySlug, t.vertical, t.honestScore),
    check("venues_owner_icon_image_size", sql`length(${t.ownerIconImage}) <= 30000`),
  ],
);

/** ID-urile localului pe platformele externe + ratingul brut de acolo. */
export const venueSources = pgTable(
  "venue_sources",
  {
    venueId: uuid().notNull().references(() => venues.id, { onDelete: "cascade" }),
    source: reviewSource().notNull(),
    externalId: text().notNull(),
    rawRating: real(),
    rawReviewCount: integer(),
    url: text(),
    fetchedAt: timestamp({ withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.source, t.externalId] }), index().on(t.venueId)],
);

/** Potriviri nesigure între platforme → coada de admin (modulul B → J). */
export const matchCandidates = pgTable("match_candidates", {
  id: uuid().primaryKey().defaultRandom(),
  venueId: uuid().notNull().references(() => venues.id, { onDelete: "cascade" }),
  source: reviewSource().notNull(),
  externalId: text().notNull(),
  payload: jsonb().notNull(),
  nameSimilarity: real().notNull(),
  distanceM: real(),
  status: matchStatus().notNull().default("pending"),
  decidedBy: uuid().references(() => users.id),
  createdAt: createdAt(),
});

// ---------- Useri și verificare ----------

export const users = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  username: text().notNull().unique(),
  displayName: text().notNull(),
  email: text().unique(),
  phone: text().unique(),
  passwordHash: text(),
  googleId: text().unique(),
  roles: userRole().array().notNull().default(sql`'{user}'::user_role[]`),
  avatarUrl: text(),
  /** Orașul în care e localnic verificat + până când (insigna expiră după 12 luni fără activitate). */
  localCitySlug: text().references(() => cities.slug),
  localNeighborhood: text(),
  localUntil: timestamp({ withTimezone: true }),
  followers: integer(),
  /** Preferințele opționale (pot fi sărite și schimbate din profil). */
  interests: interest().array().notNull().default(sql`'{}'::interest[]`),
  createdAt: createdAt(),
});

export const userSocialLinks = pgTable(
  "user_social_links",
  {
    userId: uuid().notNull().references(() => users.id, { onDelete: "cascade" }),
    platform: socialPlatform().notNull(),
    url: text().notNull(),
    /** true doar după OAuth (influencer). */
    verified: boolean().notNull().default(false),
    followers: integer(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.platform] })],
);

/** GDPR: doar ziua și orașul/localul, niciodată coordonatele sau traseul. */
export const checkins = pgTable(
  "checkins",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid().notNull().references(() => users.id, { onDelete: "cascade" }),
    citySlug: text().notNull().references(() => cities.slug),
    venueId: uuid().references(() => venues.id, { onDelete: "set null" }),
    day: date().notNull(),
  },
  (t) => [uniqueIndex().on(t.userId, t.citySlug, t.day, t.venueId)],
);

export const localVerifications = pgTable("local_verifications", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid().notNull().references(() => users.id, { onDelete: "cascade" }),
  citySlug: text().notNull().references(() => cities.slug),
  method: verificationMethod().notNull(),
  status: verificationStatus().notNull().default("pending"),
  /** Dovezi minime: zilele cu check-in, domeniul de email sau ID-urile garanților. */
  evidence: jsonb().notNull().default({}),
  verifiedAt: timestamp({ withTimezone: true }),
  expiresAt: timestamp({ withTimezone: true }),
  createdAt: createdAt(),
});

export const vouches = pgTable(
  "vouches",
  {
    voucherId: uuid().notNull().references(() => users.id, { onDelete: "cascade" }),
    voucheeId: uuid().notNull().references(() => users.id, { onDelete: "cascade" }),
    citySlug: text().notNull().references(() => cities.slug),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.voucherId, t.voucheeId, t.citySlug] })],
);

// ---------- Owner ----------

export const ownerClaims = pgTable("owner_claims", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid().notNull().references(() => users.id, { onDelete: "cascade" }),
  venueId: uuid().notNull().references(() => venues.id, { onDelete: "cascade" }),
  method: claimMethod().notNull(),
  status: claimStatus().notNull().default("pending"),
  cui: text(),
  /** Hash-ul codului trimis prin SMS/apel; niciodată codul în clar. */
  codeHash: text(),
  /** Încercări de confirmare; după 5 cererea e respinsă (anti-ghicire a codului). */
  attempts: integer().notNull().default(0),
  decidedBy: uuid().references(() => users.id),
  decidedAt: timestamp({ withTimezone: true }),
  createdAt: createdAt(),
});

export const venueManagers = pgTable(
  "venue_managers",
  {
    venueId: uuid().notNull().references(() => venues.id, { onDelete: "cascade" }),
    userId: uuid().notNull().references(() => users.id, { onDelete: "cascade" }),
    role: managerRole().notNull(),
  },
  (t) => [primaryKey({ columns: [t.venueId, t.userId] })],
);

export const posts = pgTable(
  "posts",
  {
    id: uuid().primaryKey().defaultRandom(),
    venueId: uuid().notNull().references(() => venues.id, { onDelete: "cascade" }),
    authorId: uuid().notNull().references(() => users.id),
    type: postType().notNull(),
    title: text().notNull(),
    body: text().notNull(),
    photos: text().array().notNull().default(sql`'{}'::text[]`),
    /** Pentru evenimente (DJ, concerte) → pagina topdrink/{oras}/weekend. */
    eventAt: timestamp({ withTimezone: true }),
    publishAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.venueId, t.publishAt), index().on(t.eventAt)],
);

export const employees = pgTable("employees", {
  id: uuid().primaryKey().defaultRandom(),
  venueId: uuid().notNull().references(() => venues.id, { onDelete: "cascade" }),
  userId: uuid().references(() => users.id, { onDelete: "set null" }),
  firstName: text().notNull(),
  role: text().notNull(),
  photoUrl: text(),
  /** Angajatul apare public doar după ce acceptă (GDPR). */
  accepted: boolean().notNull().default(false),
  active: boolean().notNull().default(true),
  createdAt: createdAt(),
});

// ---------- Review-uri ----------

export const reviews = pgTable(
  "reviews",
  {
    id: uuid().primaryKey().defaultRandom(),
    venueId: uuid().notNull().references(() => venues.id, { onDelete: "cascade" }),
    source: reviewSource().notNull(),
    externalId: text(),
    authorId: uuid().references(() => users.id, { onDelete: "set null" }),
    /** Autorul de pe platforma externă: { name, reviewCount, profileUrl, citiesReviewed }. */
    externalAuthor: jsonb().$type<ExternalAuthor>(),
    /** Nota pe scara 0–10 (convertită din 1–5 etc.). */
    rating: real().notNull(),
    originalRating: real().notNull(),
    originalScale: integer().notNull().default(5),
    text: text(),
    language: text(),
    visitedAt: date(),
    /** TOP DRINK: momentul vizitei → scor „vineri–sâmbătă noaptea” vs „în timpul săptămânii”. */
    visitWeekendNight: boolean(),
    postedAt: timestamp({ withTimezone: true }).notNull(),
    servedByEmployeeId: uuid().references(() => employees.id, { onDelete: "set null" }),

    // Rezultatele analizei (modulul C)
    authorType: authorType().notNull().default("unknown"),
    aspects: jsonb().$type<Record<string, number>>(),
    isPaid: boolean().notNull().default(false),
    verifiedVisit: boolean().notNull().default(false),
    /** Cum a fost verificată vizita (null = neverificată). */
    verifiedVia: visitProofMethod(),
    fakeProbability: real().notNull().default(0),
    fakeSignals: jsonb().$type<string[]>().notNull().default([]),
    /** Un admin a confirmat că e scris de un om: analiza anti-bot nu-l mai reține. */
    botCleared: boolean().notNull().default(false),
    /** Ponderea finală (modulul D). */
    weight: real(),
    embedding: vector({ dimensions: 384 }),
    analyzedAt: timestamp({ withTimezone: true }),
    status: reviewStatus().notNull().default("published"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex().on(t.source, t.externalId),
    index().on(t.venueId, t.postedAt),
    index().on(t.authorId),
  ],
);

/**
 * Răspunsurile structurate dintr-un review („Intrarea e fără trepte?” → Da / Nu / Nu am observat).
 * Cheile întrebărilor sunt în packages/scoring/src/features.ts. Doar ce a bifat userul — nu deducem din text.
 */
export const reviewAnswers = pgTable(
  "review_answers",
  {
    reviewId: uuid().notNull().references(() => reviews.id, { onDelete: "cascade" }),
    questionKey: text().notNull(),
    answer: featureAnswer().notNull(),
  },
  (t) => [primaryKey({ columns: [t.reviewId, t.questionKey] }), index().on(t.questionKey)],
);

/** Facilitățile declarate de owner/manager, separat de răspunsurile clienților. */
export const venueFacilityDeclarations = pgTable(
  "venue_facility_declarations",
  {
    venueId: uuid().notNull().references(() => venues.id, { onDelete: "cascade" }),
    questionKey: text().notNull(),
    value: declarationValue().notNull(),
    updatedBy: uuid().references(() => users.id, { onDelete: "set null" }),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.venueId, t.questionKey] })],
);

/**
 * Vot rapid, fără review: un vot per user, per local, per tip (se poate schimba oricând).
 * Se afișează (medie / nivel obișnuit, de la prag) și dă avertizări; nu intră în ordinea topurilor.
 */
export const venueQuickVotes = pgTable(
  "venue_quick_votes",
  {
    venueId: uuid().notNull().references(() => venues.id, { onDelete: "cascade" }),
    userId: uuid().notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: quickVoteKind().notNull(),
    value: smallint().notNull(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.venueId, t.userId, t.kind] }),
    check("venue_quick_votes_value", sql`${t.value} between 1 and (case when ${t.kind} = 'noise' then 4 else 5 end)`),
  ],
);

/**
 * Dovada vizitei prin bon: poza așteaptă un admin. La decizie poza se șterge (rămân doar hash-ul,
 * ca același bon să nu fie folosit de două ori, și decizia).
 */
export const visitProofs = pgTable(
  "visit_proofs",
  {
    id: uuid().primaryKey().defaultRandom(),
    reviewId: uuid().notNull().references(() => reviews.id, { onDelete: "cascade" }),
    userId: uuid().notNull().references(() => users.id, { onDelete: "cascade" }),
    venueId: uuid().notNull().references(() => venues.id, { onDelete: "cascade" }),
    method: visitProofMethod().notNull().default("receipt"),
    status: verificationStatus().notNull().default("pending"),
    image: bytea(),
    imageType: text(),
    /** SHA-256 al pozei: același bon nu poate verifica două review-uri. */
    imageHash: text().notNull(),
    decision: text(),
    decidedBy: uuid().references(() => users.id),
    decidedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex().on(t.imageHash), index().on(t.status, t.createdAt), index().on(t.reviewId)],
);

/**
 * Cum a fost trimis un review nativ (anti-bot, docs/ANTI-BOT.md). Nu păstrăm IP-ul: doar un HMAC al
 * IP-ului + browserului (`clientHash`), cu cheia serverului, ca să recunoaștem același dispozitiv
 * folosit de mai multe conturi. Rândurile se șterg după 90 de zile (jobul de noapte).
 */
export const reviewSubmissions = pgTable(
  "review_submissions",
  {
    reviewId: uuid().primaryKey().references(() => reviews.id, { onDelete: "cascade" }),
    userId: uuid().notNull().references(() => users.id, { onDelete: "cascade" }),
    venueId: uuid().notNull().references(() => venues.id, { onDelete: "cascade" }),
    clientHash: text(),
    /** Cât a stat formularul deschis până la trimitere (ms), din tokenul semnat de server. */
    fillMs: integer(),
    /** Vârsta contului la trimitere (secunde). */
    accountAgeSec: integer(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.clientHash, t.createdAt), index().on(t.userId, t.createdAt), index().on(t.createdAt)],
);

export const reviewReplies = pgTable("review_replies", {
  id: uuid().primaryKey().defaultRandom(),
  reviewId: uuid().notNull().references(() => reviews.id, { onDelete: "cascade" }),
  authorId: uuid().notNull().references(() => users.id),
  text: text().notNull(),
  createdAt: createdAt(),
});

export const employeeRatings = pgTable(
  "employee_ratings",
  {
    id: uuid().primaryKey().defaultRandom(),
    employeeId: uuid().notNull().references(() => employees.id, { onDelete: "cascade" }),
    reviewId: uuid().references(() => reviews.id, { onDelete: "set null" }),
    userId: uuid().notNull().references(() => users.id, { onDelete: "cascade" }),
    /** "2026-10" — anti-abuz: un rating per angajat per lună. */
    month: text().notNull(),
    friendliness: integer().notNull(),
    speed: integer().notNull(),
    comment: text(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex().on(t.employeeId, t.userId, t.month)],
);

/** Link TikTok/Instagram/Facebook trimis de useri (nivelul 3 de ingestie). */
export const socialSubmissions = pgTable("social_submissions", {
  id: uuid().primaryKey().defaultRandom(),
  venueId: uuid().notNull().references(() => venues.id, { onDelete: "cascade" }),
  submittedBy: uuid().references(() => users.id, { onDelete: "set null" }),
  platform: socialPlatform().notNull(),
  url: text().notNull().unique(),
  status: submissionStatus().notNull().default("pending"),
  /** { sentiment, dishes, priceMentioned, isAd, adSignals } */
  analysis: jsonb(),
  createdAt: createdAt(),
});

/** TOP DRINK „vibe check”: cât e de plin acum (1–5), expiră după 2 ore. */
export const vibeChecks = pgTable(
  "vibe_checks",
  {
    id: uuid().primaryKey().defaultRandom(),
    venueId: uuid().notNull().references(() => venues.id, { onDelete: "cascade" }),
    userId: uuid().references(() => users.id, { onDelete: "set null" }),
    level: integer().notNull(),
    createdAt: createdAt(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [index().on(t.venueId, t.expiresAt)],
);

/** „Ce să comanzi”: felurile recomandate, puse de owner. */
export const menuItems = pgTable(
  "menu_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    venueId: uuid().notNull().references(() => venues.id, { onDelete: "cascade" }),
    /** Secțiunea din meniu (ex. „Ciorbe”); ordinea secțiunilor = ordinea primului fel din fiecare. */
    category: text().notNull().default(""),
    name: text().notNull(),
    priceLei: integer(),
    description: text(),
    mustOrder: boolean().notNull().default(false),
    position: integer().notNull().default(0),
    /** Poză mică (data URL JPEG, micșorată în browser). Publicul o ia prin /api/menu-photo/{id}, nu inline. */
    photo: text(),
  },
  (t) => [
    index().on(t.venueId, t.position),
    // shortcut: pozele stau în Postgres; când avem storage (ex. Supabase Storage), aici rămâne doar URL-ul.
    check("menu_items_photo_size", sql`length(${t.photo}) <= 40000`),
  ],
);

/** Voturi „util” pe review-uri: un vot per user per review. */
export const reviewVotes = pgTable(
  "review_votes",
  {
    reviewId: uuid().notNull().references(() => reviews.id, { onDelete: "cascade" }),
    userId: uuid().notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.reviewId, t.userId] })],
);

// ---------- Fidelitate (carduri cu ștampile) ----------

/**
 * Program de fidelitate: al unui local (creat de owner, ștampile prin QR rotativ)
 * sau personal (un user își ține evidența la o cafenea care nu e pe platformă).
 */
export const loyaltyPrograms = pgTable("loyalty_programs", {
  id: uuid().primaryKey().defaultRandom(),
  venueId: uuid().references(() => venues.id, { onDelete: "cascade" }),
  createdBy: uuid().notNull().references(() => users.id, { onDelete: "cascade" }),
  /** Doar pentru programele personale (fără local pe platformă). */
  customName: text(),
  rewardTitle: text().notNull(),
  stampsRequired: integer().notNull(),
  icon: text().notNull().default("heart"),
  accentColor: text(),
  /** Secretul cu care se semnează codul QR rotativ (nu iese niciodată din backend). */
  stampSecret: text(),
  active: boolean().notNull().default(true),
  createdAt: createdAt(),
});

export const loyaltyCards = pgTable(
  "loyalty_cards",
  {
    id: uuid().primaryKey().defaultRandom(),
    programId: uuid().notNull().references(() => loyaltyPrograms.id, { onDelete: "cascade" }),
    userId: uuid().notNull().references(() => users.id, { onDelete: "cascade" }),
    stamps: integer().notNull().default(0),
    redeemed: integer().notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex().on(t.programId, t.userId)],
);

/** Istoricul ștampilelor; anti-trișat: o ștampilă pe card pe zi. */
export const loyaltyStamps = pgTable(
  "loyalty_stamps",
  {
    id: uuid().primaryKey().defaultRandom(),
    cardId: uuid().notNull().references(() => loyaltyCards.id, { onDelete: "cascade" }),
    day: date().notNull(),
    kind: text().notNull().default("stamp"), // "stamp" | "redeem"
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex().on(t.cardId, t.day, t.kind)],
);

// ---------- Monetizare (NU se citește din scoring/leaderboard) ----------

export const partnerships = pgTable("partnerships", {
  id: uuid().primaryKey().defaultRandom(),
  venueId: uuid().notNull().references(() => venues.id, { onDelete: "cascade" }),
  plan: partnershipPlan().notNull(),
  startsAt: timestamp({ withTimezone: true }).notNull(),
  endsAt: timestamp({ withTimezone: true }).notNull(),
  paymentStatus: paymentStatus().notNull().default("pending"),
  createdAt: createdAt(),
});

export const adSlots = pgTable("ad_slots", {
  id: uuid().primaryKey().defaultRandom(),
  citySlug: text().notNull().references(() => cities.slug),
  vertical: vertical().notNull(),
  placement: text().notNull(),
  advertiser: text().notNull(),
  creativeUrl: text().notNull(),
  linkUrl: text().notNull(),
  startsAt: timestamp({ withTimezone: true }).notNull(),
  endsAt: timestamp({ withTimezone: true }).notNull(),
  impressions: integer().notNull().default(0),
  clicks: integer().notNull().default(0),
});

// ---------- Leaderboard ----------

export const leaderboardSnapshots = pgTable(
  "leaderboard_snapshots",
  {
    id: uuid().primaryKey().defaultRandom(),
    citySlug: text().notNull().references(() => cities.slug),
    vertical: vertical().notNull(),
    /** "all" pentru topul general. */
    category: text().notNull(),
    /** "2026-10" */
    month: text().notNull(),
    entries: jsonb().$type<LeaderboardEntry[]>().notNull(),
    awards: jsonb().$type<LeaderboardAwards>().notNull(),
    frozenAt: createdAt(),
  },
  (t) => [uniqueIndex().on(t.citySlug, t.vertical, t.category, t.month)],
);

// ---------- Moderare ----------

export const reports = pgTable(
  "reports",
  {
    id: uuid().primaryKey().defaultRandom(),
    targetType: reportTarget().notNull(),
    targetId: text().notNull(),
    reportedBy: uuid().references(() => users.id, { onDelete: "set null" }),
    reason: text().notNull(),
    status: reportStatus().notNull().default("open"),
    decision: text(),
    decidedBy: uuid().references(() => users.id),
    decidedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.status, t.createdAt)],
);

export const savedVenues = pgTable(
  "saved_venues",
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    venueSlug: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.venueSlug] })],
);

export const venueViewsDaily = pgTable(
  "venue_views_daily",
  {
    venueId: uuid()
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    day: date().notNull(),
    views: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.venueId, t.day] })],
);

export const venueScoreSnapshots = pgTable(
  "venue_score_snapshots",
  {
    venueId: uuid()
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    day: date().notNull(),
    score: real().notNull(),
    reviewCount: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.venueId, t.day] })],
);

export const moderationDecisions = pgTable(
  "moderation_decisions",
  {
    id: uuid().primaryKey().defaultRandom(),
    targetType: text().notNull(),
    targetId: text().notNull(),
    decision: text().notNull(),
    decidedBy: uuid().references(() => users.id),
    decidedAt: createdAt(),
  },
  (t) => [index().on(t.targetType, t.targetId)],
);

// ---------- Tipuri JSON ----------

export type CityPrices = {
  food: Record<string, number>;
  drink: { beer05l?: number | null; cocktail?: number | null };
};

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
/** Program: { mon: [["11:00", "22:00"]], sat: [["12:00", "02:00"]] }; o zi lipsă = închis. Ora României. */
export type OpeningHours = Partial<Record<Weekday, [string, string][]>>;

export type ExternalAuthor = {
  name: string;
  reviewCount?: number;
  profileUrl?: string;
  /** Câte orașe/țări diferite are în review-uri (semnal de turist). */
  citiesReviewed?: number;
  isLocalGuide?: boolean;
};

export type ScoreExplanation = {
  reviewCount: number;
  localCount: number;
  touristCount: number;
  enoughData: boolean;
  trapLevel: "none" | "possible" | "trap";
  /** Câte review-uri au vizita dovedită (GPS sau bon), cu pondere ×1,3. */
  verifiedVisitCount?: number;
  trapReasons: { signal: string; value: number; points: number; text: string }[];
  trapInputs?: {
    localsScore: number | null;
    touristsScore: number | null;
    distanceToTouristZoneM: number | null;
    priceRatio: number | null;
    foreignLanguageShare: number;
    oneTimeVisitorShare: number;
  };
};

export type LeaderboardEntry = {
  rank: number;
  venueId: string;
  name: string;
  score: number;
  localReviews: number;
  /** Diferența de loc față de luna trecută; null = intră în top. */
  movement: number | null;
};

export type LeaderboardAwards = {
  revelation?: { venueId: string; from: number; to: number };
  employee?: { employeeId: string; venueId: string; mentions: number };
  local?: { userId: string; reviews: number };
  influencer?: { userId: string; reviews: number; followers: number };
};

/** Sondaj public de ieșire; opțiunile sunt slug-urile localurilor active la creare. */
export const outingPolls = pgTable("outing_polls", {
  token: text().primaryKey(),
  venueSlugs: text().array().notNull(),
  createdAt: createdAt(),
});

export const outingPollVotes = pgTable("outing_poll_votes", {
  pollToken: text().notNull().references(() => outingPolls.token, { onDelete: "cascade" }),
  voterHash: text().notNull(),
  venueSlug: text().notNull(),
  updatedAt: createdAt(),
}, (t) => [primaryKey({ columns: [t.pollToken, t.voterHash] })]);

/** Voturi lunare pe categorii din „Topul lunii” (1 vot per user per secțiune per lună). */
export const monthlyCategoryVotes = pgTable(
  "monthly_category_votes",
  {
    month: text().notNull(),
    vertical: vertical().notNull(),
    categoryId: text().notNull(),
    userId: uuid().notNull().references(() => users.id, { onDelete: "cascade" }),
    venueSlug: text().notNull(),
    venueName: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.month, t.vertical, t.categoryId, t.userId] })],
);
