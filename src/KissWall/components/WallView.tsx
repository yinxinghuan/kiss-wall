// Cross-user wall view — last 6 sealed stelae from other players.

import { useWall, isSelf } from '../hooks/useWall';
import { SteleCard } from './SteleCard';
import { BackIcon } from '../assets/icons';
import { openAigramProfile } from '@shared/runtime/bridge';
import { t } from '../i18n';

interface WallViewProps {
  onBack: () => void;
}

export function WallView({ onBack }: WallViewProps) {
  const { entries, loaded } = useWall();

  return (
    <div className="kw-wall">
      <div className="kw-wall__head">
        <button className="kw-icon-btn" onClick={onBack} aria-label={t('back')}>
          <BackIcon size={22} />
        </button>
        <div className="kw-wall__title">{t('wall_title')}</div>
        <div className="kw-icon-btn kw-icon-btn--ghost" />
      </div>

      {!loaded && (
        <div className="kw-wall__state">{t('wall_loading')}</div>
      )}
      {loaded && entries.length === 0 && (
        <div className="kw-wall__state">{t('wall_empty')}</div>
      )}

      <div className="kw-wall__grid">
        {entries.map(entry => (
          <SteleCard
            key={`${entry.userId}-${entry.stele.id}`}
            stele={entry.stele}
            authorName={isSelf(entry) ? 'you' : entry.userName}
            authorAvatarUrl={entry.userAvatarUrl}
            onAuthorClick={
              entry.userId && !isSelf(entry)
                ? () => openAigramProfile(entry.userId)
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}
