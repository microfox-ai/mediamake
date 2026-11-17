'use client';

import * as React from 'react';
import { CheckIcon, CloudIcon, Loader2Icon, MonitorIcon, TriangleAlertIcon } from 'lucide-react';
import { CopyLine } from './copy-line';
import type { AccessView, PlaceView } from '@/lib/space/register';

const list = (names: string[]) => (names.length <= 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);
const cap = (text: string) => text.replace(/^./, c => c.toUpperCase());
const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const STATUS: Record<PlaceView['status'], { label: string; className: string }> = {
  open: { label: 'Open to this project', className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  busy: { label: 'Busy', className: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  closed: { label: 'Closed to this project', className: 'text-muted-foreground' },
};

/** One place: what it is, whether this project's runs may use it, and what it can do. Its owner opens and closes it here. */
function PlaceCard({ place, busyWith, onAsk }: { place: PlaceView; busyWith: string | null; onAsk: (action: 'open' | 'close' | 'busy' | 'free') => void }) {
  const Icon = place.kind === 'cloud' ? CloudIcon : MonitorIcon;
  const waiting = busyWith === place.id;
  const button = 'inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50';
  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <h3 className="min-w-0 truncate text-sm font-semibold">{place.name}</h3>
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS[place.status].className}`}>{place.kind === 'cloud' && place.status === 'open' ? 'Runs for this project' : STATUS[place.status].label}</span>
      </div>
      <p className="-mt-1 text-xs text-muted-foreground">
        {place.kind === 'cloud' ? 'Cloud environment' : place.mine ? 'Your computer' : `${place.owner}'s computer`} · reported {day(place.reportedAt)}
      </p>
      {place.can.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {place.can.map(c => (
            <li key={c.need} title={c.need} className="rounded-md border bg-muted/40 px-2 py-0.5 text-xs">
              {cap(c.label.replace(/^the /, ''))}
              {c.limit && <span className="text-muted-foreground"> · {c.limit}</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">It hasn&apos;t said what it can do yet.</p>
      )}
      {place.mine && place.kind === 'device' && (
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          {place.status === 'closed' ? (
            <button type="button" className={button} disabled={waiting} onClick={() => onAsk('open')}>
              {waiting && <Loader2Icon className="size-3.5 animate-spin" aria-hidden />} Open to this project
            </button>
          ) : (
            <>
              <button type="button" className={button} disabled={waiting} onClick={() => onAsk(place.status === 'busy' ? 'free' : 'busy')}>
                {waiting && <Loader2Icon className="size-3.5 animate-spin" aria-hidden />} {place.status === 'busy' ? 'Mark free' : 'Mark busy'}
              </button>
              <button type="button" className={button} disabled={waiting} onClick={() => onAsk('close')}>
                Close to this project
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}

/**
 * Where this project's steps can run: its cloud environments, the computers open to it and the
 * viewer's own, a card each, and over them what its skills need with the place that has each
 * (lib/space/register). A computer is closed until its owner opens it here or with `mm access open`.
 */
export function PlacesTab({ projectId }: { projectId: string }) {
  const [view, setView] = React.useState<AccessView | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busyWith, setBusyWith] = React.useState<string | null>(null);
  const url = `/api/space/places?project=${encodeURIComponent(projectId)}`;

  const load = React.useCallback(async () => {
    const res = await fetch(url);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? `Could not load (${res.status})`);
    setView(json as AccessView);
  }, [url]);
  React.useEffect(() => {
    load().catch(e => setError(e.message));
  }, [load]);

  const ask = async (place: PlaceView, action: 'open' | 'close' | 'busy' | 'free') => {
    setBusyWith(place.id);
    setError(null);
    try {
      const res = await fetch('/api/space/places', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, place: place.id, project: projectId }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `Could not change it (${res.status})`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not change it');
    } finally {
      setBusyWith(null);
    }
  };

  if (!view) return error ? <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">{error}</p> : <Loader2Icon className="size-4 animate-spin text-muted-foreground" aria-label="Loading" />;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        Where this project&apos;s steps can run: a cloud environment, or a computer its owner opened to the project. A computer stays closed until its owner opens it, and they can close it or mark it busy at any time.
      </p>
      {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs">{error}</p>}

      {(view.needs.length > 0 || view.unknown.length > 0) && (
        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">What the skills need</h2>
          <ul className="mt-2 divide-y text-xs">
            {view.needs.map(need => (
              <li key={need.need} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                {need.places.length ? <CheckIcon className="size-3.5 shrink-0 text-emerald-600" aria-hidden /> : <TriangleAlertIcon className="size-3.5 shrink-0 text-amber-600" aria-hidden />}
                <span className="font-medium">{cap(need.need === 'render' ? 'a place that renders' : need.label.replace(/^the /, ''))}</span>
                <span className="text-muted-foreground">{list(need.usedBy)}</span>
                <span className="ml-auto text-right">{need.places.length ? list(need.places) : <span className="text-amber-700 dark:text-amber-300">{need.device ? 'No open computer has it yet' : 'No place has it yet'}</span>}</span>
              </li>
            ))}
          </ul>
          {view.unknown.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {list(view.unknown)} {view.unknown.length === 1 ? "doesn't" : "don't"} say what {view.unknown.length === 1 ? 'it needs' : 'they need'} yet (no run sheet).
            </p>
          )}
        </section>
      )}

      {view.places.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {view.places.map(place => (
            <PlaceCard key={place.id} place={place} busyWith={busyWith} onAsk={action => ask(place, action)} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">No place yet. Add a computer with the line below, or run a cloud session that has this space&apos;s repository.</p>
      )}

      <section className="rounded-xl border bg-muted/30 p-4">
        <h2 className="text-sm font-semibold">Add a computer</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Run this on the computer, or give it to Claude there. It lists what the computer can do (key names only, never a key) and adds it here, closed, for its owner to open. A cloud environment adds itself when a session runs{' '}
          <span className="rounded bg-background px-1 py-0.5 font-mono text-[11px]">mm cloud</span>.
        </p>
        <div className="mt-3">
          <CopyLine line="mm access" label="the access line" />
        </div>
        {view.admins.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Keys and environments are looked after by {list(view.admins)}, who {view.admins.length === 1 ? 'owns' : 'own'} the project.</p>}
      </section>
    </div>
  );
}
