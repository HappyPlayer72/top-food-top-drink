import { describe, expect, it } from "vitest";
import {
  aggregateAnswers,
  featureStatus,
  isNoisy,
  quickButtonsFor,
  quickNoiseText,
  quickSafetyText,
  quickStats,
  quickWarnings,
  MIN_ANSWERS,
  orderTops,
  QUESTION_BY_KEY,
  questionsForReview,
  rankTheme,
  themeScore,
  wilsonLower,
  type AnswerRow,
  type Declaration,
} from "./features.ts";

const rows = (key: string, yes: number, no: number, notObserved = 0, weight = 1): AnswerRow[] => [
  ...Array.from({ length: yes }, () => ({ questionKey: key, answer: "yes" as const, weight })),
  ...Array.from({ length: no }, () => ({ questionKey: key, answer: "no" as const, weight })),
  ...Array.from({ length: notObserved }, () => ({ questionKey: key, answer: "not_observed" as const, weight })),
];
const entry = QUESTION_BY_KEY.get("intrare_fara_trepte")!;

describe("procente și prag", () => {
  it("„Nu am observat” nu intră în calcul; procentul e Da / (Da + Nu)", () => {
    const s = aggregateAnswers(rows("intrare_fara_trepte", 17, 3, 10)).get("intrare_fara_trepte")!;
    expect([s.yes, s.no]).toEqual([17, 3]);
    expect(featureStatus(entry, s, undefined)).toMatchObject({ state: "community", percent: 85, text: "85% dintre clienți spun că intrarea este fără trepte" });
  });

  it("sub prag: declarația owner-ului, altfel „Nespecificat” (chiar dacă există câteva răspunsuri)", () => {
    const few = aggregateAnswers(rows("intrare_fara_trepte", MIN_ANSWERS - 1, 0)).get("intrare_fara_trepte");
    expect(featureStatus(entry, few, "yes")).toMatchObject({ state: "owner", text: "Declarat de local: Da" });
    expect(featureStatus(entry, few, undefined)).toMatchObject({ state: "unknown", text: "Nespecificat" });
    expect(featureStatus(entry, undefined, undefined).state).toBe("unknown");
  });

  it("surse contradictorii: arată ambele; 50% nu e contradicție", () => {
    const mostlyNo = aggregateAnswers(rows("intrare_fara_trepte", 1, 5)).get("intrare_fara_trepte");
    expect(featureStatus(entry, mostlyNo, "yes")).toMatchObject({ state: "conflict", percent: 17, ownerText: "Declarat de local: Da" });
    const half = aggregateAnswers(rows("intrare_fara_trepte", 3, 3)).get("intrare_fara_trepte");
    expect(featureStatus(entry, half, "no").state).toBe("community");
    const close = aggregateAnswers(rows("intrare_fara_trepte", 101, 100)).get("intrare_fara_trepte");
    expect(featureStatus(entry, close, "no")).toMatchObject({ state: "conflict", percent: 50 });
  });

  it("întrebările necunoscute sunt ignorate", () => {
    expect(aggregateAnswers([{ questionKey: "inventat", answer: "yes", weight: 1 }]).size).toBe(0);
  });
});

describe("Wilson ponderat", () => {
  it("exemplele din propunere", () => {
    const pct = (yes: number, n: number) => Math.round(wilsonLower(yes / n, n) * 100);
    expect([pct(1, 1), pct(5, 5), pct(17, 20), pct(20, 20), pct(85, 100)]).toEqual([21, 57, 64, 84, 77]);
  });

  it("un singur Da nu garantează primul loc", () => {
    const one = themeScore("accesibilitate", aggregateAnswers(rows("intrare_fara_trepte", 1, 0)));
    const many = themeScore("accesibilitate", aggregateAnswers([...rows("intrare_fara_trepte", 18, 2), ...rows("toaleta_accesibila", 15, 5), ...rows("spatiu_intre_mese", 16, 4)]));
    expect(one.eligible).toBe(false);
    expect(many.score).toBeGreaterThan(one.score);
  });

  it("ponderile mici (conturi noi, review-uri suspecte) contează mai puțin", () => {
    const credible = themeScore("lucru", aggregateAnswers([...rows("wifi", 6, 0, 0, 2), ...rows("wifi", 0, 6, 0, 0.3)]));
    const doubtful = themeScore("lucru", aggregateAnswers([...rows("wifi", 6, 0, 0, 0.3), ...rows("wifi", 0, 6, 0, 2)]));
    expect(credible.score).toBeGreaterThan(doubtful.score);
  });
});

describe("topuri tematice", () => {
  const venue = (id: string, answers: AnswerRow[], decl: Record<string, Declaration> = {}, honestScore = 7) => ({
    id,
    name: id,
    honestScore,
    stats: aggregateAnswers(answers),
    declarations: new Map(Object.entries(decl)),
  });

  it("comunitatea înaintea declarațiilor; declarațiile fără Da sau fără date nu apar", () => {
    const { community, declared } = rankTheme("accesibilitate", [
      venue("declarat", [], { intrare_fara_trepte: "yes", toaleta_accesibila: "yes" }, 9.5),
      venue("comunitate-slaba", rows("intrare_fara_trepte", 2, 4)),
      venue("comunitate-buna", [...rows("intrare_fara_trepte", 9, 1), ...rows("toaleta_accesibila", 6, 0)]),
      venue("declarat-nu", [], { intrare_fara_trepte: "no" }),
      venue("nimic", []),
    ]);
    expect(community.map((c) => c.venue.id)).toEqual(["comunitate-buna", "comunitate-slaba"]);
    expect(declared.map((d) => d.venue.id)).toEqual(["declarat"]);
  });

  it("„Liniștea” și Ieșirile nu pot fi declarate de owner, deci nu aduc un local în grupul declarat", () => {
    expect(rankTheme("lucru", [venue("x", [], { liniste: "yes" })]).declared).toEqual([]);
    expect(rankTheme("iesiri", [venue("x", [], { siguranta: "yes", atmosfera: "yes" })]).declared).toEqual([]);
  });

  it("Ieșiri: siguranța e o experiență raportată de clienți, cu același prag și aceeași formulă", () => {
    const s = aggregateAnswers(rows("siguranta", 7, 1));
    expect(featureStatus(QUESTION_BY_KEY.get("siguranta")!, s.get("siguranta"), undefined)).toMatchObject({
      state: "community",
      text: "88% dintre clienți spun că s-au simțit în siguranță în local",
    });
    expect(themeScore("iesiri", s).eligible).toBe(true);
  });
});

describe("preferințe", () => {
  it("întrebările vin din temele alese, maxim 3 la început, restul la „Adaugă alte detalii”", () => {
    const { initial, more } = questionsForReview(["accesibilitate", "lucru"], "food");
    expect(initial.map((q) => q.key)).toEqual(["intrare_fara_trepte", "wifi", "toaleta_accesibila"]);
    expect(questionsForReview(["iesiri"], "drink").initial.map((q) => q.key)).toEqual(["atmosfera", "siguranta", "revin_cu_prietenii"]);
    expect(initial.length + more.length).toBe(QUESTION_BY_KEY.size);
  });

  it("fără preferințe: 2 întrebări implicite după tipul localului", () => {
    expect(questionsForReview([], "food").initial.map((q) => q.key)).toEqual(["intrare_fara_trepte", "wifi"]);
    expect(questionsForReview(["mancare"], "drink").initial.map((q) => q.key)).toEqual(["atmosfera", "siguranta"]);
  });

  it("ordinea topurilor urmează preferințele, dar toate rămân", () => {
    expect(orderTops([])).toEqual(["general", "accesibilitate", "lucru", "iesiri"]);
    expect(orderTops(["iesiri", "lucru"])).toEqual(["lucru", "iesiri", "general", "accesibilitate"]);
    expect(orderTops(["accesibilitate", "mancare"])).toEqual(["general", "accesibilitate", "lucru", "iesiri"]);
  });
});

describe("voturi rapide (siguranță 1–5, zgomot 1–4)", () => {
  const votes = (kind: "safety" | "noise", values: number[]) => values.map((value) => ({ kind, value }));

  it("sub prag nu afișăm nimic; de la prag: media siguranței și mediana zgomotului", () => {
    expect(quickStats(votes("safety", [5, 4, 3, 5]))).toEqual({ safety: null, noise: null });
    const q = quickStats([...votes("safety", [5, 4, 4, 5, 2]), ...votes("noise", [1, 1, 2, 4, 1, 3])]);
    expect(q.safety).toEqual({ average: 4, votes: 5 });
    expect(q.noise).toMatchObject({ level: 1, id: "linistit", votes: 6 });
    expect(quickSafetyText(q)).toBe("Siguranță 4,0/5 din voturile vizitatorilor");
    expect(quickNoiseText(q)).toBe("De obicei liniștit");
  });

  it("avertizări doar din voturi reale: siguranță ≤ 2,5 și zgomot de obicei „Zgomotos”", () => {
    const bad = quickStats([...votes("safety", [1, 2, 3, 2, 2]), ...votes("noise", [4, 4, 3, 4, 4])]);
    expect(quickWarnings(bad).unsafeFeeling).toBe("Unii vizitatori nu s-au simțit în siguranță (medie 2,0/5).");
    expect(quickWarnings(bad).veryNoisy).toBeDefined();
    expect(quickWarnings(quickStats(votes("safety", [1, 1, 1])))).toEqual({ unsafeFeeling: undefined, veryNoisy: undefined });
    // 33 / 13 ≈ 2,54: peste prag, deși afișat rotunjit ar fi 2,5
    expect(quickWarnings(quickStats(votes("safety", [3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2]))).unsafeFeeling).toBeUndefined();
  });

  it("filtrul „Doar liniștite” ascunde Animat/Zgomotos, nu și localurile fără destule voturi", () => {
    expect(isNoisy(quickStats(votes("noise", [3, 3, 4, 2, 3])))).toBe(true);
    expect(isNoisy(quickStats(votes("noise", [2, 2, 1, 2, 3])))).toBe(false);
    expect(isNoisy(quickStats(votes("noise", [4, 4])))).toBe(false);
  });

  it("butoanele după profil: Lucru → zgomotul primul; Ieșiri → siguranța primul și evidențiată", () => {
    expect(quickButtonsFor([])).toEqual({ order: ["safety", "noise"], highlighted: [] });
    expect(quickButtonsFor(["lucru"])).toEqual({ order: ["noise", "safety"], highlighted: ["noise"] });
    expect(quickButtonsFor(["iesiri", "lucru"])).toEqual({ order: ["safety", "noise"], highlighted: ["safety", "noise"] });
  });
});
