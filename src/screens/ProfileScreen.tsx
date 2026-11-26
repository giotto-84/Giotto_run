import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, DEFAULT_SETTINGS } from '../db/db';
import { importBackup, saveBackup, shareOrDownload } from '../db/backup';
import { buildReminderIcs } from '../logic/ics';
import { WEEK_ORDER, WEEKDAYS_SHORT } from '../logic/dates';
import { Chips, Icon, Sheet, Stepper, TopBar, useToast } from '../components/ui';
import { canVibrate } from '../device';
import type { Settings } from '../types';

export function ProfileScreen() {
  const profile = useLiveQuery(() => db.profile.get('me'), []);
  const settings = useLiveQuery(async () => (await db.settings.get('me')) ?? DEFAULT_SETTINGS, []);
  const shoes = useLiveQuery(() => db.shoes.toArray(), []);
  const [toast, showToast] = useToast();
  const [shoeOpen, setShoeOpen] = useState(false);
  const [shoeName, setShoeName] = useState('');
  const [shoeKm, setShoeKm] = useState(0);
  const restoreInput = useRef<HTMLInputElement>(null);
  if (!profile || !settings || !shoes) return null;

  const setS = (patch: Partial<Settings>) => db.settings.put({ ...settings, ...patch });

  return (
    <div className="stack">
      <TopBar title="Profilo" back={false} />
      <div className="card">
        <div className="row spread">
          <div>
            <h3 style={{ marginBottom: 2 }}>{profile.name}</h3>
            <div className="small muted">
              {profile.age} anni · {WEEK_ORDER.filter((d) => profile.trainingDays.includes(d)).map((d) => WEEKDAYS_SHORT[d]).join(', ')} · {profile.minutesPerSession} min
            </div>
          </div>
        </div>
        <Link className="btn secondary block" style={{ marginTop: 12 }} to="/benvenuto?modifica">
          Modifica questionario e obiettivo
        </Link>
      </div>

      <section className="card stack tight">
        <h3>Durante la corsa</h3>
        <Toggle label="Voce in italiano" checked={settings.voice} onChange={(v) => setS({ voice: v })} />
        <Toggle label="Bip ai cambi" checked={settings.beeps} onChange={(v) => setS({ beeps: v })} />
        <Toggle
          label="Vibrazione"
          hint={canVibrate ? undefined : 'Non disponibile su iPhone (limite di Safari).'}
          checked={settings.vibration}
          onChange={(v) => setS({ vibration: v })}
        />
        <Toggle label="GPS attivo di default" hint="Solo a schermo acceso." checked={settings.gpsDefault} onChange={(v) => setS({ gpsDefault: v })} />
      </section>

      <section className="card stack tight">
        <h3>Aspetto</h3>
        <Chips
          options={[
            { value: 'auto', label: 'Automatico' },
            { value: 'light', label: 'Chiaro' },
            { value: 'dark', label: 'Scuro' },
          ]}
          value={[settings.theme]}
          onChange={([v]) => setS({ theme: v as Settings['theme'] })}
        />
      </section>

      <section className="card stack tight">
        <h3>Promemoria</h3>
        <p className="small muted">
          Le web app su iPhone non possono mandare notifiche programmate. Aggiungi invece un evento ricorrente al Calendario: ti avviserà 15 minuti prima, nei tuoi giorni di corsa
          alle {profile.reminderTime}.
        </p>
        <button
          className="btn secondary block"
          onClick={async () => {
            const ics = buildReminderIcs(profile.trainingDays, profile.reminderTime, { raceDate: profile.raceDate, url: location.href.split('#')[0] });
            const r = await shareOrDownload('giotto-run-promemoria.ics', ics, 'text/calendar');
            if (r !== 'cancelled') showToast('Apri il file e tocca “Aggiungi tutto” per salvarlo nel Calendario.');
          }}
        >
          <Icon name="calendar" /> Aggiungi al Calendario
        </button>
        <span className="tiny muted">Se cambi giorni o orario, cancella il vecchio evento dal Calendario e aggiungi quello nuovo.</span>
      </section>

      <section className="card stack tight">
        <div className="row spread">
          <h3>Scarpe</h3>
          <button className="btn secondary small" onClick={() => setShoeOpen(true)}>
            + Scarpe
          </button>
        </div>
        {!shoes.length && <p className="small muted">Aggiungi le tue scarpe: conterò i km e ti avviserò quando sarà ora di cambiarle (circa 700 km).</p>}
        {shoes.map((s) => (
          <div key={s.id} className="row spread small">
            <span>
              {s.name}
              {s.retired ? ' · ritirate' : ''}
            </span>
            <button className="linkbtn" onClick={() => db.shoes.update(s.id!, { retired: !s.retired })}>
              {s.retired ? 'Riattiva' : 'Ritira'}
            </button>
          </div>
        ))}
      </section>

      <section className="card stack tight">
        <h3>Backup</h3>
        <p className="small muted">I tuoi dati sono solo su questo telefono. Salva ogni tanto un backup (su File, iCloud Drive, Google Drive o via messaggio).</p>
        <button
          className="btn block"
          onClick={async () => {
            const r = await saveBackup();
            if (r === 'downloaded') showToast('Backup scaricato.');
          }}
        >
          Salva backup
        </button>
        <button className="btn secondary block" onClick={() => restoreInput.current?.click()}>
          Ripristina da backup
        </button>
        <input
          ref={restoreInput}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (!confirm('Il ripristino sostituisce tutti i dati attuali con quelli del backup. Continuare?')) return;
            try {
              await importBackup(JSON.parse(await f.text()));
              showToast('Backup ripristinato.');
            } catch (err) {
              showToast((err as Error).message);
            }
          }}
        />
      </section>

      <section className="card stack tight">
        <h3>Giotto PT</h3>
        <p className="small muted">L’app gemella per l’allenamento di forza. Il rinforzo per runner che trovi qui si combina bene con le sue schede.</p>
        <a className="btn secondary block" href="https://giotto-84.github.io/Ruolino-/" target="_blank" rel="noreferrer">
          Apri Giotto PT
        </a>
      </section>

      <section className="card stack tight">
        <h3>Informazioni</h3>
        <p className="small muted">
          Giotto Run dà indicazioni generali di allenamento e non sostituisce il parere di un medico. Il piano è creato con regole fisse (niente intelligenza artificiale) e tutti i dati
          restano sul tuo dispositivo.
        </p>
        <Link to="/guida" className="small">Consigli: GPS, scarpe, infortuni, installazione →</Link>
        <button
          className="linkbtn"
          style={{ color: 'var(--track)', alignSelf: 'flex-start' }}
          onClick={async () => {
            if (!confirm('Cancellare TUTTI i dati di Giotto Run da questo telefono? Fai prima un backup se vuoi conservarli.')) return;
            await db.delete();
            location.reload();
          }}
        >
          Cancella tutti i dati
        </button>
      </section>

      <Sheet open={shoeOpen} onClose={() => setShoeOpen(false)} label="Nuove scarpe">
        <div className="stack">
          <label className="field">
            <span>Nome (es. marca e modello)</span>
            <input className="input" value={shoeName} onChange={(e) => setShoeName(e.target.value)} />
          </label>
          <div className="field">
            <span>Km già fatti con queste scarpe</span>
            <Stepper value={shoeKm} onChange={setShoeKm} step={10} min={0} max={2000} label="km già fatti" />
          </div>
          <button
            className="btn block"
            disabled={!shoeName.trim()}
            onClick={async () => {
              await db.shoes.add({ name: shoeName.trim(), startKm: shoeKm, retired: false, createdAt: new Date().toISOString() });
              setShoeOpen(false);
              setShoeName('');
              setShoeKm(0);
            }}
          >
            Aggiungi
          </button>
        </div>
      </Sheet>
      {toast}
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="row spread" style={{ minHeight: 44 }}>
      <span>
        {label}
        {hint && <span className="tiny muted" style={{ display: 'block' }}>{hint}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ width: 26, height: 26 }} />
    </label>
  );
}
