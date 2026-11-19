'use client';

import * as React from 'react';
import { CheckIcon, ClipboardIcon, Loader2Icon, SparklesIcon, UploadIcon, XIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { EntryRecord, FieldValue } from '@/lib/cloud-library';
import { MAX_FILL_READ_BYTES, addPrompt, applyFill, changedFields, formatBytes, listOf, placeFiles, readsAsText, type CollectionView, type SpaceView } from '@/lib/cloud-library/view';
import { libraryApi, uploadFiles } from './api';
import { FieldInput } from './field-input';

/**
 * Add an entry to a collection, or change one: its files first (dropped files go to the slot their
 * type and name say, and each can be moved), then its fields under the template's headings. Nothing
 * is required but the title. Only what changed is sent.
 *
 * When files are dropped, Claude reads their names and the small text files among them and fills
 * the fields that are still empty. What it filled is marked and can be undone; nothing is saved
 * until the person saves.
 */

const button = 'inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50';
const primary = 'inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50';

interface Added {
  file: File;
  slot: string;
}

export function EntryDialog({
  space,
  collection,
  entry,
  open,
  onOpenChange,
  onSaved,
}: {
  space: SpaceView;
  collection: CollectionView;
  /** The entry to change. None: a new one. */
  entry?: EntryRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (ref: string, warnings: string[]) => void;
}) {
  const [values, setValues] = React.useState<Record<string, unknown>>({});
  const [added, setAdded] = React.useState<Added[]>([]);
  const [removed, setRemoved] = React.useState<{ slot: string; sha256: string }[]>([]);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [over, setOver] = React.useState(false);
  const picker = React.useRef<HTMLInputElement>(null);
  const [copied, setCopied] = React.useState(false);
  // what Claude filled from the dropped files: the fields, what they held before, and what it said
  const [fill, setFill] = React.useState<{ keys: string[]; before: Record<string, unknown>; notes?: string; unread: string[] } | null>(null);
  const [filling, setFilling] = React.useState(false);
  const fillOff = React.useRef(false);
  const fillRun = React.useRef(0);
  const valuesNow = React.useRef(values);
  valuesNow.current = values;

  // a fresh form each time the dialog opens
  React.useEffect(() => {
    if (!open) return;
    setValues({ ...(entry?.fields ?? {}) });
    setAdded([]);
    setRemoved([]);
    setBusy(null);
    setError(null);
    setFill(null);
    setFilling(false);
    fillRun.current += 1;
  }, [open, entry]);

  const groups = [...new Set(collection.fields.map(field => field.group))];
  const titleField = collection.fields.find(field => field.key === collection.titleField) ?? collection.fields[0];
  const kept = (slot: string) => (entry?.slots[slot] ?? []).filter(file => !removed.some(gone => gone.slot === slot && gone.sha256 === file.sha256));
  const slotLabel = (key: string) => collection.slots.find(slot => slot.key === key)?.label ?? 'Other files';

  const addFiles = (list: FileList | File[]) => {
    const files = [...list];
    if (!files.length) return;
    // a single slot that already holds a file, here or in this drop, is not filled again by a guess
    const filled = new Set([...collection.slots.filter(slot => !slot.many && kept(slot.key).length).map(slot => slot.key), ...added.filter(a => collection.slots.some(slot => slot.key === a.slot && !slot.many)).map(a => a.slot)]);
    const slots = placeFiles(files, collection.slots, filled);
    const all = [...added, ...files.map((file, index) => ({ file, slot: slots[index] }))];
    setAdded(all);
    void fillFrom(all);
  };

  // Claude reads the files' names and the small text files, and fills what is still empty
  const fillFrom = async (files: Added[]) => {
    if (fillOff.current) return;
    const run = ++fillRun.current;
    setFilling(true);
    try {
      const tooLarge: string[] = [];
      const sent = await Promise.all(
        files.map(async ({ file, slot }) => {
          if (!readsAsText(file)) return { name: file.name, slot };
          if (file.size > MAX_FILL_READ_BYTES) return tooLarge.push(file.name), { name: file.name, slot };
          return { name: file.name, slot, text: await file.text() };
        }),
      );
      const answer = await libraryApi.fill({ space: space.id, collection: collection.slug, files: sent, have: valuesNow.current });
      if (run !== fillRun.current) return;
      if (answer.off) {
        fillOff.current = true;
        return;
      }
      const applied = applyFill(collection.fields, valuesNow.current, answer.fields ?? {});
      const unread = [...tooLarge, ...(answer.unread ?? [])];
      if (!applied.filled.length && !answer.notes && !unread.length) return;
      setFill(current => ({
        keys: [...new Set([...(current?.keys ?? []), ...applied.filled])],
        before: { ...Object.fromEntries(applied.filled.map(key => [key, valuesNow.current[key]])), ...current?.before },
        notes: answer.notes,
        unread,
      }));
      setValues(applied.values);
    } catch {
      // filling is a help, never a step: the form works without it
    } finally {
      if (run === fillRun.current) setFilling(false);
    }
  };

  const undoFill = () => {
    if (!fill) return;
    setValues(current => ({ ...current, ...Object.fromEntries(fill.keys.map(key => [key, fill.before[key]])) }));
    setFill(null);
  };
  const labelOf = (key: string) => collection.fields.find(field => field.key === key)?.label ?? key;

  // the same add, done by Claude from a computer: the prompt names this space and collection
  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(addPrompt(space, collection, String(values[titleField.key] ?? '')));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy: your browser did not allow it');
    }
  };

  const save = async () => {
    setError(null);
    const fields = changedFields(collection.fields, (entry?.fields ?? {}) as Record<string, FieldValue>, values);
    if (!entry && !String(values[titleField.key] ?? '').trim()) {
      setError(`Give the ${collection.noun} its ${titleField.label.toLowerCase()} first`);
      return;
    }
    if (entry && !Object.keys(fields).length && !added.length && !removed.length) {
      onOpenChange(false);
      return;
    }
    try {
      setBusy('Starting');
      const shas = added.length ? await uploadFiles(space.id, added.map(a => a.file), setBusy, collection.slug) : [];
      setBusy('Saving');
      const saved = await libraryApi.save({
        space: space.id,
        collection: collection.slug,
        ...(entry && { slug: entry.slug, rev: entry.rev }),
        fields,
        files: added.map((a, index) => ({ slot: a.slot, sha256: shas[index], name: a.file.name })),
        removeFiles: removed,
      });
      onSaved(saved.ref, saved.warnings ?? []);
      onOpenChange(false);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : String(problem));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={next => !busy && onOpenChange(next)}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-4 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{entry ? `Change ${entry.title}` : `Add a ${collection.noun}`}</DialogTitle>
          <DialogDescription>
            {entry ? `In the ${collection.name} collection of the ${space.name} space.` : `It goes in the ${collection.name} collection of the ${space.name} space. Only the ${titleField.label.toLowerCase()} is needed.`}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="files" className="min-h-0 flex-1">
          <TabsList>
            <TabsTrigger value="files">Files</TabsTrigger>
            {groups.map(group => (
              <TabsTrigger key={group} value={group}>
                {group}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="files" className="flex max-h-[55vh] flex-col gap-4 overflow-y-auto pr-1">
            {!entry && (
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                {titleField.label}
                <FieldInput field={titleField} value={values[titleField.key]} onChange={value => setValues(current => ({ ...current, [titleField.key]: value }))} learned={collection.learned} />
              </label>
            )}
            <button
              type="button"
              onClick={() => picker.current?.click()}
              onDragOver={event => {
                event.preventDefault();
                setOver(true);
              }}
              onDragLeave={() => setOver(false)}
              onDrop={event => {
                event.preventDefault();
                setOver(false);
                addFiles(event.dataTransfer.files);
              }}
              className={`flex flex-col items-center gap-1 rounded-xl border border-dashed px-4 py-6 text-sm ${over ? 'border-primary bg-muted' : 'hover:bg-muted/50'}`}
            >
              <UploadIcon className="size-5 text-muted-foreground" />
              <span className="font-medium">Drop files here, or choose them</span>
              <span className="text-xs text-muted-foreground">{collection.slots.map(slot => slot.label).join(', ')}</span>
            </button>
            <input ref={picker} type="file" multiple hidden onChange={event => (addFiles(event.target.files ?? []), (event.target.value = ''))} />

            {added.length > 0 && (
              <ul className="flex flex-col gap-2">
                {added.map((item, index) => (
                  <li key={`${item.file.name}-${index}`} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate" title={item.file.name}>
                      {item.file.name}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(item.file.size)}</span>
                    <Select value={item.slot} onValueChange={slot => setAdded(current => current.map((a, i) => (i === index ? { ...a, slot } : a)))}>
                      <SelectTrigger className="h-8 w-44" aria-label="Where it goes">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {collection.slots.map(slot => (
                          <SelectItem key={slot.key} value={slot.key}>
                            {slot.label}
                          </SelectItem>
                        ))}
                        <SelectItem value="other">Other files</SelectItem>
                      </SelectContent>
                    </Select>
                    <button type="button" aria-label={`Leave out ${item.file.name}`} className="rounded-md p-1 text-muted-foreground hover:bg-muted" onClick={() => setAdded(current => current.filter((_, i) => i !== index))}>
                      <XIcon className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {(filling || fill) && (
              <div className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm" role="status">
                {filling ? <Loader2Icon className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground" /> : <SparklesIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
                <div className="min-w-0 flex-1">
                  {filling && !fill && <p>Claude is reading the files…</p>}
                  {fill && fill.keys.length > 0 && (
                    <p>
                      Claude filled {listOf(fill.keys.map(labelOf))}. Check {fill.keys.length === 1 ? 'it' : 'them'} before you save.
                    </p>
                  )}
                  {fill && !fill.keys.length && !filling && <p>Claude found nothing to fill in these files.</p>}
                  {fill?.notes && <p className="text-xs text-muted-foreground">{fill.notes}</p>}
                  {fill && fill.unread.length > 0 && <p className="text-xs text-muted-foreground">Too large to read: {listOf(fill.unread)}.</p>}
                </div>
                {fill && fill.keys.length > 0 && (
                  <button type="button" className="shrink-0 rounded-md border bg-background px-2 py-1 text-xs font-medium hover:bg-muted" onClick={undoFill}>
                    Undo
                  </button>
                )}
              </div>
            )}
            {added.some(a => collection.slots.some(slot => slot.key === a.slot && !slot.many && kept(slot.key).length)) && (
              <p className="text-xs text-muted-foreground">A {collection.noun} has one of each of these. The new file takes the place of the one there, which stays in its history.</p>
            )}

            {entry && Object.keys(entry.slots).length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Already there</p>
                <ul className="flex flex-col gap-2">
                  {Object.keys(entry.slots).flatMap(slot =>
                    kept(slot).map(file => (
                      <li key={`${slot}-${file.sha256}`} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                        <span className="w-32 shrink-0 text-xs text-muted-foreground">{slotLabel(slot)}</span>
                        <span className="min-w-0 flex-1 truncate" title={file.name}>
                          {file.name}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                        <button type="button" className="rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted" onClick={() => setRemoved(current => [...current, { slot, sha256: file.sha256 }])}>
                          Remove
                        </button>
                      </li>
                    )),
                  )}
                </ul>
              </div>
            )}
          </TabsContent>

          {groups.map(group => (
            <TabsContent key={group} value={group} className="flex max-h-[55vh] flex-col gap-5 overflow-y-auto pr-1">
              {collection.fields
                .filter(field => field.group === group)
                .map(field => (
                  <div key={field.key} className="flex flex-col gap-1.5">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      {field.label}
                      {fill?.keys.includes(field.key) && (
                        <span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground">
                          <SparklesIcon className="size-3" />
                          Filled by Claude
                        </span>
                      )}
                    </p>
                    {field.hint && <p className="text-xs text-muted-foreground">{field.hint}</p>}
                    <FieldInput field={field} value={values[field.key]} onChange={value => setValues(current => ({ ...current, [field.key]: value }))} learned={collection.learned} />
                  </div>
                ))}
            </TabsContent>
          ))}
        </Tabs>

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {!entry && (
              <button type="button" className={`${button} shrink-0`} disabled={!!busy} onClick={copyPrompt} title={`Give it to Claude on a computer, and it adds the ${collection.noun} for you`}>
                {copied ? <CheckIcon className="size-4" /> : <ClipboardIcon className="size-4" />}
                {copied ? 'Copied' : 'Copy prompt to add'}
              </button>
            )}
            <p className={`min-w-0 text-xs ${error ? 'text-destructive' : 'text-muted-foreground'}`} role={error ? 'alert' : undefined}>
              {error ?? busy ?? ''}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button type="button" className={button} disabled={!!busy} onClick={() => onOpenChange(false)}>
              Cancel
            </button>
            <button type="button" className={primary} disabled={!!busy} onClick={save}>
              {busy && <Loader2Icon className="size-4 animate-spin" />}
              {entry ? 'Save changes' : `Add the ${collection.noun}`}
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
