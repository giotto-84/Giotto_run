import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../db/db';
import { refreshCurrentWeek, startPlan, today } from '../db/actions';
import { importBackup } from '../db/backup';
import { Chips, Choice, Stepper } from '../components/ui';
import { fromGiottoPtBackup, parqQuestionsFor, parqRisk, ZONES } from '../logic/parq';
import { WEEK_ORDER, WEEKDAYS_SHORT } from '../logic/dates';
import { initialState } from '../logic/generator';
import { raceFeasibility } from '../logic/progression';
import { formatDuration, parseDuration } from '../logic/paces';
import type { Goal, Level, Profile, Surface } from '../types';

const EMPTY: Profile = {
  id: 'me',
  name: '',
  age: 35,
  sex: 'M',
  heightCm: 172,
  weightKg: 72,
  parq: {},
  medicalClearance: false,
  injuries: [],
  level: 'cammina',
  continuousMin: 0,
  weeklyKm: 0,
  goal: 'inizia',
  daysPerWeek: 3,
  trainingDays: [2, 4, 6],
  minutesPerSession: 40,
  surfaces: ['strada', 'parco'],
  reminderTime: '18:30',
  createdAt: '',
};

const STEPS = ['Ciao', 'Chi sei', 'Salute', 'Da dove parti', 'Obiettivo', 'Tempo', 'Dove corri', 'Riepilogo'];

const LEVELS: { id: Level; title: string; text: string }[] = [
  { id: 'sedentario', title: 'Non faccio attività', text: 'Parto da zero: cammino poco o niente.' },
  { id: 'cammina', title: 'Cammino con regolarità', text: 'Faccio passeggiate a passo svelto, ma non corro.' },
  { id: 'corre', title: 'Corro già', text: 'Anche poco o con qualche pausa.' },
];

const GOALS: { id: Goal; title: string; text: string }[] = [
  { id: 'inizia', title: 'Iniziare a correre', text: 'Arrivare a correre 30 minuti senza fermarmi.' },
  { id: '5k', title: 'Correre 5 km', text: 'Completare i 5 km, magari a una gara.' },
  { id: '10k', title: 'Correre 10 km', text: 'Per chi corre già almeno 20–30 minuti o è disposto ad aspettare qualche settimana in più.' },
  { id: 'tempo', title: 'Migliorare il tempo', text: 'Correre più veloce sui 5 o sui 10 km.' },
  { id: 'forma', title: 'Forma e dimagrimento', text: 'Correre con regolarità per stare bene e perdere peso.' },
];

const SURFACES: { value: Surface; label: string }[] = [
  { value: 'strada', label: 'Strada / marciapiede' },
  { value: 'parco', label: 'Parco / sterrato' },
  { value: 'tapis', label: 'Tapis roulant' },
  { value: 'pista', label: 'Pista di atletica' },
];

export function Onboarding() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const editing = params.has('modifica');
  const [p, setP] = useState<Profile>(EMPTY);
  const [step, setStep] = useState(editing ? 1 : 0);
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [time5k, setTime5k] = useState('');
  const ptInput = useRef<HTMLInputElement>(null);
  const backupInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    db.profile.get('me').then((existing) => {
      if (existing) {
        setP(existing);
        if (existing.recent5kSec) setTime5k(formatDuration(existing.recent5kSec));
        if (parqRisk(existing) && !existing.medicalClearance) {
          setBlocked(true);
          setStep(2);
        }
      }
    });
  }, []);

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((prev) => ({ ...prev, [k]: v }));
  const parqQs = parqQuestionsFor(p.sex);
  const parqAnswered = parqQs.every((q) => q.id in p.parq);
  const risk = parqQs.some((q) => p.parq[q.id]);
  const t = today();
  const feas = p.raceDate ? raceFeasibility(p, initialState(p), t) : null;

  const canNext = (() => {
    switch (step) {
      case 0:
        return p.name.trim().length > 0;
      case 1:
        return p.age >= 14 && p.age <= 99 && p.heightCm > 100;
      case 2:
        return parqAnswered;
      case 4:
        return p.goal !== 'tempo' || !!p.targetKm;
      case 5:
        return p.trainingDays.length >= 2;
      case 6:
        return p.surfaces.length > 0;
      default:
        return true;
    }
  })();

  const next = async () => {
    if (step === 2 && risk && !p.medicalClearance) {
      await db.profile.put({ ...p, createdAt: p.createdAt || new Date().toISOString() });
      setBlocked(true);
      return;
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
    window.scrollTo(0, 0);
  };

  const importPt = async (file: File) => {
    try {
      const data = fromGiottoPtBackup(JSON.parse(await file.text()));
      setP((prev) => ({ ...prev, ...data }));
      setMsg('Dati importati da Giotto PT: controlla che siano giusti.');
      setStep(1);
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  const restore = async (file: File) => {
    try {
      await importBackup(JSON.parse(await file.text()));
      nav('/', { replace: true });
    } catch (e) {
      setMsg((e as Error).message);
    }
  };

  const finish = async () => {
    setBusy(true);
    const profile: Profile = {
      ...p,
      name: p.name.trim(),
      daysPerWeek: p.trainingDays.length,
      recent5kSec: p.level === 'corre' ? parseDuration(time5k) : undefined,
      continuousMin: p.level === 'corre' ? p.continuousMin : 0,
      weeklyKm: p.level === 'corre' ? p.weeklyKm : 0,
      createdAt: p.createdAt || new Date().toISOString(),
    };
    if (editing) {
      const old = await db.profile.get('me');
      const goalChanged = !old || old.goal !== profile.goal || old.level !== profile.level || old.targetKm !== profile.targetKm;
      if (goalChanged) await startPlan(profile);
      else await refreshCurrentWeek(profile);
    } else {
      await startPlan(profile);
      if (profile.weightKg) await db.body.add({ date: new Date().toISOString(), weightKg: profile.weightKg });
    }
    nav('/', { replace: true });
  };

  if (blocked) {
    return (
      <div className="stack">
        <h1 style={{ fontSize: 36 }}>Prima di iniziare, parla con il tuo medico</h1>
        <div className="card danger">
          Hai risposto «sì» ad almeno una domanda sulla salute. Non significa che non puoi correre, ma un medico deve valutare
          quali attività sono sicure per te.
        </div>
        <div className="card flat">
          <h3>Cosa fare</h3>
          <ol className="howto">
            <li>Prenota una visita dal tuo medico di base o da un medico dello sport.</li>
            <li>Porta con te le risposte che hai dato (sono qui sotto).</li>
            <li>Chiedi un certificato per l’attività sportiva non agonistica, con eventuali limitazioni.</li>
          </ol>
        </div>
        <div className="card flat">
          <h3>Le tue risposte «sì»</h3>
          <ul className="small" style={{ paddingLeft: 20, margin: 0 }}>
            {parqQs.filter((q) => p.parq[q.id]).map((q) => (
              <li key={q.id}>{q.text}</li>
            ))}
          </ul>
        </div>
        <label className="choice" style={{ alignItems: 'center' }}>
          <input type="checkbox" checked={p.medicalClearance} onChange={(e) => set('medicalClearance', e.target.checked)} style={{ width: 26, height: 26, flex: 'none' }} />
          <span>Il mio medico mi ha dato il via libera per correre</span>
        </label>
        <button
          className="btn block"
          disabled={!p.medicalClearance}
          onClick={async () => {
            await db.profile.put(p);
            setBlocked(false);
            setStep(3);
          }}
        >
          Continua
        </button>
        <button
          className="btn ghost block"
          onClick={() => {
            setBlocked(false);
            setStep(2);
          }}
        >
          Rivedi le risposte
        </button>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="progress-dots" aria-label={`Passo ${step + 1} di ${STEPS.length}`}>
        {STEPS.map((s, i) => (
          <span key={s} className={i <= step ? 'on' : ''} />
        ))}
      </div>
      <div className="label">
        {step + 1} / {STEPS.length} · {STEPS[step]}
      </div>

      {step === 0 && (
        <>
          <div className="lanes" style={{ paddingTop: 26, paddingBottom: 26 }}>
            <div className="lane-no">1</div>
            <div className="eyebrow">Giotto Run</div>
            <h2 style={{ fontSize: 46 }}>Il tuo allenatore di corsa</h2>
            <p>Un piano su misura, allenamenti guidati a voce e i tuoi progressi. Tutto resta sul tuo telefono.</p>
          </div>
          <p>Ti faccio qualche domanda per preparare il piano giusto per te: servono circa 3 minuti.</p>
          <label className="field">
            <span>Come ti chiami?</span>
            <input className="input" value={p.name} onChange={(e) => set('name', e.target.value)} autoComplete="given-name" placeholder="Il tuo nome" />
          </label>
          <div className="card info">
            <strong>Usi già Giotto PT?</strong>
            <p className="small" style={{ marginTop: 4 }}>
              Puoi importare età, misure e questionario sulla salute dal file di backup di Giotto PT.
            </p>
            <button className="btn secondary small" onClick={() => ptInput.current?.click()}>
              Importa da Giotto PT
            </button>
            <input ref={ptInput} type="file" accept=".json,application/json" hidden onChange={(e) => e.target.files?.[0] && importPt(e.target.files[0])} />
          </div>
          <button className="linkbtn" onClick={() => backupInput.current?.click()}>
            Ho un backup di Giotto Run: ripristinalo
          </button>
          <input ref={backupInput} type="file" accept=".json,application/json" hidden onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} />
        </>
      )}

      {step === 1 && (
        <>
          <h2>Chi sei</h2>
          <label className="field">
            <span>Nome</span>
            <input className="input" value={p.name} onChange={(e) => set('name', e.target.value)} />
          </label>
          <div className="field">
            <span>Sesso</span>
            <Chips options={[{ value: 'M', label: 'Uomo' }, { value: 'F', label: 'Donna' }]} value={[p.sex]} onChange={([v]) => set('sex', v as Profile['sex'])} />
          </div>
          <div className="field">
            <span>Età</span>
            <Stepper value={p.age} onChange={(v) => set('age', v)} min={14} max={99} label="età" />
          </div>
          <div className="field">
            <span>Altezza (cm)</span>
            <Stepper value={p.heightCm} onChange={(v) => set('heightCm', v)} min={120} max={230} label="altezza" />
          </div>
          <div className="field">
            <span>Peso (kg) · facoltativo</span>
            <Stepper value={p.weightKg ?? 0} onChange={(v) => set('weightKg', v || undefined)} step={0.5} min={0} max={250} label="peso" />
            <span className="tiny muted">Serve solo per il grafico dei progressi. Lascia 0 se preferisci non indicarlo.</span>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h2>La tua salute</h2>
          <p className="small muted">
            È il questionario PAR-Q, usato in tutto il mondo prima di iniziare a fare sport. Rispondi con sincerità: serve a correre in sicurezza.
          </p>
          {parqQs.map((q, i) => (
            <div key={q.id} className="card flat">
              <p style={{ fontWeight: 600 }}>
                {i + 1}. {q.text}
              </p>
              <Chips
                label={q.text}
                options={[
                  { value: 'no', label: 'No' },
                  { value: 'si', label: 'Sì' },
                ]}
                value={q.id in p.parq ? [p.parq[q.id] ? 'si' : 'no'] : []}
                onChange={([v]) => set('parq', { ...p.parq, [q.id]: v === 'si' })}
              />
            </div>
          ))}
        </>
      )}

      {step === 3 && (
        <>
          <h2>Da dove parti</h2>
          <div className="stack tight">
            {LEVELS.map((l) => (
              <Choice key={l.id} on={p.level === l.id} onClick={() => set('level', l.id)} title={l.title} text={l.text} />
            ))}
          </div>
          {p.level === 'corre' && (
            <>
              <div className="field">
                <span>Quanti minuti riesci a correre senza fermarti?</span>
                <Stepper value={p.continuousMin} onChange={(v) => set('continuousMin', v)} step={5} min={0} max={180} label="minuti di corsa continua" />
              </div>
              <div className="field">
                <span>Quanti km corri in una settimana, circa?</span>
                <Stepper value={p.weeklyKm} onChange={(v) => set('weeklyKm', v)} step={5} min={0} max={150} label="km a settimana" />
              </div>
              <label className="field">
                <span>Tempo recente sui 5 km (facoltativo)</span>
                <input className="input" inputMode="numeric" placeholder="es. 28:30" value={time5k} onChange={(e) => setTime5k(e.target.value)} />
                <span className="tiny muted">Se non lo sai, lascia vuoto: lo scopriremo con il test della 4ª settimana.</span>
              </label>
            </>
          )}
          <div className="field">
            <span>Hai punti delicati? (facoltativo)</span>
            <Chips multi options={ZONES.map((z) => ({ value: z.id, label: z.label }))} value={p.injuries} onChange={(v) => set('injuries', v)} />
            {p.injuries.length > 0 && (
              <span className="small muted">Ti consiglierò superfici morbide e più esercizi di rinforzo. Se senti dolore durante la corsa, fermati.</span>
            )}
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <h2>Il tuo obiettivo</h2>
          <div className="stack tight">
            {GOALS.map((g) => (
              <Choice key={g.id} on={p.goal === g.id} onClick={() => set('goal', g.id)} title={g.title} text={g.text} />
            ))}
          </div>
          {p.goal === 'tempo' && (
            <div className="field">
              <span>Su quale distanza?</span>
              <Chips options={[{ value: 5, label: '5 km' }, { value: 10, label: '10 km' }]} value={p.targetKm ? [p.targetKm] : []} onChange={([v]) => set('targetKm', v as 5 | 10)} />
            </div>
          )}
          <div className="card flat stack tight">
            <strong>Hai una gara in programma? (facoltativo)</strong>
            <span className="small muted">Il piano si organizza all’indietro da quel giorno, con una settimana più leggera prima della gara.</span>
            <input className="input" type="date" min={t} value={p.raceDate ?? ''} onChange={(e) => set('raceDate', e.target.value || undefined)} aria-label="Data della gara" />
            {p.raceDate && (
              <button className="linkbtn" style={{ alignSelf: 'flex-start' }} onClick={() => set('raceDate', undefined)}>
                Nessuna gara
              </button>
            )}
            {feas && <div className={`card ${feas.ok ? 'ok' : 'warn'} small`}>{feas.message}</div>}
          </div>
        </>
      )}

      {step === 5 && (
        <>
          <h2>Il tuo tempo</h2>
          <div className="field">
            <span>In quali giorni puoi correre?</span>
            <Chips
              multi
              options={WEEK_ORDER.map((d) => ({ value: d, label: WEEKDAYS_SHORT[d] }))}
              value={p.trainingDays}
              onChange={(v) => set('trainingDays', v.slice(0, 5))}
            />
            <span className="small muted">
              Da 2 a 5 giorni. Per iniziare ne bastano <strong>3, non consecutivi</strong>. Il lungo cade sempre nell’ultimo giorno della settimana che scegli.
            </span>
            {p.trainingDays.length > 5 && <span className="small">Massimo 5 giorni: il riposo è importante.</span>}
          </div>
          <div className="field">
            <span>Quanti minuti hai per ogni uscita?</span>
            <Stepper value={p.minutesPerSession} onChange={(v) => set('minutesPerSession', v)} step={5} min={20} max={120} label="minuti per uscita" />
            <span className="tiny muted">Compresi riscaldamento e defaticamento. {p.goal === '10k' && p.minutesPerSession < 60 ? 'Per i 10 km sarebbe meglio avere almeno 60 minuti in un giorno.' : ''}</span>
          </div>
          <label className="field">
            <span>A che ora vuoi il promemoria?</span>
            <input className="input" type="time" value={p.reminderTime} onChange={(e) => set('reminderTime', e.target.value)} />
          </label>
        </>
      )}

      {step === 6 && (
        <>
          <h2>Dove corri</h2>
          <Chips multi options={SURFACES} value={p.surfaces} onChange={(v) => set('surfaces', v)} />
          {p.surfaces.includes('tapis') && <div className="card info small">Sul tapis roulant imposta la pendenza all’1%. Nel piano trovi i ritmi anche in km/h.</div>}
          {p.injuries.length > 0 && !p.surfaces.includes('parco') && (
            <div className="card warn small">Con qualche punto delicato, quando puoi preferisci parco e sterrato: sono più morbidi dell’asfalto.</div>
          )}
        </>
      )}

      {step === 7 && <Summary p={p} />}

      {msg && <div className="card info small" role="status">{msg}</div>}

      <div className="row" style={{ marginTop: 8 }}>
        {step > (editing ? 1 : 0) && (
          <button className="btn secondary" onClick={() => setStep((s) => s - 1)}>
            Indietro
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button className="btn grow" disabled={!canNext} onClick={next}>
            Avanti
          </button>
        ) : (
          <button className="btn grow" disabled={busy} onClick={finish}>
            {editing ? 'Aggiorna il piano' : 'Crea il mio piano'}
          </button>
        )}
      </div>
      {editing && (
        <button className="linkbtn" onClick={() => nav(-1)}>
          Annulla
        </button>
      )}
    </div>
  );
}

function Summary({ p }: { p: Profile }) {
  const goal = GOALS.find((g) => g.id === p.goal)!;
  const st = initialState(p);
  return (
    <>
      <h2>Riepilogo</h2>
      <div className="card stack tight">
        <div>
          <span className="label">Obiettivo</span>
          <div style={{ fontWeight: 700 }}>
            {goal.title}
            {p.goal === 'tempo' && p.targetKm ? ` sui ${p.targetKm} km` : ''}
            {p.raceDate ? ` · gara il ${new Date(p.raceDate + 'T12:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}
          </div>
        </div>
        <div>
          <span className="label">Giorni</span>
          <div>
            {WEEK_ORDER.filter((d) => p.trainingDays.includes(d))
              .map((d) => WEEKDAYS_SHORT[d])
              .join(', ')}{' '}
            · fino a {p.minutesPerSession} minuti
          </div>
        </div>
        <div>
          <span className="label">Si parte con</span>
          <div>
            {st.phase === 'base'
              ? 'Corsa alternata al cammino: tratti brevi di corsa che si allungano ogni settimana.'
              : 'Corse facili, un lungo e, dopo due settimane, lavori di ritmo.'}
          </div>
        </div>
      </div>
      <div className="card flat small">
        <strong>Come funziona</strong>
        <ul style={{ paddingLeft: 20, margin: '6px 0 0' }}>
          <li>Dopo ogni corsa mi dici com’è andata (fatica e dolori).</li>
          <li>A fine settimana il piano decide da solo: avanza, ripete o alleggerisce.</li>
          <li>Ogni 4 settimane: settimana più leggera con un test per misurare i progressi.</li>
        </ul>
      </div>
    </>
  );
}
