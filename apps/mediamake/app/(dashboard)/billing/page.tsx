"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Loader2Icon, RefreshCwIcon } from "lucide-react";

type PeriodType = "day" | "week" | "month";

interface BillingAggregate {
  _id?: string;
  clientId: string | null;
  platform: string;
  periodType: PeriodType;
  periodValue: string;
  totalCostUSD: number;
  currency: string;
  requestCount?: number;
  breakdown?: Record<string, { totalCostUSD: number; requestCount?: number }>;
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--primary))",
];

const ROLLUP_WORKER_ID = "cost-usage-rollup";
const REMOTION_WORKER_ID = "cost-usage-remotion";
const AI_USAGE_WORKER_ID = "cost-usage-ai";
const POLL_INTERVAL_MS = 1500;
const POLL_MAX_ATTEMPTS = 120; // ~3 min

function useBillingData(periodType: PeriodType, periodValue: string | null) {
  const [data, setData] = React.useState<{
    aggregates: BillingAggregate[];
    periodType: PeriodType;
    periodValue: string | null;
  } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchAggregates = React.useCallback(
    (pt: PeriodType, pv: string | null) => {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ periodType: pt });
      if (pv) params.set("periodValue", pv);
      params.set("limit", "2000");
      return fetch(`/api/billing/aggregates?${params}`)
        .then((r) => {
          if (!r.ok) throw new Error(r.statusText);
          return r.json();
        })
        .then((json) => {
          setData({
            aggregates: json.aggregates ?? [],
            periodType: json.periodType ?? pt,
            periodValue: json.periodValue ?? pv,
          });
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
        .finally(() => setLoading(false));
    },
    []
  );

  React.useEffect(() => {
    fetchAggregates(periodType, periodValue);
  }, [periodType, periodValue, fetchAggregates]);

  const refetch = React.useCallback(() => {
    return fetchAggregates(periodType, periodValue);
  }, [fetchAggregates, periodType, periodValue]);

  return { data, loading, error, refetch };
}

function deriveAnalytics(aggregates: BillingAggregate[]) {
  const global = aggregates.filter((a) => a.clientId == null || a.clientId === "");
  const byClient = aggregates.filter((a) => a.clientId != null && a.clientId !== "");

  const totalCostGlobal = global.reduce((s, a) => s + a.totalCostUSD, 0);
  const totalRequestsGlobal = global.reduce((s, a) => s + (a.requestCount ?? 0), 0);

  const byPeriod = new Map<string, { totalCostUSD: number; [platform: string]: number | string }>();
  for (const a of global) {
    let row = byPeriod.get(a.periodValue);
    if (!row) {
      row = { periodValue: a.periodValue, totalCostUSD: 0 };
      byPeriod.set(a.periodValue, row);
    }
    (row as Record<string, number>).totalCostUSD += a.totalCostUSD;
    (row as Record<string, number>)[a.platform] = ((row as Record<string, number>)[a.platform] ?? 0) + a.totalCostUSD;
  }
  const costOverTime = Array.from(byPeriod.values()).sort(
    (a, b) => String(a.periodValue).localeCompare(String(b.periodValue))
  );

  const byPlatform = new Map<string, { totalCostUSD: number; requestCount: number }>();
  for (const a of global) {
    const cur = byPlatform.get(a.platform) ?? { totalCostUSD: 0, requestCount: 0 };
    cur.totalCostUSD += a.totalCostUSD;
    cur.requestCount += a.requestCount ?? 0;
    byPlatform.set(a.platform, cur);
  }
  const platformBreakdown = Array.from(byPlatform.entries()).map(([name, v]) => ({
    name,
    totalCostUSD: Math.round(v.totalCostUSD * 10000) / 10000,
    requestCount: v.requestCount,
  }));

  const clientTotals = new Map<string, { totalCostUSD: number; requestCount: number }>();
  for (const a of byClient) {
    const id = a.clientId ?? "";
    const cur = clientTotals.get(id) ?? { totalCostUSD: 0, requestCount: 0 };
    cur.totalCostUSD += a.totalCostUSD;
    cur.requestCount += a.requestCount ?? 0;
    clientTotals.set(id, cur);
  }
  const byClientChart = Array.from(clientTotals.entries()).map(([clientId, v]) => ({
    clientId: clientId.slice(0, 12) + (clientId.length > 12 ? "…" : ""),
    fullId: clientId,
    totalCostUSD: Math.round(v.totalCostUSD * 10000) / 10000,
    requestCount: v.requestCount,
  })).sort((a, b) => b.totalCostUSD - a.totalCostUSD);

  const sourceBreakdown = new Map<string, number>();
  for (const a of aggregates) {
    if (!a.breakdown) continue;
    for (const [source, v] of Object.entries(a.breakdown)) {
      sourceBreakdown.set(source, (sourceBreakdown.get(source) ?? 0) + (v.totalCostUSD ?? 0));
    }
  }
  const bySource = Array.from(sourceBreakdown.entries())
    .map(([name, totalCostUSD]) => ({ name, totalCostUSD: Math.round(totalCostUSD * 10000) / 10000 }))
    .sort((a, b) => b.totalCostUSD - a.totalCostUSD)
    .slice(0, 12);

  return {
    totalCostGlobal,
    totalRequestsGlobal,
    costOverTime,
    platformBreakdown,
    byClientChart,
    bySource,
    aggregates,
    global,
    byClient,
  };
}

type RunRollupStatus = "idle" | "triggering" | "polling" | "completed" | "failed";

export default function BillingPage() {
  const [periodType, setPeriodType] = React.useState<PeriodType>("month");
  const [periodValue, setPeriodValue] = React.useState<string | null>(null);
  const { data, loading, error, refetch } = useBillingData(periodType, periodValue);
  const analytics = data ? deriveAnalytics(data.aggregates) : null;

  const [runRollupStatus, setRunRollupStatus] = React.useState<RunRollupStatus>("idle");
  const [runRollupMessage, setRunRollupMessage] = React.useState<string | null>(null);

  const runRollupWorker = React.useCallback(async () => {
    setRunRollupStatus("triggering");
    setRunRollupMessage(null);
    try {
      const triggerRes = await fetch(`/api/workflows/workers/${ROLLUP_WORKER_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: {}, await: false }),
      });
      if (!triggerRes.ok) {
        const errBody = await triggerRes.text();
        throw new Error(errBody || triggerRes.statusText);
      }
      const triggerJson = await triggerRes.json();
      const jobId = triggerJson.jobId;
      if (!jobId) {
        throw new Error("No jobId returned from worker");
      }
      // Fire-and-forget: also run remotion and AI cost workers so all cost data is refreshed
      fetch(`/api/workflows/workers/${REMOTION_WORKER_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: {}, await: false }),
      }).catch(() => {});
      fetch(`/api/workflows/workers/${AI_USAGE_WORKER_ID}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: {}, await: false }),
      }).catch(() => {});
      setRunRollupStatus("polling");
      for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        const statusRes = await fetch(`/api/workflows/workers/${ROLLUP_WORKER_ID}/${jobId}`);
        if (!statusRes.ok) {
          setRunRollupMessage(`Status check failed: ${statusRes.statusText}`);
          setRunRollupStatus("failed");
          return;
        }
        const statusJson = await statusRes.json();
        const status = statusJson.status;
        if (status === "completed") {
          const out = statusJson.output;
          const msg =
            out != null && typeof out === "object"
              ? `Processed ${out.documentsRead ?? "?"} docs, ${out.aggregatesUpserted ?? "?"} aggregates updated`
              : "Rollup completed.";
          setRunRollupMessage(msg);
          setRunRollupStatus("completed");
          await refetch();
          setTimeout(() => {
            setRunRollupStatus("idle");
            setRunRollupMessage(null);
          }, 4000);
          return;
        }
        if (status === "failed") {
          setRunRollupMessage(statusJson.error?.message ?? statusJson.error ?? "Worker failed");
          setRunRollupStatus("failed");
          return;
        }
      }
      setRunRollupMessage("Rollup timed out.");
      setRunRollupStatus("failed");
      // Mark rollup job as failed so job store reflects reality (Lambda init/runtime errors may not update status)
      fetch(`/api/workflows/workers/${ROLLUP_WORKER_ID}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          status: "failed",
          error: { message: "Rollup timed out or worker failed to start." },
        }),
      }).catch(() => {});
    } catch (e) {
      setRunRollupMessage(e instanceof Error ? e.message : "Failed to run rollup");
      setRunRollupStatus("failed");
    }
  }, [refetch]);

  const chartConfigCost: ChartConfig = {
    totalCostUSD: { label: "Total cost (USD)", color: "hsl(var(--chart-1))" },
    periodValue: { label: "Period" },
    ...(analytics?.costOverTime[0]
      ? Object.fromEntries(
          Object.keys(analytics.costOverTime[0])
            .filter((k) => k !== "periodValue" && k !== "totalCostUSD")
            .map((k) => [k, { label: k, color: CHART_COLORS[Math.abs(k.length) % CHART_COLORS.length] }])
        )
      : {}),
  };

  const chartConfigPlatform: ChartConfig = {
    totalCostUSD: { label: "Cost (USD)", color: "hsl(var(--chart-2))" },
    name: { label: "Platform" },
  };

  const chartConfigClient: ChartConfig = {
    totalCostUSD: { label: "Cost (USD)", color: "hsl(var(--chart-3))" },
    clientId: { label: "Client" },
  };

  const chartConfigSource: ChartConfig = {
    totalCostUSD: { label: "Cost (USD)", color: "hsl(var(--chart-4))" },
    name: { label: "Source" },
  };

  return (
    <SidebarInset>
      <SiteHeader title="Billing & Usage" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-muted-foreground text-sm">
                Aggregated cost and usage across all clients. Global totals are not tied to a specific client.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={periodType}
                  onValueChange={(v) => {
                    setPeriodType(v as PeriodType);
                    setPeriodValue(null);
                  }}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Daily</SelectItem>
                    <SelectItem value="week">Weekly</SelectItem>
                    <SelectItem value="month">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={runRollupWorker}
                  disabled={runRollupStatus === "triggering" || runRollupStatus === "polling"}
                  className="gap-2"
                >
                  {(runRollupStatus === "triggering" || runRollupStatus === "polling") ? (
                    <>
                      <Loader2Icon className="h-4 w-4 animate-spin" />
                      {runRollupStatus === "triggering" ? "Starting…" : "Running rollup…"}
                    </>
                  ) : (
                    <>
                      <RefreshCwIcon className="h-4 w-4" />
                      Run rollup now
                    </>
                  )}
                </Button>
              </div>
            </div>
            {runRollupMessage && (
              <p
                className={
                  runRollupStatus === "failed"
                    ? "text-destructive text-sm"
                    : "text-muted-foreground text-sm"
                }
              >
                {runRollupMessage}
              </p>
            )}

            {error && (
              <Card className="border-destructive">
                <CardContent className="pt-6">
                  <p className="text-destructive">{error}</p>
                </CardContent>
              </Card>
            )}

            {loading && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
            )}

            {!loading && analytics && (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader>
                      <CardDescription>Total cost (global)</CardDescription>
                      <CardTitle className="text-2xl tabular-nums">
                        ${analytics.totalCostGlobal.toFixed(4)}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardDescription>Total requests (global)</CardDescription>
                      <CardTitle className="text-2xl tabular-nums">
                        {analytics.totalRequestsGlobal.toLocaleString()}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardDescription>Platforms</CardDescription>
                      <CardTitle className="text-2xl tabular-nums">
                        {analytics.platformBreakdown.length}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardDescription>Clients with usage</CardDescription>
                      <CardTitle className="text-2xl tabular-nums">
                        {analytics.byClientChart.length}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                {analytics.costOverTime.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Cost over time (global)</CardTitle>
                      <CardDescription>
                        Total cost per period across all platforms
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfigCost} className="h-[280px] w-full">
                        <AreaChart data={analytics.costOverTime}>
                          <defs>
                            <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--color-totalCostUSD)" stopOpacity={1} />
                              <stop offset="95%" stopColor="var(--color-totalCostUSD)" stopOpacity={0.1} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid vertical={false} />
                          <XAxis
                            dataKey="periodValue"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={(v) => String(v).slice(0, 10)}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={(v) => `$${v}`}
                          />
                          <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent indicator="dot" />}
                          />
                          <Area
                            type="monotone"
                            dataKey="totalCostUSD"
                            stroke="var(--color-totalCostUSD)"
                            fill="url(#fillTotal)"
                          />
                        </AreaChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  {analytics.platformBreakdown.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Cost by platform (global)</CardTitle>
                        <CardDescription>Breakdown by platform</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ChartContainer config={chartConfigPlatform} className="h-[280px] w-full">
                          <BarChart
                            data={analytics.platformBreakdown}
                            layout="vertical"
                            margin={{ left: 0, right: 12 }}
                          >
                            <CartesianGrid horizontal={false} />
                            <XAxis type="number" tickFormatter={(v) => `$${v}`} />
                            <YAxis type="category" dataKey="name" width={80} tickLine={false} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="totalCostUSD" radius={[0, 4, 4, 0]} fill="var(--color-totalCostUSD)" />
                          </BarChart>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                  )}

                  {analytics.bySource.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Cost by source (model/service)</CardTitle>
                        <CardDescription>Top sources across all data</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ChartContainer config={chartConfigSource} className="h-[280px] w-full">
                          <PieChart>
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Pie
                              data={analytics.bySource}
                              dataKey="totalCostUSD"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={2}
                              label={({ name, percent }) => `${name?.slice(0, 15)} ${(percent * 100).toFixed(4)}%`}
                            >
                              {analytics.bySource.map((_, i) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {analytics.byClientChart.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Cost by client</CardTitle>
                      <CardDescription>Per-client totals (all periods in range)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfigClient} className="h-[300px] w-full">
                        <BarChart
                          data={analytics.byClientChart}
                          margin={{ bottom: 20, left: 0, right: 12 }}
                        >
                          <CartesianGrid vertical={false} />
                          <XAxis
                            dataKey="clientId"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            angle={-45}
                            textAnchor="end"
                            interval={0}
                          />
                          <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v) => `$${v}`} />
                          <ChartTooltip
                            content={
                              <ChartTooltipContent
                                formatter={(v) => [`$${Number(v).toFixed(4)}`, "Cost"]}
                                labelFormatter={(_, payload) =>
                                  payload?.[0]?.payload?.fullId ?? ""
                                }
                              />
                            }
                          />
                          <Bar dataKey="totalCostUSD" radius={[4, 4, 0, 0]} fill="var(--color-totalCostUSD)" />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>Detailed aggregates</CardTitle>
                    <CardDescription>
                      Per client, platform, and period — request count and cost (USD)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-auto max-h-[400px] rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Client</TableHead>
                            <TableHead>Platform</TableHead>
                            <TableHead>Period</TableHead>
                            <TableHead className="text-right">Requests</TableHead>
                            <TableHead className="text-right">Cost (USD)</TableHead>
                            <TableHead className="text-left">Breakdown (sources)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analytics.aggregates
                            .sort(
                              (a, b) =>
                                (b.totalCostUSD ?? 0) - (a.totalCostUSD ?? 0)
                            )
                            .map((row, i) => (
                              <TableRow key={i}>
                                <TableCell className="font-mono text-xs">
                                  {row.clientId == null || row.clientId === ""
                                    ? "Global"
                                    : row.clientId}
                                </TableCell>
                                <TableCell>{row.platform}</TableCell>
                                <TableCell>{row.periodValue}</TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {row.requestCount?.toLocaleString() ?? "—"}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  ${(row.totalCostUSD ?? 0).toFixed(4)}
                                </TableCell>
                                <TableCell className="text-left text-xs text-muted-foreground max-w-[200px] truncate">
                                  {row.breakdown
                                    ? Object.entries(row.breakdown)
                                        .map(([k, v]) => `${k}: $${(v.totalCostUSD ?? 0).toFixed(4)}`)
                                        .join("; ") || "—"
                                    : "—"}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {!loading && !error && data && data.aggregates.length === 0 && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground text-center py-8">
                    No billing data yet. Aggregates are built by the daily rollup worker.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </SidebarInset>
  );
}
