import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { db } from '../src/db/db';
import { ensureCurrentWeek, moveSessionTo, saveRun, startPlan } from '../src/db/actions';
import { exportBackup, importBackup, validateBackup } from '../src/db/backup';
import { totalSec } from '../src/logic/generator';
import type { Profile } from '../src/types';

const profile: Profile = {
  id: 'me', name: 'Test', age: 40, sex: 'M', heightCm: 178, parq: {}, medicalClearance: false, injuries: [],
  level: 'sedentario', continuousMin: 0, weeklyKm: 0, goal: 'inizia', daysPerWeek: 3, trainingDays: [2, 4, 6],
  minutesPerSession: 45, surfaces: ['parco'], reminderTime: '18:30', createdAt: '2026-11-23T10:00:00Z',
};

afterEach(() => vi.useRealTimers());

describe('flusso del piano nel database', () => {
  it('crea il piano, registra le corse e a fine settimana avanza', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 23, 9)); // lunedì
    await startPlan(profile);
    let w = (await db.weeks.toArray())[0];
    expect(w.sessions).toHaveLength(3);
    for (const s of w.sessions) {
      await saveRun({ date: s.date + 'T18:00:00', sessionId: s.id, durationSec: totalSec(s.steps), rpe: 5, pain: 0, source: 'timer' });
    }
    expect((await db.weeks.get(0))!.sessions.every((s) => s.status === 'fatta')).toBe(true);
    vi.setSystemTime(new Date(2026, 10, 30, 9)); // lunedì dopo
    const r = await ensureCurrentWeek();
    expect(r?.action).toBe('avanza');
    expect((await db.state.get('me'))!.ladder).toBe(1);
    w = (await db.weeks.get(1))!;
    expect(w.start).toBe('2026-11-30');
  });

  it('dopo settimane di assenza riparte dalla settimana corrente e alleggerisce', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 11, 28, 9)); // 4 settimane dopo
    const before = (await db.state.get('me'))!.ladder;
    await ensureCurrentWeek();
    const last = await db.weeks.orderBy('index').last();
    expect(last!.start).toBe('2026-12-28');
    expect((await db.state.get('me'))!.ladder).toBeLessThan(before);
  });

  it('sposta una seduta e fa backup/ripristino', async () => {
    const w = (await db.weeks.orderBy('index').last())!;
    const free = ['2026-12-28', '2026-12-30', '2027-01-01'].find((d) => !w.sessions.some((s) => s.date === d))!;
    const res = await moveSessionTo(w.sessions[0].id, free);
    expect(res.error).toBeUndefined();
    const backup = await exportBackup();
    expect(validateBackup(JSON.parse(JSON.stringify(backup))).format).toBe('giotto-run-backup');
    await db.runs.clear();
    await importBackup(JSON.parse(JSON.stringify(backup)));
    expect(await db.runs.count()).toBe(3);
    expect(() => validateBackup({ format: 'giotto-pt-backup', data: {} })).toThrow(/Giotto PT/);
  });
});
