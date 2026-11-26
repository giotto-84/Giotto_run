import type { Run, Shoe } from '../types';
import { addDays, iso, mondayOf } from './dates';

export interface WeekKm {
  start: string;
  km: number;
  runs: number;
}

/** Km per settimana (lunedì–domenica) delle ultime `weeks` settimane, inclusa quella di `today`. */
export function weeklyKm(runs: Run[], today: string, weeks = 12): WeekKm[] {
  const last = mondayOf(today);
  const out: WeekKm[] = [];
  for (let i = weeks - 1; i >= 0; i--) out.push({ start: addDays(last, -7 * i), km: 0, runs: 0 });
  const byStart = new Map(out.map((w) => [w.start, w]));
  for (const r of runs) {
    const w = byStart.get(mondayOf(iso(new Date(r.date))));
    if (!w) continue;
    w.km += r.distanceKm ?? 0;
    w.runs += 1;
  }
  for (const w of out) w.km = Math.round(w.km * 10) / 10;
  return out;
}

/** Passo medio (sec/km) di una corsa, se c'è la distanza. */
export function runPace(r: Run): number | undefined {
  if (!r.distanceKm || r.distanceKm < 0.3 || !r.durationSec) return undefined;
  const p = r.durationSec / r.distanceKm;
  // sotto 2:00/km o sopra 20:00/km è quasi certamente un errore di inserimento
  return p >= 120 && p <= 1200 ? p : undefined;
}

export function shoeKm(shoe: Shoe, runs: Run[]): number {
  const km = runs.filter((r) => r.shoeId === shoe.id).reduce((a, r) => a + (r.distanceKm ?? 0), 0);
  return Math.round((shoe.startKm + km) * 10) / 10;
}

/** Soglia oltre la quale consigliare scarpe nuove. */
export const SHOE_LIMIT_KM = 700;

/** Aumento dei km rispetto alla media delle 3 settimane precedenti (es. 0,25 = +25%). */
export function loadJump(weeks: WeekKm[]): number | undefined {
  if (weeks.length < 4) return undefined;
  const cur = weeks[weeks.length - 1].km;
  const prev = weeks.slice(-4, -1).map((w) => w.km);
  const avg = prev.reduce((a, b) => a + b, 0) / 3;
  if (avg < 3) return undefined;
  return cur / avg - 1;
}
