'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { CopyIcon, FolderKanbanIcon, GitForkIcon, ImagePlusIcon, PencilIcon, SparklesIcon, StarIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Hint } from '@/components/revisions/keyboard';
import { categoryAbout } from '@/lib/skill-library/model';
import type { FileRef, Project, Skill } from '@/lib/skill-library/types';
import { Chip, KIND_LABEL, MiniRow } from './Cards';
import { Thumb } from './Thumb';
import { pinKey, useSkillLibraryStore, type Selection } from './store';

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied`, { description: text });
  } catch {
    toast.message(text, { description: 'Could not reach the clipboard: copy it from here' });
  }
}

function Label({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{children}</h3>;
}

function Gallery({ images, onUse, seed }: { images: FileRef[]; onUse: (ref: FileRef) => void; seed: string }) {
  if (!images.length) return null;
  return (
    <section>
      <Label>Made with it</Label>
      <div className="grid grid-cols-3 gap-1.5">
        {images.map(ref => (
          <div key={ref.key} className="group relative">
            <Thumb image={ref} seed={seed} compact className="aspect-video rounded-lg border border-black/5" />
            <Hint label="Use as the thumbnail">
              <button type="button" onClick={() => onUse(ref)} className="absolute inset-0 grid place-items-center rounded-lg bg-black/45 text-white opacity-0 transition group-hover:opacity-100">
                <ImagePlusIcon className="size-4" />
              </button>
            </Hint>
          </div>
        ))}
      </div>
    </section>
  );
}

function Hero({ sel, image, preview, seed, title, label }: { sel: NonNullable<Selection>; image: FileRef | null; preview?: FileRef | null; seed: string; title: string; label: string }) {
  const pickThumbnail = useSkillLibraryStore(s => s.pickThumbnail);
  const [hover, setHover] = useState(false);
  return (
    <div className="group relative" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <Thumb image={image} preview={preview} playing={hover} seed={seed} title={title} label={label} className="aspect-video rounded-2xl border border-black/5" />
      <Button size="sm" variant="secondary" className="absolute bottom-2 right-2 h-7 gap-1.5 rounded-full bg-white/90 px-3 text-xs text-neutral-900 opacity-0 shadow-sm backdrop-blur transition hover:bg-white group-hover:opacity-100" onClick={() => void pickThumbnail(sel)}>
        <ImagePlusIcon className="size-3.5" /> {image ? 'Change' : 'Set'} thumbnail
      </Button>
    </div>
  );
}

function ForkButton({ skill }: { skill: Skill }) {
  const projects = useSkillLibraryStore(s => s.library.projects);
  const [style, setStyle] = useState('');
  const linked = skill.projects.map(p => projects[p]).filter(Boolean);
  const others = Object.values(projects).filter(p => !skill.projects.includes(p.slug));
  const prompt = (ref: string) => `/fork-skill ${skill.name} ${ref}`;
  const row = (p: Project) => (
    <MiniRow key={p.slug} image={p.thumbnail} seed={p.slug} title={p.title} subtitle={p.slug} onClick={() => void copy(prompt(p.slug), 'Prompt')} />
  );
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full">
          <GitForkIcon className="size-3.5" /> Make a variant
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-2">
        <p className="px-1.5 pb-2 text-xs text-muted-foreground">
          A variant is your own copy, steered toward a project or a style. Pick what it&apos;s modelled on; the prompt for Claude is copied.
        </p>
        <form
          className="flex gap-1.5 px-1.5 pb-2"
          onSubmit={e => {
            e.preventDefault();
            const ref = style.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            if (ref) void copy(prompt(ref), 'Prompt');
          }}
        >
          <Input value={style} onChange={e => setStyle(e.target.value)} placeholder="A style name, e.g. neon-noir" className="h-8 text-xs" />
          <Button type="submit" size="sm" className="h-8">
            Copy
          </Button>
        </form>
        <div className="max-h-72 overflow-y-auto">
          {linked.length > 0 && <div className="px-1.5 pb-1 pt-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Its projects</div>}
          {linked.map(row)}
          {others.length > 0 && <div className="px-1.5 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Other projects</div>}
          {others.map(row)}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SkillDetail({ skill }: { skill: Skill }) {
  const library = useSkillLibraryStore(s => s.library);
  const sources = useSkillLibraryStore(s => s.sources);
  const select = useSkillLibraryStore(s => s.select);
  const setEditing = useSkillLibraryStore(s => s.setEditing);
  const thumbnailFromImage = useSkillLibraryStore(s => s.thumbnailFromImage);
  const sel = { kind: 'skill', id: skill.name } as const;
  const base = skill.variant ? library.skills[skill.variant.of] : null;
  const origin = skill.variant?.project ? library.projects[skill.variant.project] : null;
  const sourceName = (id: string) => sources.find(s => s.id === id)?.name ?? '';
  const [more, setMore] = useState(false);

  return (
    <div className="space-y-6">
      <Hero sel={sel} image={skill.thumbnail} preview={skill.preview} seed={skill.family} title={skill.title} label={skill.category} />
      <div>
        <h2 className="text-xl font-semibold leading-tight tracking-tight">{skill.variant ? skill.variant.label : skill.title}</h2>
        <div className="mt-1 font-mono text-xs text-muted-foreground">{skill.name}</div>
        <div className="mt-3 flex flex-wrap gap-1">
          <Chip>
            <span className="capitalize">{skill.category}</span>
            {categoryAbout(skill.category) && <span className="opacity-70">· {categoryAbout(skill.category)}</span>}
          </Chip>
          {skill.variant && (
            <Chip tone="accent">
              <GitForkIcon /> {KIND_LABEL[skill.variant.kind]}
            </Chip>
          )}
          <Chip tone="outline">{skill.location === 'committed' ? 'in the repo' : skill.location === 'local' ? 'local only' : 'folder'}</Chip>
          {skill.version && <Chip tone="outline">v{skill.version}</Chip>}
          {skill.owner && <Chip tone="outline">{skill.owner}</Chip>}
          {skill.tags.map(t => (
            <Chip key={t} tone="outline">
              #{t}
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" className="h-8 gap-1.5 rounded-full" onClick={() => void copy(`Use the ${skill.name} skill`, 'Prompt')}>
          <SparklesIcon className="size-3.5" /> Use it
        </Button>
        <ForkButton skill={skill} />
        <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full" onClick={() => setEditing(sel)}>
          <PencilIcon className="size-3.5" /> Edit
        </Button>
      </div>

      <section>
        <Label>What it does</Label>
        <p className={cn('whitespace-pre-line text-[13px] leading-relaxed text-foreground/85', !more && 'line-clamp-6')}>{skill.description || 'No description in SKILL.md.'}</p>
        {skill.description.length > 420 && (
          <button type="button" className="mt-1 text-xs font-medium text-muted-foreground hover:text-foreground" onClick={() => setMore(!more)}>
            {more ? 'Less' : 'More'}
          </button>
        )}
      </section>

      {(base || skill.variant) && (
        <section>
          <Label>Variant of</Label>
          {base ? (
            <MiniRow image={base.thumbnail} seed={base.family} title={base.variant ? base.variant.label : base.title} subtitle={base.name} onClick={() => select({ kind: 'skill', id: base.name })} />
          ) : (
            <p className="text-xs text-muted-foreground">
              <span className="font-mono">{skill.variant!.of}</span>, which isn&apos;t in these folders.
            </p>
          )}
          {origin && (
            <div className="mt-1">
              <MiniRow image={origin.thumbnail} seed={origin.slug} title={`Modelled on ${origin.title}`} subtitle={origin.slug} badge={<FolderKanbanIcon className="mr-1 size-3.5 text-muted-foreground" />} onClick={() => select({ kind: 'project', id: origin.slug })} />
            </div>
          )}
          {skill.variant && !origin && (
            <p className="mt-1 px-1.5 text-xs text-muted-foreground">
              {KIND_LABEL[skill.variant.kind]}: <b className="font-medium text-foreground">{skill.variant.ref}</b>
              {skill.forked && ` · forked ${skill.forked}`}
            </p>
          )}
        </section>
      )}

      {skill.variants.length > 0 && (
        <section>
          <Label>Variants · {skill.variants.length}</Label>
          {skill.variants.map(v => {
            const s = library.skills[v];
            return <MiniRow key={v} image={s.thumbnail} seed={s.family} title={s.variant!.label} subtitle={s.name} badge={<Chip tone="outline">{KIND_LABEL[s.variant!.kind]}</Chip>} onClick={() => select({ kind: 'skill', id: v })} />;
          })}
        </section>
      )}

      {skill.projects.length > 0 && (
        <section>
          <Label>Used in · {skill.projects.length}</Label>
          {skill.projects.map(slug => {
            const p = library.projects[slug];
            return <MiniRow key={slug} image={p.thumbnail} seed={slug} title={p.title} subtitle={p.artist ?? slug} onClick={() => select({ kind: 'project', id: slug })} />;
          })}
        </section>
      )}

      <Gallery images={skill.gallery} seed={skill.family} onUse={ref => void thumbnailFromImage(sel, ref)} />

      <section>
        <Label>Files</Label>
        {skill.copies.map(c => (
          <button key={`${c.sourceId}:${c.path}`} type="button" onClick={() => void copy(`${sourceName(c.sourceId)}/${c.path}`, 'Path')} className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left font-mono text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground">
            <CopyIcon className="size-3 shrink-0" />
            <span className="truncate">
              {sourceName(c.sourceId)}/{c.path}
            </span>
          </button>
        ))}
      </section>
    </div>
  );
}

function ProjectDetail({ project }: { project: Project }) {
  const library = useSkillLibraryStore(s => s.library);
  const sources = useSkillLibraryStore(s => s.sources);
  const select = useSkillLibraryStore(s => s.select);
  const setEditing = useSkillLibraryStore(s => s.setEditing);
  const thumbnailFromImage = useSkillLibraryStore(s => s.thumbnailFromImage);
  const sel = { kind: 'project', id: project.slug } as const;
  const path = `${sources.find(s => s.id === project.sourceId)?.name ?? ''}/${project.path}`;
  const skills = project.skills.map(n => library.skills[n]).filter(Boolean);

  return (
    <div className="space-y-6">
      <Hero sel={sel} image={project.thumbnail} seed={project.slug} title={project.title} label="project" />
      <div>
        <h2 className="text-xl font-semibold leading-tight tracking-tight">{project.title}</h2>
        <div className="mt-1 text-xs text-muted-foreground">
          {project.artist && <span>{project.artist} · </span>}
          <span className="font-mono">{project.slug}</span>
        </div>
        {(project.owner || project.tags.length > 0) && (
          <div className="mt-3 flex flex-wrap gap-1">
            {project.owner && <Chip tone="outline">{project.owner}</Chip>}
            {project.tags.map(t => (
              <Chip key={t} tone="outline">
                #{t}
              </Chip>
            ))}
          </div>
        )}
        {project.summary && <p className="mt-3 text-[13px] leading-relaxed text-foreground/85">{project.summary}</p>}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full" onClick={() => setEditing(sel)}>
          <PencilIcon className="size-3.5" /> Link skills
        </Button>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full" onClick={() => void copy(path, 'Path')}>
          <CopyIcon className="size-3.5" /> Copy path
        </Button>
      </div>

      <section>
        <Label>Skills used · {skills.length}</Label>
        {!skills.length && <p className="text-xs text-muted-foreground">None linked yet. Press Link skills, or list them under &quot;skills&quot; in the project&apos;s mediamake.json.</p>}
        {skills.map(s => (
          <MiniRow
            key={s.name}
            image={s.thumbnail}
            seed={s.family}
            title={s.variant ? s.variant.label : s.title}
            subtitle={s.name}
            onClick={() => select({ kind: 'skill', id: s.name })}
            badge={
              <Hint label={`Copy a prompt to make a variant of ${s.name} from this project`}>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={e => {
                    e.stopPropagation();
                    void copy(`/fork-skill ${s.name} ${project.slug}`, 'Prompt');
                  }}
                  className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
                >
                  <GitForkIcon className="size-3.5" />
                </span>
              </Hint>
            }
          />
        ))}
      </section>

      {project.bornVariants.length > 0 && (
        <section>
          <Label>Variants made from it · {project.bornVariants.length}</Label>
          {project.bornVariants.map(v => {
            const s = library.skills[v];
            return <MiniRow key={v} image={s.thumbnail} seed={s.family} title={s.variant!.label} subtitle={s.name} onClick={() => select({ kind: 'skill', id: v })} />;
          })}
        </section>
      )}

      <Gallery images={project.gallery} seed={project.slug} onUse={ref => void thumbnailFromImage(sel, ref)} />
    </div>
  );
}

export function DetailPanel() {
  const selected = useSkillLibraryStore(s => s.selected);
  const library = useSkillLibraryStore(s => s.library);
  const select = useSkillLibraryStore(s => s.select);
  const pins = useSkillLibraryStore(s => s.pins);
  const togglePin = useSkillLibraryStore(s => s.togglePin);
  const ready = useSkillLibraryStore(s => s.sources.every(src => src.status !== 'scanning'));
  if (!selected) return null;
  const skill = selected.kind === 'skill' ? library.skills[selected.id] : null;
  const project = selected.kind === 'project' ? library.projects[selected.id] : null;
  if (!skill && !project && !ready) return null; // a deep link waits for the scan
  const key = pinKey(selected);
  const pinned = pins.includes(key);

  return (
    <aside className="flex h-full w-[420px] shrink-0 flex-col border-l bg-background">
      <div className="flex h-12 shrink-0 items-center gap-1 px-3">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{selected.kind}</span>
        <span className="ml-auto" />
        <Hint label={pinned ? 'Unpin' : 'Pin'} keys="P">
          <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0" onClick={() => togglePin(key)}>
            <StarIcon className={cn('size-4', pinned && 'fill-amber-400 text-amber-500')} />
          </Button>
        </Hint>
        <Hint label="Close" keys="Esc">
          <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0" onClick={() => select(null)}>
            <XIcon className="size-4" />
          </Button>
        </Hint>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-5 pb-8">
          {skill && <SkillDetail skill={skill} />}
          {project && <ProjectDetail project={project} />}
          {!skill && !project && <p className="py-10 text-center text-sm text-muted-foreground">&quot;{selected.id}&quot; isn&apos;t in these folders.</p>}
        </div>
      </div>
    </aside>
  );
}
