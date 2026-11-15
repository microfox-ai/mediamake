'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { SETUP_PROMPT } from '@/lib/catalog/install-prompt';

/**
 * A thin bar at the very top of the homepage: the standard way to get MediaMake on a computer.
 * Its button copies the setup prompt (the setup-mediamake skill) to paste into Claude Code, the
 * Claude desktop app's Code tab, or any Claude that can run commands on the person's computer.
 */
export function SetupBanner() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SETUP_PROMPT);
    } catch {
      // No clipboard access: show it to copy by hand.
      window.prompt('Copy this prompt and paste it into Claude Code:', SETUP_PROMPT);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="border-b bg-primary text-primary-foreground">
      <div className="mx-auto flex h-8 max-w-6xl items-center gap-3 px-4 text-xs">
        <p className="min-w-0 flex-1 truncate" title={SETUP_PROMPT}>
          <span className="font-medium">New here?</span>{' '}
          <span className="opacity-80">
            Copy the setup prompt and paste it into Claude Code: it sets up the repo, dependencies, library and
            everything else.
          </span>
        </p>
        <button
          type="button"
          onClick={copy}
          title={SETUP_PROMPT}
          className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full bg-primary-foreground px-3 font-medium text-primary transition-opacity hover:opacity-90"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? 'Copied' : 'Setup MediaMake'}
        </button>
      </div>
    </div>
  );
}
