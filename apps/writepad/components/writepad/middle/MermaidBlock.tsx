'use client';

/**
 * MermaidBlock — renders a Mermaid diagram from a fenced code block.
 *
 * Lazily imports the mermaid library to avoid bundle bloat on pages that
 * never render diagrams. Theme follows next-themes (dark / light).
 */

import { useEffect, useRef, useState, useId } from 'react';
import { useTheme } from 'next-themes';

// Singleton lazy-load — mermaid is ~2MB; load it once then cache the promise.
let mermaidCache: Promise<typeof import('mermaid')['default']> | null = null;

function loadMermaid() {
  if (!mermaidCache) {
    mermaidCache = import('mermaid').then((m) => m.default);
  }
  return mermaidCache;
}

interface MermaidBlockProps {
  code: string;
}

export function MermaidBlock({ code }: MermaidBlockProps) {
  // useId produces strings like ":r0:" — strip colons so it's a valid HTML id.
  const rawId = useId();
  const diagramId = `mermaid-${rawId.replace(/:/g, '')}`;

  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    setLoading(true);
    setError(null);

    loadMermaid()
      .then((mermaid) => {
        if (cancelled) return;

        mermaid.initialize({
          startOnLoad: false,
          theme: resolvedTheme === 'light' ? 'default' : 'dark',
          fontFamily: 'inherit',
          securityLevel: 'loose',
        });

        return mermaid.render(diagramId, code);
      })
      .then((result) => {
        if (cancelled || !result || !containerRef.current) return;
        containerRef.current.innerHTML = result.svg;
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'Invalid diagram syntax';
        setError(msg);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  // Intentionally re-run when code or theme changes.
  // diagramId is stable (useId) so safe to include.
  }, [code, resolvedTheme, diagramId]);

  if (error) {
    return (
      <div className="my-4 rounded-md border border-red-500/25 bg-red-500/8 p-3">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-red-400/80">
          Mermaid diagram error
        </p>
        <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[11px] text-red-400">
          {error}
        </pre>
      </div>
    );
  }

  return (
    <div className="relative my-6">
      {loading && (
        <div className="flex h-24 items-center justify-center rounded-md bg-muted/40">
          <span className="text-[11px] text-muted-foreground/50 animate-pulse">
            Rendering diagram…
          </span>
        </div>
      )}
      {/* Container is always in DOM so mermaid can write into it; hidden while loading */}
      <div
        ref={containerRef}
        className={[
          'flex justify-center overflow-x-auto rounded-md bg-muted/20 p-4',
          '[&_svg]:max-w-full [&_svg]:h-auto',
          loading ? 'hidden' : '',
        ].join(' ')}
      />
    </div>
  );
}
