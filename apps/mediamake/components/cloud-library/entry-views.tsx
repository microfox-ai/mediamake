'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowDownIcon, ArrowUpIcon, BotIcon, CheckIcon, FolderIcon, LayoutGridIcon, ListIcon, SheetIcon, FoldersIcon } from 'lucide-react';
import { cellText, dayText, foldersOf, sheetColumns, sortRows, type CollectionView, type EntryRow, type LibraryView, type SheetColumn } from '@/lib/cloud-library/view';

/**
 * A collection's entries, four ways. Each view does its own thing:
 * - grid: a card per entry, with its tags and a chip per file slot;
 * - list: one compact line per entry, for reading down a long collection;
 * - sheet: a table with a column per short field and per slot, sorted by the column that is clicked;
 * - folders: entries grouped by one field (use, artist, genre), a folder opening to its entries.
 */

const card = 'flex flex-col gap-2 rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/50';

const VIEW_BUTTONS: { view: LibraryView; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { view: 'grid', label: 'Grid', icon: LayoutGridIcon },
  { view: 'list', label: 'List', icon: ListIcon },
  { view: 'sheet', label: 'Sheet', icon: SheetIcon },
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
    <Link href={href} className={card}>
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-semibold">{row.title}</p>
        {row.agent && <BotIcon className="size-4 shrink-0 text-muted-foreground" aria-label="Added by AI" />}
      </div>
      {showCollection && collection && <p className="text-xs text-muted-foreground">{collection.name}</p>}
      {line && <p className="truncate text-xs text-muted-foreground">{line}</p>}
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

function Sheet({ rows, collection, hrefOf }: ViewProps & { collection: CollectionView }) {
  const columns = React.useMemo(() => sheetColumns(collection), [collection]);
  const [sort, setSort] = React.useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const column = sort ? columns.find(c => c.key === sort.key) : undefined;
  const sorted = column && sort ? sortRows(rows, column, sort.direction, collection.titleField) : rows;
  const click = (c: SheetColumn) => setSort(current => (current?.key !== c.key ? { key: c.key, direction: 'asc' } : current.direction === 'asc' ? { key: c.key, direction: 'desc' } : null));
  return (
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
                return (
                  <td key={c.key} className="max-w-56 truncate whitespace-nowrap border-r px-3 py-2 last:border-r-0" title={text}>
                    {text || <span className="text-muted-foreground/40">–</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Folders({ rows, field, folder, folderHref, ...rest }: ViewProps & { field: string; folder: string | null; folderHref: (name: string) => string }) {
  const folders = React.useMemo(() => foldersOf(rows, field), [rows, field]);
  if (folder !== null) return <Grid rows={folders.find(f => f.name === folder)?.rows ?? []} {...rest} />;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {folders.map(f => (
        <Link key={f.name} href={folderHref(f.name)} className={card}>
          <FolderIcon className="size-6 text-muted-foreground" />
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
  ...props
}: ViewProps & { view: LibraryView; collection: CollectionView | undefined; folderField: string | null; folder: string | null; folderHref: (name: string) => string }) {
  // a search of the whole space has no one template: it is always cards
  if (!collection || view === 'grid') return <Grid {...props} />;
  if (view === 'list') return <List {...props} />;
  if (view === 'sheet') return <Sheet {...props} collection={collection} />;
  if (!folderField) return <Grid {...props} />;
  return <Folders {...props} field={folderField} folder={folder} folderHref={folderHref} />;
}
