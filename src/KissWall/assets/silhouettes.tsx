// v2.4 — photoreal silhouette PNGs (replaces SVG paths).
//
// Each silhouette is a real photo of the form (skull / heart / bust / eye /
// hand / rose / veil / wings) generated via wdabuliu gen-image, rembg'd to
// transparent background. The PNG serves two purposes:
//   1. visible ghost layer behind the kiss cluster (opacity scales with
//      permanent kiss count → continuous reveal)
//   2. hit-test mask (alpha channel >threshold = inside silhouette → kiss
//      sticks; outside → transient)

import { useEffect, useState } from 'react';

export type SilhouetteId =
  | 'skull'
  | 'heart'
  | 'bust'
  | 'eye'
  | 'hand'
  | 'rose'
  | 'veil'
  | 'wings';

export const SILHOUETTE_IDS: SilhouetteId[] = [
  'skull', 'heart', 'bust', 'eye', 'hand', 'rose', 'veil', 'wings',
];

export const SILHOUETTE_LABELS: Record<SilhouetteId, string> = {
  skull: 'Memento',
  heart: 'Heart',
  bust: 'Effigy',
  eye: 'The Eye',
  hand: 'Reach',
  rose: 'Rose',
  veil: 'Veil',
  wings: 'Wings',
};

function silhouetteSrc(id: SilhouetteId): string {
  return `${import.meta.env.BASE_URL}silh-${id}.png`;
}

interface SilhouetteShapeProps {
  id: SilhouetteId;
}

/** Renders the silhouette PNG. Caller wraps in a container that sets opacity
 *  for the ghost-reveal effect. */
export function SilhouetteShape({ id }: SilhouetteShapeProps) {
  return (
    <img
      src={silhouetteSrc(id)}
      alt=""
      draggable={false}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        pointerEvents: 'none',
        // wine tint via CSS filter to keep the photo readable as ghost layer
        filter: 'saturate(0.4) sepia(0.3) hue-rotate(-15deg) brightness(0.85)',
      }}
      aria-hidden="true"
    />
  );
}

/** Legacy export for the veil overlay — no-op now that silhouettes are PNGs. */
export function VeilOverlay() {
  return null;
}

// ─── Mask rasterization for hit-testing ──────────────────────────────────

const MASK_W = 200;
const MASK_H = 300;

async function loadSilhouetteMask(id: SilhouetteId): Promise<Uint8Array> {
  const src = silhouetteSrc(id);
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = src;
  await new Promise<void>((resolve, reject) => {
    if (img.complete && img.naturalWidth > 0) return resolve();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`silhouette load failed: ${src}`));
  });
  const canvas = document.createElement('canvas');
  canvas.width = MASK_W;
  canvas.height = MASK_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new Uint8Array(MASK_W * MASK_H);
  ctx.clearRect(0, 0, MASK_W, MASK_H);
  // Draw scaled-to-fit (preserve aspect ratio inside the mask box)
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.min(MASK_W / iw, MASK_H / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (MASK_W - dw) / 2;
  const dy = (MASK_H - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
  const data = ctx.getImageData(0, 0, MASK_W, MASK_H).data;
  const mask = new Uint8Array(MASK_W * MASK_H);
  for (let i = 0; i < MASK_W * MASK_H; i++) mask[i] = data[i * 4 + 3];
  return mask;
}

export interface SilhouetteMask {
  id: SilhouetteId;
  w: number;
  h: number;
  mask: Uint8Array | null;
  hit: (nx: number, ny: number) => boolean;
}

export function useSilhouetteMask(id: SilhouetteId): SilhouetteMask {
  const [mask, setMask] = useState<Uint8Array | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadSilhouetteMask(id)
      .then(m => { if (!cancelled) setMask(m); })
      .catch(() => { /* silhouette PNG missing → mask stays null → all taps transient */ });
    return () => { cancelled = true; };
  }, [id]);

  function hit(nx: number, ny: number): boolean {
    if (!mask) return false;
    if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return false;
    const x = Math.min(MASK_W - 1, Math.max(0, Math.floor(nx * MASK_W)));
    const y = Math.min(MASK_H - 1, Math.max(0, Math.floor(ny * MASK_H)));
    return mask[y * MASK_W + x] > 80;
  }
  return { id, w: MASK_W, h: MASK_H, mask, hit };
}

// ─── Helpers ──────────────────────────────────────────────────────────────

export function pickSilhouette(seed?: number): SilhouetteId {
  const r = seed != null ? seed : Math.random();
  const i = Math.floor((r % 1 + 1) % 1 * SILHOUETTE_IDS.length);
  return SILHOUETTE_IDS[i];
}
