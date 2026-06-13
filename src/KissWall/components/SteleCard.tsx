// Wall card — v3. Primary visual is the AI-generated portrait when present;
// otherwise we fall back to the old silhouette-ghost + kiss overlay for
// pre-AI saves. A small "duet" badge tags kiss-back portraits.

import { Lip } from '../assets/lips';
import { SilhouetteShape } from '../assets/silhouettes';
import type { SealedStele } from '../types';
import { t } from '../i18n';

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
      <div className="kw-card__canvas">
        {stele.portraitUrl ? (
          <img
            className="kw-card__portrait"
            src={stele.portraitUrl}
            alt=""
            loading="lazy"
            draggable={false}
          />
        ) : (
          <div
            className="kw-silhouette-layer"
            style={{ opacity: 0.5 }}
            aria-hidden="true"
          >
            <SilhouetteShape id={stele.silhouette} />
          </div>
        )}
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
        {stele.kissBackOf && (
          <div className="kw-card__badge">{t('duet')}</div>
        )}
      </div>
      <div className="kw-epitaph kw-epitaph--mini">{stele.epitaph}</div>
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
