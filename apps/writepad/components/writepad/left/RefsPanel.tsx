'use client';

/**
 * RefsPanel — left sidebar panel listing all local-wiki entries (.writepad/wiki/).
 * Entries are grouped by their first tag (character, location, etc.) in a
 * canonical display order, with collapsible sections.
 */

import { BookOpen, ChevronDown, ChevronRight, PlusCircle, Search } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { WikiTerm } from '@/components/writepad/middle/types';

// ─── Tag ordering ─────────────────────────────────────────────────────────────

const TAG_ORDER = ['character', 'location', 'faction', 'item', 'concept', 'event', 'world-rule'];

function tagGroup(term: WikiTerm): string {
  return term.tags[0] ?? 'uncategorized';
}

function sortedGroupKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    if (a === 'uncategorized') return 1;
    if (b === 'uncategorized') return -1;
    const ai = TAG_ORDER.indexOf(a);
    const bi = TAG_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface RefsPanelProps {
  wikiTerms: WikiTerm[];
  onGoToDefinition: (fileId: string) => void;
  onFindAllRefs: (term: WikiTerm) => void;
  onCreateWikiEntry?: (word?: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RefsPanel({
  wikiTerms,
  onGoToDefinition,
  onFindAllRefs,
  onCreateWikiEntry,
}: RefsPanelProps) {
  const [filter, setFilter] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (group: string) =>
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });

  const q = filter.toLowerCase();
  const filtered = wikiTerms.filter(
    (t) =>
      !filter ||
      t.term.toLowerCase().includes(q) ||
      t.aliases.some((a) => a.toLowerCase().includes(q)) ||
      t.summary.toLowerCase().includes(q),
  );

  // Group → sorted terms
  const groups = new Map<string, WikiTerm[]>();
  for (const term of filtered) {
    const g = tagGroup(term);
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(term);
  }
  // Sort terms within each group alphabetically
  for (const terms of groups.values()) {
    terms.sort((a, b) => a.term.localeCompare(b.term));
  }
  const groupKeys = sortedGroupKeys([...groups.keys()]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="shrink-0 border-b border-border px-2 py-1.5 flex items-center gap-1">
        <div className="flex items-center gap-1.5 flex-1 rounded bg-muted px-2 py-1">
          <Search size={11} className="text-muted-foreground/50" />
          <input
            type="text"
            placeholder="Filter wiki terms…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1 bg-transparent text-[11px] text-foreground placeholder:text-muted-foreground/50 outline-none"
          />
        </div>
        {onCreateWikiEntry && (
          <button
            onClick={() => onCreateWikiEntry()}
            title="New wiki entry"
            className="rounded p-1 text-muted-foreground/40 hover:text-violet-400 transition-colors"
          >
            <PlusCircle size={13} />
          </button>
        )}
      </div>

      {/* Term list */}
      <div className="flex-1 overflow-y-auto py-0.5">
        {wikiTerms.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center px-4">
            <BookOpen size={20} className="text-muted-foreground/25" />
            <p className="text-[11px] font-medium text-muted-foreground/60">No wiki entries yet</p>
            <p className="text-[10px] text-muted-foreground/40">
              Right-click any word in the editor and select &quot;Create Wiki Entry&quot; to define it.
            </p>
            {onCreateWikiEntry && (
              <button
                onClick={() => onCreateWikiEntry()}
                className="mt-1 rounded border border-violet-500/30 px-2 py-1 text-[10px] text-violet-400 hover:bg-violet-500/10 transition-colors"
              >
                + New Entry
              </button>
            )}
          </div>
        ) : filtered.length === 0 ? (
          /* No matches */
          <div className="flex flex-col items-center justify-center gap-1 py-8 px-4">
            <p className="text-[11px] text-muted-foreground/50">No matches for &quot;{filter}&quot;</p>
          </div>
        ) : (
          /* Grouped list */
          groupKeys.map((group) => {
            const terms = groups.get(group) ?? [];
            const isCollapsed = collapsedGroups.has(group);
            return (
              <div key={group}>
                {/* Section header */}
                <button
                  className="w-full flex items-center gap-1 px-2 py-1 hover:bg-accent/50 transition-colors"
                  onClick={() => toggleGroup(group)}
                >
                  {isCollapsed
                    ? <ChevronRight size={10} className="text-muted-foreground/40 shrink-0" />
                    : <ChevronDown size={10} className="text-muted-foreground/40 shrink-0" />
                  }
                  <span className="text-[9.5px] font-semibold uppercase tracking-widest text-muted-foreground/50 flex-1 text-left">
                    {group}
                  </span>
                  <span className="text-[9px] text-muted-foreground/35">
                    {terms.length}
                  </span>
                </button>

                {/* Terms in this group */}
                {!isCollapsed && terms.map((term) => (
                  <WikiTermRow
                    key={term.fileId}
                    term={term}
                    onGoToDefinition={onGoToDefinition}
                    onFindAllRefs={onFindAllRefs}
                  />
                ))}
              </div>
            );
          })
        )}
      </div>

      {/* Footer count */}
      {wikiTerms.length > 0 && (
        <div className="shrink-0 border-t border-border/50 px-3 py-1 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground/50">
            {wikiTerms.length} entr{wikiTerms.length !== 1 ? 'ies' : 'y'}
          </span>
          {onCreateWikiEntry && (
            <button
              onClick={() => onCreateWikiEntry()}
              className="text-[10px] text-violet-400/70 hover:text-violet-400 transition-colors"
            >
              + New
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Individual wiki term row ─────────────────────────────────────────────────

function WikiTermRow({
  term,
  onGoToDefinition,
  onFindAllRefs,
}: {
  term: WikiTerm;
  onGoToDefinition: (fileId: string) => void;
  onFindAllRefs: (term: WikiTerm) => void;
}) {
  return (
    <div
      className={cn(
        'group pl-5 pr-2 py-1.5 cursor-pointer hover:bg-accent transition-colors',
        'border-b border-border/20 last:border-b-0',
      )}
      onClick={() => onGoToDefinition(term.fileId)}
      title={`Open definition of "${term.term}"`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[11.5px] font-semibold text-violet-400 truncate">
          {term.term}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onFindAllRefs(term);
          }}
          className="shrink-0 opacity-0 group-hover:opacity-100 rounded px-1 py-0.5 text-[9px] text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          title={`Find all references to "${term.term}"`}
        >
          refs
        </button>
      </div>
      {term.summary && (
        <p className="mt-0.5 text-[10px] text-muted-foreground/60 truncate leading-4">
          {term.summary}
        </p>
      )}
      {term.aliases.length > 0 && (
        <p className="mt-0.5 text-[9px] text-muted-foreground/35 truncate leading-4 italic">
          {term.aliases.join(', ')}
        </p>
      )}
    </div>
  );
}
