"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertOctagonIcon,
  ClockIcon,
  Loader2Icon,
  SendIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  GaugeIcon,
} from "lucide-react";

// ── Shared types ──────────────────────────────────────────────────────────────

export type Platform = "render" | "ai";
export type PeriodType = "day" | "month" | "lifetime";

const PLATFORM_LABELS: Record<Platform, string> = {
  render: "Render",
  ai: "AI Text",
};
const PLATFORM_UNIT: Record<Platform, string> = {
  render: "renders",
  ai: "tokens",
};

/**
 * Structured error returned by the server when a quota check fails.
 * Matches lib/quota-mongodb.ts → checkPlatform().detail
 */
export interface QuotaError {
  code: "NO_ACCESS" | "SUSPENDED" | "QUOTA_EXHAUSTED";
  platform: Platform;
  usage: number;
  max: number | null;
  periodType: PeriodType;
  nextResetAt: string | null;
}

/** Pulls a QuotaError out of a fetch response that returned 403 / 429. */
export async function extractQuotaError(res: Response): Promise<QuotaError | null> {
  if (res.status !== 403 && res.status !== 429) return null;
  try {
    const json = await res.clone().json();
    if (json?.quotaError && json.quotaError.platform) return json.quotaError as QuotaError;
  } catch {
    /* ignore */
  }
  return null;
}

// ── Reset countdown helpers ──────────────────────────────────────────────────

function timeUntil(iso: string): string {
  const target = new Date(iso).getTime();
  const now = Date.now();
  const ms = Math.max(0, target - now);
  const minutes = Math.floor(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days >= 1) return `${days} day${days === 1 ? "" : "s"}`;
  if (hours >= 1) return `${hours} hour${hours === 1 ? "" : "s"}`;
  if (minutes >= 1) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  return "less than a minute";
}

// ── Component ────────────────────────────────────────────────────────────────

export function QuotaExhaustedDialog({
  open,
  onOpenChange,
  quotaError,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  quotaError: QuotaError | null;
}) {
  const router = useRouter();
  const [message, setMessage] = React.useState("");
  const [requestedLimit, setRequestedLimit] = React.useState("");
  const [requestedPeriod, setRequestedPeriod] = React.useState<PeriodType>(
    quotaError?.periodType ?? "month",
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset the form when the dialog (re)opens or platform changes
  React.useEffect(() => {
    if (open) {
      setMessage("");
      setRequestedLimit("");
      setRequestedPeriod(quotaError?.periodType ?? "month");
      setSubmitted(false);
      setError(null);
    }
  }, [open, quotaError?.platform, quotaError?.periodType]);

  if (!quotaError) return null;

  const { platform, usage, max, periodType, nextResetAt, code } = quotaError;
  const willReset = periodType !== "lifetime" && nextResetAt;
  const pct = max ? Math.min(100, (usage / max) * 100) : 100;

  const headline = (() => {
    if (code === "NO_ACCESS")
      return `You don't have ${PLATFORM_LABELS[platform]} access yet`;
    if (code === "SUSPENDED")
      return `${PLATFORM_LABELS[platform]} access is suspended`;
    return `${PLATFORM_LABELS[platform]} quota exhausted`;
  })();

  const submit = async () => {
    setSubmitting(true);
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
      if (!res.ok) {
        setError(json.error ?? "Failed to submit");
        return;
      }
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertOctagonIcon className="h-5 w-5 text-destructive" />
            {headline}
          </DialogTitle>
          <DialogDescription>
            {code === "QUOTA_EXHAUSTED"
              ? `You've used all ${max?.toLocaleString() ?? "your"} ${PLATFORM_UNIT[platform]} for this ${periodType}.`
              : code === "SUSPENDED"
              ? `An admin has temporarily suspended ${PLATFORM_LABELS[platform]} on your account.`
              : `Request access from an admin to start using ${PLATFORM_LABELS[platform]}.`}
          </DialogDescription>
        </DialogHeader>

        {/* Current usage display (skip when no access at all) */}
        {code !== "NO_ACCESS" && max !== null && (
          <div className="rounded-md border bg-muted/40 p-3 flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-muted-foreground">Current usage</span>
              <span className="text-sm font-mono">
                <strong>{usage.toLocaleString()}</strong>
                {" / "}
                {max.toLocaleString()}{" "}
                <span className="text-muted-foreground">{PLATFORM_UNIT[platform]}</span>
              </span>
            </div>
            <Progress value={pct} className="h-1.5 [&>div]:bg-destructive" />
          </div>
        )}

        {/* Reset countdown OR "no reset" notice */}
        {code === "QUOTA_EXHAUSTED" && (
          <div
            className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
              willReset
                ? "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            <ClockIcon className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="flex-1">
              {willReset ? (
                <>
                  <p className="font-medium">
                    Resets in {timeUntil(nextResetAt!)}
                  </p>
                  <p className="text-xs opacity-80 mt-0.5">
                    Resets on {new Date(nextResetAt!).toLocaleString()}
                  </p>
                </>
              ) : (
                <p className="font-medium">
                  This is an absolute limit — it won't reset. Request an increase from an admin.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Submitted state */}
        {submitted ? (
          <div className="rounded-md border border-green-500/30 bg-green-500/10 p-4 flex items-start gap-3 text-sm text-green-700 dark:text-green-400">
            <CheckCircle2Icon className="h-5 w-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Request submitted</p>
              <p className="text-xs opacity-80 mt-1">
                An admin will review your request. You can track it on the Quota page.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Inline request form */}
            <div className="flex flex-col gap-3 border-t pt-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <SendIcon className="h-3 w-3" />
                Request {code === "NO_ACCESS" ? "access" : "an increase"}
              </p>
              <div className="grid gap-1.5">
                <Label className="text-xs">Message</Label>
                <Textarea
                  placeholder="Why do you need this? (helps admin decide)"
                  rows={2}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Desired {PLATFORM_UNIT[platform]}</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder={platform === "ai" ? "e.g. 100000" : "e.g. 100"}
                    value={requestedLimit}
                    onChange={(e) => setRequestedLimit(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Per period</Label>
                  <Select value={requestedPeriod} onValueChange={(v) => setRequestedPeriod(v as PeriodType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Daily</SelectItem>
                      <SelectItem value="month">Monthly</SelectItem>
                      <SelectItem value="lifetime">Absolute</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
          </>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            className="sm:mr-auto gap-2"
            onClick={() => {
              onOpenChange(false);
              router.push("/quota");
            }}
          >
            <GaugeIcon className="h-4 w-4" />
            Open Quota page
            <ExternalLinkIcon className="h-3 w-3" />
          </Button>
          {submitted ? (
            <Button size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={submit} disabled={submitting || !message.trim()}>
                {submitting && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
                Send request
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Convenience hook for callers ─────────────────────────────────────────────

/**
 * Returns [state, setQuotaError, QuotaExhaustedDialogElement].
 * Drop the element into your JSX and call setQuotaError(err) when fetch returns 403/429.
 */
export function useQuotaExhaustedDialog() {
  const [quotaError, setQuotaError] = React.useState<QuotaError | null>(null);

  const element = (
    <QuotaExhaustedDialog
      open={!!quotaError}
      onOpenChange={(v) => !v && setQuotaError(null)}
      quotaError={quotaError}
    />
  );

  return { quotaError, setQuotaError, dialog: element };
}
