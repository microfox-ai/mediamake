'use client';

import * as React from 'react';
import Link from 'next/link';
import { ChevronRightIcon, CloudIcon, CopyIcon, Loader2Icon, MonitorIcon, SearchIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { uploadPrompt, type DeviceFile, type DeviceView } from '@/lib/cloud-library/devices';
import { clock, dayText, formatBytes, libraryHref, type SpaceView } from '@/lib/cloud-library/view';
import { libraryApi } from './api';

/**
 * The Library's "Computers" side: what each computer holds, from the cards it reported
 * (`mm library report`). With no computer open they are cards; one opens to its files, each marked
 * as on that computer only or also in this space's Cloud Library. Nothing moves from this page:
 * a file goes up from its own computer, so the page hands over the words to ask Claude with.
 */

const ANY = '__any__';
const button = 'inline-flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50';
const card = 'flex flex-col gap-2 rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/50';
const PAGE = 60;

export const computersHref = (space: string, device?: string | null) => `/app/library?${new URLSearchParams({ space, on: 'computers', ...(device && { d: device }) })}`;

async function copy(text: string, done: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(done);
  } catch {
    toast.error('Could not copy it');
  }
}

function TurnOn() {
  const line = 'mm library report on';
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center">
      <p className="text-sm font-medium">No computer reports here yet</p>
      <p className="max-w-md text-sm text-muted-foreground">
        A computer shows what its media library holds once its owner turns that on. It sends a card for each file (name, kind, size), never the file and never its folder.
      </p>
      <button type="button" className={button} onClick={() => copy(line, 'Copied. Run it on the computer.')}>
        <CopyIcon className="size-4" />
        <code className="text-xs">{line}</code>
      </button>
    </div>
  );
}

function DeviceCards({ space, devices }: { space: SpaceView; devices: DeviceView[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {devices.map(device => (
        <Link key={device.id} href={computersHref(space.id, device.id)} className={card}>
          <span className="flex items-center gap-2 text-sm font-semibold">
            <MonitorIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{device.name}</span>
            <span className="shrink-0 rounded-full border px-2 py-0.5 text-xs font-normal text-muted-foreground">{device.mine ? 'Yours' : device.owner}</span>
          </span>
          <span className="text-3xl font-semibold tabular-nums">{device.files.toLocaleString('en-US')}</span>
          <span className="text-xs text-muted-foreground">
            {device.files === 1 ? 'file' : 'files'} · {formatBytes(device.bytes)}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CloudIcon className="size-3.5" />
            {device.linked.toLocaleString('en-US')} also in this space&apos;s cloud
          </span>
          <span className="text-xs text-muted-foreground">Reported {dayText(device.reportedAt)}</span>
        </Link>
      ))}
    </div>
  );
}

function Files({ space, device }: { space: SpaceView; device: DeviceView }) {
  const [typed, setTyped] = React.useState('');
  const [q, setQ] = React.useState('');
  const [kind, setKind] = React.useState('');
  const [where, setWhere] = React.useState('');
  const [limit, setLimit] = React.useState(PAGE);
  const [rows, setRows] = React.useState<{ total: number; results: DeviceFile[] } | null>(null);
  React.useEffect(() => {
    const timer = setTimeout(() => setQ(typed), 250);
    return () => clearTimeout(timer);
  }, [typed]);
  React.useEffect(() => setLimit(PAGE), [q, kind, where]);
  React.useEffect(() => {
    let live = true;
    libraryApi
      .deviceFiles(space.id, device.id, { q, kind, where, limit })
      .then(result => live && setRows(result))
      .catch(error => live && toast.error(error instanceof Error ? error.message : String(error)));
    return () => {
      live = false;
    };
  }, [space.id, device.id, q, kind, where, limit]);
  const kinds = Object.entries(device.kinds).sort((a, b) => b[1] - a[1]);
  const filtered = !!q.trim() || !!kind || !!where;

  return (
    <>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder={`Search ${device.name}`} value={typed} onChange={event => setTyped(event.target.value)} aria-label="Search" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <nav aria-label="Where you are" className="flex min-w-0 items-center gap-1 text-sm">
          <Link href={computersHref(space.id)} className="text-muted-foreground hover:text-foreground">
            Computers
          </Link>
          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate font-medium">{device.name}</span>
          <span className="ml-2 shrink-0 text-xs text-muted-foreground">
            {device.mine ? 'Yours' : `${device.owner}'s`} · reported {dayText(device.reportedAt)}
          </span>
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={kind || ANY} onValueChange={value => setKind(value === ANY ? '' : value)}>
            <SelectTrigger className="h-8 w-40 text-sm" aria-label="Kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Every kind</SelectItem>
              {kinds.map(([name, count]) => (
                <SelectItem key={name} value={name}>
                  {name} ({count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={where || ANY} onValueChange={value => setWhere(value === ANY ? '' : value)}>
            <SelectTrigger className="h-8 w-52 text-sm" aria-label="Where the file is">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Anywhere</SelectItem>
              <SelectItem value="device">On this computer only</SelectItem>
              <SelectItem value="both">Also in the cloud</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!rows && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          Reading its files
        </p>
      )}
      {rows && rows.results.length > 0 && (
        <ul className="divide-y rounded-xl border bg-card">
          {rows.results.map(file => (
            <li key={file.sha256} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5">
              <div className="min-w-0 flex-1 basis-64">
                <p className="truncate text-sm font-medium">{file.title ?? file.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[file.title ? file.name : null, file.kind, file.subject, formatBytes(file.bytes), file.duration ? clock(file.duration) : null, file.cold ? 'on a disk that is not plugged in' : null].filter(Boolean).join(' · ')}
                </p>
              </div>
              {file.cloud ? (
                <Link href={libraryHref({ space: space.id, collection: file.cloud.ref.split('/')[0], entry: file.cloud.ref.split('/')[1] })} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs hover:bg-muted">
                  <CloudIcon className="size-3.5" />
                  Also in the cloud: {file.cloud.title}
                </Link>
              ) : (
                <>
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
                    <MonitorIcon className="size-3.5" />
                    On this computer only
                  </span>
                  <button
                    type="button"
                    className={`${button} shrink-0 whitespace-nowrap`}
                    onClick={() => copy(uploadPrompt({ file, device, space: space.name, personal: space.personal }), device.mine ? 'Copied. Paste it to Claude on that computer.' : 'Copied. Paste it to Claude.')}
                  >
                    <CopyIcon className="size-4" />
                    {device.mine ? 'Copy prompt to upload' : 'Copy prompt to ask for it'}
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {rows && rows.total > rows.results.length && (
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground">
            Showing {rows.results.length} of {rows.total.toLocaleString('en-US')}.
          </p>
          <button type="button" className={button} onClick={() => setLimit(n => Math.min(200, n + PAGE))} disabled={limit >= 200}>
            Show more
          </button>
        </div>
      )}
      {rows && !rows.results.length && (
        <div className="rounded-xl border border-dashed px-6 py-12 text-center">
          <p className="text-sm font-medium">{filtered ? 'Nothing matches' : 'This computer reported no files'}</p>
          <p className="mt-1 text-sm text-muted-foreground">{filtered ? 'Try fewer words, or clear a filter.' : 'Its media library is empty, or it has not been scanned yet.'}</p>
        </div>
      )}
    </>
  );
}

export function DeviceLibrary({ space, deviceId }: { space: SpaceView; deviceId: string | null }) {
  const [devices, setDevices] = React.useState<DeviceView[] | null>(null);
  const [problem, setProblem] = React.useState<string | null>(null);
  React.useEffect(() => {
    let live = true;
    setDevices(null);
    setProblem(null);
    libraryApi
      .devices(space.id)
      .then(result => live && setDevices(result.devices))
      .catch(error => live && setProblem(error instanceof Error ? error.message : String(error)));
    return () => {
      live = false;
    };
  }, [space.id]);
  const device = deviceId ? devices?.find(item => item.id === deviceId) : undefined;

  if (problem)
    return (
      <p className="rounded-lg border border-destructive/40 px-3 py-2 text-sm text-destructive" role="alert">
        {problem}
      </p>
    );
  if (!devices)
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        Looking for computers
      </p>
    );
  if (!devices.length) return <TurnOn />;
  if (device) return <Files space={space} device={device} />;
  return (
    <>
      {deviceId && <p className="text-sm text-muted-foreground">That computer is not here: its owner may have closed it to this project.</p>}
      <p className="text-sm text-muted-foreground">
        {space.personal ? 'Your computers that report what they hold.' : `Your computers, and the ones their owners opened to the ${space.name} project.`} A file stays on its computer until someone adds it to the cloud.
      </p>
      <DeviceCards space={space} devices={devices} />
    </>
  );
}
