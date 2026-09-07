'use client';

import { useCallback, useRef, useState } from 'react';
import {
  CompositionLayout,
  calculateCompositionLayoutMetadata,
  InputCompositionProps,
} from '@microfox/remotion';

export type BrowserRenderPhase =
  | 'idle'
  | 'preparing'
  | 'rendering'
  | 'uploading'
  | 'done'
  | 'error';

export interface BrowserRenderState {
  phase: BrowserRenderPhase;
  /** 0..1 encode progress (rendering phase only). */
  progress: number;
  error: string | null;
  /** Public URL of the uploaded output once done. */
  outputUrl: string | null;
}

export interface BrowserRenderInput {
  inputProps: InputCompositionProps;
  compositionId: string;
  renderType: 'video' | 'still';
  /** Video container. Codecs are derived: mp4 → h264/aac, webm → vp9/opus. */
  container: 'mp4' | 'webm';
  /** Still image format. */
  imageFormat: 'png' | 'jpeg';
  fileName: string;
  /** Second to grab for stills. */
  frameTime?: number;
  projectId?: string;
  tags?: string[];
  clientId: string;
  apiKey?: string;
}

const initialState: BrowserRenderState = {
  phase: 'idle',
  progress: 0,
  error: null,
  outputUrl: null,
};

/**
 * Client-side rendering with @remotion/web-renderer: renders the same
 * CompositionLayout the Player uses, uploads the result to Spaces via a
 * presigned URL, and records it in render history.
 */
export function useBrowserRender() {
  const [state, setState] = useState<BrowserRenderState>(initialState);
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => setState(initialState), []);

  const startBrowserRender = useCallback(
    async (input: BrowserRenderInput): Promise<{ url: string }> => {
      const abort = new AbortController();
      abortRef.current = abort;
      setState({ phase: 'preparing', progress: 0, error: null, outputUrl: null });

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-client-id': input.clientId,
        ...(input.apiKey?.trim()
          ? { Authorization: `Bearer ${input.apiKey}` }
          : {}),
      };

      let renderId: string | null = null;
      try {
        // Load lazily so the encoder code is not part of the editor bundle.
        const { renderMediaOnWeb, renderStillOnWeb, canRenderMediaOnWeb } =
          await import('@remotion/web-renderer');

        // Resolve duration/fps/size + per-layer durations the same way the
        // Lambda render does via calculateMetadata.
        const metadata = await calculateCompositionLayoutMetadata({
          props: input.inputProps,
          defaultProps: {
            config: { width: 1920, height: 1080, fps: 30, duration: 30 },
          } as InputCompositionProps,
          abortSignal: abort.signal,
          compositionId: input.compositionId,
          isRendering: true,
        });

        const width = metadata.width ?? 1920;
        const height = metadata.height ?? 1080;
        const fps = metadata.fps ?? 30;
        const durationInFrames = metadata.durationInFrames ?? 1;
        const resolvedProps =
          (metadata.props as InputCompositionProps) ?? input.inputProps;

        if (input.renderType === 'video') {
          const support = await canRenderMediaOnWeb({
            container: input.container,
            width,
            height,
          });
          if (!support.canRender) {
            const message =
              support.issues.find(i => i.severity === 'error')?.message ??
              'This browser cannot render video (WebCodecs unavailable).';
            throw new Error(message);
          }
        }

        const composition = {
          id: input.compositionId,
          component: CompositionLayout as React.FC<Record<string, unknown>>,
          durationInFrames,
          fps,
          width,
          height,
        };

        // Register the render + get the upload target.
        const createRes = await fetch('/api/remotion/render/browser', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            fileName: input.fileName,
            renderType: input.renderType,
            container:
              input.renderType === 'still' ? input.imageFormat : input.container,
            codec:
              input.renderType === 'still'
                ? input.imageFormat
                : input.container === 'webm'
                  ? 'vp9'
                  : 'h264',
            audioCodec: input.container === 'webm' ? 'opus' : 'aac',
            composition: input.compositionId,
            inputProps: resolvedProps,
            projectId: input.projectId,
            tags: input.tags,
          }),
        });
        if (!createRes.ok) {
          const data = await createRes.json().catch(() => null);
          throw new Error(data?.message || 'Failed to register browser render');
        }
        const {
          renderId: createdId,
          uploadUrl,
          publicUrl,
        } = await createRes.json();
        renderId = createdId;

        setState(s => ({ ...s, phase: 'rendering' }));

        let blob: Blob;
        let contentType: string;
        if (input.renderType === 'still') {
          const frame = Math.max(
            0,
            Math.min(
              durationInFrames - 1,
              Math.round((input.frameTime ?? 0) * fps),
            ),
          );
          const still = await renderStillOnWeb({
            composition,
            inputProps: resolvedProps as Record<string, unknown>,
            frame,
            signal: abort.signal,
          });
          blob = await still.blob({ format: input.imageFormat });
          contentType = `image/${input.imageFormat}`;
          setState(s => ({ ...s, progress: 1 }));
        } else {
          const { getBlob } = await renderMediaOnWeb({
            composition,
            inputProps: resolvedProps as Record<string, unknown>,
            container: input.container,
            signal: abort.signal,
            onProgress: ({ progress }) => {
              setState(s =>
                s.phase === 'rendering' ? { ...s, progress } : s,
              );
            },
          });
          blob = await getBlob();
          contentType = input.container === 'webm' ? 'video/webm' : 'video/mp4';
        }

        setState(s => ({ ...s, phase: 'uploading', progress: 1 }));

        const putRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': contentType,
            'x-amz-acl': 'public-read',
          },
          body: blob,
          signal: abort.signal,
        });
        if (!putRes.ok) {
          throw new Error(`Upload failed (HTTP ${putRes.status})`);
        }

        const completeRes = await fetch('/api/remotion/render/browser', {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            renderId,
            status: 'completed',
            fileSize: blob.size,
          }),
        });
        if (!completeRes.ok) {
          throw new Error('Rendered file uploaded but finalizing failed');
        }

        setState({
          phase: 'done',
          progress: 1,
          error: null,
          outputUrl: publicUrl,
        });
        return { url: publicUrl };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Browser render failed';
        // Best-effort: mark the history entry failed so it doesn't hang in
        // "rendering" forever.
        if (renderId) {
          void fetch('/api/remotion/render/browser', {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ renderId, status: 'failed', error: message }),
          }).catch(() => undefined);
        }
        setState({
          phase: 'error',
          progress: 0,
          error: message,
          outputUrl: null,
        });
        throw err;
      } finally {
        abortRef.current = null;
      }
    },
    [],
  );

  return { state, startBrowserRender, cancel, reset };
}
