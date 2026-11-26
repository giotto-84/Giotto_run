import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { today } from '../db/actions';
import { addDays, parseIso, WEEKDAYS_SHORT } from '../logic/dates';
import { generateWeek, LADDER, maxWeeklyMin, sessionMinutes } from '../logic/generator';
import { formatPace, humanDuration, kmh, trainingPaces } from '../logic/paces';
import { raceFeasibility, rungText } from '../logic/progression';
import { TopBar, formatDate } from '../components/ui';
import { SessionRow } from '../components/SessionBits';
import type { PlanState } from '../types';

const GOAL_TEXT = {
  inizia: 'Iniziare a correre: 30 minuti senza fermarsi',
  '5k': 'Correre 5 km',
  '10k': 'Correre 10 km',
  tempo: 'Migliorare il tempo',
  forma: 'Forma e dimagrimento',
};

export function PlanScreen() {
  const profile = useLiveQuery(() => db.profile.get('me'), []);
  const st = useLiveQuery(() => db.state.get('me'), []);
  const weeks = useLiveQuery(() => db.weeks.orderBy('index').reverse().toArray(), []);
  if (!profile || !st || !weeks?.length) return null;
  const t = today();
  const cur = weeks[0];
  const past = weeks.slice(1);
  const feas = raceFeasibility(profile, st, t);
  const treadmill = profile.surfaces.includes('tapis');

  // anteprima: come sarà la prossima settimana se questa va bene
  const projected: PlanState =
    st.phase === 'base'
      ? { ...st, ladder: cur.kind === 'scarico' ? st.ladder : Math.min(LADDER.length - 1, st.ladder + 1) }
      : { ...st, weeklyMin: cur.kind === 'scarico' ? st.weeklyMin : Math.min(maxWeeklyMin(profile), Math.round(st.weeklyMin * 1.1)), quality: st.quality + 1 };
  const preview = generateWeek(profile, projected, cur.index + 1, addDays(cur.start, 7));

  return (
    <div className="stack">
      <TopBar title="Il piano" back={false} />
      <div className="card">
        <span className="label">Obiettivo</span>
        <div style={{ fontWeight: 700, fontSize: 19 }}>
          {GOAL_TEXT[profile.goal]}
          {profile.goal === 'tempo' && profile.targetKm ? ` sui ${profile.targetKm} km` : ''}
        </div>
        {profile.raceDate && (
          <div className="small">
            Gara: {formatDate(profile.raceDate, { weekday: 'long', day: 'numeric', month: 'long' })}
            {feas && <div className={`card ${feas.ok ? 'ok' : 'warn'} small`} style={{ marginTop: 8 }}>{feas.message}</div>}
          </div>
        )}
      </div>

      <section className="stack tight">
        <div className="row spread">
          <h2>Settimana {cur.index + 1}</h2>
          <span className="small muted">
            {formatDate(cur.start)} – {formatDate(addDays(cur.start, 6))}
          </span>
        </div>
        {cur.kind === 'scarico' && <div className="card info small">Settimana di scarico: si corre un po’ meno per assorbire il lavoro fatto, e c’è il test.</div>}
        {cur.kind === 'gara' && <div className="card warn small">Settimana della gara: poche uscite brevi e il giorno prima riposo.</div>}
        {cur.sessions.map((s) => (
          <SessionRow key={s.id} s={s} today={t} />
        ))}
        {!cur.sessions.length && <p className="muted">Nessuna uscita questa settimana.</p>}
      </section>

      {st.phase === 'base' ? (
        <section className="card">
          <h3>La scala: da 30 secondi a 30 minuti</h3>
          <p className="small muted">Ogni settimana completata bene sali di un gradino. Se è troppo faticosa la ripeti; se senti dolore, scendi di uno.</p>
          <ol className="steps">
            {LADDER.map((r, i) => (
              <li key={i} style={i === st.ladder ? { fontWeight: 700 } : { opacity: i < st.ladder ? 0.55 : 1 }}>
                <span className="k" style={{ background: i < st.ladder ? 'var(--field)' : i === st.ladder ? 'var(--track)' : 'var(--line)' }} />
                <span>
                  {rungText(r)}
                  {i === st.ladder && <span className="tag track" style={{ marginLeft: 8 }}>sei qui</span>}
                </span>
                <span className="num" style={{ fontSize: 18 }}>{i + 1}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <section className="card">
          <h3>I tuoi numeri</h3>
          <p className="small">
            Volume di riferimento: <strong>{st.weeklyMin} minuti</strong> di corsa a settimana (massimo per il tuo obiettivo: {maxWeeklyMin(profile)}).
          </p>
          {st.pace5kSec ? (
            <PaceTable pace5k={st.pace5kSec} treadmill={treadmill} />
          ) : (
            <p className="small muted">
              Non conosco ancora il tuo ritmo: per ora usa lo sforzo (corsa facile = riesci a parlare). Il test della 4ª settimana calcolerà i tuoi ritmi.
            </p>
          )}
        </section>
      )}

      {preview.sessions.length > 0 && cur.kind !== 'gara' && (
        <section className="stack tight">
          <h2>Anteprima settimana {cur.index + 2}</h2>
          <p className="small muted">Se questa settimana va bene. Il piano definitivo si crea lunedì, in base a come è andata.</p>
          {preview.sessions.map((s) => (
            <div key={s.id} className="session" style={{ opacity: 0.85 }}>
              <div className="date">
                <span>{WEEKDAYS_SHORT[parseIso(s.date).getDay()]}</span>
                <b>{parseIso(s.date).getDate()}</b>
              </div>
              <div className={`bar ${s.hard ? 'hard' : 'easy'}`} />
              <div className="grow">
                <strong>{s.title}</strong>
                <span className="small muted">{s.type === 'rinforzo' ? 'cammino + rinforzo' : `${sessionMinutes(s)} min · ${s.summary}`}</span>
              </div>
            </div>
          ))}
        </section>
      )}

      {past.length > 0 && (
        <section className="stack tight">
          <h2>Settimane passate</h2>
          {past.map((w) => (
            <div key={w.index} className="card flat small">
              <div className="row spread">
                <strong>Settimana {w.index + 1}</strong>
                <span className="muted">
                  {w.sessions.filter((s) => s.status === 'fatta').length}/{w.sessions.length} fatte
                </span>
              </div>
              {w.review && <div className="muted">{w.review.message}</div>}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function PaceTable({ pace5k, treadmill }: { pace5k: number; treadmill: boolean }) {
  const p = trainingPaces(pace5k);
  const rows: [string, [number, number]][] = [
    ['Corsa facile', p.facile],
    ['Lungo', p.lungo],
    ['Ritmo medio', p.medio],
    ['Fartlek', p.fartlek],
    ['Ripetute', p.ripetute],
  ];
  return (
    <table style={{ width: '100%' }} className="small">
      <thead>
        <tr>
          <th>Ritmo</th>
          <th style={{ textAlign: 'right' }}>min/km</th>
          {treadmill && <th style={{ textAlign: 'right' }}>km/h</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map(([name, [a, b]]) => (
          <tr key={name}>
            <td>{name}</td>
            <td style={{ textAlign: 'right' }} className="num">
              {formatPace(a)}–{formatPace(b)}
            </td>
            {treadmill && (
              <td style={{ textAlign: 'right' }} className="num">
                {kmh(b)}–{kmh(a)}
              </td>
            )}
          </tr>
        ))}
      </tbody>
      <caption className="tiny muted" style={{ captionSide: 'bottom', textAlign: 'left', paddingTop: 6 }}>
        Calcolati dal tuo passo sui 5 km ({formatPace(pace5k)}/km, cioè 5 km in {humanDuration(Math.round(pace5k * 5))}).
      </caption>
    </table>
  );
}
