// v2 — pure black canvas, no stele frame.
// The (invisible) silhouette mask defines where kisses stick. Players tap
// into the void; only kisses that land inside the silhouette region remain
// visible (their cluster forms the shape). Misses pop with a mwah sound and
// fade out after ~600ms via CSS opacity transition.

import { useCallback, useRef } from 'react';
import { FingerIcon } from '../assets/icons';
import { Lip } from '../assets/lips';
import { SilhouetteShape } from '../assets/silhouettes';
import type { Kiss, SilhouetteId } from '../types';
import { t } from '../i18n';

interface DarkCanvasProps {
  kisses: Kiss[];
  silhouette: SilhouetteId;
  /** Already-computed silhouette ghost opacity (factors kiss count + erosion). */
  silhouetteAlpha: number;
  firstTouched: boolean;
  demoFingerNx: number | null;
  demoFingerNy: number | null;
  onTap: (nx: number, ny: number) => void;
  /** Engraved at the base when sealed. */
  epitaph?: string | null;
}

export function DarkCanvas({
  kisses,
  silhouette,
  silhouetteAlpha,
  firstTouched,
  demoFingerNx,
  demoFingerNy,
  onTap,
  epitaph,
}: DarkCanvasProps) {
  const alpha = silhouetteAlpha;
  const boxRef = useRef<HTMLDivElement | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const box = boxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return;
    onTap(nx, ny);
  }, [onTap]);

  return (
    <div
      ref={boxRef}
      className="kw-canvas"
      onPointerDown={handlePointerDown}
      data-no-feedback="true"
      role="presentation"
    >
      {/* photoreal silhouette as a tinted ghost layer — opacity grows with kiss
          count, giving a continuous "this shape is forming" reveal */}
      <div
        className="kw-silhouette-layer"
        style={{ opacity: alpha }}
        aria-hidden="true"
      >
        <SilhouetteShape id={silhouette} />
      </div>

      {kisses.map(k => (
        <div
          key={k.id}
          className={
            'kw-kiss' +
            (k.isDemo ? ' is-demo' : '') +
            (k.transient ? ' is-transient' : '') +
            (k.erasing ? ' is-erasing' : '')
          }
          style={{
            left: `${k.nx * 100}%`,
            top: `${k.ny * 100}%`,
            ['--kw-rot' as string]: `${k.rot}deg`,
            ['--kw-scale' as string]: `${k.scale}`,
            ['--kw-alpha' as string]: `${k.alpha}`,
          }}
        >
          <Lip variant={k.variant} />
        </div>
      ))}

      {/* ghost finger for the intro demo */}
      {!firstTouched && demoFingerNx != null && demoFingerNy != null && (
        <div
          className="kw-finger"
          style={{ left: `${demoFingerNx * 100}%`, top: `${demoFingerNy * 100}%` }}
        >
          <FingerIcon size={44} />
        </div>
      )}

      {/* first-touch hint */}
      {!firstTouched && (
        <div className="kw-hint">{t('hint_tap')}</div>
      )}

      {/* engraved epitaph (only after seal) */}
      {epitaph && (
        <div className="kw-epitaph">{epitaph}</div>
      )}
    </div>
  );
}
