'use client';

import * as React from 'react';
import { DownloadIcon, EyeIcon, FileIcon, FolderIcon, Loader2Icon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { filesUnder, shareOf, sizedEntriesOf, type SizedFile } from '@/lib/projects/files';
import { formatBytes } from '@/lib/projects/storage';
import type { Bundle } from './space-assets';

/**
 * A production's or a release's files, opened from its card on the Assets tab: folders and files
 * as GitHub lists them, each with the space it uses and its share of the whole. A folder opens in
 * place; a file has a link that previews it in a new tab (what a browser can show) and one that
 * downloads it. Reading only.
 */

interface BundleFileView extends SizedFile {
  contentType?: string;
  /** A signed link that downloads it, good for an hour. */
  url?: string;
  /** A signed link that opens it in the browser, for what a browser can show. */
  view?: string;
}
interface BundleDetail {
  title: string;
  slug: string;
  version: number | null;
  latestVersion: number;
  bytes: number;
  /** Every version together, a file they share counted once. */
  storedBytes?: number;
  fileCount: number;
  files: BundleFileView[];
  versions: { version: number; status: string; note?: string; fileCount: number; bytes: number; createdAt: string }[];
}

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? '' : 's'}`;
const row = 'flex min-h-10 w-full items-center gap-3 px-4 py-2 text-left text-sm';
const iconLink = 'rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground';

/** The size, with a thin bar for its share of the bundle. */
function Size({ bytes, whole }: { bytes: number; whole: number }) {
  return (
    <span className="ml-auto flex shrink-0 items-center gap-3">
      <span className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-muted sm:block" aria-hidden>
        <span className="block h-full rounded-full bg-foreground/50" style={{ width: `${shareOf(bytes, whole)}%` }} />
      </span>
      <span className="w-20 text-right text-xs tabular-nums text-muted-foreground">{formatBytes(bytes)}</span>
    </span>
  );
}

export function BundleBrowser({ projectId, kind, bundle, onClose }: { projectId: string; kind: 'productions' | 'releases'; bundle: Bundle | null; onClose: () => void }) {
  const [detail, setDetail] = React.useState<BundleDetail | null>(null);
  const [problem, setProblem] = React.useState<string | null>(null);
  const [version, setVersion] = React.useState<number | null>(null);
  const [dir, setDir] = React.useState('');
  const id = bundle?.id;
  React.useEffect(() => {
    setVersion(null);
    setDir('');
  }, [id]);
  React.useEffect(() => {
    if (!id) return;
    let live = true;
    setDetail(null);
    setProblem(null);
    fetch(`/api/project/${kind}?projectId=${encodeURIComponent(projectId)}&id=${encodeURIComponent(id)}&links=1${version ? `&version=${version}` : ''}`)
      .then(async res => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? `It failed (${res.status})`);
        return json as BundleDetail;
      })
      .then(result => live && setDetail(result))
      .catch(error => live && setProblem(error instanceof Error ? error.message : String(error)));
    return () => {
      live = false;
    };
  }, [projectId, kind, id, version]);

  const files = detail?.files ?? [];
  const entries = sizedEntriesOf(files, dir);
  const here = filesUnder(files, dir);
  const hereBytes = here.reduce((sum, file) => sum + file.size, 0);
  const parts = dir ? dir.split('/') : [];
  const whole = detail?.bytes ?? 0;

  return (
    <Dialog open={!!bundle} onOpenChange={open => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{bundle?.title}</DialogTitle>
          <DialogDescription>
            <span className="font-mono">{bundle?.slug}</span>
            {detail && ` · ${plural(detail.versions.length || 1, 'version')} · ${formatBytes(detail.storedBytes ?? detail.bytes)} kept in all`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          {detail && detail.versions.length > 0 && (
            <Select value={String(detail.version ?? detail.latestVersion)} onValueChange={value => (setDir(''), setVersion(Number(value)))}>
              <SelectTrigger className="h-8 w-56 text-sm" aria-label="Version">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[...detail.versions].reverse().map(item => (
                  <SelectItem key={item.version} value={String(item.version)}>
                    v{item.version} · {formatBytes(item.bytes)}
                    {item.status !== 'ready' ? ' · uploading' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <nav aria-label="Folder" className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
            {parts.length ? (
              <button type="button" className="font-semibold text-primary hover:underline" onClick={() => setDir('')}>
                {bundle?.slug}
              </button>
            ) : (
              <span className="font-semibold">{bundle?.slug}</span>
            )}
            {parts.map((part, index) => (
              <React.Fragment key={index}>
                <span className="text-muted-foreground">/</span>
                {index === parts.length - 1 ? (
                  <span className="font-semibold">{part}</span>
                ) : (
                  <button type="button" className="text-primary hover:underline" onClick={() => setDir(parts.slice(0, index + 1).join('/'))}>
                    {part}
                  </button>
                )}
              </React.Fragment>
            ))}
          </nav>
        </div>

        {problem && (
          <p className="rounded-lg border border-destructive/40 px-3 py-2 text-sm text-destructive" role="alert">
            {problem}
          </p>
        )}
        {!detail && !problem && (
          <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" /> Reading its files
          </p>
        )}
        {detail && (
          <div className="min-h-0 overflow-y-auto rounded-xl border bg-card">
            <div className="flex min-h-10 items-center gap-3 border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
              <span>
                {dir ? `This folder: ${plural(here.length, 'file')}` : `Version ${detail.version ?? detail.latestVersion}: ${plural(here.length, 'file')}`}
              </span>
              <span className="ml-auto font-medium tabular-nums text-foreground">{formatBytes(hereBytes)}</span>
            </div>
            <ul className="divide-y">
              {dir && (
                <li>
                  <button type="button" className={`${row} hover:bg-muted/40`} onClick={() => setDir(parts.slice(0, -1).join('/'))} aria-label="Up one folder">
                    <FolderIcon className="size-4 shrink-0 fill-sky-400/80 text-sky-500" aria-hidden />
                    <span className="font-medium">..</span>
                  </button>
                </li>
              )}
              {entries.map(entry =>
                entry.folder ? (
                  <li key={entry.name}>
                    <button type="button" className={`${row} hover:bg-muted/40`} onClick={() => setDir(dir ? `${dir}/${entry.name}` : entry.name)}>
                      <FolderIcon className="size-4 shrink-0 fill-sky-400/80 text-sky-500" aria-hidden />
                      <span className="min-w-0 truncate font-medium">{entry.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{plural(entry.files, 'file')}</span>
                      <Size bytes={entry.bytes} whole={whole} />
                    </button>
                  </li>
                ) : (
                  <li key={entry.name}>
                    <div className={`${row} hover:bg-muted/40`}>
                      <FileIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      {entry.file?.view || entry.file?.url ? (
                        <a href={entry.file.view ?? entry.file.url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate hover:text-primary hover:underline">
                          {entry.name}
                        </a>
                      ) : (
                        <span className="min-w-0 truncate">{entry.name}</span>
                      )}
                      <span className="flex shrink-0 items-center gap-0.5">
                        {entry.file?.view && (
                          <a href={entry.file.view} target="_blank" rel="noopener noreferrer" title="Preview in a new tab" aria-label={`Preview ${entry.name} in a new tab`} className={iconLink}>
                            <EyeIcon className="size-3.5" aria-hidden />
                          </a>
                        )}
                        {entry.file?.url && (
                          <a href={entry.file.url} target="_blank" rel="noopener noreferrer" title="Download" aria-label={`Download ${entry.name}`} className={iconLink}>
                            <DownloadIcon className="size-3.5" aria-hidden />
                          </a>
                        )}
                      </span>
                      <Size bytes={entry.bytes} whole={whole} />
                    </div>
                  </li>
                ),
              )}
              {!entries.length && <li className="px-4 py-6 text-center text-xs text-muted-foreground">No files in this version.</li>}
            </ul>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          The bar is a folder&apos;s or a file&apos;s share of this version. Every version is kept; a file unchanged between versions is stored, and counted, once.
        </p>
      </DialogContent>
    </Dialog>
  );
}
