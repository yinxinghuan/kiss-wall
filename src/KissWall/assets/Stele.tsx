// Black marble stele — vertical rounded slab that fills most of the play
// area. Subtle mottled grain via low-alpha noise blobs (pure SVG, no images).
// Wraps the silhouette and the kiss layer in absolute children.

import type { ReactNode } from 'react';

interface SteleProps {
  children?: ReactNode;
  className?: string;
}

export function Stele({ children, className }: SteleProps) {
  return (
    <div className={className}>
      <svg
        viewBox="0 0 200 300"
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        <defs>
          {/* vertical sheen on the marble */}
          <linearGradient id="kw-stele-sheen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1a1a1f" />
            <stop offset="0.45" stopColor="#0e0e12" />
            <stop offset="1" stopColor="#050507" />
          </linearGradient>
          {/* side-lit highlight strip */}
          <linearGradient id="kw-stele-side" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="rgba(255,255,255,0.08)" />
            <stop offset="0.18" stopColor="rgba(255,255,255,0.0)" />
            <stop offset="0.82" stopColor="rgba(255,255,255,0.0)" />
            <stop offset="1" stopColor="rgba(0,0,0,0.35)" />
          </linearGradient>
        </defs>
        {/* main slab */}
        <rect x="0" y="0" width="200" height="300" rx="10" ry="10" fill="url(#kw-stele-sheen)" />
        {/* mottle blobs (extremely subtle marble veining) */}
        <ellipse cx="50" cy="60" rx="80" ry="6" fill="rgba(245,177,199,0.014)" />
        <ellipse cx="160" cy="120" rx="70" ry="4" fill="rgba(245,177,199,0.012)" />
        <ellipse cx="80" cy="200" rx="90" ry="5" fill="rgba(245,177,199,0.013)" />
        <ellipse cx="150" cy="260" rx="65" ry="3" fill="rgba(245,177,199,0.011)" />
        {/* side lighting */}
        <rect x="0" y="0" width="200" height="300" rx="10" ry="10" fill="url(#kw-stele-side)" />
        {/* faint inscription frame on the bottom (epitaph rests here) */}
        <line x1="20" y1="262" x2="180" y2="262" stroke="rgba(245,177,199,0.18)" strokeWidth="0.5" />
      </svg>
      {children}
    </div>
  );
}
