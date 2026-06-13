import type { SilhouetteId } from './assets/silhouettes';

export type { SilhouetteId };

export interface Kiss {
  id: string;
  /** 0..1, relative to silhouette/canvas bounds (0,0 = top-left) */
  nx: number;
  ny: number;
  variant: number;   // 0..5 lip variant
  rot: number;       // degrees, -18..18
  scale: number;     // 0.78..1.12
  alpha: number;     // 0.7..1.0
  t: number;         // ms timestamp (perf)
  isDemo?: boolean;  // intro demo kiss, doesn't count
  /** Transient kisses (tapped outside silhouette) fade out in ~0.6s and
   *  are dropped from the kiss list. They never count toward seal/totals. */
  transient?: boolean;
  /** A previously-permanent kiss that's being erased as a penalty for a wrong
   *  tap. Animates out then gets dropped, same lifetime as a transient. */
  erasing?: boolean;
}

export interface SealedStele {
  id: string;
  silhouette: SilhouetteId;
  kisses: Kiss[];
  epitaph: string;
  sealedAt: number;
  kissCount: number;
  /** URL of the AI portrait generated from this seal's kiss signal. Optional
   *  for older saves (those fall back to the silhouette + kiss overlay). */
  portraitUrl?: string;
  /** Set on duet portraits produced by kiss-back. Points at the parent
   *  stele/author so the detail view can surface the lineage and the seal
   *  flow can fire a notify to the original author. */
  kissBackOf?: {
    steleId: string;
    authorId: string;
    authorName?: string;
    authorAvatarUrl?: string;
    parentPortraitUrl?: string;
  };
}

export interface KissWallSave {
  totalSealed: number;
  totalKisses: number;
  history: SealedStele[]; // newest first, capped to 10
  _lastActive?: number;
}

export interface WallEntry {
  userId: string;
  userName?: string;
  userAvatarUrl?: string;
  stele: SealedStele;
}

export type Screen = 'stele' | 'wall' | 'stele-detail';
