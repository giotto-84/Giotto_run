import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Exercise } from '../data/exercises';
import { imageUrl } from '../data/exercises';
import { Figure } from './Figure';

export function TopBar({ title, back = true, right }: { title: string; back?: boolean; right?: ReactNode }) {
  const nav = useNavigate();
  return (
    <header className="topbar">
      {back && (
        <button className="back" onClick={() => nav(-1)} aria-label="Indietro">
          <Icon name="back" />
        </button>
      )}
      <h1 style={{ fontSize: back ? 32 : 42 }}>{title}</h1>
      {right}
    </header>
  );
}

const PATHS: Record<string, ReactNode> = {
  home: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  plan: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  book: (
    <>
      <circle cx="13" cy="4.5" r="2" />
      <path d="M7 21l3-6 3 2v4M10 15l1-6 4 3 3-1M11 9l-4 2-1 3" />
    </>
  ),
  chart: <path d="M4 20V4M4 20h16M8 16l4-5 3 3 5-7" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
  back: <path d="M15 5l-7 7 7 7" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  play: <path d="M8 5v14l11-7z" />,
  pause: <path d="M8 5v14M16 5v14" />,
  stop: <rect x="6" y="6" width="12" height="12" rx="1.5" />,
  next: <path d="M6 5l8 7-8 7M18 5v14" />,
  video: (
    <>
      <rect x="3" y="6" width="13" height="12" rx="2" />
      <path d="M16 10l5-3v10l-5-3" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5v.5" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  pin: (
    <>
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  file: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4M9 13h6M9 17h6" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4M8 14h3v3H8z" />
    </>
  ),
  shoe: <path d="M3 16c0-3 1-7 2-9 2 0 3 2 5 2 1.5 2 4 3.5 7 4 2 .4 4 1.3 4 3v1H3z M3 19h18" />,
  sound: (
    <>
      <path d="M4 9h4l5-4v14l-5-4H4z" />
      <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />
    </>
  ),
};

export function Icon({ name, size = 22 }: { name: keyof typeof PATHS | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 999,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  label: string;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 10) / 10));
  return (
    <div className="stepper">
      <button type="button" onClick={() => onChange(clamp(value - step))} aria-label={`Diminuisci ${label}`}>
        −
      </button>
      <input
        inputMode="decimal"
        aria-label={label}
        value={Number.isFinite(value) ? String(value).replace('.', ',') : ''}
        onChange={(e) => {
          const v = parseFloat(e.target.value.replace(',', '.'));
          onChange(Number.isFinite(v) ? v : 0);
        }}
        onBlur={() => onChange(clamp(value))}
      />
      <button type="button" onClick={() => onChange(clamp(value + step))} aria-label={`Aumenta ${label}`}>
        +
      </button>
    </div>
  );
}

export function Chips<T extends string | number>({
  options,
  value,
  onChange,
  multi = false,
  label,
}: {
  options: { value: T; label: string }[];
  value: T[];
  onChange: (v: T[]) => void;
  multi?: boolean;
  label?: string;
}) {
  return (
    <div className="chips" role="group" aria-label={label}>
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button
            key={String(o.value)}
            type="button"
            className="chip"
            aria-pressed={on}
            onClick={() => {
              if (!multi) onChange([o.value]);
              else onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value]);
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Choice({ on, onClick, title, text, icon }: { on: boolean; onClick: () => void; title: string; text?: string; icon?: ReactNode }) {
  return (
    <button type="button" className="choice" aria-pressed={on} onClick={onClick}>
      {icon}
      <span>
        <strong>{title}</strong>
        {text && <span className="small muted">{text}</span>}
      </span>
    </button>
  );
}

export function Sheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}>
        <div className="row spread" style={{ marginBottom: 6 }}>
          <h2>{label}</h2>
          <button className="back" onClick={onClose} aria-label="Chiudi">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Immagine a due fotogrammi (foto libera o disegno) che si alternano. */
export function ExerciseImage({ ex }: { ex: Exercise }) {
  const [failed, setFailed] = useState(false);
  const a = imageUrl(ex, 0);
  const b = imageUrl(ex, 1);
  if (ex.pose && (!a || failed || !ex.img)) {
    return (
      <div className="ex-img" style={{ background: 'var(--surface)' }}>
        <Figure pose={ex.pose} frame={0} label={`${ex.name}: posizione 1`} />
        <Figure pose={ex.pose} frame={1} className="flip" label={`${ex.name}: posizione 2`} />
      </div>
    );
  }
  if (!a || failed) {
    return (
      <div className="ex-img center" style={{ display: 'grid', placeItems: 'center' }}>
        <span className="small muted">Immagine non disponibile: guarda il video</span>
      </div>
    );
  }
  return (
    <div className="ex-img">
      <img src={a} alt={`${ex.name}: posizione di partenza`} onError={() => setFailed(true)} />
      <img className="flip" src={b} alt={`${ex.name}: posizione finale`} />
    </div>
  );
}

export function Thumb({ ex }: { ex: Exercise }) {
  const src = imageUrl(ex, 0);
  if (src && ex.img) return <div className="thumb"><img src={src} alt="" loading="lazy" /></div>;
  return <div className="thumb" style={{ background: 'var(--surface)' }}>{ex.pose && <Figure pose={ex.pose} frame={0} />}</div>;
}

export function formatDate(iso: string | Date, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) {
  const d = typeof iso === 'string' && iso.length === 10 ? new Date(iso + 'T12:00:00') : new Date(iso);
  return d.toLocaleDateString('it-IT', opts);
}

export function fmt(n: number | undefined, digits = 1): string {
  if (n === undefined || !Number.isFinite(n)) return '–';
  return (Number.isInteger(n) ? String(n) : n.toFixed(digits)).replace('.', ',');
}

export function useToast(): [ReactNode, (msg: string) => void] {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 4000);
    return () => clearTimeout(t);
  }, [msg]);
  return [msg ? <div className="toast" role="status">{msg}</div> : null, setMsg];
}
