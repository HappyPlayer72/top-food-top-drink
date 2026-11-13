/** „Deschis acum” și „deschis până la 22:00”, după ora României. */
import type { OpeningHours, Weekday } from "@tftd/db";

const DAYS: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DAY_LABEL: Record<Weekday, string> = { mon: "Luni", tue: "Marți", wed: "Miercuri", thu: "Joi", fri: "Vineri", sat: "Sâmbătă", sun: "Duminică" };

/** Ziua și minutul zilei în Europe/Bucharest. */
function localNow(now: Date): { day: Weekday; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Bucharest", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const day = get("weekday").toLowerCase().slice(0, 3) as Weekday;
  return { day, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number) as [number, number];
  return h * 60 + m;
};

/**
 * Deschis acum? Intervalele care trec de miezul nopții (22:00–02:00) se socotesc
 * și în dimineața zilei următoare.
 */
export function openStatus(hours: OpeningHours | null | undefined, now = new Date()): { openNow: boolean; label: string | null } {
  if (!hours || !Object.keys(hours).length) return { openNow: false, label: null };
  const { day, minutes } = localNow(now);
  const yesterday = DAYS[(DAYS.indexOf(day) + 6) % 7]!;

  for (const [open, close] of hours[day] ?? []) {
    const o = toMin(open);
    const c = toMin(close);
    const crosses = c <= o;
    if (minutes >= o && (crosses || minutes < c)) return { openNow: true, label: `Deschis până la ${close === "24:00" ? "miezul nopții" : close}` };
  }
  for (const [open, close] of hours[yesterday] ?? []) {
    const o = toMin(open);
    const c = toMin(close);
    if (c <= o && minutes < c) return { openNow: true, label: `Deschis până la ${close}` };
  }
  const later = (hours[day] ?? []).map(([o]) => o).filter((o) => toMin(o) > minutes).sort()[0];
  return { openNow: false, label: later ? `Închis, se deschide la ${later}` : "Închis acum" };
}

/** „Luni–Vineri 11:00–22:00, Sâmbătă 12:00–23:00” (zilele consecutive cu același program se grupează). */
export function formatHours(hours: OpeningHours | null | undefined): string {
  if (!hours) return "";
  const order: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const text = (d: Weekday) => (hours[d] ?? []).map(([a, b]) => `${a}–${b}`).join(", ") || "închis";
  const groups: { from: Weekday; to: Weekday; text: string }[] = [];
  for (const d of order) {
    const last = groups.at(-1);
    if (last && last.text === text(d)) last.to = d;
    else groups.push({ from: d, to: d, text: text(d) });
  }
  return groups.map((g) => `${DAY_LABEL[g.from]}${g.from !== g.to ? `–${DAY_LABEL[g.to]}` : ""} ${g.text}`).join(", ");
}
