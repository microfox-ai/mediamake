'use client';

import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Person } from './model';

/**
 * Type a client id, or pick someone who holds an API key. Calls onPick with
 * the client id and clears itself when it succeeds.
 */
export function PersonPicker({
  people,
  exclude = [],
  action,
  placeholder = 'Client id or name',
  onPick,
}: {
  people: Person[];
  exclude?: string[];
  action: string;
  placeholder?: string;
  onPick: (clientId: string) => Promise<boolean | void>;
}) {
  const listId = useId();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const options = people.filter(p => !exclude.includes(p.clientId));

  const submit = async () => {
    const typed = value.trim();
    if (!typed) return;
    const match = people.find(p => p.clientId === typed || p.name.toLowerCase() === typed.toLowerCase());
    setBusy(true);
    const ok = await onPick(match?.clientId ?? typed);
    setBusy(false);
    if (ok !== false) setValue('');
  };

  return (
    <form
      className="flex gap-2"
      onSubmit={e => {
        e.preventDefault();
        submit();
      }}
    >
      <Input list={listId} value={value} onChange={e => setValue(e.target.value)} placeholder={placeholder} className="h-9" />
      <datalist id={listId}>
        {options.map(p => (
          <option key={p.clientId} value={p.clientId}>
            {p.name}
          </option>
        ))}
      </datalist>
      <Button type="submit" size="sm" className="h-9" disabled={busy || !value.trim()}>
        {action}
      </Button>
    </form>
  );
}
