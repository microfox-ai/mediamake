'use client';

import * as React from 'react';
import {
  BookOpenIcon,
  FileIcon,
  FolderIcon,
  GitBranchIcon,
  GithubIcon,
  HistoryIcon,
  LaptopIcon,
  LockIcon,
  PackageIcon,
} from 'lucide-react';
import { PersonAvatar } from '@/components/projects/project-access';
import { ago, ROLE_INFO, type MemberPerson, type Person } from '@/lib/projects/access';
import type { ProjectRole } from '@/lib/editor/project-access';
import type { CommitView, DeviceStanding, SpaceCodeView, SpaceView } from '@/lib/space/space';
import { cn } from '@/lib/utils';

/**
 * The Code tab of a space, laid out like a repo's front page on GitHub: the branch and the latest commit
 * over the file list (folders open in place, files open on GitHub), the README under it, and on the
 * right About, Commits, Contributors (who has access) and Devices (how far each computer is from the
 * newest version). Everything comes from what the space's computers reported (`mm space`): MediaMake
 * holds the paths and the README, never the files, so a file opens on GitHub.
 */
export function CodeTab({
  code,
  readmeHtml,
  about,
  space,
  projectId,
  personal,
  projectName,
}: {
  code: SpaceCodeView | null;
  /** The README as HTML (lib/space/readme), made on the server. */
  readmeHtml?: string;
  /** The README's opening paragraph: what the space is. */
  about?: string;
  space: SpaceView | null;
  projectId: string;
  personal: boolean;
  projectName?: string;
}) {
  const [dir, setDir] = React.useState('');
  if (!code) {
    return (
      <p className="rounded-xl border border-dashed p-4 text-xs text-muted-foreground">
        No code here yet. The space&apos;s repo is made the first time something is shared into it (ask Claude to &quot;share &lt;skill&gt; with the {projectName ?? 'project'} project&quot;); then every{' '}
        <Mono>mm space sync</Mono> shows it here.
      </p>
    );
  }
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="flex min-w-0 flex-col gap-4">
        <Toolbar code={code} dir={dir} onDir={setDir} />
        <FileList code={code} dir={dir} onDir={setDir} />
        {!dir && <Readme code={code} html={readmeHtml} />}
      </div>
      <aside className="flex min-w-0 flex-col divide-y [&>section]:py-5 [&>section:first-child]:pt-0">
        <About code={code} about={about} space={space} personal={personal} projectName={projectName} />
        <Commits code={code} />
        <Contributors projectId={projectId} personal={personal} />
        <Devices code={code} />
      </aside>
    </div>
  );
}

/* ---------- helpers ---------- */

const Mono = ({ children }: { children: React.ReactNode }) => <span className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">{children}</span>;

const encodePath = (p: string) => p.split('/').map(encodeURIComponent).join('/');
const fileUrl = (code: SpaceCodeView, p: string, folder = false) => (code.repoUrl ? `${code.repoUrl}/${folder ? 'tree' : 'blob'}/${encodeURIComponent(code.branch)}/${encodePath(p)}` : undefined);
const commitUrl = (code: SpaceCodeView, commit: CommitView) => (code.repoUrl && !commit.local ? `${code.repoUrl}/commit/${commit.sha}` : undefined);
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function When({ iso }: { iso?: string }) {
  if (!iso) return null;
  return (
    <time dateTime={iso} title={new Date(iso).toLocaleString()} suppressHydrationWarning>
      {ago(iso)}
    </time>
  );
}

const Heading = ({ children, count }: { children: React.ReactNode; count?: number }) => (
  <h2 className="flex items-center gap-2 text-sm font-semibold">
    {children}
    {count !== undefined && <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">{count}</span>}
  </h2>
);

interface Entry {
  name: string;
  folder: boolean;
  /** A folder's file count, all the way down. */
  files: number;
}

/** What is in one folder of the repo, folders first, as GitHub lists it. */
export function entriesOf(files: string[], dir: string): Entry[] {
  const prefix = dir ? `${dir}/` : '';
  const byName = new Map<string, Entry>();
  for (const file of files) {
    if (!file.startsWith(prefix)) continue;
    const [name, ...rest] = file.slice(prefix.length).split('/');
    const entry = byName.get(name) ?? { name, folder: false, files: 0 };
    if (rest.length) {
      entry.folder = true;
      entry.files++;
    }
    byName.set(name, entry);
  }
  return [...byName.values()].sort((a, b) => Number(b.folder) - Number(a.folder) || a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
}

/* ---------- the left column ---------- */

function Toolbar({ code, dir, onDir }: { code: SpaceCodeView; dir: string; onDir: (dir: string) => void }) {
  const parts = dir ? dir.split('/') : [];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-muted/40 px-2.5 text-sm font-medium">
        <GitBranchIcon className="size-4 text-muted-foreground" aria-hidden />
        {code.branch}
      </span>
      {parts.length ? (
        <nav aria-label="Folder" className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
          <button type="button" className="font-semibold text-primary hover:underline" onClick={() => onDir('')}>
            {code.repo.split('/').pop()}
          </button>
          {parts.map((part, index) => {
            const last = index === parts.length - 1;
            return (
              <React.Fragment key={index}>
                <span className="text-muted-foreground">/</span>
                {last ? (
                  <span className="font-semibold">{part}</span>
                ) : (
                  <button type="button" className="text-primary hover:underline" onClick={() => onDir(parts.slice(0, index + 1).join('/'))}>
                    {part}
                  </button>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      ) : (
        <span className="text-sm text-muted-foreground">
          {plural(code.files.length, 'file')}
          {code.truncated && ' shown'}
        </span>
      )}
      {code.repoUrl && (
        <a
          href={dir ? fileUrl(code, dir, true) : code.repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-sm font-medium text-white shadow-xs hover:bg-emerald-700"
        >
          <GithubIcon className="size-4" aria-hidden /> Open on GitHub
        </a>
      )}
    </div>
  );
}

function FileList({ code, dir, onDir }: { code: SpaceCodeView; dir: string; onDir: (dir: string) => void }) {
  const entries = entriesOf(code.files, dir);
  const latest = code.commits[0];
  const row = 'flex min-h-10 items-center gap-3 px-4 py-2 text-sm';
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex min-h-12 items-center gap-3 border-b bg-muted/40 px-4 py-2 text-sm">
        {latest ? (
          <>
            <PersonAvatar person={{ clientId: latest.by, name: latest.by }} className="size-6 text-[9px]" />
            <span className="shrink-0 font-semibold">{latest.by}</span>
            <CommitSubject code={code} commit={latest} className="min-w-0 flex-1 truncate text-muted-foreground" />
            <span className="hidden shrink-0 items-center gap-2 text-xs text-muted-foreground sm:flex">
              <span className="font-mono">{latest.sha.slice(0, 7)}</span>·<When iso={latest.at} />
            </span>
            {code.repoUrl && (
              <a href={`${code.repoUrl}/commits/${encodeURIComponent(code.branch)}`} target="_blank" rel="noopener noreferrer" className="flex shrink-0 items-center gap-1 text-xs font-medium hover:text-primary">
                <HistoryIcon className="size-3.5" aria-hidden /> Commits
              </a>
            )}
          </>
        ) : (
          <span className="text-xs text-muted-foreground">No commits reported yet.</span>
        )}
      </div>
      <ul className="divide-y">
        {dir && (
          <li>
            <button type="button" className={cn(row, 'w-full text-left hover:bg-muted/40')} onClick={() => onDir(dir.split('/').slice(0, -1).join('/'))} aria-label="Up one folder">
              <FolderIcon className="size-4 fill-sky-400/80 text-sky-500" aria-hidden />
              <span className="font-medium">..</span>
            </button>
          </li>
        )}
        {entries.map(entry => {
          const at = dir ? `${dir}/${entry.name}` : entry.name;
          const icon = entry.folder ? <FolderIcon className="size-4 shrink-0 fill-sky-400/80 text-sky-500" aria-hidden /> : <FileIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />;
          const meta = entry.folder && <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">{plural(entry.files, 'file')}</span>;
          const url = fileUrl(code, at);
          return (
            <li key={entry.name}>
              {entry.folder ? (
                <button type="button" className={cn(row, 'w-full text-left hover:bg-muted/40')} onClick={() => onDir(at)}>
                  {icon}
                  <span className="min-w-0 truncate hover:text-primary hover:underline">{entry.name}</span>
                  {meta}
                </button>
              ) : url ? (
                <a href={url} target="_blank" rel="noopener noreferrer" className={cn(row, 'hover:bg-muted/40')}>
                  {icon}
                  <span className="min-w-0 truncate hover:text-primary hover:underline">{entry.name}</span>
                </a>
              ) : (
                <div className={row}>
                  {icon}
                  <span className="min-w-0 truncate">{entry.name}</span>
                </div>
              )}
            </li>
          );
        })}
        {!entries.length && <li className="px-4 py-6 text-center text-xs text-muted-foreground">No files reported yet. Run <Mono>mm space sync</Mono> on a computer with this space.</li>}
        {!dir && code.truncated && (
          <li className="px-4 py-2 text-xs text-muted-foreground">
            The first {plural(code.files.length, 'file')}: the rest are on GitHub.
          </li>
        )}
      </ul>
    </div>
  );
}

function CommitSubject({ code, commit, className }: { code: SpaceCodeView; commit: CommitView; className?: string }) {
  const url = commitUrl(code, commit);
  const subject = commit.subject || commit.sha.slice(0, 7);
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className={cn('hover:text-primary hover:underline', className)} title={subject}>
      {subject}
    </a>
  ) : (
    <span className={className} title={subject}>
      {subject}
    </span>
  );
}

const MARKDOWN = [
  'min-w-0 text-sm leading-relaxed text-foreground/90',
  '[&>*+*]:mt-4',
  '[&_h1]:border-b [&_h1]:pb-2 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mt-8 [&_h2]:border-b [&_h2]:pb-1.5 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:font-semibold [&_h4]:font-semibold',
  '[&_a]:text-primary [&_a]:underline-offset-4 [&_a:hover]:underline',
  '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li+li]:mt-1 [&_li>ul]:mt-1 [&_li>ol]:mt-1',
  '[&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em]',
  '[&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:bg-muted/50 [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0',
  '[&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground',
  '[&_table]:block [&_table]:overflow-x-auto [&_table]:text-xs [&_th]:border [&_th]:bg-muted/50 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_td]:align-top',
  '[&_hr]:border-border [&_img]:max-w-full [&_img]:rounded-md',
].join(' ');

function Readme({ code, html }: { code: SpaceCodeView; html?: string }) {
  return (
    <section id="readme" className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-2.5 text-sm font-semibold">
        <BookOpenIcon className="size-4 text-muted-foreground" aria-hidden /> README
        {code.repoUrl && code.readme && (
          <a href={fileUrl(code, code.files.find(f => /^readme\.md$/i.test(f)) ?? 'README.md')} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs font-normal text-muted-foreground hover:text-primary">
            Edit on GitHub
          </a>
        )}
      </div>
      {html ? (
        <article className={cn(MARKDOWN, 'px-5 py-5 sm:px-8')} dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <p className="px-4 py-6 text-xs text-muted-foreground">
          No README yet. The next <Mono>mm space sync --yes</Mono> writes one with a list of what is here; ask Claude to say above it what the space is for.
        </p>
      )}
    </section>
  );
}

/* ---------- the right column ---------- */

function About({ code, about, space, personal, projectName }: { code: SpaceCodeView; about?: string; space: SpaceView | null; personal: boolean; projectName?: string }) {
  const counts = (['skill', 'mcp', 'app'] as const)
    .map(kind => [kind, space?.items.filter(item => item.kind === kind).length ?? 0] as const)
    .filter(([, n]) => n > 0)
    .map(([kind, n]) => plural(n, kind === 'skill' ? 'skill' : kind === 'mcp' ? 'MCP' : 'app'));
  const line = 'flex items-center gap-2 text-xs text-muted-foreground';
  return (
    <section className="flex flex-col gap-3">
      <Heading>About</Heading>
      <p className="text-sm">{about ?? (personal ? 'Your own skills, MCPs and apps, the same on every computer of yours.' : `The skills, MCPs and apps made for ${projectName ?? 'the project'}, and what guides every production of it.`)}</p>
      {code.repoUrl && (
        <a href={code.repoUrl} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-2 text-sm font-medium text-primary hover:underline">
          <GithubIcon className="size-4 shrink-0" aria-hidden />
          <span className="truncate">github.com/{code.repo}</span>
        </a>
      )}
      <ul className="flex flex-col gap-2">
        {code.readme && (
          <li>
            <a href="#readme" className={cn(line, 'hover:text-primary')}>
              <BookOpenIcon className="size-3.5" aria-hidden /> Readme
            </a>
          </li>
        )}
        <li className={line}>
          <LockIcon className="size-3.5" aria-hidden /> Private: {personal ? 'only you' : 'the people on the project'}
        </li>
        <li className={line}>
          <GitBranchIcon className="size-3.5" aria-hidden /> {code.branch} · {plural(code.files.length, 'file')}
        </li>
        {counts.length > 0 && (
          <li className={line}>
            <PackageIcon className="size-3.5" aria-hidden /> {counts.join(' · ')}
          </li>
        )}
        {code.commits[0] && (
          <li className={line}>
            <HistoryIcon className="size-3.5" aria-hidden />
            <span>
              Updated <When iso={code.commits[0].at} />
            </span>
          </li>
        )}
      </ul>
    </section>
  );
}

function Commits({ code }: { code: SpaceCodeView }) {
  const [latest] = code.commits;
  return (
    <section className="flex flex-col gap-3">
      <Heading count={code.commits.length || undefined}>Commits</Heading>
      {latest ? (
        <>
          <p className="text-xs text-muted-foreground">
            Last updated by <span className="font-medium text-foreground">{latest.by}</span>, <When iso={latest.at} />
            {latest.local && ' (not on GitHub yet)'}.
          </p>
          <ul className="flex flex-col gap-2.5">
            {code.commits.slice(0, 5).map(commit => (
              <li key={commit.sha} className="flex min-w-0 flex-col gap-0.5">
                <CommitSubject code={code} commit={commit} className="truncate text-sm" />
                <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="truncate">{commit.by}</span>·<When iso={commit.at} />·<span className="font-mono">{commit.sha.slice(0, 7)}</span>
                  {commit.local && <span className="rounded bg-sky-500/10 px-1 text-sky-700 dark:text-sky-300">not sent</span>}
                </span>
              </li>
            ))}
          </ul>
          {code.repoUrl && (
            <a href={`${code.repoUrl}/commits/${encodeURIComponent(code.branch)}`} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-primary hover:underline">
              Every commit on GitHub
            </a>
          )}
        </>
      ) : (
        <p className="text-xs text-muted-foreground">None reported yet.</p>
      )}
    </section>
  );
}

/** What GET /api/project/share answers, as far as this needs it. */
interface Access {
  owner: Person;
  members: MemberPerson[];
}

function Contributors({ projectId, personal }: { projectId: string; personal: boolean }) {
  const [people, setPeople] = React.useState<(Person & { role: ProjectRole })[] | null>(null);
  React.useEffect(() => {
    if (personal) return;
    fetch(`/api/project/share?projectId=${encodeURIComponent(projectId)}`)
      .then(res => (res.ok ? (res.json() as Promise<Access>) : null))
      .then(view => setPeople(view ? [{ ...view.owner, role: 'owner' as const }, ...view.members] : []))
      .catch(() => setPeople([]));
  }, [projectId, personal]);

  if (personal) {
    return (
      <section className="flex flex-col gap-3">
        <Heading count={1}>Contributors</Heading>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <LockIcon className="size-3.5" aria-hidden /> Only you: your personal space.
        </p>
      </section>
    );
  }
  return (
    <section className="flex flex-col gap-3">
      <Heading count={people?.length || undefined}>Contributors</Heading>
      {!people ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : people.length ? (
        <ul className="flex flex-col gap-2">
          {people.map(person => (
            <li key={person.clientId} className="flex min-w-0 items-center gap-2">
              <PersonAvatar person={person} className="size-7 text-[10px]" />
              <span className="min-w-0 truncate text-sm">{person.name}</span>
              <span className="ml-auto shrink-0 text-[11px] text-muted-foreground" title={ROLE_INFO[person.role].can}>
                {ROLE_INFO[person.role].label}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">Could not load who has access. The People tab has them.</p>
      )}
      <p className="text-[11px] text-muted-foreground">Everyone on the project has the repo on GitHub: owners and editors push, viewers pull.</p>
    </section>
  );
}

function Standing({ device }: { device: DeviceStanding }) {
  const pills: [string, string][] = [];
  if (device.behind === null) pills.push(['Far behind', 'amber']);
  else if (device.behind > 0) pills.push([`${device.behind} behind`, 'amber']);
  if (device.ahead > 0) pills.push([`${device.ahead} not sent`, 'sky']);
  else if (!device.pushed) pills.push(['Edits not sent', 'sky']);
  if (!pills.length) pills.push(['Up to date', 'emerald']);
  const tone: Record<string, string> = {
    amber: 'bg-amber-500/10 text-amber-800 dark:text-amber-200',
    sky: 'bg-sky-500/10 text-sky-800 dark:text-sky-200',
    emerald: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-200',
  };
  return (
    <span className="flex shrink-0 flex-wrap justify-end gap-1">
      {pills.map(([label, color]) => (
        <span key={label} className={cn('rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums', tone[color])}>
          {label}
        </span>
      ))}
    </span>
  );
}

function Devices({ code }: { code: SpaceCodeView }) {
  return (
    <section className="flex flex-col gap-3">
      <Heading count={code.devices.length || undefined}>Devices</Heading>
      {code.devices.length ? (
        <ul className="flex flex-col gap-3">
          {code.devices.map(device => (
            <li key={device.key} className="flex min-w-0 items-start gap-2">
              <LaptopIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm">
                  {device.name}
                  {device.mine && <span className="text-muted-foreground"> (yours)</span>}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Checked in <When iso={device.reportedAt} />
                </span>
              </span>
              <span className="ml-auto">
                <Standing device={device} />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">No computer has this space yet.</p>
      )}
      <p className="text-[11px] text-muted-foreground">
        Behind: updates the newest computer has and this one doesn&apos;t. Not sent: made on that computer, not on GitHub yet. <Mono>mm space sync</Mono> brings a computer up to date,{' '}
        <Mono>--yes</Mono> sends what it made.
      </p>
    </section>
  );
}
