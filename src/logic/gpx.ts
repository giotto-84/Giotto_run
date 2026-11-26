import { thinTrack, trackDistance, type TrackPoint } from './geo';

export interface ParsedGpx {
  start: string; // ISO
  durationSec: number;
  distanceKm: number;
  points: TrackPoint[];
  avgHr?: number;
  name?: string;
}

/**
 * Legge un file GPX (Open GPX Tracker, Strava, Garmin, …) senza dipendenze.
 * Usa i punti <trkpt> con il loro <time>; il battito (<gpxtpx:hr>) se presente.
 */
export function parseGpx(text: string): ParsedGpx {
  if (!/<gpx[\s>]/i.test(text)) throw new Error('Questo file non sembra un GPX.');
  const points: TrackPoint[] = [];
  const hrs: number[] = [];
  const re = /<trkpt\b([^>]*)>([\s\S]*?)<\/trkpt>|<trkpt\b([^>]*)\/>/gi;
  let m: RegExpExecArray | null;
  let noTime = 0;
  while ((m = re.exec(text))) {
    const attrs = m[1] ?? m[3] ?? '';
    const body = m[2] ?? '';
    const lat = Number(/lat\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1]);
    const lon = Number(/lon\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const time = /<time>([^<]+)<\/time>/i.exec(body)?.[1];
    const t = time ? Date.parse(time.trim()) : NaN;
    if (!Number.isFinite(t)) {
      noTime++;
      continue;
    }
    points.push([lat, lon, t]);
    const hr = /<(?:\w+:)?hr>(\d+)<\/(?:\w+:)?hr>/i.exec(body)?.[1];
    if (hr) hrs.push(Number(hr));
  }
  if (points.length < 2) {
    throw new Error(noTime ? 'Il file non contiene gli orari dei punti: non posso calcolare tempo e passo.' : 'Nel file non ci sono punti di una traccia.');
  }
  points.sort((a, b) => a[2] - b[2]);
  const name = /<trk>[\s\S]*?<name>([^<]*)<\/name>/i.exec(text)?.[1]?.trim();
  return {
    start: new Date(points[0][2]).toISOString(),
    durationSec: Math.round((points[points.length - 1][2] - points[0][2]) / 1000),
    distanceKm: Math.round(trackDistance(points)) / 1000,
    points: thinTrack(points),
    ...(hrs.length ? { avgHr: Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) } : {}),
    ...(name ? { name } : {}),
  };
}
