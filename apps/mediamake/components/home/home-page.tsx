'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CatalogEntry } from '@/lib/catalog/types';
import { CatalogCard } from './catalog-card';
import { homeTabs, type HomeTab } from './tabs';

const MEDIAMAKE_REPO = 'https://github.com/microfox-ai/mediamake';
const EXTENSIONS_REPO = 'https://github.com/microfox-ai/extensions';


export function HomePage({
  cards,
  initialTab,
  signedIn,
}: {
  cards: CatalogEntry[];
  initialTab: HomeTab;
  signedIn: boolean;
}) {
  const [tab, setTab] = useState<HomeTab>(initialTab);
  const active = homeTabs.find((t) => t.value === tab)!;

  const selectTab = (value: HomeTab) => {
    setTab(value);
    const url = new URL(window.location.href);
    if (value === 'home') url.searchParams.delete('tab');
    else url.searchParams.set('tab', value);
    window.history.replaceState(null, '', url);
  };

  const visible = 'kind' in active ? cards.filter((c) => c.kind === active.kind) : cards;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link
            href="/"
            onClick={() => selectTab('home')}
            className="flex items-center gap-2 text-xl font-bold tracking-tight"
          >
            <img src="/brand/mediamake-mark.svg" alt="" className="size-7" />
            MediaMake
          </Link>

          <nav className="mx-auto hidden md:block">
            <TabList tab={tab} onSelect={selectTab} />
          </nav>

          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <Button asChild size="sm">
              <Link href="/apps">
                Open App
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="icon" className="size-8">
              <a href={MEDIAMAKE_REPO} target="_blank" rel="noreferrer" aria-label="MediaMake on GitHub" title="MediaMake on GitHub">
                <GitHubMark className="size-5" />
              </a>
            </Button>
          </div>
        </div>
        <nav className="overflow-x-auto px-4 pb-2 md:hidden">
          <TabList tab={tab} onSelect={selectTab} />
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4">
        {tab === 'home' && (
          // Hero is intentionally minimal for now.
          <section className="flex min-h-[40vh] flex-col items-center justify-center gap-3 py-16 text-center">
            <img src="/brand/mediamake-mark-glow.svg" alt="" className="h-20 w-auto" />
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">MediaMake</h1>
            <p className="max-w-xl text-muted-foreground">
              MCPs, skills, apps and tutorials for making content.
            </p>
          </section>
        )}

        <section className={cn('pb-16', tab !== 'home' && 'pt-10')}>
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">
            {tab === 'home' ? 'Latest releases' : active.label}
          </h2>
          {visible.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((card) => (
                <CatalogCard key={card.id} card={card} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              {signedIn ? (
                'Nothing shared with you here yet.'
              ) : (
                <>
                  Releases are invite only for now.{' '}
                  <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
                    Sign in
                  </Link>{' '}
                  to see what's shared with you.
                </>
              )}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t py-6 text-sm text-muted-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 sm:flex-row sm:justify-between">
          <span>Built by the Microfox team</span>
          <nav className="flex items-center gap-4">
            <a href={MEDIAMAKE_REPO} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-foreground">
              <GitHubMark className="size-4" />
              MediaMake
            </a>
            <a href={EXTENSIONS_REPO} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-foreground">
              <GitHubMark className="size-4" />
              Extensions
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function TabList({ tab, onSelect }: { tab: HomeTab; onSelect: (tab: HomeTab) => void }) {
  return (
    <div role="tablist" className="flex w-max items-center gap-1">
      {homeTabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={tab === t.value}
          onClick={() => onSelect(t.value)}
          className={cn(
            'cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium uppercase tracking-wide transition-colors',
            tab === t.value
              ? 'bg-muted text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** GitHub's mark (lucide no longer ships brand icons). */
function GitHubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}
