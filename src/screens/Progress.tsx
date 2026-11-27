import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { deleteRun, saveTestOnly, today } from '../db/actions';
import { runPace, shoeKm, SHOE_LIMIT_KM, weeklyKm } from '../logic/stats';
import { formatDuration, formatPace, pace5kFromCooper } from '../logic/paces';
import { BarChart } from '../components/BarChart';
import { LineChart } from '../components/LineChart';
import { Sheet, Stepper, TopBar, fmt, formatDate, useToast } from '../components/ui';
import type { TestKind } from '../types';

const TYPE_LABEL: Record<string, string> = {
  corsacammino: 'Corsa e cammino',
  facile: 'Corsa facile',
  lungo: 'Lungo',
  ripetute: 'Ripetute',
  fartlek: 'Fartlek',
  medio: 'Ritmo medio',
  allunghi: 'Facile + allunghi',
  test: 'Test',
  gara: 'Gara',
  rinforzo: 'Rinforzo',
};

export function Progress() {
  const runs = useLiveQuery(() => db.runs.orderBy('date').toArray(), []);
  const tests = useLiveQuery(() => db.tests.orderBy('date').toArray(), []);
  const body = useLiveQuery(() => db.body.orderBy('date').toArray(), []);
  const shoes = useLiveQuery(() => db.shoes.toArray(), []);
  const st = useLiveQuery(() => db.state.get('me'), []);
  const [weightOpen, setWeightOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [weight, setWeight] = useState(70);
  const [testKind, setTestKind] = useState<TestKind>('cooper');
  const [testVal, setTestVal] = useState(2000);
  const [toast, showToast] = useToast();

  useEffect(() => {
    if (body?.length) setWeight(body[body.length - 1].weightKg);
  }, [body]);
  useEffect(() => {
    if (location.hash.includes('peso')) document.getElementById('peso')?.scrollIntoView();
  }, []);
  useEffect(() => {
    if (st) setTestKind(st.phase === 'base' ? 'continuo' : 'cooper');
  }, [st]);

  if (!runs || !tests || !body || !shoes) return null;
  const t = today();
  const running = runs.filter((r) => r.sessionType !== 'rinforzo');
  const weeks = weeklyKm(running, t, 12);
  const totalKm = running.reduce((a, r) => a + (r.distanceKm ?? 0), 0);
  const month = t.slice(0, 7);
  const monthKm = running.filter((r) => r.date.slice(0, 7) === month || new Date(r.date).toISOString().slice(0, 7) === month).reduce((a, r) => a + (r.distanceKm ?? 0), 0);
  const paces = running
    .map((r) => ({ date: r.date, value: runPace(r) }))
    .filter((p): p is { date: string; value: number } => p.value !== undefined && p.value < 1200)
    .slice(-20);

  return (
    <div className="stack">
      <TopBar title="Progressi" back={false} />
      <div className="tiles">
        <div className="tile">
          <div className="v">{running.length}</div>
          <div className="l">uscite</div>
        </div>
        <div className="tile">
          <div className="v">{fmt(Math.round(totalKm * 10) / 10)}</div>
          <div className="l">km in tutto</div>
        </div>
        <div className="tile">
          <div className="v">{fmt(Math.round(monthKm * 10) / 10)}</div>
          <div className="l">km questo mese</div>
        </div>
      </div>

      <section className="card">
        <h3>Km a settimana</h3>
        {running.some((r) => r.distanceKm) ? (
          <BarChart bars={weeks.map((w) => ({ key: w.start, value: w.km }))} unit="km" label="Km a settimana, ultime 12 settimane" />
        ) : (
          <p className="small muted">Quando registri le corse con la distanza (GPS, GPX o a mano) qui vedrai i km di ogni settimana.</p>
        )}
      </section>

      <section className="card">
        <h3>Passo medio</h3>
        {paces.length >= 2 ? (
          <>
            <LineChart points={paces} unit="/km" label="Passo medio delle ultime corse" format={formatPace} invert />
            <p className="tiny muted">Più in alto = più veloce. Il passo cambia con il tipo di allenamento: guarda la tendenza, non la singola uscita.</p>
          </>
        ) : (
          <p className="small muted">Servono almeno 2 corse con la distanza per disegnare il grafico.</p>
        )}
      </section>

      <section className="card">
        <div className="row spread">
          <h3>Test</h3>
          <button className="btn secondary small" onClick={() => setTestOpen(true)}>
            + Test
          </button>
        </div>
        {tests.length ? (
          <table style={{ width: '100%' }} className="small">
            <tbody>
              {tests
                .slice()
                .reverse()
                .map((x) => (
                  <tr key={x.id}>
                    <td>{formatDate(x.date, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td>{x.kind === 'cooper' ? '12 minuti' : 'Corsa continua'}</td>
                    <td style={{ textAlign: 'right' }} className="num">
                      {x.kind === 'cooper' ? `${x.value} m` : `${x.value} min`}
                    </td>
                    <td style={{ textAlign: 'right' }} className="muted">
                      {x.kind === 'cooper' ? `5 km ≈ ${formatDuration(pace5kFromCooper(x.value) * 5)}` : ''}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        ) : (
          <p className="small muted">Il primo test arriva alla 4ª settimana. Puoi anche inserirne uno quando vuoi.</p>
        )}
      </section>

      <section className="card" id="peso">
        <div className="row spread">
          <h3>Peso</h3>
          <button className="btn secondary small" onClick={() => setWeightOpen(true)}>
            + Peso
          </button>
        </div>
        {body.length >= 2 ? (
          <LineChart points={body.map((b) => ({ date: b.date, value: b.weightKg }))} unit="kg" label="Peso" />
        ) : (
          <p className="small muted">{body.length ? `Ultimo: ${fmt(body[0].weightKg)} kg. ` : ''}Facoltativo: pesati ogni 4 settimane, alla stessa ora.</p>
        )}
      </section>

      {shoes.length > 0 && (
        <section className="card">
          <h3>Scarpe</h3>
          {shoes.map((s) => {
            const km = shoeKm(s, running);
            return (
              <div key={s.id} className="stack tight" style={{ marginBottom: 10 }}>
                <div className="row spread small">
                  <strong>{s.name}{s.retired ? ' (ritirate)' : ''}</strong>
                  <span className="num" style={{ fontSize: 18 }}>
                    {fmt(km)} / {SHOE_LIMIT_KM} km
                  </span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: 'var(--surface-2)' }}>
                  <div style={{ width: `${Math.min(100, (km / SHOE_LIMIT_KM) * 100)}%`, height: '100%', borderRadius: 4, background: km >= SHOE_LIMIT_KM ? 'var(--track)' : 'var(--field)' }} />
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="card">
        <h3>Storico</h3>
        {!runs.length && <p className="small muted">Ancora nessuna corsa registrata. <Link to="/registra">Registrane una</Link>.</p>}
        {runs
          .slice()
          .reverse()
          .slice(0, 40)
          .map((r) => (
            <details key={r.id} className="exrow" style={{ display: 'block' }}>
              <summary className="row spread" style={{ fontWeight: 400 }}>
                <span>
                  <strong>{formatDate(r.date, { weekday: 'short', day: 'numeric', month: 'short' })}</strong>{' '}
                  <span className="muted small">{r.sessionType ? TYPE_LABEL[r.sessionType] : 'Corsa libera'}</span>
                </span>
                <span className="num" style={{ fontSize: 18 }}>
                  {r.distanceKm ? `${fmt(r.distanceKm, 2)} km` : formatDuration(r.durationSec)}
                </span>
              </summary>
              <div className="small" style={{ padding: '6px 0' }}>
                {formatDuration(r.durationSec)}
                {runPace(r) ? ` · ${formatPace(runPace(r)!)}/km` : ''} · sforzo {r.rpe}/10
                {r.avgHr ? ` · ${r.avgHr} bpm` : ''}
                {r.pain ? ` · ${r.pain === 2 ? 'dolore' : 'fastidio'}` : ''}
                {r.source === 'gpx' ? ' · da GPX' : r.source === 'gps' ? ' · GPS' : ''}
                {r.notes && <div className="muted">{r.notes}</div>}
                <Link className="linkbtn" to={`/registra?corsa=${r.id}`} style={{ marginRight: 16 }}>
                  Correggi
                </Link>
                <button
                  className="linkbtn"
                  onClick={async () => {
                    if (confirm('Cancellare questa corsa?')) await deleteRun(r.id!);
                  }}
                >
                  Cancella
                </button>
              </div>
            </details>
          ))}
      </section>

      <Sheet open={weightOpen} onClose={() => setWeightOpen(false)} label="Peso di oggi">
        <div className="stack">
          <Stepper value={weight} onChange={setWeight} step={0.1} min={30} max={250} label="peso in kg" />
          <button
            className="btn block"
            onClick={async () => {
              await db.body.add({ date: new Date().toISOString(), weightKg: weight });
              setWeightOpen(false);
              showToast('Peso salvato.');
            }}
          >
            Salva
          </button>
        </div>
      </Sheet>

      <Sheet open={testOpen} onClose={() => setTestOpen(false)} label="Nuovo test">
        <div className="stack">
          <div className="small">
            <strong>Test dei 12 minuti:</strong> dopo 10 minuti di riscaldamento, corri per 12 minuti al ritmo più alto che riesci a tenere costante e misura i metri (su una pista 1 giro = 400 m).
            <br />
            <strong>Corsa continua:</strong> quanti minuti riesci a correre piano senza fermarti (per chi è all’inizio).
          </div>
          <select className="input" value={testKind} onChange={(e) => setTestKind(e.target.value as TestKind)} aria-label="Tipo di test">
            <option value="cooper">Test dei 12 minuti (metri)</option>
            <option value="continuo">Corsa continua (minuti)</option>
          </select>
          <Stepper value={testVal} onChange={setTestVal} step={testKind === 'cooper' ? 50 : 1} min={1} max={5000} label={testKind === 'cooper' ? 'metri' : 'minuti'} />
          <button
            className="btn block"
            onClick={async () => {
              const m = await saveTestOnly({ date: new Date().toISOString(), kind: testKind, value: testVal });
              setTestOpen(false);
              showToast(m);
            }}
          >
            Salva
          </button>
        </div>
      </Sheet>
      {toast}
    </div>
  );
}
