/** Formula di Riegel: tempo previsto su d2 conoscendo il tempo t1 su d1. */
export function riegel(t1Sec: number, d1: number, d2: number): number {
  return t1Sec * Math.pow(d2 / d1, 1.06);
}

/** Passo 5 km (sec/km) stimato dal test di Cooper (metri percorsi in 12 minuti). */
export function pace5kFromCooper(meters: number): number {
  const t5k = riegel(720, meters, 5000);
  return t5k / 5;
}

/** Passo 5 km (sec/km) da un tempo su 5 km. */
export function pace5kFromTime(sec5k: number): number {
  return sec5k / 5;
}

export interface Paces {
  facile: [number, number];
  lungo: [number, number];
  medio: [number, number];
  ripetute: [number, number];
  fartlek: [number, number];
}

/** Ritmi di allenamento (sec/km, [più veloce, più lento]) a partire dal passo dei 5 km. */
export function trainingPaces(pace5k: number): Paces {
  const r = (a: number, b: number): [number, number] => [Math.round(pace5k * a), Math.round(pace5k * b)];
  return {
    facile: r(1.2, 1.32),
    lungo: r(1.25, 1.35),
    medio: r(1.06, 1.1),
    ripetute: r(0.97, 1.01),
    fartlek: r(1.0, 1.06),
  };
}

/** "5:30" (min:sec per km). */
export function formatPace(secPerKm: number): string {
  if (!Number.isFinite(secPerKm) || secPerKm <= 0) return '–';
  let m = Math.floor(secPerKm / 60);
  let s = Math.round(secPerKm - m * 60);
  if (s === 60) {
    m += 1;
    s = 0;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Velocità in km/h per il tapis roulant. */
export function kmh(secPerKm: number): string {
  return (3600 / secPerKm).toFixed(1).replace('.', ',');
}

/** "1:05:30" oppure "25:04". */
export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = h ? String(m).padStart(2, '0') : String(m);
  return `${h ? h + ':' : ''}${mm}:${String(r).padStart(2, '0')}`;
}

/** "3 min", "1 min 30 s", "45 s". */
export function humanDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (m && s) return `${m} min ${s} s`;
  if (m) return `${m} min`;
  return `${s} s`;
}

/** Parse "25:30" o "1:02:10" in secondi. */
export function parseDuration(text: string): number | undefined {
  const parts = text.trim().split(/[:.,]/).map((x) => Number(x));
  if (!parts.length || parts.some((x) => !Number.isFinite(x) || x < 0)) return undefined;
  let sec = 0;
  for (const p of parts) sec = sec * 60 + p;
  return sec > 0 ? sec : undefined;
}
