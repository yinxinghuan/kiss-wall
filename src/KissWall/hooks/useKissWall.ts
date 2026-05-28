// Core game state for Kiss Wall.
//
//  - Tracks the current session's kisses (NOT persisted as layout — only
//    lifetime counters survive across loads, preload-safety rule).
//  - Picks a silhouette once per session.
//  - Runs the intro demo loop until first real pointerdown.
//  - Computes reveal alpha for the silhouette based on local kiss density.
//  - Handles SEAL → AI epitaph → save append.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useChat } from '@shared/runtime/useChat';
import { useGameEvent } from '@shared/runtime/useGameEvent';
import { useGameSave } from '@shared/save';
import {
  pickSilhouette,
  useSilhouetteMask,
  type SilhouetteId,
} from '../assets/silhouettes';
import { LIP_COUNT } from '../assets/lips';
import type { Kiss, KissWallSave, SealedStele } from '../types';
import { clamp, describeDistribution, rand, uuidLike } from '../utils/format';
import { initAudioOnce, playKiss } from '../utils/audio';

const SEAL_MIN = 10;        // seal button unlocks at ≥ 10 kisses
const REVEAL_TARGET = 30;   // approx kisses for full silhouette emerge
const EROSION_PER_MISS = 0.03;  // silhouette opacity penalty per wrong tap
const EROSION_CAP = 0.40;       // max erosion (so player can always recover)
const SILHOUETTE_MAX_ALPHA = 0.55;
const DEMO_POSITIONS: { nx: number; ny: number }[] = [
  { nx: 0.32, ny: 0.30 },
  { nx: 0.66, ny: 0.40 },
  { nx: 0.50, ny: 0.55 },
  { nx: 0.40, ny: 0.72 },
];
const DEMO_STEP_MS = 1100;
const DEMO_REST_MS = 800;

interface UseKissWallReturn {
  // session state
  kisses: Kiss[];
  silhouette: SilhouetteId;
  realKissCount: number;
  /** Continuous 0..MAX silhouette opacity (= (n/30)^1.6 × 0.55 − erosion). */
  silhouetteAlpha: number;
  /** Number of wrong taps so far — drives erosion + post-seal grading. */
  missCount: number;
  firstTouched: boolean;
  // ghost-finger demo position (null when not showing)
  demoFingerNx: number | null;
  demoFingerNy: number | null;
  /** True once the silhouette alpha mask has loaded — until then taps fall
   *  outside (all transient). Tiny window (<50ms) but blocks misclassification
   *  of an early tap as "outside". */
  maskReady: boolean;
  // actions
  addKiss: (nx: number, ny: number) => void;
  // sealing
  canSeal: boolean;
  sealing: boolean;
  seal: () => Promise<SealedStele | null>;
  reset: () => void;
  // lifetime
  lifetime: { totalSealed: number; totalKisses: number };
  // most recent seal (for "share" follow-up)
  lastSealed: SealedStele | null;
}

export function useKissWall(): UseKissWallReturn {
  const [silhouette, setSilhouette] = useState<SilhouetteId>(() => pickSilhouette());
  const [kisses, setKisses] = useState<Kiss[]>([]);
  const [firstTouched, setFirstTouched] = useState(false);
  const [sealing, setSealing] = useState(false);
  const [lastSealed, setLastSealed] = useState<SealedStele | null>(null);
  const [demoFinger, setDemoFinger] = useState<{ nx: number; ny: number } | null>(null);
  const [erosion, setErosion] = useState(0);
  const [missCount, setMissCount] = useState(0);
  const firstTouchedRef = useRef(false);
  const silhouetteMask = useSilhouetteMask(silhouette);

  const chat = useChat({
    system:
      'You inscribe epitaphs onto kissed stelae for AlterU After Dark, a dark-romantic memorial toy. Each line is engraved in italics on real stone. Write exactly ONE line, lowercase, between 6 and 12 words, intimate but desolate. Reference the silhouette and the kiss density. No emojis, no quotes, no period at the end.',
  });
  const event = useGameEvent();
  const save = useGameSave<KissWallSave>('kiss-wall');

  const realKisses = kisses.filter(k => !k.isDemo && !k.transient && !k.erasing);
  const realKissCount = realKisses.length;
  const canSeal = realKissCount >= SEAL_MIN && !sealing;
  const silhouetteAlpha = Math.max(
    0,
    Math.pow(Math.min(1, realKissCount / REVEAL_TARGET), 1.6) * SILHOUETTE_MAX_ALPHA - erosion,
  );
  const lifetime = {
    totalSealed: save.savedData?.totalSealed ?? 0,
    totalKisses: save.savedData?.totalKisses ?? 0,
  };

  // ── Add a kiss. Hit-test against the silhouette mask:
  //   - inside  → permanent kiss (counts toward seal/totals)
  //   - outside → transient kiss (mwah, fades after 0.6s) AND erases a random
  //               existing permanent kiss + bumps erosion (silhouette opacity
  //               penalty). "be intentional about who you kiss in the dark."
  const addKiss = useCallback((nx: number, ny: number) => {
    initAudioOnce();
    if (!firstTouchedRef.current) {
      firstTouchedRef.current = true;
      setFirstTouched(true);
      setKisses(k => k.filter(x => !x.isDemo));
      setDemoFinger(null);
    }
    const variant = Math.floor(Math.random() * LIP_COUNT);
    const inside = silhouetteMask.hit(nx, ny);
    const k: Kiss = {
      id: uuidLike(),
      nx: clamp(nx, 0.0, 1.0),
      ny: clamp(ny, 0.0, 1.0),
      variant,
      rot: rand(-16, 16),
      scale: rand(0.78, 1.12),
      alpha: rand(0.82, 1.0),
      t: performance.now(),
      isDemo: false,
      transient: !inside,
    };
    playKiss(variant);

    if (inside) {
      setKisses(prev => [...prev, k]);
      return;
    }

    // ── wrong tap path ─────────────────────────────────────────────────
    setMissCount(m => m + 1);
    setErosion(e => Math.min(EROSION_CAP, e + EROSION_PER_MISS));
    let erasedId: string | null = null;
    setKisses(prev => {
      const perms = prev.filter(p => !p.isDemo && !p.transient && !p.erasing);
      if (perms.length === 0) {
        return [...prev, k];
      }
      const target = perms[Math.floor(Math.random() * perms.length)];
      erasedId = target.id;
      return prev
        .map(p => (p.id === target.id ? { ...p, erasing: true } : p))
        .concat(k);
    });
    setTimeout(() => {
      setKisses(prev => prev.filter(x => x.id !== k.id && x.id !== erasedId));
    }, 700);
  }, [silhouetteMask]);

  // ── Intro demo loop — runs until first real touch ────────────────────────
  useEffect(() => {
    if (firstTouched) return;
    let cancelled = false;
    let step = 0;

    const tick = () => {
      if (cancelled || firstTouchedRef.current) return;
      const pos = DEMO_POSITIONS[step % DEMO_POSITIONS.length];
      setDemoFinger(pos);
      // show finger for ~450ms, then place the kiss (still demo)
      setTimeout(() => {
        if (cancelled || firstTouchedRef.current) return;
        // place the demo kiss by faking a user tap into the same addKiss
        // logic — but we want to ensure isDemo=true regardless of state
        const variant = Math.floor(Math.random() * LIP_COUNT);
        const k: Kiss = {
          id: uuidLike(),
          nx: pos.nx,
          ny: pos.ny,
          variant,
          rot: rand(-14, 14),
          scale: rand(0.85, 1.05),
          alpha: 0.85,
          t: performance.now(),
          isDemo: true,
        };
        setKisses(prev => [...prev, k]);
      }, 450);
      step += 1;
      if (step % DEMO_POSITIONS.length === 0) {
        // wipe demo kisses then loop
        setTimeout(() => {
          if (cancelled || firstTouchedRef.current) return;
          setKisses(prev => prev.filter(x => !x.isDemo));
          setDemoFinger(null);
          setTimeout(tick, DEMO_REST_MS);
        }, DEMO_STEP_MS - 100);
      } else {
        setTimeout(tick, DEMO_STEP_MS);
      }
    };
    const initial = setTimeout(tick, 600);
    return () => { cancelled = true; clearTimeout(initial); };
  }, [firstTouched]);

  // ── Seal: ask LLM for epitaph, save the stele, append history ───────────
  const seal = useCallback(async (): Promise<SealedStele | null> => {
    if (sealing || realKisses.length < SEAL_MIN) return null;
    setSealing(true);
    let epitaph = '';
    try {
      const userMsg = `silhouette: ${silhouette}
kisses: ${realKisses.length}
distribution: ${describeDistribution(realKisses)}

write the epitaph.`;
      const reply = await chat.send(userMsg);
      // sanitize: take first line, strip quotes/period
      epitaph = (reply || '')
        .split('\n')[0]
        .trim()
        .replace(/^["'`]+|["'`.]+$/g, '')
        .toLowerCase();
    } catch {
      // fallback per i18n key
      const fallbacks = [
        'she came back forty-seven times',
        'we kissed the bone first',
        'he said the rose was for me',
        'the hand was already cold',
        'she wore the veil to her own funeral',
        'someone is still standing here',
      ];
      epitaph = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
    const sealed: SealedStele = {
      id: uuidLike(),
      silhouette,
      kisses: realKisses.slice(),
      epitaph,
      sealedAt: Date.now(),
      kissCount: realKisses.length,
    };
    setLastSealed(sealed);
    // persist save (cap history at 10 newest first)
    const next: KissWallSave = {
      totalSealed: (save.savedData?.totalSealed ?? 0) + 1,
      totalKisses: (save.savedData?.totalKisses ?? 0) + realKisses.length,
      history: [sealed, ...(save.savedData?.history ?? [])].slice(0, 10),
    };
    save.persist(next);
    // platform event so the wall counts go up + others' walls refresh
    event.trigger('kiss_sealed', { silhouette, kisses: realKisses.length });
    setSealing(false);
    return sealed;
  }, [sealing, realKisses, silhouette, chat, save, event]);

  // ── Reset the stele to start kissing a new one (after seal) ─────────────
  const reset = useCallback(() => {
    setKisses([]);
    setLastSealed(null);
    setSilhouette(pickSilhouette());
    setErosion(0);
    setMissCount(0);
    firstTouchedRef.current = false;
    setFirstTouched(false);
  }, []);

  return {
    kisses,
    silhouette,
    realKissCount,
    silhouetteAlpha,
    missCount,
    firstTouched,
    demoFingerNx: demoFinger?.nx ?? null,
    demoFingerNy: demoFinger?.ny ?? null,
    maskReady: silhouetteMask.mask != null,
    addKiss,
    canSeal,
    sealing,
    seal,
    reset,
    lifetime,
    lastSealed,
  };
}

export const KISS_WALL_CONSTS = { SEAL_MIN, REVEAL_TARGET };
