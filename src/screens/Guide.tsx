import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { WORKOUTS } from '../data/workouts';
import { SegBar, SegLegend } from '../components/SessionBits';
import { CATEGORY_INTRO, CATEGORY_LABEL, EXERCISES, type ExCategory } from '../data/exercises';
import { TIPS } from '../data/tips';
import { Chips, Icon, Thumb, TopBar } from '../components/ui';
import { safeStorage } from '../device';

type Tab = 'allenamenti' | 'esercizi' | 'consigli';

const CATS: ExCategory[] = ['riscaldamento', 'andature', 'rinforzo', 'stretching'];

export function Guide() {
  const store = safeStorage();
  const [params] = useSearchParams();
  const loc = useLocation();
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) ?? (store.get('guide-tab') as Tab) ?? 'esercizi');
  const tabParam = params.get('tab') as Tab | null;
  useEffect(() => {
    if (tabParam) setTab(tabParam);
  }, [tabParam]);
  const anchor = loc.hash.replace('#', '');
  useEffect(() => {
    if (!anchor) return;
    const el = document.getElementById(anchor);
    if (el) {
      if (el instanceof HTMLDetailsElement) el.open = true;
      el.scrollIntoView({ block: 'start' });
    }
  }, [anchor, tab]);
  return (
    <div className="stack">
      <TopBar title="Guida" back={false} />
      <Chips
        options={[
          { value: 'allenamenti', label: 'Allenamenti' },
          { value: 'esercizi', label: 'Esercizi' },
          { value: 'consigli', label: 'Consigli' },
        ]}
        value={[tab]}
        onChange={([v]) => {
          setTab(v as Tab);
          store.set('guide-tab', v);
        }}
      />
      {tab === 'allenamenti' ? (
        <WorkoutTypes />
      ) : tab === 'esercizi' ? (
        CATS.map((c) => (
          <section key={c} className="card">
            <h3>{CATEGORY_LABEL[c]}</h3>
            <p className="small muted">{CATEGORY_INTRO[c]}</p>
            {EXERCISES.filter((e) => e.cat === c).map((ex) => (
              <Link key={ex.id} to={`/guida/${ex.id}`} className="exrow">
                <Thumb ex={ex} />
                <div className="grow">
                  <strong style={{ display: 'block' }}>{ex.name}</strong>
                  <span className="small muted">{ex.dose}</span>
                </div>
                <Icon name="info" />
              </Link>
            ))}
          </section>
        ))
      ) : (
        TIPS.map((tip) => (
          <details key={tip.id} className="card" id={tip.id}>
            <summary style={{ fontFamily: 'var(--display)', fontStyle: 'italic', fontWeight: 800, fontSize: 21, textTransform: 'uppercase' }}>{tip.title}</summary>
            {tip.intro && <p style={{ marginTop: 10 }}>{tip.intro}</p>}
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              {tip.points.map((p, i) => (
                <li key={i} style={{ marginBottom: 6 }}>
                  {p}
                </li>
              ))}
            </ul>
          </details>
        ))
      )}
      <p className="tiny muted">
        Foto degli esercizi: Free Exercise DB (pubblico dominio). Disegni: Giotto Run. I video si aprono come ricerca su YouTube: scegli quello che ti sembra più chiaro.
      </p>
    </div>
  );
}

function WorkoutTypes() {
  return (
    <>
      <p className="small muted" style={{ margin: 0 }}>
        I tipi di allenamento che trovi nel piano, spiegati in modo semplice. Tocca un titolo per aprire la spiegazione.
      </p>
      <SegLegend />
      {WORKOUTS.map((w) => (
        <details key={w.id} id={w.id} className="card">
          <summary style={{ listStyle: 'none' }}>
            <div className="row spread">
              <span style={{ fontFamily: 'var(--display)', fontStyle: 'italic', fontWeight: 800, fontSize: 22, textTransform: 'uppercase' }}>{w.name}</span>
              <span className="muted" aria-hidden="true">▾</span>
            </div>
            <span className="small muted" style={{ fontWeight: 400, display: 'block', margin: '2px 0 8px' }}>{w.short}</span>
            <SegBar steps={w.demo} />
          </summary>
          <div className="stack tight" style={{ marginTop: 12 }}>
            <p style={{ margin: 0 }}>{w.what}</p>
            <div className="card ok small">
              <strong>A cosa serve: </strong>
              {w.why}
            </div>
            <div className="small">
              <span className="label">Quanto forte</span>
              <div>{w.effort}</div>
            </div>
            <div className="small">
              <span className="label">Quando</span>
              <div>{w.when}</div>
            </div>
            <div className="small">
              <span className="label">Esempio</span>
              <div>{w.example}</div>
            </div>
            <ul className="small" style={{ paddingLeft: 20, margin: 0 }}>
              {w.tips.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>
        </details>
      ))}
      <Link to="/guida?tab=consigli#sforzo" className="small">
        Come capire lo sforzo da 1 a 10 →
      </Link>
    </>
  );
}
