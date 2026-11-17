'use client';

import { useState } from 'react';
import { Check, Copy, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LAUNCH_VIDEO_SKILL, launchVideoGaps } from '@/lib/catalog/launch-video';
import { tierOf, type ItemDetail } from './model';

/**
 * A skill's, MCP's or app's launch video, in its Intro video panel: the
 * prompt to copy (filled with the item's facts by the admin API), which runs
 * make-cwc-tutorial on the admin's own computer. The finished video comes
 * back as the intro: Claude attaches it with mm-release's catalog_set_video,
 * or its YouTube link is added with the button beside this one.
 */

/** What the launch video prompt still lacks, as a short amber list; nothing when it lacks nothing. */
export function LaunchVideoGaps({ detail }: { detail: ItemDetail }) {
  const { item } = detail;
  if (!detail.launchVideoPrompt) return null;
  const gaps = launchVideoGaps({
    kind: item.kind,
    readiness: item.readiness ?? 'beta',
    proof: detail.readinessMark?.proof ?? item.readyProof,
    tier: tierOf(item),
    installable: !!detail.installPrompt,
    knownIssues: detail.openKnownIssues,
  });
  if (!gaps.length) return null;
  return (
    <ul className="mt-4 flex flex-col gap-1.5 rounded-lg bg-amber-500/10 px-3 py-2.5 text-xs text-amber-800 dark:text-amber-200">
      {gaps.map(gap => (
        <li key={gap} className="flex items-start gap-2">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          <span>{gap}</span>
        </li>
      ))}
    </ul>
  );
}

/** Copies the launch video prompt; where the browser won't copy, it opens the prompt to copy by hand. */
export function CopyLaunchPrompt({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);
  const [shown, setShown] = useState(false);
  return (
    <>
      <Button
        size="sm"
        variant="outline"
        title={`Paste it into Claude on a computer that has ${LAUNCH_VIDEO_SKILL}: it makes the video there`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(prompt);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            setShown(true);
          }
        }}
      >
        {copied ? <Check /> : <Copy />}
        {copied ? 'Copied' : 'Copy launch video prompt'}
      </Button>
      <Dialog open={shown} onOpenChange={setShown}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Launch video prompt</DialogTitle>
            <DialogDescription>Your browser didn&apos;t copy it. Select it here and copy it by hand.</DialogDescription>
          </DialogHeader>
          <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed">{prompt}</pre>
        </DialogContent>
      </Dialog>
    </>
  );
}
