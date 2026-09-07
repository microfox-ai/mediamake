"use client";

import { useEffect, useState } from "react";
import { GitMerge, AlertTriangle, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTimelineEditsStore, type MergeSide } from "../stores/timeline-edits-store";

/**
 * Conflict-resolution dialog. Opens automatically when a publish hit conflicting
 * concurrent changes. Non-conflicting changes are merged automatically (shown as
 * info); for each true conflict the user chooses to keep their version or the
 * teammate's. Applying merges + publishes — no one's work is silently lost.
 */
export function TimelineMergeDialog() {
  const pending = useTimelineEditsStore((s) => s.pendingTimelineMerge);
  const resolveTimelineMerge = useTimelineEditsStore((s) => s.resolveTimelineMerge);
  const cancelTimelineMerge = useTimelineEditsStore((s) => s.cancelTimelineMerge);

  const [choices, setChoices] = useState<Record<string, MergeSide>>({});
  const [isApplying, setIsApplying] = useState(false);

  // Default every conflict to "keep mine" when a new merge opens.
  useEffect(() => {
    if (pending) {
      const init: Record<string, MergeSide> = {};
      for (const c of pending.conflicts) init[c.id] = "mine";
      setChoices(init);
    }
  }, [pending]);

  const open = !!pending;

  const handleApply = async () => {
    setIsApplying(true);
    try {
      const result = await resolveTimelineMerge(choices);
      if (result.ok) {
        toast.success("Merged & published to team");
      } else if (result.reason === "conflict") {
        toast.error("Someone published again — please retry.");
      } else if (result.reason === "error") {
        toast.error(result.message ?? "Failed to publish merge");
      }
      // reason === "merge" (new conflicts) keeps the dialog open via pending state
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) cancelTimelineMerge(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-4 w-4" /> Resolve timeline conflicts
          </DialogTitle>
          <DialogDescription>
            A teammate published while you were editing. Non-conflicting changes are
            merged automatically — choose what to keep for the conflicts below.
          </DialogDescription>
        </DialogHeader>

        {pending && (
          <div className="space-y-4 max-h-[55vh] overflow-auto">
            {/* Auto-merged */}
            {pending.autoMerged.length > 0 && (
              <div className="rounded border border-emerald-500/30 bg-emerald-500/5 p-2.5">
                <p className="text-[11px] font-medium text-emerald-400/90 flex items-center gap-1.5 mb-1">
                  <Check className="h-3 w-3" /> Auto-merged ({pending.autoMerged.length})
                </p>
                <ul className="space-y-0.5">
                  {pending.autoMerged.map((s, i) => (
                    <li key={i} className="text-[10px] text-muted-foreground">• {s}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Conflicts */}
            <div className="space-y-2">
              <p className="text-[11px] font-medium text-amber-400/90 flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3" /> Conflicts ({pending.conflicts.length})
              </p>
              {pending.conflicts.map((c) => {
                const choice = choices[c.id] ?? "mine";
                return (
                  <div key={c.id} className="rounded border border-border/60 p-2.5 space-y-1.5">
                    <p className="text-xs font-medium">{c.label}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setChoices((p) => ({ ...p, [c.id]: "mine" }))}
                        className={cn(
                          "rounded border px-2 py-1.5 text-left text-[10px] transition-colors",
                          choice === "mine"
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border/60 text-muted-foreground hover:bg-accent"
                        )}
                      >
                        <div className="font-medium">Keep mine</div>
                        <div className="text-muted-foreground/70">{c.mineSummary}</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setChoices((p) => ({ ...p, [c.id]: "theirs" }))}
                        className={cn(
                          "rounded border px-2 py-1.5 text-left text-[10px] transition-colors",
                          choice === "theirs"
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border/60 text-muted-foreground hover:bg-accent"
                        )}
                      >
                        <div className="font-medium">Keep teammate's</div>
                        <div className="text-muted-foreground/70">{c.theirsSummary}</div>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => cancelTimelineMerge()} disabled={isApplying}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleApply} disabled={isApplying}>
            {isApplying ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <GitMerge className="h-3.5 w-3.5 mr-1" />}
            Apply merge & publish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
