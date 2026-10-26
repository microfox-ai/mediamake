'use client';

import { useMemo, useState } from 'react';
import { ExternalLinkIcon, GitForkIcon, SearchIcon, SparklesIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { SkillRow, SkillsIndex } from '@/lib/skills/skills-md';

const REPO = 'https://github.com/microfox-ai/mediamake/blob/main';

function SkillCard({ skill }: { skill: SkillRow }) {
  const href = skill.file ? `${REPO}/${skill.file}` : undefined;
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-4 text-card-foreground">
      <div className="flex flex-wrap items-center gap-2">
        <code className="font-mono text-sm font-semibold">{skill.name}</code>
        {skill.variantOf && (
          <Badge variant="outline" className="text-muted-foreground">
            <GitForkIcon /> variant of {skill.variantOf}
          </Badge>
        )}
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{skill.summary}</p>
      {href && (
        <a href={href} target="_blank" rel="noreferrer" className="mt-auto inline-flex w-fit items-center gap-1 text-xs font-medium text-primary hover:underline">
          SKILL.md on GitHub <ExternalLinkIcon className="size-3" />
        </a>
      )}
    </div>
  );
}

export function SkillsBrowser({ index }: { index: SkillsIndex | null }) {
  const [query, setQuery] = useState('');

  const all = useMemo(() => index?.categories.flatMap(c => c.skills) ?? [], [index]);
  const categories = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (index?.categories ?? [])
      .map(c => ({
        ...c,
        skills: c.skills.filter(s => !q || `${s.name} ${s.summary} ${s.variantOf ?? ''}`.toLowerCase().includes(q)),
      }))
      .filter(c => c.skills.length);
  }, [index, query]);

  if (!index)
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-sm text-muted-foreground">
        No SKILLS.md found. Run <code className="font-mono">node tools/skills.mjs index</code> at the repo root.
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
          </p>
          {index.naming.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {index.naming.map(n => (
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
