// Audio for Kiss Wall.
//
// CRITICAL iOS rules (instant-play 3.4 + feedback_audio_first_touch_only):
//  - AudioContext is created lazily on first user gesture.
//  - We call ctx.resume() ONCE globally, not on every sound.
//  - Until ctx.state === 'running', sound calls silently return (no oscillator
//    creation for the first 1-2 pops; the visual still feels responsive).
//  - All noise buffers are pre-allocated. Per-call createBuffer is forbidden.
//  - Live voice cap = 8 (drop, don't queue).
//
// Sounds:
//  - playKiss(variant)  — short mwah on every kiss
//  - playPop()          — small ui-button click (delegated tap feedback)
//  - hapticTap()        — best-effort vibration

let ctx: AudioContext | null = null;
let noiseBuf: AudioBuffer | null = null;
let started = false;
let live = 0;
const MAX_LIVE = 8;

const FORMANTS: { f0: number; f1: number; click: number; dur: number }[] = [
  { f0: 78,  f1: 152, click: 1500, dur: 0.105 },
  { f0: 92,  f1: 200, click: 1800, dur: 0.090 },
  { f0: 68,  f1: 136, click: 1300, dur: 0.118 },
  { f0: 102, f1: 224, click: 2050, dur: 0.082 },
  { f0: 74,  f1: 148, click: 1450, dur: 0.110 },
  { f0: 96,  f1: 210, click: 1920, dur: 0.092 },
];

/** Call on first user gesture. Safe to call repeatedly — only first call runs. */
export function initAudioOnce(): void {
  if (started) return;
  started = true;
  try {
    const Ctor =
      (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx = new Ctor();
    // Pre-allocate ~0.5s of white noise — reused for all kiss clicks.
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * 0.5);
    noiseBuf = ctx.createBuffer(1, len, sr);
    const ch = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    // Resume — one syscall, never call again.
    void ctx.resume();
  } catch {
    ctx = null;
  }
}

function ready(): AudioContext | null {
  if (!ctx || ctx.state !== 'running' || !noiseBuf) return null;
  if (live >= MAX_LIVE) return null;
  return ctx;
}

/** Short kiss "mwah". variant 0..5 picks formant timbre; per-call pitch jitter. */
export function playKiss(variant = 0): void {
  const c = ready();
  if (!c || !noiseBuf) return;
  const v = FORMANTS[((variant % FORMANTS.length) + FORMANTS.length) % FORMANTS.length];
  const t0 = c.currentTime;
  const jitter = 1 + (Math.random() - 0.5) * 0.1;
  live++;

  // --- Click component: noise burst → bandpass ----------------------------
  const noise = c.createBufferSource();
  noise.buffer = noiseBuf;
  noise.loop = false;
  // Random start offset so successive kisses sound varied.
  noise.start(t0, Math.random() * 0.4);
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = v.click * jitter;
  bp.Q.value = 4.5;
  const clickGain = c.createGain();
  clickGain.gain.value = 0;
  clickGain.gain.setValueAtTime(0, t0);
  clickGain.gain.linearRampToValueAtTime(0.18, t0 + 0.005);
  clickGain.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.025);
  noise.connect(bp).connect(clickGain);

  // --- Tone component: sine sweep f0 → f1 ---------------------------------
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(v.f0 * jitter, t0 + 0.01);
  osc.frequency.exponentialRampToValueAtTime(v.f1 * jitter, t0 + v.dur * 0.55);
  osc.frequency.exponentialRampToValueAtTime(v.f0 * 0.9 * jitter, t0 + v.dur);
  const toneGain = c.createGain();
  toneGain.gain.setValueAtTime(0, t0);
  toneGain.gain.linearRampToValueAtTime(0.16, t0 + 0.02);
  toneGain.gain.exponentialRampToValueAtTime(0.0006, t0 + v.dur);
  osc.connect(toneGain);
  osc.start(t0 + 0.005);
  osc.stop(t0 + v.dur + 0.02);

  // --- Mix → master ------------------------------------------------------
  const master = c.createGain();
  master.gain.value = 0.7;
  clickGain.connect(master);
  toneGain.connect(master);
  master.connect(c.destination);

  noise.onended = () => { live = Math.max(0, live - 1); };
}

/** UI button pop — small dry tick. */
export function playPop(): void {
  const c = ready();
  if (!c || !noiseBuf) return;
  const t0 = c.currentTime;
  live++;
  const noise = c.createBufferSource();
  noise.buffer = noiseBuf;
  noise.start(t0, Math.random() * 0.3);
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2400;
  bp.Q.value = 6;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(0.11, t0 + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.04);
  noise.connect(bp).connect(g).connect(c.destination);
  noise.onended = () => { live = Math.max(0, live - 1); };
}

/** Best-effort vibration. Silent no-op when API missing. */
export function hapticTap(ms = 8): void {
  try {
    const n = navigator as Navigator & { vibrate?: (p: number) => boolean };
    n.vibrate?.(ms);
  } catch { /* unavailable */ }
}

/**
 * Install one capture-phase pointerdown listener at document root that fires
 * playPop + hapticTap on common interactive elements. Skip elements inside
 * `[data-no-feedback]`. See feedback_global_tap_feedback_pattern.md.
 */
export function installGlobalTapFeedback(): () => void {
  function onDown(e: PointerEvent) {
    initAudioOnce();
    const target = e.target as HTMLElement | null;
    if (!target) return;
    // Walk up — match button/role=button/a[href], skip if [data-no-feedback]
    let el: HTMLElement | null = target;
    let interactive = false;
    while (el) {
      if (el.hasAttribute && el.hasAttribute('data-no-feedback')) return;
      if (
        el.tagName === 'BUTTON' ||
        el.getAttribute?.('role') === 'button' ||
        (el.tagName === 'A' && el.hasAttribute('href'))
      ) {
        interactive = true;
        break;
      }
      el = el.parentElement;
    }
    if (!interactive) return;
    playPop();
    hapticTap();
  }
  document.addEventListener('pointerdown', onDown, { capture: true, passive: true });
  return () => document.removeEventListener('pointerdown', onDown, { capture: true });
}
