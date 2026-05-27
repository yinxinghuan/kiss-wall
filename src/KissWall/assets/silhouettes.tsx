// 8 silhouettes that gradually emerge under the kiss stele.
// All use viewBox "0 0 200 300", single fill applied by parent (bone-white
// #f0eedb at very low alpha, deepening as kisses accumulate nearby).
// Paths are designed to read at 5-15% alpha (faint apparition) AND at full
// reveal (recognizable monument carving).
//
// Random pick is seeded per-session in useKissWall so a player gets the same
// silhouette across a single stele (and the wall records which one).

import type { ReactNode } from 'react';

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

const SkullSVG = (
  <path
    fillRule="evenodd"
    d="
      M 95 56
      Q 56 60 40 92
      Q 28 124 32 158
      Q 35 188 50 210
      Q 60 224 75 232
      L 78 248
      L 92 250
      L 96 240
      L 110 240
      L 114 250
      L 128 248
      L 132 232
      L 144 232
      L 150 226
      L 155 220
      L 162 220
      L 167 214
      L 172 204
      L 175 192
      L 178 178
      L 179 160
      L 178 140
      L 174 116
      L 165 92
      Q 150 64 120 58
      Q 105 55 95 56
      Z
      M 138 118
      a 13 11 0 1 0 0 0.1
      Z
      M 162 148
      L 178 156
      L 168 166
      L 158 158
      Z
    "
  />
);

const HeartSVG = (
  <g>
    {/* aortic arch + superior vena cava on top */}
    <path
      d="
        M 100 50
        Q 86 35 76 38
        Q 65 42 70 60
        L 76 80
        Q 70 70 60 75
        Q 50 82 58 96
        L 70 110
        Q 55 100 45 112
        Q 35 128 48 146
        L 60 162
        Q 50 180 56 200
        Q 64 222 86 238
        Q 100 248 110 248
        Q 130 246 146 232
        Q 162 214 166 192
        Q 168 174 158 158
        Q 168 150 168 138
        Q 166 122 154 116
        Q 160 108 158 96
        Q 152 82 138 84
        Q 142 70 132 60
        Q 122 50 110 56
        Q 104 50 100 50
        Z
      "
    />
    {/* left atrium bulge */}
    <ellipse cx="70" cy="125" rx="14" ry="18" />
    {/* right atrium bulge */}
    <ellipse cx="148" cy="118" rx="12" ry="16" />
  </g>
);

const BustSVG = (
  <path
    fillRule="evenodd"
    d="
      M 80 50
      Q 60 56 56 80
      Q 52 100 60 116
      Q 50 130 56 144
      L 64 158
      L 68 174
      Q 64 182 68 188
      L 76 188
      L 72 200
      Q 72 216 84 222
      L 88 232
      Q 75 240 60 250
      Q 38 264 30 290
      L 200 290
      L 200 280
      Q 196 268 178 256
      Q 158 246 138 240
      L 134 230
      Q 130 224 128 214
      L 128 200
      Q 138 192 140 178
      L 144 162
      Q 152 150 148 134
      Q 156 120 150 102
      Q 146 80 130 64
      Q 110 50 90 50
      Q 84 50 80 50
      Z
      M 90 138
      a 5 4 0 1 0 0 0.1
      Z
    "
  />
);

const EyeSVG = (
  <g>
    {/* almond eye outline */}
    <path
      fillRule="evenodd"
      d="
        M 20 150
        Q 50 100 100 96
        Q 150 100 180 150
        Q 150 200 100 204
        Q 50 200 20 150
        Z
        M 100 116
        a 32 32 0 1 0 0 0.1
        Z
      "
    />
    {/* iris dot inside the cutout */}
    <circle cx="100" cy="150" r="14" />
    {/* upper lashes */}
    <path d="M 38 134 L 30 116 M 58 116 L 50 96 M 82 110 L 78 88 M 118 110 L 122 88 M 142 116 L 150 96 M 162 134 L 170 116" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
    {/* mascara tear streak from outer corner */}
    <path d="M 174 158 Q 170 200 165 240 Q 162 260 158 280" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    <ellipse cx="160" cy="278" rx="4" ry="6" />
  </g>
);

const HandSVG = (
  <path
    d="
      M 100 270
      Q 60 264 56 220
      Q 54 192 64 174
      L 60 130
      Q 58 110 70 108
      Q 82 110 84 126
      L 86 168
      L 90 168
      L 92 96
      Q 92 80 104 78
      Q 116 80 116 96
      L 118 168
      L 122 168
      L 124 90
      Q 124 74 134 74
      Q 144 76 144 92
      L 146 168
      L 150 168
      L 152 110
      Q 154 96 164 96
      Q 172 98 172 112
      L 170 168
      Q 174 174 172 192
      Q 172 220 162 244
      Q 148 268 120 274
      Q 108 276 100 270
      Z
    "
  />
);

const RoseSVG = (
  <g>
    {/* rose head — overlapping petals */}
    <path
      d="
        M 100 30
        Q 70 30 60 56
        Q 50 78 60 96
        Q 50 108 56 124
        Q 64 138 80 138
        Q 76 152 92 156
        Q 100 160 108 156
        Q 122 152 120 138
        Q 138 138 144 122
        Q 150 108 142 94
        Q 152 78 140 56
        Q 130 30 100 30
        Z
      "
    />
    {/* inner petal swirl */}
    <path
      d="
        M 100 60
        Q 86 70 84 84
        Q 86 100 100 100
        Q 116 98 116 84
        Q 116 70 100 60
        Z
      "
      fill="rgba(0,0,0,0.25)"
    />
    {/* sepals */}
    <path d="M 78 138 Q 70 152 80 162 Q 88 156 92 144 Z" />
    <path d="M 122 138 Q 130 152 120 162 Q 112 156 108 144 Z" />
    {/* long stem */}
    <path d="M 96 158 L 96 278 L 104 278 L 104 158 Z" />
    {/* leaf left */}
    <path d="M 96 200 Q 60 196 50 220 Q 70 230 96 218 Z" />
    {/* leaf right */}
    <path d="M 104 240 Q 140 236 150 260 Q 130 270 104 258 Z" />
    {/* thorns */}
    <path d="M 96 184 L 86 178 L 96 188 Z" />
    <path d="M 104 224 L 114 218 L 104 228 Z" />
    <path d="M 96 260 L 86 254 L 96 264 Z" />
  </g>
);

const VeilSVG = (
  <g>
    {/* face oval */}
    <ellipse cx="100" cy="148" rx="62" ry="84" />
    {/* veil hem hanging below */}
    <path d="M 38 148 Q 30 220 50 280 L 150 280 Q 170 220 162 148 Z" />
    {/* lace dots punched into veil — using bg-color via mask isn't ideal, but
        we draw them as cut-out via white circles overlapped at lower z */}
  </g>
);

const VeilLaceOverlay = (
  // pattern of small dots to overlay the veil — drawn in stele-bg color
  // (rendered separately in Silhouette wrapper so it sits above the silhouette
  // fill but uses bg color, making lace holes)
  <g pointerEvents="none">
    {Array.from({ length: 11 * 9 }).map((_, i) => {
      const col = i % 11;
      const row = Math.floor(i / 11);
      const cx = 40 + col * 12 + (row % 2 ? 6 : 0);
      const cy = 80 + row * 22;
      // clip to oval+veil silhouette roughly: only draw if within bounding shape
      const inFace = Math.pow((cx - 100) / 62, 2) + Math.pow((cy - 148) / 84, 2) <= 1;
      const inVeil = cy >= 148 && cy <= 280 && cx >= 38 && cx <= 162;
      if (!inFace && !inVeil) return null;
      return <circle key={i} cx={cx} cy={cy} r="2.4" fill="#07070a" />;
    })}
  </g>
);

const WingsSVG = (
  <g>
    {/* left wing */}
    <path
      d="
        M 100 70
        Q 60 64 40 96
        Q 24 132 32 168
        Q 38 196 56 218
        Q 70 232 92 240
        L 100 240
        L 100 70
        Z
      "
    />
    {/* right wing */}
    <path
      d="
        M 100 70
        Q 140 64 160 96
        Q 176 132 168 168
        Q 162 196 144 218
        Q 130 232 108 240
        L 100 240
        L 100 70
        Z
      "
    />
    {/* feather strokes left */}
    <path d="M 92 100 Q 70 108 56 134 M 92 130 Q 64 140 50 168 M 92 160 Q 60 174 50 198 M 96 192 Q 76 210 84 232" stroke="rgba(0,0,0,0.35)" strokeWidth="2" fill="none" strokeLinecap="round" />
    {/* feather strokes right */}
    <path d="M 108 100 Q 130 108 144 134 M 108 130 Q 136 140 150 168 M 108 160 Q 140 174 150 198 M 104 192 Q 124 210 116 232" stroke="rgba(0,0,0,0.35)" strokeWidth="2" fill="none" strokeLinecap="round" />
  </g>
);

const REGISTRY: Record<SilhouetteId, ReactNode> = {
  skull: SkullSVG,
  heart: HeartSVG,
  bust: BustSVG,
  eye: EyeSVG,
  hand: HandSVG,
  rose: RoseSVG,
  veil: VeilSVG,
  wings: WingsSVG,
};

/** Raw silhouette shape content (<g>, paths, etc) — designed to drop into an
 *  outer <svg viewBox="0 0 200 300"> so the caller can compose masks and
 *  overlays around it. The veil silhouette has an accompanying lace overlay;
 *  caller should render `<VeilOverlay />` alongside it when id === 'veil'. */
export function SilhouetteShape({
  id,
  color = '#f0eedb',
}: {
  id: SilhouetteId;
  color?: string;
}) {
  return <g fill={color} color={color}>{REGISTRY[id]}</g>;
}

/** Lace dot overlay that punches holes in the veil silhouette. Should be
 *  rendered AFTER the silhouette shape so dots sit on top. */
export function VeilOverlay() {
  return VeilLaceOverlay;
}

interface SilhouetteProps {
  id: SilhouetteId;
  /** 0 → invisible. 1 → fully revealed. Caller controls. */
  alpha: number;
  /** Optional fill color (default bone-white). */
  color?: string;
}

export function Silhouette({ id, alpha, color = '#f0eedb' }: SilhouetteProps) {
  return (
    <svg
      viewBox="0 0 200 300"
      preserveAspectRatio="xMidYMid meet"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        opacity: alpha,
        transition: 'opacity 0.5s ease-out',
        pointerEvents: 'none',
        color,
      }}
      aria-hidden="true"
    >
      <g fill={color}>{REGISTRY[id]}</g>
      {id === 'veil' ? VeilLaceOverlay : null}
    </svg>
  );
}

export function pickSilhouette(seed?: number): SilhouetteId {
  const r = seed != null ? seed : Math.random();
  const i = Math.floor((r % 1 + 1) % 1 * SILHOUETTE_IDS.length);
  return SILHOUETTE_IDS[i];
}
