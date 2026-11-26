/**
 * Omino stilizzato per gli esercizi senza foto con licenza libera.
 * Vista di profilo, rivolto a destra. Gamba/braccio "vicini" scuri, "lontani" più chiari.
 */
type P = [number, number];
interface Pose {
  head: P;
  neck: P;
  hip: P;
  nk: P; // ginocchio vicino
  nf: P; // piede vicino
  fk: P; // ginocchio lontano
  ff: P; // piede lontano
  ne: P; // gomito vicino
  nh: P; // mano vicina
  fe: P;
  fh: P;
}

const STAND: Pose = {
  head: [50, 17],
  neck: [50, 27],
  hip: [50, 54],
  nk: [51, 71],
  nf: [50, 88],
  fk: [49, 71],
  ff: [49, 88],
  ne: [52, 41],
  nh: [54, 53],
  fe: [48, 41],
  fh: [46, 53],
};

const pose = (o: Partial<Pose>, dy = 0): Pose => {
  const p = { ...STAND, ...o };
  if (!dy) return p;
  const out = {} as Pose;
  for (const k of Object.keys(p) as (keyof Pose)[]) out[k] = [p[k][0], p[k][1] + dy];
  return out;
};

const POSES: Record<string, [Pose, Pose]> = {
  slanci: [
    pose({ nk: [60, 69], nf: [71, 83], fe: [60, 36], fh: [70, 34], ne: [58, 40], nh: [68, 38] }),
    pose({ nk: [43, 70], nf: [36, 86], fe: [60, 36], fh: [70, 34], ne: [58, 40], nh: [68, 38] }),
  ],
  skip_basso: [
    pose({ nk: [57, 68], nf: [55, 82], ff: [50, 89], ne: [46, 40], nh: [50, 50], fe: [56, 40], fh: [60, 33] }, -1),
    pose({ fk: [57, 68], ff: [55, 82], nf: [50, 89], ne: [56, 40], nh: [60, 33], fe: [46, 40], fh: [50, 50] }, -1),
  ],
  skip_alto: [
    pose({ nk: [66, 54], nf: [64, 72], ne: [44, 40], nh: [47, 50], fe: [58, 39], fh: [62, 30] }, -2),
    pose({ fk: [66, 54], ff: [64, 72], ne: [58, 39], nh: [62, 30], fe: [44, 40], fh: [47, 50] }, -2),
  ],
  calciata: [
    pose({ nk: [50, 72], nf: [38, 60], ne: [56, 40], nh: [60, 32], fe: [44, 40], fh: [46, 50] }, -1),
    pose({ fk: [50, 72], ff: [38, 60], ne: [44, 40], nh: [46, 50], fe: [56, 40], fh: [60, 32] }, -1),
  ],
  saltellato: [
    pose({ nk: [63, 57], nf: [61, 73], ff: [48, 86], fe: [56, 31], fh: [60, 18], ne: [44, 40], nh: [42, 50] }, -4),
    pose({ fk: [63, 57], ff: [61, 73], nf: [48, 86], ne: [56, 31], nh: [60, 18], fe: [44, 40], fh: [42, 50] }, -4),
  ],
  allunghi: [
    pose({ head: [56, 18], neck: [54, 28], hip: [49, 54], nk: [62, 63], nf: [60, 82], fk: [42, 70], ff: [31, 78], ne: [44, 40], nh: [42, 51], fe: [62, 38], fh: [66, 30] }),
    pose({ head: [56, 18], neck: [54, 28], hip: [49, 54], fk: [62, 63], ff: [60, 82], nk: [42, 70], nf: [31, 78], fe: [44, 40], fh: [42, 51], ne: [62, 38], nh: [66, 30] }),
  ],
  equilibrio: [
    pose({ nk: [60, 64], nf: [54, 76], ne: [64, 33], nh: [76, 30], fe: [36, 33], fh: [24, 30] }),
    pose({ nk: [61, 62], nf: [56, 74], ne: [62, 24], nh: [70, 12], fe: [38, 24], fh: [30, 12] }),
  ],
  conchiglia: [
    {
      head: [16, 74], neck: [25, 77], hip: [56, 79], nk: [72, 70], nf: [62, 88], fk: [72, 78], ff: [62, 89],
      ne: [24, 70], nh: [16, 66], fe: [33, 86], fh: [42, 88],
    },
    {
      head: [16, 74], neck: [25, 77], hip: [56, 79], nk: [67, 58], nf: [62, 88], fk: [72, 78], ff: [62, 89],
      ne: [24, 70], nh: [16, 66], fe: [33, 86], fh: [42, 88],
    },
  ],
};

export function Figure({ pose: id, frame, className, label }: { pose: string; frame: 0 | 1; className?: string; label?: string }) {
  const p = POSES[id]?.[frame] ?? STAND;
  const line = (a: P, b: P, c: P, cls: string) => <polyline className={cls} points={`${a.join(',')} ${b.join(',')} ${c.join(',')}`} />;
  return (
    <svg viewBox="0 0 100 100" className={className} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} preserveAspectRatio="xMidYMid meet">
      <line x1="8" x2="92" y1="91" y2="91" stroke="var(--line)" strokeWidth="2" />
      <g fill="none" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        {line(p.hip, p.fk, p.ff, 'figure-far')}
        {line(p.neck, p.fe, p.fh, 'figure-far')}
        <line className="figure-ink" x1={p.neck[0]} y1={p.neck[1]} x2={p.hip[0]} y2={p.hip[1]} strokeWidth="6" />
        {line(p.hip, p.nk, p.nf, 'figure-ink')}
        {line(p.neck, p.ne, p.nh, 'figure-ink')}
      </g>
      <circle cx={p.head[0]} cy={p.head[1]} r="7" fill="var(--track)" />
    </svg>
  );
}
