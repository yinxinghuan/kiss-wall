// Kiss → portrait prompt.
//
// We take the cluster of kisses the player made in the dark and read it as
// a "score sheet" for a single AlterU After Dark portrait:
//
//   • silhouette          → subject anchor (skull / heart / eye / rose / …)
//   • focal region (cx,cy)→ which part of the subject the camera frames
//   • spread              → close crop vs full figure
//   • density (count)     → mood intensity (a tender glance → feverish devotion)
//   • rhythm (median Δt)  → calm / longing / breathless
//   • lip variant tally   → palette accent
//
// The output is a single text prompt + optional ref_url for img2img kiss-backs.
// Style is locked — players never pick a look; the platform stays coherent.

import type { Kiss, SilhouetteId } from '../types';
import { kissStats } from './format';

const STYLE_BASE =
  'AlterU After Dark portrait, oil-painterly chiaroscuro, candlelit, '
  + 'deep crimson and ink shadow, soft film grain, intimate single-subject framing, '
  + 'no text, no watermark, no captions';

// Silhouette → subject anchor. Each becomes the "what is the portrait OF".
const SUBJECT_BY_SILHOUETTE: Record<SilhouetteId, string> = {
  skull:  'a beautiful young woman holding a polished memento mori skull at her cheek',
  heart:  'a young woman cradling an anatomical heart wrapped in red silk',
  bust:   'a marble bust of a woman with rose-stained lips, partial veil',
  eye:    'an extreme close-up of a single haunting human eye, lashes wet',
  hand:   'a pale outstretched hand emerging from black velvet, palm up',
  rose:   'a single full-bloom red rose lying on dark satin, petals slightly bruised',
  veil:   'a bride in a long black mourning veil, only her painted lips visible',
  wings:  'a fallen angel in repose, large dusty white wings, devotional pose',
};

// Focal regions when the kiss centroid lands in different bands.
interface Focal {
  composition: string;
  emphasis: string;
}
function focalFromCentroid(_cx: number, cy: number, sil: SilhouetteId): Focal {
  // For person-like silhouettes, vertical bands are face / chest / hands.
  // For object silhouettes (rose / heart / eye / hand), use generic crop bands.
  const isPerson = sil === 'bust' || sil === 'veil' || sil === 'wings';
  if (isPerson) {
    if (cy < 0.34) return {
      composition: 'tight close-up on the lips and lower face',
      emphasis: 'parted lips painted glossy red, a breath caught at her mouth',
    };
    if (cy < 0.55) return {
      composition: 'over-the-shoulder portrait, focus on the neck and collarbone',
      emphasis: 'a flushed neck, a single lipstick smudge near the collarbone',
    };
    if (cy < 0.78) return {
      composition: 'mid-body portrait, focus on hands at the heart',
      emphasis: 'hands pressed to the chest, ringed fingers',
    };
    return {
      composition: 'low-angle full-figure portrait',
      emphasis: 'long velvet hem pooled on dark floor, feet bare',
    };
  }
  // object subjects
  if (cy < 0.34) return {
    composition: 'tight macro crop on the upper edge',
    emphasis: 'the edge where light catches first',
  };
  if (cy < 0.66) return {
    composition: 'centered macro crop',
    emphasis: 'the center of the form, deepest red',
  };
  return {
    composition: 'low macro crop',
    emphasis: 'the underside, in pooled shadow',
  };
}

// Density → emotional intensity word.
function moodFromCount(n: number): string {
  if (n <= 10) return 'a tender, hesitant glance — restrained longing';
  if (n <= 18) return 'devotional intimacy — the warmth of a held breath';
  if (n <= 30) return 'feverish devotion — adoration spilling over';
  return 'consuming worship — bordering on obsession';
}

// Median inter-tap interval → rhythm qualifier.
function rhythmFromTimes(times: number[]): string {
  if (times.length < 3) return 'still and quiet';
  const sorted = [...times].sort((a, b) => a - b);
  const deltas: number[] = [];
  for (let i = 1; i < sorted.length; i++) deltas.push(sorted[i] - sorted[i - 1]);
  deltas.sort((a, b) => a - b);
  const med = deltas[Math.floor(deltas.length / 2)];
  if (med < 220) return 'breathless and frantic, motion-blur at the edges';
  if (med < 500) return 'eager but tender, lips barely lifting';
  if (med < 1100) return 'unhurried and devotional';
  return 'aching, slow, almost reluctant';
}

// Tight clustering → close-up; wide spread → wider framing.
function framingFromSpread(spread: number): string {
  if (spread < 0.14) return 'extreme close-up, shallow depth of field';
  if (spread < 0.24) return 'close portrait crop';
  if (spread < 0.34) return 'medium portrait, soft fall-off';
  return 'wider environmental portrait, lots of negative dark space';
}

// Most-used lip variant → accent palette. Variants are 0..5; we pick a hue
// family per group.
function paletteFromVariants(variants: number[]): string {
  if (variants.length === 0) return 'crimson and bone';
  const tally = new Array(6).fill(0);
  for (const v of variants) tally[v % 6] += 1;
  const top = tally.indexOf(Math.max(...tally));
  return [
    'glossy carmine red and candle-bone',          // 0
    'deep oxblood and tarnished gold',             // 1
    'rose-petal pink and ash',                     // 2
    'wine-stained burgundy and graphite',          // 3
    'matte sangria and parchment',                 // 4
    'velvet plum and smoke',                       // 5
  ][top];
}

// ─── Public ───────────────────────────────────────────────────────────────

export interface PortraitPromptInput {
  silhouette: SilhouetteId;
  kisses: Kiss[];
  /** When set, this is a kiss-back layered on top of someone else's portrait.
   *  We pass it as ref_url so the generator anchors the composition there. */
  parentPortraitUrl?: string;
}

export interface PortraitPrompt {
  prompt: string;
  ref_url?: string;
  /** What we extracted — kept around for debugging + the epitaph chat msg. */
  signal: {
    count: number;
    cx: number;
    cy: number;
    spread: number;
    mood: string;
    rhythm: string;
    framing: string;
    palette: string;
    composition: string;
    emphasis: string;
  };
}

export function buildPortraitPrompt(input: PortraitPromptInput): PortraitPrompt {
  const { silhouette, kisses, parentPortraitUrl } = input;
  const real = kisses.filter(k => !k.isDemo && !k.transient && !k.erasing);
  const { cx, cy, spread } = kissStats(real);
  const focal = focalFromCentroid(cx, cy, silhouette);
  void cx; // cx reserved for future left/right framing — currently unused
  const mood = moodFromCount(real.length);
  const rhythm = rhythmFromTimes(real.map(k => k.t));
  const framing = framingFromSpread(spread);
  const palette = paletteFromVariants(real.map(k => k.variant));
  const subject = SUBJECT_BY_SILHOUETTE[silhouette];

  const head = parentPortraitUrl
    ? `${STYLE_BASE}. A second devotion layered over the first portrait — both presences faintly visible, like a double exposure of two lovers who never met. Keep the original subject as the primary form; ghost the second figure into the periphery.`
    : `${STYLE_BASE}.`;

  const body = [
    `Subject: ${subject}.`,
    `Composition: ${focal.composition}, ${framing}.`,
    `Emphasis: ${focal.emphasis}.`,
    `Mood: ${mood}, ${rhythm}.`,
    `Palette: ${palette}.`,
    `Detail: scattered lipstick imprints across the frame as devotional traces, ${real.length} faint kiss marks total.`,
  ].join(' ');

  return {
    prompt: `${head} ${body}`,
    ref_url: parentPortraitUrl,
    signal: {
      count: real.length,
      cx, cy, spread,
      mood, rhythm, framing, palette,
      composition: focal.composition,
      emphasis: focal.emphasis,
    },
  };
}
