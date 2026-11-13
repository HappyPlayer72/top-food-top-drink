import { describe, expect, it } from "vitest";
import { formatHours, openStatus } from "./hours.ts";

// 13 nov 2026 e vineri; ora României = UTC+2 în noiembrie
const at = (iso: string) => new Date(iso);
const hours = { mon: [["11:00", "22:00"]], tue: [["11:00", "22:00"]], wed: [["11:00", "22:00"]], thu: [["11:00", "22:00"]], fri: [["11:00", "02:00"]], sat: [["12:00", "02:00"]] } as const;
const h = hours as unknown as Parameters<typeof openStatus>[0];

describe("deschis acum", () => {
  it("vineri la 20:00 e deschis până la 02:00", () => {
    expect(openStatus(h, at("2026-11-13T18:00:00Z"))).toEqual({ openNow: true, label: "Deschis până la 02:00" });
  });
  it("sâmbătă la 01:00 e încă deschis din programul de vineri", () => {
    expect(openStatus(h, at("2026-11-13T23:00:00Z")).openNow).toBe(true);
  });
  it("vineri la 09:00 e închis și spune când se deschide", () => {
    expect(openStatus(h, at("2026-11-13T07:00:00Z"))).toEqual({ openNow: false, label: "Închis, se deschide la 11:00" });
  });
  it("duminică e închis", () => {
    expect(openStatus(h, at("2026-11-15T12:00:00Z")).openNow).toBe(false);
  });
  it("fără program nu știm", () => {
    expect(openStatus(null)).toEqual({ openNow: false, label: null });
  });
});

it("grupează zilele cu același program", () => {
  expect(formatHours(h)).toBe("Luni–Joi 11:00–22:00, Vineri–Sâmbătă 11:00–02:00, Duminică închis".replace("Vineri–Sâmbătă 11:00–02:00", "Vineri 11:00–02:00, Sâmbătă 12:00–02:00"));
});
