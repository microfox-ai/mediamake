'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLinkIcon, GitForkIcon, LibraryIcon, SearchIcon, SparklesIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { RegistrySkill, SkillsRegistry } from '@/lib/library/types';

const REPO = 'https://github.com/microfox-ai/mediamake/blob/main';

function SkillCard({ skill }: { skill: RegistrySkill }) {
  return (
    // the catalog's skill cards link to /skills#<name>
    <div id={skill.name} className="flex scroll-mt-6 flex-col gap-2 rounded-lg border bg-card p-4 text-card-foreground target:ring-2 target:ring-primary">
      <div className="flex flex-wrap items-center gap-2">
        <code className="font-mono text-sm font-semibold">{skill.name}</code>
        {skill.variantOf && (
          <Badge variant="outline" className="text-muted-foreground">
            <GitForkIcon /> variant of {skill.variantOf}
          </Badge>
        )}
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{skill.summary}</p>
      <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1">
        <a href={`${REPO}/${skill.path}/SKILL.md`} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-1 text-xs font-medium text-primary hover:underline">
          SKILL.md on GitHub <ExternalLinkIcon className="size-3" />
        </a>
        <Link href={`/library?view=skills&skill=${encodeURIComponent(skill.name)}`} className="inline-flex w-fit items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:underline">
          Runs and outputs <LibraryIcon className="size-3" />
        </Link>
      </div>
    </div>
  );
}

export function SkillsBrowser({ registry, naming }: { registry: SkillsRegistry | null; naming: { pattern: string; about: string }[] }) {
  const [query, setQuery] = useState('');

  const all = registry?.skills ?? [];
  const categories = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (registry?.categories ?? [])
      .map(c => ({
        ...c,
        skills: (registry?.skills ?? []).filter(s => s.category === c.id && (!q || `${s.name} ${s.summary} ${s.variantOf ?? ''}`.toLowerCase().includes(q))),
      }))
      .filter(c => c.skills.length);
  }, [registry, query]);

  if (!registry)
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-sm text-muted-foreground">
        No skills.json found. Run <code className="font-mono">node tools/skills.mjs index</code> at the repo root.
      </main>
    );

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10">
        <header className="flex flex-col gap-3">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <SparklesIcon className="size-6 text-primary" /> Skills
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            The Claude Code skills in this repo, all {all.length} of them <strong className="text-foreground">public</strong>: their files are
            committed in <code className="mx-1 font-mono text-xs">.agents/skills/</code> and load for anyone who opens the repo.
            The <code className="font-mono text-xs">publish-skill</code> skill adds a new one, <code className="font-mono text-xs">fork-skill</code> makes a variant.
            The <Link href="/library?view=skills" className="font-medium text-foreground hover:underline">Library</Link> shows what each one made.
          </p>
          {naming.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {naming.map(n => (
                <span key={n.pattern} title={n.about} className="rounded-md border px-2 py-1 text-xs text-muted-foreground">
                  <code className="font-mono text-foreground">{n.pattern}</code> {n.about.split(':')[0]}
                </span>
              ))}
            </div>
          )}
        </header>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search skills" className="pl-8" aria-label="Search skills" />
          </div>
        </div>

        {categories.length === 0 && <p className="text-sm text-muted-foreground">No skill matches.</p>}

        {categories.map(c => (
          <section key={c.id} className="flex flex-col gap-3">
            <div className="flex items-baseline gap-3 border-b pb-2">
              <h2 className="font-mono text-base font-semibold">{c.id}</h2>
              <span className="text-sm text-muted-foreground">{c.about}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {c.skills.map(s => (
                <SkillCard key={s.name} skill={s} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
