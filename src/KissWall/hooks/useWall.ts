// Fetch sealed steles across the 6 most-recent users.
//
// Each row's resource_data is a KissWallSave (cap 20 steles per
// user). We flatten ALL steles across ALL users, sort newest-first
// across authors by sealedAt, cap the display count, and resolve
// each unique user's profile once.
//
// We throttle at sealing (one stele per kiss session), never at
// display — older steles stay on the wall. See
// feedback_throttle_at_input_not_output.

import { useCallback, useEffect, useState } from 'react';
import {
  callAigramAPI,
  isInAigramNow,
  getTelegramId,
  type AigramResponse,
} from '@shared/runtime/bridge';
import { getGameUuid } from '@shared/runtime/game-id';
import {
  messagesByTarget as buildMessagesByTarget,
  type GuestMessage,
} from '@shared/social/guestbook';
import type { KissWallSave, SealedStele, WallEntry } from '../types';

interface SaveRow {
  user_id: string;
  time?: string;
  resource_data?: string;
}

export interface UseWall {
  entries: WallEntry[];
  /** Best-effort guestbook notes grouped by stele id (the artifact target). */
  messagesByTarget: Map<string, GuestMessage[]>;
  loaded: boolean;
  refresh: () => void;
}

export function useWall(): UseWall {
  const [entries, setEntries] = useState<WallEntry[]>([]);
  const [messagesByTarget, setMessagesByTarget] = useState<Map<string, GuestMessage[]>>(
    () => new Map(),
  );
  const [loaded, setLoaded] = useState(false);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce(n => n + 1), []);

  useEffect(() => {
    const sessionId = getGameUuid();
    if (!isInAigramNow() || !sessionId) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await callAigramAPI<AigramResponse<SaveRow[]>>(
          `/note/aigram/ai/game/get/data/list?session_id=${encodeURIComponent(sessionId)}`,
          'GET',
        );
        const rows = Array.isArray(res?.data) ? res.data : [];
        // Flatten ALL steles from each user's save row. Older pattern
        // only took history[0] per user, hiding every author's older
        // steles behind their newest. Throttle at publish, never
        // display.
        const pairs: { userId: string; stele: SealedStele }[] = [];
        for (const row of rows) {
          if (!row.user_id || !row.resource_data) continue;
          try {
            const save = JSON.parse(row.resource_data) as KissWallSave;
            for (const stele of save.history || []) {
              if (stele && stele.epitaph) {
                pairs.push({ userId: row.user_id, stele });
              }
            }
          } catch { /* skip corrupt */ }
        }
        // Newest first across all authors, cap visible count.
        pairs.sort((a, b) => (b.stele.sealedAt ?? 0) - (a.stele.sealedAt ?? 0));
        const limited = pairs.slice(0, 24);

        // Guestbook notes — parsed off the SAME fetch (no second request),
        // grouped by stele id, each stamped with fromUserId = its owner.
        const byTarget = buildMessagesByTarget(
          rows
            .filter((r): r is { user_id: string; resource_data: string } =>
              !!r.user_id && !!r.resource_data)
            .map(r => ({ user_id: r.user_id, resource_data: r.resource_data })),
        );

        // Resolve each unique author's profile once. Fold in the note authors'
        // ids too so every guestbook chip can render avatar + name.
        const idSet = new Set<string>(limited.map(p => p.userId));
        for (const list of byTarget.values()) {
          for (const m of list) if (m.fromUserId) idSet.add(m.fromUserId);
        }
        const uniqueIds = Array.from(idSet);
        const profileEntries = await Promise.all(
          uniqueIds.map(async uid => {
            try {
              const r = await callAigramAPI<
                AigramResponse<{ name?: string; head_url?: string }>
              >(
                `/note/telegram/user/get/info/by/telegram_id?telegram_id=${encodeURIComponent(uid)}`,
                'GET',
              );
              return [uid, r?.data ?? null] as const;
            } catch {
              return [uid, null] as const;
            }
          }),
        );
        const profileMap = new Map<string, { name?: string; head_url?: string } | null>(profileEntries);

        if (cancelled) return;
        setEntries(limited.map(({ userId, stele }) => {
          const p = profileMap.get(userId) || null;
          return {
            userId,
            userName: p?.name,
            userAvatarUrl: p?.head_url,
            stele,
          };
        }));

        // Stamp each note with its author's resolved display fields.
        const stamped = new Map<string, GuestMessage[]>();
        for (const [target, list] of byTarget) {
          stamped.set(
            target,
            list.map(m => {
              const p = m.fromUserId ? profileMap.get(m.fromUserId) || null : null;
              return { ...m, userName: p?.name, userAvatarUrl: p?.head_url };
            }),
          );
        }
        setMessagesByTarget(stamped);
      } catch {
        if (!cancelled) { setEntries([]); setMessagesByTarget(new Map()); }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [nonce]);

  return { entries, messagesByTarget, loaded, refresh };
}

export function isSelf(entry: WallEntry): boolean {
  return !!getTelegramId()! && entry.userId === String(getTelegramId()!);
}
