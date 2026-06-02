'use client';

/**
 * Project Usage & Cost Dashboard
 *
 * Shows AI token usage, cost breakdown, model distribution, and per-user
 * analytics for a project. Data comes from the platform_cost_usage collection
 * via /api/projects/[projectId]/usage.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ProtectedPage } from '@/components/auth/ProtectedPage';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  ArrowLeft,
  RefreshCw,
  DollarSign,
  Zap,
  Database,
  Layers,
  TrendingUp,
  Users,
  Bot,
  Cpu,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Summary {
  totalCostUSD: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCachedTokens: number;
  totalReasoningTokens: number;
  requestCount: number;
  avgCostPerRequest: number;
  breakdown: {
    inputUSD: number;
    outputUSD: number;
    reasoningUSD: number;
    cacheReadUSD: number;
    cacheWriteUSD: number;
  };
}

interface ModelRow {
  model: string;
  displayName: string;
  cost: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  requests: number;
}

interface UserRow {
  clientId: string;
  displayId: string;
  cost: number;
  inputTokens: number;
  outputTokens: number;
  requests: number;
}

interface DayRow {
  date: string;
  cost: number;
  inputTokens: number;
  outputTokens: number;
  requests: number;
}

interface UsageData {
  summary: Summary;
  byModel: ModelRow[];
  byUser: UserRow[];
  byDay: DayRow[];
  meta: { from: string; to: string; days: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RANGE_OPTIONS = [
  { label: '7d', days: 7 },
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

const PALETTE = [
  '#8b5cf6', // violet
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#ec4899', // pink
  '#14b8a6', // teal
];

function modelColor(index: number): string {
  return PALETTE[index % PALETTE.length]!;
}

function formatCost(usd: number): string {
  if (usd === 0) return '$0.00';
  if (usd < 0.0001) return '<$0.0001';
  if (usd < 0.01) return `$${usd.toFixed(5)}`;
  if (usd < 1) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatDate(iso: string): string {
  const [, m, d] = iso.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[(parseInt(m ?? '1', 10) - 1) % 12]} ${parseInt(d ?? '1', 10)}`;
}

/** Fill in missing dates in the time series so the chart has no gaps. */
function fillDays(rows: DayRow[], from: string, to: string): DayRow[] {
  const map = new Map(rows.map((r) => [r.date, r]));
  const result: DayRow[] = [];
  const cur = new Date(from);
  const end = new Date(to);
  while (cur <= end) {
    const key = cur.toISOString().slice(0, 10);
    result.push(map.get(key) ?? { date: key, cost: 0, inputTokens: 0, outputTokens: 0, requests: 0 });
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm">
      {/* Subtle gradient accent */}
      <div className={`absolute right-0 top-0 h-24 w-24 rounded-bl-[60px] opacity-10 ${color}`} />
      <div className="flex items-start gap-3">
        <div className={`rounded-lg p-2 ${color.replace('bg-', 'bg-').replace('/10', '/15')}`}>
          <Icon size={18} className={color.replace('bg-', 'text-').replace('/15', '')} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">{value}</p>
          {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, className }: {
  title: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-border bg-card shadow-sm', className)}>
      <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
        {Icon && <Icon size={14} className="text-muted-foreground" />}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function UsageDashboard() {
  const params = useParams();
  const projectId = (params?.projectId as string) ?? '';

  const [days, setDays] = useState(30);
  const [data, setData] = useState<UsageData | null>(null);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'model' | 'user'>('model');

  // ── Fetch project name ───────────────────────────────────────────────────

  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((d) => { if (d.name) setProjectName(d.name); })
      .catch(() => {});
  }, [projectId]);

  // ── Fetch usage data ─────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/usage?days=${days}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as UsageData;
      setData(json);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [projectId, days]);

  useEffect(() => { void load(); }, [load, refreshKey]);

  // ── Computed series ──────────────────────────────────────────────────────

  const filledDays = useMemo(() => {
    if (!data) return [];
    return fillDays(data.byDay, data.meta.from, data.meta.to);
  }, [data]);

  const costChartConfig: ChartConfig = useMemo(() => ({
    cost: { label: 'Cost (USD)', color: '#8b5cf6' },
  }), []);

  const requestsChartConfig: ChartConfig = useMemo(() => ({
    requests: { label: 'Requests', color: '#10b981' },
  }), []);

  const tokensChartConfig: ChartConfig = useMemo(() => {
    const cfg: ChartConfig = {};
    (data?.byModel ?? []).forEach((m, i) => {
      cfg[m.displayName] = { label: m.displayName, color: modelColor(i) };
    });
    return cfg;
  }, [data]);

  const modelPieData = useMemo(() =>
    (data?.byModel ?? []).map((m, i) => ({
      name: m.displayName,
      value: parseFloat(m.cost.toFixed(6)),
      tokens: m.inputTokens + m.outputTokens,
      fill: modelColor(i),
    })),
    [data],
  );

  const breakdownData = useMemo(() => {
    if (!data) return [];
    const { breakdown } = data.summary;
    return [
      { label: 'Input', value: breakdown.inputUSD, fill: '#3b82f6' },
      { label: 'Output', value: breakdown.outputUSD, fill: '#8b5cf6' },
      { label: 'Cache read', value: breakdown.cacheReadUSD, fill: '#10b981' },
      { label: 'Cache write', value: breakdown.cacheWriteUSD, fill: '#f59e0b' },
      { label: 'Reasoning', value: breakdown.reasoningUSD, fill: '#06b6d4' },
    ].filter((d) => d.value > 0);
  }, [data]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* ── Sticky top bar ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-3">
          <Link
            href={`/projects/${projectId}`}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <ArrowLeft size={14} />
            Back
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">/</span>
              {projectName && (
                <>
                  <span className="text-sm text-muted-foreground truncate max-w-[200px]">{projectName}</span>
                  <span className="text-muted-foreground text-sm">/</span>
                </>
              )}
              <span className="text-sm font-semibold text-foreground">Usage & Cost</span>
            </div>
          </div>

          {/* Date range pills */}
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                onClick={() => setDays(opt.days)}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium transition-all',
                  days === opt.days
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-sm hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Page hero ──────────────────────────────────────────────────────── */}
      <div className="border-b border-border bg-gradient-to-br from-violet-500/5 via-blue-500/5 to-transparent">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Cpu size={12} />
                AI Usage Analytics
              </div>
              <h1 className="text-2xl font-bold text-foreground">
                {projectName ? `${projectName} — ` : ''}Usage Dashboard
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                AI model consumption, token usage, and cost breakdown for the last {days} days
              </p>
            </div>
            {data && (
              <div className="text-right text-xs text-muted-foreground">
                <p>{new Date(data.meta.from).toLocaleDateString()} → {new Date(data.meta.to).toLocaleDateString()}</p>
                <p className="mt-0.5">{data.summary.requestCount.toLocaleString()} total requests</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">

        {/* ── Loading / error ─────────────────────────────────────────────── */}
        {loading && !data && (
          <div className="flex items-center justify-center py-32">
            <Loader2 size={28} className="animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">
            <AlertCircle size={16} />
            <span>Failed to load usage data: {error}</span>
          </div>
        )}

        {data && (
          <>
            {/* ── KPI Cards ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard
                icon={DollarSign}
                label="Total Cost"
                value={formatCost(data.summary.totalCostUSD)}
                sub={`avg ${formatCost(data.summary.avgCostPerRequest)} / request`}
                color="bg-violet-500/15 text-violet-500"
              />
              <StatCard
                icon={Zap}
                label="AI Requests"
                value={data.summary.requestCount.toLocaleString()}
                sub={`over ${days} days`}
                color="bg-blue-500/15 text-blue-500"
              />
              <StatCard
                icon={Database}
                label="Total Tokens"
                value={formatTokens(data.summary.totalTokens)}
                sub={`${formatTokens(data.summary.totalInputTokens)} in · ${formatTokens(data.summary.totalOutputTokens)} out`}
                color="bg-emerald-500/15 text-emerald-500"
              />
              <StatCard
                icon={Layers}
                label="Cache Hits"
                value={formatTokens(data.summary.totalCachedTokens)}
                sub={`saved ${formatCost(data.summary.breakdown.cacheReadUSD)} via cache`}
                color="bg-amber-500/15 text-amber-500"
              />
            </div>

            {/* ── Row 1: Cost timeline + Model pie ──────────────────────── */}
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Cost over time */}
              <SectionCard title="Cost Over Time" icon={TrendingUp} className="lg:col-span-2">
                {filledDays.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ChartContainer config={costChartConfig} className="h-[220px]">
                    <AreaChart data={filledDays} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatDate}
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tickFormatter={(v) => `$${(v as number).toFixed(4)}`}
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        width={62}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value) => [`$${(value as number).toFixed(5)}`, 'Cost']}
                            labelFormatter={(label) => formatDate(label as string)}
                          />
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="cost"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        fill="url(#costGrad)"
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </AreaChart>
                  </ChartContainer>
                )}
              </SectionCard>

              {/* Model distribution pie */}
              <SectionCard title="Model Distribution" icon={Bot}>
                {modelPieData.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <>
                    <ChartContainer config={Object.fromEntries(modelPieData.map((m) => [m.name, { label: m.name, color: m.fill }]))} className="h-[160px]">
                      <PieChart>
                        <Pie
                          data={modelPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={48}
                          outerRadius={72}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {modelPieData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Pie>
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value) => [formatCost(value as number), 'Cost']}
                            />
                          }
                        />
                      </PieChart>
                    </ChartContainer>
                    {/* Custom legend */}
                    <div className="mt-2 space-y-1.5">
                      {modelPieData.map((m) => (
                        <div key={m.name} className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: m.fill }} />
                            <span className="truncate text-muted-foreground font-mono">{m.name}</span>
                          </div>
                          <span className="ml-2 shrink-0 font-medium tabular-nums text-foreground">
                            {formatCost(m.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </SectionCard>
            </div>

            {/* ── Row 2: Requests timeline + Token breakdown by model ────── */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Requests over time */}
              <SectionCard title="Requests Over Time" icon={Zap}>
                {filledDays.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ChartContainer config={requestsChartConfig} className="h-[200px]">
                    <BarChart data={filledDays} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatDate}
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        width={28}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(v) => [v, 'Requests']}
                            labelFormatter={(label) => formatDate(label as string)}
                          />
                        }
                      />
                      <Bar dataKey="requests" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={32} />
                    </BarChart>
                  </ChartContainer>
                )}
              </SectionCard>

              {/* Tokens by model (stacked horizontal bar) */}
              <SectionCard title="Tokens by Model" icon={Database}>
                {(data.byModel ?? []).length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ChartContainer config={tokensChartConfig} className="h-[200px]">
                    <BarChart
                      data={data.byModel.map((m, i) => ({
                        name: m.displayName,
                        input: m.inputTokens,
                        output: m.outputTokens,
                        cached: m.cachedTokens,
                        fill: modelColor(i),
                      }))}
                      layout="vertical"
                      margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" horizontal={false} />
                      <XAxis
                        type="number"
                        tickFormatter={(v) => formatTokens(v as number)}
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        width={90}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(v, name) => [formatTokens(v as number), name as string]}
                          />
                        }
                      />
                      <Bar dataKey="input" stackId="a" name="Input" fill="#3b82f6" radius={0} />
                      <Bar dataKey="output" stackId="a" name="Output" fill="#8b5cf6" radius={0} />
                      <Bar dataKey="cached" stackId="a" name="Cached" fill="#10b981" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ChartContainer>
                )}
              </SectionCard>
            </div>

            {/* ── Cost breakdown bar ─────────────────────────────────────── */}
            {breakdownData.length > 0 && (
              <SectionCard title="Cost Breakdown" icon={Layers}>
                <div className="space-y-3">
                  {/* Stacked bar visualization */}
                  <div className="flex h-8 w-full overflow-hidden rounded-lg">
                    {(() => {
                      const total = breakdownData.reduce((a, b) => a + b.value, 0);
                      return breakdownData.map((d) => (
                        <div
                          key={d.label}
                          className="relative flex items-center justify-center transition-all hover:brightness-110"
                          style={{
                            width: `${(d.value / total) * 100}%`,
                            backgroundColor: d.fill,
                            minWidth: d.value / total > 0.05 ? undefined : '0px',
                          }}
                          title={`${d.label}: ${formatCost(d.value)}`}
                        />
                      ));
                    })()}
                  </div>
                  {/* Legend row */}
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    {breakdownData.map((d) => (
                      <div key={d.label} className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: d.fill }} />
                        <span className="text-xs text-muted-foreground">{d.label}</span>
                        <span className="text-xs font-semibold tabular-nums text-foreground">{formatCost(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </SectionCard>
            )}

            {/* ── User activity bar ──────────────────────────────────────── */}
            {data.byUser.length > 0 && (
              <SectionCard title="Cost by User" icon={Users}>
                {data.byUser.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ChartContainer
                    config={Object.fromEntries(data.byUser.map((u, i) => [u.displayId, { label: u.displayId, color: PALETTE[i % PALETTE.length] }]))}
                    className="h-[max(140px,calc(2.5rem*var(--rows)))]"
                    style={{ '--rows': data.byUser.length } as React.CSSProperties}
                  >
                    <BarChart
                      data={data.byUser.map((u, i) => ({
                        name: u.displayId,
                        cost: parseFloat(u.cost.toFixed(6)),
                        requests: u.requests,
                        fill: PALETTE[i % PALETTE.length],
                      }))}
                      layout="vertical"
                      margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" horizontal={false} />
                      <XAxis
                        type="number"
                        tickFormatter={(v) => formatCost(v as number)}
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 10, fontFamily: 'monospace' }}
                        tickLine={false}
                        axisLine={false}
                        width={80}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(v, name) =>
                              name === 'cost' ? [formatCost(v as number), 'Cost'] : [v, 'Requests']
                            }
                          />
                        }
                      />
                      <Bar dataKey="cost" name="cost" radius={[0, 4, 4, 0]} maxBarSize={24}>
                        {data.byUser.map((_, i) => (
                          <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                )}
              </SectionCard>
            )}

            {/* ── Detail table ───────────────────────────────────────────── */}
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              {/* Tab header */}
              <div className="flex items-center gap-0 border-b border-border">
                <button
                  onClick={() => setActiveTab('model')}
                  className={cn(
                    'flex items-center gap-2 border-b-2 px-5 py-3.5 text-sm font-medium transition-colors',
                    activeTab === 'model'
                      ? 'border-violet-500 text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Bot size={14} />
                  By Model
                </button>
                <button
                  onClick={() => setActiveTab('user')}
                  className={cn(
                    'flex items-center gap-2 border-b-2 px-5 py-3.5 text-sm font-medium transition-colors',
                    activeTab === 'user'
                      ? 'border-violet-500 text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Users size={14} />
                  By User
                </button>
              </div>

              {/* Model table */}
              {activeTab === 'model' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Model</th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Requests</th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Input Tokens</th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Output Tokens</th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cached</th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cost</th>
                        <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cost / req</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byModel.map((m, i) => (
                        <tr key={m.model} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: modelColor(i) }} />
                              <span className="font-mono text-xs text-foreground">{m.displayName}</span>
                            </div>
                            <span className="ml-4 text-[10px] text-muted-foreground">{m.model}</span>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-foreground">{m.requests.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-foreground">{formatTokens(m.inputTokens)}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-foreground">{formatTokens(m.outputTokens)}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{formatTokens(m.cachedTokens)}</td>
                          <td className="px-4 py-3 text-right tabular-nums font-semibold text-foreground">{formatCost(m.cost)}</td>
                          <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">{formatCost(m.requests > 0 ? m.cost / m.requests : 0)}</td>
                        </tr>
                      ))}
                      {data.byModel.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-5 py-10 text-center text-sm text-muted-foreground">
                            No model usage data for this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {data.byModel.length > 0 && (
                      <tfoot>
                        <tr className="border-t border-border bg-muted/20">
                          <td className="px-5 py-3 text-xs font-semibold text-muted-foreground">Total</td>
                          <td className="px-4 py-3 text-right text-xs font-semibold tabular-nums">{data.summary.requestCount.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-xs font-semibold tabular-nums">{formatTokens(data.summary.totalInputTokens)}</td>
                          <td className="px-4 py-3 text-right text-xs font-semibold tabular-nums">{formatTokens(data.summary.totalOutputTokens)}</td>
                          <td className="px-4 py-3 text-right text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{formatTokens(data.summary.totalCachedTokens)}</td>
                          <td className="px-4 py-3 text-right text-xs font-bold tabular-nums">{formatCost(data.summary.totalCostUSD)}</td>
                          <td className="px-5 py-3 text-right text-xs font-semibold tabular-nums">{formatCost(data.summary.avgCostPerRequest)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}

              {/* User table */}
              {activeTab === 'user' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">User (Client ID)</th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Requests</th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Input Tokens</th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Output Tokens</th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Tokens</th>
                        <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byUser.map((u, i) => (
                        <tr key={u.clientId} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                                style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                              >
                                {u.displayId[0]?.toUpperCase()}
                              </div>
                              <span className="font-mono text-xs text-foreground">{u.displayId}…</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">{u.requests.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatTokens(u.inputTokens)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatTokens(u.outputTokens)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatTokens(u.inputTokens + u.outputTokens)}</td>
                          <td className="px-5 py-3 text-right tabular-nums font-semibold">{formatCost(u.cost)}</td>
                        </tr>
                      ))}
                      {data.byUser.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                            No user activity data for this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── Footer note ────────────────────────────────────────────── */}
            <p className="pb-4 text-center text-[11px] text-muted-foreground/60">
              Costs are calculated inline using the tokenlens catalog. Cached token savings are not included in the total cost shown.
            </p>
          </>
        )}

        {/* Empty state — no data and no error */}
        {!loading && !error && data && data.summary.requestCount === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-24 text-center">
            <Bot size={40} className="mb-4 text-muted-foreground/30" />
            <h3 className="text-base font-semibold text-foreground">No AI usage yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Start using the AI chat or autocomplete in this project and usage will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground/50">
      No data for this period
    </div>
  );
}

// ─── Page export ──────────────────────────────────────────────────────────────

export default function UsagePage() {
  return (
    <ProtectedPage>
      <UsageDashboard />
    </ProtectedPage>
  );
}
