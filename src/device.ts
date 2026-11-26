/* Voce, bip, vibrazione e schermo acceso: tutto ciò che serve durante la corsa. */

let ctx: AudioContext | null = null;

/** Va chiamata dentro un tocco dell'utente (iOS sblocca audio e voce solo così). */
export function unlockAudio(): void {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!ctx && AC) ctx = new AC();
    void ctx?.resume();
  } catch {
    /* niente audio */
  }
}

export function beep(freq = 880, ms = 160, volume = 0.25): void {
  if (!ctx) return;
  try {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(volume, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + ms / 1000 + 0.02);
  } catch {
    /* ignora */
  }
}

let voice: SpeechSynthesisVoice | null | undefined;
function italianVoice(): SpeechSynthesisVoice | null {
  if (voice !== undefined && voice !== null) return voice;
  const all = window.speechSynthesis?.getVoices() ?? [];
  voice = all.find((v) => v.lang === 'it-IT' && /premium|enhanced|alice|federica/i.test(v.name)) ?? all.find((v) => v.lang?.startsWith('it')) ?? null;
  return voice;
}

export function speak(text: string): void {
  const s = window.speechSynthesis;
  if (!s) return;
  try {
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'it-IT';
    const v = italianVoice();
    if (v) u.voice = v;
    u.rate = 1.02;
    s.speak(u);
  } catch {
    /* ignora */
  }
}

export const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;

export function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* iPhone: non supportato */
  }
}

type Sentinel = { release: () => Promise<void> };
let lock: Sentinel | null = null;

/** Tiene lo schermo acceso (se il browser lo permette). Restituisce true se ci è riuscito. */
export async function keepAwake(): Promise<boolean> {
  try {
    const wl = (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<Sentinel> } }).wakeLock;
    if (!wl) return false;
    lock = await wl.request('screen');
    return true;
  } catch {
    return false;
  }
}

export async function releaseAwake(): Promise<void> {
  try {
    await lock?.release();
  } catch {
    /* ignora */
  }
  lock = null;
}

export function safeStorage() {
  return {
    get(key: string): string | null {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key: string, value: string) {
      try {
        localStorage.setItem(key, value);
      } catch {
        /* ignora */
      }
    },
    remove(key: string) {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignora */
      }
    },
  };
}
