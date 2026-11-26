const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function localStamp(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

/**
 * Evento settimanale ricorrente nei giorni di corsa, con avviso 15 minuti prima.
 * Importato nel calendario del telefono dà promemoria affidabili senza server.
 * Se c'è una gara, la ricorrenza finisce il giorno della gara e si aggiunge l'evento gara.
 */
export function buildReminderIcs(trainingDays: number[], time: string, opts: { now?: Date; raceDate?: string; url?: string } = {}): string {
  const now = opts.now ?? new Date();
  const [h, m] = time.split(':').map(Number);
  const days = [...trainingDays].sort();
  const start = new Date(now);
  start.setHours(h, m, 0, 0);
  for (let i = 0; i < 7; i++) {
    if (days.includes(start.getDay()) && start.getTime() > now.getTime() - 60_000) break;
    start.setDate(start.getDate() + 1);
  }
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const utc = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const until = opts.raceDate ? `;UNTIL=${opts.raceDate.replace(/-/g, '')}T235959Z` : '';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Giotto Run//IT',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:giotto-run-${utc}@giotto-run`,
    `DTSTAMP:${utc}`,
    `DTSTART:${localStamp(start)}`,
    `DTEND:${localStamp(end)}`,
    `RRULE:FREQ=WEEKLY;BYDAY=${days.map((d) => BYDAY[d]).join(',')}${until}`,
    'SUMMARY:Corsa con Giotto Run',
    "DESCRIPTION:Apri Giotto Run e guarda l'allenamento di oggi.",
    ...(opts.url ? [`URL:${opts.url}`] : []),
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:È ora di correre!',
    'TRIGGER:-PT15M',
    'END:VALARM',
    'END:VEVENT',
  ];
  if (opts.raceDate) {
    const d = opts.raceDate.replace(/-/g, '');
    lines.push(
      'BEGIN:VEVENT',
      `UID:giotto-run-gara-${d}@giotto-run`,
      `DTSTAMP:${utc}`,
      `DTSTART;VALUE=DATE:${d}`,
      'SUMMARY:Gara! 🏁',
      'DESCRIPTION:Oggi è il grande giorno. Parti piano e chiudi forte!',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR', '');
  return lines.join('\r\n');
}
