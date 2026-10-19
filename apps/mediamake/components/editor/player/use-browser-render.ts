'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CompositionLayout,
  calculateCompositionLayoutMetadata,
  registerClientSideMediaTags,
  InputCompositionProps,
} from '@microfox/remotion';
import {
  describeRenderError,
  withRenderErrorCapture,
  type RenderErrorHolder,
} from './browser-render-boundary';
import {
  createActiveClock,
  createEtaEstimator,
  createThroughputMeter,
} from './render-stats';

export type BrowserRenderPhase =
  | 'idle'
  | 'preparing'
  | 'rendering'
  | 'finalizing'
  | 'uploading'
  | 'saving'
  | 'done'
  | 'cancelled'
  | 'error';

/** Phases during which a render is in flight. */
export const ACTIVE_BROWSER_RENDER_PHASES: readonly BrowserRenderPhase[] = [
  'preparing',
  'rendering',
  'finalizing',
  'uploading',
  'saving',
];

export const isBrowserRenderActive = (phase: BrowserRenderPhase) =>
  ACTIVE_BROWSER_RENDER_PHASES.includes(phase);

/** Where the finished file goes. */
export type BrowserRenderDestination = 'cloud' | 'device';

export interface BrowserRenderFrames {
  total: number;
  rendered: number;
  encoded: number;
  /** Composition frame rate — used for the "× realtime" figure. */
  fps: number;
  width: number;
  height: number;
  /** Frames encoded per second of active render time. */
  framesPerSecond: number | null;
  /** Remaining render time, pauses excluded. Null while still estimating. */
  etaMs: number | null;
}

export interface BrowserRenderUpload {
  loaded: number;
  total: number;
  bytesPerSecond: number | null;
}

export interface BrowserRenderState {
  phase: BrowserRenderPhase;
  /** 0..1 overall encode progress (rendering phase). */
  progress: number;
  error: string | null;
  /** Public URL of the uploaded output once done (cloud destination). */
  outputUrl: string | null;
  fileName: string | null;
  renderType: 'video' | 'still' | null;
  destination: BrowserRenderDestination;
  /** User asked to pause; takes effect at the next frame boundary. */
  pauseRequested: boolean;
  /** Render loop is actually held. */
  paused: boolean;
  frames: BrowserRenderFrames | null;
  upload: BrowserRenderUpload | null;
  /**
   * Active-time clock (performance.now based). Elapsed time is
   * `activeMs + (runningSince ? now - runningSince : 0)` — see `activeMsAt`.
   */
  clock: { activeMs: number; runningSince: number | null };
  /** Output size once encoded. */
  outputBytes: number | null;
  /** Wall-clock ms timestamps. */
  startedAt: number | null;
  finishedAt: number | null;
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
  /** Second to grab for stills. Ignored when `frame` is set. */
  frameTime?: number;
  /** 0-based frame index for stills. Takes precedence over `frameTime`. */
  frame?: number;
  projectId?: string;
  tags?: string[];
  clientId: string;
  apiKey?: string;
  /** Defaults to 'cloud' (upload + render history). */
  destination?: BrowserRenderDestination;
  /**
   * For 'device': a handle from `requestDeviceSaveHandle`, obtained inside
   * the click handler (the picker needs a user gesture). Without one the file
   * is downloaded instead.
   */
  saveHandle?: FileSystemFileHandle | null;
}

export interface BrowserRenderResult {
  url: string | null;
  savedToDevice: boolean;
}

const initialState: BrowserRenderState = {
  phase: 'idle',
  progress: 0,
  error: null,
  outputUrl: null,
  fileName: null,
  renderType: null,
  destination: 'cloud',
  pauseRequested: false,
  paused: false,
  frames: null,
  upload: null,
  clock: { activeMs: 0, runningSince: null },
  outputBytes: null,
  startedAt: null,
  finishedAt: null,
};

type SaveFilePickerWindow = Window & {
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    types?: { description?: string; accept: Record<string, string[]> }[];
  }) => Promise<FileSystemFileHandle>;
};

/**
 * Asks where to save the output. Must run inside a user gesture (call it
 * first thing in the click handler). Returns null when the browser has no
 * save picker — the caller then falls back to a download. Throws an
 * AbortError if the user dismisses the picker.
 */
export async function requestDeviceSaveHandle(
  fileName: string,
  mimeType: string,
): Promise<FileSystemFileHandle | null> {
  const w = window as SaveFilePickerWindow;
  if (typeof w.showSaveFilePicker !== 'function') return null;
  const ext = fileName.includes('.') ? `.${fileName.split('.').pop()}` : '';
  return w.showSaveFilePicker({
    suggestedName: fileName,
    types: ext ? [{ description: 'Rendered file', accept: { [mimeType]: [ext] } }] : undefined,
  });
}

export function mimeTypeForBrowserRender(
  renderType: 'video' | 'still',
  container: 'mp4' | 'webm',
  imageFormat: 'png' | 'jpeg',
): string {
  if (renderType === 'still') return `image/${imageFormat}`;
  return container === 'webm' ? 'video/webm' : 'video/mp4';
}

/** PUT with upload progress (fetch has no upload progress events). */
function putWithProgress(
  url: string,
  body: Blob,
  headers: Record<string, string>,
  signal: AbortSignal,
  onProgress: (loaded: number, total: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value);
    }
    xhr.upload.onprogress = (event) => {
      onProgress(event.loaded, event.lengthComputable ? event.total : body.size);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (HTTP ${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Upload failed (network error)'));
    xhr.onabort = () => reject(new DOMException('Render cancelled', 'AbortError'));
    const onAbort = () => xhr.abort();
    if (signal.aborted) {
      reject(new DOMException('Render cancelled', 'AbortError'));
      return;
    }
    signal.addEventListener('abort', onAbort, { once: true });
    xhr.onloadend = () => signal.removeEventListener('abort', onAbort);
    xhr.send(body);
  });
}

async function saveBlobToDevice(
  blob: Blob,
  fileName: string,
  handle: FileSystemFileHandle | null | undefined,
): Promise<void> {
  if (handle) {
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return;
  }
  // No save picker (or none granted): plain download.
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    // Give the download a moment to start before revoking.
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}

const cancelledError = () => new DOMException('Render cancelled', 'AbortError');

async function removeIfEmpty(handle: FileSystemFileHandle): Promise<void> {
  try {
    const file = await handle.getFile();
    const removable = handle as FileSystemFileHandle & { remove?: () => Promise<void> };
    if (file.size === 0 && typeof removable.remove === 'function') await removable.remove();
  } catch {
    // Best effort only.
  }
}

/**
 * Client-side rendering with @remotion/web-renderer: renders the same
 * CompositionLayout the Player uses, then either uploads the result to
 * Spaces via a presigned URL (recorded in render history) or saves it on
 * this device.
 *
 * Pause/resume: the web renderer awaits `onFrame` between frames, so holding
 * that promise suspends the render loop at a frame boundary without
 * dropping state. Paused time is excluded from elapsed time and the ETA.
 */
export function useBrowserRender() {
  const [state, setState] = useState<BrowserRenderState>(initialState);
  const abortRef = useRef<AbortController | null>(null);
  const clockRef = useRef(createActiveClock());
  const gateRef = useRef<{ requested: boolean; release: (() => void) | null }>({
    requested: false,
    release: null,
  });

  const releaseGate = useCallback(() => {
    const release = gateRef.current.release;
    gateRef.current.release = null;
    release?.();
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    gateRef.current.requested = false;
    releaseGate();
  }, [releaseGate]);

  const pause = useCallback(() => {
    if (!abortRef.current) return;
    gateRef.current.requested = true;
    setState((s) =>
      s.phase === 'rendering' || s.phase === 'preparing'
        ? { ...s, pauseRequested: true }
        : s,
    );
  }, []);

  const resume = useCallback(() => {
    gateRef.current.requested = false;
    setState((s) => ({ ...s, pauseRequested: false }));
    releaseGate();
  }, [releaseGate]);

  const reset = useCallback(() => {
    if (abortRef.current) return; // never reset a live render
    setState(initialState);
  }, []);

  // A running render keeps going if the owner unmounts (it still uploads and
  // lands in render history), but a paused one would be held forever with
  // no UI left to resume it — cancel that instead.
  useEffect(
    () => () => {
      if (gateRef.current.requested) cancel();
    },
    [cancel],
  );

  const startBrowserRender = useCallback(
    async (input: BrowserRenderInput): Promise<BrowserRenderResult> => {
      if (abortRef.current) {
        throw new Error('A browser render is already running');
      }
      const abort = new AbortController();
      abortRef.current = abort;
      gateRef.current = { requested: false, release: null };
      const clock = createActiveClock();
      clockRef.current = clock;
      clock.start();
      const destination: BrowserRenderDestination = input.destination ?? 'cloud';

      setState({
        ...initialState,
        phase: 'preparing',
        fileName: input.fileName,
        renderType: input.renderType,
        destination,
        clock: clock.snapshot(),
        startedAt: Date.now(),
      });

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-client-id': input.clientId,
        ...(input.apiKey?.trim()
          ? { Authorization: `Bearer ${input.apiKey}` }
          : {}),
      };

      let renderId: string | null = null;
      // See browser-render-boundary: the web renderer masks component errors.
      const errorHolder: RenderErrorHolder = {
        error: null,
        componentStack: null,
      };
      try {
        // Loaded lazily to keep the encoder out of the editor bundle.
        // @remotion/media is also ESM-only, so @microfox/remotion cannot import
        // it statically without breaking its CJS consumers — hence the registry.
        const [
          { renderMediaOnWeb, renderStillOnWeb, canRenderMediaOnWeb },
          webCodecsMedia,
        ] = await Promise.all([
          import('@remotion/web-renderer'),
          import('@remotion/media'),
        ]);
        registerClientSideMediaTags({
          Audio: webCodecsMedia.Audio,
          Video: webCodecsMedia.Video,
        });

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
          component: withRenderErrorCapture(
            CompositionLayout as React.FC<Record<string, unknown>>,
            errorHolder,
            () => abort.abort(),
          ) as React.FC<Record<string, unknown>>,
          durationInFrames,
          fps,
          width,
          height,
        };

        // Cloud: register the render + get the upload target up front, so it
        // shows in render history while it runs.
        let uploadUrl: string | null = null;
        let publicUrl: string | null = null;
        if (destination === 'cloud') {
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
            signal: abort.signal,
          });
          if (!createRes.ok) {
            const data = await createRes.json().catch(() => null);
            throw new Error(data?.message || 'Failed to register browser render');
          }
          const created = await createRes.json();
          renderId = created.renderId;
          uploadUrl = created.uploadUrl;
          publicUrl = created.publicUrl;
        }

        const contentType = mimeTypeForBrowserRender(
          input.renderType,
          input.container,
          input.imageFormat,
        );

        let blob: Blob;
        if (input.renderType === 'still') {
          setState((s) => ({ ...s, phase: 'rendering', clock: clock.snapshot() }));
          const requestedFrame =
            typeof input.frame === 'number' && Number.isFinite(input.frame)
              ? Math.round(input.frame)
              : Math.round((input.frameTime ?? 0) * fps);
          const frame = Math.max(
            0,
            Math.min(durationInFrames - 1, requestedFrame),
          );
          const still = await renderStillOnWeb({
            composition,
            inputProps: resolvedProps as Record<string, unknown>,
            frame,
            signal: abort.signal,
          });
          if (errorHolder.error) throw errorHolder.error;
          blob = await still.blob({ format: input.imageFormat });
          setState((s) => ({ ...s, progress: 1 }));
        } else {
          const eta = createEtaEstimator();
          // ETA/speed are measured from the first frame: media loading
          // before it says nothing about per-frame cost.
          let firstFrameActiveMs: number | null = null;

          const holdIfPaused = async () => {
            if (!gateRef.current.requested || abort.signal.aborted) return;
            clock.pause();
            setState((s) => ({ ...s, paused: true, clock: clock.snapshot() }));
            await new Promise<void>((resolve) => {
              gateRef.current.release = resolve;
              abort.signal.addEventListener('abort', () => resolve(), { once: true });
              // Resumed between the check above and now.
              if (!gateRef.current.requested) resolve();
            });
            gateRef.current.release = null;
            clock.resume();
            setState((s) => ({
              ...s,
              paused: false,
              pauseRequested: false,
              clock: clock.snapshot(),
            }));
          };

          const { getBlob } = await renderMediaOnWeb({
            composition,
            inputProps: resolvedProps as Record<string, unknown>,
            container: input.container,
            signal: abort.signal,
            onFrame: async (videoFrame) => {
              await holdIfPaused();
              return videoFrame;
            },
            onProgress: ({ progress, renderedFrames, encodedFrames }) => {
              const active = clock.elapsed();
              if (firstFrameActiveMs === null && renderedFrames > 0) {
                firstFrameActiveMs = active;
              }
              const sinceFirst =
                firstFrameActiveMs === null ? 0 : active - firstFrameActiveMs;
              eta.push(sinceFirst, progress);
              const framesPerSecond =
                sinceFirst > 500 ? (encodedFrames / sinceFirst) * 1000 : null;
              const allEncoded = encodedFrames >= durationInFrames;
              setState((s) => {
                if (!isBrowserRenderActive(s.phase)) return s;
                return {
                  ...s,
                  phase: allEncoded
                    ? 'finalizing'
                    : renderedFrames > 0
                      ? 'rendering'
                      : s.phase,
                  progress,
                  clock: clock.snapshot(),
                  frames: {
                    total: durationInFrames,
                    rendered: renderedFrames,
                    encoded: encodedFrames,
                    fps,
                    width,
                    height,
                    framesPerSecond,
                    etaMs: allEncoded ? 0 : eta.remainingMs(),
                  },
                };
              });
            },
          });
          if (errorHolder.error) throw errorHolder.error;
          setState((s) => ({ ...s, phase: 'finalizing', progress: 1 }));
          blob = await getBlob();
        }

        if (abort.signal.aborted) throw cancelledError();

        let result: BrowserRenderResult;
        if (destination === 'device') {
          setState((s) => ({
            ...s,
            phase: 'saving',
            progress: 1,
            outputBytes: blob.size,
            clock: clock.snapshot(),
          }));
          await saveBlobToDevice(blob, input.fileName, input.saveHandle);
          result = { url: null, savedToDevice: true };
        } else {
          setState((s) => ({
            ...s,
            phase: 'uploading',
            progress: 1,
            outputBytes: blob.size,
            upload: { loaded: 0, total: blob.size, bytesPerSecond: null },
            clock: clock.snapshot(),
          }));

          const meter = createThroughputMeter();
          await putWithProgress(
            uploadUrl!,
            blob,
            { 'Content-Type': contentType, 'x-amz-acl': 'public-read' },
            abort.signal,
            (loaded, total) => {
              meter.push(performance.now(), loaded);
              setState((s) =>
                s.phase === 'uploading'
                  ? {
                      ...s,
                      upload: { loaded, total, bytesPerSecond: meter.perSecond() },
                    }
                  : s,
              );
            },
          );

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
          result = { url: publicUrl, savedToDevice: false };
        }

        clock.pause();
        setState((s) => ({
          ...s,
          phase: 'done',
          progress: 1,
          error: null,
          outputUrl: result.url,
          pauseRequested: false,
          paused: false,
          clock: clock.snapshot(),
          finishedAt: Date.now(),
        }));
        return result;
      } catch (err) {
        clock.pause();
        // Chrome's save picker can create the target file up front; don't
        // leave an empty placeholder behind. Never touches a non-empty file.
        if (destination === 'device' && input.saveHandle) {
          void removeIfEmpty(input.saveHandle);
        }
        const cancelled = abort.signal.aborted && !errorHolder.error;
        const message = cancelled
          ? 'Render cancelled'
          : describeRenderError(err, errorHolder);
        // Best-effort: mark the history entry failed so it doesn't hang in
        // "rendering" forever.
        if (renderId) {
          void fetch('/api/remotion/render/browser', {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
              renderId,
              status: 'failed',
              error: cancelled ? 'Cancelled by user' : message,
            }),
          }).catch(() => undefined);
        }
        setState((s) => ({
          ...s,
          phase: cancelled ? 'cancelled' : 'error',
          error: cancelled ? null : message,
          outputUrl: null,
          pauseRequested: false,
          paused: false,
          clock: clock.snapshot(),
          finishedAt: Date.now(),
        }));
        throw cancelled ? cancelledError() : err;
      } finally {
        abortRef.current = null;
        gateRef.current = { requested: false, release: null };
      }
    },
    [],
  );

  return { state, startBrowserRender, cancel, pause, resume, reset };
}

export type BrowserRenderController = ReturnType<typeof useBrowserRender>;
