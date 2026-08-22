// Runtime portrait generation through AlterU's provider-independent media API.

import { useCallback, useState } from 'react';
import { getGameUuid } from './game-id';
import {
  createMediaRequestId,
  generateImageMedia,
  MediaServiceError,
} from './media';

const GENERATED_IMAGE_SIZE = { width: 512, height: 768 } as const;

export interface GenImageOptions {
  /** Required English visual prompt. */
  prompt: string;
  /** Optional public HTTPS parent portrait for a kiss-back edit. */
  ref_url?: string;
}

export interface UseGenImage {
  generate: (opts: GenImageOptions) => Promise<string>;
  loading: boolean;
  error: Error | null;
  lastUrl: string | null;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export function useGenImage(): UseGenImage {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  const generate = useCallback(async (opts: GenImageOptions): Promise<string> => {
    if (!opts.prompt.trim()) throw new Error('gen-image: prompt is required');
    if (opts.ref_url && !/^https:\/\//i.test(opts.ref_url)) {
      throw new Error('gen-image: reference must be public HTTPS');
    }
    const sessionId = getGameUuid();
    if (!sessionId) throw new Error('gen-image: game UUID is unavailable');

    setLoading(true);
    setError(null);
    try {
      const request = {
        sessionId,
        requestId: createMediaRequestId(),
        mode: opts.ref_url ? 'edit' as const : 'text' as const,
        prompt: opts.prompt,
        referenceUrls: opts.ref_url ? [opts.ref_url] : [],
        size: GENERATED_IMAGE_SIZE,
      };

      let task;
      try {
        task = await generateImageMedia(request);
      } catch (cause) {
        if (cause instanceof MediaServiceError) {
          if (!cause.retryable) throw cause;
          await delay(Math.max(1, cause.retryAfterSeconds ?? 1) * 1000);
          task = await generateImageMedia({
            ...request,
            requestId: createMediaRequestId(),
          });
        } else {
          // A network interruption is ambiguous: reuse the same idempotency key.
          task = await generateImageMedia(request);
        }
      }

      setLastUrl(task.media.url);
      return task.media.url;
    } catch (cause) {
      const nextError = cause instanceof Error ? cause : new Error(String(cause));
      setError(nextError);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, []);

  return { generate, loading, error, lastUrl };
}
