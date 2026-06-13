// v3 — "darkroom" canvas with iris bloom.
//
//   Layer 0/0.5 : the AI portrait (and the kiss-back backdrop, if any)
//   Layer 1     : a black SVG veil with TWO kinds of holes punched through it:
//                   (a) one circle per kiss, growing 3% → 14% over 1.2s
//                       (the "tap to reveal a little" gesture)
//                   (b) ONE iris circle at the centroid of the kisses, r=0
//                       until bloom, then animated 0 → 200 over 1.6s by CSS
//                       (the final "developing" reveal)
//   Layer 3a    : kiss-back parent's kisses as low-opacity echoes
//   Layer 3b    : the player's own lipstick stamps (lighter alpha now)
//   Layer 4     : NOTHING — flourish copy is rendered by the parent in a
//                 fixed slot, not at the tap site.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Lip } from '../assets/lips';
import type { Kiss } from '../types';
import { t } from '../i18n';

interface DarkCanvasProps {
  kisses: Kiss[];
  portraitUrl?: string | null;
  bloomed: boolean;
  firstTouched: boolean;
  hint: string;
  onTap: (nx: number, ny: number) => void;
  epitaph?: string | null;
  parentBackdropUrl?: string | null;
  ghostKisses?: Kiss[];
}

export function DarkCanvas({
  kisses,
  portraitUrl,
  bloomed,
  firstTouched,
  hint,
  onTap,
  epitaph,
  parentBackdropUrl,
  ghostKisses,
}: DarkCanvasProps) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [now, setNow] = useState(performance.now());

  useEffect(() => {
    if (bloomed) return;
    let raf = 0;
    const tick = () => {
      setNow(performance.now());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [bloomed]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const box = boxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return;
    onTap(nx, ny);
  }, [onTap]);

  function holeRadius(k: Kiss): number {
    const ageMs = Math.max(0, now - k.t);
    const grow = Math.min(1, ageMs / 1200);
    return 3 + grow * 11;
  }

  // The iris-bloom circle sits at the centroid of the placed kisses so the
  // final reveal radiates outward from where the player was kissing — feels
  // like the photograph blooming up out of the bath where they touched.
  const realKisses = kisses.filter(k => !k.isDemo && !k.transient && !k.erasing);
  let cx = 50, cy = 50;
  if (realKisses.length > 0) {
    let sx = 0, sy = 0;
    for (const k of realKisses) { sx += k.nx; sy += k.ny; }
    cx = (sx / realKisses.length) * 100;
    cy = (sy / realKisses.length) * 100;
  }

  return (
    <div
      ref={boxRef}
      className="kw-canvas"
      onPointerDown={handlePointerDown}
      data-no-feedback="true"
      role="presentation"
    >
      {parentBackdropUrl && (
        <img
          className="kw-backdrop"
          src={parentBackdropUrl}
          alt=""
          draggable={false}
          aria-hidden="true"
        />
      )}

      {portraitUrl && (
        <img
          className={`kw-portrait-layer${bloomed ? ' is-bloomed' : ''}`}
          src={portraitUrl}
          alt=""
          draggable={false}
          aria-hidden="true"
        />
      )}

      <svg
        className={`kw-veil${bloomed ? ' is-blooming' : ''}`}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <mask id="kw-veil-mask">
            <rect width="100" height="100" fill="white" />
            {realKisses.map(k => (
              <circle
                key={k.id}
                cx={k.nx * 100}
                cy={k.ny * 100}
                r={holeRadius(k)}
                fill="black"
              />
            ))}
            {/* iris bloom hole — CSS animates `r` from 0 → 200 when the
                parent gains the .is-blooming class, sweeping the veil away
                from the centroid of the player's kisses. */}
            <circle
              className="kw-veil__iris"
              cx={cx}
              cy={cy}
              r={0}
              fill="black"
            />
          </mask>
        </defs>
        <rect width="100" height="100" fill="#06070a" mask="url(#kw-veil-mask)" />
      </svg>

      {ghostKisses?.map(k => (
        <div
          key={`ghost-${k.id}`}
          className="kw-kiss kw-kiss--ghost"
          style={{
            left: `${k.nx * 100}%`,
            top: `${k.ny * 100}%`,
            ['--kw-rot' as string]: `${k.rot}deg`,
            ['--kw-scale' as string]: `${k.scale}`,
          }}
          aria-hidden="true"
        >
          <Lip variant={k.variant} />
        </div>
      ))}

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

      {!firstTouched && (
        <div className="kw-hint">{hint || t('hint_tap_v2')}</div>
      )}

      {bloomed && epitaph && (
        <div className="kw-epitaph">{epitaph}</div>
      )}
    </div>
  );
}
