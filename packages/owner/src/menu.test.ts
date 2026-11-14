import { expect, it } from "vitest";
import { MAX_MENU_ITEMS, MAX_MENU_PHOTO_CHARS, parseMenuInput, profileChecklist } from "./owner.ts";

it("meniu: păstrează ordinea și categoria, ignoră rândurile fără nume", () => {
  const raw = JSON.stringify([
    { category: " Ciorbe ", name: " Ciorbă de burtă ", priceLei: "24", description: "", mustOrder: true },
    { category: "Ciorbe", name: "   ", priceLei: "" },
    { category: "Desert", name: "Papanași", priceLei: "0", description: "cu smântână" },
  ]);
  expect(parseMenuInput(raw)).toEqual([
    { category: "Ciorbe", name: "Ciorbă de burtă", priceLei: 24, description: null, mustOrder: true, photo: null },
    { category: "Desert", name: "Papanași", priceLei: 0, description: "cu smântână", mustOrder: false, photo: null },
  ]);
  expect(() => parseMenuInput(JSON.stringify([{ name: "Papanași", priceLei: "" }]))).toThrow(/Pune prețul la „Papanași”/);
});

it("meniu: respinge JSON invalid, prețuri ne-întregi și prea multe preparate", () => {
  expect(() => parseMenuInput("{nu e json")).toThrow(/nu e valid/);
  expect(() => parseMenuInput(JSON.stringify({ name: "x" }))).toThrow(/nu e valid/);
  expect(() => parseMenuInput("[null]")).toThrow(/nu e valid/);
  expect(parseMenuInput("[]")).toEqual([]);
  expect(() => parseMenuInput(JSON.stringify([{ name: "Ciorbă", priceLei: "12.5" }]))).toThrow(/număr întreg/);
  expect(() => parseMenuInput(JSON.stringify([{ name: "Ciorbă", priceLei: "abc" }]))).toThrow(/număr întreg/);
  const tooMany = Array.from({ length: MAX_MENU_ITEMS + 1 }, (_, i) => ({ name: `Fel ${i}`, priceLei: "10" }));
  expect(() => parseMenuInput(JSON.stringify(tooMany))).toThrow(/Maxim/);
});

it("meniu: poza e opțională, doar imagine mică ca data URL", () => {
  const jpg = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
  expect(parseMenuInput(JSON.stringify([{ name: "Papanași", priceLei: "30", photo: jpg }]))[0]!.photo).toBe(jpg);
  expect(() => parseMenuInput(JSON.stringify([{ name: "Papanași", priceLei: "30", photo: "https://x.ro/a.jpg" }]))).toThrow(/Poza de la „Papanași”/);
  const big = "data:image/jpeg;base64," + "A".repeat(MAX_MENU_PHOTO_CHARS);
  expect(() => parseMenuInput(JSON.stringify([{ name: "Papanași", priceLei: "30", photo: big }]))).toThrow(/Poza/);
});

it("checklist: pasul de meniu duce la secțiunea Meniu, nu la Blog", () => {
  const { items } = profileChecklist({ hasMenu: false, hasPost: true, hasTeam: true, hasVideo: true, unanswered: 0 });
  expect(items.find((i) => i.key === "meniu")).toMatchObject({ section: "meniu", done: false });
});
