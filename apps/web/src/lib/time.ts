/**
 * Orele din formulare (<input type="datetime-local">) sunt ora României, indiferent de fusul serverului
 * (Vercel rulează în UTC). Fără bibliotecă: diferența o dă Intl, inclusiv ora de vară.
 */
const TZ = 'Europe/Bucharest';
const parts = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

/** Câte ms e ora României înaintea UTC la momentul `d`. */
function offsetMs(d: Date): number {
  const p = Object.fromEntries(parts.formatToParts(d).map((x) => [x.type, x.value]));
  const wall = Date.UTC(+p.year!, +p.month! - 1, +p.day!, +p.hour!, +p.minute!);
  return wall - Math.floor(d.getTime() / 60000) * 60000;
}

/** '2026-11-14T18:00' (ora României) → momentul exact; null dacă e gol sau invalid. */
export function parseBucharest(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const asUtc = Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!);
  const guess = asUtc - offsetMs(new Date(asUtc));
  return new Date(asUtc - offsetMs(new Date(guess)));
}

/** Momentul `d` → valoare pentru datetime-local, în ora României. */
export function toBucharestInput(d: Date | null): string {
  return d ? new Date(d.getTime() + offsetMs(d)).toISOString().slice(0, 16) : '';
}
