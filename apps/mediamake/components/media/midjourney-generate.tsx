"use client";

import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type CookieStatus = {
  cookies: Array<{ name: string; value: string; domain?: string; path?: string }> | null;
  expiresAt: string | null;
  isExpired: boolean | null;
  updatedAt: string | null;
};

export function MidjourneyGenerate() {
  const session = useSession();
  const clientId = session?.clientId;
  const [cookieStatus, setCookieStatus] = useState<CookieStatus | null>(null);
  const [cookieLoading, setCookieLoading] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [submitStatus, setSubmitStatus] = useState<"idle" | "submitting" | "polling" | "done" | "error">("idle");
  const [submitMessage, setSubmitMessage] = useState("");

  const fetchCookieStatus = useCallback(async () => {
    if (!clientId) {
      setCookieLoading(false);
      return;
    }
    setCookieLoading(true);
    try {
      const res = await fetch("/api/midjourney-cookies?platform=midjourney", {
        headers: { "x-client-id": clientId },
      });
      const data = await res.json();
      setCookieStatus({
        cookies: data.credentials?.cookies ?? data.cookies ?? null,
        expiresAt: data.expiresAt ?? null,
        isExpired: data.isExpired ?? null,
        updatedAt: data.updatedAt ?? null,
      });
    } catch {
      setCookieStatus(null);
    } finally {
      setCookieLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchCookieStatus();
  }, [fetchCookieStatus]);

  const handleGenerate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setSubmitMessage("Enter a prompt.");
      setSubmitStatus("error");
      return;
    }
    if (!cookieStatus?.cookies?.length) {
      setSubmitMessage("No Midjourney cookies stored. Save cookies via the get-into-zone extension first.");
      setSubmitStatus("error");
      return;
    }
    if (cookieStatus.isExpired) {
      setSubmitMessage("Stored cookie is expired. Re-export from the extension and save again.");
      setSubmitStatus("error");
      return;
    }
    if (!clientId) {
      setSubmitMessage("Not signed in.");
      setSubmitStatus("error");
      return;
    }

    setSubmitStatus("submitting");
    setSubmitMessage("");
    try {
      const res = await fetch("/api/workflows/workers/midjourney-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: {
            prompt: trimmed,
            cookies: cookieStatus.cookies,
            clientId,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? res.statusText);
      }
      const data = (await res.json()) as { jobId?: string };
      const jobId = data?.jobId;
      if (!jobId) {
        setSubmitMessage("No job ID in response.");
        setSubmitStatus("error");
        return;
      }
      setSubmitStatus("polling");
      const pollInterval = 2000;
      const maxAttempts = 90;
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, pollInterval));
        const statusRes = await fetch(`/api/workflows/workers/midjourney-submit/${jobId}`);
        if (!statusRes.ok) {
          setSubmitMessage(`Status check failed: ${statusRes.statusText}`);
          setSubmitStatus("error");
          return;
        }
        const job = (await statusRes.json()) as {
          status?: string;
          output?: { success?: boolean; message?: string };
          error?: { message?: string };
        };
        if (job.status === "completed") {
          setSubmitMessage(job.output?.message ?? "Submitted. Check Midjourney for results.");
          setSubmitStatus("done");
          return;
        }
        if (job.status === "failed") {
          setSubmitMessage(job.error?.message ?? job.output?.message ?? "Job failed.");
          setSubmitStatus("error");
          return;
        }
      }
      setSubmitMessage("Timed out waiting for job.");
      setSubmitStatus("error");
    } catch (e) {
      setSubmitMessage(e instanceof Error ? e.message : "Request failed");
      setSubmitStatus("error");
    }
  };

  const hasCookies = cookieStatus?.cookies != null && cookieStatus.cookies.length > 0;
  const expired = cookieStatus?.isExpired === true;

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Midjourney – generate from app</CardTitle>
        <CardDescription>
          Submit a prompt using your stored Midjourney cookie. Save cookies from the get-into-zone extension first.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cookie status */}
        <div className="space-y-1">
          <Label>Cookie status</Label>
          {cookieLoading ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </p>
          ) : !clientId ? (
            <p className="text-sm text-muted-foreground">Sign in to see cookie status.</p>
          ) : !hasCookies ? (
            <p className="text-sm text-amber-600 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              No cookie stored. Use the extension to export and save cookies.
            </p>
          ) : expired ? (
            <p className="text-sm text-destructive font-medium">
              Cookie expired
              {cookieStatus.expiresAt ? ` (${new Date(cookieStatus.expiresAt).toLocaleString()})` : ""}.
              Re-export from the extension and save again.
            </p>
          ) : (
            <p className="text-sm text-green-600">
              Cookie valid
              {cookieStatus.expiresAt
                ? ` – expires ${new Date(cookieStatus.expiresAt).toLocaleString()}`
                : ""}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="mj-prompt">Prompt</Label>
          <Input
            id="mj-prompt"
            placeholder="e.g. beautiful landscape --v 7"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={!hasCookies || expired}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleGenerate}
            disabled={!hasCookies || expired || submitStatus === "submitting" || submitStatus === "polling"}
          >
            {(submitStatus === "submitting" || submitStatus === "polling") && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {submitStatus === "polling" ? "Waiting…" : submitStatus === "submitting" ? "Submitting…" : "Generate"}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchCookieStatus} disabled={cookieLoading}>
            Refresh cookie status
          </Button>
        </div>

        {submitMessage && (
          <p
            className={`text-sm ${
              submitStatus === "error" ? "text-destructive" : submitStatus === "done" ? "text-green-600" : "text-muted-foreground"
            }`}
          >
            {submitMessage}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
