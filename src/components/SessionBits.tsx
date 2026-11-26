import { Link } from 'react-router-dom';
import type { Session, Step } from '../types';
import { formatPace, humanDuration, kmh } from '../logic/paces';
import { WEEKDAYS_SHORT } from '../logic/dates';
import { parseIso } from '../logic/dates';
import { sessionMinutes } from '../logic/generator';

const KIND_COLOR: Record<Step['kind'], string> = {
  riscaldamento: 'var(--clock)',
  defaticamento: 'var(--clock)',
  cammino: 'var(--clock)',
  recupero: 'var(--clock)',
  corsa: 'var(--field)',
  andature: 'var(--field)',
  veloce: 'var(--track)',
  allunghi: 'var(--track)',
  test: 'var(--track)',
  gara: 'var(--track)',
};

/** Profilo della seduta: blu = cammino/recupero, verde = corsa facile, rosso = veloce. */
export function SegBar({ steps }: { steps: Step[] }) {
  const total = steps.reduce((a, b) => a + b.sec, 0) || 1;
  return (
    <div className="segbar" aria-hidden="true">
      {steps.map((s, i) => (
        <span key={i} style={{ flex: s.sec / total, background: KIND_COLOR[s.kind] }} />
      ))}
    </div>
  );
}

export function SegLegend() {
  return (
    <div className="row wrap tiny muted" style={{ gap: 12 }}>
      <span className="row" style={{ gap: 4 }}>
        <i style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--clock)' }} /> cammino / recupero
      </span>
      <span className="row" style={{ gap: 4 }}>
        <i style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--field)' }} /> corsa facile
      </span>
      <span className="row" style={{ gap: 4 }}>
        <i style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--track)' }} /> più veloce
      </span>
    </div>
  );
}

/** Raggruppa ripetizioni identiche consecutive: "6 × corsa 1 min / cammino 2 min". */
export function StepList({ steps, treadmill }: { steps: Step[]; treadmill?: boolean }) {
  return (
    <ol className="steps">
      {steps.map((s, i) => (
        <li key={i}>
          <span className={`k k-${s.kind}`} />
          <span>
            <span style={{ fontWeight: 600 }}>{s.label}</span>
            {s.pace && (
              <span className="small muted" style={{ display: 'block' }}>
                {formatPace(s.pace[0])}–{formatPace(s.pace[1])} al km
                {treadmill ? ` · tapis ${kmh(s.pace[1])}–${kmh(s.pace[0])} km/h` : ''}
              </span>
            )}
          </span>
          <span className="num" style={{ fontSize: 20 }}>
            {s.meters ? `${s.meters / 1000} km` : humanDuration(s.sec)}
          </span>
        </li>
      ))}
    </ol>
  );
}

const TYPE_TAG: Record<Session['type'], string> = {
  corsacammino: 'blue',
  facile: 'green',
  lungo: 'track',
  ripetute: 'track',
  fartlek: 'track',
  medio: 'track',
  allunghi: 'green',
  test: 'yellow',
  gara: 'yellow',
  rinforzo: 'blue',
};
export function typeTag(t: Session['type']) {
  return TYPE_TAG[t];
}

export function SessionRow({ s, today }: { s: Session; today: string }) {
  const d = parseIso(s.date);
  const bar = s.status === 'fatta' ? 'done' : s.hard ? 'hard' : 'easy';
  const cls = s.status === 'fatta' ? 'done' : s.status === 'saltata' ? 'skipped' : '';
  return (
    <Link to={`/seduta/${s.id}`} className={`session ${cls}`} style={s.date === today ? { borderColor: 'var(--ink)', borderWidth: 2 } : undefined}>
      <div className="date">
        <span>{WEEKDAYS_SHORT[d.getDay()]}</span>
        <b>{d.getDate()}</b>
      </div>
      <div className={`bar ${bar}`} />
      <div className="grow">
        <strong>{s.title}</strong>
        <span className="small muted">
          {s.type === 'rinforzo' ? 'circa 25 min' : `${sessionMinutes(s)} min`}
          {s.status === 'fatta' ? ' · fatta ✓' : s.status === 'saltata' ? ' · saltata' : s.date === today ? ' · oggi' : ''}
        </span>
      </div>
    </Link>
  );
}
