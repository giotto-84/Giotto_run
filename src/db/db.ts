import Dexie, { type Table } from 'dexie';
import type { BodyEntry, PlanState, Profile, Run, Settings, Shoe, TestResult, Week } from '../types';

export class RunDB extends Dexie {
  profile!: Table<Profile, string>;
  settings!: Table<Settings, string>;
  state!: Table<PlanState, string>;
  weeks!: Table<Week, number>;
  runs!: Table<Run, number>;
  shoes!: Table<Shoe, number>;
  tests!: Table<TestResult, number>;
  body!: Table<BodyEntry, number>;

  constructor() {
    super('giotto-run');
    this.version(1).stores({
      profile: 'id',
      settings: 'id',
      state: 'id',
      weeks: 'index, start',
      runs: '++id, date, sessionId',
      shoes: '++id',
      tests: '++id, date',
      body: '++id, date',
    });
  }
}

export const db = new RunDB();

export const DEFAULT_SETTINGS: Settings = {
  id: 'me',
  voice: true,
  beeps: true,
  vibration: true,
  theme: 'auto',
  gpsDefault: false,
};

export async function getSettings(): Promise<Settings> {
  return (await db.settings.get('me')) ?? DEFAULT_SETTINGS;
}

export async function currentWeek(): Promise<Week | undefined> {
  return db.weeks.orderBy('index').last();
}
