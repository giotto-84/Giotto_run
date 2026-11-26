/** Distanza in metri tra due punti (formula dell'emisenoverso). */
export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

export type TrackPoint = [number, number, number]; // lat, lon, ms

/** Distanza totale di una traccia in metri, ignorando salti impossibili (> 12 m/s). */
export function trackDistance(points: TrackPoint[]): number {
  let d = 0;
  for (let i = 1; i < points.length; i++) {
    const [a, b, t1] = points[i - 1];
    const [c, e, t2] = points[i];
    const step = haversine(a, b, c, e);
    const dt = (t2 - t1) / 1000;
    if (dt > 0 && step / dt > 12) continue;
    d += step;
  }
  return d;
}

/**
 * Filtro per il GPS live: accetta un punto se è abbastanza preciso
 * e abbastanza lontano dal precedente da non essere "rumore" da fermo.
 */
export function acceptFix(prev: TrackPoint | undefined, next: TrackPoint, accuracy: number): boolean {
  if (accuracy > 35) return false;
  if (!prev) return true;
  const step = haversine(prev[0], prev[1], next[0], next[1]);
  const dt = (next[2] - prev[2]) / 1000;
  if (dt <= 0) return false;
  if (step / dt > 12) return false; // oltre 43 km/h: errore
  return step >= Math.max(3, accuracy * 0.5);
}

/** Riduce la traccia a ~1 punto ogni `everyMs` per non appesantire il salvataggio. */
export function thinTrack(points: TrackPoint[], everyMs = 5000): TrackPoint[] {
  const out: TrackPoint[] = [];
  for (const p of points) {
    if (!out.length || p[2] - out[out.length - 1][2] >= everyMs) out.push(p);
  }
  const last = points[points.length - 1];
  if (last && out[out.length - 1] !== last) out.push(last);
  return out;
}
