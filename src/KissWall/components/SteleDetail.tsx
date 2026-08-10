// Full-screen detail view of a sealed stele. Tap a wall card to open this.
//
// v3 — primary visual is the AI-generated portrait (if present); kisses still
// overlay on top as the player's gestural signature. Below the portrait, an
// italic epitaph. The detail page now has ONE primary social action — KISS
// BACK — which opens the kiss-back canvas on top of this portrait. The ♥
// reaction is kept as a low-friction notify ("breathed beside it").

import { useMemo, useState } from 'react';
import { Lip } from '../assets/lips';
import { SilhouetteShape } from '../assets/silhouettes';
import { BackIcon, BrokenHeartIcon, SendIcon } from '../assets/icons';
import { openAigramProfile, isInAigramNow, getTelegramId } from '@shared/runtime/bridge';
import { useGameEvent } from '@shared/runtime/useGameEvent';
import {
  threadFor,
  cleanText,
  timeAgo,
  type GuestMessage,
} from '@shared/social/guestbook';
import type { WallEntry } from '../types';
import { t, getLocale } from '../i18n';

const ALTERU_APP_URL = 'https://apps.apple.com/app/id6769646546';

interface SteleDetailProps {
  entry: WallEntry;
  isMine: boolean;
  onBack: () => void;
  /** Open the kiss-back canvas on top of this stele. Hidden when isMine
   *  (you can't kiss your own portrait back). */
  onKissBack?: () => void;
  /** Best-effort guestbook notes grouped by stele id (from the shared wall
   *  fetch). */
  messagesByTarget: Map<string, GuestMessage[]>;
  /** This player's own outgoing notes (for instant-echo merge). */
  myMessages: GuestMessage[];
  /** Leave a public note on this portrait. */
  onSendMessage: (entry: WallEntry, text: string) => void;
}

export function SteleDetail({
  entry,
  isMine,
  onBack,
  onKissBack,
  messagesByTarget,
  myMessages,
  onSendMessage,
}: SteleDetailProps) {
  const [hearted, setHearted] = useState(false);
  const [draft, setDraft] = useState('');
  const event = useGameEvent();
  const portrait = entry.stele.portraitUrl;
  const parent = entry.stele.kissBackOf;
  const myId = getTelegramId()! ? String(getTelegramId()!) : undefined;

  const thread = useMemo(
    () => threadFor(entry.stele.id, messagesByTarget, myMessages, myId),
    [entry.stele.id, messagesByTarget, myMessages, myId],
  );

  function send() {
    const clean = cleanText(draft);
    if (!clean) return;
    onSendMessage(entry, clean);
    setDraft('');
  }

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

      {/* ─── Guestbook: public notes on this portrait ─────────────────── */}
      <div className="kw-notes">
        <div className="kw-notes__title">{t('notes_title')}</div>

        {thread.length === 0 && (
          <div className="kw-notes__empty">{t('notes_empty')}</div>
        )}

        <div className="kw-notes__list">
          {thread.map(m => {
            const mine = !!myId && m.fromUserId === myId;
            return (
              <div className="kw-note" key={m.id}>
                <button
                  className="kw-note__who"
                  onClick={(e) => {
                    if (mine || !m.fromUserId) return;
                    e.stopPropagation();
                    openAigramProfile(m.fromUserId);
                  }}
                  disabled={mine || !m.fromUserId}
                >
                  {mine ? (
                    <div className="kw-note__avatar kw-note__avatar--me">
                      {t('notes_you')}
                    </div>
                  ) : m.userAvatarUrl ? (
                    <img className="kw-note__avatar" src={m.userAvatarUrl} alt="" />
                  ) : (
                    <div className="kw-note__avatar kw-note__avatar--blank">
                      {(m.userName ?? '?').slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </button>
                <div className="kw-note__body">
                  <div className="kw-note__meta">
                    <span className="kw-note__name">
                      {mine ? t('notes_you') : (m.userName ?? 'someone')}
                    </span>
                    <span className="kw-note__time">{timeAgo(m.ts, getLocale())}</span>
                  </div>
                  <div className="kw-note__text">{m.text}</div>
                </div>
              </div>
            );
          })}
        </div>

        {isInAigramNow() ? (
          <div className="kw-notes__compose">
            <input
              className="kw-notes__input"
              value={draft}
              maxLength={140}
              placeholder={t('notes_placeholder')}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
            />
            <button
              className="kw-notes__send"
              onClick={send}
              disabled={!cleanText(draft)}
              aria-label={t('notes_send')}
            >
              <SendIcon size={18} />
            </button>
          </div>
        ) : (
          <div className="kw-notes__hint kw-notes__download">
            <span>{t('notes_open_hint')}</span>
            <a href={ALTERU_APP_URL} target="_blank" rel="noopener noreferrer">
              {t('download_alteru')}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
