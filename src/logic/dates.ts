/** Date "di calendario" in formato YYYY-MM-DD, sempre nell'ora locale. */
export function iso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function parseIso(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function addDays(s: string, n: number): string {
  const d = parseIso(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}

/** Lunedì della settimana che contiene la data. */
export function mondayOf(s: string): string {
  const d = parseIso(s);
  const dow = (d.getDay() + 6) % 7; // 0 = lunedì
  d.setDate(d.getDate() - dow);
  return iso(d);
}

/** 0 = domenica … 6 = sabato (come Date.getDay). */
export function weekday(s: string): number {
  return parseIso(s).getDay();
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseIso(b).getTime() - parseIso(a).getTime()) / 86_400_000);
}

export const WEEKDAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
export const WEEKDAYS_LONG = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];

/** Ordine della settimana italiana: lunedì per primo. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
