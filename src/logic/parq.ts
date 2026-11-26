import type { Profile, Zone } from '../types';

/** Stesse domande di Giotto PT (PAR-Q), più due specifiche per la corsa. */
export const PARQ_QUESTIONS: { id: string; text: string; onlyF?: boolean }[] = [
  { id: 'cuore', text: 'Un medico ti ha mai detto che hai un problema al cuore o la pressione alta?' },
  { id: 'dolore_petto', text: 'Senti dolore al petto a riposo, nella vita di tutti i giorni o quando fai attività fisica?' },
  { id: 'capogiri', text: "Negli ultimi 12 mesi hai perso l'equilibrio per capogiri o hai perso conoscenza?" },
  { id: 'cronica', text: "Ti è stata diagnosticata un'altra malattia cronica (per esempio diabete, asma, problemi ai reni)?" },
  { id: 'farmaci', text: 'Prendi farmaci prescritti per una malattia cronica?' },
  { id: 'ossa', text: "Hai (o hai avuto nell'ultimo anno) un problema a ossa, articolazioni o muscoli che potrebbe peggiorare con l'attività fisica?" },
  { id: 'supervisione', text: 'Un medico ti ha detto di fare attività fisica solo sotto controllo medico?' },
  { id: 'gravidanza', text: 'Sei in gravidanza o hai partorito negli ultimi 6 mesi?', onlyF: true },
  { id: 'infortunio_corsa', text: 'Negli ultimi 3 mesi hai avuto un infortunio a piedi, caviglie, ginocchia o anche che ti fa ancora male?' },
  { id: 'fiato', text: 'Ti manca il fiato in modo insolito, o senti il cuore battere in modo irregolare, anche facendo le scale?' },
];

export function parqQuestionsFor(sex: Profile['sex']) {
  return PARQ_QUESTIONS.filter((q) => !q.onlyF || sex === 'F');
}

export function parqRisk(p: Pick<Profile, 'parq' | 'sex'>): boolean {
  return parqQuestionsFor(p.sex).some((q) => p.parq[q.id]);
}

/** L'app è utilizzabile se il PAR-Q è "pulito" oppure c'è il via libera del medico. */
export function canTrain(p: Pick<Profile, 'parq' | 'sex' | 'medicalClearance'>): boolean {
  return p.medicalClearance || !parqRisk(p);
}

export const ZONES: { id: Zone; label: string }[] = [
  { id: 'piedi', label: 'Piedi' },
  { id: 'caviglie', label: 'Caviglie' },
  { id: 'polpacci', label: 'Polpacci / tendine d’Achille' },
  { id: 'ginocchia', label: 'Ginocchia' },
  { id: 'anche', label: 'Anche' },
  { id: 'schiena', label: 'Schiena' },
];

/** Dati presi da un backup di Giotto PT per non ricompilare il questionario. */
export function fromGiottoPtBackup(json: unknown): Partial<Profile> {
  const f = json as { format?: string; data?: { profile?: unknown[] } };
  if (!f || f.format !== 'giotto-pt-backup' || !Array.isArray(f.data?.profile) || !f.data!.profile!.length) {
    throw new Error('Questo file non è un backup di Giotto PT.');
  }
  const pt = f.data!.profile![0] as Record<string, unknown>;
  const out: Partial<Profile> = {};
  if (typeof pt.name === 'string') out.name = pt.name;
  if (typeof pt.age === 'number') out.age = pt.age;
  if (pt.sex === 'M' || pt.sex === 'F') out.sex = pt.sex;
  if (typeof pt.heightCm === 'number') out.heightCm = pt.heightCm;
  if (typeof pt.weightKg === 'number') out.weightKg = pt.weightKg;
  if (pt.parq && typeof pt.parq === 'object') {
    const parq: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(pt.parq as Record<string, unknown>)) if (typeof v === 'boolean') parq[k] = v;
    out.parq = parq;
  }
  if (typeof pt.medicalClearance === 'boolean') out.medicalClearance = pt.medicalClearance;
  if (Array.isArray(pt.injuries)) {
    const valid = new Set(ZONES.map((z) => z.id));
    out.injuries = (pt.injuries as string[]).filter((z): z is Zone => valid.has(z as Zone));
  }
  if (Array.isArray(pt.trainingDays)) out.trainingDays = (pt.trainingDays as number[]).filter((d) => d >= 0 && d <= 6);
  if (typeof pt.reminderTime === 'string') out.reminderTime = pt.reminderTime;
  return out;
}
