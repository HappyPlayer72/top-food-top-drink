import { describe, expect, it } from "vitest";
import { BOT_RULES, botSignals, fakeProbability, isSpam, isTooFast, type BotContext } from "./rules.ts";

const now = new Date("2026-11-14T12:00:00Z");
const human: BotContext = {
  text: "Am mâncat ciorbă de burtă și sarmale, porții mari, chelnerul a fost atent. Puțin cam scump desertul.",
  postedAt: now,
  authorOtherPostTimes: [new Date("2026-10-02T19:00:00Z")],
  otherVenueTexts: ["Pizza bună, aluat subțire, dar a durat 40 de minute până a venit comanda la masă."],
  fillMs: 95_000,
  accountAgeSec: 90 * 86_400,
  sameDeviceOtherAccounts: 0,
};
const min = (m: number) => new Date(now.getTime() - m * 60_000);

describe("botSignals", () => {
  it("un om obișnuit nu declanșează nimic", () => {
    expect(botSignals(human)).toEqual([]);
  });

  it("4 review-uri de la același cont într-o oră = botVelocity", () => {
    expect(botSignals({ ...human, authorOtherPostTimes: [min(5), min(20), min(50)] })).toContain("botVelocity");
    expect(botSignals({ ...human, authorOtherPostTimes: [min(5), min(20), min(90)] })).not.toContain("botVelocity");
  });

  it("același text lipit la alt local = copyPaste (doar la texte cu substanță)", () => {
    expect(botSignals({ ...human, otherVenueTexts: [human.text!.replace("Puțin", "Putin")] })).toContain("copyPaste");
    expect(botSignals({ ...human, text: "Foarte bun, recomand!", otherVenueTexts: ["Foarte bun, recomand!"] })).not.toContain("copyPaste");
  });

  it("3 conturi de pe același dispozitiv la același local = sharedDevice", () => {
    expect(botSignals({ ...human, sameDeviceOtherAccounts: 1 })).not.toContain("sharedDevice");
    expect(botSignals({ ...human, sameDeviceOtherAccounts: 2 })).toContain("sharedDevice");
  });

  it("semnalele de trimitere lipsesc la review-urile vechi (fără amprentă)", () => {
    expect(botSignals({ ...human, fillMs: null, accountAgeSec: null })).toEqual([]);
    expect(botSignals({ ...human, accountAgeSec: 120 })).toContain("freshAccount");
  });

  it("un bot tipic e reținut pentru admin, un cont nou grăbit nu", () => {
    const bot = botSignals({ ...human, text: "Cel mai bun local!!!!!!! www.reduceri-bune.xyz", fillMs: 2_500, accountAgeSec: 30 });
    expect(bot).toEqual(expect.arrayContaining(["tooFast", "spamContent", "freshAccount"]));
    expect(fakeProbability(bot)).toBeGreaterThanOrEqual(BOT_RULES.holdProbability);
    expect(fakeProbability(["freshAccount", "newAccount"])).toBeLessThan(BOT_RULES.holdProbability);
  });
});

describe("isTooFast", () => {
  it("compară cu viteza de tastare a unui om", () => {
    expect(isTooFast(3_000, 20)).toBe(true); // sub 4 secunde
    expect(isTooFast(10_000, 400)).toBe(true); // 40 caractere/secundă
    expect(isTooFast(40_000, 400)).toBe(false); // 10 caractere/secundă
  });
});

describe("isSpam", () => {
  it.each([
    "Comandă la www.pizza-ieftina.com acum",
    "Scrie-mi pe whatsapp 0722 123 456 pentru reduceri",
    "Super!!!!!!!!!!",
    "XKCD QWRTZ PLMNB VCXZ HJKL TRWQ",
    "BUN BUN BUN FOARTE BUN LOCAL RECOMAND TUTUROR",
  ])("„%s” e spam", (t) => expect(isSpam(t)).toBe(true));

  it.each([
    "Ciorba a fost bună, dar prețul de 35 de lei e cam mult pentru porție.",
    "Am plătit 120 lei pentru doi, merită. Revin în weekend!",
    "Pizza Margherita ok, cola caldă.",
  ])("„%s” nu e spam", (t) => expect(isSpam(t)).toBe(false));
});
