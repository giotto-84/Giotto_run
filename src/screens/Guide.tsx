import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CATEGORY_INTRO, CATEGORY_LABEL, EXERCISES, type ExCategory } from '../data/exercises';
import { TIPS } from '../data/tips';
import { Chips, Icon, Thumb, TopBar } from '../components/ui';
import { safeStorage } from '../device';

const CATS: ExCategory[] = ['riscaldamento', 'andature', 'rinforzo', 'stretching'];

export function Guide() {
  const store = safeStorage();
  const [tab, setTab] = useState<'esercizi' | 'consigli'>((store.get('guide-tab') as 'esercizi' | 'consigli') ?? 'esercizi');
  return (
    <div className="stack">
      <TopBar title="Guida" back={false} />
      <Chips
        options={[
          { value: 'esercizi', label: 'Esercizi' },
          { value: 'consigli', label: 'Consigli' },
        ]}
        value={[tab]}
        onChange={([v]) => {
          setTab(v as 'esercizi' | 'consigli');
          store.set('guide-tab', v);
        }}
      />
      {tab === 'esercizi' ? (
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
