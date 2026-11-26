export type Sex = 'M' | 'F';

/** Punto di partenza dichiarato nel questionario. */
export type Level = 'sedentario' | 'cammina' | 'corre';

export type Goal = 'inizia' | '5k' | '10k' | 'tempo' | 'forma';

export type Surface = 'strada' | 'parco' | 'tapis' | 'pista';

export type Zone = 'ginocchia' | 'caviglie' | 'anche' | 'piedi' | 'schiena' | 'polpacci';

export interface Profile {
  id: 'me';
  name: string;
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg?: number;
  /** Risposte PAR-Q: true = "sì" (segnale di rischio). */
  parq: Record<string, boolean>;
  medicalClearance: boolean;
  injuries: Zone[];
  level: Level;
  /** Minuti di corsa continua che riesce a fare oggi (0 se non corre). */
  continuousMin: number;
  /** Km a settimana attuali (solo se corre già). */
  weeklyKm: number;
  /** Tempo recente sui 5 km in secondi (facoltativo). */
  recent5kSec?: number;
  goal: Goal;
  /** Per l'obiettivo "migliorare il tempo": 5 o 10 km. */
  targetKm?: 5 | 10;
  /** Data della gara (YYYY-MM-DD), facoltativa. */
  raceDate?: string;
  daysPerWeek: number;
  /** 0 = domenica … 6 = sabato */
  trainingDays: number[];
  minutesPerSession: number;
  surfaces: Surface[];
  reminderTime: string; // "18:30"
  createdAt: string;
}

export interface Settings {
  id: 'me';
  voice: boolean;
  beeps: boolean;
  vibration: boolean;
  theme: 'auto' | 'light' | 'dark';
  gpsDefault: boolean;
}

export type Phase = 'base' | 'sviluppo';

/** Stato del piano: da qui si genera ogni nuova settimana. */
export interface PlanState {
  id: 'me';
  phase: Phase;
  /** Gradino della scala corsa/cammino (fase base). */
  ladder: number;
  /** Minuti di corsa settimanali di riferimento (fase sviluppo). */
  weeklyMin: number;
  /** Quante settimane di sviluppo completate con successo (fa progredire le ripetute). */
  quality: number;
  /** Passo stimato sui 5 km (sec/km), dai test. */
  pace5kSec?: number;
  /** Settimane consecutive senza nessun allenamento. */
  emptyWeeks: number;
  /** L'obiettivo "inizia a correre" è stato raggiunto. */
  goalReached?: boolean;
}

export type StepKind =
  | 'riscaldamento'
  | 'cammino'
  | 'corsa'
  | 'veloce'
  | 'recupero'
  | 'andature'
  | 'allunghi'
  | 'defaticamento'
  | 'test'
  | 'gara';

export interface Step {
  kind: StepKind;
  sec: number;
  label: string;
  /** Intervallo di passo consigliato in sec/km [veloce, lento]. */
  pace?: [number, number];
  /** Distanza invece del tempo (gara): metri. */
  meters?: number;
}

export type SessionType =
  | 'corsacammino'
  | 'facile'
  | 'lungo'
  | 'ripetute'
  | 'fartlek'
  | 'medio'
  | 'allunghi'
  | 'test'
  | 'gara'
  | 'rinforzo';

export type Extra = 'andature' | 'rinforzo' | 'stretching';

export type SessionStatus = 'da_fare' | 'fatta' | 'saltata';

export interface Session {
  id: string;
  date: string; // YYYY-MM-DD
  type: SessionType;
  title: string;
  summary: string;
  steps: Step[];
  extras: Extra[];
  /** Seduta impegnativa: mai due di fila. */
  hard: boolean;
  status: SessionStatus;
  runId?: number;
}

export type WeekKind = 'normale' | 'scarico' | 'gara';

export interface ReviewResult {
  action: 'avanza' | 'ripeti' | 'riduci';
  message: string;
  done: number;
  planned: number;
}

export interface Week {
  index: number; // 0, 1, 2…
  start: string; // lunedì YYYY-MM-DD
  kind: WeekKind;
  phase: Phase;
  test: boolean;
  sessions: Session[];
  review?: ReviewResult;
}

export type RunSource = 'gps' | 'manuale' | 'gpx' | 'timer';

export interface Run {
  id?: number;
  date: string; // ISO completo
  sessionId?: string;
  sessionType?: SessionType;
  distanceKm?: number;
  durationSec: number;
  avgHr?: number;
  /** Sforzo percepito 1–10. */
  rpe: number;
  /** 0 = nessun dolore, 1 = fastidio lieve, 2 = dolore vero. */
  pain: 0 | 1 | 2;
  painZone?: Zone;
  shoeId?: number;
  source: RunSource;
  /** Traccia semplificata [lat, lon, ms]. */
  track?: [number, number, number][];
  notes?: string;
}

export interface Shoe {
  id?: number;
  name: string;
  startKm: number;
  retired: boolean;
  createdAt: string;
}

export type TestKind = 'cooper' | 'continuo';

export interface TestResult {
  id?: number;
  date: string;
  kind: TestKind;
  /** cooper: metri in 12 minuti. continuo: minuti di corsa senza fermarsi. */
  value: number;
}

export interface BodyEntry {
  id?: number;
  date: string;
  weightKg: number;
}
