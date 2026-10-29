'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { AppWindow, Bot, Globe, LogOut, MonitorSmartphone, Puzzle } from 'lucide-react';
import type { SignedInDevice } from '@/lib/auth/devices';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const TOAST_MS = 3000;
const ALL_USERS = '__all__';

interface DevicesResponse {
  clientId: string;
  isAdmin: boolean;
  devices: SignedInDevice[];
}

type Confirm =
  | { kind: 'one'; device: SignedInDevice }
  | { kind: 'all'; clientId: string; keepCurrent: boolean; count: number }
  | null;

async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || json.message || `Request failed (${res.status})`);
  return json as T;
}

export function DevicesManager() {
  const router = useRouter();
  const [data, setData] = useState<DevicesResponse | null>(null);
  // Kept apart from data, which is cleared while switching between Mine and Everyone.
  const [admin, setAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [everyone, setEveryone] = useState(false);
  const [user, setUser] = useState(ALL_USERS);
  const [confirm, setConfirm] = useState<Confirm>(null);
  // Keeps the dialog's text while it animates closed.
  const shownConfirm = useRef<Confirm>(null);
  if (confirm) shownConfirm.current = confirm;

  const load = useCallback(async () => {
    try {
      const res = await call<DevicesResponse>('GET', everyone ? '/api/devices?all=1' : '/api/devices');
      setData(res);
      setAdmin(res.isAdmin);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [everyone]);

  useEffect(() => {
    load();
  }, [load]);

  const users = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of data?.devices ?? []) counts.set(d.clientId, (counts.get(d.clientId) ?? 0) + 1);
    return [...counts].sort(([a], [b]) => a.localeCompare(b));
  }, [data]);

  const devices = useMemo(() => {
    const all = data?.devices ?? [];
    return everyone && user !== ALL_USERS ? all.filter(d => d.clientId === user) : all;
  }, [data, everyone, user]);

  const others = devices.filter(d => !d.current).length;

  const onConfirm = async () => {
    if (!confirm) return;
    setConfirm(null);
    const signsMeOut =
      confirm.kind === 'one'
        ? !!confirm.device.current
        : !confirm.keepCurrent && confirm.clientId === data?.clientId && devices.some(d => d.current);
    try {
      const { revoked } = await call<{ revoked: number }>(
        'DELETE',
        '/api/devices',
        confirm.kind === 'one'
          ? { id: confirm.device.id }
          : { all: true, clientId: confirm.clientId, keepCurrent: confirm.keepCurrent },
      );
      if (signsMeOut) {
        router.push('/login');
        router.refresh();
        return;
      }
      toast.success(revoked === 1 ? 'Signed out 1 device' : `Signed out ${revoked} devices`, { duration: TOAST_MS });
      await load();
    } catch (e) {
      toast.error((e as Error).message, { duration: TOAST_MS * 2 });
    }
  };

  if (error) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-10">
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-sm">
          <p className="font-medium">Couldn&apos;t load your devices</p>
          <p className="mt-1 text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={load}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Signed-in devices</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {everyone
              ? 'Everywhere anyone is signed in to this MediaMake. Pick a user to sign them out everywhere.'
              : 'Everywhere your account is signed in: this website, the Browse Hack extension (once per Chrome profile), Claude and other apps. Revoke any you don’t recognise or no longer use; it’s signed out right away.'}
          </p>
        </div>
        {admin && (
          <Tabs
            value={everyone ? 'everyone' : 'mine'}
            onValueChange={v => {
              setData(null);
              setUser(ALL_USERS);
              setEveryone(v === 'everyone');
            }}
          >
            <TabsList>
              <TabsTrigger value="mine">Mine</TabsTrigger>
              <TabsTrigger value="everyone">Everyone</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        {everyone ? (
          <Select value={user} onValueChange={setUser}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="All users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_USERS}>All users ({data?.devices.length ?? 0})</SelectItem>
              {users.map(([id, count]) => (
                <SelectItem key={id} value={id}>
                  <span className="font-mono">{id}</span>
                  <span className="text-muted-foreground">({count})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-sm text-muted-foreground">
            {data ? `${devices.length} signed in` : ' '}
          </p>
        )}
        {everyone && user !== ALL_USERS ? (
          <Button
            variant="outline"
            onClick={() => setConfirm({ kind: 'all', clientId: user, keepCurrent: false, count: devices.length })}
          >
            <LogOut className="size-4" />
            Sign {user} out everywhere
          </Button>
        ) : (
          !everyone &&
          others > 0 && (
            <Button
              variant="outline"
              onClick={() =>
                setConfirm({ kind: 'all', clientId: data!.clientId, keepCurrent: true, count: others })
              }
            >
              <LogOut className="size-4" />
              Sign out everywhere else
            </Button>
          )
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border bg-card">
        {!data ? (
          <div className="divide-y">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="size-9 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        ) : devices.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <MonitorSmartphone className="size-8 text-muted-foreground" />
            <p className="font-medium">Not signed in anywhere</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Sign-ins from the Browse Hack extension, Claude and the website show up here.
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {devices.map(device => (
              <DeviceRow
                key={device.id}
                device={device}
                showUser={everyone}
                onRevoke={() => setConfirm({ kind: 'one', device })}
              />
            ))}
          </ul>
        )}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Apps show where they last refreshed their sign-in, about once an hour while in use, and sign out after 30
        days unused. Website logins last 7 days.
      </p>

      <AlertDialog open={!!confirm} onOpenChange={open => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle(shownConfirm.current, data?.clientId)}</AlertDialogTitle>
            <AlertDialogDescription>{confirmText(shownConfirm.current, data?.clientId)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm} className="bg-destructive text-white hover:bg-destructive/90">
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function confirmTitle(confirm: Confirm, me?: string) {
  if (!confirm) return '';
  if (confirm.kind === 'one') return confirm.device.current ? 'Sign out of this browser?' : `Sign out ${confirm.device.name}?`;
  if (confirm.keepCurrent) return 'Sign out everywhere else?';
  return confirm.clientId === me ? 'Sign yourself out everywhere?' : `Sign ${confirm.clientId} out everywhere?`;
}

function confirmText(confirm: Confirm, me?: string) {
  if (!confirm) return '';
  if (confirm.kind === 'one') {
    if (confirm.device.current) return 'You’ll go to the sign-in page.';
    const whose = confirm.device.clientId === me ? '' : ` for ${confirm.device.clientId}`;
    return `It’s signed out${whose} right away and has to sign in again to use MediaMake.`;
  }
  const n = confirm.count === 1 ? '1 device' : `${confirm.count} devices`;
  if (confirm.keepCurrent) return `${n} signed out right away. You stay signed in here.`;
  return `${n} signed out right away, apps and browsers alike. Each has to sign in again.`;
}

function DeviceIcon({ device }: { device: SignedInDevice }) {
  const Icon =
    device.kind === 'website'
      ? Globe
      : /extension/i.test(device.name)
        ? Puzzle
        : /claude/i.test(device.name)
          ? Bot
          : AppWindow;
  return <Icon className="size-4" />;
}

function DeviceRow({
  device,
  showUser,
  onRevoke,
}: {
  device: SignedInDevice;
  showUser: boolean;
  onRevoke: () => void;
}) {
  const { browser, os, location, userAgent } = device.device;
  const where = [browser, os, location].filter(Boolean).join(' · ');
  const when = [
    device.createdAt && `Signed in ${format(device.createdAt, 'd MMM yyyy')}`,
    device.lastUsedAt && `active ${formatDistanceToNow(device.lastUsedAt, { addSuffix: true })}`,
    device.kind === 'website' && `signs out ${formatDistanceToNow(device.expires, { addSuffix: true })}`,
  ].filter(Boolean);

  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <DeviceIcon device={device} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-medium">{device.name}</p>
            {device.current && <Badge>This browser</Badge>}
            {showUser && (
              <Badge variant="outline" className="font-mono">
                {device.clientId}
              </Badge>
            )}
          </div>
          <p className="truncate text-sm text-muted-foreground" title={userAgent}>
            {where || (device.untracked ? 'Signed in before devices were tracked' : 'Device not recorded')}
          </p>
          {when.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {when.join(', ').replace(/^./, c => c.toUpperCase())}
            </p>
          )}
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onRevoke} className="self-start sm:self-auto">
        {device.current ? 'Sign out' : 'Revoke'}
      </Button>
    </li>
  );
}
