"use client";

import * as React from "react";
import { SidebarInset } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2Icon,
  RefreshCwIcon,
  InfinityIcon,
  CheckCircle2Icon,
  XCircleIcon,
  ClockIcon,
  SendIcon,
  GaugeIcon,
  ShieldIcon,
  PencilIcon,
  Trash2Icon,
  UserPlusIcon,
  AlertCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  BotIcon,
  CpuIcon,
  HammerIcon,
  ZapIcon,
  PlusIcon,
} from "lucide-react";

// ── Types (mirror lib/quota-mongodb.ts) ───────────────────────────────────────

type Platform = "render" | "ai";
type PeriodType = "day" | "month" | "lifetime";
type RequestStatus = "pending" | "approved" | "rejected";

const ALL_PLATFORMS: Platform[] = ["render", "ai"];

const PLATFORM_LABELS: Record<Platform, string> = {
  render: "Render",
  ai: "AI Text",
};
/** Unit of measurement shown in the UI. */
const PLATFORM_UNIT: Record<Platform, string> = {
  render: "renders",
  ai: "tokens",
};
/** One-line description of what the quota actually counts. */
const PLATFORM_DESCRIPTION: Record<Platform, string> = {
  render: "Number of times you can trigger a render",
  ai: "Total AI tokens you can consume",
};

// ── Render config helpers ─────────────────────────────────────────────────────
const RENDER_MEMORY_OPTIONS = [
  { value: 1024, label: "1 GB" },
  { value: 2048, label: "2 GB" },
  { value: 3008, label: "3 GB" },
  { value: 4096, label: "4 GB (default)" },
  { value: 6144, label: "6 GB" },
  { value: 10240, label: "10 GB" },
];
const RENDER_TIMEOUT_OPTIONS = [
  { value: 120, label: "2 min" },
  { value: 240, label: "4 min" },
  { value: 300, label: "5 min" },
  { value: 600, label: "10 min" },
  { value: 900, label: "15 min (default/max)" },
];
const RENDER_DISK_OPTIONS = [
  { value: 2048, label: "2 GB" },
  { value: 5120, label: "5 GB" },
  { value: 10240, label: "10 GB (default/max)" },
];
const ALL_PRESETS = [
  "classic", "complex-fast", "complex-slow", "basic-fast", "throttled", "lightweight", "broadcast", "enterprise",
];
const DEFAULT_RENDER_CONFIG: RenderConfigLimits = {
  maxMemoryMb: 4096,
  maxTimeoutSeconds: 900,
  maxConcurrency: 200,
  maxDiskMb: 10240,
  allowedPresets: undefined,
};

// ── AI provider helpers ───────────────────────────────────────────────────────
const AI_PROVIDERS = [
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "google", label: "Google (Gemini)" },
  { value: "openai", label: "OpenAI (GPT)" },
  { value: "mistral", label: "Mistral" },
];

interface RenderConfigLimits {
  maxMemoryMb: number;
  maxTimeoutSeconds: number;
  maxConcurrency: number;
  maxDiskMb: number;
  allowedPresets?: string[];
}

interface AiProviderLimit {
  maxTokens: number;
  usage: number;
  periodType: PeriodType;
  currentPeriodStart: string;
}

interface WorkerPermissions {
  canCallWorkers: boolean;
  canCallAgents: boolean;
}

interface PlatformLimit {
  isUnlimited: boolean;
  maxPerPeriod?: number;
  periodType: PeriodType;
  currentPeriodStart: string;
  usage: number;
  isActive: boolean;
  nextResetAt?: string | null;
}

interface UserQuota {
  _id?: string;
  clientId: string;
  platforms: Partial<Record<Platform, PlatformLimit>>;
  grantedBy?: string;
  note?: string;
  renderConfig?: RenderConfigLimits;
  aiProviders?: Record<string, AiProviderLimit>;
  workerPermissions?: WorkerPermissions;
  updatedAt: string;
}

interface QuotaRequest {
  _id: string;
  requesterId: string;
  platform: Platform;
  type: "access" | "increase";
  status: RequestStatus;
  message?: string;
  requestedLimit?: number;
  requestedPeriod?: PeriodType;
  reviewedBy?: string;
  reviewNote?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function fmtShortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

function usagePct(limit: PlatformLimit | undefined): number | null {
  if (!limit || limit.isUnlimited || !limit.maxPerPeriod) return null;
  return Math.min(100, (limit.usage / limit.maxPerPeriod) * 100);
}

function StatusBadge({ status }: { status: RequestStatus }) {
  const map: Record<RequestStatus, string> = {
    pending: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    approved: "bg-green-500/15 text-green-700 dark:text-green-400",
    rejected: "bg-destructive/15 text-destructive",
  };
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${map[status]}`}>{status}</span>;
}

// ── Data hooks ────────────────────────────────────────────────────────────────

function useMyQuota() {
  const [quota, setQuota] = React.useState<UserQuota | null>(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [myClientId, setMyClientId] = React.useState<string>("");
  const [requests, setRequests] = React.useState<QuotaRequest[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetch_ = React.useCallback(async () => {
    setLoading(true);
    try {
      const [qRes, rRes] = await Promise.all([
        fetch("/api/quota"),
        fetch("/api/quota/request"),
      ]);
      const qJson = await qRes.json();
      const rJson = await rRes.json();
      setQuota(qJson.quota ?? null);
      setIsAdmin(!!qJson.isAdmin);
      setMyClientId(qJson.clientId ?? "");
      setRequests(rJson.requests ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { fetch_(); }, [fetch_]);
  return { quota, isAdmin, myClientId, requests, loading, refetch: fetch_ };
}

function useAdminData(enabled: boolean) {
  const [quotas, setQuotas] = React.useState<UserQuota[]>([]);
  const [requests, setRequests] = React.useState<QuotaRequest[]>([]);
  const [allClientIds, setAllClientIds] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetch_ = React.useCallback(async () => {
    if (!enabled) { setLoading(false); return; }
    setLoading(true);
    try {
      const [qRes, rRes, cRes] = await Promise.all([
        fetch("/api/admin/quotas"),
        fetch("/api/admin/quota-requests"),
        fetch("/api/db/client-ids"),
      ]);
      const [qJson, rJson, cJson] = await Promise.all([qRes.json(), rRes.json(), cRes.json()]);
      setQuotas(qJson.quotas ?? []);
      setRequests(rJson.requests ?? []);
      setAllClientIds(Array.isArray(cJson.clientIds) ? cJson.clientIds : []);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  React.useEffect(() => { fetch_(); }, [fetch_]);
  return { quotas, requests, allClientIds, loading, refetch: fetch_ };
}

// ═══════════════════════════════════════════════════════════════════════════════
//   USER VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function PlatformUsageCard({
  platform,
  limit,
  onRequest,
  pendingRequest,
}: {
  platform: Platform;
  limit: PlatformLimit | undefined;
  onRequest: () => void;
  pendingRequest?: QuotaRequest;
}) {
  const pct = usagePct(limit);
  const used = limit?.usage ?? 0;
  const max = limit?.maxPerPeriod ?? null;
  const atLimit = pct !== null && pct >= 100;
  const nearLimit = pct !== null && pct >= 80;
  const noAccess = !limit;
  const suspended = limit && !limit.isActive;

  return (
    <Card
      className={
        noAccess ? "border-dashed" :
        atLimit ? "border-destructive/50" :
        nearLimit ? "border-amber-500/50" :
        suspended ? "border-muted" : ""
      }
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-medium">{PLATFORM_LABELS[platform]}</CardTitle>
            <CardDescription className="text-xs mt-0.5">{PLATFORM_DESCRIPTION[platform]}</CardDescription>
          </div>
          {noAccess ? (
            <Badge variant="outline" className="text-[10px]">no access</Badge>
          ) : suspended ? (
            <Badge variant="outline" className="text-[10px] border-muted-foreground/40 text-muted-foreground">suspended</Badge>
          ) : limit.isUnlimited ? (
            <Badge className="text-[10px] bg-green-500/15 text-green-700 dark:text-green-400 hover:bg-green-500/20 gap-1">
              <InfinityIcon className="h-3 w-3" /> unlimited
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px]">
              per {limit.periodType === "lifetime" ? "lifetime" : limit.periodType}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {noAccess ? (
          <p className="text-xs text-muted-foreground py-1">
            You don't have access to this platform. Request access below.
          </p>
        ) : (
          <>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tabular-nums">{used.toLocaleString()}</span>
              {limit!.isUnlimited ? (
                <span className="text-sm text-muted-foreground">{PLATFORM_UNIT[platform]} used</span>
              ) : (
                <>
                  <span className="text-base text-muted-foreground">/ {max?.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground ml-0.5">{PLATFORM_UNIT[platform]}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {pct!.toFixed(0)}%
                  </span>
                </>
              )}
            </div>
            {!limit!.isUnlimited && pct !== null && (
              <Progress
                value={pct}
                className={`h-1.5 ${atLimit ? "[&>div]:bg-destructive" : nearLimit ? "[&>div]:bg-amber-500" : ""}`}
              />
            )}
            {limit!.periodType !== "lifetime" && limit!.nextResetAt && (
              <p className="text-[11px] text-muted-foreground">
                Resets {fmtShortDate(limit!.nextResetAt)}
              </p>
            )}
            {limit!.periodType === "lifetime" && (
              <p className="text-[11px] text-muted-foreground">
                Absolute limit (never resets)
              </p>
            )}
            {atLimit && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-[11px] text-destructive flex items-center gap-1.5">
                <AlertCircleIcon className="h-3 w-3 shrink-0" /> Quota reached — new {PLATFORM_UNIT[platform]} blocked.
              </div>
            )}
          </>
        )}
        <Button
          size="sm"
          variant={noAccess ? "default" : "outline"}
          className="w-full gap-2"
          disabled={!!pendingRequest}
          onClick={onRequest}
        >
          <SendIcon className="h-3.5 w-3.5" />
          {pendingRequest ? "Request pending" : noAccess ? "Request access" : "Request more"}
        </Button>
      </CardContent>
    </Card>
  );
}

function UserRequestDialog({
  platform,
  isAccess,
  open,
  onOpenChange,
  onSubmitted,
}: {
  platform: Platform | null;
  isAccess: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted: () => void;
}) {
  const [message, setMessage] = React.useState("");
  const [requestedLimit, setRequestedLimit] = React.useState("");
  const [requestedPeriod, setRequestedPeriod] = React.useState<PeriodType>("month");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setMessage(""); setRequestedLimit(""); setRequestedPeriod("month"); setError(null);
    }
  }, [open]);

  const submit = async () => {
    if (!platform) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/quota/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          message: message.trim() || undefined,
          requestedLimit: requestedLimit ? parseInt(requestedLimit) : undefined,
          requestedPeriod,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to submit"); return; }
      onOpenChange(false);
      onSubmitted();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isAccess ? `Request ${platform && PLATFORM_LABELS[platform]} access` : `Request ${platform && PLATFORM_LABELS[platform]} increase`}
          </DialogTitle>
          <DialogDescription>
            {isAccess
              ? "Tell an admin why you need access to this platform."
              : "Describe why you need a higher quota."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Message</Label>
            <Textarea
              placeholder="Describe your use case…"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Desired {platform ? PLATFORM_UNIT[platform] : "limit"}</Label>
              <Input
                type="number"
                min={1}
                placeholder={platform === "ai" ? "e.g. 100000" : "e.g. 100"}
                value={requestedLimit}
                onChange={(e) => setRequestedLimit(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Per period</Label>
              <Select value={requestedPeriod} onValueChange={(v) => setRequestedPeriod(v as PeriodType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Daily</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                  <SelectItem value="lifetime">Absolute (no reset)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={loading || !message.trim()}>
            {loading && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UserView({ quota, requests, refetch }: { quota: UserQuota | null; requests: QuotaRequest[]; refetch: () => void }) {
  const [requestDialog, setRequestDialog] = React.useState<{ platform: Platform; isAccess: boolean } | null>(null);

  const pendingByPlatform = new Map(requests.filter((r) => r.status === "pending").map((r) => [r.platform, r]));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold">Your quotas</h2>
        <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
          Track your usage across all platforms. Quotas are <strong>soft caps</strong> —
          you'll be allowed to keep going until a counter is reached, then blocked until reset or increase.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ALL_PLATFORMS.map((p) => {
          const limit = quota?.platforms?.[p];
          const pending = pendingByPlatform.get(p);
          const isAccess = !limit || !limit.isActive;
          return (
            <PlatformUsageCard
              key={p}
              platform={p}
              limit={limit}
              pendingRequest={pending}
              onRequest={() => setRequestDialog({ platform: p, isAccess })}
            />
          );
        })}
      </div>

      {/* Worker / Agent permissions banner */}
      {quota?.workerPermissions && (!quota.workerPermissions.canCallWorkers || !quota.workerPermissions.canCallAgents) && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs flex flex-col gap-1">
          <p className="font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
            <HammerIcon className="h-3.5 w-3.5" /> Access restrictions
          </p>
          <div className="flex flex-wrap gap-2 mt-0.5">
            {!quota.workerPermissions.canCallWorkers && (
              <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-destructive/15 text-destructive flex items-center gap-1">
                <HammerIcon className="h-3 w-3" /> Workers: blocked
              </span>
            )}
            {!quota.workerPermissions.canCallAgents && (
              <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-destructive/15 text-destructive flex items-center gap-1">
                <BotIcon className="h-3 w-3" /> Agents: blocked
              </span>
            )}
          </div>
          <p className="text-muted-foreground">Contact an admin to restore access.</p>
        </div>
      )}

      {quota?.note && (
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <strong>Admin note:</strong> {quota.note}
        </div>
      )}

      {/* Request history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">My requests</CardTitle>
          <CardDescription>Past and pending quota requests</CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No requests yet.</p>
          ) : (
            <div className="divide-y">
              {requests.map((r) => (
                <div key={r._id} className="flex flex-col gap-1 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">
                      {PLATFORM_LABELS[r.platform]}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {r.type === "access" ? "access" : "increase"}
                    </Badge>
                    <StatusBadge status={r.status} />
                    <span className="text-xs text-muted-foreground">{fmtDate(r.createdAt)}</span>
                  </div>
                  {r.message && <p className="text-xs text-muted-foreground">"{r.message}"</p>}
                  {r.requestedLimit && (
                    <p className="text-[11px] text-muted-foreground">
                      Asked for <strong>{r.requestedLimit.toLocaleString()} {PLATFORM_UNIT[r.platform]}</strong> / {r.requestedPeriod ?? "month"}
                    </p>
                  )}
                  {r.reviewNote && <p className="text-[11px] italic text-muted-foreground">Admin: "{r.reviewNote}"</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <UserRequestDialog
        open={!!requestDialog}
        platform={requestDialog?.platform ?? null}
        isAccess={requestDialog?.isAccess ?? true}
        onOpenChange={(v) => !v && setRequestDialog(null)}
        onSubmitted={refetch}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//   ADMIN VIEW
// ═══════════════════════════════════════════════════════════════════════════════

// ── Collapsible advanced section wrapper ──────────────────────────────────────

function AdvancedSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="rounded-md border">
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium hover:bg-muted/40 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-center gap-2">
          {icon}
          {title}
        </span>
        {open ? <ChevronDownIcon className="h-4 w-4 text-muted-foreground" /> : <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="border-t px-3 pb-3 pt-3 flex flex-col gap-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Render Advanced Section ───────────────────────────────────────────────────

function RenderAdvancedSection({
  config,
  onChange,
}: {
  config: RenderConfigLimits;
  onChange: (cfg: RenderConfigLimits) => void;
}) {
  const [selectedPresets, setSelectedPresets] = React.useState<string[]>(config.allowedPresets ?? []);

  const togglePreset = (preset: string) => {
    const next = selectedPresets.includes(preset)
      ? selectedPresets.filter((p) => p !== preset)
      : [...selectedPresets, preset];
    setSelectedPresets(next);
    onChange({ ...config, allowedPresets: next.length ? next : undefined });
  };

  return (
    <>
      <p className="text-xs text-muted-foreground">
        Controls which Lambda configurations this user can use. Leave at defaults for typical usage.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label className="text-xs">Max memory</Label>
          <Select
            value={String(config.maxMemoryMb)}
            onValueChange={(v) => onChange({ ...config, maxMemoryMb: parseInt(v) })}
          >
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RENDER_MEMORY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={String(o.value)} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs">Max timeout</Label>
          <Select
            value={String(config.maxTimeoutSeconds)}
            onValueChange={(v) => onChange({ ...config, maxTimeoutSeconds: parseInt(v) })}
          >
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RENDER_TIMEOUT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={String(o.value)} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs">Max concurrency</Label>
          <Input
            type="number"
            min={1}
            max={200}
            className="h-8 text-xs"
            value={config.maxConcurrency}
            onChange={(e) => onChange({ ...config, maxConcurrency: parseInt(e.target.value) || 200 })}
          />
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs">Max disk size</Label>
          <Select
            value={String(config.maxDiskMb)}
            onValueChange={(v) => onChange({ ...config, maxDiskMb: parseInt(v) })}
          >
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RENDER_DISK_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={String(o.value)} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label className="text-xs">
          Allowed presets{" "}
          <span className="font-normal text-muted-foreground">(empty = all allowed)</span>
        </Label>
        <div className="flex flex-wrap gap-1.5">
          {ALL_PRESETS.map((preset) => {
            const isSelected = selectedPresets.includes(preset) || selectedPresets.length === 0;
            const isExplicit = selectedPresets.length > 0;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => togglePreset(preset)}
                className={`rounded px-2 py-0.5 text-[11px] border transition-colors ${
                  isExplicit
                    ? isSelected
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-muted/40 border-muted text-muted-foreground"
                    : "bg-muted/40 border-muted text-muted-foreground"
                }`}
              >
                {preset}
              </button>
            );
          })}
        </div>
        {selectedPresets.length > 0 && (
          <button
            type="button"
            className="text-[11px] text-muted-foreground underline text-left"
            onClick={() => { setSelectedPresets([]); onChange({ ...config, allowedPresets: undefined }); }}
          >
            Clear (allow all)
          </button>
        )}
      </div>
    </>
  );
}

// ── AI Provider Section ───────────────────────────────────────────────────────

function AiProvidersSection({
  providers,
  onAdd,
  onRemove,
}: {
  providers: Record<string, AiProviderLimit>;
  onAdd: (provider: string, maxTokens: number, periodType: PeriodType) => void;
  onRemove: (provider: string) => void;
}) {
  const [newProvider, setNewProvider] = React.useState("anthropic");
  const [newMax, setNewMax] = React.useState("");
  const [newPeriod, setNewPeriod] = React.useState<PeriodType>("month");

  const add = () => {
    if (!newMax || parseInt(newMax) < 1) return;
    onAdd(newProvider, parseInt(newMax), newPeriod);
    setNewMax("");
  };

  return (
    <>
      <p className="text-xs text-muted-foreground">
        Set additional per-provider token limits. A provider is blocked when its own limit is reached (independent of global AI quota).
      </p>

      {Object.keys(providers).length > 0 && (
        <div className="flex flex-col gap-1.5">
          {Object.entries(providers).map(([provider, limit]) => {
            const pct = Math.min(100, (limit.usage / limit.maxTokens) * 100);
            return (
              <div key={provider} className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs">
                <span className="flex-1 font-medium capitalize">{provider}</span>
                <span className="tabular-nums text-muted-foreground">
                  {limit.usage.toLocaleString()} / {limit.maxTokens.toLocaleString()} tokens
                </span>
                <span className={`text-[10px] ${pct >= 100 ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                  {Math.round(pct)}%
                </span>
                <span className="text-muted-foreground">/ {limit.periodType}</span>
                <button
                  type="button"
                  className="ml-1 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemove(provider)}
                >
                  <XCircleIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2 items-end">
        <div className="grid gap-1">
          <Label className="text-xs">Provider</Label>
          <Select value={newProvider} onValueChange={setNewProvider}>
            <SelectTrigger className="h-8 text-xs w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {AI_PROVIDERS.map((p) => (
                <SelectItem key={p.value} value={p.value} className="text-xs">{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">Max tokens</Label>
          <Input
            type="number"
            min={1}
            placeholder="e.g. 50000"
            className="h-8 text-xs w-28"
            value={newMax}
            onChange={(e) => setNewMax(e.target.value)}
          />
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">Period</Label>
          <Select value={newPeriod} onValueChange={(v) => setNewPeriod(v as PeriodType)}>
            <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="day" className="text-xs">Daily</SelectItem>
              <SelectItem value="month" className="text-xs">Monthly</SelectItem>
              <SelectItem value="lifetime" className="text-xs">Absolute</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="button" size="sm" className="h-8 gap-1 px-2.5" onClick={add} disabled={!newMax}>
          <PlusIcon className="h-3.5 w-3.5" /> Add
        </Button>
      </div>
    </>
  );
}

// ── Worker & Agent Permissions Table ─────────────────────────────────────────

function WorkerPermRow({
  quota,
  onSave,
  onReset,
}: {
  quota: UserQuota;
  onSave: (clientId: string, workers: boolean, agents: boolean) => Promise<void>;
  onReset: (clientId: string) => void;
}) {
  const [workers, setWorkers] = React.useState(quota.workerPermissions!.canCallWorkers);
  const [agents, setAgents] = React.useState(quota.workerPermissions!.canCallAgents);
  const [saving, setSaving] = React.useState(false);

  const toggle = async (field: "workers" | "agents", value: boolean) => {
    const newW = field === "workers" ? value : workers;
    const newA = field === "agents" ? value : agents;
    if (field === "workers") setWorkers(value); else setAgents(value);
    setSaving(true);
    try { await onSave(quota.clientId, newW, newA); } finally { setSaving(false); }
  };

  return (
    <tr className="border-b hover:bg-muted/30">
      <td className="py-2.5 px-4 font-mono text-xs max-w-[200px] truncate" title={quota.clientId}>
        {quota.clientId}
      </td>
      <td className="py-2.5 px-4">
        <div className="flex items-center gap-2">
          <Switch checked={workers} onCheckedChange={(v) => toggle("workers", v)} disabled={saving} />
          <span className={`text-[10px] font-medium ${workers ? "text-green-700 dark:text-green-400" : "text-destructive"}`}>
            {workers ? "allowed" : "blocked"}
          </span>
        </div>
      </td>
      <td className="py-2.5 px-4">
        <div className="flex items-center gap-2">
          <Switch checked={agents} onCheckedChange={(v) => toggle("agents", v)} disabled={saving} />
          <span className={`text-[10px] font-medium ${agents ? "text-green-700 dark:text-green-400" : "text-destructive"}`}>
            {agents ? "allowed" : "blocked"}
          </span>
        </div>
      </td>
      <td className="py-2.5 px-4 text-right">
        {saving && <Loader2Icon className="h-3.5 w-3.5 animate-spin text-muted-foreground inline mr-2" />}
        <Button
          variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"
          title="Reset to defaults (allow all)"
          onClick={() => onReset(quota.clientId)}
        >
          <RefreshCwIcon className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  );
}

function WorkerAgentTable({
  quotas,
  allClientIds,
  refetch,
}: {
  quotas: UserQuota[];
  allClientIds: string[];
  refetch: () => void;
}) {
  const usersWithPerms = quotas.filter((q) => q.workerPermissions);
  const [addUser, setAddUser] = React.useState("");
  const [addWorkers, setAddWorkers] = React.useState(true);
  const [addAgents, setAddAgents] = React.useState(true);
  const [addSaving, setAddSaving] = React.useState(false);

  const savePerms = async (clientId: string, workers: boolean, agents: boolean) => {
    await fetch("/api/admin/user-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "worker_permissions", clientId, canCallWorkers: workers, canCallAgents: agents }),
    });
    refetch();
  };

  const resetPerms = async (clientId: string) => {
    await savePerms(clientId, true, true);
  };

  const addNew = async () => {
    if (!addUser) return;
    setAddSaving(true);
    try {
      await savePerms(addUser, addWorkers, addAgents);
      setAddUser("");
      setAddWorkers(true);
      setAddAgents(true);
    } finally {
      setAddSaving(false);
    }
  };

  const usedIds = new Set(usersWithPerms.map((q) => q.clientId));
  const availableIds = allClientIds.filter((id) => !usedIds.has(id));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <HammerIcon className="h-4 w-4" /> Worker & Agent Access
        </CardTitle>
        <CardDescription>
          Toggle whether users can trigger workflow workers or call AI agents. Users not listed are allowed by default.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {usersWithPerms.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No explicit permissions set — all users allowed by default.
          </p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2 px-4 font-medium">Client ID</th>
                  <th className="py-2 px-4 font-medium">
                    <span className="flex items-center gap-1"><HammerIcon className="h-3 w-3" /> Workers</span>
                  </th>
                  <th className="py-2 px-4 font-medium">
                    <span className="flex items-center gap-1"><BotIcon className="h-3 w-3" /> Agents</span>
                  </th>
                  <th className="py-2 px-4 font-medium text-right">Reset</th>
                </tr>
              </thead>
              <tbody>
                {usersWithPerms.map((q) => (
                  <WorkerPermRow key={q.clientId} quota={q} onSave={savePerms} onReset={resetPerms} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add new user */}
        <div className="border-t px-4 py-3 flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">Set permissions for a user</p>
          <div className="flex flex-wrap gap-2 items-end">
            <div className="grid gap-1">
              <Label className="text-xs">User</Label>
              <Select value={addUser} onValueChange={setAddUser}>
                <SelectTrigger className="h-8 text-xs w-52">
                  <SelectValue placeholder="Select user…" />
                </SelectTrigger>
                <SelectContent>
                  {availableIds.map((id) => (
                    <SelectItem key={id} value={id} className="font-mono text-xs">{id}</SelectItem>
                  ))}
                  {availableIds.length === 0 && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">All users already configured.</div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label className="text-xs">Workers</Label>
              <div className="flex items-center gap-1.5 h-8">
                <Switch checked={addWorkers} onCheckedChange={setAddWorkers} />
                <span className="text-xs text-muted-foreground">{addWorkers ? "allowed" : "blocked"}</span>
              </div>
            </div>
            <div className="grid gap-1">
              <Label className="text-xs">Agents</Label>
              <div className="flex items-center gap-1.5 h-8">
                <Switch checked={addAgents} onCheckedChange={setAddAgents} />
                <span className="text-xs text-muted-foreground">{addAgents ? "allowed" : "blocked"}</span>
              </div>
            </div>
            <Button size="sm" className="h-8 gap-1 px-3" onClick={addNew} disabled={!addUser || addSaving}>
              {addSaving ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <PlusIcon className="h-3.5 w-3.5" />}
              Apply
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Lambda Config Table ───────────────────────────────────────────────────────

function LambdaConfigTable({
  quotas,
  allClientIds,
  refetch,
}: {
  quotas: UserQuota[];
  allClientIds: string[];
  refetch: () => void;
}) {
  const usersWithConfig = quotas.filter((q) => q.renderConfig);
  const [expandedUser, setExpandedUser] = React.useState<string | null>(null);
  const [editConfig, setEditConfig] = React.useState<RenderConfigLimits>(DEFAULT_RENDER_CONFIG);
  const [saving, setSaving] = React.useState(false);

  const [addUser, setAddUser] = React.useState("");
  const [addExpanded, setAddExpanded] = React.useState(false);
  const [addConfig, setAddConfig] = React.useState<RenderConfigLimits>(DEFAULT_RENDER_CONFIG);
  const [addSaving, setAddSaving] = React.useState(false);

  const saveConfig = async (clientId: string, config: RenderConfigLimits | null) => {
    await fetch("/api/admin/user-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "render_config", clientId, config }),
    });
    refetch();
  };

  const startEdit = (q: UserQuota) => {
    setExpandedUser(q.clientId);
    setEditConfig({ ...q.renderConfig! });
  };

  const cancelEdit = () => setExpandedUser(null);

  const commitEdit = async (clientId: string) => {
    setSaving(true);
    try {
      await saveConfig(clientId, editConfig);
      setExpandedUser(null);
    } finally {
      setSaving(false);
    }
  };

  const removeConfig = async (clientId: string) => {
    if (!confirm(`Remove Lambda config limits for ${clientId}?`)) return;
    await saveConfig(clientId, null);
  };

  const commitAdd = async () => {
    if (!addUser) return;
    setAddSaving(true);
    try {
      await saveConfig(addUser, addConfig);
      setAddUser("");
      setAddExpanded(false);
      setAddConfig(DEFAULT_RENDER_CONFIG);
    } finally {
      setAddSaving(false);
    }
  };

  const usedIds = new Set(usersWithConfig.map((q) => q.clientId));
  const availableIds = allClientIds.filter((id) => !usedIds.has(id));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <CpuIcon className="h-4 w-4" /> Lambda Config Limits
        </CardTitle>
        <CardDescription>
          Restrict the Lambda configurations (memory, timeout, concurrency, disk, presets) a user can request.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {usersWithConfig.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No config restrictions set — all users use default Lambda settings.
          </p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2 px-4 font-medium">Client ID</th>
                  <th className="py-2 px-4 font-medium">Max Memory</th>
                  <th className="py-2 px-4 font-medium">Max Timeout</th>
                  <th className="py-2 px-4 font-medium">Concurrency</th>
                  <th className="py-2 px-4 font-medium">Presets</th>
                  <th className="py-2 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersWithConfig.map((q) => (
                  <React.Fragment key={q.clientId}>
                    <tr className="border-b hover:bg-muted/30">
                      <td className="py-2.5 px-4 font-mono text-xs max-w-[160px] truncate" title={q.clientId}>
                        {q.clientId}
                      </td>
                      <td className="py-2.5 px-4 text-xs">
                        {RENDER_MEMORY_OPTIONS.find((o) => o.value === q.renderConfig!.maxMemoryMb)?.label ?? `${q.renderConfig!.maxMemoryMb} MB`}
                      </td>
                      <td className="py-2.5 px-4 text-xs">
                        {RENDER_TIMEOUT_OPTIONS.find((o) => o.value === q.renderConfig!.maxTimeoutSeconds)?.label ?? `${q.renderConfig!.maxTimeoutSeconds}s`}
                      </td>
                      <td className="py-2.5 px-4 text-xs">{q.renderConfig!.maxConcurrency}</td>
                      <td className="py-2.5 px-4 text-xs">
                        {q.renderConfig!.allowedPresets?.length
                          ? <span className="text-muted-foreground">{q.renderConfig!.allowedPresets.join(", ")}</span>
                          : <span className="text-muted-foreground italic">all</span>}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7"
                            title={expandedUser === q.clientId ? "Collapse" : "Edit"}
                            onClick={() => expandedUser === q.clientId ? cancelEdit() : startEdit(q)}
                          >
                            <PencilIcon className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => removeConfig(q.clientId)}
                          >
                            <Trash2Icon className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {expandedUser === q.clientId && (
                      <tr className="border-b">
                        <td colSpan={6} className="p-0">
                          <div className="bg-muted/20 px-4 pb-4 pt-3 flex flex-col gap-3">
                            <RenderAdvancedSection config={editConfig} onChange={setEditConfig} />
                            <div className="flex gap-2 pt-1">
                              <Button size="sm" onClick={() => commitEdit(q.clientId)} disabled={saving}>
                                {saving && <Loader2Icon className="mr-2 h-3.5 w-3.5 animate-spin" />}
                                Save
                              </Button>
                              <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add new user */}
        <div className="border-t px-4 py-3 flex flex-col gap-3">
          <p className="text-xs font-medium text-muted-foreground">Add limits for a user</p>
          <div className="flex gap-2 items-end">
            <div className="grid gap-1">
              <Label className="text-xs">User</Label>
              <Select
                value={addUser}
                onValueChange={(v) => { setAddUser(v); setAddExpanded(true); setAddConfig(DEFAULT_RENDER_CONFIG); }}
              >
                <SelectTrigger className="h-8 text-xs w-52">
                  <SelectValue placeholder="Select user…" />
                </SelectTrigger>
                <SelectContent>
                  {availableIds.map((id) => (
                    <SelectItem key={id} value={id} className="font-mono text-xs">{id}</SelectItem>
                  ))}
                  {availableIds.length === 0 && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">All users already have limits.</div>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          {addExpanded && addUser && (
            <div className="rounded-md border p-3 flex flex-col gap-3 bg-muted/10">
              <RenderAdvancedSection config={addConfig} onChange={setAddConfig} />
              <div className="flex gap-2">
                <Button size="sm" onClick={commitAdd} disabled={addSaving}>
                  {addSaving && <Loader2Icon className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  Save limits
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setAddExpanded(false); setAddUser(""); }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── AI Provider Limits Table ──────────────────────────────────────────────────

function AiProviderLimitsTable({
  quotas,
  allClientIds,
  refetch,
}: {
  quotas: UserQuota[];
  allClientIds: string[];
  refetch: () => void;
}) {
  type ProviderRow = { clientId: string; provider: string; limit: AiProviderLimit };
  const rows: ProviderRow[] = quotas.flatMap((q) =>
    Object.entries(q.aiProviders ?? {}).map(([provider, limit]) => ({ clientId: q.clientId, provider, limit }))
  );

  const [addUser, setAddUser] = React.useState("");
  const [addProvider, setAddProvider] = React.useState("anthropic");
  const [addMax, setAddMax] = React.useState("");
  const [addPeriod, setAddPeriod] = React.useState<PeriodType>("month");
  const [addSaving, setAddSaving] = React.useState(false);

  const addLimit = async () => {
    if (!addUser || !addMax || parseInt(addMax) < 1) return;
    setAddSaving(true);
    try {
      await fetch("/api/admin/user-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "ai_provider", clientId: addUser, provider: addProvider, maxTokens: parseInt(addMax), periodType: addPeriod }),
      });
      refetch();
      setAddMax("");
    } finally {
      setAddSaving(false);
    }
  };

  const removeLimit = async (clientId: string, provider: string) => {
    await fetch("/api/admin/user-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "remove_ai_provider", clientId, provider }),
    });
    refetch();
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ZapIcon className="h-4 w-4" /> AI Provider Token Limits
        </CardTitle>
        <CardDescription>
          Per-provider token quotas independent of the global AI limit. A provider is blocked when it reaches its own limit.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No provider-level limits configured.
          </p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2 px-4 font-medium">Client ID</th>
                  <th className="py-2 px-4 font-medium">Provider</th>
                  <th className="py-2 px-4 font-medium">Usage / Max tokens</th>
                  <th className="py-2 px-4 font-medium">Period</th>
                  <th className="py-2 px-4 font-medium text-right">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => {
                  const pct = Math.min(100, (r.limit.usage / r.limit.maxTokens) * 100);
                  const atCap = pct >= 100;
                  return (
                    <tr key={`${r.clientId}-${r.provider}`} className="hover:bg-muted/30">
                      <td className="py-2.5 px-4 font-mono text-xs max-w-[160px] truncate" title={r.clientId}>
                        {r.clientId}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="rounded px-1.5 py-0.5 text-[10px] bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20 capitalize">
                          {r.provider}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 min-w-[180px]">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className={atCap ? "text-destructive font-medium" : "text-muted-foreground"}>
                              {r.limit.usage.toLocaleString()} / {r.limit.maxTokens.toLocaleString()}
                            </span>
                            <span className={atCap ? "text-destructive font-medium" : "text-muted-foreground"}>
                              {Math.round(pct)}%
                            </span>
                          </div>
                          <Progress
                            value={pct}
                            className={`h-1 ${atCap ? "[&>div]:bg-destructive" : pct >= 80 ? "[&>div]:bg-amber-500" : ""}`}
                          />
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-xs capitalize">{r.limit.periodType}</td>
                      <td className="py-2.5 px-4 text-right">
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeLimit(r.clientId, r.provider)}
                        >
                          <Trash2Icon className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Add new provider limit */}
        <div className="border-t px-4 py-3 flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">Add provider limit</p>
          <div className="flex flex-wrap gap-2 items-end">
            <div className="grid gap-1">
              <Label className="text-xs">User</Label>
              <Select value={addUser} onValueChange={setAddUser}>
                <SelectTrigger className="h-8 text-xs w-44">
                  <SelectValue placeholder="Select user…" />
                </SelectTrigger>
                <SelectContent>
                  {allClientIds.map((id) => (
                    <SelectItem key={id} value={id} className="font-mono text-xs">{id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label className="text-xs">Provider</Label>
              <Select value={addProvider} onValueChange={setAddProvider}>
                <SelectTrigger className="h-8 text-xs w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AI_PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value} className="text-xs">{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1">
              <Label className="text-xs">Max tokens</Label>
              <Input
                type="number" min={1} placeholder="e.g. 50000"
                className="h-8 text-xs w-28"
                value={addMax}
                onChange={(e) => setAddMax(e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-xs">Period</Label>
              <Select value={addPeriod} onValueChange={(v) => setAddPeriod(v as PeriodType)}>
                <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="day" className="text-xs">Daily</SelectItem>
                  <SelectItem value="month" className="text-xs">Monthly</SelectItem>
                  <SelectItem value="lifetime" className="text-xs">Absolute</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" className="h-8 gap-1 px-3" onClick={addLimit} disabled={!addUser || !addMax || addSaving}>
              {addSaving ? <Loader2Icon className="h-3.5 w-3.5 animate-spin" /> : <PlusIcon className="h-3.5 w-3.5" />}
              Add
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Permissions Tab ───────────────────────────────────────────────────────────

function PermissionsTab({
  quotas,
  allClientIds,
  refetch,
}: {
  quotas: UserQuota[];
  allClientIds: string[];
  refetch: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 mt-4">
      <WorkerAgentTable quotas={quotas} allClientIds={allClientIds} refetch={refetch} />
      <LambdaConfigTable quotas={quotas} allClientIds={allClientIds} refetch={refetch} />
      <AiProviderLimitsTable quotas={quotas} allClientIds={allClientIds} refetch={refetch} />
    </div>
  );
}

// ── Admin Quota Editor ────────────────────────────────────────────────────────

function AdminQuotaEditor({
  open,
  onOpenChange,
  initial,
  initialQuota,
  allClientIds,
  onSaved,
  forcedClientId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: { clientId: string; platform: Platform; limit?: PlatformLimit };
  initialQuota?: UserQuota;
  allClientIds: string[];
  onSaved: () => void;
  forcedClientId?: string;
}) {
  const isEdit = !!initial?.limit;
  const [clientId, setClientId] = React.useState(forcedClientId ?? (initial?.clientId ?? ""));
  const [platform, setPlatform] = React.useState<Platform>(initial?.platform ?? "render");
  const [isUnlimited, setIsUnlimited] = React.useState(initial?.limit?.isUnlimited ?? false);
  const [maxPerPeriod, setMaxPerPeriod] = React.useState(initial?.limit?.maxPerPeriod?.toString() ?? "");
  const [periodType, setPeriodType] = React.useState<PeriodType>(initial?.limit?.periodType ?? "month");
  const [isActive, setIsActive] = React.useState(initial?.limit?.isActive ?? true);
  const [resetUsage, setResetUsage] = React.useState(false);
  const [note, setNote] = React.useState("");

  // Advanced: render config
  const [renderConfig, setRenderConfig] = React.useState<RenderConfigLimits>(
    initialQuota?.renderConfig ?? DEFAULT_RENDER_CONFIG
  );
  const [renderConfigEnabled, setRenderConfigEnabled] = React.useState(!!initialQuota?.renderConfig);

  // Advanced: AI providers
  const [aiProviders, setAiProviders] = React.useState<Record<string, AiProviderLimit>>(
    initialQuota?.aiProviders ?? {}
  );
  const [pendingProviderOps, setPendingProviderOps] = React.useState<
    Array<{ op: "add"; provider: string; maxTokens: number; periodType: PeriodType } | { op: "remove"; provider: string }>
  >([]);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      const targetClientId = forcedClientId ?? (initial?.clientId ?? "");
      setClientId(targetClientId);
      setPlatform(initial?.platform ?? "render");
      setIsUnlimited(initial?.limit?.isUnlimited ?? false);
      setMaxPerPeriod(initial?.limit?.maxPerPeriod?.toString() ?? "");
      setPeriodType(initial?.limit?.periodType ?? "month");
      setIsActive(initial?.limit?.isActive ?? true);
      setResetUsage(false);
      setNote("");
      setRenderConfig(initialQuota?.renderConfig ?? DEFAULT_RENDER_CONFIG);
      setRenderConfigEnabled(!!initialQuota?.renderConfig);
      setAiProviders(initialQuota?.aiProviders ?? {});
      setPendingProviderOps([]);
      setError(null);
    }
  }, [open, initial, initialQuota, forcedClientId]);

  const handleAddProvider = (provider: string, maxTokens: number, pt: PeriodType) => {
    // Optimistically update local display
    setAiProviders((prev) => ({
      ...prev,
      [provider]: { maxTokens, usage: prev[provider]?.usage ?? 0, periodType: pt, currentPeriodStart: new Date().toISOString() },
    }));
    setPendingProviderOps((prev) => [...prev.filter((o) => !(o.op === "add" && o.provider === provider)), { op: "add", provider, maxTokens, periodType: pt }]);
  };

  const handleRemoveProvider = (provider: string) => {
    setAiProviders((prev) => { const n = { ...prev }; delete n[provider]; return n; });
    setPendingProviderOps((prev) => [...prev.filter((o) => o.provider !== provider), { op: "remove", provider }]);
  };

  const save = async () => {
    const targetClientId = forcedClientId ?? (isEdit ? initial!.clientId : clientId.trim());
    if (!targetClientId) { setError("Client ID is required"); return; }
    if (!isUnlimited && (!maxPerPeriod || parseInt(maxPerPeriod) < 0)) {
      setError("Max per period required when not unlimited");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // 1. Save the platform limit
      const res = await fetch("/api/admin/quotas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: targetClientId,
          platform: isEdit ? initial!.platform : platform,
          isUnlimited,
          maxPerPeriod: isUnlimited ? undefined : parseInt(maxPerPeriod),
          periodType,
          isActive,
          note: note.trim() || undefined,
          resetUsage,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Save failed"); return; }

      // 2. Save render config (if render platform)
      const effectivePlatform = isEdit ? initial!.platform : platform;
      if (effectivePlatform === "render") {
        await fetch("/api/admin/user-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "render_config",
            clientId: targetClientId,
            config: renderConfigEnabled ? renderConfig : null,
          }),
        });
      }

      // 3. Apply pending AI provider ops (if AI platform)
      if (effectivePlatform === "ai") {
        for (const op of pendingProviderOps) {
          if (op.op === "add") {
            await fetch("/api/admin/user-config", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ type: "ai_provider", clientId: targetClientId, provider: op.provider, maxTokens: op.maxTokens, periodType: op.periodType }),
            });
          } else {
            await fetch("/api/admin/user-config", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ type: "remove_ai_provider", clientId: targetClientId, provider: op.provider }),
            });
          }
        }
      }

      onOpenChange(false);
      onSaved();
    } finally {
      setLoading(false);
    }
  };

  const effectivePlatform = isEdit ? initial!.platform : platform;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit quota" : "Grant quota"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Update ${PLATFORM_LABELS[initial!.platform]} limit for ${initial!.clientId}`
              : "Set a per-platform limit for a user."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* User picker (only when adding new and no forced user) */}
          {!isEdit && !forcedClientId && (
            <div className="grid gap-1.5">
              <Label>User</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user…" />
                </SelectTrigger>
                <SelectContent>
                  {allClientIds.length === 0 ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">No users found.</div>
                  ) : (
                    allClientIds.map((id) => (
                      <SelectItem key={id} value={id} className="font-mono text-xs">{id}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Platform picker (only when adding new) */}
          {!isEdit && (
            <div className="grid gap-1.5">
              <Label>Platform</Label>
              <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_PLATFORMS.map((p) => (
                    <SelectItem key={p} value={p}>{PLATFORM_LABELS[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Unlimited */}
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <div>
              <p className="text-sm font-medium flex items-center gap-2"><InfinityIcon className="h-4 w-4" /> Unlimited</p>
              <p className="text-xs text-muted-foreground">No cap on {PLATFORM_UNIT[effectivePlatform]}</p>
            </div>
            <Switch checked={isUnlimited} onCheckedChange={setIsUnlimited} />
          </div>

          {!isUnlimited && (
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Max {PLATFORM_UNIT[effectivePlatform]}</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder={effectivePlatform === "ai" ? "e.g. 100000" : "e.g. 100"}
                  value={maxPerPeriod}
                  onChange={(e) => setMaxPerPeriod(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Reset period</Label>
                <Select value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Daily</SelectItem>
                    <SelectItem value="month">Monthly</SelectItem>
                    <SelectItem value="lifetime">Absolute (no reset)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Active */}
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">Toggle off to suspend without deleting</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {/* Reset usage (edit mode) */}
          {isEdit && (
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Reset usage counter</p>
                <p className="text-xs text-muted-foreground">Set current usage back to 0 immediately</p>
              </div>
              <Switch checked={resetUsage} onCheckedChange={setResetUsage} />
            </div>
          )}

          <div className="grid gap-1.5">
            <Label>Note (visible to user)</Label>
            <Input placeholder="Optional…" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          {/* ── Advanced: Render Lambda config ── */}
          {effectivePlatform === "render" && (
            <AdvancedSection title="Lambda config limits" icon={<CpuIcon className="h-4 w-4" />}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium">Enable custom limits</p>
                  <p className="text-xs text-muted-foreground">Restrict Lambda memory, timeout, presets</p>
                </div>
                <Switch checked={renderConfigEnabled} onCheckedChange={setRenderConfigEnabled} />
              </div>
              {renderConfigEnabled && (
                <RenderAdvancedSection config={renderConfig} onChange={setRenderConfig} />
              )}
            </AdvancedSection>
          )}

          {/* ── Advanced: AI provider limits ── */}
          {effectivePlatform === "ai" && (
            <AdvancedSection title="Per-provider token limits" icon={<ZapIcon className="h-4 w-4" />}>
              <AiProvidersSection
                providers={aiProviders}
                onAdd={handleAddProvider}
                onRemove={handleRemoveProvider}
              />
            </AdvancedSection>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={loading}>
            {loading && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? "Save" : "Grant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ApproveRequestDialog({
  request,
  onDone,
  open,
  onOpenChange,
}: {
  request: QuotaRequest;
  onDone: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isUnlimited, setIsUnlimited] = React.useState(false);
  const [maxPerPeriod, setMaxPerPeriod] = React.useState(request.requestedLimit?.toString() ?? "");
  const [periodType, setPeriodType] = React.useState<PeriodType>(request.requestedPeriod ?? "month");
  const [reviewNote, setReviewNote] = React.useState("");
  const [resetUsage, setResetUsage] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setIsUnlimited(false);
      setMaxPerPeriod(request.requestedLimit?.toString() ?? "");
      setPeriodType(request.requestedPeriod ?? "month");
      setReviewNote("");
      setResetUsage(true);
      setError(null);
    }
  }, [open, request]);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/quota-requests/${request._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          isUnlimited,
          maxPerPeriod: isUnlimited ? undefined : (maxPerPeriod ? parseInt(maxPerPeriod) : undefined),
          periodType,
          reviewNote: reviewNote.trim() || undefined,
          resetUsage,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed"); return; }
      onOpenChange(false);
      onDone();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Approve {PLATFORM_LABELS[request.platform]} request</DialogTitle>
          <DialogDescription>
            For <span className="font-mono text-xs">{request.requesterId}</span>.
            {request.requestedLimit && (
              <> They asked for <strong>{request.requestedLimit}</strong> / {request.requestedPeriod ?? "month"}.</>
            )}
            {" "}You can grant a custom amount.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <div className="text-sm font-medium flex items-center gap-2"><InfinityIcon className="h-4 w-4" /> Grant unlimited</div>
            <Switch checked={isUnlimited} onCheckedChange={setIsUnlimited} />
          </div>
          {!isUnlimited && (
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Max {PLATFORM_UNIT[request.platform]}</Label>
                <Input
                  type="number"
                  min={1}
                  value={maxPerPeriod}
                  onChange={(e) => setMaxPerPeriod(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Reset period</Label>
                <Select value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Daily</SelectItem>
                    <SelectItem value="month">Monthly</SelectItem>
                    <SelectItem value="lifetime">Absolute (no reset)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Reset usage to 0</p>
              <p className="text-xs text-muted-foreground">Fresh start for the new limit</p>
            </div>
            <Switch checked={resetUsage} onCheckedChange={setResetUsage} />
          </div>
          <div className="grid gap-1.5">
            <Label>Note to user (optional)</Label>
            <Input
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="Shown to the user…"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={loading}>
            {loading && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
            Approve & apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RejectRequestButton({ request, onDone }: { request: QuotaRequest; onDone: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await fetch(`/api/admin/quota-requests/${request._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", reviewNote: note.trim() || undefined }),
      });
      setOpen(false);
      onDone();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="gap-1 text-destructive border-destructive/40 hover:bg-destructive/10"
        onClick={() => setOpen(true)}
      >
        <XCircleIcon className="h-3.5 w-3.5" /> Reject
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject request</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Reason (shown to user)…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={submit} disabled={loading}>
              {loading && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AdminView() {
  const { quotas, requests, allClientIds, loading, refetch } = useAdminData(true);
  const [search, setSearch] = React.useState("");
  const [filterPlatform, setFilterPlatform] = React.useState<"all" | Platform>("all");
  const [editorState, setEditorState] = React.useState<
    { open: boolean; initial?: { clientId: string; platform: Platform; limit?: PlatformLimit }; initialQuota?: UserQuota }
  >({ open: false });
  const [approveTarget, setApproveTarget] = React.useState<QuotaRequest | null>(null);
  const pending = requests.filter((r) => r.status === "pending");
  const history = requests.filter((r) => r.status !== "pending");

  // Flatten quotas → per-platform rows
  type Row = { clientId: string; platform: Platform; limit: PlatformLimit; note?: string; quota: UserQuota };
  const rows: Row[] = quotas.flatMap((q) =>
    Object.entries(q.platforms).map(([p, limit]) => ({
      clientId: q.clientId,
      platform: p as Platform,
      limit: limit!,
      note: q.note,
      quota: q,
    })),
  );
  const filteredRows = rows.filter((r) => {
    if (filterPlatform !== "all" && r.platform !== filterPlatform) return false;
    if (search && !r.clientId.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalUsers = new Set(rows.map((r) => r.clientId)).size;
  const atCap = rows.filter((r) => !r.limit.isUnlimited && r.limit.maxPerPeriod !== undefined && r.limit.usage >= r.limit.maxPerPeriod).length;
  const unlimitedCount = rows.filter((r) => r.limit.isUnlimited).length;

  const deletePlatform = async (clientId: string, platform: Platform) => {
    if (!confirm(`Remove ${PLATFORM_LABELS[platform]} access for ${clientId}?`)) return;
    await fetch(`/api/admin/quotas/${encodeURIComponent(clientId)}?platform=${platform}`, { method: "DELETE" });
    refetch();
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header & primary actions */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShieldIcon className="h-5 w-5" /> Admin controls
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Set quotas, control resets, and review user requests across all platforms.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="gap-2" onClick={() => setEditorState({ open: true })}>
            <UserPlusIcon className="h-4 w-4" /> Grant quota
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Users with quotas</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{totalUsers}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Unlimited grants</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{unlimitedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={atCap > 0 ? "border-destructive/40" : ""}>
          <CardHeader className="pb-1">
            <CardDescription>At capacity</CardDescription>
            <CardTitle className={`text-2xl tabular-nums ${atCap > 0 ? "text-destructive" : ""}`}>{atCap}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={pending.length > 0 ? "border-amber-500/50" : ""}>
          <CardHeader className="pb-1">
            <CardDescription>Pending requests</CardDescription>
            <CardTitle className={`text-2xl tabular-nums ${pending.length > 0 ? "text-amber-600 dark:text-amber-400" : ""}`}>
              {pending.length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="quotas">
        <TabsList>
          <TabsTrigger value="quotas">User Quotas ({rows.length})</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="requests" className="gap-2">
            Requests
            {pending.length > 0 && (
              <span className="rounded-full bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 leading-none">
                {pending.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Quotas tab ── */}
        <TabsContent value="quotas" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  placeholder="Search by client ID…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="max-w-xs h-8 text-sm"
                />
                <Select value={filterPlatform} onValueChange={(v) => setFilterPlatform(v as any)}>
                  <SelectTrigger className="w-40 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All platforms</SelectItem>
                    {ALL_PLATFORMS.map((p) => (
                      <SelectItem key={p} value={p}>{PLATFORM_LABELS[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" className="ml-auto gap-2 text-muted-foreground" onClick={refetch} disabled={loading}>
                  {loading ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <RefreshCwIcon className="h-4 w-4" />}
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading && (
                <div className="px-6 pb-6"><Skeleton className="h-40 w-full rounded-md" /></div>
              )}
              {!loading && filteredRows.length === 0 && (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  {search || filterPlatform !== "all" ? "No matches." : "No quotas configured yet."}
                </p>
              )}
              {!loading && filteredRows.length > 0 && (
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr className="text-left text-xs text-muted-foreground">
                        <th className="py-2 px-4 font-medium">Client ID</th>
                        <th className="py-2 px-4 font-medium">Platform</th>
                        <th className="py-2 px-4 font-medium">Status</th>
                        <th className="py-2 px-4 font-medium">Limit</th>
                        <th className="py-2 px-4 font-medium">Usage</th>
                        <th className="py-2 px-4 font-medium">Period</th>
                        <th className="py-2 px-4 font-medium">Advanced</th>
                        <th className="py-2 px-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredRows.map((r) => {
                        const pct = usagePct(r.limit);
                        const atCapacity = pct !== null && pct >= 100;
                        const hasRenderConfig = r.platform === "render" && !!r.quota.renderConfig;
                        const hasProviderLimits = r.platform === "ai" && !!r.quota.aiProviders && Object.keys(r.quota.aiProviders).length > 0;
                        const hasWorkerPerms = !!r.quota.workerPermissions;
                        return (
                          <tr key={`${r.clientId}-${r.platform}`} className="hover:bg-muted/30">
                            <td className="py-2.5 px-4 font-mono text-xs max-w-[160px] truncate" title={r.clientId}>
                              {r.clientId}
                            </td>
                            <td className="py-2.5 px-4">
                              <Badge variant="outline" className="text-[10px]">{PLATFORM_LABELS[r.platform]}</Badge>
                            </td>
                            <td className="py-2.5 px-4">
                              <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                r.limit.isActive ? "bg-green-500/15 text-green-700 dark:text-green-400" : "bg-muted text-muted-foreground"
                              }`}>
                                {r.limit.isActive ? "active" : "suspended"}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-xs">
                              {r.limit.isUnlimited ? (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <InfinityIcon className="h-3 w-3" /> unlimited
                                </span>
                              ) : (
                                r.limit.maxPerPeriod?.toLocaleString() ?? "—"
                              )}
                            </td>
                            <td className="py-2.5 px-4 min-w-[120px]">
                              {r.limit.isUnlimited ? (
                                <span className="text-xs text-muted-foreground">{r.limit.usage} used</span>
                              ) : pct !== null ? (
                                <div className="space-y-1">
                                  <div className="flex justify-between text-[11px] text-muted-foreground">
                                    <span>{r.limit.usage}/{r.limit.maxPerPeriod}</span>
                                    <span className={atCapacity ? "text-destructive font-medium" : ""}>{Math.round(pct)}%</span>
                                  </div>
                                  <Progress
                                    value={pct}
                                    className={`h-1 ${atCapacity ? "[&>div]:bg-destructive" : pct >= 80 ? "[&>div]:bg-amber-500" : ""}`}
                                  />
                                </div>
                              ) : "—"}
                            </td>
                            <td className="py-2.5 px-4 text-xs capitalize">{r.limit.periodType}</td>
                            <td className="py-2.5 px-4">
                              <div className="flex flex-wrap gap-1">
                                {hasRenderConfig && (
                                  <span className="rounded px-1.5 py-0.5 text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 flex items-center gap-0.5">
                                    <CpuIcon className="h-2.5 w-2.5" /> λ limits
                                  </span>
                                )}
                                {hasProviderLimits && (
                                  <span className="rounded px-1.5 py-0.5 text-[10px] bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20 flex items-center gap-0.5">
                                    <ZapIcon className="h-2.5 w-2.5" /> {Object.keys(r.quota.aiProviders!).length} providers
                                  </span>
                                )}
                                {hasWorkerPerms && (
                                  <span className={`rounded px-1.5 py-0.5 text-[10px] border flex items-center gap-0.5 ${
                                    r.quota.workerPermissions!.canCallWorkers && r.quota.workerPermissions!.canCallAgents
                                      ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
                                      : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                                  }`}>
                                    <HammerIcon className="h-2.5 w-2.5" /> perms
                                  </span>
                                )}
                                {!hasRenderConfig && !hasProviderLimits && !hasWorkerPerms && (
                                  <span className="text-[10px] text-muted-foreground">—</span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  title="Edit quota & advanced settings"
                                  onClick={() =>
                                    setEditorState({
                                      open: true,
                                      initial: { clientId: r.clientId, platform: r.platform, limit: r.limit },
                                      initialQuota: r.quota,
                                    })
                                  }
                                >
                                  <PencilIcon className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  onClick={() => deletePlatform(r.clientId, r.platform)}
                                >
                                  <Trash2Icon className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Permissions tab ── */}
        <TabsContent value="permissions">
          <PermissionsTab quotas={quotas} allClientIds={allClientIds} refetch={refetch} />
        </TabsContent>

        {/* ── Requests tab ── */}
        <TabsContent value="requests" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ClockIcon className="h-4 w-4 text-amber-500" />
                  Pending ({pending.length})
                </CardTitle>
                <CardDescription>Approve, custom-grant, or reject</CardDescription>
              </CardHeader>
              <CardContent>
                {loading && <Skeleton className="h-20 w-full rounded-md" />}
                {!loading && pending.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">No pending requests 🎉</p>
                )}
                <div className="divide-y">
                  {pending.map((r) => (
                    <div key={r._id} className="py-3 flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs">{PLATFORM_LABELS[r.platform]}</Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {r.type === "access" ? "new access" : "increase"}
                        </Badge>
                        <span className="font-mono text-xs">{r.requesterId}</span>
                        <span className="text-xs text-muted-foreground">{fmtDate(r.createdAt)}</span>
                      </div>
                      {r.message && <p className="text-sm text-muted-foreground">"{r.message}"</p>}
                      {r.requestedLimit && (
                        <p className="text-xs text-muted-foreground">
                          Asks for <strong>{r.requestedLimit.toLocaleString()} {PLATFORM_UNIT[r.platform]}</strong> / {r.requestedPeriod ?? "month"}
                        </p>
                      )}
                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-green-700 dark:text-green-400 border-green-500/40 hover:bg-green-500/10"
                          onClick={() => setApproveTarget(r)}
                        >
                          <CheckCircle2Icon className="h-3.5 w-3.5" /> Approve / custom
                        </Button>
                        <RejectRequestButton request={r} onDone={refetch} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">History</CardTitle>
                <CardDescription>All reviewed requests</CardDescription>
              </CardHeader>
              <CardContent>
                {loading && <Skeleton className="h-20 w-full rounded-md" />}
                {!loading && history.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">No history yet.</p>
                )}
                <div className="divide-y">
                  {history.map((r) => (
                    <div key={r._id} className="py-2.5 flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={r.status} />
                        <Badge variant="outline" className="text-[10px]">{PLATFORM_LABELS[r.platform]}</Badge>
                        <span className="font-mono text-xs">{r.requesterId}</span>
                        <span className="text-xs text-muted-foreground">{fmtDate(r.updatedAt)}</span>
                      </div>
                      {r.reviewNote && <p className="text-xs italic text-muted-foreground">"{r.reviewNote}"</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Editor modal */}
      <AdminQuotaEditor
        open={editorState.open}
        onOpenChange={(v) => setEditorState((s) => ({ ...s, open: v }))}
        initial={editorState.initial}
        initialQuota={editorState.initialQuota}
        allClientIds={allClientIds}
        onSaved={refetch}
      />

      {/* Approve modal */}
      {approveTarget && (
        <ApproveRequestDialog
          request={approveTarget}
          open={!!approveTarget}
          onOpenChange={(v) => !v && setApproveTarget(null)}
          onDone={refetch}
        />
      )}

    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//   ADMIN SELF VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function AdminSelfView({
  quota,
  myClientId,
  refetch,
}: {
  quota: UserQuota | null;
  myClientId: string;
  refetch: () => void;
}) {
  const [editorPlatform, setEditorPlatform] = React.useState<Platform | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <GaugeIcon className="h-4 w-4" /> Your usage
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            As an admin you have unlimited access by default. Optionally set your own limits below.
          </p>
        </div>
        <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 gap-1 hover:bg-green-500/20 ml-auto">
          <InfinityIcon className="h-3 w-3" /> unlimited by default
        </Badge>
      </div>

      {/* Per-platform cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {ALL_PLATFORMS.map((p) => {
          const limit = quota?.platforms?.[p];
          const pct = usagePct(limit);
          const used = limit?.usage ?? 0;
          const hasCustomLimit = !!limit;

          return (
            <Card key={p}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-medium">{PLATFORM_LABELS[p]}</CardTitle>
                    <CardDescription className="text-xs mt-0.5">{PLATFORM_DESCRIPTION[p]}</CardDescription>
                  </div>
                  {!hasCustomLimit || limit!.isUnlimited ? (
                    <Badge className="text-[10px] bg-green-500/15 text-green-700 dark:text-green-400 hover:bg-green-500/20 gap-1">
                      <InfinityIcon className="h-3 w-3" /> unlimited
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">per {limit!.periodType}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold tabular-nums">{used.toLocaleString()}</span>
                  {!hasCustomLimit || limit!.isUnlimited ? (
                    <span className="text-sm text-muted-foreground">{PLATFORM_UNIT[p]} used</span>
                  ) : (
                    <>
                      <span className="text-base text-muted-foreground">
                        / {limit!.maxPerPeriod?.toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground ml-0.5">{PLATFORM_UNIT[p]}</span>
                      {pct !== null && (
                        <span className="text-xs text-muted-foreground ml-auto">{pct.toFixed(0)}%</span>
                      )}
                    </>
                  )}
                </div>
                {hasCustomLimit && !limit!.isUnlimited && pct !== null && (
                  <Progress
                    value={pct}
                    className={`h-1.5 ${pct >= 100 ? "[&>div]:bg-destructive" : pct >= 80 ? "[&>div]:bg-amber-500" : ""}`}
                  />
                )}
                {hasCustomLimit && limit!.periodType !== "lifetime" && limit!.nextResetAt && (
                  <p className="text-[11px] text-muted-foreground">
                    Resets {fmtShortDate(limit!.nextResetAt)}
                  </p>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => setEditorPlatform(p)}
                >
                  <PencilIcon className="h-3.5 w-3.5" />
                  {hasCustomLimit ? "Edit my limit" : "Set my own limit (optional)"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {quota?.note && (
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <strong>Admin note:</strong> {quota.note}
        </div>
      )}

      {/* Self-editor */}
      {editorPlatform && (
        <AdminQuotaEditor
          open={!!editorPlatform}
          onOpenChange={(v) => !v && setEditorPlatform(null)}
          initial={{ clientId: myClientId, platform: editorPlatform, limit: quota?.platforms?.[editorPlatform] }}
          initialQuota={quota ?? undefined}
          allClientIds={myClientId ? [myClientId] : []}
          onSaved={refetch}
          forcedClientId={myClientId}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//   PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function QuotaPage() {
  const { quota, isAdmin, myClientId, requests, loading, refetch } = useMyQuota();

  return (
    <SidebarInset>
      <SiteHeader title={isAdmin ? "Quota — Admin" : "My Quotas"} />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">

            {loading && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
              </div>
            )}

            {!loading && !isAdmin && (
              <UserView quota={quota} requests={requests} refetch={refetch} />
            )}

            {!loading && isAdmin && (
              <>
                <AdminView />
                <Separator className="my-2" />
                <AdminSelfView quota={quota} myClientId={myClientId} refetch={refetch} />
              </>
            )}
          </div>
        </div>
      </div>
    </SidebarInset>
  );
}
