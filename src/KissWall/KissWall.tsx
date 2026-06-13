import { useEffect, useState } from 'react';
import { DarkCanvas } from './components/DarkCanvas';
import { WallView } from './components/WallView';
import { SteleDetail } from './components/SteleDetail';
import { useKissWall, type KissBackContext } from './hooks/useKissWall';
import { isSelf } from './hooks/useWall';
import { installGlobalTapFeedback } from './utils/audio';
import { WallIcon } from './assets/icons';
import { Lip } from './assets/lips';
import { t } from './i18n';
import type { SealedStele, WallEntry } from './types';
import './KissWall.less';

type Screen = 'stele' | 'wall' | 'stele-detail' | 'kiss-back';

export default function KissWall() {
  const [screen, setScreen] = useState<Screen>('stele');
  const [detailEntry, setDetailEntry] = useState<WallEntry | null>(null);
  /** Set when we open the kiss-back canvas. Drives the seal flow + the
   *  backdrop image + the ghost kisses echoed under the player's. */
  const [kissBack, setKissBack] = useState<KissBackContext | null>(null);
  /** Cached parent kiss positions used as ghost echo in the kiss-back canvas. */
  const [parentKisses, setParentKisses] = useState<SealedStele['kisses']>([]);

  const {
    kisses, silhouette, firstTouched,
    demoFingerNx, demoFingerNy,
    addKiss,
    canSeal, sealing, sealStage, seal, reset,
    lifetime, lastSealed, realKissCount,
    silhouetteAlpha,
    history,
  } = useKissWall();

  // global tap feedback — one delegated listener, kiss surface opts out via data-no-feedback
  useEffect(() => {
    const teardown = installGlobalTapFeedback();
    return teardown;
  }, []);

  function openKissBack(entry: WallEntry) {
    if (isSelf(entry)) return;
    setKissBack({
      steleId: entry.stele.id,
      authorId: entry.userId,
      authorName: entry.userName,
      authorAvatarUrl: entry.userAvatarUrl,
      parentPortraitUrl: entry.stele.portraitUrl,
      parentSilhouette: entry.stele.silhouette,
    });
    setParentKisses(entry.stele.kisses);
    reset();
    setScreen('kiss-back');
  }

  async function doSeal() {
    const sealed = await seal(kissBack ?? undefined);
    if (!sealed) return;
    // After a seal we land on the same screen — the just-sealed portrait
    // gets revealed beneath the kiss cluster. The user can choose Again
    // (new stele) or Wall (see it land + others'). For kiss-back, we also
    // clear the parent context after the seal completes so re-tapping
    // "Again" starts a fresh solo session.
  }

  function onAgain() {
    setKissBack(null);
    setParentKisses([]);
    reset();
    setScreen('stele');
  }

  // ── Solo stele OR kiss-back canvas — same surface, different props ──────
  const isKissBack = screen === 'kiss-back';
  const canvasSilhouette = kissBack?.parentSilhouette ?? silhouette;
  const canvasBackdrop = isKissBack ? kissBack?.parentPortraitUrl ?? null : null;

  return (
    <div className="kw-app">
      {(screen === 'stele' || screen === 'kiss-back') && (
        <div className={`kw-screen kw-screen--stele${isKissBack ? ' kw-screen--kissback' : ''}`}>
          <DarkCanvas
            kisses={kisses}
            silhouette={canvasSilhouette}
            silhouetteAlpha={lastSealed?.portraitUrl ? 0 : silhouetteAlpha}
            firstTouched={firstTouched}
            demoFingerNx={demoFingerNx}
            demoFingerNy={demoFingerNy}
            onTap={addKiss}
            epitaph={lastSealed?.epitaph ?? null}
            backdropUrl={canvasBackdrop}
            ghostKisses={isKissBack ? parentKisses : undefined}
          />

          {/* Revealed AI portrait — replaces the dark canvas after seal */}
          {lastSealed?.portraitUrl && (
            <img
              className="kw-reveal-portrait"
              src={lastSealed.portraitUrl}
              alt=""
              draggable={false}
            />
          )}
          {/* Gen-image failed — explicit visible state so the player doesn't
              wonder why they're looking at the old silhouette. */}
          {lastSealed && !lastSealed.portraitUrl && (
            <div className="kw-fail">{t('portrait_failed')}</div>
          )}

          {/* ─── HUD ───────────────────────────────────────────────────── */}
          <div className="kw-hud">
            <div className="kw-hud__title">
              {lastSealed?.portraitUrl
                ? t('portrait_label')
                : isKissBack
                  ? `${t('kissing_back')} ${kissBack?.authorName ?? 'someone'}`
                  : 'KISS · WALL'}
            </div>
            <div className="kw-hud__count">
              {lastSealed?.portraitUrl
                ? t('portrait_label_n', { n: lastSealed.kissCount })
                : realKissCount === 0
                  ? (lifetime.totalKisses > 0 ? `${lifetime.totalKisses} ever` : '—')
                  : t('kisses_n', { n: realKissCount })}
            </div>

            <div className="kw-hud__actions">
              {!lastSealed && canSeal && (
                <button
                  className="kw-btn kw-btn--seal"
                  onClick={() => { void doSeal(); }}
                  disabled={sealing}
                >
                  {isKissBack ? t('seal_kissback') : t('seal_cta')}
                </button>
              )}
              {lastSealed && (
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
              {!lastSealed && !canSeal && (
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

          {/* ─── Sealing curtain ──────────────────────────────────────── */}
          {/* The player just tapped DEVELOP. For 5–8s we have to make them
              feel a portrait is being CREATED FROM THEIR KISSES — not just
              "loading…". So we lift their actual kiss marks off the canvas,
              float them toward a heartbeat, and tell them what's happening. */}
          {sealing && (
            <div className="kw-curtain">
              <div className="kw-curtain__sucked" aria-hidden="true">
                {kisses
                  .filter(k => !k.isDemo && !k.transient && !k.erasing)
                  .map((k, i) => (
                    <div
                      key={k.id}
                      className="kw-kiss kw-kiss--suck"
                      style={{
                        left: `${k.nx * 100}%`,
                        top: `${k.ny * 100}%`,
                        ['--kw-rot' as string]: `${k.rot}deg`,
                        ['--kw-scale' as string]: `${k.scale}`,
                        ['--kw-alpha' as string]: `${k.alpha}`,
                        animationDelay: `${i * 70}ms`,
                      }}
                    >
                      <Lip variant={k.variant} />
                    </div>
                  ))}
              </div>
              <div className="kw-curtain__heart" aria-hidden="true" />
              <div className="kw-curtain__line">
                {sealStage === 'engraving'
                  ? t('curtain_engraving')
                  : sealStage === 'finishing'
                    ? t('curtain_finishing')
                    : t('curtain_developing')}
              </div>
              <div className="kw-curtain__sub">
                {t('curtain_subtitle', { n: realKissCount })}
              </div>
              <div className="kw-curtain__bar" aria-hidden="true">
                <div className="kw-curtain__bar-fill" />
              </div>
            </div>
          )}
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
