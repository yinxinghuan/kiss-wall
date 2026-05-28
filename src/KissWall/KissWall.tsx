import { useEffect, useState } from 'react';
import { DarkCanvas } from './components/DarkCanvas';
import { FramingCard } from './components/FramingCard';
import { WallView } from './components/WallView';
import { SteleDetail } from './components/SteleDetail';
import { useKissWall } from './hooks/useKissWall';
import { isSelf } from './hooks/useWall';
import { installGlobalTapFeedback } from './utils/audio';
import { WallIcon } from './assets/icons';
import { t } from './i18n';
import type { WallEntry } from './types';
import './KissWall.less';

type Screen = 'stele' | 'wall' | 'stele-detail';

export default function KissWall() {
  const [screen, setScreen] = useState<Screen>('stele');
  const [framingOpen, setFramingOpen] = useState(true);
  const [detailEntry, setDetailEntry] = useState<WallEntry | null>(null);
  const {
    kisses, silhouette, firstTouched,
    demoFingerNx, demoFingerNy,
    addKiss,
    canSeal, sealing, seal, reset,
    lifetime, lastSealed, realKissCount,
    silhouetteAlpha,
  } = useKissWall();

  // global tap feedback — one delegated listener, kiss surface opts out via data-no-feedback
  useEffect(() => {
    const teardown = installGlobalTapFeedback();
    return teardown;
  }, []);

  return (
    <div className="kw-app">
      {screen === 'stele' && (
        <div className="kw-screen kw-screen--stele">
          <DarkCanvas
            kisses={kisses}
            silhouette={silhouette}
            silhouetteAlpha={silhouetteAlpha}
            firstTouched={firstTouched}
            demoFingerNx={demoFingerNx}
            demoFingerNy={demoFingerNy}
            onTap={addKiss}
            epitaph={lastSealed?.epitaph ?? null}
          />

          {/* ─── HUD ───────────────────────────────────────────────────── */}
          <div className="kw-hud">
            <div className="kw-hud__title">KISS · WALL</div>
            <div className="kw-hud__count">
              {realKissCount === 0
                ? (lifetime.totalKisses > 0 ? `${lifetime.totalKisses} ever` : '—')
                : t('kisses_n', { n: realKissCount })}
            </div>

            <div className="kw-hud__actions">
              {!lastSealed && canSeal && (
                <button
                  className="kw-btn kw-btn--seal"
                  onClick={() => { void seal(); }}
                  disabled={sealing}
                >
                  {t('seal_cta')}
                </button>
              )}
              {lastSealed && (
                <>
                  <button className="kw-btn kw-btn--ghost" onClick={reset}>
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
          {sealing && (
            <div className="kw-curtain">
              <div className="kw-curtain__line">{t('sealing')}</div>
              <div className="kw-curtain__dots"><span /><span /><span /></div>
            </div>
          )}
        </div>
      )}

      {screen === 'wall' && (
        <WallView
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
        />
      )}

      {framingOpen && screen === 'stele' && (
        <FramingCard onDismiss={() => setFramingOpen(false)} />
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
