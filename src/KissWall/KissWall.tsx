import { useEffect, useRef, useState } from 'react';
import { DarkCanvas } from './components/DarkCanvas';
import { WallView } from './components/WallView';
import { SteleDetail } from './components/SteleDetail';
import { useKissWall, type KissBackContext } from './hooks/useKissWall';
import { isSelf } from './hooks/useWall';
import { installGlobalTapFeedback } from './utils/audio';
import { WallIcon } from './assets/icons';
import { t } from './i18n';
import type { SealedStele, WallEntry } from './types';
import './KissWall.less';

type Screen = 'stele' | 'wall' | 'stele-detail';

interface FlourishSlot { id: number; line: string; }

export default function KissWall() {
  const [screen, setScreen] = useState<Screen>('stele');
  const [detailEntry, setDetailEntry] = useState<WallEntry | null>(null);
  const [parentKisses, setParentKisses] = useState<SealedStele['kisses']>([]);
  /** Single fixed-position flourish slot near the top of the screen. Every
   *  new kiss replaces the line; we bump `id` so React re-mounts the node
   *  and the fade-in animation re-runs. */
  const [flourish, setFlourish] = useState<FlourishSlot | null>(null);
  const flourishIdxRef = useRef(0);
  const flourishKeyRef = useRef(0);

  const {
    kisses, firstTouched,
    addKiss, reset,
    portraitUrl, bloomed, developing, failed, reachedTarget,
    realKissCount,
    lifetime, lastSealed,
    history,
    kissBackParent, setKissBackParent,
  } = useKissWall();

  // global tap feedback — one delegated listener, kiss surface opts out via data-no-feedback
  useEffect(() => {
    const teardown = installGlobalTapFeedback();
    return teardown;
  }, []);

  // Replace the single fixed-slot flourish on every new kiss. We pick a
  // random line from the pool (skipping the previous one to avoid an
  // immediate repeat) so the copy doesn't feel like a fixed loop.
  const lastKissCountRef = useRef(0);
  const lastFlourishLineRef = useRef<string | null>(null);
  useEffect(() => {
    if (kisses.length <= lastKissCountRef.current) {
      lastKissCountRef.current = kisses.length;
      return;
    }
    const last = kisses[kisses.length - 1];
    lastKissCountRef.current = kisses.length;
    if (!last || last.isDemo || last.transient || last.erasing) return;
    if (bloomed) return;
    const pool = t('flourishes').split('|');
    let line: string;
    for (let i = 0; i < 4; i++) {
      line = pool[Math.floor(Math.random() * pool.length)];
      if (line !== lastFlourishLineRef.current) break;
    }
    line = line!;
    lastFlourishLineRef.current = line;
    flourishKeyRef.current += 1;
    flourishIdxRef.current += 1;
    setFlourish({ id: flourishKeyRef.current, line });
  }, [kisses, bloomed]);

  function openKissBack(entry: WallEntry) {
    if (isSelf(entry)) return;
    const parent: KissBackContext = {
      steleId: entry.stele.id,
      authorId: entry.userId,
      authorName: entry.userName,
      authorAvatarUrl: entry.userAvatarUrl,
      parentPortraitUrl: entry.stele.portraitUrl,
      parentSilhouette: entry.stele.silhouette,
    };
    setParentKisses(entry.stele.kisses);
    reset();
    setKissBackParent(parent);
    setScreen('stele');
  }

  function onAgain() {
    setKissBackParent(null);
    setParentKisses([]);
    setFlourish(null);
    lastFlourishLineRef.current = null;
    flourishIdxRef.current = 0;
    lastKissCountRef.current = 0;
    reset();
    setScreen('stele');
  }

  const isKissBack = !!kissBackParent;
  const hint = isKissBack ? t('hint_kissback') : t('hint_tap_v2');

  // HUD: 3 states — empty (pre-touch) / counting (developing) / done (bloomed).
  let hudTitle: string;
  let hudCount: string;
  if (bloomed && portraitUrl) {
    hudTitle = t('portrait_label');
    hudCount = t('portrait_label_n', { n: lastSealed?.kissCount ?? realKissCount });
  } else if (isKissBack) {
    hudTitle = `${t('kissing_back')} ${kissBackParent?.authorName ?? 'someone'}`;
    hudCount = developing && reachedTarget
      ? t('curtain_finishing')
      : t('kisses_n', { n: realKissCount });
  } else {
    hudTitle = 'KISS · WALL';
    hudCount = realKissCount === 0
      ? (lifetime.totalKisses > 0 ? `${lifetime.totalKisses} ever` : '—')
      : developing && reachedTarget
        ? t('curtain_finishing')
        : t('kisses_n', { n: realKissCount });
  }

  return (
    <div className="kw-app">
      {screen === 'stele' && (
        <div className={`kw-screen kw-screen--stele${isKissBack ? ' kw-screen--kissback' : ''}`}>
          <DarkCanvas
            kisses={kisses}
            portraitUrl={portraitUrl}
            bloomed={bloomed}
            firstTouched={firstTouched}
            hint={hint}
            onTap={addKiss}
            epitaph={lastSealed?.epitaph ?? null}
            parentBackdropUrl={isKissBack ? kissBackParent?.parentPortraitUrl ?? null : null}
            ghostKisses={isKissBack ? parentKisses : undefined}
          />

          {/* Fixed-slot flourish — single line near the top, replaced on
              each kiss. We key on flourish.id so React re-mounts and the
              CSS fade-in animation re-fires. */}
          {flourish && !bloomed && (
            <div className="kw-flourish-slot" key={flourish.id} aria-hidden="true">
              {flourish.line}
            </div>
          )}

          {/* Gen-image failed — visible state so the player isn't stuck. */}
          {failed && bloomed && (
            <div className="kw-fail">{t('portrait_failed')}</div>
          )}

          {/* ─── HUD ───────────────────────────────────────────────────── */}
          <div className="kw-hud">
            <div className="kw-hud__title">{hudTitle}</div>
            <div className="kw-hud__count">{hudCount}</div>

            <div className="kw-hud__actions">
              {bloomed && (
                <>
                  <button className="kw-btn kw-btn--ghost" onClick={onAgain}>
                    {t('again')}
                  </button>
                  <button
                    className="kw-btn kw-btn--seal"
                    onClick={() => setScreen('wall')}
                  >
                    {t('open_wall')}
                  </button>
                </>
              )}
              {!bloomed && !firstTouched && (
                <button
                  className="kw-icon-btn kw-icon-btn--solo"
                  onClick={() => setScreen('wall')}
                  aria-label={t('open_wall')}
                >
                  <WallIcon size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {screen === 'wall' && (
        <WallView
          mine={history}
          onBack={() => setScreen('stele')}
          onOpenDetail={(entry) => {
            setDetailEntry(entry);
            setScreen('stele-detail');
          }}
        />
      )}

      {screen === 'stele-detail' && detailEntry && (
        <SteleDetail
          entry={detailEntry}
          isMine={isSelf(detailEntry)}
          onBack={() => {
            setScreen('wall');
            setDetailEntry(null);
          }}
          onKissBack={() => {
            const e = detailEntry;
            setDetailEntry(null);
            openKissBack(e);
          }}
        />
      )}

      <img
        src={`${import.meta.env.BASE_URL}alteru.svg`}
        alt=""
        className="kw-watermark"
        aria-hidden="true"
      />
    </div>
  );
}
