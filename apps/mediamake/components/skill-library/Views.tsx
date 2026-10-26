'use client';

import { useMemo } from 'react';
import { ArrowRightIcon, FolderKanbanIcon, GitForkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { filterFamilies, filterProjects, filterSkills } from '@/lib/skill-library/filter';
import { humanize } from '@/lib/skill-library/model';
import type { Skill } from '@/lib/skill-library/types';
import { Chip, KIND_LABEL, ProjectCard, SkillCard } from './Cards';
import { Thumb } from './Thumb';
import { useSkillLibraryStore } from './store';

const GRID = {
  sm: 'grid-cols-[repeat(auto-fill,minmax(170px,1fr))]',
  md: 'grid-cols-[repeat(auto-fill,minmax(240px,1fr))]',
  lg: 'grid-cols-[repeat(auto-fill,minmax(340px,1fr))]',
} as const;

export function useMatchingSkills(): Skill[] {
  const library = useSkillLibraryStore(s => s.library);
  const query = useSkillLibraryStore(s => s.query);
  const filters = useSkillLibraryStore(s => s.filters);
  const sort = useSkillLibraryStore(s => s.sort);
  const pins = useSkillLibraryStore(s => s.pins);
  return useMemo(
    () => filterSkills(library, { query, ...filters, pinned: filters.pinned ? new Set(pins) : null, sort }),
    [library, query, filters, sort, pins],
  );
}

export function useMatchingProjects() {
  const library = useSkillLibraryStore(s => s.library);
  const query = useSkillLibraryStore(s => s.query);
  const filters = useSkillLibraryStore(s => s.filters);
  const sort = useSkillLibraryStore(s => s.sort);
  const pins = useSkillLibraryStore(s => s.pins);
  return useMemo(
    () => filterProjects(library, { query, owner: filters.owner, pinned: filters.pinned ? new Set(pins) : null, sort }),
    [library, query, filters, sort, pins],
  );
}

function Nothing({ children }: { children: React.ReactNode }) {
  return <div className="grid h-64 place-items-center text-sm text-muted-foreground">{children}</div>;
}

function SectionTitle({ title, count, about }: { title: string; count: number; about?: string }) {
  return (
    <div className="mb-3 flex items-baseline gap-2 px-1.5">
      <h2 className="text-[15px] font-semibold capitalize tracking-tight">{title}</h2>
      <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
      {about && <span className="truncate text-xs text-muted-foreground">· {about}</span>}
    </div>
  );
}

/** Every skill as a card. Grouped: a base stands for its variants (shown stacked), unless only variants match. */
export function SkillsGrid() {
  const matching = useMatchingSkills();
  const size = useSkillLibraryStore(s => s.cardSize);
  const group = useSkillLibraryStore(s => s.groupVariants);
  const filters = useSkillLibraryStore(s => s.filters);
  const query = useSkillLibraryStore(s => s.query);
  const skills = useSkillLibraryStore(s => s.library.skills);

  // grouping only makes sense while bases are shown and nothing narrows the list: a search shows each match itself
  const grouping = group && !query && filters.type === 'all' && !filters.variantKind;
  const shown = useMemo(() => {
    if (!grouping) return matching;
    const names = new Set(matching.map(s => s.name));
    return matching.filter(s => !s.variant || !names.has(s.family));
  }, [grouping, matching]);

  if (!matching.length) return <Nothing>No skills match.</Nothing>;

  const countVariants = (s: Skill) => (grouping && !s.variant ? Object.values(skills).filter(k => k.family === s.name && k.variant).length : 0);
  const byCategory = new Map<string, Skill[]>();
  for (const s of shown) byCategory.set(s.category, [...(byCategory.get(s.category) ?? []), s]);

  return (
    <div className="space-y-9">
      {[...byCategory].map(([cat, list]) => (
        <section key={cat}>
          <SectionTitle title={cat} count={list.length} />
          <div className={cn('grid gap-x-3 gap-y-4', GRID[size])}>
            {list.map(s => (
              <SkillCard key={s.name} skill={s} size={size} stacked={countVariants(s)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/** One row per base skill: the base, then each variant with where it came from, then the projects it was used in. */
export function FamiliesView() {
  const matching = useMatchingSkills();
  const library = useSkillLibraryStore(s => s.library);
  const select = useSkillLibraryStore(s => s.select);
  const families = useMemo(() => filterFamilies(library, matching), [library, matching]);
  const withVariants = families.filter(f => f.variants.length);
  const solo = families.filter(f => !f.variants.length);

  if (!families.length) return <Nothing>No skills match.</Nothing>;

  return (
    <div className="space-y-10">
      {withVariants.length === 0 && (
        <p className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
          No variants yet. A variant is a copy of a skill steered toward one project or style (<code className="font-mono text-xs">&lt;skill&gt;-like-&lt;project&gt;</code>) or an older version kept as it was (
          <code className="font-mono text-xs">&lt;skill&gt;-v2</code>). Make one with <code className="font-mono text-xs">/fork-skill</code>, or open a skill and press <b>Make a variant</b>.
        </p>
      )}
      {withVariants.map(f => {
        const base = library.skills[f.base];
        return (
          <section key={f.base} className="rounded-3xl border bg-card p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="mb-3 flex items-baseline gap-2 px-1.5">
              <h2 className="text-[15px] font-semibold tracking-tight">{base?.title ?? humanize(f.base)}</h2>
              <span className="font-mono text-[11px] text-muted-foreground">{f.base}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {f.variants.length} variant{f.variants.length === 1 ? '' : 's'} · {f.projects.length} project{f.projects.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="flex items-stretch gap-3 overflow-x-auto pb-1">
              <div className="w-64 shrink-0">
                {base ? (
                  <SkillCard skill={base} dim={!f.members.has(base.name)} />
                ) : (
                  <div className="flex h-full flex-col justify-center rounded-2xl border border-dashed p-4 text-xs text-muted-foreground">
                    <span className="font-mono text-foreground">{f.base}</span>
                    The base skill isn&apos;t in these folders.
                  </div>
                )}
              </div>
              <div className="grid w-6 shrink-0 place-items-center text-muted-foreground/60">
                <ArrowRightIcon className="size-4" />
              </div>
              {f.variants.map(v => {
                const s = library.skills[v];
                const parent = s.variant!.of !== f.base ? library.skills[s.variant!.of] : null;
                return (
                  <div key={v} className="w-56 shrink-0">
                    <SkillCard skill={s} size="sm" dim={!f.members.has(v)} />
                    <div className="flex flex-wrap gap-1 px-2.5">
                      <Chip tone="outline">{KIND_LABEL[s.variant!.kind]}</Chip>
                      {parent && (
                        <Chip tone="outline">
                          <GitForkIcon /> of {parent.variant?.label ?? parent.title}
                        </Chip>
                      )}
                      {s.forked && <Chip tone="outline">{s.forked}</Chip>}
                    </div>
                  </div>
                );
              })}
            </div>
            {f.projects.length > 0 && (
              <div className="mt-4 flex items-center gap-2 overflow-x-auto border-t pt-3">
                <span className="flex shrink-0 items-center gap-1.5 px-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  <FolderKanbanIcon className="size-3.5" /> Projects
                </span>
                {f.projects.map(slug => {
                  const p = library.projects[slug];
                  return (
                    <button key={slug} type="button" onClick={() => select({ kind: 'project', id: slug })} className="flex shrink-0 items-center gap-2 rounded-full border bg-background py-0.5 pl-0.5 pr-3 text-xs transition hover:bg-muted">
                      <Thumb image={p.thumbnail} seed={slug} title={p.title} compact className="size-6 rounded-full" />
                      {p.title}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
      {solo.length > 0 && (
        <section>
          <SectionTitle title="No variants yet" count={solo.length} />
          <div className={cn('grid gap-x-3 gap-y-4', GRID.sm)}>
            {solo.map(f => library.skills[f.base] && <SkillCard key={f.base} skill={library.skills[f.base]} size="sm" />)}
          </div>
        </section>
      )}
    </div>
  );
}

export function ProjectsGrid() {
  const projects = useMatchingProjects();
  const size = useSkillLibraryStore(s => s.cardSize);
  const total = useSkillLibraryStore(s => Object.keys(s.library.projects).length);
  if (!total)
    return (
      <Nothing>
        <span className="max-w-md text-center">
          No projects found. A project is a folder with a <code className="font-mono text-xs">mediamake.json</code> (or an <code className="font-mono text-xs">input/project.json</code>, like lyrics_videos projects). Add the folder that holds them.
        </span>
      </Nothing>
    );
  if (!projects.length) return <Nothing>No projects match.</Nothing>;
  return (
    <div className={cn('grid gap-x-3 gap-y-4', GRID[size])}>
      {projects.map(p => (
        <ProjectCard key={p.slug} project={p} size={size} />
      ))}
    </div>
  );
}
