// Cross-user wall view — recent sealed stelae merged across the
// 6 most-recent users + the player's own history. The merge avoids
// the "I sealed but my stele isn't on the wall yet" gap that the
// debounced cloud save (~1s + RTT) opens.

import { useMemo } from 'react';
import { useWall, isSelf } from '../hooks/useWall';
import { SteleCard } from './SteleCard';
import { BackIcon } from '../assets/icons';
import { openAigramProfile } from '@shared/runtime/bridge';
import type { SealedStele, WallEntry } from '../types';
import { t } from '../i18n';

interface WallViewProps {
  /** Player's own sealed steles — merged in to surface a just-
   *  sealed stele before cloud sync catches up. */
  mine?: SealedStele[];
  onBack: () => void;
  onOpenDetail: (entry: WallEntry) => void;
}

export function WallView({ mine = [], onBack, onOpenDetail }: WallViewProps) {
  const { entries: cloudEntries, loaded } = useWall();

  // Optimistic merge — own steles first (newest sealedAt anchors
  // them at the top), dedupe by stele.id with cloud, sort the union.
  const entries: WallEntry[] = useMemo(() => {
    const cloudIds = new Set(cloudEntries.map(e => e.stele.id));
    const selfEntries: WallEntry[] = mine
      .filter(s => !cloudIds.has(s.id))
      .map(s => ({
        userId: 'self',
        userName: undefined,
        userAvatarUrl: undefined,
        stele: s,
      }));
    return [...selfEntries, ...cloudEntries].sort(
      (a, b) => (b.stele.sealedAt ?? 0) - (a.stele.sealedAt ?? 0),
    );
  }, [cloudEntries, mine]);

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
            onClick={() => onOpenDetail(entry)}
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
