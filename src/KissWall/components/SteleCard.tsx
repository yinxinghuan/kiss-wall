// Compact rendering of a sealed stele for the wall grid. Recreates the
// stele + silhouette + kisses + epitaph at thumbnail size, no interaction.

import { Stele } from '../assets/Stele';
import { SilhouetteShape, VeilOverlay } from '../assets/silhouettes';
import { Lip } from '../assets/lips';
import type { SealedStele } from '../types';

interface SteleCardProps {
  stele: SealedStele;
  authorName?: string;
  authorAvatarUrl?: string;
  onClick?: () => void;
  onAuthorClick?: () => void;
}

export function SteleCard({
  stele,
  authorName,
  authorAvatarUrl,
  onClick,
  onAuthorClick,
}: SteleCardProps) {
  return (
    <div className="kw-card" onClick={onClick} role="button" tabIndex={0}>
      <div className="kw-card__stele">
        <Stele className="kw-stele kw-stele--mini">
          <svg
            viewBox="0 0 200 300"
            preserveAspectRatio="none"
            className="kw-stele__shape"
            aria-hidden="true"
          >
            <defs>
              <radialGradient id={`brush-${stele.id}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
                <stop offset="55%" stopColor="rgba(255,255,255,0.18)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </radialGradient>
              <mask id={`reveal-${stele.id}`} maskUnits="userSpaceOnUse">
                <rect x="0" y="0" width="200" height="300" fill="black" />
                {stele.kisses.map(k => (
                  <circle
                    key={k.id}
                    cx={k.nx * 200}
                    cy={k.ny * 300}
                    r="26"
                    fill={`url(#brush-${stele.id})`}
                  />
                ))}
              </mask>
            </defs>
            <g mask={`url(#reveal-${stele.id})`}>
              <SilhouetteShape id={stele.silhouette} />
              {stele.silhouette === 'veil' && <VeilOverlay />}
            </g>
          </svg>
          <div className="kw-card__kisses">
            {stele.kisses.map(k => (
              <div
                key={k.id}
                className="kw-kiss kw-kiss--mini"
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
          </div>
          <div className="kw-epitaph kw-epitaph--mini">{stele.epitaph}</div>
        </Stele>
      </div>
      <div
        className="kw-card__author"
        onClick={(e) => {
          if (onAuthorClick) {
            e.stopPropagation();
            onAuthorClick();
          }
        }}
      >
        {authorAvatarUrl ? (
          <img className="kw-card__avatar" src={authorAvatarUrl} alt="" />
        ) : (
          <div className="kw-card__avatar kw-card__avatar--blank" />
        )}
        <div className="kw-card__meta">
          <div className="kw-card__name">{authorName ?? 'someone'}</div>
          <div className="kw-card__count">{stele.kissCount} kisses</div>
        </div>
      </div>
    </div>
  );
}
