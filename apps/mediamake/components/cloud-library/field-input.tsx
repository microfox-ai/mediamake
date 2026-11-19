'use client';

import * as React from 'react';
import { PlusIcon, XIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { FieldView } from '@/lib/cloud-library/view';

/**
 * One field of an entry's form, by its kind. A field whose list learns offers the spellings the
 * collection already uses (a platform added once shows up for the next song).
 */

type Row = Record<string, string | number | undefined>;

const NONE = '__none__';
const small = 'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted';

function Suggest({ id, options }: { id: string; options: string[] }) {
  return options.length ? (
    <datalist id={id}>
      {options.map(option => (
        <option key={option} value={option} />
      ))}
    </datalist>
  ) : null;
}

/** Rows of a few short boxes each (a store link, a playlist, a part of the song). */
function Rows({
  value,
  onChange,
  columns,
  add,
  listId,
  options,
}: {
  value: Row[];
  onChange: (rows: Row[]) => void;
  columns: { key: string; label: string; width: string; number?: boolean; suggest?: boolean; type?: string }[];
  add: string;
  listId: string;
  options: string[];
}) {
  const set = (index: number, key: string, next: string, number?: boolean) =>
    onChange(value.map((row, i) => (i === index ? { ...row, [key]: number ? (next === '' ? undefined : Number(next)) : next } : row)));
  return (
    <div className="flex flex-col gap-2">
      <Suggest id={listId} options={options} />
      {value.map((row, index) => (
        <div key={index} className="flex flex-wrap items-center gap-2">
          {columns.map(column => (
            <Input
              key={column.key}
              aria-label={column.label}
              placeholder={column.label}
              className={column.width}
              type={column.type ?? (column.number ? 'number' : 'text')}
              list={column.suggest ? listId : undefined}
              value={row[column.key] ?? ''}
              onChange={event => set(index, column.key, event.target.value, column.number)}
            />
          ))}
          <button type="button" aria-label="Remove this row" className="rounded-md p-1 text-muted-foreground hover:bg-muted" onClick={() => onChange(value.filter((_, i) => i !== index))}>
            <XIcon className="size-4" />
          </button>
        </div>
      ))}
      <button type="button" className={`${small} w-fit`} onClick={() => onChange([...value, {}])}>
        <PlusIcon className="size-3.5" />
        {add}
      </button>
    </div>
  );
}

/** Tags as chips: type one and press Enter, or pick one the collection already uses. */
function Tags({ value, onChange, listId, options }: { value: string[]; onChange: (tags: string[]) => void; listId: string; options: string[] }) {
  const [draft, setDraft] = React.useState('');
  const add = (tag: string) => {
    const clean = tag.trim();
    if (clean && !value.some(v => v.toLowerCase() === clean.toLowerCase())) onChange([...value, clean]);
    setDraft('');
  };
  const unused = options.filter(option => !value.some(v => v.toLowerCase() === option.toLowerCase())).slice(0, 8);
  return (
    <div className="flex flex-col gap-2">
      <Suggest id={listId} options={options} />
      <div className="flex flex-wrap items-center gap-1.5">
        {value.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-0.5 text-xs">
            {tag}
            <button type="button" aria-label={`Remove ${tag}`} onClick={() => onChange(value.filter(v => v !== tag))}>
              <XIcon className="size-3" />
            </button>
          </span>
        ))}
        <Input
          className="h-8 w-40"
          placeholder="Add one"
          list={listId}
          value={draft}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault();
              add(draft);
            }
          }}
          onBlur={() => add(draft)}
        />
      </div>
      {unused.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {unused.map(option => (
            <button key={option} type="button" className={small} onClick={() => add(option)}>
              <PlusIcon className="size-3" />
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Loose details as name and value pairs (what a DistroKid pack holds). The keys the template knows
 * (a DistroKid link, a UPC) get a box each, by their labels; any other is a row, which counts once it
 * has a name. A value put in from outside (a dropped pack, Claude's fill, Undo) shows at once.
 */
function Details({ field, value, onChange, listId }: { field: FieldView; value: unknown; onChange: (value: unknown) => void; listId: string }) {
  const known = field.keys ?? [];
  const group = (value && typeof value === 'object' && !Array.isArray(value) ? value : {}) as Record<string, string | string[]>;
  const text = (v: string | string[] | undefined) => (Array.isArray(v) ? v.join(', ') : (v ?? ''));
  const rowsOf = (from: Record<string, string | string[]>): Row[] => Object.entries(from).filter(([name]) => !known.some(k => k.key === name)).map(([name, v]) => ({ name, value: text(v) }));
  const [rows, setRows] = React.useState<Row[]>(() => rowsOf(group));
  const sent = React.useRef(JSON.stringify(group));
  const now = JSON.stringify(group);
  // only a value changed from outside resets the rows: what this box sent itself is known
  React.useEffect(() => {
    if (now === sent.current) return;
    sent.current = now;
    setRows(rowsOf(JSON.parse(now)));
  }, [now]);
  const send = (knownValues: Record<string, string | string[]>, next: Row[]) => {
    const out = { ...knownValues, ...Object.fromEntries(next.filter(row => String(row.name ?? '').trim()).map(row => [String(row.name).trim(), String(row.value ?? '')])) };
    sent.current = JSON.stringify(out);
    onChange(out);
  };
  const knownValues = Object.fromEntries(known.filter(k => group[k.key] !== undefined).map(k => [k.key, group[k.key]]));
  return (
    <div className="flex flex-col gap-3">
      {known.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {known.map(k => (
            <label key={k.key} className="flex flex-col gap-1 text-xs text-muted-foreground" title={k.hint}>
              {k.label}
              <Input
                className="text-sm text-foreground"
                type={k.kind === 'link' ? 'url' : 'text'}
                placeholder={k.kind === 'date' ? '2026-11-20' : k.kind === 'link' ? 'https://' : undefined}
                value={text(group[k.key])}
                onChange={event => send({ ...knownValues, [k.key]: event.target.value }, rows)}
              />
            </label>
          ))}
        </div>
      )}
      <Rows
        value={rows}
        onChange={next => {
          setRows(next);
          send(knownValues, next);
        }}
        add="Add a detail"
        listId={listId}
        options={[]}
        columns={[
          { key: 'name', label: 'Detail', width: 'w-44' },
          { key: 'value', label: 'Value', width: 'min-w-0 flex-1' },
        ]}
      />
    </div>
  );
}

export function FieldInput({ field, value, onChange, learned }: { field: FieldView; value: unknown; onChange: (value: unknown) => void; learned: Record<string, string[]> }) {
  const options = field.learns ? (learned[field.learns] ?? []) : [];
  const listId = `library-${field.key}-options`;
  const rows = Array.isArray(value) ? (value as Row[]) : [];

  if (field.kind === 'longtext') return <Textarea rows={10} value={typeof value === 'string' ? value : ''} onChange={event => onChange(event.target.value)} />;
  if (field.kind === 'choice')
    return (
      <Select value={typeof value === 'string' && value ? value : NONE} onValueChange={next => onChange(next === NONE ? '' : next)}>
        <SelectTrigger className="w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Not set</SelectItem>
          {(field.options ?? []).map(option => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  if (field.kind === 'tags') return <Tags value={Array.isArray(value) ? (value as string[]) : []} onChange={onChange} listId={listId} options={options} />;
  if (field.kind === 'links')
    return (
      <Rows
        value={rows}
        onChange={onChange}
        add="Add a link"
        listId={listId}
        options={options}
        columns={[
          { key: 'platform', label: 'Platform', width: 'w-40', suggest: true },
          { key: 'url', label: 'Link', width: 'min-w-0 flex-1', type: 'url' },
        ]}
      />
    );
  if (field.kind === 'playlists')
    return (
      <Rows
        value={rows}
        onChange={onChange}
        add="Add a playlist"
        listId={listId}
        options={options}
        columns={[
          { key: 'platform', label: 'Platform', width: 'w-36', suggest: true },
          { key: 'name', label: 'Playlist name', width: 'w-44' },
          { key: 'url', label: 'Link', width: 'min-w-0 flex-1', type: 'url' },
          { key: 'added', label: 'Added on', width: 'w-40', type: 'date' },
        ]}
      />
    );
  if (field.kind === 'parts')
    return (
      <Rows
        value={rows}
        onChange={onChange}
        add="Add a part"
        listId={listId}
        options={[]}
        columns={[
          { key: 'name', label: 'Part', width: 'w-28' },
          { key: 'start', label: 'Start (s)', width: 'w-24', number: true },
          { key: 'end', label: 'End (s)', width: 'w-24', number: true },
          { key: 'energy', label: 'Energy', width: 'w-28' },
          { key: 'what', label: 'What happens', width: 'min-w-0 flex-1' },
        ]}
      />
    );
  if (field.kind === 'group') return <Details field={field} value={value} onChange={onChange} listId={listId} />;
  return (
    <>
      <Suggest id={listId} options={options} />
      <Input
        className={field.kind === 'date' || field.kind === 'number' ? 'w-56' : undefined}
        type={field.kind === 'date' ? 'date' : field.kind === 'number' ? 'number' : 'text'}
        list={options.length ? listId : undefined}
        value={typeof value === 'string' || typeof value === 'number' ? value : ''}
        onChange={event => onChange(field.kind === 'number' && event.target.value !== '' ? Number(event.target.value) : event.target.value)}
      />
    </>
  );
}
