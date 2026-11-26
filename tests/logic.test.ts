import { describe, expect, it } from 'vitest';
import type { PlanState, Profile, Run, Week } from '../src/types';
import { addDays, mondayOf, weekday } from '../src/logic/dates';
import { generateWeek, initialState, LADDER, LAST_RUNG, maxWeeklyMin, spreadRoles, startRung, totalSec } from '../src/logic/generator';
import { applyTest, moveSession, raceFeasibility, reviewWeek } from '../src/logic/progression';
import { formatDuration, formatPace, parseDuration, pace5kFromCooper, riegel } from '../src/logic/paces';
import { parseGpx } from '../src/logic/gpx';
import { acceptFix, haversine, trackDistance } from '../src/logic/geo';
import { buildReminderIcs } from '../src/logic/ics';
import { canTrain, fromGiottoPtBackup } from '../src/logic/parq';
import { cuesBetween, positionAt } from '../src/logic/timeline';
import { loadJump, weeklyKm } from '../src/logic/stats';

const base: Profile = {
  id: 'me',
  name: 'Test',
  age: 40,
  sex: 'M',
  heightCm: 178,
  weightKg: 80,
  parq: {},
  medicalClearance: false,
  injuries: [],
  level: 'sedentario',
  continuousMin: 0,
  weeklyKm: 0,
  goal: 'inizia',
  daysPerWeek: 3,
  trainingDays: [2, 4, 6],
  minutesPerSession: 45,
  surfaces: ['parco'],
  reminderTime: '18:30',
  createdAt: '2026-11-23T10:00:00Z',
};
const runner: Profile = { ...base, level: 'corre', continuousMin: 40, weeklyKm: 20, goal: '10k', recent5kSec: 27 * 60, daysPerWeek: 4, trainingDays: [1, 3, 5, 0], minutesPerSession: 75 };
const MON = '2026-11-23';

function complete(w: Week, rpe = 6, pain: 0 | 1 | 2 = 0): { week: Week; runs: Run[] } {
  const sessions = w.sessions.map((s) => ({ ...s, status: 'fatta' as const }));
  const runs: Run[] = sessions.map((s, i) => ({ id: i, date: s.date + 'T18:00:00', sessionId: s.id, durationSec: totalSec(s.steps), rpe, pain, source: 'timer' }));
  return { week: { ...w, sessions }, runs };
}

describe('date', () => {
  it('trova il lunedì e i giorni', () => {
    expect(mondayOf('2026-11-26')).toBe(MON);
    expect(mondayOf('2026-11-29')).toBe(MON); // domenica
    expect(weekday(MON)).toBe(1);
    expect(addDays(MON, 6)).toBe('2026-11-29');
  });
});

describe('ritmi', () => {
  it('Riegel e Cooper danno valori sensati', () => {
    expect(Math.round(riegel(25 * 60, 5, 10))).toBeGreaterThan(50 * 60);
    const p = pace5kFromCooper(2400); // 12 min per 2,4 km = 5:00/km
    expect(p).toBeGreaterThan(300);
    expect(p).toBeLessThan(330);
  });
  it('formatta e legge i tempi', () => {
    expect(formatPace(330)).toBe('5:30');
    expect(formatPace(359.7)).toBe('6:00');
    expect(formatDuration(3725)).toBe('1:02:05');
    expect(formatDuration(95)).toBe('1:35');
    expect(parseDuration('25:30')).toBe(1530);
    expect(parseDuration('1:02:10')).toBe(3730);
    expect(parseDuration('abc')).toBeUndefined();
  });
});

describe('punto di partenza', () => {
  it('sedentario parte dal primo gradino, chi cammina dal secondo', () => {
    expect(startRung({ level: 'sedentario', continuousMin: 0 })).toBe(0);
    expect(startRung({ level: 'cammina', continuousMin: 0 })).toBe(1);
    expect(startRung({ level: 'corre', continuousMin: 10 })).toBe(8);
  });
  it('chi corre già 30+ minuti va in fase sviluppo con un volume coerente', () => {
    const st = initialState(runner);
    expect(st.phase).toBe('sviluppo');
    expect(st.pace5kSec).toBe(324);
    expect(st.weeklyMin).toBeGreaterThanOrEqual(60);
    expect(st.weeklyMin).toBeLessThanOrEqual(maxWeeklyMin(runner));
  });
});

describe('generazione della settimana', () => {
  it('principiante: 3 sedute corsa/cammino nei giorni scelti, entro i minuti', () => {
    const w = generateWeek(base, initialState(base), 0, MON);
    expect(w.sessions).toHaveLength(3);
    expect(w.sessions.map((s) => weekday(s.date))).toEqual([2, 4, 6]);
    for (const s of w.sessions) {
      expect(s.type).toBe('corsacammino');
      expect(totalSec(s.steps)).toBeLessThanOrEqual(45 * 60);
      expect(s.extras).toContain('stretching');
    }
    expect(w.sessions.some((s) => s.extras.includes('rinforzo'))).toBe(true);
  });

  it('con 5 giorni il principiante corre al massimo 3 volte e fa rinforzo negli altri', () => {
    const p = { ...base, trainingDays: [1, 2, 3, 4, 5], daysPerWeek: 5 };
    const w = generateWeek(p, initialState(p), 0, MON);
    expect(w.sessions.filter((s) => s.type === 'corsacammino')).toHaveLength(3);
    expect(w.sessions.filter((s) => s.type === 'rinforzo')).toHaveLength(2);
  });

  it('riduce le ripetizioni se il tempo non basta', () => {
    const p = { ...base, minutesPerSession: 20 };
    const w = generateWeek(p, { ...initialState(p), ladder: 3 }, 0, MON);
    for (const s of w.sessions) expect(totalSec(s.steps)).toBeLessThanOrEqual(20 * 60 + 60);
  });

  it('non crea sedute prima della data di inizio', () => {
    const w = generateWeek(base, initialState(base), 0, MON, '2026-11-26');
    expect(w.sessions.map((s) => s.date)).toEqual(['2026-11-26', '2026-11-28']);
  });

  it('runner: facile, qualità, lungo; lungo nell\'ultimo giorno; niente giorni intensi consecutivi', () => {
    const st = { ...initialState(runner), quality: 4 };
    const w = generateWeek(runner, st, 0, MON);
    expect(w.sessions).toHaveLength(4);
    const last = w.sessions[w.sessions.length - 1];
    expect(last.type).toBe('lungo');
    const hard = w.sessions.filter((s) => s.hard).map((s) => s.date);
    for (let i = 1; i < hard.length; i++) expect(addDays(hard[i - 1], 1)).not.toBe(hard[i]);
    for (const s of w.sessions) expect(totalSec(s.steps)).toBeLessThanOrEqual(75 * 60);
    expect(w.sessions.some((s) => s.type === 'ripetute' || s.type === 'medio')).toBe(true);
    // i ritmi sono indicati
    expect(w.sessions.some((s) => s.steps.some((x) => x.pace))).toBe(true);
  });

  it('le prime settimane di sviluppo usano gli allunghi invece delle ripetute', () => {
    const w = generateWeek(runner, initialState(runner), 0, MON);
    expect(w.sessions.some((s) => s.type === 'allunghi')).toBe(true);
    expect(w.sessions.some((s) => s.type === 'ripetute')).toBe(false);
  });

  it('ogni 4ª settimana è di scarico con test', () => {
    const st = initialState(runner);
    const w0 = generateWeek(runner, st, 0, MON);
    const w3 = generateWeek(runner, st, 3, addDays(MON, 21));
    expect(w3.kind).toBe('scarico');
    expect(w3.sessions.some((s) => s.type === 'test')).toBe(true);
    const mins = (w: Week) => w.sessions.reduce((a, s) => a + totalSec(s.steps), 0);
    expect(mins(w3)).toBeLessThan(mins(w0));
    const b3 = generateWeek(base, initialState(base), 3, addDays(MON, 21));
    expect(b3.sessions.filter((s) => s.type === 'test')).toHaveLength(1);
  });

  it('settimana della gara: la gara nel giorno giusto, riposo il giorno prima, allunghi due giorni prima', () => {
    const p = { ...runner, raceDate: '2026-12-06' }; // domenica
    const w = generateWeek(p, initialState(p), 1, '2026-11-30');
    expect(w.kind).toBe('gara');
    const race = w.sessions.find((s) => s.type === 'gara')!;
    expect(race.date).toBe('2026-12-06');
    expect(race.steps.find((x) => x.kind === 'gara')!.meters).toBe(10000);
    expect(w.sessions.filter((s) => s.date === '2026-12-05')).toHaveLength(0);
    expect(w.sessions.find((s) => s.date === '2026-12-04')?.type).toBe('allunghi');
  });

  it('spreadRoles separa qualità e lungo', () => {
    const roles = spreadRoles([1, 2, 4, 6], ['facile', 'qualita', 'facile', 'lungo']);
    expect(roles[3]).toBe('lungo');
    expect(roles[1]).toBe('qualita');
    const r2 = spreadRoles([4, 5, 6, 0], ['facile', 'qualita', 'facile', 'lungo']);
    expect(r2.indexOf('qualita')).not.toBe(2); // sabato attaccato a domenica
  });
});

describe('progressione', () => {
  it('settimana completata con sforzo ok: sale di un gradino', () => {
    const st = initialState(base);
    const { week, runs } = complete(generateWeek(base, st, 0, MON));
    const r = reviewWeek(st, week, runs, base);
    expect(r.review.action).toBe('avanza');
    expect(r.state.ladder).toBe(st.ladder + 1);
  });

  it('troppa fatica: ripete', () => {
    const st = initialState(base);
    const { week, runs } = complete(generateWeek(base, st, 0, MON), 9);
    const r = reviewWeek(st, week, runs, base);
    expect(r.review.action).toBe('ripeti');
    expect(r.state.ladder).toBe(st.ladder);
  });

  it('dolore vero: riduce e consiglia il medico', () => {
    const st = { ...initialState(base), ladder: 4 };
    const { week, runs } = complete(generateWeek(base, st, 0, MON), 5, 2);
    const r = reviewWeek(st, week, runs, base);
    expect(r.review.action).toBe('riduci');
    expect(r.state.ladder).toBe(3);
    expect(r.review.message).toMatch(/medico/);
  });

  it('due settimane vuote: riduce', () => {
    let st: PlanState = { ...initialState(base), ladder: 5 };
    const w = generateWeek(base, st, 0, MON);
    st = reviewWeek(st, w, [], base).state;
    expect(st.ladder).toBe(5);
    const r = reviewWeek(st, w, [], base);
    expect(r.review.action).toBe('riduci');
    expect(r.state.ladder).toBe(4);
  });

  it('metà settimana fatta: ripete', () => {
    const st = initialState(base);
    const w = generateWeek(base, st, 0, MON);
    const s0 = { ...w.sessions[0], status: 'fatta' as const };
    const week = { ...w, sessions: [s0, ...w.sessions.slice(1)] };
    const r = reviewWeek(st, week, [{ date: s0.date, sessionId: s0.id, durationSec: 1500, rpe: 5, pain: 0, source: 'timer' }], base);
    expect(r.review.action).toBe('ripeti');
  });

  it('ultimo gradino superato: passa alla fase sviluppo', () => {
    const st = { ...initialState(base), ladder: LAST_RUNG };
    const { week, runs } = complete(generateWeek(base, st, 0, MON));
    const r = reviewWeek(st, week, runs, base);
    expect(r.state.phase).toBe('sviluppo');
    expect(r.state.goalReached).toBe(true);
    expect(r.state.weeklyMin).toBeGreaterThanOrEqual(60);
  });

  it('runner: +10% senza superare il massimo; nessun aumento in scarico', () => {
    const st = initialState(runner);
    const { week, runs } = complete(generateWeek(runner, st, 0, MON));
    const r = reviewWeek(st, week, runs, runner);
    expect(r.state.weeklyMin).toBe(Math.min(maxWeeklyMin(runner), Math.round(st.weeklyMin * 1.1)));
    expect(r.state.quality).toBe(1);
    const s3 = complete(generateWeek(runner, st, 3, addDays(MON, 21)));
    expect(reviewWeek(st, s3.week, s3.runs, runner).state.weeklyMin).toBe(st.weeklyMin);
    const capped = reviewWeek({ ...st, weeklyMin: 5000 }, week, runs, runner);
    expect(capped.state.weeklyMin).toBe(maxWeeklyMin(runner));
  });

  it('test: Cooper aggiorna i ritmi, il test continuo fa saltare avanti', () => {
    const st = initialState(base);
    expect(applyTest(st, { date: MON, kind: 'cooper', value: 2400 }).state.pace5kSec).toBeGreaterThan(300);
    const j = applyTest({ ...st, ladder: 2 }, { date: MON, kind: 'continuo', value: 12 });
    expect(j.state.ladder).toBeGreaterThan(2);
    expect(LADDER[j.state.ladder].run).toBeLessThanOrEqual(12 * 60);
    expect(applyTest({ ...st, ladder: 9 }, { date: MON, kind: 'continuo', value: 3 }).state.ladder).toBe(9);
  });

  it('fattibilità della gara', () => {
    const p = { ...base, goal: '5k' as const, raceDate: '2026-12-20' };
    const f = raceFeasibility(p, initialState(p), '2026-11-26')!;
    expect(f.ok).toBe(false);
    expect(f.weeks).toBe(4);
    const p2 = { ...p, raceDate: '2027-05-30' };
    expect(raceFeasibility(p2, initialState(p2), '2026-11-26')!.ok).toBe(true);
  });

  it('spostare una seduta intensa vicino a un\'altra intensa la rende facile', () => {
    const st = { ...initialState(runner), quality: 4 };
    const w = generateWeek(runner, st, 0, MON); // lun, mer, ven, dom
    const q = w.sessions.find((s) => s.hard && s.type !== 'lungo')!;
    const res = moveSession(w, q.id, '2026-11-28', runner, st); // sabato, accanto al lungo di domenica
    expect('week' in res).toBe(true);
    if ('week' in res) {
      expect(res.warning).toBeDefined();
      expect(res.week.sessions.find((s) => s.id === q.id)!.hard).toBe(false);
    }
    const busy = moveSession(w, q.id, w.sessions[0].date, runner, st);
    expect('error' in busy).toBe(true);
    expect('error' in moveSession(w, q.id, '2026-12-10', runner, st)).toBe(true);
  });
});

describe('GPS e GPX', () => {
  it('haversine: 1 grado di latitudine ≈ 111 km', () => {
    expect(Math.round(haversine(45, 9, 46, 9) / 1000)).toBe(111);
  });
  it('scarta i fix imprecisi o fermi', () => {
    expect(acceptFix(undefined, [45, 9, 0], 50)).toBe(false);
    expect(acceptFix(undefined, [45, 9, 0], 10)).toBe(true);
    expect(acceptFix([45, 9, 0], [45.00001, 9, 1000], 10)).toBe(false); // 1 m
    expect(acceptFix([45, 9, 0], [45.0001, 9, 5000], 10)).toBe(true); // 11 m
    expect(acceptFix([45, 9, 0], [45.01, 9, 1000], 5)).toBe(false); // salto
  });
  it('legge un GPX con orari e battito', () => {
    const pts = Array.from({ length: 11 }, (_, i) => {
      const t = new Date(Date.UTC(2026, 10, 20, 7, 0, i * 30)).toISOString();
      return `<trkpt lat="${45 + i * 0.0009}" lon="9.0"><ele>120</ele><time>${t}</time><extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>${140 + i}</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions></trkpt>`;
    }).join('\n');
    const gpx = `<?xml version="1.0"?><gpx version="1.1" creator="test"><trk><name>Corsa al parco</name><trkseg>${pts}</trkseg></trk></gpx>`;
    const r = parseGpx(gpx);
    expect(r.durationSec).toBe(300);
    expect(r.distanceKm).toBeCloseTo(1.0, 1);
    expect(r.avgHr).toBe(145);
    expect(r.name).toBe('Corsa al parco');
  });
  it('errori chiari sui file sbagliati', () => {
    expect(() => parseGpx('ciao')).toThrow(/GPX/);
    expect(() => parseGpx('<gpx><trk><trkseg><trkpt lat="1" lon="2"></trkpt><trkpt lat="1" lon="2"></trkpt></trkseg></trk></gpx>')).toThrow(/orari/);
  });
  it('distanza della traccia ignora i salti', () => {
    expect(trackDistance([[45, 9, 0], [46, 9, 1000], [45.001, 9, 2000]])).toBeLessThan(200);
  });
});

describe('promemoria, PAR-Q e altro', () => {
  it('crea un calendario valido con ricorrenza e gara', () => {
    const ics = buildReminderIcs([2, 4, 6], '18:30', { now: new Date(2026, 10, 26, 10), raceDate: '2027-03-14' });
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=TU,TH,SA;UNTIL=20270314T235959Z');
    expect(ics).toContain('DTSTART:20261126T183000');
    expect(ics).toContain('DTSTART;VALUE=DATE:20270314');
    expect(ics.split('BEGIN:VEVENT')).toHaveLength(3);
  });
  it('PAR-Q: blocca con un sì, sblocca col medico', () => {
    expect(canTrain({ parq: { cuore: false }, sex: 'M', medicalClearance: false })).toBe(true);
    expect(canTrain({ parq: { cuore: true }, sex: 'M', medicalClearance: false })).toBe(false);
    expect(canTrain({ parq: { cuore: true }, sex: 'M', medicalClearance: true })).toBe(true);
    expect(canTrain({ parq: { gravidanza: true }, sex: 'M', medicalClearance: false })).toBe(true);
  });
  it('importa i dati da un backup di Giotto PT', () => {
    const d = fromGiottoPtBackup({ format: 'giotto-pt-backup', data: { profile: [{ name: 'Gio', age: 41, sex: 'M', heightCm: 180, weightKg: 82, parq: { cuore: false }, injuries: ['ginocchia', 'spalle'], medicalClearance: false }] } });
    expect(d.name).toBe('Gio');
    expect(d.injuries).toEqual(['ginocchia']);
    expect(d.parq).toEqual({ cuore: false });
    expect(() => fromGiottoPtBackup({ format: 'altro' })).toThrow();
  });
  it('timeline: posizione e avvisi', () => {
    const steps = [
      { kind: 'riscaldamento' as const, sec: 300, label: '' },
      { kind: 'corsa' as const, sec: 60, label: '' },
    ];
    expect(positionAt(steps, 310)).toMatchObject({ index: 1, remaining: 50 });
    expect(positionAt(steps, 400).done).toBe(true);
    const cues = cuesBetween(steps, 299, 301).map((c) => c.type);
    expect(cues).toContain('start');
    expect(cuesBetween(steps, 0, 151).map((c) => c.type)).toContain('half');
    expect(cuesBetween(steps, 358.5, 360).map((c) => c.type)).toEqual(['count', 'end']);
  });
  it('km settimanali e salto di carico', () => {
    const runs: Run[] = [
      { date: '2026-11-24T18:00:00', durationSec: 1800, distanceKm: 5, rpe: 5, pain: 0, source: 'manuale' },
      { date: '2026-11-26T18:00:00', durationSec: 1800, distanceKm: 5.5, rpe: 5, pain: 0, source: 'manuale' },
      { date: '2026-11-17T18:00:00', durationSec: 1800, distanceKm: 4, rpe: 5, pain: 0, source: 'manuale' },
    ];
    const w = weeklyKm(runs, '2026-11-26', 4);
    expect(w.map((x) => x.km)).toEqual([0, 0, 4, 10.5]);
    expect(loadJump([{ start: '', km: 10, runs: 1 }, { start: '', km: 10, runs: 1 }, { start: '', km: 10, runs: 1 }, { start: '', km: 15, runs: 1 }])).toBeCloseTo(0.5);
  });
});
