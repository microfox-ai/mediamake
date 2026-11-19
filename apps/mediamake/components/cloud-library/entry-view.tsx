'use client';

import * as React from 'react';
import { BotIcon, DownloadIcon, Loader2Icon, PencilIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { EntryRecord, FieldValue, PlaylistLink, SongPart, StoreLink } from '@/lib/cloud-library';
import { canChange, clock, dayText, formatBytes, valueLine, type CollectionView, type EntryAnswer, type FieldView, type SpaceView } from '@/lib/cloud-library/view';
import { libraryApi } from './api';
import { EntryDialog } from './entry-dialog';

/**
 * One entry: a tab for each of the template's headings, then its files by slot, its numbers when a
 * platform sent some, and its history. Whoever can change the space gets Change and Move to trash.
 */

const button = 'inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50';
const link = 'font-medium underline underline-offset-4 hover:text-foreground';

function Value({ field, value }: { field: FieldView; value: FieldValue | undefined }) {
  if (value === undefined || value === '' || (Array.isArray(value) && !value.length)) return <p className="text-sm text-muted-foreground">Not set</p>;
  if (field.kind === 'longtext') return <p className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm leading-relaxed">{String(value)}</p>;
  if (field.kind === 'tags')
    return (
      <div className="flex flex-wrap gap-1.5">
        {(value as string[]).map(tag => (
          <span key={tag} className="rounded-md border bg-muted px-2 py-0.5 text-xs">
            {tag}
          </span>
        ))}
      </div>
    );
  if (field.kind === 'links')
    return (
      <ul className="flex flex-col gap-1 text-sm">
        {(value as StoreLink[]).map(row => (
          <li key={`${row.platform}-${row.url}`} className="flex gap-2">
            <span className="w-36 shrink-0 text-muted-foreground">{row.platform}</span>
            <a href={row.url} target="_blank" rel="noopener noreferrer" className={`${link} min-w-0 truncate`}>
              {row.url}
            </a>
          </li>
        ))}
      </ul>
    );
  if (field.kind === 'playlists')
    return (
      <ul className="flex flex-col gap-1 text-sm">
        {(value as PlaylistLink[]).map(row => (
          <li key={`${row.platform}-${row.url}`} className="flex gap-2">
            <span className="w-36 shrink-0 text-muted-foreground">{row.platform}</span>
            <a href={row.url} target="_blank" rel="noopener noreferrer" className={`${link} min-w-0 truncate`}>
              {row.name || row.url}
            </a>
            {row.added && <span className="shrink-0 text-xs text-muted-foreground">added {dayText(row.added)}</span>}
          </li>
        ))}
      </ul>
    );
  if (field.kind === 'parts')
    return (
      <ul className="flex flex-col divide-y rounded-lg border text-sm">
        {(value as SongPart[]).map((part, index) => (
          <li key={`${part.name}-${index}`} className="flex gap-3 px-3 py-2">
            <span className="w-24 shrink-0 font-medium">{part.name}</span>
            <span className="w-24 shrink-0 text-xs tabular-nums text-muted-foreground">{[clock(part.start), clock(part.end)].filter(Boolean).join(' to ')}</span>
            <span className="min-w-0 flex-1">{part.what}</span>
            {part.energy && <span className="shrink-0 text-xs text-muted-foreground">{part.energy}</span>}
          </li>
        ))}
      </ul>
    );
  if (field.kind === 'group')
    return (
      <ul className="flex flex-col gap-1 text-sm">
        {Object.entries(value as Record<string, string | string[]>).map(([name, v]) => (
          <li key={name} className="flex gap-2">
            <span className="w-36 shrink-0 text-muted-foreground">{name}</span>
            <span className="min-w-0">{Array.isArray(v) ? v.join(', ') : v}</span>
          </li>
        ))}
      </ul>
    );
  return <p className="text-sm">{valueLine(field.kind, value)}</p>;
}

function Files({ space, collection, entry }: { space: SpaceView; collection: CollectionView; entry: EntryRecord }) {
  const [busy, setBusy] = React.useState<string | null>(null);
  const known = collection.slots.map(slot => slot.key);
  const slots = [...collection.slots, ...Object.keys(entry.slots).filter(key => !known.includes(key)).map(key => ({ key, label: key === 'other' ? 'Other files' : key, many: true, hint: undefined as string | undefined }))];

  const download = async (slot: string, sha256: string) => {
    setBusy(sha256);
    try {
      const { files } = await libraryApi.links(space.id, `${entry.collection}/${entry.slug}`, slot);
      const file = files.find(f => f.sha256 === sha256);
      if (!file) throw new Error('That file is not there any more');
      window.open(file.url, '_blank', 'noopener');
    } catch (problem) {
      toast.error(problem instanceof Error ? problem.message : String(problem));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {slots.map(slot => {
        const files = entry.slots[slot.key] ?? [];
        return (
          <div key={slot.key} className="flex flex-col gap-2 rounded-xl border p-4">
            <div>
              <p className="text-sm font-medium">{slot.label}</p>
              {slot.hint && <p className="text-xs text-muted-foreground">{slot.hint}</p>}
            </div>
            {!files.length && <p className="text-sm text-muted-foreground">None yet</p>}
            {files.map(file => (
              <div key={file.sha256} className="flex items-center gap-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(file.size)} · added {dayText(file.addedAt)}
                    {file.madeFrom && ` · made from ${collection.slots.find(s => (entry.slots[s.key] ?? []).some(f => f.sha256 === file.madeFrom?.sha256))?.label.toLowerCase() ?? 'an earlier file'}`}
                  </p>
                </div>
                <button type="button" className={button} disabled={busy === file.sha256} onClick={() => download(slot.key, file.sha256)}>
                  {busy === file.sha256 ? <Loader2Icon className="size-3.5 animate-spin" /> : <DownloadIcon className="size-3.5" />}
                  Download
                </button>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function History({ entry, fields }: { entry: EntryRecord; fields: FieldView[] }) {
  const label = (what: string) => (what.startsWith('file:') ? `File, ${what.slice(5)}` : (fields.find(field => field.key === what)?.label ?? what));
  const short = (value: unknown) => {
    // a file is named with the start of its SHA-256, which only a machine reads
    const text = (typeof value === 'string' ? value : JSON.stringify(value)).replace(/ \([0-9a-f]{12}\)$/, '');
    return text.length > 80 ? `${text.slice(0, 80)}…` : text;
  };
  return (
    <ul className="flex flex-col divide-y rounded-xl border">
      {[...entry.history].reverse().map((line, index) => (
        <li key={`${line.at}-${index}`} className="flex flex-col gap-1 px-4 py-3 text-sm">
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{dayText(line.at)}</span>
            {line.by}
            {line.agent && (
              <span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5">
                <BotIcon className="size-3" />
                by AI
              </span>
            )}
          </p>
          {line.changes.map((change, i) => (
            <p key={i} className="min-w-0 break-words">
              <span className="font-medium">{label(change.what)}</span>
              {change.from !== undefined && change.to !== undefined ? `: ${short(change.from)} → ${short(change.to)}` : change.to !== undefined ? `: ${short(change.to)}` : ': removed'}
            </p>
          ))}
        </li>
      ))}
    </ul>
  );
}

export function EntryView({ space, collection, answer, onChanged, onTrashed }: { space: SpaceView; collection: CollectionView; answer: EntryAnswer; onChanged: (warnings: string[]) => void; onTrashed: () => void }) {
  const { entry, statistics } = answer;
  const [editing, setEditing] = React.useState(false);
  const [trashing, setTrashing] = React.useState(false);
  const groups = [...new Set(collection.fields.map(field => field.group))];
  const may = canChange(space);
  const fileCount = Object.values(entry.slots).reduce((sum, files) => sum + files.length, 0);

  const trash = async () => {
    try {
      await libraryApi.trash(space.id, `${entry.collection}/${entry.slug}`);
      toast.success(`${entry.title} is in the trash`);
      onTrashed();
    } catch (problem) {
      toast.error(problem instanceof Error ? problem.message : String(problem));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-2xl font-semibold tracking-tight">{entry.title}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            Changed {dayText(entry.updatedAt)}
            {entry.agent && (
              <span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5">
                <BotIcon className="size-3" />
                Added by AI
              </span>
            )}
          </p>
        </div>
        {may && (
          <div className="flex shrink-0 gap-2">
            <button type="button" className={button} onClick={() => setEditing(true)}>
              <PencilIcon className="size-3.5" />
              Change
            </button>
            <button type="button" className={button} onClick={() => setTrashing(true)}>
              <Trash2Icon className="size-3.5" />
              Move to trash
            </button>
          </div>
        )}
      </div>

      <Tabs defaultValue={groups[0] ?? 'files'}>
        <TabsList>
          {groups.map(group => (
            <TabsTrigger key={group} value={group}>
              {group}
            </TabsTrigger>
          ))}
          <TabsTrigger value="files">Files ({fileCount})</TabsTrigger>
          {statistics.length > 0 && <TabsTrigger value="numbers">Numbers</TabsTrigger>}
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {groups.map(group => (
          <TabsContent key={group} value={group} className="flex flex-col gap-4 pt-2">
            {collection.fields
              .filter(field => field.group === group)
              .map(field => (
                <div key={field.key} className="flex flex-col gap-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{field.label}</p>
                  <Value field={field} value={entry.fields[field.key]} />
                </div>
              ))}
            {group === groups[0] && Object.keys(entry.extra).length > 0 && (
              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Other details</p>
                <ul className="flex flex-col gap-1 text-sm">
                  {Object.entries(entry.extra).map(([name, value]) => (
                    <li key={name} className="flex gap-2">
                      <span className="w-36 shrink-0 text-muted-foreground">{name}</span>
                      <span className="min-w-0 break-words">{typeof value === 'string' ? value : JSON.stringify(value)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>
        ))}

        <TabsContent value="files" className="pt-2">
          <Files space={space} collection={collection} entry={entry} />
        </TabsContent>

        {statistics.length > 0 && (
          <TabsContent value="numbers" className="pt-2">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {statistics.map(row => (
                <div key={row.platform} className="rounded-xl border p-4">
                  <p className="text-sm font-medium">{row.platform}</p>
                  <p className="text-xs text-muted-foreground">On {dayText(row.day)}</p>
                  <ul className="mt-2 flex flex-col gap-1 text-sm">
                    {Object.entries(row.numbers).map(([name, count]) => (
                      <li key={name} className="flex justify-between gap-2">
                        <span className="text-muted-foreground">{name}</span>
                        <span className="tabular-nums">{count.toLocaleString('en-US')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </TabsContent>
        )}

        <TabsContent value="history" className="pt-2">
          <History entry={entry} fields={collection.fields} />
        </TabsContent>
      </Tabs>

      <EntryDialog space={space} collection={collection} entry={entry} open={editing} onOpenChange={setEditing} onSaved={(_ref, warnings) => onChanged(warnings)} />

      <AlertDialog open={trashing} onOpenChange={setTrashing}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move {entry.title} to the trash?</AlertDialogTitle>
            <AlertDialogDescription>
              It leaves the {collection.name} collection of the {space.name} space for everyone on it. Its files are not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={trash}>Move to trash</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
