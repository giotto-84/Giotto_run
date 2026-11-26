import { db } from './db';

const FORMAT = 'giotto-run-backup';
const VERSION = 1;
const TABLES = ['profile', 'settings', 'state', 'weeks', 'runs', 'shoes', 'tests', 'body'] as const;

export interface BackupFile {
  format: typeof FORMAT;
  version: number;
  exportedAt: string;
  data: Record<(typeof TABLES)[number], unknown[]>;
}

export async function exportBackup(): Promise<BackupFile> {
  const data = {} as BackupFile['data'];
  for (const t of TABLES) data[t] = await db.table(t).toArray();
  return { format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(), data };
}

export function backupFileName(d = new Date()): string {
  return `giotto-run-backup-${d.toISOString().slice(0, 10)}.json`;
}

export function validateBackup(json: unknown): BackupFile {
  const file = json as Omit<Partial<BackupFile>, 'format'> & { format?: string };
  if (file?.format === 'giotto-pt-backup') {
    throw new Error('Questo è un backup di Giotto PT: usalo nel questionario iniziale per importare i tuoi dati.');
  }
  if (!file || file.format !== FORMAT || typeof file.data !== 'object' || file.data === null) {
    throw new Error('Questo file non è un backup di Giotto Run.');
  }
  if ((file.version ?? 0) > VERSION) {
    throw new Error("Il backup è stato creato con una versione più recente dell'app. Aggiorna l'app e riprova.");
  }
  const data = file.data as BackupFile['data'];
  if (!Array.isArray(data.profile) || data.profile.length === 0) throw new Error('Il backup non contiene un profilo.');
  return file as BackupFile;
}

/** Sostituisce tutti i dati locali con il contenuto del backup. */
export async function importBackup(json: unknown): Promise<void> {
  const { data } = validateBackup(json);
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      await db.table(t).clear();
      const rows = data[t];
      if (Array.isArray(rows) && rows.length) await db.table(t).bulkPut(rows);
    }
  });
}

/** Condivide (sul telefono) o scarica un file. */
export async function shareOrDownload(name: string, text: string, type: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = new Blob([text], { type });
  const file = new File([blob], name, { type });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: name });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'downloaded';
}

export async function saveBackup() {
  const backup = await exportBackup();
  return shareOrDownload(backupFileName(), JSON.stringify(backup), 'application/json');
}
