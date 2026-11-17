'use client';

import * as React from 'react';
import { CheckIcon, CopyIcon } from 'lucide-react';

/** One command line with a button that copies it. */
export function CopyLine({ line, label }: { line: string; /** What the button copies, for screen readers. */ label?: string }) {
  const [copied, setCopied] = React.useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(line);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // no clipboard here: the line is selectable
    }
  };
  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-md border bg-background px-3 py-2 font-mono text-xs">{line}</code>
      <button type="button" onClick={copy} aria-label={label ? `Copy ${label}` : 'Copy'} className="inline-flex shrink-0 items-center gap-1.5 rounded-md border bg-background px-3 py-2 text-xs font-medium hover:bg-muted">
        {copied ? <CheckIcon className="size-3.5" aria-hidden /> : <CopyIcon className="size-3.5" aria-hidden />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
