import { expect, it } from "vitest";
import { profileChecklist, rankStanding } from "./owner.ts";

it("clasament: locul, câte localuri sunt și diferența până la cel de deasupra", () => {
  const rows = [
    { id: "a", name: "Prima", score: 9.1 },
    { id: "b", name: "A doua", score: 8.4 },
    { id: "c", name: "A treia", score: 8.1 },
  ];
  expect(rankStanding(rows, "c")).toEqual({ rank: 3, total: 3, nextName: "A doua", gap: 0.3 });
  expect(rankStanding(rows, "a")).toEqual({ rank: 1, total: 3, nextName: null, gap: null });
  expect(rankStanding(rows, "lipsă")).toBeNull();
});

it("profil: fiecare punct bifat după datele lui; review-urile fără răspuns îl lasă nebifat", () => {
  const gol = profileChecklist({ hasMenu: false, recentPost: false, hasTeam: false, hasVideo: false, unanswered: 3 });
  expect(gol).toMatchObject({ done: 0, total: 5 });
  const complet = profileChecklist({ hasMenu: true, recentPost: true, hasTeam: true, hasVideo: true, unanswered: 0 });
  expect(complet).toMatchObject({ done: 5, total: 5 });
  expect(profileChecklist({ hasMenu: true, recentPost: false, hasTeam: false, hasVideo: false, unanswered: 0 }).done).toBe(2);
});
