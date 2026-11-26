import type { Step } from '../types';
import { humanDuration } from './paces';

export interface Position {
  index: number;
  stepElapsed: number;
  remaining: number;
  done: boolean;
}

export function positionAt(steps: Step[], elapsed: number): Position {
  let t = 0;
  for (let i = 0; i < steps.length; i++) {
    const end = t + steps[i].sec;
    if (elapsed < end) return { index: i, stepElapsed: elapsed - t, remaining: end - elapsed, done: false };
    t = end;
  }
  return { index: steps.length - 1, stepElapsed: steps.length ? steps[steps.length - 1].sec : 0, remaining: 0, done: true };
}

/** Secondi dall'inizio dell'allenamento all'inizio dello step i. */
export function stepStart(steps: Step[], i: number): number {
  let t = 0;
  for (let k = 0; k < i; k++) t += steps[k].sec;
  return t;
}

export type Cue =
  | { type: 'start'; index: number }
  | { type: 'half'; index: number }
  | { type: 'last30'; index: number }
  | { type: 'count'; n: number }
  | { type: 'end' };

/** Avvisi da dare tra due istanti (in secondi trascorsi). */
export function cuesBetween(steps: Step[], from: number, to: number): Cue[] {
  if (to <= from) return [];
  const out: Cue[] = [];
  let t = 0;
  const total = steps.reduce((a, b) => a + b.sec, 0);
  for (let i = 0; i < steps.length; i++) {
    const st = steps[i];
    const end = t + st.sec;
    const crosses = (x: number) => from < x && x <= to;
    if (i > 0 && crosses(t)) out.push({ type: 'start', index: i });
    if (st.sec >= 240 && crosses(t + st.sec / 2)) out.push({ type: 'half', index: i });
    if (st.sec >= 120 && crosses(end - 30)) out.push({ type: 'last30', index: i });
    for (const n of [3, 2, 1]) if (st.sec >= 10 && crosses(end - n)) out.push({ type: 'count', n });
    t = end;
  }
  if (from < total && to >= total) out.push({ type: 'end' });
  return out;
}

const VERB: Record<Step['kind'], string> = {
  riscaldamento: 'Riscaldamento',
  cammino: 'Cammina',
  corsa: 'Corri piano',
  veloce: 'Vai veloce',
  recupero: 'Recupera',
  andature: 'Andature',
  allunghi: 'Allungo',
  defaticamento: 'Defaticamento',
  test: 'Test',
  gara: 'Gara',
};

export function stepVerb(st: Step): string {
  return VERB[st.kind];
}

/** Frase da leggere ad alta voce quando inizia uno step. */
export function speechFor(st: Step): string {
  if (st.kind === 'gara') return `Via! ${st.label}`;
  if (st.kind === 'test') return `Inizia il test. ${st.label}`;
  return `${VERB[st.kind]} per ${humanDuration(st.sec).replace('min', 'minuti').replace(' s', ' secondi')}`;
}

export function cueText(c: Cue, steps: Step[]): string | null {
  switch (c.type) {
    case 'start':
      return speechFor(steps[c.index]);
    case 'half':
      return 'Sei a metà';
    case 'last30':
      return 'Ancora trenta secondi';
    case 'count':
      return null; // solo bip
    case 'end':
      return 'Allenamento completato. Bravissimo!';
  }
}
