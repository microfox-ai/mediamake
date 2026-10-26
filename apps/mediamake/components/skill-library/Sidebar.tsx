'use client';

import { FolderTreeIcon, LoaderIcon, PlusIcon, RefreshCwIcon, StarIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Hint } from '@/components/revisions/keyboard';
import { categoryAbout } from '@/lib/skill-library/model';
import { VARIANT_KINDS } from '@/lib/skill-library/types';
import { KIND_LABEL } from './Cards';
import { NO_FILTERS, useSkillLibraryStore } from './store';

function Heading({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex h-8 items-center justify-between px-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      {children}
      {action}
    </div>
  );
}

function Option({ active, onClick, label, count, hint }: { active: boolean; onClick: () => void; label: React.ReactNode; count?: number; hint?: string }) {
  return (
    <button
      type="button"
      title={hint}
      onClick={onClick}
      className={cn('flex h-8 w-full items-center gap-2 rounded-lg px-3 text-left text-[13px] transition hover:bg-muted', active ? 'bg-foreground text-background hover:bg-foreground' : 'text-foreground/80')}
    >
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count !== undefined && <span className={cn('text-[11px] tabular-nums', active ? 'text-background/70' : 'text-muted-foreground')}>{count}</span>}
    </button>
  );
}

export function Sidebar() {
  const sources = useSkillLibraryStore(s => s.sources);
  const library = useSkillLibraryStore(s => s.library);
  const filters = useSkillLibraryStore(s => s.filters);
  const view = useSkillLibraryStore(s => s.view);
  const pins = useSkillLibraryStore(s => s.pins);
  const setFilters = useSkillLibraryStore(s => s.setFilters);
  const addSource = useSkillLibraryStore(s => s.addSource);
  const reconnect = useSkillLibraryStore(s => s.reconnectSource);
  const remove = useSkillLibraryStore(s => s.removeSource);
  const rescan = useSkillLibraryStore(s => s.rescan);

  const skills = Object.values(library.skills);
  const variants = skills.filter(s => s.variant);
  const kindCount = (k: string) => variants.filter(v => v.variant!.kind === k).length;
  const filtered = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS);
  const forSkills = view !== 'projects';

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r bg-muted/20">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-5 px-2 py-3">
          <section>
            <Option active={filters.pinned} onClick={() => setFilters({ pinned: !filters.pinned })} label={<span className="flex items-center gap-2"><StarIcon className="size-3.5" /> Pinned</span>} count={pins.length} />
          </section>

          {forSkills && (
            <section>
              <Heading>Type</Heading>
              <Option active={filters.type === 'all' && !filters.variantKind} onClick={() => setFilters({ type: 'all', variantKind: null })} label="Everything" count={skills.length} />
              <Option active={filters.type === 'base'} onClick={() => setFilters({ type: 'base', variantKind: null })} label="Base skills" count={skills.length - variants.length} />
              <Option active={filters.type === 'variant' && !filters.variantKind} onClick={() => setFilters({ type: 'variant', variantKind: null })} label="Variants" count={variants.length} />
              {variants.length > 0 &&
                VARIANT_KINDS.filter(k => kindCount(k)).map(k => (
                  <div key={k} className="pl-3">
                    <Option active={filters.variantKind === k} onClick={() => setFilters({ type: 'variant', variantKind: filters.variantKind === k ? null : k })} label={KIND_LABEL[k]} count={kindCount(k)} />
                  </div>
                ))}
            </section>
          )}

          {forSkills && library.categories.length > 0 && (
            <section>
              <Heading>Category</Heading>
              <Option active={!filters.category} onClick={() => setFilters({ category: null })} label="All categories" />
              {library.categories.map(c => (
                <Option key={c.id} active={filters.category === c.id} onClick={() => setFilters({ category: filters.category === c.id ? null : c.id })} label={<span className="capitalize">{c.id}</span>} count={c.count} hint={categoryAbout(c.id)} />
              ))}
            </section>
          )}

          {library.owners.length > 0 && (
            <section>
              <Heading>Owner</Heading>
              <Option active={!filters.owner} onClick={() => setFilters({ owner: null })} label="Anyone" />
              {library.owners.map(o => (
                <Option key={o} active={filters.owner === o} onClick={() => setFilters({ owner: filters.owner === o ? null : o })} label={o} />
              ))}
            </section>
          )}

          {filtered && (
            <div className="px-1">
              <Button variant="ghost" size="sm" className="h-7 w-full text-xs" onClick={() => setFilters(NO_FILTERS)}>
                Clear filters
              </Button>
            </div>
          )}

          <section>
            <Heading
              action={
                <span className="flex gap-0.5">
                  <Hint label="Read every folder again">
                    <button type="button" className="rounded p-1 hover:bg-muted hover:text-foreground" onClick={() => void rescan()}>
                      <RefreshCwIcon className="size-3.5" />
                    </button>
                  </Hint>
                  <Hint label="Add a folder: a repo, ~/.claude/skills, or a projects folder">
                    <button type="button" className="rounded p-1 hover:bg-muted hover:text-foreground" onClick={() => void addSource()}>
                      <PlusIcon className="size-3.5" />
                    </button>
                  </Hint>
                </span>
              }
            >
              Folders
            </Heading>
            {sources.map(src => (
              <div key={src.id} className="group rounded-lg px-3 py-1.5">
                <div className="flex items-center gap-2 text-[13px]">
                  <FolderTreeIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{src.name}</span>
                  {src.status === 'scanning' && <LoaderIcon className="size-3 animate-spin text-muted-foreground" />}
                  <Hint label="Remove this folder from the library (nothing is deleted)">
                    <button type="button" className="rounded p-0.5 text-muted-foreground opacity-0 hover:bg-muted hover:text-foreground group-hover:opacity-100" onClick={() => void remove(src.id)}>
                      <XIcon className="size-3.5" />
                    </button>
                  </Hint>
                </div>
                {src.status === 'ready' && src.scan && (
                  <div className="pl-[22px] text-[11px] text-muted-foreground">
                    {src.scan.skills.length} skills · {src.scan.projects.length} projects
                  </div>
                )}
                {src.status === 'needs-permission' && (
                  <Button variant="outline" size="sm" className="ml-5 mt-1 h-6 text-xs" onClick={() => void reconnect(src.id)}>
                    Reconnect
                  </Button>
                )}
                {src.status === 'error' && <div className="pl-[22px] text-[11px] text-destructive">Could not read this folder</div>}
              </div>
            ))}
          </section>
        </div>
      </div>
    </aside>
  );
}
