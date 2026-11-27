import { db, currentWeek } from './db';
import { addDays, daysBetween, iso, mondayOf } from '../logic/dates';
import { generateWeek, initialState } from '../logic/generator';
import { applyTest, moveSession, reviewWeek } from '../logic/progression';
import type { PlanState, Profile, ReviewResult, Run, Session, Step, TestResult, Week } from '../types';

export const today = () => iso(new Date());

/** Crea il piano da zero (primo avvio o nuovo obiettivo). */
export async function startPlan(profile: Profile, keepPace = true): Promise<void> {
  const prev = await db.state.get('me');
  const st = initialState(profile);
  if (keepPace && prev?.pace5kSec && !profile.recent5kSec) st.pace5kSec = prev.pace5kSec;
  const t = today();
  let week = generateWeek(profile, st, 0, mondayOf(t), t);
  if (!week.sessions.length) week = generateWeek(profile, st, 0, addDays(mondayOf(t), 7));
  await db.transaction('rw', db.profile, db.state, db.weeks, async () => {
    await db.profile.put(profile);
    await db.state.put(st);
    await db.weeks.clear();
    await db.weeks.put(week);
  });
}

/** Rigenera la settimana corrente dopo una modifica del profilo, tenendo le sedute già fatte. */
export async function refreshCurrentWeek(profile: Profile): Promise<void> {
  const st = await db.state.get('me');
  const w = await currentWeek();
  if (!st || !w) return startPlan(profile);
  const t = today();
  const from = t > w.start ? t : w.start;
  const fresh = generateWeek(profile, st, w.index, w.start, from);
  const kept = w.sessions.filter((x) => x.status !== 'da_fare' || x.date < from);
  const dates = new Set(kept.map((x) => x.date));
  const sessions = [...kept, ...fresh.sessions.filter((x) => !dates.has(x.date))].sort((a, b) => a.date.localeCompare(b.date));
  await db.transaction('rw', db.profile, db.weeks, async () => {
    await db.profile.put(profile);
    await db.weeks.put({ ...w, kind: fresh.kind, test: fresh.test, sessions });
  });
}

/**
 * Se la settimana corrente è finita: fa il bilancio, aggiorna lo stato e crea la nuova.
 * Restituisce l'ultimo bilancio fatto (da mostrare all'utente).
 */
export async function ensureCurrentWeek(): Promise<ReviewResult | undefined> {
  const profile = await db.profile.get('me');
  let st = await db.state.get('me');
  if (!profile || !st) return undefined;
  const t = today();
  let last: ReviewResult | undefined;
  for (let guard = 0; guard < 60; guard++) {
    const w = await currentWeek();
    if (!w) {
      await startPlan(profile);
      return undefined;
    }
    const end = addDays(w.start, 6);
    if (t <= end) break;
    const runs = await db.runs.where('sessionId').startsWith(`w${w.index}-`).toArray();
    // sedute non fatte e passate: saltate
    const closed: Week = { ...w, sessions: w.sessions.map((x) => (x.status === 'da_fare' ? { ...x, status: 'saltata' as const } : x)) };
    const r = reviewWeek(st, closed, runs, profile);
    st = r.state;
    closed.review = r.review;
    last = r.review;
    // settimane intere senza piano (app non aperta): contano come settimane vuote
    const nextStart = addDays(w.start, 7);
    const gapWeeks = Math.floor(daysBetween(nextStart, mondayOf(t)) / 7);
    if (gapWeeks >= 1) {
      const empty = reviewWeek(st, { ...closed, sessions: closed.sessions.map((x) => ({ ...x, status: 'saltata' as const })), kind: 'normale' }, [], profile);
      st = empty.state;
      if (empty.review.action === 'riduci') last = empty.review;
    }
    const start = gapWeeks >= 1 ? mondayOf(t) : nextStart;
    const next = generateWeek(profile, st, w.index + 1, start);
    const s = st;
    await db.transaction('rw', db.state, db.weeks, async () => {
      await db.weeks.put(closed);
      await db.weeks.put(next);
      await db.state.put(s);
    });
  }
  return last;
}

export async function findSession(id: string): Promise<{ week: Week; session: Session } | undefined> {
  const index = Number(/^w(\d+)-/.exec(id)?.[1]);
  const week = Number.isFinite(index) ? await db.weeks.get(index) : undefined;
  const session = week?.sessions.find((x) => x.id === id);
  return week && session ? { week, session } : undefined;
}

export async function updateSession(id: string, patch: Partial<Session>): Promise<void> {
  const found = await findSession(id);
  if (!found) return;
  const { week } = found;
  await db.weeks.put({ ...week, sessions: week.sessions.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
}

/** Salva una corsa (eventualmente legata a una seduta del piano) e l'eventuale test. */
export async function saveRun(run: Run, test?: Omit<TestResult, 'id'>): Promise<{ runId: number; message?: string }> {
  let message: string | undefined;
  const runId = await db.runs.add(run);
  if (run.sessionId) await updateSession(run.sessionId, { status: 'fatta', runId });
  if (test) {
    await db.tests.add(test);
    const st = await db.state.get('me');
    if (st) {
      const r = applyTest(st, test);
      await db.state.put(r.state);
      message = r.message;
    }
  }
  return { runId, message };
}

export async function deleteRun(id: number): Promise<void> {
  const run = await db.runs.get(id);
  await db.runs.delete(id);
  if (run?.sessionId) await updateSession(run.sessionId, { status: 'da_fare', runId: undefined });
}

export async function skipSession(id: string, undo = false): Promise<void> {
  await updateSession(id, { status: undo ? 'da_fare' : 'saltata' });
}

export async function moveSessionTo(id: string, date: string): Promise<{ warning?: string; error?: string }> {
  const found = await findSession(id);
  const profile = await db.profile.get('me');
  const st = await db.state.get('me');
  if (!found || !profile || !st) return { error: 'Seduta non trovata.' };
  const res = moveSession(found.week, id, date, profile, st);
  if ('error' in res) return { error: res.error };
  await db.weeks.put(res.week);
  return { warning: res.warning };
}

export async function saveTestOnly(test: Omit<TestResult, 'id'>): Promise<string> {
  await db.tests.add(test);
  const st = (await db.state.get('me')) as PlanState;
  const r = applyTest(st, test);
  await db.state.put(r.state);
  return r.message;
}

/** Salva i tempi personalizzati di una seduta (tenendo quelli originali per poterli ripristinare). */
export async function customizeSession(id: string, steps: Step[], summary: string): Promise<void> {
  const found = await findSession(id);
  if (!found) return;
  const s = found.session;
  await updateSession(id, {
    steps,
    summary,
    originalSteps: s.originalSteps ?? s.steps,
    originalSummary: s.originalSummary ?? s.summary,
  });
}

export async function restoreSession(id: string): Promise<void> {
  const found = await findSession(id);
  if (!found?.session.originalSteps) return;
  const s = found.session;
  await updateSession(id, { steps: s.originalSteps, summary: s.originalSummary ?? s.summary, originalSteps: undefined, originalSummary: undefined });
}

/** Corregge una corsa già registrata. */
export async function updateRun(run: Run): Promise<void> {
  if (run.id === undefined) return;
  await db.runs.put(run);
}
