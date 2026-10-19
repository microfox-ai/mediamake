'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  HardDrive,
  Loader2,
  Maximize2,
  Pause,
  Play,
  UploadCloud,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  isBrowserRenderActive,
  type BrowserRenderController,
  type BrowserRenderState,
} from './use-browser-render';
import { activeMsAt, formatBytes, formatDuration } from './render-stats';

/** Re-renders every `intervalMs` while `enabled`, for ticking timers. */
function useNow(enabled: boolean, intervalMs = 1000) {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (!enabled) return;
    setNow(performance.now());
    const id = window.setInterval(() => setNow(performance.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [enabled, intervalMs]);
  return now;
}

type StepKey = 'prepare' | 'render' | 'finalize' | 'deliver';

function currentStep(state: BrowserRenderState): StepKey {
  switch (state.phase) {
    case 'preparing':
      return 'prepare';
    case 'rendering':
      return 'render';
    case 'finalizing':
      return 'finalize';
    default:
      return 'deliver';
  }
}

const STEP_ORDER: StepKey[] = ['prepare', 'render', 'finalize', 'deliver'];

export function describeBrowserRender(state: BrowserRenderState): string {
  if (state.paused) return 'Paused';
  if (state.pauseRequested) return 'Pausing after this frame…';
  switch (state.phase) {
    case 'preparing':
      return 'Loading media & fonts…';
    case 'rendering':
      return state.renderType === 'still' ? 'Rendering image…' : 'Rendering frames…';
    case 'finalizing':
      return 'Finalizing file…';
    case 'uploading':
      return 'Uploading to cloud storage…';
    case 'saving':
      return 'Saving to this computer…';
    case 'done':
      return state.destination === 'device' ? 'Saved to this computer' : 'Render complete';
    case 'cancelled':
      return 'Render cancelled';
    case 'error':
      return 'Render failed';
    default:
      return '';
  }
}

/**
 * 0..1 bar value for the current step (the stepper shows which step), so
 * the bar always agrees with the percentage next to it.
 */
function overallProgress(state: BrowserRenderState): number {
  if (state.phase === 'done' || state.phase === 'finalizing' || state.phase === 'saving') return 1;
  if (state.phase === 'uploading') {
    return state.upload && state.upload.total > 0 ? state.upload.loaded / state.upload.total : 0;
  }
  if (state.phase === 'preparing') return 0;
  return state.progress;
}

function StatusIcon({ state, className }: { state: BrowserRenderState; className?: string }) {
  if (state.phase === 'done') {
    return <CheckCircle2 className={cn('text-emerald-500', className)} />;
  }
  if (state.phase === 'error') {
    return <AlertTriangle className={cn('text-destructive', className)} />;
  }
  if (state.phase === 'cancelled') {
    return <Ban className={cn('text-muted-foreground', className)} />;
  }
  if (state.paused) return <Pause className={cn('text-amber-500', className)} />;
  if (state.phase === 'uploading') {
    return <UploadCloud className={cn('text-primary animate-pulse', className)} />;
  }
  return <Loader2 className={cn('text-primary animate-spin', className)} />;
}

function Bar({ state }: { state: BrowserRenderState }) {
  const value = overallProgress(state);
  const tone =
    state.phase === 'error'
      ? 'bg-destructive'
      : state.phase === 'done'
        ? 'bg-emerald-500'
        : state.phase === 'cancelled'
          ? 'bg-muted-foreground/40'
          : state.paused || state.pauseRequested
            ? 'bg-amber-500'
            : 'bg-primary';
  const indeterminate =
    state.phase === 'preparing' || state.phase === 'finalizing' || state.phase === 'saving';
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      className="relative h-2 w-full overflow-hidden rounded-full bg-muted"
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500 ease-out', tone)}
        style={{ width: `${Math.max(2, value * 100)}%` }}
      />
      {indeterminate && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
      )}
    </div>
  );
}

function Stepper({ state }: { state: BrowserRenderState }) {
  const active = currentStep(state);
  const activeIndex = STEP_ORDER.indexOf(active);
  const finished = state.phase === 'done';
  const failed = state.phase === 'error' || state.phase === 'cancelled';
  const labels: Record<StepKey, string> = {
    prepare: 'Prepare',
    render: 'Render',
    finalize: 'Finalize',
    deliver: state.destination === 'device' ? 'Save' : 'Upload',
  };
  return (
    <ol className="flex items-center gap-1.5 text-xs" aria-label="Render steps">
      {STEP_ORDER.map((step, index) => {
        const done = finished || index < activeIndex;
        const current = !finished && index === activeIndex;
        return (
          <li key={step} className="flex flex-1 items-center gap-1.5 min-w-0">
            <span
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors',
                done && 'border-emerald-500 bg-emerald-500 text-white',
                current && !failed && 'border-primary bg-primary text-primary-foreground',
                current && failed && 'border-destructive bg-destructive text-white',
                !done && !current && 'border-border text-muted-foreground',
              )}
            >
              {done ? <Check className="h-3 w-3" /> : index + 1}
            </span>
            <span
              className={cn(
                'truncate',
                current ? 'font-medium text-foreground' : 'text-muted-foreground',
              )}
            >
              {labels[step]}
            </span>
            {index < STEP_ORDER.length - 1 && (
              <span
                className={cn(
                  'h-px flex-1 min-w-2',
                  done ? 'bg-emerald-500/60' : 'bg-border',
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground tabular-nums">{hint}</div>}
    </div>
  );
}

function useRenderNumbers(state: BrowserRenderState) {
  const live = isBrowserRenderActive(state.phase) && !state.paused;
  const now = useNow(live);
  // A stopped clock has no running segment, so a stale `now` is harmless.
  const elapsedMs = activeMsAt(state.clock, now);
  const frames = state.frames;
  const upload = state.upload;
  const uploadRemainingMs =
    upload && upload.bytesPerSecond && upload.bytesPerSecond > 0
      ? ((upload.total - upload.loaded) / upload.bytesPerSecond) * 1000
      : null;
  const realtime =
    frames?.framesPerSecond && frames.fps > 0 ? frames.framesPerSecond / frames.fps : null;
  return { elapsedMs, frames, upload, uploadRemainingMs, realtime };
}

function useCancelConfirm(onConfirm: () => void) {
  const [open, setOpen] = useState(false);
  const dialog = (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this render?</AlertDialogTitle>
          <AlertDialogDescription>
            Everything rendered so far is discarded. To stop temporarily, use Pause instead.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep rendering</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={onConfirm}
          >
            Cancel render
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
  return { ask: () => setOpen(true), dialog };
}

async function copyLink(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    toast.success('Link copied');
  } catch {
    toast.error('Could not copy the link');
  }
}

/** Full progress card shown at the top of the render modal's Browser tab. */
export function BrowserRenderProgressPanel({
  controller,
  onDismiss,
}: {
  controller: BrowserRenderController;
  onDismiss?: () => void;
}) {
  const { state, pause, resume, cancel } = controller;
  const { elapsedMs, frames, upload, uploadRemainingMs, realtime } = useRenderNumbers(state);
  const confirm = useCancelConfirm(cancel);
  const active = isBrowserRenderActive(state.phase);
  const canPause =
    state.renderType === 'video' &&
    (state.phase === 'rendering' || state.phase === 'preparing');

  if (state.phase === 'idle') return null;

  const percent = Math.round(state.progress * 100);
  const meta = [
    frames ? `${frames.width}×${frames.height}` : null,
    frames ? `${frames.fps} fps` : null,
    frames ? `${formatDuration((frames.total / frames.fps) * 1000)} long` : null,
    state.destination === 'device' ? '→ This computer' : '→ Cloud storage',
  ].filter(Boolean);

  return (
    <div
      className={cn(
        'rounded-xl border p-4 space-y-3 animate-in fade-in slide-in-from-top-1',
        state.phase === 'error' && 'border-destructive/50 bg-destructive/5',
        state.phase === 'done' && 'border-emerald-500/40 bg-emerald-500/5',
        state.paused && 'border-amber-500/40 bg-amber-500/5',
      )}
    >
      {confirm.dialog}
      <div className="flex items-start gap-3">
        <StatusIcon state={state} className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="font-medium">{describeBrowserRender(state)}</span>
            {state.phase === 'rendering' && !state.paused && (
              <span className="text-sm tabular-nums text-muted-foreground">{percent}%</span>
            )}
            {state.phase === 'uploading' && state.upload && state.upload.total > 0 && (
              <span className="text-sm tabular-nums text-muted-foreground">
                {Math.round((state.upload.loaded / state.upload.total) * 100)}%
              </span>
            )}
          </div>
          <div className="truncate text-xs text-muted-foreground" title={state.fileName ?? undefined}>
            {state.fileName}
            {meta.length > 0 && <> · {meta.join(' · ')}</>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {canPause &&
            (state.paused || state.pauseRequested ? (
              <Button size="sm" onClick={resume}>
                <Play className="mr-1.5 h-3.5 w-3.5" />
                Resume
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={pause}>
                <Pause className="mr-1.5 h-3.5 w-3.5" />
                Pause
              </Button>
            ))}
          {active && (
            <Button size="sm" variant="ghost" onClick={confirm.ask}>
              Cancel
            </Button>
          )}
          {!active && onDismiss && (
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onDismiss} aria-label="Dismiss">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {state.phase !== 'error' && state.phase !== 'cancelled' && <Stepper state={state} />}
      {state.phase !== 'error' && <Bar state={state} />}

      {state.phase === 'error' && state.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive break-words">
          {state.error}
        </p>
      )}

      {state.phase === 'uploading' && upload ? (
        <div className="grid grid-cols-3 gap-2">
          <Stat
            label="Uploaded"
            value={formatBytes(upload.loaded)}
            hint={`of ${formatBytes(upload.total)}`}
          />
          <Stat
            label="Speed"
            value={upload.bytesPerSecond ? `${formatBytes(upload.bytesPerSecond)}/s` : '—'}
          />
          <Stat label="Remaining" value={uploadRemainingMs === null ? 'Estimating…' : formatDuration(uploadRemainingMs)} />
        </div>
      ) : state.renderType === 'video' && active ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat
            label="Elapsed"
            value={formatDuration(elapsedMs)}
            hint={state.paused ? 'timer paused' : undefined}
          />
          <Stat
            label="Remaining"
            value={
              state.phase !== 'rendering'
                ? '—'
                : frames?.etaMs == null
                  ? 'Estimating…'
                  : `~${formatDuration(frames.etaMs)}`
            }
            hint={
              state.phase !== 'rendering'
                ? undefined
                : state.paused
                  ? 'after you resume'
                  : 'render only'
            }
          />
          <Stat
            label="Speed"
            value={frames?.framesPerSecond ? `${frames.framesPerSecond.toFixed(1)} fps` : '—'}
            hint={realtime ? `${realtime >= 1 ? realtime.toFixed(1) : realtime.toFixed(2)}× realtime` : undefined}
          />
          <Stat
            label="Frames"
            value={frames ? `${frames.encoded.toLocaleString()} / ${frames.total.toLocaleString()}` : '—'}
            hint={state.outputBytes ? formatBytes(state.outputBytes) : undefined}
          />
        </div>
      ) : null}

      {state.phase === 'done' && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground tabular-nums">
            Finished in {formatDuration(elapsedMs)}
            {state.outputBytes ? ` · ${formatBytes(state.outputBytes)}` : ''}
            {frames?.framesPerSecond ? ` · avg ${frames.framesPerSecond.toFixed(1)} fps` : ''}
          </span>
          <span className="flex-1" />
          {state.outputUrl ? (
            <>
              <Button size="sm" variant="outline" onClick={() => copyLink(state.outputUrl!)}>
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                Copy link
              </Button>
              <Button size="sm" asChild>
                <a href={state.outputUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Open
                </a>
              </Button>
            </>
          ) : state.destination === 'device' ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <HardDrive className="h-4 w-4" />
              Saved to your computer
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}

/**
 * Compact floating card shown in the corner while the render modal is closed,
 * so a long render stays visible (and pausable) while you keep editing.
 */
export function BrowserRenderDockCard({
  controller,
  onExpand,
  onDismiss,
}: {
  controller: BrowserRenderController;
  onExpand: () => void;
  onDismiss: () => void;
}) {
  const { state, pause, resume, cancel } = controller;
  const { elapsedMs, frames, upload, uploadRemainingMs } = useRenderNumbers(state);
  const confirm = useCancelConfirm(cancel);
  const active = isBrowserRenderActive(state.phase);
  const canPause =
    state.renderType === 'video' &&
    (state.phase === 'rendering' || state.phase === 'preparing');

  const detail = (() => {
    if (state.phase === 'rendering' && !state.paused) {
      const eta = frames?.etaMs == null ? 'estimating…' : `${formatDuration(frames.etaMs)} left`;
      const speed = frames?.framesPerSecond ? ` · ${frames.framesPerSecond.toFixed(0)} fps` : '';
      return `${Math.round(state.progress * 100)}% · ${eta}${speed}`;
    }
    if (state.paused) return `${Math.round(state.progress * 100)}% · paused at ${formatDuration(elapsedMs)}`;
    if (state.phase === 'uploading' && upload) {
      const left = uploadRemainingMs === null ? '' : ` · ${formatDuration(uploadRemainingMs)} left`;
      return `${formatBytes(upload.loaded)} of ${formatBytes(upload.total)}${left}`;
    }
    if (state.phase === 'done') {
      return `Finished in ${formatDuration(elapsedMs)}${state.outputBytes ? ` · ${formatBytes(state.outputBytes)}` : ''}`;
    }
    if (state.phase === 'error') return state.error ?? 'Something went wrong';
    return `Elapsed ${formatDuration(elapsedMs)}`;
  })();

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'w-80 rounded-xl border bg-background/95 p-3 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-background/80',
        'animate-in fade-in slide-in-from-bottom-4 duration-300',
        state.phase === 'error' && 'border-destructive/50',
        state.phase === 'done' && 'border-emerald-500/40',
        state.paused && 'border-amber-500/50',
      )}
    >
      {confirm.dialog}
      <div className="flex items-center gap-2.5">
        <StatusIcon state={state} className="h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{describeBrowserRender(state)}</div>
          <div className="truncate text-xs text-muted-foreground" title={state.fileName ?? undefined}>
            {state.fileName}
          </div>
        </div>
        <div className="flex items-center">
          {canPause && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={state.paused || state.pauseRequested ? resume : pause}
                  aria-label={state.paused || state.pauseRequested ? 'Resume render' : 'Pause render'}
                >
                  {state.paused || state.pauseRequested ? (
                    <Play className="h-3.5 w-3.5" />
                  ) : (
                    <Pause className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{state.paused || state.pauseRequested ? 'Resume' : 'Pause'}</TooltipContent>
            </Tooltip>
          )}
          {state.phase === 'done' && state.outputUrl && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                  <a href={state.outputUrl} target="_blank" rel="noreferrer" aria-label="Open output">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open output</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onExpand} aria-label="Show details">
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Show details</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={active ? confirm.ask : onDismiss}
                aria-label={active ? 'Cancel render' : 'Dismiss'}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{active ? 'Cancel render' : 'Dismiss'}</TooltipContent>
          </Tooltip>
        </div>
      </div>
      {state.phase !== 'error' && (
        <div className="mt-2.5">
          <Bar state={state} />
        </div>
      )}
      <div
        className={cn(
          'mt-1.5 truncate text-xs tabular-nums',
          state.phase === 'error' ? 'text-destructive' : 'text-muted-foreground',
        )}
        title={detail}
      >
        {detail}
      </div>
    </div>
  );
}
