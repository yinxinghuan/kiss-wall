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
import { useGenImage } from '@shared/runtime/useGenImage';
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
import { buildPortraitPrompt } from '../utils/prompt';

const SEAL_MIN = 8;             // seal unlocks at ≥ 8 kisses (was 10)
const REVEAL_TARGET = 15;       // approx kisses for full reveal (was 30)
const REVEAL_EXPONENT = 0.9;    // gentler curve so early kisses show visible progress
const EROSION_PER_MISS = 0.01;  // smaller opacity penalty (was 0.03)
const EROSION_CAP = 0.25;       // tighter cap (was 0.40)
const SILHOUETTE_MAX_ALPHA = 0.70;  // brighter target (was 0.55) — players need to SEE it
const DEMO_POSITIONS: { nx: number; ny: number }[] = [
  { nx: 0.32, ny: 0.30 },
  { nx: 0.66, ny: 0.40 },
  { nx: 0.50, ny: 0.55 },
  { nx: 0.40, ny: 0.72 },
];
const DEMO_STEP_MS = 1100;
const DEMO_REST_MS = 800;

/** Optional context when sealing on top of someone else's published portrait
 *  (kiss-back). When set, the seal call produces a duet portrait via img2img
 *  using the parent's portraitUrl as ref, attaches kissBackOf, and fires a
 *  notify to the parent author. */
export interface KissBackContext {
  steleId: string;
  authorId: string;
  authorName?: string;
  authorAvatarUrl?: string;
  parentPortraitUrl?: string;
  parentSilhouette?: SilhouetteId;
}

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
  /** Set to a beat-counter string while sealing so the curtain can show
   *  "developing the portrait…" → "engraving the epitaph…" → "almost…". */
  sealStage: 'idle' | 'developing' | 'engraving' | 'finishing';
  seal: (parent?: KissBackContext) => Promise<SealedStele | null>;
  reset: () => void;
  // lifetime
  lifetime: { totalSealed: number; totalKisses: number };
  // most recent seal (for "share" follow-up)
  lastSealed: SealedStele | null;
  /** Player's full sealed history (cap 10) — used by WallView to
   *  optimistically merge own steles into the cloud wall before
   *  the debounced cloud save reaches get/data/list. */
  history: SealedStele[];
}

export function useKissWall(): UseKissWallReturn {
  const [silhouette, setSilhouette] = useState<SilhouetteId>(() => pickSilhouette());
  const [kisses, setKisses] = useState<Kiss[]>([]);
  const [firstTouched, setFirstTouched] = useState(false);
  const [sealing, setSealing] = useState(false);
  const [sealStage, setSealStage] = useState<'idle' | 'developing' | 'engraving' | 'finishing'>('idle');
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
  const genImage = useGenImage();
  const event = useGameEvent();
  const save = useGameSave<KissWallSave>('kiss-wall');

  // Local mirror — useGameSave.savedData does NOT update after persist(),
  // so every seal read stale `save.savedData?.totalSealed` (still 0 after
  // the first seal) and saved totalSealed: 1 again instead of N+1. The
  // counters silently stopped advancing past 1, and history saved only
  // the most recent seal. See feedback_useGameSave_local_mirror.md.
  const [mirror, setMirror] = useState<KissWallSave | undefined>(undefined);
  useEffect(() => {
    if (mirror === undefined && save.savedData !== undefined) {
      setMirror(save.savedData ?? { totalSealed: 0, totalKisses: 0, history: [] });
    }
  }, [save.savedData, mirror]);

  const realKisses = kisses.filter(k => !k.isDemo && !k.transient && !k.erasing);
  const realKissCount = realKisses.length;
  const canSeal = realKissCount >= SEAL_MIN && !sealing;
  const silhouetteAlpha = Math.max(
    0,
    Math.pow(Math.min(1, realKissCount / REVEAL_TARGET), REVEAL_EXPONENT) * SILHOUETTE_MAX_ALPHA - erosion,
  );
  const lifetime = {
    totalSealed: mirror?.totalSealed ?? 0,
    totalKisses: mirror?.totalKisses ?? 0,
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
    // v2.6: NO MORE erasing existing kisses — too punishing, killed the
    // exploration loop. Wrong taps still fade + bump erosion (tiny opacity
    // penalty so the silhouette ghost recedes slightly) but you never LOSE
    // a kiss you already placed.
    setMissCount(m => m + 1);
    setErosion(e => Math.min(EROSION_CAP, e + EROSION_PER_MISS));
    setKisses(prev => [...prev, k]);
    setTimeout(() => {
      setKisses(prev => prev.filter(x => x.id !== k.id));
    }, 700);
  }, [silhouetteMask]);

  // ── Intro demo loop — runs until first real touch ────────────────────────
  // v2.6: demo positions are sampled from INSIDE the silhouette mask so the
  // ghost finger always "lands a correct kiss" — teaching the player that
  // (a) tapping leaves a mark and (b) the mark sticks only in certain places.
  useEffect(() => {
    if (firstTouched) return;
    let cancelled = false;
    let step = 0;

    // Pick 4 demo positions that are guaranteed inside the silhouette. If
    // the mask hasn't loaded yet, fall back to the static default centers.
    function pickDemoPositions(): { nx: number; ny: number }[] {
      if (!silhouetteMask.mask) return DEMO_POSITIONS;
      const positions: { nx: number; ny: number }[] = [];
      let attempts = 0;
      while (positions.length < 4 && attempts < 200) {
        attempts++;
        const nx = 0.2 + Math.random() * 0.6;
        const ny = 0.2 + Math.random() * 0.6;
        if (silhouetteMask.hit(nx, ny)) {
          // ensure positions are reasonably spread
          const tooClose = positions.some(p =>
            Math.hypot(p.nx - nx, p.ny - ny) < 0.18,
          );
          if (!tooClose) positions.push({ nx, ny });
        }
      }
      return positions.length === 4 ? positions : DEMO_POSITIONS;
    }
    const demoPositions = pickDemoPositions();

    const tick = () => {
      if (cancelled || firstTouchedRef.current) return;
      const pos = demoPositions[step % demoPositions.length];
      setDemoFinger(pos);
      // show finger for ~450ms, then place the kiss (still demo)
      setTimeout(() => {
        if (cancelled || firstTouchedRef.current) return;
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
  }, [firstTouched, silhouetteMask.mask]);

  // ── Seal: gen portrait + epitaph in parallel, save the stele ────────────
  //
  // The portrait is the soul of the seal — it's built from the player's own
  // kiss signal (focal region, density, rhythm, lip variant tally) so each
  // result is unique to how they kissed. The epitaph is the second voice —
  // a one-line italic line under the image.
  //
  // When `parent` is supplied this is a kiss-back: we img2img on top of the
  // parent's portrait and fire a notify to the original author after persist.
  const seal = useCallback(async (
    parent?: KissBackContext,
  ): Promise<SealedStele | null> => {
    if (sealing || realKisses.length < SEAL_MIN) return null;
    setSealing(true);
    setSealStage('developing');

    // Build the portrait prompt from the kiss signal. The silhouette CHOICE
    // anchors the subject; the kiss DISTRIBUTION shapes mood/composition.
    // For a kiss-back the parent's silhouette wins (we're layering over THEIR
    // portrait), with our own pattern as the second voice.
    const promptInput = buildPortraitPrompt({
      silhouette: parent?.parentSilhouette ?? silhouette,
      kisses: realKisses,
      parentPortraitUrl: parent?.parentPortraitUrl,
    });

    // Kick off gen-image + chat in parallel — wall-clock is dominated by the
    // image (5–8s usual, sometimes longer). Epitaph LLM is ~1s.
    const userMsg = `silhouette: ${parent?.parentSilhouette ?? silhouette}
kisses: ${realKisses.length}
distribution: ${describeDistribution(realKisses)}
${parent ? `(this is a second devotion layered over another player's portrait)\n` : ''}
write the epitaph.`;

    const epitaphPromise = (async () => {
      try {
        const reply = await chat.send(userMsg);
        return (reply || '')
          .split('\n')[0]
          .trim()
          .replace(/^["'`]+|["'`.]+$/g, '')
          .toLowerCase();
      } catch {
        const fallbacks = [
          'she came back forty-seven times',
          'we kissed the bone first',
          'he said the rose was for me',
          'the hand was already cold',
          'she wore the veil to her own funeral',
          'someone is still standing here',
        ];
        return fallbacks[Math.floor(Math.random() * fallbacks.length)];
      }
    })();

    // gen-image is the soul of the seal — try twice (slow upstream sometimes
    // 500s on the first hit) before giving up. We log to the console so the
    // player can open devtools / Aigram log viewer and see WHY the fallback
    // path triggered, rather than silently shipping a silhouette stele.
    const portraitPromise = (async () => {
      const args = {
        prompt: promptInput.prompt,
        ref_url: promptInput.ref_url,
      };
      try {
        return await genImage.generate(args);
      } catch (e1) {
        console.warn('[kiss-wall] gen-image attempt 1 failed, retrying:', e1);
        try {
          return await genImage.generate(args);
        } catch (e2) {
          console.error('[kiss-wall] gen-image failed twice:', e2);
          return undefined;
        }
      }
    })();

    // Advance the curtain copy mid-way through the wait. Pure UI sugar.
    const t1 = setTimeout(() => setSealStage('engraving'), 1800);
    const t2 = setTimeout(() => setSealStage('finishing'), 4500);

    const [epitaph, portraitUrl] = await Promise.all([epitaphPromise, portraitPromise]);
    clearTimeout(t1);
    clearTimeout(t2);

    const sealed: SealedStele = {
      id: uuidLike(),
      silhouette: parent?.parentSilhouette ?? silhouette,
      kisses: realKisses.slice(),
      epitaph,
      sealedAt: Date.now(),
      kissCount: realKisses.length,
      portraitUrl,
      kissBackOf: parent
        ? {
            steleId: parent.steleId,
            authorId: parent.authorId,
            authorName: parent.authorName,
            authorAvatarUrl: parent.authorAvatarUrl,
            parentPortraitUrl: parent.parentPortraitUrl,
          }
        : undefined,
    };
    setLastSealed(sealed);
    // persist save (cap history at 10 newest first). Read from mirror —
    // save.savedData is stale post-persist so consecutive seals would
    // each see totalSealed:0 and overwrite history.
    const next: KissWallSave = {
      totalSealed: (mirror?.totalSealed ?? 0) + 1,
      totalKisses: (mirror?.totalKisses ?? 0) + realKisses.length,
      history: [sealed, ...(mirror?.history ?? [])].slice(0, 10),
    };
    setMirror(next);
    save.persist(next);

    // Platform event — kiss-back fires a notify to the original author with
    // the duet portrait attached. Solo seals are tracked too (no target).
    if (parent && portraitUrl) {
      event.trigger('kiss_back', {
        actions: [
          {
            type: 'notify',
            target_user_id: parent.authorId,
            image: {
              ref_url: portraitUrl,
              prompt: 'Duet portrait — a second devotion layered over the original.',
            },
            message: {
              template: '{sender_name} kissed your portrait. Something new bloomed.',
              variables: ['sender_name'],
            },
          },
        ],
      });
    } else {
      event.trigger('kiss_sealed', { silhouette, kisses: realKisses.length });
    }

    setSealing(false);
    setSealStage('idle');
    return sealed;
  }, [sealing, realKisses, silhouette, chat, genImage, save, event, mirror]);

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
    sealStage,
    seal,
    reset,
    lifetime,
    lastSealed,
    history: mirror?.history ?? save.savedData?.history ?? [],
  };
}

export const KISS_WALL_CONSTS = { SEAL_MIN, REVEAL_TARGET };
