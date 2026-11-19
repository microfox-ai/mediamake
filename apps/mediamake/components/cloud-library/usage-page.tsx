'use client';

import * as React from 'react';
import { Loader2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { AppPage } from '@/components/app-shell/app-page';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Prices } from '@/lib/cloud-library';
import { dollars, formatBytes, type UsageAll, type UsageRow } from '@/lib/cloud-library/view';

/**
 * /app/library-usage, for admins: who used the Cloud Library, from where, in which space and
 * collection, what is stored, and what it is estimated to cost. The prices behind the estimate are
 * set here: they are an admin's figures, not read from a bill.
 */

const PRICE_LABELS: Record<keyof Prices, string> = {
  storagePerGbMonth: 'Storage, per GB a month',
  downloadPerGb: 'Downloads, per GB',
  searchPer1000: 'Searches, per 1,000',
  fillPerMillionTokensIn: 'AI fill, per million tokens in',
  fillPerMillionTokensOut: 'AI fill, per million tokens out',
};

function UsageTable({ rows, first, nameOf }: { rows: UsageRow[]; first: string; nameOf?: (name: string) => string }) {
  if (!rows.length) return <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">Nothing in this period.</p>;
  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{first}</TableHead>
            <TableHead className="text-right">Uploaded</TableHead>
            <TableHead className="text-right">Downloaded</TableHead>
            <TableHead className="text-right">Searches</TableHead>
            <TableHead className="text-right">Saves</TableHead>
            <TableHead className="text-right">AI fills</TableHead>
            <TableHead className="text-right">Estimated cost</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(row => (
            <TableRow key={row.name}>
              <TableCell className="max-w-64 truncate font-medium">{nameOf ? nameOf(row.name) : row.name || 'Not said'}</TableCell>
              <TableCell className="text-right tabular-nums">{formatBytes(row.uploadedBytes)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatBytes(row.fetchedBytes)}</TableCell>
              <TableCell className="text-right tabular-nums">{row.searches}</TableCell>
              <TableCell className="text-right tabular-nums">{row.saves}</TableCell>
              <TableCell className="text-right tabular-nums">{row.fills}</TableCell>
              <TableCell className="text-right tabular-nums">{dollars(row.cost)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function LibraryUsagePage() {
  const [days, setDays] = React.useState('30');
  const [data, setData] = React.useState<UsageAll | null>(null);
  const [problem, setProblem] = React.useState<string | null>(null);
  const [prices, setPrices] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    let live = true;
    setProblem(null);
    fetch(`/api/library/usage?all=1&days=${days}`)
      .then(async res => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? `It failed (${res.status})`);
        return json as UsageAll;
      })
      .then(result => {
        if (!live) return;
        setData(result);
        setPrices(Object.fromEntries(Object.entries(result.prices).map(([key, value]) => [key, String(value)])));
      })
      .catch(error => live && setProblem(error instanceof Error ? error.message : String(error)));
    return () => {
      live = false;
    };
  }, [days, tick]);

  const savePrices = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/library/usage', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(Object.entries(prices).map(([key, value]) => [key, Number(value)]))) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? `It failed (${res.status})`);
      toast.success('The prices are saved');
      setTick(n => n + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  const spaceName = (id: string) => data?.spaceNames[id] ?? id;
  const used = data?.byPerson.reduce((sum, row) => sum + row.cost, 0) ?? 0;
  const storedBytes = data?.stored.reduce((sum, row) => sum + row.bytes, 0) ?? 0;
  const storedCost = data?.stored.reduce((sum, row) => sum + row.costPerMonth, 0) ?? 0;
  const changed = !!data && Object.entries(prices).some(([key, value]) => Number(value) !== data.prices[key as keyof Prices]);

  return (
    <AppPage title="Library Usage">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 lg:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Library Usage</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">Who used the Library and what it is estimated to cost. The estimate uses the prices you set, not a bill.</p>
          </div>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-40" aria-label="Period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {problem && (
          <p className="rounded-lg border border-destructive/40 px-3 py-2 text-sm text-destructive" role="alert">
            {problem}
          </p>
        )}
        {!data && !problem && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            Adding it up
          </p>
        )}

        {data && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ['Use in this period', dollars(used), `${data.byPerson.length} ${data.byPerson.length === 1 ? 'person' : 'people'}`],
                ['Stored now', formatBytes(storedBytes), `${data.stored.reduce((sum, row) => sum + row.files, 0)} files`],
                ['Storage, a month', dollars(storedCost), `${data.stored.length} ${data.stored.length === 1 ? 'space' : 'spaces'}`],
              ].map(([label, value, note]) => (
                <div key={label} className="rounded-xl border p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
                  <p className="text-xs text-muted-foreground">{note}</p>
                </div>
              ))}
            </div>

            <Tabs defaultValue="people">
              <TabsList>
                <TabsTrigger value="people">People</TabsTrigger>
                <TabsTrigger value="devices">Computers</TabsTrigger>
                <TabsTrigger value="spaces">Spaces</TabsTrigger>
                <TabsTrigger value="collections">Collections</TabsTrigger>
                <TabsTrigger value="stored">Stored</TabsTrigger>
                <TabsTrigger value="prices">Prices</TabsTrigger>
              </TabsList>
              <TabsContent value="people">
                <UsageTable rows={data.byPerson} first="Person" />
              </TabsContent>
              <TabsContent value="devices">
                <UsageTable rows={data.byDevice} first="Computer or session" />
              </TabsContent>
              <TabsContent value="spaces">
                <UsageTable rows={data.bySpace} first="Space" nameOf={spaceName} />
              </TabsContent>
              <TabsContent value="collections">
                <UsageTable rows={data.byCollection} first="Collection" nameOf={name => name || 'Uploads and whole-space searches'} />
              </TabsContent>
              <TabsContent value="stored">
                {data.stored.length ? (
                  <div className="rounded-xl border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Space</TableHead>
                          <TableHead className="text-right">Files</TableHead>
                          <TableHead className="text-right">Size</TableHead>
                          <TableHead className="text-right">Estimated cost a month</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.stored.map(row => (
                          <TableRow key={row.space}>
                            <TableCell className="max-w-64 truncate font-medium">{spaceName(row.space)}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.files}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatBytes(row.bytes)}</TableCell>
                            <TableCell className="text-right tabular-nums">{dollars(row.costPerMonth)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">Nothing is stored yet.</p>
                )}
              </TabsContent>
              <TabsContent value="prices" className="flex max-w-md flex-col gap-3">
                <p className="text-sm text-muted-foreground">In US dollars. They start as rough figures: set them to what you really pay.</p>
                {(Object.keys(PRICE_LABELS) as (keyof Prices)[]).map(key => (
                  <label key={key} className="flex items-center justify-between gap-3 text-sm">
                    {PRICE_LABELS[key]}
                    <Input className="w-28 text-right" type="number" min="0" step="0.001" value={prices[key] ?? ''} onChange={event => setPrices(current => ({ ...current, [key]: event.target.value }))} />
                  </label>
                ))}
                <button type="button" className="inline-flex w-fit items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50" disabled={!changed || saving} onClick={savePrices}>
                  {saving && <Loader2Icon className="size-4 animate-spin" />}
                  Save the prices
                </button>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AppPage>
  );
}
