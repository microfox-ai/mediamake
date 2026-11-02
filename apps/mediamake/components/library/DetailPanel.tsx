'use client';

import { useState } from 'react';
import { CopyIcon, ExternalLinkIcon, FolderOpenIcon, GitForkIcon, ImagePlusIcon, PlusIcon, SparklesIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Hint } from '@/components/revisions/keyboard';
import { revealOrCopy } from '@/lib/image-revisions/reveal';
import { drifted, qualityOf } from '@/lib/library/filter';
import { productionThumb, ratingOf, skillThumb } from '@/lib/library/model';
import type { MediaItem, Production, Skill } from '@/lib/library/types';
import { Chip, MiniRow, Stars } from './Cards';
import { ago, bytes, copy, duration, itemPath, plural, tilde } from './format';
import { Thumb, useCatalogUrl } from './Thumb';
import { pendingChannel, pendingRating, pendingSort, pendingTags, pendingThumbnail, useLibraryStore } from './store';

const REPO = 'https://github.com/microfox-ai/mediamake/blob/main';

function Label({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <h3 className="mb-2 flex items-center justify-between text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      {children}
      {action}
    </h3>
  );
}

const VERDICT_TONE: Record<string, 'good' | 'warn' | 'outline'> = { approved: 'good', rejected: 'warn' };

/** A path to copy, or (dev server) show in Finder. */
function PathRow({ path, label }: { path: string; label?: string }) {
  const abs = path.startsWith('/') ? path : null;
  return (
    <div className="group flex min-w-0 items-center gap-1 rounded-lg px-1.5 py-1 hover:bg-muted">
      <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground" title={path}>
        {label && <span className="mr-1.5 font-sans font-medium text-foreground">{label}</span>}
        {tilde(path)}
      </span>
      <Hint label="Copy the path">
        <button type="button" className="rounded p-1 text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100" onClick={() => void copy(path, 'Path copied')}>
          <CopyIcon className="size-3" />
        </button>
      </Hint>
      {abs && (
        <Hint label="Show in Finder (local dev server), or copy">
          <button type="button" className="rounded p-1 text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100" onClick={() => void revealOrCopy(abs, abs)}>
            <FolderOpenIcon className="size-3" />
          </button>
        </Hint>
      )}
    </div>
  );
}

/* ---------- production ---------- */

function ProductionDetail({ production }: { production: Production }) {
  const library = useLibraryStore(s => s.library);
  const pending = useLibraryStore(s => s.pending);
  const select = useLibraryStore(s => s.select);
  const send = useLibraryStore(s => s.send);
  const used = library.usedIn[production.slug] ?? [];
  const runs = library.runsOfProduction[production.slug] ?? [];
  const moved = pendingChannel(pending, production.slug);
  const channelId = moved !== undefined ? moved : production.channel;
  const newThumb = pendingThumbnail(pending, production.slug);
  const hero = newThumb ? library.item[newThumb]?.thumb : productionThumb(library, production);

  const bySkill = new Map<string, typeof runs>();
  for (const r of runs) bySkill.set(r.skill, [...(bySkill.get(r.skill) ?? []), r]);
  const listed = production.skills.filter(s => !bySkill.has(s));

  return (
    <div className="space-y-6">
      <div className={cn('rounded-2xl', newThumb && 'outline-dashed outline-2 outline-offset-2 outline-sky-400')}>
        <Thumb image={hero} seed={production.slug} title={production.title} label="production" className="aspect-video rounded-2xl border border-black/5" />
      </div>
      <div>
        <h2 className="text-xl font-semibold leading-tight tracking-tight">{production.title}</h2>
        <div className="mt-1 text-xs text-muted-foreground">
          {[production.artist, production.song && production.song !== production.title ? `“${production.song}”` : null].filter(Boolean).join(' · ')}
          {(production.artist || production.song) && ' · '}
          <span className="font-mono">{production.slug}</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Chip tone={production.status === 'uploaded' ? 'good' : production.status === 'delivered' ? 'accent' : 'muted'}>{production.status}</Chip>
          {production.updatedAt && <span className="text-[11px] text-muted-foreground">updated {ago(production.updatedAt)}</span>}
        </div>
      </div>

      <section>
        <Label>Channel</Label>
        <select
          value={channelId ?? ''}
          onChange={e => void send({ op: 'set-channel', target: production.slug, channel: e.target.value || null })}
          className={cn('h-9 w-full rounded-lg border bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring', moved !== undefined && 'border-dashed border-sky-400')}
        >
          <option value="">No channel</option>
          {library.channels.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {moved !== undefined && <p className="mt-1 text-[11px] text-sky-700 dark:text-sky-300">Waiting for the media CLI to move it.</p>}
      </section>

      <section>
        <Label>Media used · {used.length}</Label>
        {!used.length && <p className="text-xs text-muted-foreground">No library items recorded for it yet.</p>}
        <div className="grid grid-cols-3 gap-1.5">
          {used.map(m => (
            <div key={m.id} className="group relative">
              <button type="button" className="block w-full" onClick={() => select({ kind: 'item', id: m.id })} title={m.title}>
                <Thumb image={m.thumb} seed={m.subject ?? m.kind} title={m.title} compact className={cn('aspect-video rounded-lg border border-black/5', newThumb === m.id && 'ring-2 ring-sky-400')} />
              </button>
              {m.thumb && (
                <Hint label="Use as the production's picture">
                  <button type="button" className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100" onClick={() => void send({ op: 'set-thumbnail', target: production.slug, item: m.id })}>
                    <ImagePlusIcon className="size-3.5" />
                  </button>
                </Hint>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <Label>Skills run · {bySkill.size}</Label>
        {!bySkill.size && !listed.length && <p className="text-xs text-muted-foreground">No skill runs recorded for it.</p>}
        {[...bySkill].map(([name, rs]) => {
          const s = library.skill[name];
          const verdicts = new Map<string, number>();
          for (const r of rs) if (r.verdict) verdicts.set(r.verdict, (verdicts.get(r.verdict) ?? 0) + 1);
          return (
            <MiniRow
              key={name}
              image={s ? skillThumb(library, s) : undefined}
              seed={s?.family ?? name}
              title={name}
              subtitle={`${plural(rs.length, 'run')} · last ${ago(rs[0].at)}`}
              onClick={() => s && select({ kind: 'skill', id: name })}
              badge={
                <span className="flex gap-1">
                  {[...verdicts].map(([v, n]) => (
                    <Chip key={v} tone={VERDICT_TONE[v] ?? 'outline'}>
                      {n > 1 ? `${n} ` : ''}
                      {v}
                    </Chip>
                  ))}
                </span>
              }
            />
          );
        })}
        {listed.map(name => (
          <MiniRow key={name} image={library.skill[name] ? skillThumb(library, library.skill[name]) : undefined} seed={name} title={name} subtitle="listed, no runs recorded" onClick={() => library.skill[name] && select({ kind: 'skill', id: name })} />
        ))}
      </section>

      <section>
        <Label>Deliveries · {production.deliveries.length}</Label>
        {production.deliverFolder && <PathRow path={production.deliverFolder} label="Folder" />}
        {!production.deliveries.length && <p className="text-xs text-muted-foreground">Nothing delivered yet.</p>}
        {production.deliveries.map(d => (
          <div key={`${d.what}:${d.path}`} className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <PathRow path={d.path} label={d.what} />
            </div>
            <span className="shrink-0 text-[11px] text-muted-foreground">{ago(d.at)}</span>
            {d.status && <Chip tone={d.status === 'uploaded' ? 'good' : 'outline'}>{d.status}</Chip>}
          </div>
        ))}
      </section>
    </div>
  );
}

/* ---------- skill ---------- */

function ForkButton({ skill }: { skill: Skill }) {
  const library = useLibraryStore(s => s.library);
  const [style, setStyle] = useState('');
  const prompt = (ref: string) => `/fork-skill ${skill.name} ${ref}`;
  const productions = [...skill.productions.map(p => library.production[p]).filter(Boolean), ...library.productions.filter(p => !skill.productions.includes(p.slug))];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-full">
          <GitForkIcon className="size-3.5" /> Make a variant
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-2">
        <p className="px-1.5 pb-2 text-xs text-muted-foreground">A copy of the skill steered toward one production or a style. Pick what it&apos;s modelled on; the prompt for Claude is copied.</p>
        <form
          className="flex gap-1.5 px-1.5 pb-2"
          onSubmit={e => {
            e.preventDefault();
            const ref = style.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            if (ref) void copy(prompt(ref), 'Prompt copied');
          }}
        >
          <Input value={style} onChange={e => setStyle(e.target.value)} placeholder="A style name, e.g. neon-noir" className="h-8 text-xs" />
          <Button type="submit" size="sm" className="h-8">
            Copy
          </Button>
        </form>
        <div className="max-h-72 overflow-y-auto">
          {productions.map(p => (
            <MiniRow key={p.slug} image={productionThumb(library, p)} seed={p.slug} title={p.title} subtitle={skill.productions.includes(p.slug) ? 'made with it' : p.slug} onClick={() => void copy(prompt(p.slug), 'Prompt copied')} />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DriftBox({ skill }: { skill: Skill }) {
  const d = skill.drift;
  const cmd = `node tools/skills.mjs diff ${skill.name}`;
  return (
    <div className={cn('mt-2 space-y-1.5 rounded-xl border p-3 text-xs', d && drifted(skill) && 'border-amber-300 bg-amber-50/60 dark:border-amber-500/40 dark:bg-amber-500/10')}>
      {d ? (
        <>
          <div>
            Forked at <span className="font-mono">{d.from}</span>
            {d.guessed && <span className="text-muted-foreground"> (guessed from the commit that added it)</span>}
          </div>
          <div className="text-muted-foreground">
            Its own changes: {d.own.files ? `${plural(d.own.files, 'file')}, +${d.own.added} −${d.own.removed}` : 'none'}
          </div>
          <div className={cn(drifted(skill) ? 'font-medium text-amber-900 dark:text-amber-200' : 'text-muted-foreground')}>
            {skill.variantOf} since: {d.upstream.files ? `${plural(d.upstream.commits, 'commit')}, ${plural(d.upstream.files, 'file')}, +${d.upstream.added} −${d.upstream.removed}` : 'no changes'}
          </div>
        </>
      ) : (
        <div className="text-muted-foreground">No drift numbers in the export.</div>
      )}
      <button type="button" onClick={() => void copy(cmd, 'Command copied')} className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground hover:text-foreground">
        <CopyIcon className="size-3" /> {cmd}
      </button>
    </div>
  );
}

function SkillDetail({ skill }: { skill: Skill }) {
  const library = useLibraryStore(s => s.library);
  const select = useLibraryStore(s => s.select);
  const [more, setMore] = useState(false);
  const [allRuns, setAllRuns] = useState(false);
  const base = skill.variantOf ? library.skill[skill.variantOf] : null;
  const runs = library.runsOfSkill[skill.name] ?? [];
  const best = skill.best;
  const origin = skill.variantRef ? library.production[skill.variantRef] : null;

  return (
    <div className="space-y-6">
      <div>
        <Thumb image={skillThumb(library, skill)} seed={skill.family} title={skill.title} label={skill.category} className="aspect-video rounded-2xl border border-black/5" />
        {best && (
          <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">
            Best approved output{best.what ? ` (${best.what})` : ''}
            {best.production && `: ${library.production[best.production]?.title ?? best.production}`}
            {best.at && `, ${ago(best.at)}`}
          </p>
        )}
      </div>
      <div>
        <h2 className="break-all font-mono text-lg font-semibold leading-tight tracking-tight">{skill.name}</h2>
        <div className="mt-3 flex flex-wrap gap-1">
          <Chip>
            <span className="capitalize">{skill.category}</span>
          </Chip>
          {skill.variantOf && (
            <Chip tone="accent">
              <GitForkIcon /> variant
            </Chip>
          )}
          <Chip tone="outline">{skill.location === 'committed' ? 'in the repo' : 'local only'}</Chip>
          {skill.version && <Chip tone="outline">v{skill.version}</Chip>}
          {skill.runs > 0 ? <Chip>{plural(skill.runs, 'run')}</Chip> : <Chip tone="outline">never run</Chip>}
          {skill.lastRun && <Chip tone="outline">last {ago(skill.lastRun)}</Chip>}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" className="h-8 gap-1.5 rounded-full" onClick={() => void copy(`/${skill.name}`, 'Prompt copied')}>
          <SparklesIcon className="size-3.5" /> Use it
        </Button>
        <ForkButton skill={skill} />
      </div>

      <section>
        <Label>What it does</Label>
        <p className={cn('whitespace-pre-line text-[13px] leading-relaxed text-foreground/85', !more && 'line-clamp-6')}>{skill.description || skill.summary || 'No description.'}</p>
        {skill.description.length > 420 && (
          <button type="button" className="mt-1 text-xs font-medium text-muted-foreground hover:text-foreground" onClick={() => setMore(!more)}>
            {more ? 'Less' : 'More'}
          </button>
        )}
      </section>

      {skill.variantOf && (
        <section>
          <Label>Variant of</Label>
          {base ? <MiniRow image={skillThumb(library, base)} seed={base.family} title={base.name} subtitle={base.summary} onClick={() => select({ kind: 'skill', id: base.name })} /> : <p className="text-xs text-muted-foreground">{skill.variantOf}, which isn&apos;t in the registry.</p>}
          {origin && <MiniRow image={productionThumb(library, origin)} seed={origin.slug} title={`Modelled on ${origin.title}`} subtitle={origin.slug} onClick={() => select({ kind: 'production', id: origin.slug })} />}
          {!origin && skill.variantRef && <p className="px-1.5 pt-1 text-xs text-muted-foreground">Modelled on {skill.variantRef}</p>}
          <DriftBox skill={skill} />
        </section>
      )}

      {skill.variants.length > 0 && (
        <section>
          <Label>Variants · {skill.variants.length}</Label>
          {skill.variants.map(v => {
            const s = library.skill[v];
            return (
              <MiniRow
                key={v}
                image={skillThumb(library, s)}
                seed={s.family}
                title={v}
                subtitle={s.drift ? `${s.variantOf} since the fork: ${s.drift.upstream.files ? plural(s.drift.upstream.commits, 'commit') : 'no changes'}` : s.summary}
                badge={drifted(s) ? <Chip tone="warn">base moved on</Chip> : undefined}
                onClick={() => select({ kind: 'skill', id: v })}
              />
            );
          })}
        </section>
      )}

      <section>
        <Label
          action={
            runs.length > 8 && (
              <button type="button" className="normal-case tracking-normal hover:text-foreground" onClick={() => setAllRuns(!allRuns)}>
                {allRuns ? 'Fewer' : `All ${runs.length}`}
              </button>
            )
          }
        >
          Runs · {runs.length}
        </Label>
        {!runs.length && <p className="text-xs text-muted-foreground">No runs recorded. Runs are recorded by the Skill hook from now on.</p>}
        <div className="space-y-0.5">
          {(allRuns ? runs : runs.slice(0, 8)).map(r => (
            <div key={`${r.session}:${r.at}`} className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-xs hover:bg-muted">
              <span className="w-20 shrink-0 text-muted-foreground">{ago(r.at)}</span>
              {r.production ? (
                <button type="button" className="min-w-0 flex-1 truncate text-left hover:underline" onClick={() => select({ kind: 'production', id: r.production! })}>
                  {library.production[r.production]?.title ?? r.production}
                </button>
              ) : (
                <span className="min-w-0 flex-1 truncate text-muted-foreground">no production</span>
              )}
              {r.verdict && <Chip tone={VERDICT_TONE[r.verdict] ?? 'outline'}>{r.verdict}</Chip>}
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground" title={`session ${r.session}`}>
                {r.session.slice(0, 8)}
              </span>
            </div>
          ))}
        </div>
      </section>

      {skill.productions.length > 0 && (
        <section>
          <Label>Productions · {skill.productions.length}</Label>
          {skill.productions.map(slug => {
            const p = library.production[slug];
            return p ? <MiniRow key={slug} image={productionThumb(library, p)} seed={slug} title={p.title} subtitle={p.channel ? library.channel[p.channel]?.name : p.slug} onClick={() => select({ kind: 'production', id: slug })} /> : null;
          })}
        </section>
      )}

      {!!skill.dependsOn?.length && (
        <section>
          <Label>Needs</Label>
          <div className="flex flex-wrap gap-1">
            {skill.dependsOn.map(d => (
              <button key={d} type="button" onClick={() => library.skill[d] && select({ kind: 'skill', id: d })} className="rounded-full border px-2 py-0.5 font-mono text-[11px] hover:bg-muted">
                {d}
              </button>
            ))}
          </div>
        </section>
      )}

      {skill.path && (
        <section>
          <Label>Files</Label>
          <a href={`${REPO}/${skill.path}/SKILL.md`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 font-mono text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground">
            <ExternalLinkIcon className="size-3" /> {skill.path}/SKILL.md
          </a>
        </section>
      )}
    </div>
  );
}

/* ---------- media item ---------- */

function AudioPreview({ rel }: { rel: string }) {
  const url = useCatalogUrl(rel);
  return url ? <audio src={url} controls className="mt-2 w-full" /> : null;
}

function Tags({ item }: { item: MediaItem }) {
  const pending = useLibraryStore(s => s.pending);
  const send = useLibraryStore(s => s.send);
  const [text, setText] = useState('');
  const { tags, added, removed } = pendingTags(pending, item.id, item.tags);
  const add = () => {
    const fresh = text.split(',').map(t => t.trim().toLowerCase()).filter(t => t && !tags.includes(t));
    if (fresh.length) void send({ op: 'tag', target: item.id, add: fresh });
    setText('');
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {tags.map(t => (
          <Chip key={t} tone={added.has(t) ? 'pending' : 'outline'} className="pr-1">
            #{t}
            <button type="button" aria-label={`Remove ${t}`} className="rounded-full p-0.5 hover:bg-muted" onClick={() => void send({ op: 'tag', target: item.id, remove: [t] })}>
              <XIcon className="size-2.5" />
            </button>
          </Chip>
        ))}
        {[...removed].filter(t => item.tags.includes(t)).map(t => (
          <Chip key={t} tone="pending" className="line-through opacity-70">
            #{t}
          </Chip>
        ))}
        {!tags.length && !removed.size && <span className="text-xs text-muted-foreground">No tags</span>}
      </div>
      <form
        className="flex gap-1.5"
        onSubmit={e => {
          e.preventDefault();
          add();
        }}
      >
        <Input value={text} onChange={e => setText(e.target.value)} placeholder="Add tags, comma separated" className="h-8 text-xs" />
        <Button type="submit" size="sm" variant="outline" className="h-8 w-8 p-0" aria-label="Add tags" disabled={!text.trim()}>
          <PlusIcon className="size-3.5" />
        </Button>
      </form>
    </div>
  );
}

function ItemDetail({ item }: { item: MediaItem }) {
  const library = useLibraryStore(s => s.library);
  const pending = useLibraryStore(s => s.pending);
  const select = useLibraryStore(s => s.select);
  const send = useLibraryStore(s => s.send);
  const setView = useLibraryStore(s => s.setView);
  const setMediaMode = useLibraryStore(s => s.setMediaMode);
  const waiting = pendingRating(pending, item.id);
  const sorted = pendingSort(pending, item.id);
  const where = itemPath(library, item);
  const audio = item.preview && /\.(mp3|m4a|wav|ogg)$/i.test(item.preview);
  const facts: [string, React.ReactNode][] = [
    ['Kind', item.kind],
    ['Subject', item.subject ?? '—'],
    ['Size', [item.width && item.height ? `${item.width}×${item.height}` : null, qualityOf(item), bytes(item.bytes)].filter(Boolean).join(' · ')],
    ...(item.duration ? ([['Length', [duration(item.duration), item.fps ? `${Math.round(item.fps)} fps` : null, item.hasAudio === false ? 'no audio' : item.hasAudio ? 'with audio' : null].filter(Boolean).join(' · ')]] as [string, string][]) : []),
    ['Where', item.status === 'online' ? 'On this Mac' : item.status === 'cold' ? 'On an unplugged disk' : 'Missing from where the catalog has it'],
  ];

  return (
    <div className="space-y-6">
      <div>
        <Thumb image={item.thumb} preview={item.preview} playing seed={item.subject ?? item.kind} title={item.title} label={item.kind} fit="contain" className="aspect-video rounded-2xl border bg-neutral-950" />
        {audio && <AudioPreview rel={item.preview!} />}
      </div>
      <div>
        <h2 className="text-lg font-semibold leading-tight tracking-tight">{item.title}</h2>
        <div className="mt-2">
          <PathRow path={where.abs ?? where.shown} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Stars size="md" value={waiting !== undefined ? waiting : ratingOf(item)} pending={waiting !== undefined} onRate={r => void send({ op: 'rate', target: item.id, rating: r })} />
        {item.rating !== undefined && ratingOf(item) === null && <Chip tone="outline">rated {String(item.rating)}</Chip>}
        {item.kind === 'unsorted' && !sorted && (
          <Button
            size="sm"
            variant="outline"
            className="ml-auto h-7 rounded-full text-xs"
            onClick={() => {
              setView('media');
              setMediaMode('inbox');
            }}
          >
            Sort it
          </Button>
        )}
        {sorted && <Chip tone="pending">sorted as {sorted.kind}</Chip>}
      </div>

      <section>
        <dl className="grid grid-cols-[72px_1fr] gap-x-3 gap-y-1.5 text-xs">
          {facts.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="min-w-0 break-words">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <Label>Tags</Label>
        <Tags item={item} />
      </section>

      {item.source && (item.source.tool || item.source.url) && (
        <section>
          <Label>Source</Label>
          <div className="space-y-1 text-xs">
            <div>
              {item.source.tool}
              {item.source.ref && <span className="ml-1.5 font-mono text-muted-foreground">{item.source.ref}</span>}
            </div>
            {item.source.title && <div className="text-muted-foreground">{item.source.title}</div>}
            {item.source.url && (
              <a href={item.source.url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 truncate text-primary hover:underline">
                {item.source.url.replace(/^https?:\/\/(www\.)?/, '')} <ExternalLinkIcon className="size-3 shrink-0" />
              </a>
            )}
          </div>
        </section>
      )}

      {!!item.notes?.length && (
        <section>
          <Label>Notes</Label>
          <div className="space-y-1.5">
            {item.notes.map((n, i) => {
              const note = typeof n === 'string' ? { text: n } : n;
              return (
                <div key={i} className="rounded-lg bg-muted/60 px-2.5 py-1.5 text-xs">
                  {note.text}
                  {(note.at || note.production) && (
                    <div className="mt-0.5 text-[11px] text-muted-foreground">{[note.production && (library.production[note.production]?.title ?? note.production), note.at && ago(note.at)].filter(Boolean).join(' · ')}</div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <Label>Used in · {item.uses.length}</Label>
        {!item.uses.length && <p className="text-xs text-muted-foreground">Not used in a production yet.</p>}
        {item.uses.map(slug => {
          const p = library.production[slug];
          return p ? <MiniRow key={slug} image={productionThumb(library, p)} seed={slug} title={p.title} subtitle={p.channel ? library.channel[p.channel]?.name : p.slug} onClick={() => select({ kind: 'production', id: slug })} /> : <div key={slug} className="px-1.5 font-mono text-xs text-muted-foreground">{slug}</div>;
        })}
      </section>

      {!!item.dupes?.length && (
        <section>
          <Label>Other copies · {item.dupes.length}</Label>
          {item.dupes.map(d => (
            <PathRow key={d} path={d} />
          ))}
        </section>
      )}
    </div>
  );
}

export function DetailPanel() {
  const selected = useLibraryStore(s => s.selected);
  const library = useLibraryStore(s => s.library);
  const status = useLibraryStore(s => s.status);
  const select = useLibraryStore(s => s.select);
  if (!selected) return null;
  const production = selected.kind === 'production' ? library.production[selected.id] : null;
  const skill = selected.kind === 'skill' ? library.skill[selected.id] : null;
  const item = selected.kind === 'item' ? library.item[selected.id] : null;
  if (!production && !skill && !item && status === 'loading') return null; // a deep link waits for the export
  return (
    <aside className="flex h-full w-[420px] shrink-0 flex-col border-l bg-background">
      <div className="flex h-12 shrink-0 items-center gap-1 px-3">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{selected.kind === 'item' ? item?.kind ?? 'item' : selected.kind}</span>
        <span className="ml-auto" />
        <Hint label="Close" keys="Esc">
          <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0" onClick={() => select(null)}>
            <XIcon className="size-4" />
          </Button>
        </Hint>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-5 pb-8">
          {production && <ProductionDetail production={production} />}
          {skill && <SkillDetail skill={skill} />}
          {item && <ItemDetail key={item.id} item={item} />}
          {!production && !skill && !item && <p className="py-10 text-center text-sm text-muted-foreground">&quot;{selected.id}&quot; isn&apos;t in this library.</p>}
        </div>
      </div>
    </aside>
  );
}
