import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { findSession, saveRun, updateRun } from '../db/actions';
import { parseGpx } from '../logic/gpx';
import { formatDuration, formatPace, parseDuration } from '../logic/paces';
import { ZONES } from '../logic/parq';
import { Chips, Icon, TopBar } from '../components/ui';
import { DRAFT_KEY, type RunDraft } from './Player';
import type { Run, Session, TestKind, Zone } from '../types';
import type { TrackPoint } from '../logic/geo';

const RPE_TEXT = [
  '',
  'Facilissimo',
  'Molto facile',
  'Facile: potevo cantare',
  'Facile: parlavo bene',
  'Comodo',
  'Un po’ impegnativo',
  'Impegnativo: poche parole',
  'Duro',
  'Durissimo',
  'Massimo sforzo',
];

function localDateTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function LogRun() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get('corsa') ? Number(params.get('corsa')) : undefined;
  const editing = useLiveQuery(async () => (editId !== undefined ? await db.runs.get(editId) : undefined), [editId]);
  const sessionId = params.get('seduta') ?? editing?.sessionId ?? undefined;
  const fromDraft = params.has('bozza');
  const found = useLiveQuery(() => (sessionId ? findSession(sessionId) : Promise.resolve(undefined)), [sessionId]);
  const state = useLiveQuery(() => db.state.get('me'), []);
  const shoes = useLiveQuery(() => db.shoes.filter((s) => !s.retired).toArray(), []);
  const session: Session | undefined = found?.session;

  const [when, setWhen] = useState(localDateTime(new Date()));
  const [duration, setDuration] = useState('');
  const [km, setKm] = useState('');
  const [hr, setHr] = useState('');
  const [rpe, setRpe] = useState(5);
  const [pain, setPain] = useState<0 | 1 | 2>(0);
  const [zone, setZone] = useState<Zone | undefined>();
  const [shoeId, setShoeId] = useState<number | undefined>();
  const [notes, setNotes] = useState('');
  const [testValue, setTestValue] = useState('');
  const [track, setTrack] = useState<TrackPoint[] | undefined>();
  const [source, setSource] = useState<Run['source']>('manuale');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const gpxInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!fromDraft) return;
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as RunDraft;
      setWhen(localDateTime(new Date(d.startedAt)));
      setDuration(formatDuration(d.durationSec));
      if (d.distanceKm) setKm(String(d.distanceKm).replace('.', ','));
      if (d.track) setTrack(d.track);
      if (d.testValue) setTestValue(String(d.testValue));
      setSource(d.track ? 'gps' : 'timer');
    } catch {
      /* ignora */
    }
  }, [fromDraft]);

  // modalità "correggi": precompila con la corsa già salvata
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (!editing || prefilled) return;
    setPrefilled(true);
    setWhen(localDateTime(new Date(editing.date)));
    setDuration(formatDuration(editing.durationSec));
    setKm(editing.distanceKm ? String(editing.distanceKm).replace('.', ',') : '');
    setHr(editing.avgHr ? String(editing.avgHr) : '');
    setRpe(editing.rpe);
    setPain(editing.pain);
    setZone(editing.painZone);
    setShoeId(editing.shoeId ?? -1);
    setNotes(editing.notes ?? '');
    setTrack(editing.track);
    setSource(editing.source);
  }, [editing, prefilled]);

  useEffect(() => {
    if (editId !== undefined) return;
    if (shoes?.length && shoeId === undefined) setShoeId(shoes[shoes.length - 1].id);
  }, [shoes, shoeId, editId]);

  useEffect(() => {
    if (editId !== undefined) return;
    if (session && !duration && !fromDraft && session.type !== 'rinforzo') {
      const sec = session.steps.reduce((a, b) => a + b.sec, 0);
      setDuration(formatDuration(sec));
    }
    if (session?.type === 'rinforzo' && !duration) setDuration('25:00');
  }, [session, duration, fromDraft, editId]);

  const importGpx = async (file: File) => {
    try {
      const g = parseGpx(await file.text());
      setWhen(localDateTime(new Date(g.start)));
      setDuration(formatDuration(g.durationSec));
      setKm(g.distanceKm.toFixed(2).replace('.', ','));
      if (g.avgHr) setHr(String(g.avgHr));
      setTrack(g.points);
      setSource('gpx');
      setMsg(`File letto: ${g.distanceKm.toFixed(2).replace('.', ',')} km in ${formatDuration(g.durationSec)}.`);
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  const isTest = session?.type === 'test';
  const testKind: TestKind = state?.phase === 'sviluppo' ? 'cooper' : 'continuo';
  const durSec = parseDuration(duration);
  const kmNum = km ? Number(km.replace(',', '.')) : undefined;
  const pace = durSec && kmNum ? durSec / kmNum : undefined;
  const valid = !!durSec && (!km || (kmNum !== undefined && kmNum > 0 && kmNum < 200));

  const save = async () => {
    if (!durSec) return;
    setBusy(true);
    const run: Run = {
      date: new Date(when).toISOString(),
      sessionId: session?.id,
      sessionType: session?.type,
      durationSec: durSec,
      ...(kmNum ? { distanceKm: kmNum } : {}),
      ...(hr ? { avgHr: Number(hr) } : {}),
      rpe,
      pain,
      ...(pain && zone ? { painZone: zone } : {}),
      ...(shoeId !== undefined && shoeId >= 0 && session?.type !== 'rinforzo' ? { shoeId } : {}),
      source,
      ...(track ? { track } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };
    if (editing) {
      await updateRun({ ...run, id: editing.id, sessionId: editing.sessionId, sessionType: editing.sessionType });
      nav(-1);
      return;
    }
    const tv = Number(testValue.replace(',', '.'));
    const test = isTest && tv > 0 ? { date: run.date, kind: testKind, value: tv } : undefined;
    const r = await saveRun(run, test);
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignora */
    }
    const painMsg = pain === 2 ? ' Hai segnalato dolore: riposa e, se non passa in qualche giorno, senti un medico o un fisioterapista.' : '';
    nav('/', { replace: true, state: { msg: `Corsa salvata!${r.message ? ' ' + r.message : ''}${painMsg}` } });
  };

  return (
    <div className="stack">
      <TopBar title={editing ? 'Correggi corsa' : session ? (session.type === 'rinforzo' ? 'Rinforzo fatto' : 'Com’è andata?') : 'Registra corsa'} />
      {session && (
        <div className="card flat small">
          <strong>{session.title}</strong> · {session.summary}
        </div>
      )}

      {session?.type !== 'rinforzo' && (
        <div className="card info">
          <div className="row spread">
            <span className="small">
              <strong>Hai registrato con un’altra app?</strong>
              <br />
              Importa il file GPX (Open GPX Tracker, Strava, Garmin…).
            </span>
            <button className="btn secondary small" onClick={() => gpxInput.current?.click()}>
              <Icon name="file" /> GPX
            </button>
          </div>
          <input ref={gpxInput} type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml" hidden onChange={(e) => e.target.files?.[0] && importGpx(e.target.files[0])} />
        </div>
      )}
      {msg && <div className="card warn small" role="status">{msg}</div>}

      <label className="field">
        <span>Quando</span>
        <input className="input" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
      </label>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <label className="field grow">
          <span>Durata (min:sec)</span>
          <input className="input" inputMode="numeric" placeholder="30:00" value={duration} onChange={(e) => setDuration(e.target.value)} />
        </label>
        {session?.type !== 'rinforzo' && (
          <label className="field grow">
            <span>Distanza (km)</span>
            <input className="input" inputMode="decimal" placeholder="facoltativa" value={km} onChange={(e) => setKm(e.target.value)} />
          </label>
        )}
      </div>
      {pace && pace >= 120 && pace < 1800 && <div className="small muted">Passo medio: {formatPace(pace)} al km</div>}

      {isTest && !editing && (
        <label className="field card warn">
          <span>{testKind === 'cooper' ? 'Test: quanti metri hai percorso in 12 minuti?' : 'Test: quanti minuti hai corso senza fermarti?'}</span>
          <input className="input" inputMode="numeric" value={testValue} onChange={(e) => setTestValue(e.target.value)} placeholder={testKind === 'cooper' ? 'es. 2200' : 'es. 18'} />
          <span className="tiny muted">
            {testKind === 'cooper' ? 'Se non hai il GPS, usa una pista (1 giro = 400 m) o un percorso di lunghezza nota.' : 'Il risultato può farti saltare avanti nel piano.'}
          </span>
        </label>
      )}

      {session?.type !== 'rinforzo' && (
        <details>
          <summary className="small">Battito medio (se hai un orologio o una fascia)</summary>
          <input className="input" inputMode="numeric" placeholder="es. 145" value={hr} onChange={(e) => setHr(e.target.value)} style={{ marginTop: 8 }} aria-label="Battito medio" />
        </details>
      )}

      <div className="field">
        <span>Quanto è stato faticoso? <strong className="num" style={{ fontSize: 22 }}>{rpe}</strong>/10</span>
        <input type="range" min={1} max={10} value={rpe} onChange={(e) => setRpe(Number(e.target.value))} aria-valuetext={`${rpe}: ${RPE_TEXT[rpe]}`} />
        <span className="small muted">{RPE_TEXT[rpe]}</span>
      </div>

      <div className="field">
        <span>Hai sentito dolore?</span>
        <Chips
          options={[
            { value: 0, label: 'No' },
            { value: 1, label: 'Un fastidio' },
            { value: 2, label: 'Sì, dolore' },
          ]}
          value={[pain]}
          onChange={([v]) => setPain(v as 0 | 1 | 2)}
        />
        {pain > 0 && (
          <>
            <span className="small">Dove?</span>
            <Chips options={ZONES.map((z) => ({ value: z.id, label: z.label }))} value={zone ? [zone] : []} onChange={([v]) => setZone(v)} />
            {pain === 2 && (
              <div className="card danger small">
                Il piano si alleggerirà. Se il dolore ti fa zoppicare, c’è anche a riposo o non passa in qualche giorno, fermati e senti un medico o un fisioterapista.
              </div>
            )}
          </>
        )}
      </div>

      {shoes && shoes.length > 0 && session?.type !== 'rinforzo' && (
        <label className="field">
          <span>Scarpe</span>
          <select className="input" value={shoeId !== undefined && shoeId >= 0 ? shoeId : ''} onChange={(e) => setShoeId(e.target.value ? Number(e.target.value) : -1)}>
            <option value="">—</option>
            {shoes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="field">
        <span>Note (facoltative)</span>
        <textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>

      <button className="btn block green" disabled={!valid || busy} onClick={save}>
        <Icon name="check" /> Salva
      </button>
      {!valid && duration && <span className="small muted">Scrivi la durata come 30:00 (minuti:secondi).</span>}
    </div>
  );
}

