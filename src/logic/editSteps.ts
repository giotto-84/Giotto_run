import type { Step } from '../types';
import { humanDuration } from './paces';

/** Tratti "di lavoro" e "di recupero" che formano le ripetizioni. */
const WORK = new Set<Step['kind']>(['corsa', 'veloce', 'allunghi']);
const REST = new Set<Step['kind']>(['cammino', 'recupero']);

export interface StepGroup {
  key: string;
  kind: Step['kind'];
  sec: number;
  count: number;
  /** Etichetta rappresentativa (senza "1 di 6"). */
  label: string;
}

const NUM = /\s*\(?\d+ di \d+\)?/;

export function cleanLabel(label: string): string {
  return label.replace(NUM, '').trim();
}

/**
 * Raggruppa i passi uguali (stesso tipo e stessa durata): così basta modificare
 * "corsa 1 min" una volta per cambiare tutte le 8 ripetizioni.
 */
export function groupSteps(steps: Step[]): StepGroup[] {
  const groups: StepGroup[] = [];
  for (const s of steps) {
    const key = `${s.kind}|${s.sec}|${cleanLabel(s.label)}`;
    const g = groups.find((x) => x.key === key);
    if (g) g.count++;
    else groups.push({ key, kind: s.kind, sec: s.sec, count: 1, label: cleanLabel(s.label) });
  }
  return groups;
}

/** Cambia la durata di tutti i passi del gruppo. */
export function setGroupDuration(steps: Step[], key: string, sec: number): Step[] {
  const s2 = Math.round(Math.max(10, Math.min(3 * 3600, sec)));
  return steps.map((s) => (`${s.kind}|${s.sec}|${cleanLabel(s.label)}` === key ? { ...s, sec: s2 } : s));
}

/** Indici dei passi di lavoro ripetuti (es. le 6 corse di una seduta corsa/cammino). */
function workIndexes(steps: Step[]): number[] {
  const counts = new Map<string, number>();
  for (const s of steps) if (WORK.has(s.kind)) counts.set(s.kind, (counts.get(s.kind) ?? 0) + 1);
  let best: Step['kind'] | undefined;
  for (const [k, c] of counts) if (c >= 2 && (!best || c > (counts.get(best) ?? 0))) best = k as Step['kind'];
  if (!best) return [];
  return steps.map((s, i) => (s.kind === best ? i : -1)).filter((i) => i >= 0);
}

export function repetitions(steps: Step[]): number {
  return workIndexes(steps).length;
}

/** Rinumera "1 di 6", "2 di 6"… dopo aver aggiunto o tolto ripetizioni. */
function renumber(steps: Step[]): Step[] {
  const idx = workIndexes(steps);
  const n = idx.length;
  return steps.map((s, i) => {
    const k = idx.indexOf(i);
    if (k < 0 || !NUM.test(s.label)) return s;
    return { ...s, label: s.label.replace(/\d+ di \d+/, `${k + 1} di ${n}`) };
  });
}

/** Aggiunge (+1) o toglie (−1) una ripetizione, tenendo il recupero tra un tratto e l'altro. */
export function changeRepetitions(steps: Step[], delta: 1 | -1): Step[] {
  const idx = workIndexes(steps);
  if (!idx.length) return steps;
  const last = idx[idx.length - 1];
  const prev = idx.length >= 2 ? idx[idx.length - 2] : -1;
  // recupero che precede l'ultimo tratto (tra il penultimo e l'ultimo)
  const restIdx = prev >= 0 ? steps.findIndex((s, i) => i > prev && i < last && REST.has(s.kind)) : -1;
  if (delta === -1) {
    if (idx.length <= 1) return steps;
    const out = steps.filter((_, i) => i !== last && i !== restIdx);
    return renumber(out);
  }
  if (idx.length >= 30) return steps;
  const rest = restIdx >= 0 ? [steps[restIdx]] : [];
  const out = [...steps.slice(0, last + 1), ...rest, { ...steps[last] }, ...steps.slice(last + 1)];
  return renumber(out);
}

const VERB: Partial<Record<Step['kind'], string>> = {
  corsa: 'di corsa',
  veloce: 'veloce',
  allunghi: 'di allungo',
  cammino: 'di cammino',
  recupero: 'di recupero',
};

/** Descrizione breve dei tempi, es. "6 × (1 min di corsa + 2 min di cammino)". */
export function describeSteps(steps: Step[]): string {
  const idx = workIndexes(steps);
  if (idx.length >= 2) {
    const w = steps[idx[0]];
    const r = steps.find((s, i) => i > idx[0] && i < idx[1] && REST.has(s.kind));
    return `${idx.length} × (${humanDuration(w.sec)} ${VERB[w.kind]}${r ? ` + ${humanDuration(r.sec)} ${VERB[r.kind]}` : ''})`;
  }
  const main = steps.find((s) => WORK.has(s.kind) || s.kind === 'test' || s.kind === 'gara');
  if (main) return `${humanDuration(main.sec)} ${main.kind === 'corsa' ? 'di corsa' : main.kind === 'test' ? 'di test' : main.kind === 'gara' ? 'di gara (stima)' : VERB[main.kind] ?? ''}`.trim();
  return `${humanDuration(steps.reduce((a, b) => a + b.sec, 0))} in tutto`;
}

/** Secondi di corsa (esclusi cammino, recupero, riscaldamento). */
export function runningSec(steps: Step[]): number {
  return steps.filter((s) => WORK.has(s.kind) || s.kind === 'test' || s.kind === 'gara').reduce((a, b) => a + b.sec, 0);
}

/** Passo dei pulsanti +/−: 15 s per i tratti brevi, 1 min per quelli lunghi. */
export function stepIncrement(sec: number): number {
  return sec < 180 ? 15 : 60;
}
