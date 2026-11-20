'use client';

import * as React from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowDownIcon, ArrowUpIcon, BotIcon, CheckIcon, ChevronDownIcon, ChevronUpIcon, Columns3Icon, FolderIcon, FoldersIcon, LayoutGridIcon, ListIcon, RotateCcwIcon, Table2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cellEditor, cellText, clockOf, columnChoices, dayText, foldersOf, sortRows, type CollectionView, type EntryRow, type LibraryView, type SheetColumn } from '@/lib/cloud-library/view';
import { libraryApi } from './api';
import { FieldInput } from './field-input';

/**
 * A collection's entries, four ways. Each view does its own thing:
 * - grid (id 'sheet', the default): a table with the columns the space chose, sorted by the column
 *   that is clicked; a double-click edits a cell (a short field in place, a long or nested one in a dialog);
 * - cards (id 'grid'): a card per entry with one of its pictures, its tags and a chip per file slot;
 * - list: one compact line per entry, for reading down a long collection;
 * - folders: entries grouped by one field (use, artist, genre), each folder showing its entries' pictures.
 */

const card = 'flex flex-col gap-2 rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/50';

const VIEW_BUTTONS: { view: LibraryView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { view: 'sheet', label: 'Grid', icon: Table2Icon },
  { view: 'grid', label: 'Cards', icon: LayoutGridIcon },
  { view: 'list', label: 'List', icon: ListIcon },
  { view: 'folders', label: 'Folders', icon: FoldersIcon },
];

export function ViewSwitch({ view, onChange }: { view: LibraryView; onChange: (view: LibraryView) => void }) {
  return (
    <div role="group" aria-label="View" className="inline-flex h-8 items-center rounded-md border bg-background p-0.5">
      {VIEW_BUTTONS.map(({ view: name, label, icon: Icon }) => (
        <button key={name} type="button" title={label} aria-label={label} aria-pressed={view === name} onClick={() => onChange(name)} className={`inline-flex h-full items-center rounded px-2 ${view === name ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  );
}

function SlotChips({ row, collection }: { row: EntryRow; collection: CollectionView | undefined }) {
  return (
    <>
      {(collection?.slots ?? []).map(slot => (
        <span key={slot.key} className={`rounded-md border px-1.5 py-0.5 text-[11px] ${row.has[slot.key] ? '' : 'border-dashed text-muted-foreground/60'}`} title={row.has[slot.key] ? `Has its ${slot.label.toLowerCase()}` : `No ${slot.label.toLowerCase()} yet`}>
          {slot.label}
          {slot.many && row.has[slot.key] ? ` ${row.has[slot.key]}` : ''}
        </span>
      ))}
    </>
  );
}

const shortLine = (row: EntryRow, collection: CollectionView | undefined) =>
  (collection?.fields ?? [])
    .filter(field => field.key !== collection?.titleField && field.kind !== 'tags' && typeof row.facts[field.key] === 'string')
    .slice(0, 3)
    .map(field => row.facts[field.key])
    .join(' · ');

const tagsOf = (row: EntryRow, collection: CollectionView | undefined) => (collection?.fields ?? []).filter(field => field.kind === 'tags').flatMap(field => (Array.isArray(row.facts[field.key]) ? (row.facts[field.key] as string[]) : []));

export function EntryCard({ row, collection, href, showCollection }: { row: EntryRow; collection: CollectionView | undefined; href: string; showCollection?: boolean }) {
  const line = shortLine(row, collection);
  const tags = tagsOf(row, collection).slice(0, 4);
  return (
    <Link href={href} className={`${card} overflow-hidden`}>
      {row.picture && (
        // one of the entry's own pictures, picked by its id: a glance at what it is
        // eslint-disable-next-line @next/next/no-img-element
        <img src={row.picture} alt="" loading="lazy" className="-mx-4 -mt-4 mb-1 aspect-video w-[calc(100%+2rem)] max-w-none object-cover" />
      )}
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-semibold">{row.title}</p>
        {row.agent && <BotIcon className="size-4 shrink-0 text-muted-foreground" aria-label="Added by AI" />}
      </div>
      {showCollection && collection && <p className="text-xs text-muted-foreground">{collection.name}</p>}
      {line && <p className="truncate text-xs text-muted-foreground">{line}</p>}
      {row.found && (
        <p className="line-clamp-2 border-l-2 pl-2 text-xs italic text-muted-foreground">
          {row.found.from !== undefined && <span className="not-italic tabular-nums">{clockOf(row.found.from)} </span>}
          {row.found.text}
        </p>
      )}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map(tag => (
            <span key={tag} className="rounded-md border bg-muted px-1.5 py-0.5 text-[11px]">
              {tag}
            </span>
          ))}
        </div>
      )}
      <div className="mt-auto flex flex-wrap gap-1 pt-1">
        <SlotChips row={row} collection={collection} />
      </div>
    </Link>
  );
}

function Grid({ rows, collectionOf, hrefOf, showCollection }: ViewProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map(row => (
        <EntryCard key={row.ref} row={row} collection={collectionOf(row)} href={hrefOf(row)} showCollection={showCollection} />
      ))}
    </div>
  );
}

function List({ rows, collectionOf, hrefOf }: ViewProps) {
  return (
    <ul className="flex flex-col divide-y rounded-xl border">
      {rows.map(row => {
        const collection = collectionOf(row);
        return (
          <li key={row.ref}>
            <Link href={hrefOf(row)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/50">
              <span className="w-56 shrink-0 truncate font-medium">{row.title}</span>
              <span className="hidden min-w-0 flex-1 truncate text-xs text-muted-foreground md:block">{shortLine(row, collection)}</span>
              <span className="hidden shrink-0 flex-wrap justify-end gap-1 lg:flex">
                <SlotChips row={row} collection={collection} />
              </span>
              {row.agent && <BotIcon className="size-4 shrink-0 text-muted-foreground" aria-label="Added by AI" />}
              <span className="ml-auto w-24 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{dayText(row.updatedAt)}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------- the grid ---------- */

/** What the grid may change: a cell's value in this space, and the columns (for everyone in it, or only here). */
export interface GridEdit {
  /** The space the collection is seen through (a shared one's is the space it is opened to). */
  spaceId: string;
  /** Saved: the list is read again. */
  onSaved: () => void;
}
export interface GridColumns {
  columns: SheetColumn[];
  onChange: (keys: string[]) => void;
  /** Whether the choice is kept for everyone in the space, or only on this page. */
  saved: boolean;
}

/** The column picker: every field, slot and the day, ticked when shown, moved up and down; the title stays first. */
function ColumnPicker({ collection, grid }: { collection: CollectionView; grid: GridColumns }) {
  const choices = React.useMemo(() => columnChoices(collection), [collection]);
  const shown = grid.columns.map(c => c.key);
  const keys = shown.filter(key => key !== collection.titleField);
  const set = (next: string[]) => grid.onChange(next);
  const toggle = (key: string) => set(keys.includes(key) ? keys.filter(k => k !== key) : [...keys, key]);
  const move = (key: string, by: -1 | 1) => {
    const at = keys.indexOf(key);
    const to = at + by;
    if (at < 0 || to < 0 || to >= keys.length) return;
    const next = [...keys];
    [next[at], next[to]] = [next[to], next[at]];
    set(next);
  };
  const ordered = [...keys.map(key => choices.find(c => c.key === key)!).filter(Boolean), ...choices.filter(c => c.key !== collection.titleField && !keys.includes(c.key))];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          <Columns3Icon className="size-4" />
          Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="border-b px-3 py-2">
          <p className="text-sm font-medium">Columns</p>
          <p className="text-xs text-muted-foreground">{grid.saved ? 'Saved for everyone in this space.' : 'Only on this page: the space’s owner or an editor saves them for everyone.'}</p>
        </div>
        <ul className="max-h-80 overflow-y-auto py-1">
          <li className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground">
            <Checkbox checked disabled aria-label="Always shown" />
            <span className="flex-1 truncate">{choices.find(c => c.key === collection.titleField)?.label ?? 'Title'}</span>
            <span className="text-[11px]">always first</span>
          </li>
          {ordered.map(c => {
            const on = keys.includes(c.key);
            return (
              <li key={c.key} className="flex items-center gap-2 px-3 py-1 text-sm">
                <Checkbox id={`col-${c.key}`} checked={on} onCheckedChange={() => toggle(c.key)} />
                <label htmlFor={`col-${c.key}`} className="flex-1 cursor-pointer truncate">
                  {c.label}
                  <span className="ml-1 text-[11px] text-muted-foreground">{c.kind === 'slot' ? 'file' : c.kind === 'date' ? 'day' : c.field}</span>
                </label>
                {on && (
                  <span className="flex">
                    <button type="button" aria-label={`Move ${c.label} left`} className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => move(c.key, -1)}>
                      <ChevronUpIcon className="size-3.5" />
                    </button>
                    <button type="button" aria-label={`Move ${c.label} right`} className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => move(c.key, 1)}>
                      <ChevronDownIcon className="size-3.5" />
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        <div className="border-t p-2">
          <Button variant="ghost" size="sm" className="h-7 w-full gap-1.5 text-xs" onClick={() => set([])}>
            <RotateCcwIcon className="size-3.5" />
            Back to the template’s columns
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** A long or nested field edited in a dialog, with the same editor the entry's form uses; it reads the entry first for its full value. */
function CellDialog({ row, column, collection, edit, onClose }: { row: EntryRow; column: SheetColumn; collection: CollectionView; edit: GridEdit; onClose: () => void }) {
  const field = collection.fields.find(f => f.key === column.key);
  const [value, setValue] = React.useState<unknown>(undefined);
  const [rev, setRev] = React.useState<number | null>(null);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    let live = true;
    libraryApi
      .entry(edit.spaceId, row.ref)
      .then(answer => {
        if (!live) return;
        setValue(answer.entry.fields[column.key] ?? (answer.entry as { extra?: Record<string, unknown> }).extra?.[column.key]);
        setRev(answer.entry.rev);
      })
      .catch(error => toast.error(error instanceof Error ? error.message : String(error)));
    return () => {
      live = false;
    };
  }, [edit.spaceId, row.ref, column.key]);
  const save = async () => {
    setBusy(true);
    try {
      const [collectionSlug, slug] = row.ref.split('/');
      const saved = await libraryApi.save({ space: edit.spaceId, collection: collectionSlug, slug, rev: rev ?? row.rev, fields: { [column.key]: value ?? null } });
      saved.warnings.forEach(w => toast.warning(w));
      edit.onSaved();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{column.label}</DialogTitle>
          <DialogDescription>{row.title}</DialogDescription>
        </DialogHeader>
        {!field || rev === null ? <p className="text-sm text-muted-foreground">Opening it</p> : <FieldInput field={field} value={value} onChange={setValue} learned={collection.learned} />}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy || rev === null}>
            {busy ? 'Saving' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const rawFact = (row: EntryRow, key: string) => {
  const value = row.facts[key];
  return Array.isArray(value) ? value.join(', ') : (value ?? '');
};

function Sheet({ rows, collection, hrefOf, grid, edit }: ViewProps & { collection: CollectionView; grid: GridColumns; edit?: GridEdit }) {
  const { columns } = grid;
  const [sort, setSort] = React.useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [editing, setEditing] = React.useState<{ ref: string; key: string; draft: string } | null>(null);
  const [dialog, setDialog] = React.useState<{ row: EntryRow; column: SheetColumn } | null>(null);
  const column = sort ? columns.find(c => c.key === sort.key) : undefined;
  const sorted = column && sort ? sortRows(rows, column, sort.direction, collection.titleField) : rows;
  const click = (c: SheetColumn) => setSort(current => (current?.key !== c.key ? { key: c.key, direction: 'asc' } : current.direction === 'asc' ? { key: c.key, direction: 'desc' } : null));

  const open = (row: EntryRow, c: SheetColumn) => {
    if (!edit) return;
    const how = cellEditor(c);
    if (how === 'dialog') setDialog({ row, column: c });
    else if (how) setEditing({ ref: row.ref, key: c.key, draft: rawFact(row, c.key) });
  };
  const commit = async (row: EntryRow, c: SheetColumn, draft: string) => {
    setEditing(null);
    if (!edit || draft.trim() === rawFact(row, c.key)) return;
    const text = draft.trim();
    const value = !text ? null : c.field === 'number' ? Number(text) : text;
    if (typeof value === 'number' && !Number.isFinite(value)) return void toast.error(`${c.label} is a number`);
    try {
      const [collectionSlug, slug] = row.ref.split('/');
      const saved = await libraryApi.save({ space: edit.spaceId, collection: collectionSlug, slug, rev: row.rev, fields: { [c.key]: value } });
      saved.warnings.forEach(w => toast.warning(w));
      edit.onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };

  const cellBody = (row: EntryRow, c: SheetColumn, text: string) => {
    const here = editing?.ref === row.ref && editing.key === c.key;
    if (here && cellEditor(c) === 'choice') {
      const options = collection.fields.find(f => f.key === c.key)?.options ?? [];
      return (
        <select autoFocus className="w-full rounded border bg-background px-1 py-0.5 text-sm" value={editing.draft} onChange={event => commit(row, c, event.target.value)} onBlur={() => setEditing(null)}>
          <option value="">–</option>
          {options.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }
    if (here)
      return (
        <input
          autoFocus
          type={c.field === 'date' ? 'date' : c.field === 'number' ? 'number' : 'text'}
          className="w-full min-w-24 rounded border bg-background px-1 py-0.5 text-sm"
          value={editing.draft}
          onChange={event => setEditing({ ...editing, draft: event.target.value })}
          onKeyDown={event => {
            if (event.key === 'Enter') commit(row, c, editing.draft);
            if (event.key === 'Escape') setEditing(null);
          }}
          onBlur={() => commit(row, c, editing.draft)}
        />
      );
    return text || <span className="text-muted-foreground/40">–</span>;
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-end gap-2">
        {edit && <p className="text-xs text-muted-foreground">Double-click a cell to change it.</p>}
        <ColumnPicker collection={collection} grid={grid} />
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              {columns.map((c, index) => (
                <th key={c.key} scope="col" aria-sort={sort?.key === c.key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined} className={`whitespace-nowrap border-r px-3 py-2 font-medium last:border-r-0 ${index === 0 ? 'sticky left-0 z-10 bg-muted' : ''} ${c.kind === 'slot' ? 'text-center' : ''}`}>
                  <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => click(c)}>
                    {c.label}
                    {sort?.key === c.key && (sort.direction === 'asc' ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" />)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(row => (
              <tr key={row.ref} className="border-b last:border-b-0 hover:bg-muted/30">
                {columns.map((c, index) => {
                  const text = cellText(row, c, collection.titleField);
                  if (index === 0)
                    return (
                      <th key={c.key} scope="row" className="sticky left-0 z-10 max-w-64 truncate whitespace-nowrap border-r bg-background px-3 py-2 text-left font-medium">
                        <Link href={hrefOf(row)} className="hover:underline">
                          {text || row.title}
                        </Link>
                      </th>
                    );
                  if (c.kind === 'slot')
                    return (
                      <td key={c.key} className="border-r px-3 py-2 text-center text-xs tabular-nums last:border-r-0">
                        {text ? Number(text) > 1 ? text : <CheckIcon className="mx-auto size-4" aria-label="Has it" /> : <span className="text-muted-foreground/40">–</span>}
                      </td>
                    );
                  const editable = !!edit && !!cellEditor(c);
                  return (
                    <td key={c.key} className={`max-w-72 truncate whitespace-nowrap border-r px-3 py-2 last:border-r-0 ${editable ? 'cursor-cell' : ''}`} title={editable ? `${text ? `${text}\n` : ''}Double-click to change it` : text} onDoubleClick={() => open(row, c)}>
                      {cellBody(row, c, text)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {dialog && edit && <CellDialog row={dialog.row} column={dialog.column} collection={collection} edit={edit} onClose={() => setDialog(null)} />}
    </div>
  );
}

/** A folder's face: up to four of its entries' pictures, as a picture folder shows them; none: the folder icon. */
function FolderFace({ rows }: { rows: EntryRow[] }) {
  const pictures = rows.map(row => row.picture).filter((url): url is string => !!url).slice(0, 4);
  if (!pictures.length) return <FolderIcon className="size-6 text-muted-foreground" />;
  return (
    <div className={`-mx-4 -mt-4 mb-1 grid aspect-video w-[calc(100%+2rem)] gap-0.5 overflow-hidden ${pictures.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} ${pictures.length > 2 ? 'grid-rows-2' : ''}`}>
      {pictures.map((url, index) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={url} src={url} alt="" loading="lazy" className={`h-full w-full object-cover ${pictures.length === 3 && index === 0 ? 'row-span-2' : ''}`} />
      ))}
    </div>
  );
}

function Folders({ rows, field, folder, folderHref, ...rest }: ViewProps & { field: string; folder: string | null; folderHref: (name: string) => string }) {
  const folders = React.useMemo(() => foldersOf(rows, field), [rows, field]);
  if (folder !== null) return <Grid rows={folders.find(f => f.name === folder)?.rows ?? []} {...rest} />;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {folders.map(f => (
        <Link key={f.name} href={folderHref(f.name)} className={`${card} overflow-hidden`}>
          <FolderFace rows={f.rows} />
          <p className="truncate text-sm font-semibold">{f.name}</p>
          <p className="text-3xl font-semibold tabular-nums leading-none">{f.rows.length}</p>
        </Link>
      ))}
    </div>
  );
}

interface ViewProps {
  rows: EntryRow[];
  collectionOf: (row: EntryRow) => CollectionView | undefined;
  hrefOf: (row: EntryRow) => string;
  showCollection?: boolean;
}

export function EntryViews({
  view,
  collection,
  folderField,
  folder,
  folderHref,
  grid,
  edit,
  ...props
}: ViewProps & { view: LibraryView; collection: CollectionView | undefined; folderField: string | null; folder: string | null; folderHref: (name: string) => string; grid?: GridColumns; edit?: GridEdit }) {
  // a search of the whole space has no one template: it is always cards
  if (!collection || view === 'grid') return <Grid {...props} />;
  if (view === 'list') return <List {...props} />;
  if (view === 'sheet' && grid) return <Sheet {...props} collection={collection} grid={grid} edit={edit} />;
  if (!folderField) return <Grid {...props} />;
  return <Folders {...props} field={folderField} folder={folder} folderHref={folderHref} />;
}
