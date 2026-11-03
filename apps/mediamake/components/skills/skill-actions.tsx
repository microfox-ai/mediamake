'use client';

import { useState } from 'react';
import { CheckIcon, CopyIcon, LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { copyInstallPrompt } from '@/lib/catalog/copy-install-prompt';

/** A skill page's buttons: copy the install prompt, and copy (or share) the page's link. */
export function SkillActions({ itemId, installPrompt, title }: { itemId: string; installPrompt: string; title: string }) {
  const [copied, setCopied] = useState<'prompt' | 'link' | null>(null);
  const flash = (what: 'prompt' | 'link') => {
    setCopied(what);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        title={installPrompt}
        onClick={async () => {
          await copyInstallPrompt(itemId, installPrompt).catch(() => navigator.clipboard?.writeText(installPrompt));
          flash('prompt');
        }}
      >
        {copied === 'prompt' ? <CheckIcon /> : <CopyIcon />}
        {copied === 'prompt' ? 'Copied' : 'Copy install prompt'}
      </Button>
      <Button
        variant="outline"
        onClick={async () => {
          const url = window.location.href.split('#')[0];
          // phones get the share sheet; elsewhere the link goes on the clipboard
          if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
            await navigator.share({ title, url }).catch(() => undefined);
            return;
          }
          await navigator.clipboard?.writeText(url).catch(() => undefined);
          flash('link');
        }}
      >
        {copied === 'link' ? <CheckIcon /> : <LinkIcon />}
        {copied === 'link' ? 'Link copied' : 'Share'}
      </Button>
    </div>
  );
}
