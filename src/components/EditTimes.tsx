import { useEffect, useState } from 'react';
import type { Session, Step } from '../types';
import { changeRepetitions, describeSteps, groupSteps, repetitions, runningSec, setGroupDuration, stepIncrement } from '../logic/editSteps';
import { humanDuration } from '../logic/paces';
import { totalSec } from '../logic/generator';
import { customizeSession, restoreSession } from '../db/actions';
import { Sheet } from './ui';
import { SegBar } from './SessionBits';

const KIND_NAME: Record<Step['kind'], string> = {
  riscaldamento: 'Riscaldamento',
  cammino: 'Cammino',
  corsa: 'Corsa',
  veloce: 'Tratto veloce',
  recupero: 'Recupero',
  andature: 'Andature',
  allunghi: 'Allungo',
  defaticamento: 'Defaticamento',
  test: 'Test',
  gara: 'Gara',
};

/** Finestra per cambiare la durata dei tratti e il numero di ripetizioni di una seduta. */
export function EditTimes({ session, open, onClose, onSaved }: { session: Session; open: boolean; onClose: () => void; onSaved: (msg: string) => void }) {
  const [steps, setSteps] = useState<Step[]>(session.steps);
  useEffect(() => {
    if (open) setSteps(session.steps);
  }, [open, session.steps]);

  const base = session.originalSteps ?? session.steps;
  const groups = groupSteps(steps);
  const reps = repetitions(steps);
  const runNow = runningSec(steps);
  const runPlan = runningSec(base);
  const tooMuch = runPlan > 0 && runNow > runPlan * 1.2;
  const changed = JSON.stringify(steps) !== JSON.stringify(session.steps);

  return (
    <Sheet open={open} onClose={onClose} label="Modifica i tempi">
      <div className="stack">
        <p className="small muted" style={{ margin: 0 }}>
          Cambia la durata dei tratti: le ripetizioni uguali cambiano tutte insieme. Il piano delle settimane successive non cambia.
        </p>
        <SegBar steps={steps} />
        <div className="row spread small">
          <span>
            Totale <strong className="num" style={{ fontSize: 20 }}>{humanDuration(totalSec(steps))}</strong>
          </span>
          <span>
            di corsa <strong className="num" style={{ fontSize: 20 }}>{humanDuration(runNow)}</strong>
          </span>
        </div>

        {reps >= 1 && (
          <div className="card flat row spread">
            <span>
              <strong>Ripetizioni</strong>
              <span className="tiny muted" style={{ display: 'block' }}>Quante volte si ripete il tratto principale</span>
            </span>
            <div className="row" style={{ gap: 6 }}>
              <button className="btn secondary small" aria-label="Una ripetizione in meno" disabled={reps <= 1} onClick={() => setSteps((x) => changeRepetitions(x, -1))}>
                −
              </button>
              <b className="num" style={{ fontSize: 26, minWidth: 34, textAlign: 'center' }}>{reps}</b>
              <button className="btn secondary small" aria-label="Una ripetizione in più" disabled={reps >= 30} onClick={() => setSteps((x) => changeRepetitions(x, 1))}>
                +
              </button>
            </div>
          </div>
        )}

        {groups.map((g) => {
          const inc = stepIncrement(g.sec);
          return (
            <div key={g.key} className="card flat row spread">
              <span className="grow">
                <strong>
                  {KIND_NAME[g.kind]}
                  {g.count > 1 ? ` × ${g.count}` : ''}
                </strong>
                <span className="tiny muted" style={{ display: 'block' }}>{g.label}</span>
              </span>
              <div className="row" style={{ gap: 6 }}>
                <button className="btn secondary small" aria-label={`Accorcia ${KIND_NAME[g.kind]}`} disabled={g.sec <= 10} onClick={() => setSteps((x) => setGroupDuration(x, g.key, g.sec - inc))}>
                  −
                </button>
                <b className="num" style={{ fontSize: 20, minWidth: 64, textAlign: 'center' }}>{humanDuration(g.sec)}</b>
                <button className="btn secondary small" aria-label={`Allunga ${KIND_NAME[g.kind]}`} onClick={() => setSteps((x) => setGroupDuration(x, g.key, g.sec + inc))}>
                  +
                </button>
              </div>
            </div>
          );
        })}

        {tooMuch && (
          <div className="card warn small">
            Stai correndo più del {Math.round((runNow / runPlan - 1) * 100)}% rispetto al piano. Aumentare troppo in fretta è la prima causa di infortuni: vai piano!
          </div>
        )}

        <button
          className="btn block"
          disabled={!changed}
          onClick={async () => {
            await customizeSession(session.id, steps, describeSteps(steps));
            onSaved('Tempi aggiornati.');
            onClose();
          }}
        >
          Salva i tempi
        </button>
        {session.originalSteps && (
          <button
            className="btn ghost block"
            onClick={async () => {
              await restoreSession(session.id);
              onSaved('Ripristinati i tempi del piano.');
              onClose();
            }}
          >
            Torna ai tempi del piano
          </button>
        )}
      </div>
    </Sheet>
  );
}
