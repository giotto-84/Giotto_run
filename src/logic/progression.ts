import type { PlanState, Profile, ReviewResult, Run, Session, TestResult, Week } from '../types';
import { addDays, daysBetween, mondayOf } from './dates';
import { humanDuration } from './paces';
import { LADDER, LAST_RUNG, maxWeeklyMin, toEasy } from './generator';
import { pace5kFromCooper } from './paces';
import type { Rung } from './generator';

const MEDICAL =
  'Se il dolore non passa in qualche giorno o ti fa zoppicare, fermati e senti un medico o un fisioterapista.';

const RUN_TYPES = new Set(['corsacammino', 'facile', 'lungo', 'ripetute', 'fartlek', 'medio', 'allunghi', 'test', 'gara']);

/**
 * Regole di fine settimana:
 * - dolore vero (o fastidio in 2+ uscite) → si riduce il carico
 * - almeno 3/4 delle uscite fatte con sforzo medio ≤ 7,5 → si avanza
 * - settimana troppo faticosa o incompleta → si ripete
 * - 2 settimane di fila senza allenamenti → si riduce
 */
export function reviewWeek(
  st: PlanState,
  week: Week,
  runs: Run[],
  p: Profile,
): { state: PlanState; review: ReviewResult } {
  const planned = week.sessions.filter((x) => RUN_TYPES.has(x.type));
  const doneSessions = planned.filter((x) => x.status === 'fatta');
  const ids = new Set(week.sessions.map((x) => x.id));
  const weekRuns = runs.filter((r) => r.sessionId && ids.has(r.sessionId));
  const done = doneSessions.length;
  const total = planned.length;
  const rpes = weekRuns.map((r) => r.rpe).filter((x) => x > 0);
  const avgRpe = rpes.length ? rpes.reduce((a, b) => a + b, 0) / rpes.length : 0;
  const strongPain = weekRuns.some((r) => r.pain === 2);
  const mildPain = weekRuns.filter((r) => r.pain >= 1).length;
  const next: PlanState = { ...st };
  const cap = maxWeeklyMin(p);

  const reduce = (message: string): { state: PlanState; review: ReviewResult } => {
    if (next.phase === 'base') next.ladder = Math.max(0, next.ladder - 1);
    else next.weeklyMin = Math.max(45, Math.round(next.weeklyMin * 0.8));
    return { state: next, review: { action: 'riduci', message, done, planned: total } };
  };

  if (strongPain || mildPain >= 2) {
    next.emptyWeeks = 0;
    return reduce(
      `Hai segnalato dolore: la prossima settimana alleggeriamo il carico. ${MEDICAL}`,
    );
  }

  if (done === 0) {
    next.emptyWeeks = st.emptyWeeks + 1;
    if (next.emptyWeeks >= 2) {
      next.emptyWeeks = 0;
      return reduce('Sono passate due settimane senza allenamenti: ripartiamo un gradino più in basso, senza fretta.');
    }
    return { state: next, review: { action: 'ripeti', message: 'Settimana saltata: nessun problema, la ripetiamo.', done, planned: total } };
  }
  next.emptyWeeks = 0;

  const ratio = total ? done / total : 1;
  if (ratio >= 0.75 && avgRpe <= 7.5) {
    if (week.kind === 'gara') {
      return { state: next, review: { action: 'avanza', message: 'Gara fatta: complimenti! Puoi scegliere un nuovo obiettivo dal Profilo.', done, planned: total } };
    }
    if (next.phase === 'base') {
      if (next.ladder >= LAST_RUNG) {
        next.phase = 'sviluppo';
        next.weeklyMin = Math.max(next.weeklyMin, Math.min(cap, Math.max(60, p.trainingDays.length * 30)));
        next.quality = 0;
        if (p.goal === 'inizia') next.goalReached = true;
        return {
          state: next,
          review: {
            action: 'avanza',
            message: 'Corri 30 minuti senza fermarti: traguardo raggiunto! Da ora il piano alterna corse facili, un lungo e qualche variazione di ritmo.',
            done,
            planned: total,
          },
        };
      }
      if (week.kind !== 'scarico') next.ladder = Math.min(LAST_RUNG, next.ladder + 1);
      return {
        state: next,
        review: {
          action: 'avanza',
          message: week.kind === 'scarico' ? 'Settimana di scarico completata: si riparte.' : `Ottimo lavoro! Si sale di un gradino: ${rungText(LADDER[next.ladder])}.`,
          done,
          planned: total,
        },
      };
    }
    if (week.kind !== 'scarico') next.weeklyMin = Math.min(cap, Math.round(next.weeklyMin * 1.1));
    next.quality = st.quality + 1;
    return {
      state: next,
      review: {
        action: 'avanza',
        message:
          next.weeklyMin >= cap
            ? 'Ottimo lavoro! Hai raggiunto il volume giusto per il tuo obiettivo: ora miglioriamo la qualità.'
            : week.kind === 'scarico'
              ? 'Scarico completato: ora si riparte con un nuovo blocco.'
              : 'Ottimo lavoro! La prossima settimana corri circa il 10% in più.',
        done,
        planned: total,
      },
    };
  }

  const tooHard = avgRpe > 7.5;
  return {
    state: next,
    review: {
      action: 'ripeti',
      message: tooHard
        ? 'Settimana faticosa: ripetiamo lo stesso carico per consolidare.'
        : `Hai fatto ${done} uscite su ${total}: ripetiamo la settimana per consolidare.`,
      done,
      planned: total,
    },
  };
}

/** Aggiorna lo stato in base al risultato di un test. */
export function applyTest(st: PlanState, t: TestResult): { state: PlanState; message: string } {
  const next = { ...st };
  if (t.kind === 'cooper') {
    next.pace5kSec = Math.round(pace5kFromCooper(t.value));
    return { state: next, message: 'Ritmi aggiornati in base al test.' };
  }
  // test "continuo": minuti di corsa senza fermarsi → gradino corrispondente
  const minutes = t.value;
  let rung = 0;
  for (let i = 0; i < LADDER.length; i++) {
    const r = LADDER[i];
    if (minutes * 60 >= r.run * 1.3 || (r.reps === 1 && minutes * 60 >= r.run)) rung = i;
  }
  if (rung > next.ladder) {
    next.ladder = rung;
    return { state: next, message: `Bravissimo! Hai corso ${minutes} minuti: il piano salta avanti.` };
  }
  return { state: next, message: `Hai corso ${minutes} minuti. Il piano continua dal punto in cui sei.` };
}

/** Settimane disponibili prima della gara e settimane consigliate. */
export function raceFeasibility(p: Profile, st: PlanState, today: string): { weeks: number; needed: number; ok: boolean; message: string } | null {
  if (!p.raceDate) return null;
  const weeks = Math.floor(daysBetween(mondayOf(today), p.raceDate) / 7) + 1;
  const km = p.goal === '10k' || (p.goal === 'tempo' && p.targetKm === 10) ? 10 : 5;
  const baseLeft = st.phase === 'base' ? LAST_RUNG - st.ladder + 1 : 0;
  const dev = km === 10 ? (st.phase === 'sviluppo' && st.weeklyMin >= 150 ? 4 : 8) : st.phase === 'sviluppo' ? 3 : 2;
  const needed = baseLeft + dev;
  if (weeks <= 0) return { weeks: 0, needed, ok: false, message: 'La data della gara è già passata: aggiornala dal Profilo.' };
  const ok = weeks >= needed;
  return {
    weeks,
    needed,
    ok,
    message: ok
      ? `Mancano ${weeks} settimane alla gara: c'è il tempo per prepararti bene.`
      : `Mancano ${weeks} settimane, ma ne servirebbero circa ${needed}. Puoi provarci camminando quando serve, oppure scegliere una gara più avanti o più corta.`,
  };
}

/**
 * Sposta una seduta su un'altra data della stessa settimana.
 * Se così ci sarebbero due giorni intensi di fila, la seduta diventa una corsa facile.
 */
export function moveSession(
  week: Week,
  sessionId: string,
  newDate: string,
  p: Profile,
  st: PlanState,
): { week: Week; warning?: string } | { error: string } {
  const x = week.sessions.find((y) => y.id === sessionId);
  if (!x) return { error: 'Seduta non trovata.' };
  if (newDate < week.start || newDate > addDays(week.start, 6)) return { error: 'Puoi spostarla solo dentro questa settimana.' };
  const busy = week.sessions.find((y) => y.id !== sessionId && y.date === newDate && y.status !== 'saltata');
  if (busy) return { error: 'In quel giorno c\'è già un allenamento.' };
  let moved: Session = { ...x, date: newDate };
  let warning: string | undefined;
  const neighbourHard = week.sessions.some(
    (y) => y.id !== sessionId && y.hard && y.status !== 'saltata' && Math.abs(daysBetween(y.date, newDate)) === 1,
  );
  if (moved.hard && neighbourHard && moved.type !== 'gara') {
    moved = toEasy(moved, p, st);
    warning = 'Per non fare due giorni intensi di fila, questa seduta diventa una corsa facile.';
  }
  const sessions = week.sessions.map((y) => (y.id === sessionId ? moved : y)).sort((a, b) => a.date.localeCompare(b.date));
  return { week: { ...week, sessions }, ...(warning ? { warning } : {}) };
}

/** Prima seduta della settimana non ancora fatta, con data passata (da recuperare). */
export function missedSessions(week: Week, today: string): Session[] {
  return week.sessions.filter((x) => x.status === 'da_fare' && x.date < today);
}

export function rungText(r: Rung): string {
  return r.reps > 1 ? `${r.reps} tratti di corsa da ${humanDuration(r.run)}` : `${humanDuration(r.run)} di corsa senza fermarti`;
}
