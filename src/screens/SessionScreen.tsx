import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { deleteRun, findSession, moveSessionTo, skipSession, today } from '../db/actions';
import { addDays, parseIso, WEEKDAYS_LONG, WEEKDAYS_SHORT } from '../logic/dates';
import { sessionMinutes } from '../logic/generator';
import { formatDuration, formatPace } from '../logic/paces';
import { runPace } from '../logic/stats';
import { DRILLS, getExercise, STRETCH, strengthCircuit, WARMUP } from '../data/exercises';
import { Icon, Sheet, Thumb, TopBar, formatDate, fmt, useToast } from '../components/ui';
import { SegBar, SegLegend, StepList, typeTag } from '../components/SessionBits';

const WHY: Record<string, string> = {
  corsacammino: 'Alternare corsa e cammino abitua cuore, muscoli e tendini un passo alla volta. Corri piano: devi poter parlare.',
  facile: 'La corsa facile costruisce la resistenza. Deve sembrarti “troppo facile”: è giusto così.',
  lungo: 'Il lungo insegna al corpo a durare. Ritmo tranquillo, puoi anche fare brevi pause per bere.',
  ripetute: 'Tratti veloci con recupero: migliorano la velocità. Veloce ma controllato, non uno scatto.',
  fartlek: '“Gioco di velocità” in svedese: cambi di ritmo liberi e divertenti dentro una corsa facile.',
  medio: 'Un ritmo impegnativo ma costante, da tenere a lungo: alza la soglia della fatica.',
  allunghi: 'Una corsa facile con qualche breve accelerazione per abituare le gambe a girare più veloci.',
  test: 'Il test misura i progressi e aggiorna il piano. Fallo riposato, dopo un buon riscaldamento.',
  gara: 'È il tuo giorno! Parti più piano di quanto vorresti, aumenta solo nell’ultimo terzo.',
  rinforzo: 'Oggi niente corsa: cammino veloce e un circuito di rinforzo per glutei, polpacci e busto.',
};

export function SessionScreen() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const [moveOpen, setMoveOpen] = useState(false);
  const [toast, showToast] = useToast();
  const found = useLiveQuery(() => findSession(id), [id]);
  const profile = useLiveQuery(() => db.profile.get('me'), []);
  const st = useLiveQuery(() => db.state.get('me'), []);
  const run = useLiveQuery(async () => {
    const f = await findSession(id);
    return f?.session.runId ? db.runs.get(f.session.runId) : undefined;
  }, [id]);
  if (found === undefined || !profile) return null;
  if (!found) {
    return (
      <div className="stack">
        <TopBar title="Seduta" />
        <p>Questa seduta non esiste più (il piano è stato aggiornato).</p>
        <Link className="btn" to="/piano">Vai al piano</Link>
      </div>
    );
  }
  const { session: s, week } = found;
  const t = today();
  const treadmill = profile.surfaces.includes('tapis');
  const drills = s.extras.includes('andature') || s.steps.some((x) => x.kind === 'andature');
  const advanced = (st?.phase === 'sviluppo') || (st?.ladder ?? 0) >= 6;
  const isCurrentWeek = t >= week.start && t <= addDays(week.start, 6);

  const freeDays = Array.from({ length: 7 }, (_, i) => addDays(week.start, i)).filter(
    (date) => date >= t && date !== s.date && !week.sessions.some((x) => x.date === date && x.status !== 'saltata'),
  );

  return (
    <div className="stack">
      <TopBar title={s.title} />
      <div className="row wrap">
        <span className={`tag ${typeTag(s.type)}`}>{formatDate(s.date, { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        {s.type !== 'rinforzo' && <span className="tag">{sessionMinutes(s)} min</span>}
        {s.hard && <span className="tag track">impegnativa</span>}
        {s.status === 'fatta' && <span className="tag green">fatta ✓</span>}
        {s.status === 'saltata' && <span className="tag">saltata</span>}
      </div>
      <p style={{ fontWeight: 600, fontSize: 19, margin: 0 }}>{s.summary}</p>
      <p className="small muted">{WHY[s.type]}</p>

      {s.status === 'fatta' && run && (
        <div className="card ok">
          <strong>Com’è andata</strong>
          <div className="small">
            {formatDuration(run.durationSec)}
            {run.distanceKm ? ` · ${fmt(run.distanceKm, 2)} km · ${formatPace(runPace(run) ?? 0)}/km` : ''} · sforzo {run.rpe}/10
            {run.pain ? ` · ${run.pain === 2 ? 'dolore' : 'fastidio'}` : ''}
          </div>
          <button
            className="linkbtn small"
            onClick={async () => {
              if (confirm('Cancellare la corsa registrata? La seduta tornerà da fare.')) await deleteRun(run.id!);
            }}
          >
            Cancella la registrazione
          </button>
        </div>
      )}

      {s.type !== 'rinforzo' && (
        <section className="card">
          <h3>Programma</h3>
          <SegBar steps={s.steps} />
          <div style={{ margin: '6px 0 4px' }}>
            <SegLegend />
          </div>
          <StepList steps={s.steps} treadmill={treadmill} />
        </section>
      )}

      {s.status !== 'fatta' && (
        <div className="stack tight">
          {s.type !== 'rinforzo' && (
            <Link className="btn block" to={`/corsa/${s.id}`}>
              <Icon name="play" /> Inizia allenamento guidato
            </Link>
          )}
          <Link className="btn secondary block" to={`/registra?seduta=${s.id}`}>
            {s.type === 'rinforzo' ? 'Segna come fatto' : 'L’ho fatto: registralo a mano'}
          </Link>
          {isCurrentWeek && (
            <div className="row">
              <button className="btn ghost small grow" onClick={() => setMoveOpen(true)} disabled={!freeDays.length}>
                Sposta
              </button>
              {s.status === 'saltata' ? (
                <button className="btn ghost small grow" onClick={() => skipSession(s.id, true)}>
                  Rimetti in programma
                </button>
              ) : (
                <button
                  className="btn ghost small grow"
                  onClick={async () => {
                    await skipSession(s.id);
                    nav(-1);
                  }}
                >
                  Salta
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <section className="card">
        <h3>Prima di correre: riscaldamento</h3>
        <p className="small muted">5 minuti di cammino veloce (sono già nel programma), poi questi esercizi.</p>
        <ExList ids={WARMUP} />
      </section>

      {drills && (
        <section className="card">
          <h3>Andature</h3>
          <p className="small muted">Dopo il riscaldamento, su un tratto piano: ogni esercizio 2 volte per 20 metri, ritorno camminando.</p>
          <ExList ids={DRILLS} />
        </section>
      )}

      {s.extras.includes('rinforzo') && (
        <section className="card">
          <h3>Rinforzo · 15 minuti</h3>
          <p className="small muted">Dopo la corsa (o a casa in serata). Fai 2 giri del circuito, 1 minuto di pausa tra un giro e l’altro.</p>
          <ExList ids={strengthCircuit(advanced)} />
        </section>
      )}

      {s.extras.includes('stretching') && (
        <section className="card">
          <h3>Alla fine: stretching</h3>
          <ExList ids={STRETCH} />
        </section>
      )}

      <Sheet open={moveOpen} onClose={() => setMoveOpen(false)} label="Sposta a…">
        <p className="small muted">Puoi spostarla in un giorno libero di questa settimana.</p>
        <div className="stack tight">
          {freeDays.map((date) => (
            <button
              key={date}
              className="btn secondary block"
              onClick={async () => {
                const r = await moveSessionTo(s.id, date);
                setMoveOpen(false);
                showToast(r.error ?? r.warning ?? `Spostata a ${WEEKDAYS_LONG[parseIso(date).getDay()]}.`);
              }}
            >
              {WEEKDAYS_SHORT[parseIso(date).getDay()]} {parseIso(date).getDate()}
              {date === t ? ' · oggi' : ''}
            </button>
          ))}
        </div>
      </Sheet>
      {toast}
    </div>
  );
}

function ExList({ ids }: { ids: string[] }) {
  return (
    <div>
      {ids.map((id) => {
        const ex = getExercise(id);
        return (
          <Link key={id} to={`/guida/${id}`} className="exrow">
            <Thumb ex={ex} />
            <div className="grow">
              <strong style={{ display: 'block' }}>{ex.name}</strong>
              <span className="small muted">{ex.dose}</span>
            </div>
            <Icon name="info" />
          </Link>
        );
      })}
    </div>
  );
}
