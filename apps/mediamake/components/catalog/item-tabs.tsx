'use client';

import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * The tabs on the left of an item's page: README first, then what the page
 * has (how it works, what was made with it, its release notes, feedback).
 * The page's address carries the tab (`#feedback`), so a link opens on it;
 * `aliases` sends an older anchor (`#made-with-this`, `#v1.2.0`) to its tab.
 */
export function ItemTabs({ tabs, aliases = {} }: { tabs: { id: string; label: string; count?: number; content: React.ReactNode }[]; aliases?: Record<string, string> }) {
  const [tab, setTab] = useState(tabs[0]?.id ?? '');

  useEffect(() => {
    const fromHash = () => {
      const hash = decodeURIComponent(window.location.hash.slice(1));
      if (!hash) return;
      const id = tabs.some(entry => entry.id === hash) ? hash : (aliases[hash] ?? Object.entries(aliases).find(([prefix]) => prefix.endsWith('*') && hash.startsWith(prefix.slice(0, -1)))?.[1]);
      if (!id || !tabs.some(entry => entry.id === id)) return;
      setTab(id);
      // an anchor inside the tab (a release's version) is in the page only once its tab is open
      if (id !== hash) requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ block: 'start' }));
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
    // the tabs are the page's own: they don't change while it is open
  }, []);

  return (
    <Tabs
      value={tab}
      onValueChange={next => {
        setTab(next);
        window.history.replaceState(null, '', next === tabs[0]?.id ? window.location.pathname + window.location.search : `#${next}`);
      }}
      className="min-w-0 gap-5"
    >
      <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-none border-b bg-transparent p-0">
        {tabs.map(entry => (
          <TabsTrigger
            key={entry.id}
            value={entry.id}
            className="h-10 flex-none rounded-none border-0 border-b-2 border-transparent px-3 text-muted-foreground shadow-none data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none dark:data-[state=active]:bg-transparent"
          >
            {entry.label}
            {entry.count ? <span className="rounded-full bg-muted px-1.5 text-[11px] tabular-nums text-muted-foreground">{entry.count}</span> : null}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map(entry => (
        <TabsContent key={entry.id} value={entry.id} forceMount className="min-w-0 data-[state=inactive]:hidden">
          {entry.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
