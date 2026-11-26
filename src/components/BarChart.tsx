import { useState } from 'react';
import { fmt, formatDate } from './ui';

export interface Bar {
  key: string; // data ISO di inizio settimana
  value: number;
}

/**
 * Colonne dei km settimanali: colonne ≤ 24px con estremità arrotondata, griglia leggera,
 * valore dell'ultima settimana scritto sopra, tocco per leggere le altre, tabella per l'accessibilità.
 */
export function BarChart({ bars, unit, label }: { bars: Bar[]; unit: string; label: string }) {
  const [active, setActive] = useState<number | null>(null);
  const W = 340;
  const H = 170;
  const pad = { l: 30, r: 6, t: 18, b: 22 };
  const max = Math.max(4, ...bars.map((b) => b.value));
  // due intervalli "tondi" (1, 2, 5, 10, 20…): le tacche sono sempre numeri interi
  const raw = max / 2;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const niceMax = step * 2;
  const slot = (W - pad.l - pad.r) / bars.length;
  const bw = Math.min(24, slot - 4);
  const ty = (v: number) => pad.t + (1 - v / niceMax) * (H - pad.t - pad.b);
  const ticks = [0, niceMax / 2, niceMax];
  const cur = bars[active ?? bars.length - 1];
  const r = 4;

  const barPath = (x: number, v: number) => {
    const y = ty(v);
    const base = ty(0);
    const h = base - y;
    if (h <= 0) return '';
    const rr = Math.min(r, h, bw / 2);
    return `M ${x} ${base} V ${y + rr} Q ${x} ${y} ${x + rr} ${y} H ${x + bw - rr} Q ${x + bw} ${y} ${x + bw} ${y + rr} V ${base} Z`;
  };

  return (
    <figure style={{ margin: 0 }}>
      <div className="chart-tip" aria-live="polite">
        <span className="num" style={{ fontSize: 22 }}>
          {fmt(cur.value)} {unit}
        </span>{' '}
        <span className="muted small">settimana del {formatDate(cur.key, { day: 'numeric', month: 'long' })}</span>
      </div>
      <svg
        className="chart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${label}: ultima settimana ${fmt(bars[bars.length - 1].value)} ${unit}`}
        onPointerLeave={() => setActive(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid" x1={pad.l} x2={W - pad.r} y1={ty(t)} y2={ty(t)} />
            <text className="axis" x={pad.l - 6} y={ty(t) + 4} textAnchor="end">
              {fmt(t, 0)}
            </text>
          </g>
        ))}
        {bars.map((b, i) => {
          const x = pad.l + i * slot + (slot - bw) / 2;
          const last = i === bars.length - 1;
          return (
            <g key={b.key}>
              <path className={`barmark${active !== null && active !== i ? ' dim' : ''}`} d={barPath(x, b.value)} />
              {last && b.value > 0 && (
                <text className="vlabel" x={x + bw / 2} y={ty(b.value) - 5} textAnchor="middle">
                  {fmt(b.value)}
                </text>
              )}
              <rect
                className="hit"
                x={pad.l + i * slot}
                y={0}
                width={slot}
                height={H}
                onPointerEnter={() => setActive(i)}
                onPointerDown={() => setActive(i)}
              />
            </g>
          );
        })}
        <text className="axis" x={pad.l} y={H - 4}>
          {formatDate(bars[0].key)}
        </text>
        <text className="axis" x={W - pad.r} y={H - 4} textAnchor="end">
          questa sett.
        </text>
      </svg>
      <details className="tiny" style={{ marginTop: 6 }}>
        <summary className="muted">Vedi i dati in tabella</summary>
        <table style={{ width: '100%', marginTop: 6 }}>
          <tbody>
            {bars
              .slice()
              .reverse()
              .map((b) => (
                <tr key={b.key}>
                  <td>Settimana del {formatDate(b.key, { day: 'numeric', month: 'short' })}</td>
                  <td style={{ textAlign: 'right' }}>
                    {fmt(b.value)} {unit}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
