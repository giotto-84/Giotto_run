/**
 * Progresso dell'allenamento disegnato come una pista d'atletica:
 * la corsia si colora man mano e un pallino indica dove sei.
 */
export function TrackOval({ fraction, label }: { fraction: number; label: string }) {
  const W = 320;
  const H = 150;
  const r = 52;
  const sw = 18;
  const x0 = 40 + r;
  const x1 = W - 40 - r;
  const cy = H / 2;
  // percorso: parte dal centro del rettilineo in basso, senso antiorario visto dall'alto (verso destra)
  const d = `M ${(x0 + x1) / 2} ${cy + r} L ${x1} ${cy + r} A ${r} ${r} 0 0 0 ${x1} ${cy - r} L ${x0} ${cy - r} A ${r} ${r} 0 0 0 ${x0} ${cy + r} Z`;
  const len = 2 * (x1 - x0) + 2 * Math.PI * r;
  const f = Math.max(0, Math.min(1, fraction));
  const pt = pointAt(f * len, x0, x1, cy, r);
  return (
    <svg className="oval" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <path className="infield" d={`M ${x0} ${cy + r - sw} L ${x1} ${cy + r - sw} A ${r - sw} ${r - sw} 0 0 0 ${x1} ${cy - r + sw} L ${x0} ${cy - r + sw} A ${r - sw} ${r - sw} 0 0 0 ${x0} ${cy + r - sw} Z`} />
      <path className="trackbed" d={d} strokeWidth={sw * 1.6} />
      <path className="done" d={d} strokeWidth={sw * 0.6} strokeDasharray={`${f * len} ${len}`} />
      <path className="laneline" d={d} strokeDasharray="2 6" />
      <line x1={(x0 + x1) / 2} x2={(x0 + x1) / 2} y1={cy + r - sw * 0.8} y2={cy + r + sw * 0.8} stroke="var(--ink)" strokeWidth="3" />
      <circle className="runner" cx={pt[0]} cy={pt[1]} r="9" />
    </svg>
  );
}

function pointAt(s: number, x0: number, x1: number, cy: number, r: number): [number, number] {
  const mid = (x0 + x1) / 2;
  const half = x1 - mid;
  const straight = x1 - x0;
  const arc = Math.PI * r;
  if (s <= half) return [mid + s, cy + r];
  s -= half;
  if (s <= arc) {
    const a = s / r; // 0 → π
    return [x1 + r * Math.sin(a), cy + r * Math.cos(a)];
  }
  s -= arc;
  if (s <= straight) return [x1 - s, cy - r];
  s -= straight;
  if (s <= arc) {
    const a = s / r;
    return [x0 - r * Math.sin(a), cy - r * Math.cos(a)];
  }
  s -= arc;
  return [x0 + Math.min(s, half), cy + r];
}
