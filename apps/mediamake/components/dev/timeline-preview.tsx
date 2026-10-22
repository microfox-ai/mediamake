'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  calculateCompositionLayoutMetadata,
  getMediaLoadErrorMessage,
  Player,
  type InputCompositionProps,
} from '@microfox/remotion';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useCompileStore } from '@/components/editor_main/stores/compile-store';
import type { Timeline } from '@/components/editor_main/stores/project-store';

const STORAGE_KEY = 'mediamake-preview-input';

type PlaybackMetadata = Awaited<ReturnType<typeof calculateCompositionLayoutMetadata>>;

type PreviewStatus = 'idle' | 'compiling' | 'ready' | 'error';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCompositionInput(value: Record<string, unknown>): boolean {
  return Array.isArray(value.childrenData) && isRecord(value.config) && !Array.isArray(value.presets);
}

function timelineFromInput(value: Record<string, unknown>): Timeline {
  return {
    id: `dev-preview-${crypto.randomUUID()}`,
    projectId: typeof value.projectId === 'string' ? value.projectId : 'dev-preview',
    displayName: typeof value.displayName === 'string' ? value.displayName : 'Dev preview',
    configuration: value.configuration ?? null,
    defaultData: value.defaultData ?? null,
    presets: Array.isArray(value.presets) ? (value.presets as Timeline['presets']) : [],
    nodes: (value.nodes ?? undefined) as Timeline['nodes'],
    actions: Array.isArray(value.actions) ? (value.actions as Timeline['actions']) : [],
  };
}

/**
 * Agent-facing preview. Paste a timeline compiler input
 * (`configuration`, `defaultData`, `presets`, `nodes`, `actions`)
 * or a compiled composition (`childrenData` + `config`), then Apply.
 *
 * Stable hooks: `#timeline-input`, `#preview-apply`, `[data-testid=preview-status]`,
 * `[data-testid=preview-player]`.
 */
export function TimelinePreview() {
  const [raw, setRaw] = useState('');
  const [status, setStatus] = useState<PreviewStatus>('idle');
  const [message, setMessage] = useState('Paste timeline input or composition JSON, then Apply.');
  const [playback, setPlayback] = useState<PlaybackMetadata | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) setRaw(saved);
    } catch {
      // sessionStorage can be blocked; the textarea still works.
    }
  }, []);

  const apply = useCallback(async (source: string) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(source);
    } catch (error) {
      setPlayback(null);
      setStatus('error');
      setMessage(`error: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
      return;
    }

    if (!isRecord(parsed)) {
      setPlayback(null);
      setStatus('error');
      setMessage('error: JSON must be an object');
      return;
    }

    setStatus('compiling');
    setMessage('compiling');
    setPlayback(null);

    try {
      sessionStorage.setItem(STORAGE_KEY, source);
    } catch {
      // ignore quota / private mode
    }

    try {
      if (isCompositionInput(parsed)) {
        const metadata = await calculateCompositionLayoutMetadata({
          defaultProps: {},
          props: parsed as unknown as InputCompositionProps,
          abortSignal: new AbortController().signal,
          compositionId: 'DataMotion',
          isRendering: false,
        });
        setPlayback(metadata);
        setRevision(value => value + 1);
        setStatus('ready');
        setMessage('ready');
        return;
      }

      const timeline = timelineFromInput(parsed);
      if (!timeline.presets || timeline.presets.length === 0) {
        setStatus('error');
        setMessage(
          'error: Not a composition (childrenData + config) and the timeline has no presets to compile.',
        );
        return;
      }

      const compile = useCompileStore.getState();
      compile.reset();
      await compile.generateOutput(timeline);
      const next = useCompileStore.getState();
      if (next.generationError) {
        setStatus('error');
        setMessage(`error: ${next.generationError}`);
        return;
      }
      if (!next.calculatedMetadata) {
        setStatus('error');
        setMessage('error: Compile finished without a preview. Check preset ids and ranges.');
        return;
      }
      setPlayback(next.calculatedMetadata);
      setRevision(value => value + 1);
      setStatus('ready');
      setMessage('ready');
    } catch (error) {
      setPlayback(null);
      setStatus('error');
      setMessage(`error: ${getMediaLoadErrorMessage(error)}`);
    }
  }, []);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    setRaw(text);
    await apply(text);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-0 gap-4 px-4 pb-4">
      <div className="flex w-[min(42%,520px)] min-w-[280px] flex-col gap-3">
        <div className="space-y-1">
          <h2 className="text-sm font-medium">Timeline input</h2>
          <p className="text-xs text-muted-foreground">
            Paste the Timeline Input JSON from the editor, or a compiled composition
            with <code>childrenData</code> and <code>config</code>. Then Apply.
          </p>
        </div>
        <Textarea
          id="timeline-input"
          data-testid="timeline-input"
          value={raw}
          onChange={event => setRaw(event.target.value)}
          spellCheck={false}
          placeholder={'{\n  "presets": [],\n  "nodes": null,\n  "configuration": null,\n  "defaultData": null,\n  "actions": []\n}'}
          className="field-sizing-fixed min-h-0 flex-1 resize-none font-mono text-xs"
          onKeyDown={event => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
              event.preventDefault();
              void apply(raw);
            }
          }}
        />
        <div className="flex items-center gap-2">
          <Button
            id="preview-apply"
            data-testid="preview-apply"
            type="button"
            disabled={status === 'compiling' || raw.trim().length === 0}
            onClick={() => void apply(raw)}
          >
            {status === 'compiling' ? <Loader2 className="animate-spin" /> : null}
            Apply
          </Button>
          <label className="text-xs text-muted-foreground">
            <input
              data-testid="timeline-file"
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={event => void onFile(event.target.files?.[0])}
            />
            <span className="cursor-pointer underline-offset-2 hover:underline">Load JSON file</span>
          </label>
          <p
            data-testid="preview-status"
            data-status={status}
            className="ml-auto max-w-[50%] truncate text-xs text-muted-foreground"
          >
            {message}
          </p>
        </div>
      </div>
      <div
        data-testid="preview-player"
        className="flex min-w-0 flex-1 items-center justify-center overflow-hidden rounded-lg border bg-black"
      >
        {status === 'compiling' && (
          <Loader2 className="h-6 w-6 animate-spin text-white" />
        )}
        {playback && status === 'ready' && (
          <Player
            key={revision}
            inputProps={playback.props}
            durationInFrames={playback.durationInFrames ?? 20}
            fps={playback.fps ?? 30}
            compositionHeight={playback.height ?? 1080}
            compositionWidth={playback.width ?? 1920}
            style={{ width: '100%', height: '100%' }}
            controls
            loop
          />
        )}
        {status !== 'compiling' && !playback && (
          <p className="px-6 text-center text-sm text-neutral-400">
            The player shows up here after a successful Apply.
          </p>
        )}
      </div>
    </div>
  );
}
