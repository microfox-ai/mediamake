'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { BookOpenCheckIcon, CheckIcon, CircleIcon, CopyIcon, FileIcon, FolderIcon, Loader2Icon, PencilIcon } from 'lucide-react';
import { DetailsButton } from '@/components/app-shell/item-details';
import { entriesOf } from '@/components/projects/space-code';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { detailsKey } from '@/lib/app-shell/details-key';
import { MAX_LISTING_TAGS, parseTags } from '@/lib/catalog/listing';
import { itemPagePath } from '@/lib/catalog/paths';
import {
  DEPENDENCIES_SHOWN,
  SKILL_NATURES,
  SKILL_TYPES,
  readmeTemplate,
  skillNameOf,
  type ReadmeCheck,
  type SkillDependency,
  type SkillDetailsView,
  type SkillFileRoot,
  type SkillFiles,
  type SkillNature,
  type SkillType,
} from '@/lib/catalog/skill-profile';
import { cn } from '@/lib/utils';

/**
 * A skill's own parts of its page, the same on its store page (/skills/<name>)
 * and its page in the app (/app/item): the file browser above its README, what
 * it depends on in the right column, and, for whoever may change the skill, the
 * Edit details dialog (tags, nature, type) and the README guide. The words and
 * the rules are lib/catalog/skill-profile's; saving is POST /api/catalog/profile.
 */

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;
const encodePath = (path: string) => path.split('/').map(encodeURIComponent).join('/');

/* ---------- the file browser ---------- */

/**
 * The skill's files as GitHub lists a folder: folders first and open in place, a file opens on GitHub.
 * Under the skill's own folder, the engine folders and setup scripts it uses.
 */
export function SkillFilesCard({ files, className }: { files: SkillFiles; className?: string }) {
  const [at, setAt] = React.useState<{ root: number; dir: string }>({ root: 0, dir: '' });
  const root = files.roots[at.root] ?? files.roots[0];
  const top = at.root === 0 && !at.dir;
  const extras = files.roots.slice(1);
  const entries = entriesOf(root.files, at.dir);
  const parts = at.dir ? at.dir.split('/') : [];
  const row = 'flex min-h-9 w-full items-center gap-3 px-4 py-1.5 text-left text-sm';
  const folderIcon = <FolderIcon className="size-4 shrink-0 fill-sky-400/80 text-sky-500" aria-hidden />;
  const fileIcon = <FileIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />;
  const crumb = 'text-primary hover:underline';

  return (
    <section aria-label="Files" className={cn('overflow-hidden rounded-xl border bg-card', className)}>
      <div className="flex min-h-10 flex-wrap items-center gap-x-1 gap-y-0.5 border-b bg-muted/40 px-4 py-2 text-sm">
        <nav aria-label="Folder" className="flex min-w-0 flex-wrap items-center gap-1">
          {top ? (
            <span className="font-mono font-semibold">{files.roots[0].label}</span>
          ) : (
            <button type="button" className={cn(crumb, 'font-mono font-semibold')} onClick={() => setAt({ root: 0, dir: '' })}>
              {files.roots[0].label}
            </button>
          )}
          {at.root > 0 && (
            <>
              <span className="text-muted-foreground">/</span>
              {parts.length ? (
                <button type="button" className={cn(crumb, 'font-mono')} onClick={() => setAt({ root: at.root, dir: '' })}>
                  {root.label}
                </button>
              ) : (
                <span className="font-mono font-semibold">{root.label}</span>
              )}
            </>
          )}
          {parts.map((part, index) => (
            <React.Fragment key={index}>
              <span className="text-muted-foreground">/</span>
              {index === parts.length - 1 ? (
                <span className="font-mono font-semibold">{part}</span>
              ) : (
                <button type="button" className={cn(crumb, 'font-mono')} onClick={() => setAt({ root: at.root, dir: parts.slice(0, index + 1).join('/') })}>
                  {part}
                </button>
              )}
            </React.Fragment>
          ))}
        </nav>
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
          {plural(root.files.length, 'file')}
          {files.truncated && ' shown'}
        </span>
      </div>
      <ul className="max-h-72 divide-y overflow-y-auto">
        {!top && (
          <li>
            <button
              type="button"
              className={cn(row, 'hover:bg-muted/40')}
              aria-label="Up one folder"
              onClick={() => setAt(at.dir ? { root: at.root, dir: parts.slice(0, -1).join('/') } : { root: 0, dir: '' })}
            >
              {folderIcon}
              <span className="font-medium">..</span>
            </button>
          </li>
        )}
        {entries.map(entry => {
          const path = at.dir ? `${at.dir}/${entry.name}` : entry.name;
          const url = root.url ? `${root.url}/${encodePath(path)}` : undefined;
          return (
            <li key={entry.name}>
              {entry.folder ? (
                <button type="button" className={cn(row, 'hover:bg-muted/40')} onClick={() => setAt({ root: at.root, dir: path })}>
                  {folderIcon}
                  <span className="min-w-0 truncate">{entry.name}</span>
                  <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">{plural(entry.files, 'file')}</span>
                </button>
              ) : url ? (
                <a href={url} target="_blank" rel="noopener noreferrer" className={cn(row, 'hover:bg-muted/40')}>
                  {fileIcon}
                  <span className="min-w-0 truncate hover:text-primary hover:underline">{entry.name}</span>
                </a>
              ) : (
                <div className={row}>
                  {fileIcon}
                  <span className="min-w-0 truncate">{entry.name}</span>
                </div>
              )}
            </li>
          );
        })}
        {top && extras.length > 0 && (
          <>
            <li className="bg-muted/40 px-4 py-1.5 text-xs font-medium text-muted-foreground">Engine and setup it uses</li>
            {extras.map((extra, index) => (
              <li key={extra.label}>
                <ExtraRow root={extra} className={row} onOpen={() => setAt({ root: index + 1, dir: '' })} folderIcon={folderIcon} fileIcon={fileIcon} />
              </li>
            ))}
          </>
        )}
      </ul>
    </section>
  );
}

function ExtraRow({ root, className, onOpen, folderIcon, fileIcon }: { root: SkillFileRoot; className: string; onOpen: () => void; folderIcon: React.ReactNode; fileIcon: React.ReactNode }) {
  const kind = <span className="ml-auto shrink-0 text-xs text-muted-foreground">{root.file ? 'Setup' : `${root.kind === 'engine' ? 'Engine' : 'Scripts'} · ${plural(root.files.length, 'file')}`}</span>;
  if (root.file) {
    return (
      <a href={root.file} target="_blank" rel="noopener noreferrer" className={cn(className, 'hover:bg-muted/40')}>
        {fileIcon}
        <span className="min-w-0 truncate font-mono text-[13px] hover:text-primary hover:underline">{root.label}</span>
        {kind}
      </a>
    );
  }
  return (
    <button type="button" className={cn(className, 'hover:bg-muted/40')} onClick={onOpen}>
      {folderIcon}
      <span className="min-w-0 truncate font-mono text-[13px]">{root.label}</span>
      {kind}
    </button>
  );
}

/* ---------- what it depends on ---------- */

const KIND_LABEL = { mcp: 'MCP', app: 'App', skill: 'Skill' } as const;
const NEED_STYLE = {
  required: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  recommended: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  optional: 'bg-muted text-muted-foreground',
} as const;

/** The MCPs, apps and skills an item depends on: the first five, then "+N more". Each name opens that item's page. */
export function DependsOn({ depends }: { depends: SkillDependency[] }) {
  return <ItemLinks title="Depends on" about="What it needs or works with" items={depends} />;
}

/** The skills, MCPs and apps that use an item: its dependencies the other way round, linked the same way. */
export function UsesThis({ users }: { users: SkillDependency[] }) {
  return <ItemLinks title="Uses this" about="What runs it or works with it" items={users} />;
}

function ItemLinks({ title, about, items }: { title: string; about: string; items: SkillDependency[] }) {
  const [all, setAll] = React.useState(false);
  if (!items.length) return null;
  const shown = all ? items : items.slice(0, DEPENDENCIES_SHOWN);
  const more = items.length - shown.length;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold" title={about}>
        {title}
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">{items.length}</span>
      </h2>
      <ul className="flex flex-col gap-2.5">
        {shown.map(entry => {
          const id = `${entry.kind}/${entry.name}`;
          return (
            <li key={id} className="flex min-w-0 flex-col gap-0.5">
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="shrink-0 rounded border px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{KIND_LABEL[entry.kind]}</span>
                <DetailsButton detailsKey={detailsKey.catalog(id)} href={itemPagePath(id)} className="min-w-0 truncate font-mono text-sm font-medium text-foreground">
                  {entry.name}
                </DetailsButton>
                {entry.need && entry.need !== 'optional' && <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium capitalize', NEED_STYLE[entry.need])}>{entry.need}</span>}
              </span>
              {entry.note && <span className="line-clamp-2 text-xs text-muted-foreground">{entry.note}</span>}
            </li>
          );
        })}
      </ul>
      {more > 0 && (
        <button type="button" className="self-start text-xs font-medium text-primary hover:underline" onClick={() => setAll(true)}>
          +{more} more
        </button>
      )}
    </section>
  );
}

/* ---------- editing ---------- */

/**
 * Edit details and README guide, for whoever may change the skill. On a store page, which is the same
 * for everyone, `canEdit` is left out and the buttons ask the server who is looking.
 */
export function SkillOwnerTools({ itemKey, title, view, checks, canEdit }: { itemKey: string; title: string; view: SkillDetailsView; checks?: ReadmeCheck[]; canEdit?: boolean }) {
  const [may, setMay] = React.useState(canEdit ?? false);
  const [open, setOpen] = React.useState<'edit' | 'guide' | null>(null);
  React.useEffect(() => {
    if (canEdit !== undefined) return;
    let gone = false;
    fetch(`/api/catalog/profile?key=${encodeURIComponent(itemKey)}`)
      .then(res => (res.ok ? res.json() : null))
      .then(answer => !gone && setMay(!!answer?.canEdit))
      .catch(() => {});
    return () => {
      gone = true;
    };
  }, [itemKey, canEdit]);

  if (!may) return null;
  const missing = (checks ?? []).filter(check => check.required && !check.ok).length;
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" className="h-8" onClick={() => setOpen('edit')}>
        <PencilIcon /> Edit details
      </Button>
      {checks && (
        <Button variant="outline" size="sm" className="h-8" onClick={() => setOpen('guide')}>
          <BookOpenCheckIcon /> README guide
          {missing > 0 && <span className="rounded-full bg-amber-500/15 px-1.5 text-[11px] font-medium text-amber-800 dark:text-amber-200">{missing} missing</span>}
        </Button>
      )}
      {open === 'edit' && <EditDialog itemKey={itemKey} view={view} onClose={() => setOpen(null)} />}
      {open === 'guide' && checks && <GuideDialog title={title} nature={view.nature} checks={checks} onClose={() => setOpen(null)} />}
    </div>
  );
}

const NOT_SET = 'none';

function EditDialog({ itemKey, view, onClose }: { itemKey: string; view: SkillDetailsView; onClose: () => void }) {
  const router = useRouter();
  const [tagText, setTagText] = React.useState(view.tags.join(', '));
  const [nature, setNature] = React.useState<SkillNature>(view.nature);
  const [type, setType] = React.useState<SkillType | typeof NOT_SET>(view.type ?? NOT_SET);
  const [superset, setSuperset] = React.useState(view.superset ?? '');
  const [busy, setBusy] = React.useState(false);
  const subset = type === 'subset';
  const supersetName = skillNameOf(superset);
  const noSuperset = subset && !supersetName;
  const tags = parseTags(tagText.split(',')).filter(tag => !view.ownTags.includes(tag));
  const tooMany = tags.length > MAX_LISTING_TAGS;
  const about = SKILL_TYPES.find(entry => entry.id === type)?.about;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy || tooMany || noSuperset) return;
    setBusy(true);
    try {
      const res = await fetch('/api/catalog/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: itemKey, tags, type: type === NOT_SET ? null : type, ...(subset && { superset: supersetName }), ...(!view.natureFixed && { nature }) }),
      });
      const answer = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(answer.error ?? 'Could not save the details');
      toast.success('Details saved');
      router.refresh();
      onClose();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={next => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit details</DialogTitle>
          <DialogDescription>What the skill&apos;s page says about it.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-5" onSubmit={save}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="skill-tags">Tags</Label>
            <Input id="skill-tags" value={tagText} onChange={event => setTagText(event.target.value)} placeholder="anime, lyric video, shorts" aria-invalid={tooMany} />
            {(view.ownTags.length > 0 || tags.length > 0) && (
              <ul className="flex flex-wrap gap-1.5">
                {view.ownTags.map(tag => (
                  <li key={tag} title="It comes with the skill" className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                    {tag}
                  </li>
                ))}
                {tags.map(tag => (
                  <li key={tag} className="rounded-full border px-2.5 py-0.5 text-xs font-medium">
                    {tag}
                  </li>
                ))}
              </ul>
            )}
            <p className={cn('text-xs', tooMany ? 'text-destructive' : 'text-muted-foreground')}>{tooMany ? `At most ${MAX_LISTING_TAGS} tags.` : 'Put a comma between tags.'}</p>
          </div>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">Who it is for</legend>
            {view.natureFixed ? (
              <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                <span className="font-medium">Shared use.</span> <span className="text-muted-foreground">It is in the store.</span>
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {SKILL_NATURES.map(entry => (
                  <label key={entry.id} className={cn('flex cursor-pointer flex-col gap-1 rounded-lg border px-3 py-2 text-sm', nature === entry.id ? 'border-foreground bg-muted/40' : 'hover:bg-muted/30')}>
                    <span className="flex items-center gap-2 font-medium">
                      <input type="radio" name="skill-nature" value={entry.id} checked={nature === entry.id} onChange={() => setNature(entry.id)} className="accent-foreground" />
                      {entry.label}
                    </span>
                    <span className="text-xs text-muted-foreground">{entry.about}</span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="skill-type">Type</Label>
            <Select value={type} onValueChange={value => setType(value as SkillType | typeof NOT_SET)}>
              <SelectTrigger id="skill-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NOT_SET}>Not set</SelectItem>
                {SKILL_TYPES.map(entry => (
                  <SelectItem key={entry.id} value={entry.id}>
                    {entry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {about && <p className="text-xs text-muted-foreground">{about}</p>}
          </div>

          {subset && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="skill-superset">Its superset skill</Label>
              <Input id="skill-superset" value={superset} onChange={event => setSuperset(event.target.value)} placeholder="make-kinetictype" className="font-mono" aria-invalid={!!superset && !supersetName} />
              <p className="text-xs text-muted-foreground">The name of the skill this one is a style or a part of.</p>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || tooMany || noSuperset}>
              {busy && <Loader2Icon className="animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** A line of the guide: `code` between backticks set in mono. */
function Words({ text }: { text: string }) {
  return (
    <>
      {text.split('`').map((part, index) =>
        index % 2 ? (
          <code key={index} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
            {part}
          </code>
        ) : (
          part
        ),
      )}
    </>
  );
}

function GuideDialog({ title, nature, checks, onClose }: { title: string; nature: SkillNature; checks: ReadmeCheck[]; onClose: () => void }) {
  const [copied, setCopied] = React.useState(false);
  const strict = nature === 'shared-use';
  const copy = async () => {
    const text = readmeTemplate(
      title,
      checks.some(check => check.id === 'uses'),
    );
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('Copy this:', text);
    }
  };
  return (
    <Dialog open onOpenChange={next => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>README guide</DialogTitle>
          <DialogDescription>
            {strict
              ? 'A shared-use skill needs every part, in this order, so people get what it is and what to expect.'
              : 'A private-use skill’s README can be loose. These parts are suggestions.'}
          </DialogDescription>
        </DialogHeader>
        <ol className="flex flex-col gap-3">
          {checks.map(check => (
            <li key={check.id} className="flex items-start gap-2.5">
              {check.ok ? (
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-label="Written" />
              ) : (
                <CircleIcon className={cn('mt-0.5 size-4 shrink-0', check.required ? 'text-amber-500' : 'text-muted-foreground/50')} aria-label={check.required ? 'Missing' : 'Not written'} />
              )}
              <span className="min-w-0 text-sm">
                <span className="font-medium">{check.label}</span>
                <span className="block text-xs text-muted-foreground">
                  <Words text={check.about} />
                </span>
              </span>
            </li>
          ))}
        </ol>
        <p className="text-xs text-muted-foreground">
          Write it in <code className="rounded bg-muted px-1 py-0.5 font-mono">README.md</code> in the skill&apos;s folder, beside SKILL.md. The page shows it after the next sync.
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={copy}>
            {copied ? <CheckIcon /> : <CopyIcon />} {copied ? 'Copied' : 'Copy a template'}
          </Button>
          <Button type="button" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
