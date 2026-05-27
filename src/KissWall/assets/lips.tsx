// 6 lip-print SVG variants. Each is a single <path> drawing the canonical
// kiss-mark silhouette: heart-shaped upper lip (Cupid's bow on top, slight
// waist on bottom) + plump oval lower lip slightly inset.
//
// Variant axis = lip shape weight (full pout, pursed, asymmetric, etc).
// Per-stamp rotation + scale + alpha jitter is added by the caller, so we
// only need the 6 base silhouettes here.

import type { ReactNode } from 'react';

export const LIP_VIEWBOX = '0 0 100 60';
export const LIP_COUNT = 6;

// V0 — full pout (canonical kiss mark, symmetric)
const V0: ReactNode = (
  <>
    <path d="M 50 16
             C 44 6 34 6 26 10
             C 14 16 8 26 14 32
             Q 22 36 32 34
             Q 42 33 50 33
             Q 58 33 68 34
             Q 78 36 86 32
             C 92 26 86 16 74 10
             C 66 6 56 6 50 16 Z" />
    <path d="M 22 36
             Q 18 42 22 48
             Q 32 56 50 56
             Q 68 56 78 48
             Q 82 42 78 36
             Q 70 34 50 34
             Q 30 34 22 36 Z" />
  </>
);

// V1 — pursed pucker (smaller, more compact)
const V1: ReactNode = (
  <>
    <path d="M 50 20
             C 46 12 38 12 32 14
             C 24 18 20 26 24 32
             Q 30 34 38 33
             Q 44 32 50 32
             Q 56 32 62 33
             Q 70 34 76 32
             C 80 26 76 18 68 14
             C 62 12 54 12 50 20 Z" />
    <path d="M 30 34
             Q 26 40 30 46
             Q 38 52 50 52
             Q 62 52 70 46
             Q 74 40 70 34
             Q 64 33 50 33
             Q 36 33 30 34 Z" />
  </>
);

// V2 — wide flat (compressed lips against the stone)
const V2: ReactNode = (
  <>
    <path d="M 50 18
             C 42 10 30 10 22 12
             C 10 16 4 26 12 32
             Q 22 36 34 34
             Q 42 33 50 33
             Q 58 33 66 34
             Q 78 36 88 32
             C 96 26 90 16 78 12
             C 70 10 58 10 50 18 Z" />
    <path d="M 14 36
             Q 8 42 14 48
             Q 26 56 50 56
             Q 74 56 86 48
             Q 92 42 86 36
             Q 76 34 50 34
             Q 24 34 14 36 Z" />
  </>
);

// V3 — slight smile (corners raised)
const V3: ReactNode = (
  <>
    <path d="M 50 16
             C 46 8 36 8 26 12
             C 14 18 10 28 18 34
             Q 26 36 36 34
             Q 44 33 50 33
             Q 56 33 64 34
             Q 74 36 82 34
             C 90 28 86 18 74 12
             C 64 8 54 8 50 16 Z" />
    <path d="M 18 38
             Q 16 44 22 48
             Q 32 54 50 54
             Q 68 54 78 48
             Q 84 44 82 38
             Q 74 35 50 35
             Q 26 35 18 38 Z" />
  </>
);

// V4 — asymmetric (skewed right)
const V4: ReactNode = (
  <>
    <path d="M 52 16
             C 46 6 34 4 24 8
             C 12 14 8 26 16 32
             Q 24 36 34 34
             Q 42 33 52 33
             Q 60 33 68 34
             Q 78 36 86 32
             C 90 26 86 18 76 12
             C 70 8 60 10 52 16 Z" />
    <path d="M 22 36
             Q 18 44 24 48
             Q 34 56 52 55
             Q 70 56 80 48
             Q 84 42 80 36
             Q 72 34 52 34
             Q 32 34 22 36 Z" />
  </>
);

// V5 — half print (upper lip clearly, lower lip thin, like a quick peck)
const V5: ReactNode = (
  <>
    <path d="M 50 16
             C 44 6 34 6 26 10
             C 14 16 8 26 14 32
             Q 22 36 32 34
             Q 42 33 50 33
             Q 58 33 68 34
             Q 78 36 86 32
             C 92 26 86 16 74 10
             C 66 6 56 6 50 16 Z" />
    <path d="M 26 36
             Q 22 40 26 44
             Q 36 48 50 48
             Q 64 48 74 44
             Q 78 40 74 36
             Q 66 34 50 34
             Q 34 34 26 36 Z" />
  </>
);

const VARIANTS: ReactNode[] = [V0, V1, V2, V3, V4, V5];

interface LipProps {
  variant: number;
  color?: string;
}

export function Lip({ variant, color = '#f5b1c7' }: LipProps) {
  const v = VARIANTS[((variant % LIP_COUNT) + LIP_COUNT) % LIP_COUNT];
  return (
    <svg
      viewBox={LIP_VIEWBOX}
      preserveAspectRatio="xMidYMid meet"
      width="100%"
      height="100%"
      style={{ display: 'block', overflow: 'visible' }}
      aria-hidden="true"
    >
      <g fill={color}>{v}</g>
    </svg>
  );
}
