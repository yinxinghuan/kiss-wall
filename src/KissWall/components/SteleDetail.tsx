// Full-screen detail view of a sealed stele. Tap a wall card to open this.
// Shows the silhouette ghost (full reveal), the kiss cluster, the italic
// epitaph engraved at the base, author chip (tap → Aigram profile), and
// three reaction buttons (mourn / sit with / bless).

import { useState } from 'react';
import { Lip } from '../assets/lips';
import { SilhouetteShape } from '../assets/silhouettes';
import { BackIcon, BrokenHeartIcon, CandleIcon, RoseIcon } from '../assets/icons';
import { openAigramProfile } from '@shared/runtime/bridge';
import { useGameEvent } from '@shared/runtime/useGameEvent';
import type { WallEntry } from '../types';
import { t } from '../i18n';

interface SteleDetailProps {
  entry: WallEntry;
  isMine: boolean;
  onBack: () => void;
}

export function SteleDetail({ entry, isMine, onBack }: SteleDetailProps) {
  const [reactions, setReactions] = useState({
    heart: false,
    candle: false,
    rose: false,
  });
  const event = useGameEvent();

  function toggle(kind: 'heart' | 'candle' | 'rose') {
    if (reactions[kind]) return;  // increment-only per platform contract
    setReactions(r => ({ ...r, [kind]: true }));
    // Attach a spec-compliant notify when honoring someone else's stele.
    // Steles are rendered in DOM (silhouette SVG + lip stamps), so we
    // have no raster asset to attach as ref_url — omit image (it's
    // optional per spec). The notification falls back to game icon +
    // platform avatar + text.
    const tmpl =
      kind === 'heart'  ? '{sender_name} mourned at your stele.' :
      kind === 'candle' ? '{sender_name} sat with your stele.' :
                          '{sender_name} laid a rose on your stele.';
    const config = !isMine && entry.userId
      ? {
          actions: [
            {
              type: 'notify',
              target_user_id: entry.userId,
              message: { template: tmpl, variables: ['sender_name'] },
            },
          ],
        }
      : undefined;
    event.trigger(`reaction_${kind}`, config);
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
        <div className="kw-silhouette-layer" style={{ opacity: 0.55 }} aria-hidden="true">
          <SilhouetteShape id={entry.stele.silhouette} />
        </div>
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

      <div className="kw-detail__count">
        {entry.stele.kissCount} kisses
      </div>

      <div className="kw-detail__reactions">
        <button
          className={`kw-reaction${reactions.heart ? ' is-active' : ''}`}
          onClick={() => toggle('heart')}
          aria-label={t('react_heart')}
        >
          <BrokenHeartIcon size={22} />
          <span>{t('react_heart')}</span>
        </button>
        <button
          className={`kw-reaction${reactions.candle ? ' is-active' : ''}`}
          onClick={() => toggle('candle')}
          aria-label={t('react_candle')}
        >
          <CandleIcon size={22} />
          <span>{t('react_candle')}</span>
        </button>
        <button
          className={`kw-reaction${reactions.rose ? ' is-active' : ''}`}
          onClick={() => toggle('rose')}
          aria-label={t('react_rose')}
        >
          <RoseIcon size={22} />
          <span>{t('react_rose')}</span>
        </button>
      </div>
    </div>
  );
}
