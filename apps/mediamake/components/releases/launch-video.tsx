'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Check, ChevronDown, Clapperboard, Copy, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LAUNCH_VIDEO_SKILL, launchVideoGaps } from '@/lib/catalog/launch-video';
import { tierOf, type ItemDetail } from './model';

/**
 * A skill's, MCP's or app's launch video, at the top of its Intro video
 * panel: the prompt to copy (filled with the item's facts by the admin API),
 * which runs make-cwc-tutorial on the admin's own computer, and what the
 * prompt still lacks. The finished video comes back as the intro: Claude
 * attaches it with mm-release's catalog_set_video, or its YouTube link is
 * pasted into the fields under this.
 */
export function LaunchVideo({ detail }: { detail: ItemDetail }) {
  const { item, video, launchVideoPrompt: prompt } = detail;
  const [open, setOpen] = useState(false);
  if (!prompt) return null;
  const gaps = launchVideoGaps({
    kind: item.kind,
    readiness: item.readiness ?? 'beta',
    proof: detail.readinessMark?.proof ?? item.readyProof,
    tier: tierOf(item),
    installable: !!detail.installPrompt,
  });

  return (
    <div className="mb-5 rounded-xl border bg-muted/30 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Clapperboard className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium">{video ? 'Make a new launch video' : 'Make its launch video'}</p>
            <p className="text-xs text-muted-foreground">
              A Cook with Claude episode about {item.title}, made with <span className="font-mono">{LAUNCH_VIDEO_SKILL}</span> on your own computer.
            </p>
          </div>
        </div>
        <CopyLaunchPrompt prompt={prompt} />
      </div>

      <ol className="mt-4 flex flex-col gap-2 text-sm">
        {[
          'Copy the prompt. It carries what the catalog knows about this item.',
          `Paste it into Claude on a computer that has ${LAUNCH_VIDEO_SKILL}. It renders there, and you review it in rounds.`,
          video
            ? 'Once it is on YouTube, Claude swaps it in as the intro after you say so, or you paste its link below.'
            : 'Once it is on YouTube, Claude attaches it here as the intro, or you paste its link below.',
        ].map((step, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-background text-[11px] font-medium tabular-nums ring-1 ring-border">
              {i + 1}
            </span>
            <span className="min-w-0 text-muted-foreground">{step}</span>
          </li>
        ))}
      </ol>

      {gaps.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1.5 rounded-lg bg-amber-500/10 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-200">
          {gaps.map(gap => (
            <li key={gap} className="flex items-start gap-2">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              <span>{gap}</span>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="mt-3 flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
        {open ? 'Hide the prompt' : 'See the prompt'}
      </button>
      {open && (
        <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg border bg-background p-3 font-mono text-xs leading-relaxed">{prompt}</pre>
      )}
    </div>
  );
}

function CopyLaunchPrompt({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      className="w-fit shrink-0"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(prompt);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error('Could not copy: open "See the prompt" and copy it by hand');
        }
      }}
    >
      {copied ? <Check /> : <Copy />}
      {copied ? 'Copied' : 'Copy launch video prompt'}
    </Button>
  );
}
