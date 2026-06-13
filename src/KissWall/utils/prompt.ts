// Kiss → portrait prompt.
//
// Aligned to the existing silhouette LIBRARY style (silh-*.png). Those PNGs
// are the visual contract — every generated portrait has to read as a
// peer-of-library piece:
//
//   • hero specimen photographed against pitch-black background
//   • single subject centered, vertical 2:3 / 9:16 portrait composition
//   • subject fills 60–80% of the frame height
//   • photoreal high-detail studio render or photograph, museum-specimen
//     feel, macro-level clarity on the subject's surface
//   • each subject keeps its NATURAL palette (heart = deep crimson,
//     rose = red + emerald, eye = brown/blue iris, bust = marble white,
//     wings = dusty white-gray, etc.) — no forced monochrome wash
//
// The kiss signal still personalises:
//   • first-kiss vertical position → focal band on the subject
//     (face/top → upper part; mid → middle; lower → underside / feet)
//   • count → mood register (tender → consuming) — affects subject's
//     expression / surface detail intensity, not background
//
// Lip variant tally has been removed from the prompt — it was driving the
// model toward a forced "single wine wash" palette which broke library
// cohesion. The variants stay as visual decoration on the canvas.

import type { Kiss, SilhouetteId } from '../types';
import { kissStats } from './format';

// Locked aesthetic — HERO SPECIMEN on pitch-black, and the result must be
// STRICTLY BLACK-AND-WHITE so the pink/red kiss prints on the canvas can
// punch maximum contrast against it. No colour anywhere in the generation.
const STYLE_BASE =
  'HERO SPECIMEN SHOT against pure pitch-black background (#000000), '
  + 'museum-specimen aesthetic, photoreal high-detail studio render — '
  + 'feels like a CG product still or a macro studio photograph. '
  + 'STRICT vertical portrait composition, 2:3 aspect, '
  + 'single subject centered, subject fills 65-80% of the frame height, '
  + 'dramatic single-source rim light from the upper-left, '
  + 'shadows fall to absolute pitch black with no gradient halo, '
  + 'subject is rendered with crisp anatomical / botanical detail. '
  + 'NO environment, NO secondary objects, NO hands holding the subject (unless the subject IS a hand), '
  + 'NO scene, NO captions, NO text, NO watermark, NO border. '
  + 'STRICTLY BLACK AND WHITE — pure monochrome silver gelatin print, '
  + 'grayscale only, charcoal blacks → silver grays → bone whites, '
  + 'absolutely no colour anywhere in the image — no red, no green, no blue, '
  + 'no warm tints, no sepia, no rose; if the subject is naturally coloured '
  + 'it must be rendered as its grayscale equivalent only. '
  + 'AlterU After Dark aesthetic — mortal beauty, isolated specimen, calm reverence.';

// Subject anchor per silhouette ID. Each describes the SUBJECT only (no
// scene, no person holding it). Mirrors what's in public/silh-*.png.
const SUBJECT_BY_SILHOUETTE: Record<SilhouetteId, string> = {
  skull:
    'A polished memento mori skull (RENDERED IN GRAYSCALE), three-quarter side view, '
    + 'perfect anatomical accuracy, hairline cracks across the cranium, '
    + 'jaw intact and slightly parted, no teeth missing, '
    + 'CG sculpture render aesthetic, no neck, no body, only the skull.',
  heart:
    'A single anatomical human heart specimen (RENDERED IN GRAYSCALE), '
    + 'wet glossy surface, aortic arch and ventricles fully visible, '
    + 'photoreal medical-illustration feel — but pure black/white/gray only — '
    + 'no body, just the heart in space.',
  bust:
    'A bust of a serene young woman in classical Greco-Roman style '
    + '(RENDERED IN GRAYSCALE, silver gelatin print), three-quarter portrait angle, '
    + 'carved hairline curls and a calm closed-eye expression, plinth visible at the base, '
    + 'hand-carved sculpture photograph, no clothing visible below the shoulders.',
  eye:
    'A single hyper-realistic close-up human eye (RENDERED IN GRAYSCALE), macro detail, '
    + 'fully detailed iris in pure tonal grays, wet lower lash line, '
    + 'a single perfect black tear gathering at the tear duct and beginning to fall, '
    + 'absolutely no face visible around the eye, eye floats in pure black space, '
    + 'cinematic close-up.',
  hand:
    'A single outstretched human hand (RENDERED IN GRAYSCALE), palm facing the viewer, '
    + 'photoreal skin detail in tonal grays, faint lifelines, no arm visible above the wrist, '
    + 'no jewellery, no nail polish, the hand fades into pitch black at the wrist, '
    + 'vertical orientation.',
  rose:
    'A single full-bloom rose (RENDERED IN GRAYSCALE) with leaves and a '
    + 'long thorny stem extending downward, photoreal botanical specimen — '
    + 'pure black/white/gray only, NO red and NO green anywhere, '
    + 'one or two petals beginning to curl at the edge, no vase, no other flowers, '
    + 'vertical orientation, isolated against the black.',
  veil:
    'A translucent mourning lace veil (RENDERED IN GRAYSCALE) falling vertically '
    + 'with delicate floral lace embroidery, soft folds catching a single rim light, '
    + 'no figure inside the veil, no face, just the fabric as a hanging specimen, '
    + 'photoreal textile detail in tonal grays only.',
  wings:
    'A single feathered wing in profile (RENDERED IN GRAYSCALE), photoreal '
    + 'feather-by-feather detail in silver and bone tones, no body or shoulder attached, '
    + 'wing floats vertical in pure black space, hero specimen shot.',
};

// Focal band — vertical position of first-kiss centroid maps to which PART
// of the subject is closest to the camera. Kept abstract (top / middle /
// lower) so it generalises across very different subject shapes.
function focalFromCentroid(cy: number): string {
  if (cy < 0.34) return 'composition emphasises the upper part of the subject, focal detail at the top';
  if (cy < 0.66) return 'composition emphasises the centre of the subject';
  return 'composition emphasises the lower part of the subject, focal detail at the base';
}

// Density → emotional register. Only modulates the subject's surface
// quality (lush detail vs. restrained), never the palette or scene.
function moodFromCount(n: number): string {
  if (n <= 5)  return 'a quiet, almost still presence, restrained detail';
  if (n <= 12) return 'devotional clarity, every surface detail rendered with care';
  if (n <= 20) return 'feverish intensity, surface details exaggerated';
  return 'overwhelming presence, near-obsessive surface detail, slight surreal edge';
}

// Median inter-tap interval → rhythm qualifier. Mild effect — affects
// crispness/film-grain feel, not subject or palette.
function rhythmFromTimes(times: number[]): string {
  if (times.length < 3) return 'tack-sharp focus throughout';
  const sorted = [...times].sort((a, b) => a - b);
  const deltas: number[] = [];
  for (let i = 1; i < sorted.length; i++) deltas.push(sorted[i] - sorted[i - 1]);
  deltas.sort((a, b) => a - b);
  const med = deltas[Math.floor(deltas.length / 2)];
  if (med < 220) return 'a faint hint of motion blur at the edges, breathless';
  if (med < 500) return 'crisp focus, slightly warmer light';
  return 'tack-sharp focus, contemplative stillness';
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
  signal: {
    count: number;
    cx: number;
    cy: number;
    spread: number;
    mood: string;
    rhythm: string;
    focal: string;
  };
}

export function buildPortraitPrompt(input: PortraitPromptInput): PortraitPrompt {
  const { silhouette, kisses, parentPortraitUrl } = input;
  const real = kisses.filter(k => !k.isDemo && !k.transient && !k.erasing);
  const { cx, cy, spread } = kissStats(real);
  void cx;
  const focal = focalFromCentroid(cy);
  const mood = moodFromCount(real.length);
  const rhythm = rhythmFromTimes(real.map(k => k.t));
  const subject = SUBJECT_BY_SILHOUETTE[silhouette];

  const head = parentPortraitUrl
    ? `${STYLE_BASE} A second devotion layered onto the original specimen — keep the original subject as the dominant form, only subtly intensify its mood; do NOT add another subject.`
    : STYLE_BASE;

  const body = [
    `SUBJECT: ${subject}`,
    `FRAMING: ${focal}.`,
    `MOOD: ${mood}, ${rhythm}.`,
    'BACKGROUND: pitch-black void (#000000), absolutely empty, no gradient.',
    'COLOUR: PURE GRAYSCALE only — black, white, and silver-gray tones. '
      + 'Render the image as if it were a vintage black-and-white silver gelatin print. '
      + 'Absolutely no red, no pink, no green, no blue, no warm tints. '
      + 'The pink kiss prints overlaid by the game UI need maximum contrast against this image — keep it strictly monochrome.',
  ].join(' ');

  return {
    prompt: `${head} ${body}`,
    ref_url: parentPortraitUrl,
    signal: { count: real.length, cx, cy, spread, mood, rhythm, focal },
  };
}
