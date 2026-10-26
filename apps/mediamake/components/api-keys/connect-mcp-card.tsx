'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check, Copy, Plug } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * The hosted MCP connector's URL (app/mcp/route.ts), with how to add it.
 * Signing in through the connector uses the same client id and key as /login.
 */
export function ConnectMcpCard() {
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);
  useEffect(() => setUrl(`${window.location.origin}/mcp`), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-10">
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Plug className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">Use MediaMake from Claude</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add this URL as a custom connector (Claude: Settings → Connectors → Add custom connector) and sign in with
              your client ID and key. It works as your account, with your access.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-md border bg-muted/50 px-3 py-2 font-mono text-sm">
                {url || '…'}
              </code>
              <Button variant="outline" size="sm" onClick={copy} disabled={!url}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                Copy
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Claude Code: <code className="font-mono">claude mcp add --transport http mediamake {url || '<url>'}</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
