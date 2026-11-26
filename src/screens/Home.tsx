import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, currentWeek } from '../db/db';
import { ensureCurrentWeek, moveSessionTo, skipSession, today } from '../db/actions';
import { addDays, daysBetween, parseIso, WEEK_ORDER, WEEKDAYS_LONG, WEEKDAYS_SHORT } from '../logic/dates';
import { sessionMinutes } from '../logic/generator';
import { missedSessions, rungText } from '../logic/progression';
import { loadJump, shoeKm, SHOE_LIMIT_KM, weeklyKm } from '../logic/stats';
import { LADDER } from '../logic/generator';
import { Icon, fmt, useToast } from '../components/ui';
import { SegBar } from '../components/SessionBits';
import { safeStorage } from '../device';
import type { ReviewResult, Session } from '../types';

export function Home() {
  const nav = useNavigate();
  const loc = useLocation();
  const [toast, showToast] = useToast();
  const [review, setReview] = useState<ReviewResult | undefined>();
  const [dismissed, setDismissed] = useState(false);
  const t = today();
  const profile = useLiveQuery(() => db.profile.get('me'), []);
  const st = useLiveQuery(() => db.state.get('me'), []);
  const week = useLiveQuery(() => currentWeek(), []);
  const prevWeek = useLiveQuery(async () => {
    const w = await currentWeek();
    return w && w.index > 0 ? db.weeks.get(w.index - 1) : undefined;
  }, []);
  const runs = useLiveQuery(() => db.runs.toArray(), []);
  const shoes = useLiveQuery(() => db.shoes.toArray(), []);

  useEffect(() => {
    ensureCurrentWeek().then((r) => r && setReview(r));
  }, []);

  useEffect(() => {
    const msg = (loc.state as { msg?: string } | null)?.msg;
    if (msg) {
      showToast(msg);
      nav('.', { replace: true, state: null });
    }
  }, [loc.state, nav, showToast]);

  if (!profile || !week || !st || !runs) return null;

  const store = safeStorage();
  const lastReview = review ?? prevWeek?.review;
  const reviewKey = `review-seen-${week.index}`;
  const showReview = lastReview && !dismissed && !store.get(reviewKey);

  const todays = week.sessions.find((s) => s.date === t);
  const upcoming = week.sessions.find((s) => s.date > t && s.status === 'da_fare');
  const missed = missedSessions(week, t);
  const weeks = weeklyKm(runs, t, 5);
  const kmWeek = weeks[weeks.length - 1].km;
  const jump = loadJump(weeks);
  const doneCount = week.sessions.filter((s) => s.status === 'fatta').length;
  const raceIn = profile.raceDate ? daysBetween(t, profile.raceDate) : undefined;
  const worn = (shoes ?? []).filter((s) => !s.retired && shoeKm(s, runs) >= SHOE_LIMIT_KM);
  const beforeStart = t < week.start;

  const recover = async (s: Session) => {
    const r = await moveSessionTo(s.id, t);
    showToast(r.error ?? r.warning ?? 'Spostata a oggi.');
  };

  return (
    <div className="stack">
      <header className="row spread" style={{ minHeight: 52 }}>
        <div>
          <div className="label">{new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <h1 style={{ fontSize: 40 }}>Ciao {profile.name}</h1>
        </div>
        {raceIn !== undefined && raceIn >= 0 && (
          <div className="tag yellow" title="Giorni alla gara">
            🏁 {raceIn === 0 ? 'Gara oggi!' : raceIn === 1 ? 'Gara domani' : `Gara tra ${raceIn} giorni`}
          </div>
        )}
      </header>

      {showReview && lastReview && (
        <div className={`card ${lastReview.action === 'avanza' ? 'ok' : lastReview.action === 'riduci' ? 'danger' : 'warn'}`} role="status">
          <div className="row spread">
            <strong>Bilancio della settimana · {lastReview.done}/{lastReview.planned} uscite</strong>
            <button className="linkbtn" onClick={() => {
                store.set(reviewKey, '1');
                setReview(undefined);
                setDismissed(true);
              }}>
              Ok
            </button>
          </div>
          <p className="small" style={{ margin: '4px 0 0' }}>{lastReview.message}</p>
        </div>
      )}

      {st.goalReached && profile.goal === 'inizia' && (
        <div className="card ok">
          <strong>🎉 Obiettivo raggiunto: corri 30 minuti!</strong>
          <p className="small" style={{ margin: '4px 0 8px' }}>Il piano continua per mantenerti in forma. Vuoi puntare ai 5 km?</p>
          <Link className="btn green small" to="/benvenuto?modifica">
            Scegli un nuovo obiettivo
          </Link>
        </div>
      )}

      <TodayCard session={todays} upcoming={upcoming} beforeStart={beforeStart} weekStart={week.start} />

      {missed.length > 0 && !todays && (
        <div className="card warn">
          <strong>Hai saltato {missed.length === 1 ? 'un allenamento' : `${missed.length} allenamenti`}</strong>
          <p className="small" style={{ margin: '4px 0 8px' }}>
            {missed[missed.length - 1].title} di {WEEKDAYS_LONG[parseIso(missed[missed.length - 1].date).getDay()]}. Puoi recuperarlo oggi, oppure lasciarlo perdere: il
            piano si adatta.
          </p>
          <div className="row wrap">
            <button className="btn small" onClick={() => recover(missed[missed.length - 1])}>
              Recupera oggi
            </button>
            <button className="btn secondary small" onClick={() => Promise.all(missed.map((m) => skipSession(m.id)))}>
              Lascia perdere
            </button>
          </div>
        </div>
      )}

      <section className="stack tight">
        <div className="row spread">
          <h2>Questa settimana</h2>
          <span className="tag">{week.kind === 'scarico' ? 'Scarico + test' : week.kind === 'gara' ? 'Settimana gara' : `Settimana ${week.index + 1}`}</span>
        </div>
        <WeekStrip sessions={week.sessions} start={week.start} today={t} />
        <div className="tiles">
          <div className="tile">
            <div className="v">{doneCount}/{week.sessions.filter((s) => s.type !== 'rinforzo').length}</div>
            <div className="l">uscite</div>
          </div>
          <div className="tile">
            <div className="v">{fmt(kmWeek)}</div>
            <div className="l">km corsi</div>
          </div>
          <div className="tile">
            <div className="v">{st.phase === 'base' ? `${st.ladder + 1}/${LADDER.length}` : `${st.weeklyMin}′`}</div>
            <div className="l">{st.phase === 'base' ? 'gradino' : 'min/sett.'}</div>
          </div>
        </div>
        {st.phase === 'base' && <p className="small muted">Gradino attuale: {rungText(LADDER[st.ladder])}.</p>}
      </section>

      {week.test && (
        <div className="card info">
          <strong>Controllo delle 4 settimane</strong>
          <p className="small" style={{ margin: '4px 0 8px' }}>
            Settimana più leggera con un test per misurare i progressi. Se vuoi, registra anche il peso.
          </p>
          <Link className="btn secondary small" to="/progressi#peso">
            Vai ai progressi
          </Link>
        </div>
      )}

      {jump !== undefined && jump > 0.3 && (
        <div className="card warn small">
          Questa settimana hai già corso il {Math.round(jump * 100)}% in più della media delle ultime 3. Attenzione: aumentare troppo in fretta è la prima causa di infortuni.
        </div>
      )}
      {worn.map((s) => (
        <div key={s.id} className="card warn small">
          Le scarpe «{s.name}» hanno superato i {SHOE_LIMIT_KM} km: è ora di pensare a un paio nuovo.
        </div>
      ))}

      <div className="row">
        <Link className="btn secondary grow small" to="/registra">
          <Icon name="plus" /> Registra corsa
        </Link>
        <Link className="btn secondary grow small" to="/corsa/libera">
          <Icon name="play" /> Corsa libera
        </Link>
      </div>
      {toast}
    </div>
  );
}

function TodayCard({ session, upcoming, beforeStart, weekStart }: { session?: Session; upcoming?: Session; beforeStart: boolean; weekStart: string }) {
  if (session && session.status !== 'saltata') {
    const done = session.status === 'fatta';
    return (
      <section className="lanes" aria-label="Allenamento di oggi">
        <div className="lane-no">{done ? '✓' : '1'}</div>
        <div className="eyebrow">{done ? 'Fatto oggi · bravo!' : 'Oggi'}</div>
        <h2>{session.title}</h2>
        <p>{session.summary}</p>
        {session.type !== 'rinforzo' && (
          <div style={{ marginBottom: 14, background: 'rgba(255,255,255,.9)', padding: 3, borderRadius: 6 }}>
            <SegBar steps={session.steps} />
          </div>
        )}
        <div className="row wrap">
          {!done && session.type !== 'rinforzo' && (
            <Link className="btn" to={`/corsa/${session.id}`}>
              <Icon name="play" /> Inizia · {sessionMinutes(session)} min
            </Link>
          )}
          <Link className={`btn ${done || session.type !== 'rinforzo' ? 'ghost' : ''}`} to={`/seduta/${session.id}`}>
            {session.type === 'rinforzo' && !done ? 'Vedi gli esercizi' : 'Dettagli'}
          </Link>
        </div>
      </section>
    );
  }
  return (
    <section className="lanes" aria-label="Oggi">
      <div className="lane-no">R</div>
      <div className="eyebrow">Oggi</div>
      <h2>{beforeStart ? 'Si parte presto' : 'Riposo'}</h2>
      <p>
        {beforeStart
          ? `Il piano inizia lunedì ${parseIso(weekStart).getDate()}.`
          : 'Il riposo fa parte dell’allenamento: è adesso che il corpo si rinforza. Una camminata va benissimo.'}
      </p>
      {upcoming && (
        <Link className="btn ghost" to={`/seduta/${upcoming.id}`}>
          Prossima: {WEEKDAYS_SHORT[parseIso(upcoming.date).getDay()].toLowerCase()} · {upcoming.title}
        </Link>
      )}
    </section>
  );
}

function WeekStrip({ sessions, start, today }: { sessions: Session[]; start: string; today: string }) {
  return (
    <div className="weekstrip">
      {WEEK_ORDER.map((_, i) => {
        const date = addDays(start, i);
        const s = sessions.find((x) => x.date === date);
        const d = parseIso(date);
        const pip = !s ? '' : s.status === 'fatta' ? 'done' : s.status === 'saltata' ? 'skip' : s.hard ? 'hard' : 'todo';
        const label = `${WEEKDAYS_LONG[d.getDay()]} ${d.getDate()}: ${s ? `${s.title}${s.status === 'fatta' ? ', fatto' : s.status === 'saltata' ? ', saltato' : ''}` : 'riposo'}`;
        const inner = (
          <>
            {WEEKDAYS_SHORT[d.getDay()]}
            <b>{d.getDate()}</b>
            <span className={`pip ${pip}`} />
          </>
        );
        return s ? (
          <Link key={date} to={`/seduta/${s.id}`} className={`day${date === today ? ' today' : ''}`} aria-label={label}>
            {inner}
          </Link>
        ) : (
          <div key={date} className={`day${date === today ? ' today' : ''}`} aria-label={label}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}
