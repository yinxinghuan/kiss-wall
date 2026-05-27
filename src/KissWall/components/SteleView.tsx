// The main interactive stele. Renders:
//  - marble slab background (Stele.tsx)
//  - silhouette emerging via SVG mask of kiss positions
//  - the kiss layer as absolute-positioned Lip SVGs
//  - the pulsing "TAP THE STONE" hint + ghost finger demo

import { useCallback, useRef } from 'react';
import { Stele } from '../assets/Stele';
import { SilhouetteShape, VeilOverlay } from '../assets/silhouettes';
import { Lip } from '../assets/lips';
import { FingerIcon } from '../assets/icons';
import type { Kiss, SilhouetteId } from '../types';
import { t } from '../i18n';

interface SteleViewProps {
  kisses: Kiss[];
  silhouette: SilhouetteId;
  firstTouched: boolean;
  demoFingerNx: number | null;
  demoFingerNy: number | null;
  onTap: (nx: number, ny: number) => void;
  /** Optional epitaph engraved at the base of the stele (after sealing). */
  epitaph?: string | null;
}

export function SteleView({
  kisses,
  silhouette,
  firstTouched,
  demoFingerNx,
  demoFingerNy,
  onTap,
  epitaph,
}: SteleViewProps) {
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
    <div className="kw-stele-wrap">
      <Stele className="kw-stele">
        {/* silhouette layer with the reveal mask */}
        <svg
          viewBox="0 0 200 300"
          preserveAspectRatio="none"
          className="kw-stele__shape"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="kw-brush" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
              <stop offset="55%" stopColor="rgba(255,255,255,0.18)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
            <mask id="kw-reveal" maskUnits="userSpaceOnUse">
              <rect x="0" y="0" width="200" height="300" fill="black" />
              {kisses.filter(k => !k.isDemo).map(k => (
                <circle
                  key={k.id}
                  cx={k.nx * 200}
                  cy={k.ny * 300}
                  r="26"
                  fill="url(#kw-brush)"
                />
              ))}
            </mask>
          </defs>
          <g mask="url(#kw-reveal)">
            <SilhouetteShape id={silhouette} />
            {silhouette === 'veil' && <VeilOverlay />}
          </g>
        </svg>

        {/* interactive kiss surface — bound rect = stele */}
        <div
          ref={boxRef}
          className="kw-stele__hit"
          onPointerDown={handlePointerDown}
          data-no-feedback="true"
          role="presentation"
        >
          {/* kiss layer */}
          {kisses.map(k => (
            <div
              key={k.id}
              className={`kw-kiss${k.isDemo ? ' is-demo' : ''}`}
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

          {/* ghost finger (demo) */}
          {!firstTouched && demoFingerNx != null && demoFingerNy != null && (
            <div
              className="kw-finger"
              style={{ left: `${demoFingerNx * 100}%`, top: `${demoFingerNy * 100}%` }}
            >
              <FingerIcon size={44} />
            </div>
          )}

          {/* tap hint — fades on first touch */}
          {!firstTouched && (
            <div className="kw-hint">{t('hint_tap')}</div>
          )}
        </div>

        {/* epitaph engraved on the stele base */}
        {epitaph && (
          <div className="kw-epitaph">{epitaph}</div>
        )}
      </Stele>
    </div>
  );
}
