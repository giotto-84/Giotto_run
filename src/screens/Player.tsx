import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getSettings } from '../db/db';
import { findSession } from '../db/actions';
import { cuesBetween, cueText, positionAt, speechFor, stepStart, stepVerb } from '../logic/timeline';
import { formatDuration, formatPace, humanDuration, kmh } from '../logic/paces';
import { acceptFix, thinTrack, trackDistance, type TrackPoint } from '../logic/geo';
import { totalSec } from '../logic/generator';
import { beep, canVibrate, keepAwake, releaseAwake, safeStorage, speak, unlockAudio, vibrate } from '../device';
import { Icon } from '../components/ui';
import { TrackOval } from '../components/TrackOval';
import type { Session, Settings, Step } from '../types';

export interface RunDraft {
  sessionId?: string;
  startedAt: string;
  durationSec: number;
  distanceKm?: number;
  track?: TrackPoint[];
  /** Risultato del test: minuti (continuo) o metri (cooper). */
  testValue?: number;
}

export const DRAFT_KEY = 'giotto-run-draft';

type Phase = 'pronto' | 'corsa' | 'pausa';

interface Clock {
  startedAt: number;
  pausedTotal: number;
  pauseStart?: number;
  offset: number; // secondi saltati in avanti
}

export function Player() {
  const { id = 'libera' } = useParams();
  const nav = useNavigate();
  const free = id === 'libera';
  const found = useLiveQuery(() => (free ? Promise.resolve(null) : findSession(id)), [id]);
  const profile = useLiveQuery(() => db.profile.get('me'), []);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [phase, setPhase] = useState<Phase>('pronto');
  const [useGps, setUseGps] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<'off' | 'cerco' | 'ok' | 'errore'>('off');
  const [awake, setAwake] = useState<boolean | null>(null);
  const [, force] = useState(0);
  const clock = useRef<Clock | null>(null);
  const lastElapsed = useRef(0);
  const points = useRef<TrackPoint[]>([]);
  const watchId = useRef<number | null>(null);
  const testMark = useRef<number | undefined>(undefined);

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s);
      setUseGps(s.gpsDefault);
    });
  }, []);

  const session: Session | undefined = found ? found.session : undefined;
  const steps: Step[] = session?.steps ?? [];
  const total = totalSec(steps);

  const elapsedNow = useCallback((): number => {
    const c = clock.current;
    if (!c) return 0;
    const now = c.pauseStart ?? Date.now();
    return (now - c.startedAt - c.pausedTotal) / 1000 + c.offset;
  }, []);

  const notify = useCallback(
    (text: string | null, kind: 'start' | 'tick' | 'end' | 'info') => {
      if (!settings) return;
      if (settings.beeps) {
        if (kind === 'tick') beep(660, 120);
        else if (kind === 'start') beep(990, 280);
        else if (kind === 'end') {
          beep(990, 200);
          setTimeout(() => beep(1320, 400), 250);
        }
      }
      if (settings.vibration && canVibrate) vibrate(kind === 'tick' ? 80 : kind === 'start' ? [200, 100, 200] : kind === 'end' ? [400, 150, 400] : 0);
      if (settings.voice && text) speak(text);
    },
    [settings],
  );

  // ciclo del timer
  useEffect(() => {
    if (phase !== 'corsa') return;
    const timer = setInterval(() => {
      const e = elapsedNow();
      if (!free) {
        for (const c of cuesBetween(steps, lastElapsed.current, e)) {
          const kind = c.type === 'count' ? 'tick' : c.type === 'start' ? 'start' : c.type === 'end' ? 'end' : 'info';
          notify(cueText(c, steps), kind);
        }
      } else {
        // corsa libera: un avviso ogni 5 minuti
        const a = Math.floor(lastElapsed.current / 300);
        const b = Math.floor(e / 300);
        if (b > a) notify(`${b * 5} minuti`, 'info');
      }
      lastElapsed.current = e;
      persist();
      force((x) => x + 1);
    }, 250);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, steps, free, notify, elapsedNow]);

  // schermo acceso: va richiesto di nuovo quando l'app torna in primo piano
  useEffect(() => {
    if (phase === 'pronto') return;
    const onVis = () => {
      if (document.visibilityState === 'visible') keepAwake().then(setAwake);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [phase]);

  useEffect(
    () => () => {
      if (watchId.current !== null) navigator.geolocation?.clearWatch(watchId.current);
      void releaseAwake();
    },
    [],
  );

  const persist = () => {
    if (clock.current) safeStorage().set(`giotto-run-clock-${id}`, JSON.stringify(clock.current));
  };

  const startGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus('errore');
      return;
    }
    setGpsStatus('cerco');
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsStatus('ok');
        if (clock.current?.pauseStart) return;
        const p: TrackPoint = [pos.coords.latitude, pos.coords.longitude, pos.timestamp];
        if (acceptFix(points.current[points.current.length - 1], p, pos.coords.accuracy)) points.current.push(p);
      },
      () => setGpsStatus('errore'),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
  };

  const start = async () => {
    unlockAudio();
    const saved = safeStorage().get(`giotto-run-clock-${id}`);
    let resumed = false;
    if (saved) {
      const c = JSON.parse(saved) as Clock;
      // riprende solo se l'allenamento era iniziato da meno di 3 ore
      if (Date.now() - c.startedAt < 3 * 3600 * 1000 && confirm('Hai un allenamento in corso. Vuoi riprenderlo da dove eri?')) {
        clock.current = { ...c, pauseStart: undefined, pausedTotal: c.pausedTotal + (c.pauseStart ? Date.now() - c.pauseStart : 0) };
        resumed = true;
      }
    }
    if (!clock.current) clock.current = { startedAt: Date.now(), pausedTotal: 0, offset: 0 };
    lastElapsed.current = elapsedNow();
    setPhase('corsa');
    setAwake(await keepAwake());
    if (useGps) startGps();
    if (settings?.voice) speak(resumed ? 'Si riparte!' : free ? 'Via! Buona corsa.' : `Si parte! ${speechFor(steps[0])}`);
    if (settings?.beeps) beep(990, 280);
  };

  const pause = () => {
    if (!clock.current) return;
    clock.current.pauseStart = Date.now();
    persist();
    setPhase('pausa');
    if (settings?.voice) speak('Pausa');
  };
  const resume = () => {
    unlockAudio();
    const c = clock.current;
    if (!c?.pauseStart) return;
    c.pausedTotal += Date.now() - c.pauseStart;
    c.pauseStart = undefined;
    lastElapsed.current = elapsedNow();
    setPhase('corsa');
    if (settings?.voice) speak('Si riparte');
  };

  /** Salta alla fine dello step corrente. */
  const skip = () => {
    const c = clock.current;
    if (!c || free) return;
    const e = elapsedNow();
    const pos = positionAt(steps, e);
    if (steps[pos.index]?.kind === 'test' || steps[pos.index]?.kind === 'gara') testMark.current = pos.stepElapsed;
    c.offset += pos.remaining + 0.01;
    lastElapsed.current = elapsedNow() - 0.02; // fa scattare l'avviso del nuovo step
    force((x) => x + 1);
  };

  const finish = async () => {
    const e = elapsedNow();
    const c = clock.current;
    const realSec = c ? ((c.pauseStart ?? Date.now()) - c.startedAt - c.pausedTotal) / 1000 : 0;
    if (watchId.current !== null) navigator.geolocation?.clearWatch(watchId.current);
    await releaseAwake();
    safeStorage().remove(`giotto-run-clock-${id}`);
    const dist = points.current.length > 1 ? trackDistance(points.current) / 1000 : undefined;
    let testValue: number | undefined;
    const testIdx = steps.findIndex((s) => s.kind === 'test');
    if (testIdx >= 0) {
      const tStep = steps[testIdx];
      const ts = stepStart(steps, testIdx);
      const ran = testMark.current ?? Math.min(tStep.sec, Math.max(0, e - ts));
      if (tStep.sec >= 1500) testValue = Math.round(ran / 60); // test continuo: minuti
      else if (points.current.length > 1) {
        // Cooper: metri percorsi nei 12 minuti
        const t0 = (c?.startedAt ?? 0) + ts * 1000;
        const seg = points.current.filter((p) => p[2] >= t0 && p[2] <= t0 + tStep.sec * 1000);
        if (seg.length > 1) testValue = Math.round(trackDistance(seg) / 10) * 10;
      }
    }
    const draft: RunDraft = {
      sessionId: session?.id,
      startedAt: new Date(c?.startedAt ?? Date.now()).toISOString(),
      durationSec: Math.round(realSec),
      distanceKm: dist ? Math.round(dist * 100) / 100 : undefined,
      track: points.current.length > 1 ? thinTrack(points.current) : undefined,
      testValue,
    };
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* ignora */
    }
    nav(`/registra?bozza=1${session ? `&seduta=${session.id}` : ''}`, { replace: true });
  };

  if (!free && found === undefined) return null;
  if (!free && !session) return <p>Seduta non trovata.</p>;
  if (!settings || !profile) return null;

  const treadmill = profile.surfaces.includes('tapis');

  if (phase === 'pronto') {
    return (
      <div className="player">
        <header className="topbar">
          <button className="back" onClick={() => nav(-1)} aria-label="Indietro">
            <Icon name="back" />
          </button>
          <h1 style={{ fontSize: 32 }}>{free ? 'Corsa libera' : session!.title}</h1>
        </header>
        {!free && <p style={{ fontWeight: 600, margin: 0 }}>{session!.summary}</p>}
        <div className="card stack tight">
          <label className="row spread" style={{ minHeight: 44 }}>
            <span>
              <strong>Usa il GPS</strong>
              <span className="small muted" style={{ display: 'block' }}>
                Per distanza e passo. Funziona solo con lo schermo acceso e l’app aperta.
              </span>
            </span>
            <input type="checkbox" checked={useGps} onChange={(e) => setUseGps(e.target.checked)} style={{ width: 28, height: 28 }} />
          </label>
          {useGps && (
            <div className="card warn small">
              Se blocchi il telefono o cambi app, il GPS si ferma (il tempo invece resta giusto). Per registrare a schermo spento usa un’app come Open GPX Tracker e poi importa il file GPX.
            </div>
          )}
          <hr />
          <div className="row spread">
            <span className="small">
              Avvisi: {[settings.voice && 'voce', settings.beeps && 'bip', settings.vibration && canVibrate && 'vibrazione'].filter(Boolean).join(', ') || 'nessuno'}
            </span>
            <button
              className="btn secondary small"
              onClick={() => {
                unlockAudio();
                speak('Prova audio. Mi senti?');
                beep();
                vibrate(200);
              }}
            >
              <Icon name="sound" /> Prova
            </button>
          </div>
          {!canVibrate && <span className="tiny muted">Su iPhone la vibrazione non è disponibile per le web app: useremo voce e bip. Alza il volume e disattiva il silenzioso.</span>}
        </div>
        <div className="card flat small">
          <strong>Consiglio:</strong> scaldati con gli esercizi di riscaldamento prima di premere Via. {treadmill ? 'Sul tapis roulant imposta la pendenza all’1%.' : ''}
        </div>
        <div className="controls" style={{ gridTemplateColumns: '1fr' }}>
          <button className="btn block" style={{ minHeight: 72, fontSize: 30 }} onClick={start}>
            <Icon name="play" size={28} /> Via!
          </button>
        </div>
      </div>
    );
  }

  const e = elapsedNow();
  const pos = free ? null : positionAt(steps, Math.min(e, total));
  const step = pos ? steps[pos.index] : undefined;
  const next = pos ? steps[pos.index + 1] : undefined;
  const ended = pos?.done ?? false;
  const dist = points.current.length > 1 ? trackDistance(points.current) / 1000 : 0;
  const recent = points.current.filter((p) => p[2] >= Date.now() - 30_000);
  const livePace = recent.length > 2 ? (recent[recent.length - 1][2] - recent[0][2]) / 1000 / (trackDistance(recent) / 1000) : undefined;
  const phaseCls = !step ? 'run' : ['corsa', 'andature'].includes(step.kind) ? 'run' : ['veloce', 'allunghi', 'test', 'gara'].includes(step.kind) ? 'fast' : '';
  const openEnded = step?.kind === 'test' || step?.kind === 'gara';

  return (
    <div className="player" aria-live="off">
      <div className={`phase ${ended ? 'run' : phaseCls}`}>
        <div className="row spread tiny" style={{ fontWeight: 700, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '.08em' }}>
          <span>{free ? 'Corsa libera' : ended ? 'Finito' : `Passo ${pos!.index + 1} di ${steps.length}`}</span>
          <span>{phase === 'pausa' ? 'In pausa' : ''}</span>
        </div>
        <div className="what">{free ? 'Corri' : ended ? 'Completato!' : stepVerb(step!)}</div>
        <div style={{ fontWeight: 600 }}>{free ? 'Al tuo ritmo' : ended ? 'Ottimo lavoro. Salva la corsa.' : step!.label}</div>
        {step?.pace && !ended && (
          <div className="small" style={{ fontWeight: 600 }}>
            {formatPace(step.pace[0])}–{formatPace(step.pace[1])} /km{treadmill ? ` · ${kmh(step.pace[1])}–${kmh(step.pace[0])} km/h` : ''}
          </div>
        )}
      </div>

      <div className="big" aria-label={free ? `Tempo ${formatDuration(e)}` : `Mancano ${formatDuration(pos!.remaining)}`}>
        {free ? formatDuration(e) : formatDuration(Math.ceil(pos!.remaining))}
      </div>

      {!free && (
        <>
          <TrackOval fraction={total ? Math.min(1, e / total) : 0} label={`Allenamento completato al ${Math.round((Math.min(1, e / total) || 0) * 100)}%`} />
          {next && !ended && (
            <div className="card flat small row spread">
              <span>
                Dopo: <strong>{stepVerb(next)}</strong>
              </span>
              <span className="num" style={{ fontSize: 18 }}>
                {humanDuration(next.sec)}
              </span>
            </div>
          )}
        </>
      )}

      <div className="metrics">
        <div className="metric">
          <b>{formatDuration(e)}</b>
          <span>tempo</span>
        </div>
        <div className="metric">
          <b>{useGps ? dist.toFixed(2).replace('.', ',') : '–'}</b>
          <span>km</span>
        </div>
        <div className="metric">
          <b>{useGps && livePace && livePace < 1200 ? formatPace(livePace) : '–'}</b>
          <span>passo</span>
        </div>
      </div>
      {useGps && (
        <div className="tiny muted center">
          GPS: {gpsStatus === 'ok' ? 'attivo' : gpsStatus === 'cerco' ? 'cerco il segnale…' : gpsStatus === 'errore' ? 'non disponibile (controlla i permessi di posizione)' : 'spento'}
          {awake === false && ' · tieni lo schermo acceso tu'}
        </div>
      )}

      {openEnded && !ended && (
        <button className="btn secondary block" onClick={skip}>
          {step!.kind === 'gara' ? 'Ho tagliato il traguardo!' : step!.sec >= 1500 ? 'Mi sono fermato qui' : 'Test finito'}
        </button>
      )}

      <div className="controls">
        <button className="btn secondary" onClick={finish} aria-label="Termina e salva">
          <Icon name="stop" />
        </button>
        {ended ? (
          <button className="btn green" onClick={finish}>
            <Icon name="check" /> Salva
          </button>
        ) : phase === 'corsa' ? (
          <button className="btn" onClick={pause}>
            <Icon name="pause" /> Pausa
          </button>
        ) : (
          <button className="btn green" onClick={resume}>
            <Icon name="play" /> Riprendi
          </button>
        )}
        <button className="btn secondary" onClick={skip} disabled={free || ended} aria-label="Salta al passo successivo">
          <Icon name="next" />
        </button>
      </div>
    </div>
  );
}
