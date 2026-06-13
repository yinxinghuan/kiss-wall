// Full-screen detail view of a sealed stele. Tap a wall card to open this.
//
// v3 — primary visual is the AI-generated portrait (if present); kisses still
// overlay on top as the player's gestural signature. Below the portrait, an
// italic epitaph. The detail page now has ONE primary social action — KISS
// BACK — which opens the kiss-back canvas on top of this portrait. The ♥
// reaction is kept as a low-friction notify ("breathed beside it").

import { useState } from 'react';
import { Lip } from '../assets/lips';
import { SilhouetteShape } from '../assets/silhouettes';
import { BackIcon, BrokenHeartIcon } from '../assets/icons';
import { openAigramProfile } from '@shared/runtime/bridge';
import { useGameEvent } from '@shared/runtime/useGameEvent';
import type { WallEntry } from '../types';
import { t } from '../i18n';

interface SteleDetailProps {
  entry: WallEntry;
  isMine: boolean;
  onBack: () => void;
  /** Open the kiss-back canvas on top of this stele. Hidden when isMine
   *  (you can't kiss your own portrait back). */
  onKissBack?: () => void;
}

export function SteleDetail({ entry, isMine, onBack, onKissBack }: SteleDetailProps) {
  const [hearted, setHearted] = useState(false);
  const event = useGameEvent();
  const portrait = entry.stele.portraitUrl;
  const parent = entry.stele.kissBackOf;

  function heart() {
    if (hearted) return;
    setHearted(true);
    const config = !isMine && entry.userId
      ? {
          actions: [
            {
              type: 'notify',
              target_user_id: entry.userId,
              message: {
                template: '{sender_name} breathed beside your portrait.',
                variables: ['sender_name'],
              },
            },
          ],
        }
      : undefined;
    event.trigger('reaction_heart', config);
  }

  return (
    <div className="kw-detail">
      <div className="kw-detail__head">
        <button className="kw-icon-btn" onClick={onBack} aria-label={t('back')}>
          <BackIcon size={22} />
        </button>
        <button
          className="kw-detail__author"
          onClick={isMine ? undefined : () => openAigramProfile(entry.userId)}
          disabled={isMine}
          aria-label={t('inscribed_by')}
        >
          {entry.userAvatarUrl ? (
            <img className="kw-detail__avatar" src={entry.userAvatarUrl} alt="" />
          ) : (
            <div className="kw-detail__avatar kw-detail__avatar--blank" />
          )}
          <span className="kw-detail__name">
            {isMine ? 'you' : (entry.userName ?? 'someone')}
          </span>
        </button>
        <div className="kw-icon-btn kw-icon-btn--ghost" />
      </div>

      <div className="kw-detail__stage">
        {portrait ? (
          <img
            className="kw-detail__portrait"
            src={portrait}
            alt=""
            draggable={false}
          />
        ) : (
          <div className="kw-silhouette-layer" style={{ opacity: 0.55 }} aria-hidden="true">
            <SilhouetteShape id={entry.stele.silhouette} />
          </div>
        )}
        <div className="kw-detail__kisses">
          {entry.stele.kisses.map(k => (
            <div
              key={k.id}
              className="kw-kiss"
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
        <div className="kw-detail__epitaph">{entry.stele.epitaph}</div>
      </div>

      {parent && (
        <div className="kw-detail__lineage">
          {t('layered_over')} {parent.authorName ?? 'someone'}
        </div>
      )}

      <div className="kw-detail__count">
        {entry.stele.kissCount} kisses
      </div>

      <div className="kw-detail__actions">
        <button
          className={`kw-reaction${hearted ? ' is-active' : ''}`}
          onClick={heart}
          aria-label={t('react_heart')}
        >
          <BrokenHeartIcon size={20} />
          <span>{t('react_heart')}</span>
        </button>
        {!isMine && onKissBack && (
          <button
            className="kw-btn kw-btn--seal kw-btn--kissback"
            onClick={onKissBack}
          >
            {t('kiss_back')}
          </button>
        )}
      </div>
    </div>
  );
}
