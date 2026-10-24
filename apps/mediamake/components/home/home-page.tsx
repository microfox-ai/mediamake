'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CatalogEntry } from '@/lib/catalog/types';
import { CatalogCard } from './catalog-card';
import { homeTabs, type HomeTab } from './tabs';


export function HomePage({ cards, initialTab }: { cards: CatalogEntry[]; initialTab: HomeTab }) {
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
          <Link href="/" onClick={() => selectTab('home')} className="text-lg font-bold tracking-tight">
            mediamake
          </Link>

          <nav className="mx-auto hidden md:block">
            <TabList tab={tab} onSelect={selectTab} />
          </nav>

          <Button asChild size="sm" className="ml-auto md:ml-0">
            <Link href="/projects">
              Open App
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <nav className="overflow-x-auto px-4 pb-2 md:hidden">
          <TabList tab={tab} onSelect={selectTab} />
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4">
        {tab === 'home' && (
          // Hero is intentionally minimal for now.
          <section className="flex min-h-[40vh] flex-col items-center justify-center gap-3 py-16 text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">mediamake</h1>
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
              Nothing released here yet.
            </div>
          )}
        </section>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        Built by the Microfox team
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
