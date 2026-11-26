import { useParams } from 'react-router-dom';
import { CATEGORY_LABEL, EXERCISES } from '../data/exercises';
import { ExerciseImage, Icon, TopBar } from '../components/ui';

export function ExerciseDetail() {
  const { id } = useParams();
  const ex = EXERCISES.find((e) => e.id === id);
  if (!ex) return <TopBar title="Esercizio non trovato" />;
  return (
    <div className="stack">
      <TopBar title={ex.name} />
      <div className="row wrap">
        <span className="tag">{CATEGORY_LABEL[ex.cat]}</span>
        <span className="tag track">{ex.dose}</span>
      </div>
      <ExerciseImage ex={ex} />
      {ex.imgNote && <p className="small muted" style={{ marginTop: -6 }}>{ex.imgNote}</p>}
      <div className="card ok small">
        <strong>A cosa serve: </strong>
        {ex.why}
      </div>
      <section className="card">
        <h3>Come si fa</h3>
        <ol className="howto">
          {ex.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </section>
      <section className="card warn">
        <h3>Errori da evitare</h3>
        <ul style={{ paddingLeft: 20, margin: 0 }}>
          {ex.mistakes.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </section>
      <a className="btn secondary block" href={ex.video} target="_blank" rel="noreferrer">
        <Icon name="video" /> Cerca un video su YouTube
      </a>
    </div>
  );
}
