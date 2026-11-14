import { describe, expect, it } from "vitest";
import {
  aggregateAnswers,
  featureStatus,
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
