import type { Extra, Goal, PlanState, Profile, Session, SessionType, Step, Week } from '../types';
import { addDays, daysBetween, mondayOf, WEEK_ORDER } from './dates';
import { formatPace, humanDuration, riegel, trainingPaces, type Paces } from './paces';

/* ------------------------------------------------------------------ */
/* Scala corsa/cammino (fase base)                                     */
/* ------------------------------------------------------------------ */

export interface Rung {
  reps: number;
  run: number; // secondi di corsa
  walk: number; // secondi di cammino
}

/** Dalla prima corsetta di 30 secondi fino a 30 minuti senza fermarsi. */
export const LADDER: Rung[] = [
  { reps: 6, run: 30, walk: 180 },
  { reps: 8, run: 60, walk: 120 },
  { reps: 8, run: 90, walk: 120 },
  { reps: 6, run: 120, walk: 120 },
  { reps: 5, run: 180, walk: 120 },
  { reps: 4, run: 300, walk: 120 },
  { reps: 3, run: 420, walk: 120 },
  { reps: 3, run: 480, walk: 90 },
  { reps: 2, run: 600, walk: 90 },
  { reps: 2, run: 780, walk: 60 },
  { reps: 1, run: 1200, walk: 0 },
  { reps: 1, run: 1500, walk: 0 },
  { reps: 1, run: 1800, walk: 0 },
];
export const LAST_RUNG = LADDER.length - 1;

/** Gradino di partenza in base a quanti minuti si riesce a correre oggi. */
export function startRung(p: Pick<Profile, 'level' | 'continuousMin'>): number {
  const c = p.continuousMin;
  const table: [number, number][] = [
    [25, 11],
    [20, 10],
    [13, 9],
    [10, 8],
    [8, 7],
    [7, 6],
    [5, 5],
    [3, 4],
    [2, 3],
    [1, 2],
  ];
  for (const [min, rung] of table) if (c >= min) return rung;
  return p.level === 'sedentario' ? 0 : 1;
}

/** Ritmo medio di "corsa facile" usato per convertire km ↔ minuti quando non c'è un test. */
const DEFAULT_EASY_PACE = 420; // 7:00/km

export function initialState(p: Profile): PlanState {
  const pace5kSec = p.recent5kSec ? Math.round(p.recent5kSec / 5) : undefined;
  const runner = p.level === 'corre' && p.continuousMin >= 30;
  const easyPace = pace5kSec ? pace5kSec * 1.25 : DEFAULT_EASY_PACE;
  const fromKm = (p.weeklyKm * easyPace) / 60;
  const fromContinuous = Math.min(p.continuousMin, p.minutesPerSession) * runDaysCount(p) * 0.8;
  const weeklyMin = runner
    ? clamp(Math.round(Math.max(fromKm, fromContinuous)), 60, maxWeeklyMin(p))
    : 0;
  return {
    id: 'me',
    phase: runner ? 'sviluppo' : 'base',
    ladder: runner ? LAST_RUNG : startRung(p),
    weeklyMin,
    quality: 0,
    pace5kSec,
    emptyWeeks: 0,
  };
}

function runDaysCount(p: Pick<Profile, 'trainingDays'>): number {
  return Math.max(1, p.trainingDays.length);
}

/** Volume massimo settimanale sensato per l'obiettivo (minuti di corsa). */
export function maxWeeklyMin(p: Pick<Profile, 'goal' | 'targetKm' | 'trainingDays' | 'minutesPerSession'>): number {
  const byGoal: Record<Goal, number> = { inizia: 150, forma: 200, '5k': 220, '10k': 300, tempo: 0 };
  const g = p.goal === 'tempo' ? (p.targetKm === 10 ? 300 : 240) : byGoal[p.goal];
  return Math.min(g, Math.round(runDaysCount(p) * p.minutesPerSession * 0.85));
}

/** Durata massima del lungo per obiettivo (minuti). */
function longCap(p: Profile): number {
  if (p.goal === '10k' || (p.goal === 'tempo' && p.targetKm === 10)) return 90;
  if (p.goal === 'inizia') return 45;
  return 65;
}

export function raceKm(p: Pick<Profile, 'goal' | 'targetKm'>): number {
  if (p.goal === '10k') return 10;
  if (p.goal === 'tempo') return p.targetKm ?? 5;
  return 5;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/* ------------------------------------------------------------------ */
/* Costruzione delle sedute                                            */
/* ------------------------------------------------------------------ */

const s = (kind: Step['kind'], sec: number, label: string, pace?: [number, number]): Step => ({
  kind,
  sec: Math.round(sec),
  label,
  ...(pace ? { pace } : {}),
});

export function totalSec(steps: Step[]): number {
  return steps.reduce((a, b) => a + b.sec, 0);
}

function paceText(p?: [number, number]): string {
  return p ? ` (${formatPace(p[0])}–${formatPace(p[1])} al km)` : '';
}

interface Ctx {
  maxSec: number;
  paces?: Paces;
}

function ladderSession(rung: Rung, ctx: Ctx): { steps: Step[]; summary: string } {
  const warm = s('riscaldamento', 300, 'Cammino veloce per scaldarti');
  const cool = s('defaticamento', 300, 'Cammino tranquillo per defaticare');
  if (rung.reps === 1) {
    const run = Math.min(rung.run, ctx.maxSec - 600);
    return {
      steps: [warm, s('corsa', Math.max(600, run), 'Corsa leggera senza fermarti'), cool],
      summary: `${humanDuration(Math.max(600, run))} di corsa continua, piano piano`,
    };
  }
  let reps = rung.reps;
  const total = (r: number) => 600 + r * rung.run + (r - 1) * rung.walk;
  while (reps > 2 && total(reps) > ctx.maxSec) reps--;
  const steps: Step[] = [warm];
  for (let i = 0; i < reps; i++) {
    steps.push(s('corsa', rung.run, `Corsa leggera ${i + 1} di ${reps}`));
    if (i < reps - 1) steps.push(s('cammino', rung.walk, 'Cammina e recupera il fiato'));
  }
  steps.push(cool);
  return { steps, summary: `${reps} × (${humanDuration(rung.run)} di corsa + ${humanDuration(rung.walk)} di cammino)` };
}

function easySession(min: number, ctx: Ctx, strides = false): { steps: Step[]; summary: string } {
  const pace = ctx.paces?.facile;
  const stridesSec = strides ? 6 * 20 + 5 * 60 : 0;
  const run = clamp(min * 60, 600, ctx.maxSec - 600 - stridesSec);
  const steps = [s('riscaldamento', 300, 'Cammino veloce o corsa lentissima'), s('corsa', run, 'Corsa facile: devi riuscire a parlare', pace)];
  if (strides) {
    for (let i = 0; i < 6; i++) {
      steps.push(s('allunghi', 20, `Allungo ${i + 1} di 6: accelera in scioltezza`));
      if (i < 5) steps.push(s('recupero', 60, 'Cammina o trotta piano'));
    }
  }
  steps.push(s('defaticamento', 300, 'Cammino tranquillo'));
  return {
    steps,
    summary: `${humanDuration(run)} di corsa facile${paceText(pace)}${strides ? ' + 6 allunghi' : ''}`,
  };
}

function longSession(min: number, ctx: Ctx): { steps: Step[]; summary: string } {
  const pace = ctx.paces?.lungo;
  const run = clamp(min * 60, 900, ctx.maxSec - 600);
  return {
    steps: [
      s('riscaldamento', 300, 'Cammino veloce o corsa lentissima'),
      s('corsa', run, 'Lungo: ritmo tranquillo e costante', pace),
      s('defaticamento', 300, 'Cammino tranquillo'),
    ],
    summary: `${humanDuration(run)} di corsa lenta e costante${paceText(pace)}`,
  };
}

const RIPETUTE: [number, number, number][] = [
  [6, 60, 90],
  [6, 90, 90],
  [5, 120, 120],
  [6, 120, 120],
  [5, 180, 120],
  [6, 180, 120],
  [4, 300, 150],
  [5, 300, 150],
];
const FARTLEK: [number, number, number][] = [
  [6, 45, 90],
  [8, 45, 75],
  [8, 60, 90],
  [10, 60, 60],
  [8, 90, 90],
  [10, 90, 60],
];
const MEDIO: [number, number, number][] = [
  [2, 360, 120],
  [2, 480, 120],
  [3, 480, 120],
  [2, 720, 180],
  [1, 1200, 0],
  [1, 1500, 0],
];

function intervalSession(
  kind: 'ripetute' | 'fartlek' | 'medio',
  level: number,
  ctx: Ctx,
  drills: boolean,
): { steps: Step[]; summary: string } {
  const table = kind === 'ripetute' ? RIPETUTE : kind === 'fartlek' ? FARTLEK : MEDIO;
  const [baseReps, fast, rec] = table[clamp(level, 0, table.length - 1)];
  const fastPace = ctx.paces?.[kind];
  const warmSec = 600 + (drills ? 360 : 0);
  const coolSec = 480;
  let reps = baseReps;
  const total = (r: number) => warmSec + coolSec + r * fast + (r - 1) * rec;
  while (reps > 2 && total(reps) > ctx.maxSec) reps--;
  let fastSec = fast;
  if (reps === 1) fastSec = Math.min(fast, ctx.maxSec - warmSec - coolSec);
  const steps: Step[] = [s('riscaldamento', 600, 'Corsa lentissima per scaldarti', ctx.paces?.facile)];
  if (drills) steps.push(s('andature', 360, 'Andature: skip, calciata e passo saltellato'));
  const fastLabel = kind === 'ripetute' ? 'Veloce: ritmo sostenuto ma controllato' : kind === 'fartlek' ? 'Cambio di ritmo: allunga il passo' : 'Ritmo medio: impegnativo ma costante';
  const recLabel = kind === 'fartlek' ? 'Corsa lenta per recuperare' : 'Recupero: cammina o trotta piano';
  for (let i = 0; i < reps; i++) {
    steps.push(s('veloce', fastSec, `${fastLabel} (${i + 1} di ${reps})`, fastPace));
    if (i < reps - 1 && rec) steps.push(s('recupero', rec, recLabel));
  }
  steps.push(s('defaticamento', coolSec, 'Corsa lentissima o cammino'));
  const name = kind === 'ripetute' ? 'veloce' : kind === 'fartlek' ? 'più svelto' : 'a ritmo medio';
  const recText = reps > 1 && rec ? ` + ${humanDuration(rec)} di recupero` : '';
  return {
    steps,
    summary: `${reps} × (${humanDuration(fastSec)} ${name}${recText})${paceText(fastPace)}`,
  };
}

function testSession(phase: PlanState['phase'], ctx: Ctx): { steps: Step[]; summary: string; title: string } {
  if (phase === 'base') {
    return {
      title: 'Test: quanto riesci a correre?',
      steps: [
        s('riscaldamento', 300, 'Cammino veloce per scaldarti'),
        s('test', Math.min(1800, ctx.maxSec - 600), 'Corri piano finché riesci, senza forzare'),
        s('defaticamento', 300, 'Cammino tranquillo'),
      ],
      summary: 'Corri piano senza fermarti finché riesci (al massimo 30 minuti). Il risultato aggiorna il piano.',
    };
  }
  return {
    title: 'Test dei 12 minuti',
    steps: [
      s('riscaldamento', 600, 'Corsa lentissima per scaldarti', ctx.paces?.facile),
      s('allunghi', 20, 'Allungo di prova'),
      s('recupero', 100, 'Cammina e preparati'),
      s('test', 720, 'Test: percorri più strada possibile in 12 minuti'),
      s('defaticamento', 480, 'Cammino tranquillo'),
    ],
    summary: 'Corri 12 minuti al massimo ritmo che riesci a tenere costante. Annota i metri: aggiornano i tuoi ritmi.',
  };
}

function raceSession(km: number, pace5k?: number): { steps: Step[]; summary: string } {
  const est = pace5k ? riegel(pace5k * 5, 5, km) : km * DEFAULT_EASY_PACE;
  const steps: Step[] = [
    s('riscaldamento', 600, 'Corsa lentissima per scaldarti'),
    s('allunghi', 20, 'Allungo'),
    s('recupero', 60, 'Cammina'),
    s('allunghi', 20, 'Allungo'),
    s('recupero', 120, 'Vai in partenza con calma'),
    { kind: 'gara', sec: Math.round(est), meters: km * 1000, label: `Gara: ${km} km. Parti piano e chiudi forte!` },
  ];
  return { steps, summary: `Gara di ${km} km${pace5k ? ` · tempo stimato ${humanDuration(Math.round(est))}` : ''}. In bocca al lupo!` };
}

function strengthSession(): { steps: Step[]; summary: string } {
  return {
    steps: [s('riscaldamento', 600, 'Cammino veloce')],
    summary: '10 minuti di cammino veloce + 15 minuti di rinforzo per runner',
  };
}

/* ------------------------------------------------------------------ */
/* Settimana                                                           */
/* ------------------------------------------------------------------ */

type Role = 'cc' | 'rinforzo' | 'facile' | 'qualita' | 'qualita2' | 'lungo';

const BASE_ROLES: Record<number, Role[]> = {
  1: ['cc'],
  2: ['cc', 'cc'],
  3: ['cc', 'cc', 'cc'],
  4: ['cc', 'rinforzo', 'cc', 'cc'],
  5: ['cc', 'rinforzo', 'cc', 'rinforzo', 'cc'],
};
const DEV_ROLES: Record<number, Role[]> = {
  1: ['facile'],
  2: ['qualita', 'lungo'],
  3: ['facile', 'qualita', 'lungo'],
  4: ['facile', 'qualita', 'facile', 'lungo'],
  5: ['facile', 'qualita', 'facile', 'qualita2', 'lungo'],
};

const isHardRole = (r: Role) => r === 'qualita' || r === 'qualita2' || r === 'lungo';

/** Giorni ordinati da lunedì a domenica. */
export function orderedDays(days: number[]): number[] {
  return WEEK_ORDER.filter((d) => days.includes(d));
}

/** Sposta i ruoli impegnativi per evitare due giorni intensi consecutivi, quando possibile. */
export function spreadRoles(days: number[], roles: Role[]): Role[] {
  const out = [...roles];
  const pos = days.map((d) => WEEK_ORDER.indexOf(d));
  const adjacent = (i: number, j: number) => Math.abs(pos[i] - pos[j]) === 1 || Math.abs(pos[i] - pos[j]) === 6;
  const conflicts = () => {
    let c = 0;
    for (let i = 0; i < out.length; i++)
      for (let j = i + 1; j < out.length; j++) if (isHardRole(out[i]) && isHardRole(out[j]) && adjacent(i, j)) c++;
    return c;
  };
  // tentativi di scambio: il lungo resta sull'ultimo giorno
  let best = conflicts();
  for (let pass = 0; pass < 3 && best > 0; pass++) {
    for (let i = 0; i < out.length - 1; i++) {
      for (let j = 0; j < out.length - 1; j++) {
        if (i === j || out[i] === out[j]) continue;
        [out[i], out[j]] = [out[j], out[i]];
        const c = conflicts();
        if (c < best) best = c;
        else [out[i], out[j]] = [out[j], out[i]];
      }
    }
  }
  return out;
}

export function qualityKind(goal: Goal, quality: number, second = false): 'ripetute' | 'fartlek' | 'medio' | 'allunghi' {
  if (quality < 2 && !second) return 'allunghi';
  if (goal === 'forma' || goal === 'inizia') return second ? 'fartlek' : quality % 2 === 0 ? 'fartlek' : 'allunghi';
  const long = goal === '10k';
  if (second) return long ? 'fartlek' : 'medio';
  if (quality % 2 === 0) return 'ripetute';
  return long || goal === 'tempo' ? 'medio' : 'fartlek';
}

const TITLES: Record<SessionType, string> = {
  corsacammino: 'Corsa e cammino',
  facile: 'Corsa facile',
  lungo: 'Lungo',
  ripetute: 'Ripetute',
  fartlek: 'Fartlek (cambi di ritmo)',
  medio: 'Ritmo medio',
  allunghi: 'Corsa facile + allunghi',
  test: 'Test',
  gara: 'Gara',
  rinforzo: 'Cammino + rinforzo',
};

export function weekKind(p: Profile, index: number, start: string): { kind: Week['kind']; test: boolean; preRace: boolean } {
  if (p.raceDate) {
    const d = daysBetween(start, p.raceDate);
    if (d >= 0 && d <= 6) return { kind: 'gara', test: false, preRace: false };
    if (d >= 7 && d <= 13) return { kind: 'normale', test: false, preRace: true };
  }
  if (index % 4 === 3) return { kind: 'scarico', test: true, preRace: false };
  return { kind: 'normale', test: false, preRace: false };
}

/**
 * Genera la settimana `index` che inizia il lunedì `start`.
 * Le sedute prima di `from` (es. oggi, se il piano parte a metà settimana) non vengono create.
 */
export function generateWeek(p: Profile, st: PlanState, index: number, start: string, from?: string): Week {
  const monday = mondayOf(start);
  const days = orderedDays(p.trainingDays.length ? p.trainingDays : [2, 4, 6]);
  const { kind, test, preRace } = weekKind(p, index, monday);
  const paces = st.pace5kSec ? trainingPaces(st.pace5kSec) : undefined;
  const ctx: Ctx = { maxSec: p.minutesPerSession * 60, paces };
  const dateOf = (d: number) => addDays(monday, WEEK_ORDER.indexOf(d));
  const sessions: Session[] = [];
  const make = (date: string, type: SessionType, built: { steps: Step[]; summary: string; title?: string }, extras: Extra[], hard: boolean) => {
    sessions.push({
      id: `w${index}-${date}`,
      date,
      type,
      title: built.title ?? TITLES[type],
      summary: built.summary,
      steps: built.steps,
      extras,
      hard,
      status: 'da_fare',
    });
  };

  if (kind === 'gara' && p.raceDate) {
    const race = p.raceDate;
    for (const d of days) {
      const date = dateOf(d);
      const gap = daysBetween(date, race);
      if (gap <= 1) continue; // riposo il giorno prima della gara (e niente dopo)
      if (st.phase === 'base') make(date, 'corsacammino', ladderSession(LADDER[Math.max(0, st.ladder - 1)], ctx), ['stretching'], false);
      else make(date, gap <= 3 ? 'allunghi' : 'facile', easySession(gap <= 3 ? 20 : 25, ctx, gap <= 3), ['stretching'], false);
    }
    make(race, 'gara', raceSession(raceKm(p), st.pace5kSec), ['stretching'], true);
  } else if (st.phase === 'base') {
    const roles = BASE_ROLES[clamp(days.length, 1, 5)];
    let ccCount = 0;
    let rung = LADDER[clamp(st.ladder, 0, LAST_RUNG)];
    if (kind === 'scarico' && st.ladder > 0) rung = LADDER[st.ladder - 1];
    if (preRace) rung = LADDER[clamp(st.ladder, 0, LAST_RUNG)];
    const lastCc = roles.lastIndexOf('cc');
    roles.forEach((role, i) => {
      const date = dateOf(days[i]);
      if (role === 'rinforzo') {
        make(date, 'rinforzo', strengthSession(), ['rinforzo', 'stretching'], false);
        return;
      }
      ccCount++;
      if (test && i === lastCc) {
        make(date, 'test', testSession('base', ctx), ['stretching'], true);
        return;
      }
      const extras: Extra[] = [];
      if (ccCount === 1 && st.ladder >= 5) extras.push('andature');
      if (ccCount === 2 || (days.length === 1 && ccCount === 1)) extras.push('rinforzo');
      extras.push('stretching');
      make(date, 'corsacammino', ladderSession(rung, ctx), extras, false);
    });
  } else {
    const roles = spreadRoles(days, DEV_ROLES[clamp(days.length, 1, 5)]);
    const factor = kind === 'scarico' ? 0.75 : preRace ? 0.85 : 1;
    const weekMin = st.weeklyMin * factor;
    const longMin = clamp(Math.round(weekMin * (days.length <= 2 ? 0.5 : 0.35)), 20, Math.min(longCap(p), p.minutesPerSession - 10));
    const nQual = roles.filter((r) => r === 'qualita' || r === 'qualita2').length;
    const nEasy = roles.filter((r) => r === 'facile').length;
    const qualMin = 30; // stima della corsa contenuta in una seduta di qualità
    const easyMin = nEasy
      ? clamp(Math.round((weekMin - longMin - nQual * qualMin) / nEasy), 20, Math.min(longMin, p.minutesPerSession - 10))
      : 0;
    const level = Math.floor(Math.max(0, st.quality - 2) / 2);
    let firstEasy = true;
    let testPlaced = false;
    roles.forEach((role, i) => {
      const date = dateOf(days[i]);
      if (role === 'lungo') {
        make(date, 'lungo', longSession(longMin, ctx), ['stretching'], true);
        return;
      }
      if (role === 'facile') {
        const extras: Extra[] = firstEasy ? ['rinforzo', 'stretching'] : ['stretching'];
        firstEasy = false;
        make(date, 'facile', easySession(easyMin, ctx), extras, false);
        return;
      }
      if (test && !testPlaced && role === 'qualita') {
        testPlaced = true;
        make(date, 'test', testSession('sviluppo', ctx), ['stretching'], true);
        return;
      }
      const q = qualityKind(p.goal, st.quality, role === 'qualita2');
      const extras: Extra[] = days.length <= 2 ? ['rinforzo', 'stretching'] : ['stretching'];
      if (q === 'allunghi') {
        make(date, 'allunghi', easySession(Math.max(20, easyMin || longMin - 10), ctx, true), ['andature', ...extras], false);
      } else {
        make(date, q, intervalSession(q, level, ctx, role === 'qualita'), extras, true);
      }
    });
  }

  const filtered = from ? sessions.filter((x) => x.date >= from) : sessions;
  return { index, start: monday, kind, phase: st.phase, test, sessions: filtered.sort((a, b) => a.date.localeCompare(b.date)) };
}

/** Minuti totali di una seduta. */
export function sessionMinutes(x: Session): number {
  return Math.round(totalSec(x.steps) / 60);
}

/** Converte una seduta impegnativa in una corsa facile di durata simile. */
export function toEasy(x: Session, p: Profile, st: PlanState): Session {
  if (!x.hard) return x;
  const ctx: Ctx = { maxSec: p.minutesPerSession * 60, paces: st.pace5kSec ? trainingPaces(st.pace5kSec) : undefined };
  const built = st.phase === 'base' ? ladderSession(LADDER[Math.max(0, st.ladder - 1)], ctx) : easySession(Math.max(20, sessionMinutes(x) - 15), ctx);
  return {
    ...x,
    type: st.phase === 'base' ? 'corsacammino' : 'facile',
    title: st.phase === 'base' ? TITLES.corsacammino : TITLES.facile,
    summary: built.summary,
    steps: built.steps,
    hard: false,
  };
}

