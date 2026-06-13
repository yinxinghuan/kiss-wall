// v3 — "darkroom" canvas. Three stacked layers:
//
//   1. The AI portrait (img, full opacity, sits behind everything else and
//      is hidden by layer 2 until kissed away). Empty until gen-image
//      resolves.
//   2. A black overlay rendered as an SVG <rect> with circular HOLES cut by
//      a <mask>, one per permanent kiss. Each hole's radius grows from the
//      tap site outward over ~1.4s so the image leaks through gradually.
//   3. The lipstick stamps (.kw-kiss) sit on top of the holes — they are
//      both the gesture artifact and the marker of what's been "discovered."
//
// At bloom time, the dark overlay fades away entirely so the full portrait
// is revealed under the kiss cluster + epitaph.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Lip } from '../assets/lips';
import type { Kiss } from '../types';
import { t } from '../i18n';

interface DarkCanvasProps {
  kisses: Kiss[];
  /** Optional URL of the in-flight or completed portrait. Renders as the
   *  hidden layer behind the dark mask once available. */
  portraitUrl?: string | null;
  /** True once we've decided to fully unveil the portrait — the dark mask
   *  fades out. */
  bloomed: boolean;
  firstTouched: boolean;
  /** Hint label rendered before first touch. */
  hint: string;
  onTap: (nx: number, ny: number) => void;
  /** Engraved at the base after bloom. */
  epitaph?: string | null;
  /** Kiss-back mode — the original author's portrait sits dim under the
   *  player's mask so their devotion is visible from kiss 1. */
  parentBackdropUrl?: string | null;
  /** Kiss-back mode — the original author's kiss marks rendered as low-
   *  opacity echoes under the player's new ones. */
  ghostKisses?: Kiss[];
  /** Floating flourish copy spawned for each kiss. Each entry positions
   *  itself near the original tap and animates up + out. */
  flourishes?: Array<{ id: string; nx: number; ny: number; line: string }>;
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
  flourishes,
}: DarkCanvasProps) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [now, setNow] = useState(performance.now());

  // While unbloomed, drive a 60fps re-render so kiss "holes" grow smoothly.
  // Once bloomed there's nothing animating except CSS-driven layers, so we
  // can stop.
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

  // Each kiss's hole grows from ~3% radius at placement → ~14% at 1.2s and
  // then plateaus. The radius is computed in viewBox-percent units (100×100
  // viewBox with preserveAspectRatio=none so the SVG stretches with the
  // canvas).
  function holeRadius(k: Kiss): number {
    const ageMs = Math.max(0, now - k.t);
    const grow = Math.min(1, ageMs / 1200);
    return 3 + grow * 11;  // %-of-viewBox; 100×100 viewBox so this is also %
  }

  return (
    <div
      ref={boxRef}
      className="kw-canvas"
      onPointerDown={handlePointerDown}
      data-no-feedback="true"
      role="presentation"
    >
      {/* ── Layer 1: kiss-back parent's portrait (dim memory) ─────────── */}
      {parentBackdropUrl && (
        <img
          className="kw-backdrop"
          src={parentBackdropUrl}
          alt=""
          draggable={false}
          aria-hidden="true"
        />
      )}

      {/* ── Layer 1.5: the in-flight or completed AI portrait ────────── */}
      {portraitUrl && (
        <img
          className={`kw-portrait-layer${bloomed ? ' is-bloomed' : ''}`}
          src={portraitUrl}
          alt=""
          draggable={false}
          aria-hidden="true"
        />
      )}

      {/* ── Layer 2: dark veil with kiss-holes (svg <mask>) ──────────── */}
      {/* The veil fades fully away once `bloomed`. */}
      <svg
        className={`kw-veil${bloomed ? ' is-bloomed' : ''}`}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <mask id="kw-veil-mask">
            {/* white = veil visible, black = window through to layer 1 */}
            <rect width="100" height="100" fill="white" />
            {kisses
              .filter(k => !k.isDemo && !k.transient && !k.erasing)
              .map(k => (
                <circle
                  key={k.id}
                  cx={k.nx * 100}
                  cy={k.ny * 100}
                  r={holeRadius(k)}
                  fill="black"
                />
              ))}
          </mask>
        </defs>
        <rect width="100" height="100" fill="#06070a" mask="url(#kw-veil-mask)" />
      </svg>

      {/* ── Layer 3a: kiss-back parent's ghost echo (kiss-back only) ─── */}
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

      {/* ── Layer 3b: the player's own lipstick stamps ──────────────── */}
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

      {/* ── Layer 4: floating flourish copy ─────────────────────────── */}
      {flourishes?.map(f => (
        <div
          key={f.id}
          className="kw-flourish"
          style={{ left: `${f.nx * 100}%`, top: `${f.ny * 100}%` }}
        >
          {f.line}
        </div>
      ))}

      {/* first-touch hint */}
      {!firstTouched && (
        <div className="kw-hint">{hint || t('hint_tap_v2')}</div>
      )}

      {/* engraved epitaph (only after bloom) */}
      {bloomed && epitaph && (
        <div className="kw-epitaph">{epitaph}</div>
      )}
    </div>
  );
}
