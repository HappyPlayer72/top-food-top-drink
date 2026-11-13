/**
 * Potrivirea aceluiași local între platforme (modulul B).
 * Același local dacă: nume normalizate asemănătoare ȘI (distanță < 50 m SAU același telefon/site).
 * Cazurile nesigure merg în coada de admin.
 */
export type Place = {
  name: string;
  lat: number;
  lng: number;
  phone?: string | null;
  website?: string | null;
};

export type MatchDecision =
  | { status: "match"; index: number; nameSimilarity: number; distanceM: number }
  | { status: "uncertain"; index: number; nameSimilarity: number; distanceM: number }
  | { status: "none" };

export const MATCH = { sameNameMin: 0.85, maybeNameMin: 0.6, closeM: 50, nearM: 150 } as const;

const STOPWORDS = new Set([
  "restaurant", "restaurantul", "pizzeria", "bistro", "bistroul", "cafe", "cafenea", "caffe", "bar", "pub", "club", "terasa",
  "the", "la", "de", "si", "and", "srl", "sa", "pfa", "timisoara",
]);

/** „Restaurantul Ciorba lui Sandu SRL” → „ciorba lui sandu”. */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w))
    .join(" ");
}

/** 0–1: maximul dintre Jaro-Winkler pe tot numele și suprapunerea de cuvinte. */
export function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const ta = new Set(na.split(" "));
  const tb = new Set(nb.split(" "));
  const inter = [...ta].filter((t) => tb.has(t)).length;
  const tokens = inter / Math.min(ta.size, tb.size);
  return Math.round(Math.max(jaroWinkler(na, nb), tokens * 0.95) * 100) / 100;
}

export function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;
  const range = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const ma = new Array<boolean>(a.length).fill(false);
  const mb = new Array<boolean>(b.length).fill(false);
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    for (let j = Math.max(0, i - range); j < Math.min(b.length, i + range + 1); j++) {
      if (!mb[j] && a[i] === b[j]) {
        ma[i] = mb[j] = true;
        matches++;
        break;
      }
    }
  }
  if (!matches) return 0;
  let t = 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!ma[i]) continue;
    while (!mb[k]) k++;
    if (a[i] !== b[k]) t++;
    k++;
  }
  const jaro = (matches / a.length + matches / b.length + (matches - t / 2) / matches) / 3;
  let prefix = 0;
  while (prefix < 4 && a[prefix] === b[prefix]) prefix++;
  return jaro + prefix * 0.1 * (1 - jaro);
}

export function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const h =
    Math.sin(toRad(b.lat - a.lat) / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(toRad(b.lng - a.lng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const normalizePhone = (p?: string | null) => (p ? p.replace(/\D/g, "").replace(/^(40|0040)/, "0") : "");
export const normalizeHost = (u?: string | null) => {
  if (!u) return "";
  try {
    return new URL(u.startsWith("http") ? u : `https://${u}`).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

function sameContact(a: Place, b: Place): boolean {
  const pa = normalizePhone(a.phone);
  const ha = normalizeHost(a.website);
  return (!!pa && pa === normalizePhone(b.phone)) || (!!ha && ha === normalizeHost(b.website));
}

/** Caută `candidate` printre localele cunoscute și decide: același local, nesigur sau local nou. */
export function findMatch(candidate: Place, known: Place[]): MatchDecision {
  let best: MatchDecision = { status: "none" };
  let bestScore = 0;
  known.forEach((k, index) => {
    const sim = nameSimilarity(candidate.name, k.name);
    const distanceM = Math.round(haversineM(candidate, k));
    const contact = sameContact(candidate, k);
    let status: "match" | "uncertain" | null = null;
    if (sim >= MATCH.sameNameMin && (distanceM < MATCH.closeM || contact)) status = "match";
    else if (sim >= MATCH.maybeNameMin && (distanceM < MATCH.nearM || contact)) status = "uncertain";
    else if (contact && distanceM < MATCH.closeM) status = "uncertain";
    if (!status) return;
    const score = (status === "match" ? 2 : 1) + sim;
    if (score > bestScore) {
      bestScore = score;
      best = { status, index, nameSimilarity: sim, distanceM };
    }
  });
  return best;
}
