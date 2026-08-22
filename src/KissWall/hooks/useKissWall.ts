// Core game state for Kiss Wall — v3 "darkroom" model.
//
//  - The first kiss LOCKS the prompt (position + locked silhouette subject)
//    and fires gen-image + epitaph chat in the background. The remaining 5–8s
//    of generation are filled by the player's own ongoing kisses, each of
//    which cuts a window through the dark covering of the canvas + spawns
//    a small floating flourish line. By the time the image arrives, the
//    player has been actively "developing" it; once enough kisses are down
//    AND the image is ready, the darkness blooms away and the portrait is
//    revealed as theirs.
//  - No SEAL button, no curtain. The act of kissing IS the seal.
//  - Hit-test against a fixed silhouette is gone — every tap is welcomed.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useChat } from '@shared/runtime/useChat';
import { useGameEvent } from '@shared/runtime/useGameEvent';
import { useGenImage } from '@shared/runtime/useGenImage';
import { useGameSave } from '@shared/save';
import { pickSilhouette, type SilhouetteId } from '../assets/silhouettes';
import { LIP_COUNT } from '../assets/lips';
import { getTelegramId } from '@shared/runtime/bridge';
import {
  appendMessage,
  newMessage,
  guestbookNotifyConfig,
  type GuestMessage,
} from '@shared/social/guestbook';
import type { Kiss, KissWallSave, SealedStele, WallEntry } from '../types';
import { clamp, describeDistribution, rand, uuidLike } from '../utils/format';
import { initAudioOnce, playKiss } from '../utils/audio';
import { buildPortraitPrompt } from '../utils/prompt';

const BLOOM_TARGET = 12;    // minimum permanent kisses before the dark blooms
const BLOOM_DELAY_MS = 700;  // grace after threshold + image ready so the last kiss lands

// Pre-touch demo loop — ghost finger that wanders the canvas placing
// isDemo kisses so first-time players see, before they tap, that (a) the
// black IS the play surface and (b) tapping leaves a mark. No prompt is
// locked, no holes are cut, no chat fires — purely visual rehearsal.
const DEMO_POSITIONS: { nx: number; ny: number }[] = [
  { nx: 0.34, ny: 0.36 },
  { nx: 0.64, ny: 0.46 },
  { nx: 0.48, ny: 0.64 },
  { nx: 0.40, ny: 0.30 },
];
const DEMO_STEP_MS = 1100;
const DEMO_REST_MS = 800;

/** Optional context when sealing on top of someone else's published portrait
 *  (kiss-back). The first kiss still locks the prompt; we pass the parent's
 *  portraitUrl as img2img ref + fire a notify when the bloom completes. */
export interface KissBackContext {
  steleId: string;
  authorId: string;
  authorName?: string;
  authorAvatarUrl?: string;
  parentPortraitUrl?: string;
  parentSilhouette?: SilhouetteId;
}

interface UseKissWallReturn {
  kisses: Kiss[];
  silhouette: SilhouetteId;
  /** Total permanent kisses this session. */
  realKissCount: number;
  /** The AI portrait. `undefined` = not yet requested. `null` = failed.
   *  A string = ready (used as both the dark-mask backdrop and the final
   *  bloomed image). */
  portraitUrl: string | null | undefined;
  /** True once the portrait is ready AND enough kisses landed AND the bloom
   *  transition has fired. The wall is fully revealed in this state. */
  bloomed: boolean;
  /** True from the first kiss until either bloom or fail. UI uses this to
   *  show the "she stirs / almost…" copy + the dark mask transitions. */
  developing: boolean;
  /** Set after both attempts at gen-image fail. UI surfaces a "kiss it
   *  again" card and lets the player restart the session. */
  failed: boolean;
  firstTouched: boolean;
  /** Ghost-finger demo position before first real touch — null when not
   *  showing. Set by the demo loop; cleared on first real tap. */
  demoFingerNx: number | null;
  demoFingerNy: number | null;
  /** True once the player has clicked enough times — used to swap the HUD
   *  count from "13 kisses" to a "DEVELOPING…" label during the brief wait
   *  for the image to land. */
  reachedTarget: boolean;
  addKiss: (nx: number, ny: number) => void;
  reset: () => void;
  lifetime: { totalSealed: number; totalKisses: number };
  lastSealed: SealedStele | null;
  history: SealedStele[];
  /** Set this BEFORE the first kiss to seal as a kiss-back of someone
   *  else's portrait. Resetting clears it back to null. */
  setKissBackParent: (parent: KissBackContext | null) => void;
  kissBackParent: KissBackContext | null;
  /** The player's own outgoing guestbook notes (for instant-echo merge in the
   *  detail thread). */
  myMessages: GuestMessage[];
  /** Leave a public note on another player's portrait. Stores it in this
   *  player's own blob (full RMW persist) + notifies the portrait's author. */
  sendMessage: (entry: WallEntry, text: string) => void;
}

export function useKissWall(): UseKissWallReturn {
  // Silhouette is still picked at session start — it anchors which SUBJECT
  // the LLM thinks about (skull / heart / eye / hand / rose / veil / wings /
  // bust). We never RENDER it though — the library-PNG look is gone.
  const [silhouette, setSilhouette] = useState<SilhouetteId>(() => pickSilhouette());
  const [kisses, setKisses] = useState<Kiss[]>([]);
  const [firstTouched, setFirstTouched] = useState(false);
  const [demoFinger, setDemoFinger] = useState<{ nx: number; ny: number } | null>(null);
  const [portraitUrl, setPortraitUrl] = useState<string | null | undefined>(undefined);
  const [epitaph, setEpitaph] = useState<string | null>(null);
  const [bloomed, setBloomed] = useState(false);
  const [lastSealed, setLastSealed] = useState<SealedStele | null>(null);
  const [kissBackParent, setKissBackParent] = useState<KissBackContext | null>(null);

  const firstTouchedRef = useRef(false);
  const generationStartedRef = useRef(false);
  const persistedRef = useRef(false);

  const chat = useChat({
    system:
      'You inscribe epitaphs onto kissed portraits for AlterU After Dark, a dark-romantic memorial toy. Each line is engraved in italics on real stone. Write exactly ONE line, lowercase, between 6 and 12 words, intimate but desolate. Reference the silhouette and the kiss density. No emojis, no quotes, no period at the end.',
  });
  const genImage = useGenImage();
  const event = useGameEvent();
  const save = useGameSave<KissWallSave>('kiss-wall');

  // Local mirror — useGameSave.savedData does NOT update after persist(),
  // so every seal read stale `save.savedData?.totalSealed` (still 0 after
  // the first seal) and saved totalSealed: 1 again instead of N+1. The
  // counters silently stopped advancing past 1, and history saved only
  // the most recent seal.
  const [mirror, setMirror] = useState<KissWallSave | undefined>(undefined);
  useEffect(() => {
    if (mirror === undefined && save.savedData !== undefined) {
      setMirror(save.savedData ?? { totalSealed: 0, totalKisses: 0, history: [] });
    }
  }, [save.savedData, mirror]);

  const realKisses = kisses.filter(k => !k.isDemo && !k.transient && !k.erasing);
  const realKissCount = realKisses.length;
  const reachedTarget = realKissCount >= BLOOM_TARGET;
  const developing = firstTouched && !bloomed && portraitUrl !== null;
  const failed = portraitUrl === null;

  // ── First-kiss generation: lock prompt + start gen-image + chat ─────────
  const kickOffGeneration = useCallback((firstKiss: Kiss) => {
    if (generationStartedRef.current) return;
    generationStartedRef.current = true;

    // The first kiss locks the prompt. Position drives focal region; the
    // silhouette ID anchors the subject. We always pass at LEAST that one
    // kiss to the prompt builder so its mood/composition heuristics fire.
    const promptInput = buildPortraitPrompt({
      silhouette: kissBackParent?.parentSilhouette ?? silhouette,
      kisses: [firstKiss],
      parentPortraitUrl: kissBackParent?.parentPortraitUrl,
    });

    // Fire one media request. The shared client owns idempotency and its one
    // controlled retry, so this hook cannot create a retry storm.
    (async () => {
      const args = {
        prompt: promptInput.prompt,
        ref_url: promptInput.ref_url,
      };
      try {
        const url = await genImage.generate(args);
        setPortraitUrl(url);
      } catch (error) {
        console.error('[kiss-wall] media generation failed:', error);
        setPortraitUrl(null);  // failed sentinel
      }
    })();

    // Fire epitaph chat in parallel. It almost always finishes before the
    // image, but we don't gate the bloom on it.
    (async () => {
      const userMsg = `silhouette: ${kissBackParent?.parentSilhouette ?? silhouette}
first-kiss position: ${firstKiss.nx.toFixed(2)}, ${firstKiss.ny.toFixed(2)}
${kissBackParent ? '(layered devotion over another player\'s portrait)\n' : ''}
write the epitaph.`;
      try {
        const reply = await chat.send(userMsg);
        const cleaned = (reply || '')
          .split('\n')[0]
          .trim()
          .replace(/^["'`]+|["'`.]+$/g, '')
          .toLowerCase();
        if (cleaned) setEpitaph(cleaned);
        else throw new Error('empty');
      } catch {
        const fallbacks = [
          'she came back forty-seven times',
          'we kissed the bone first',
          'he said the rose was for me',
          'the hand was already cold',
          'she wore the veil to her own funeral',
          'someone is still standing here',
        ];
        setEpitaph(fallbacks[Math.floor(Math.random() * fallbacks.length)]);
      }
    })();
  }, [silhouette, kissBackParent, genImage, chat]);

  // ── Add a kiss — always welcomed; first kiss kicks off generation ───────
  const addKiss = useCallback((nx: number, ny: number) => {
    initAudioOnce();
    const variant = Math.floor(Math.random() * LIP_COUNT);
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
    };
    playKiss(variant);

    if (!firstTouchedRef.current) {
      firstTouchedRef.current = true;
      setFirstTouched(true);
      setDemoFinger(null);
      // wipe any demo kisses still on the canvas so the player's first real
      // kiss is the only thing visible going forward
      setKisses(prev => [...prev.filter(x => !x.isDemo), k]);
      kickOffGeneration(k);
      return;
    }
    setKisses(prev => [...prev, k]);
  }, [kickOffGeneration]);

  // ── Intro demo loop — ghost finger demonstrates the play surface ──────
  // Runs until the player's first real tap; isDemo kisses are placed at the
  // ghost finger's positions, then wiped between cycles. None of them lock
  // the prompt or cut mask holes (see addKiss above + the DarkCanvas mask
  // filter on !k.isDemo).
  useEffect(() => {
    if (firstTouched) return;
    let cancelled = false;
    let step = 0;

    const tick = () => {
      if (cancelled || firstTouchedRef.current) return;
      const pos = DEMO_POSITIONS[step % DEMO_POSITIONS.length];
      setDemoFinger(pos);
      // show finger for ~450ms, then place the demo kiss
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
    // Drop the finger in fast so a player opening the screen sees the
    // affordance before they make up their mind to keep scrolling.
    const initial = setTimeout(tick, 200);
    return () => { cancelled = true; clearTimeout(initial); };
  }, [firstTouched]);

  // ── Auto-bloom: when enough kisses landed AND the image is ready ────────
  useEffect(() => {
    if (bloomed) return;
    if (!reachedTarget) return;
    if (portraitUrl === undefined) return;  // image still in flight
    // Note: we bloom even if portraitUrl===null (failed) — the failure card
    // is rendered in that case and the player can restart.
    const tid = setTimeout(() => {
      setBloomed(true);
    }, BLOOM_DELAY_MS);
    return () => clearTimeout(tid);
  }, [reachedTarget, portraitUrl, bloomed]);

  // ── On bloom: persist the SealedStele + fire platform event/notify ──────
  useEffect(() => {
    if (!bloomed || persistedRef.current) return;
    if (portraitUrl === null) {
      // Failed — don't write a broken stele. UI shows the fail card and the
      // user can restart with `reset()`. We just mark persisted so we don't
      // re-enter.
      persistedRef.current = true;
      return;
    }
    persistedRef.current = true;

    const finalEpitaph = epitaph ?? 'she kept coming back';
    const sealed: SealedStele = {
      id: uuidLike(),
      silhouette: kissBackParent?.parentSilhouette ?? silhouette,
      kisses: realKisses.slice(),
      epitaph: finalEpitaph,
      sealedAt: Date.now(),
      kissCount: realKisses.length,
      portraitUrl: portraitUrl ?? undefined,
      kissBackOf: kissBackParent
        ? {
            steleId: kissBackParent.steleId,
            authorId: kissBackParent.authorId,
            authorName: kissBackParent.authorName,
            authorAvatarUrl: kissBackParent.authorAvatarUrl,
            parentPortraitUrl: kissBackParent.parentPortraitUrl,
          }
        : undefined,
    };
    setLastSealed(sealed);

    // Full read-modify-write — carry forward every field of the mirror
    // (notably `messages` + `_lastActive`) so sealing never wipes the
    // player's guestbook notes. A partial object here would silently drop
    // them on the next cloud write.
    const next: KissWallSave = {
      ...(mirror ?? {}),
      totalSealed: (mirror?.totalSealed ?? 0) + 1,
      totalKisses: (mirror?.totalKisses ?? 0) + realKisses.length,
      history: [sealed, ...(mirror?.history ?? [])].slice(0, 10),
    };
    setMirror(next);
    save.persist(next);

    if (kissBackParent && portraitUrl) {
      event.trigger('kiss_back', {
        actions: [
          {
            type: 'notify',
            target_user_id: kissBackParent.authorId,
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
      event.trigger('kiss_sealed', {
        silhouette,
        kisses: realKisses.length,
        distribution: describeDistribution(realKisses),
      });
    }
  }, [bloomed, portraitUrl, epitaph, kissBackParent, silhouette, realKisses, mirror, save, event]);

  // ── Guestbook: leave a note on another player's portrait ────────────────
  // Notes live in THIS player's own blob (single-blob platform model). We
  // append + full-RMW persist, then notify the portrait's author once per
  // artifact per session. Skips self + authorless (self/optimistic) entries.
  const notedTargetsRef = useRef<Set<string>>(new Set());
  const sendMessage = useCallback((entry: WallEntry, text: string) => {
    const targetId = entry.stele.id;
    const authorId = entry.userId;
    const isSelfEntry =
      authorId === 'self' || (!!getTelegramId()! && authorId === String(getTelegramId()!));
    const msg = newMessage(targetId, isSelfEntry ? undefined : authorId, text);
    if (!msg) return;

    setMirror(prev => {
      const base: KissWallSave = prev ?? { totalSealed: 0, totalKisses: 0, history: [] };
      const next = appendMessage(base, msg);
      save.persist(next);
      return next;
    });

    // Reliable cross-user delivery: ping the author. Skip self + authorless
    // (optimistic 'self' wall entries, or entries with no resolved id), and
    // dedupe per target per session.
    if (
      !isSelfEntry &&
      authorId &&
      !notedTargetsRef.current.has(targetId)
    ) {
      notedTargetsRef.current.add(targetId);
      event.trigger(
        'kisswall_note',
        guestbookNotifyConfig({
          toUserId: authorId,
          refUrl: entry.stele.portraitUrl,
          note: msg.text,
          template: '{sender_name} left a note on your portrait',
          imagePrompt: 'Someone left a note on the portrait you sealed.',
        }),
      );
    }
  }, [save, event]);

  // ── Reset for a fresh session ───────────────────────────────────────────
  const reset = useCallback(() => {
    setKisses([]);
    setLastSealed(null);
    setSilhouette(pickSilhouette());
    setPortraitUrl(undefined);
    setEpitaph(null);
    setBloomed(false);
    setKissBackParent(null);
    setDemoFinger(null);
    firstTouchedRef.current = false;
    setFirstTouched(false);
    generationStartedRef.current = false;
    persistedRef.current = false;
  }, []);

  const lifetime = {
    totalSealed: mirror?.totalSealed ?? 0,
    totalKisses: mirror?.totalKisses ?? 0,
  };

  return {
    kisses,
    silhouette,
    realKissCount,
    portraitUrl,
    bloomed,
    developing,
    failed,
    firstTouched,
    reachedTarget,
    addKiss,
    reset,
    lifetime,
    lastSealed,
    history: mirror?.history ?? save.savedData?.history ?? [],
    demoFingerNx: demoFinger?.nx ?? null,
    demoFingerNy: demoFinger?.ny ?? null,
    setKissBackParent,
    kissBackParent,
    myMessages: mirror?.messages ?? [],
    sendMessage,
  };
}

export const KISS_WALL_CONSTS = { BLOOM_TARGET };
