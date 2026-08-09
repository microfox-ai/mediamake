"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlusIcon, Trash2Icon, ShieldIcon, LockIcon } from "lucide-react";
import { useSession } from "@/components/session-provider";

// ── Types ────────────────────────────────────────────────────────────────────

type MemberRole = "editor" | "viewer";

interface ProjectMember {
  clientId: string;
  role: MemberRole;
  addedAt: string;
}

interface ShareProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
}

// ── Main component ───────────────────────────────────────────────────────────

export function ShareProjectDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
}: ShareProjectDialogProps) {
  const session = useSession();

  // Member list state
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);

  // All client IDs (for picker — only needed by owner)
  const [allClientIds, setAllClientIds] = useState<string[]>([]);

  // Add-member form state
  const [selectedClientId, setSelectedClientId] = useState("");
  const [newRole, setNewRole] = useState<MemberRole>("editor");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Remove state
  const [removingId, setRemovingId] = useState<string | null>(null);

  const headers = useCallback(
    (): Record<string, string> => ({
      "Content-Type": "application/json",
      ...(session?.clientId ? { "x-client-id": session.clientId } : {}),
    }),
    [session?.clientId],
  );

  const loadAllClientIds = useCallback(async () => {
    try {
      const res = await fetch("/api/db/client-ids", { headers: headers() });
      if (!res.ok) return;
      const data = await res.json();
      const ids: string[] = Array.isArray(data.clientIds) ? data.clientIds : [];
      setAllClientIds(ids);
    } catch (e) {
      console.error("Failed to load client IDs:", e);
    }
  }, [headers]);

  const loadMembers = useCallback(async () => {
    if (!projectId) return;
    setLoadingMembers(true);
    setMembersError(null);
    try {
      const res = await fetch(
        `/api/project/share?projectId=${projectId}`,
        { headers: headers() },
      );
      const json = await res.json();
      if (!res.ok) {
        setMembersError(json.error ?? "Failed to load members");
        return;
      }
      setMembers(json.members ?? []);
      setIsOwner(json.isOwner ?? false);
      setMyRole(json.myRole ?? null);
    } catch {
      setMembersError("Failed to load members");
    } finally {
      setLoadingMembers(false);
    }
  }, [projectId, headers]);

  useEffect(() => {
    if (open) {
      loadMembers();
      // Only owners need the full user picker list
      loadAllClientIds();
    }
  }, [open, loadMembers, loadAllClientIds]);

  // Eligible = not the owner and not already a member
  const memberIds = new Set(members.map((m) => m.clientId));
  const eligibleClientIds = allClientIds.filter(
    (id) => id !== session?.clientId && !memberIds.has(id),
  );

  const handleAdd = async () => {
    if (!selectedClientId) {
      setAddError("Please select a user");
      return;
    }
    setAddLoading(true);
    setAddError(null);

    try {
      const res = await fetch("/api/project/share", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          projectId,
          clientId: selectedClientId,
          role: newRole,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAddError(json.error ?? "Failed to add member");
        return;
      }
      setSelectedClientId("");
      setNewRole("editor");
      await loadMembers();
    } finally {
      setAddLoading(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    setRemovingId(memberId);
    try {
      await fetch("/api/project/share", {
        method: "DELETE",
        headers: headers(),
        body: JSON.stringify({ projectId, clientId: memberId }),
      });
      await loadMembers();
    } finally {
      setRemovingId(null);
    }
  };

  const roleBadgeClass = (role: MemberRole) =>
    role === "editor"
      ? "self-start border-blue-500/40 text-blue-700 dark:text-blue-400 text-xs"
      : "self-start text-xs";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldIcon className="h-4 w-4" />
            Share "{projectName}"
          </DialogTitle>
          <DialogDescription>
            {isOwner
              ? "Invite users to view or edit this project."
              : myRole
              ? `You have ${myRole} access to this project.`
              : "View who has access to this project."}
          </DialogDescription>
        </DialogHeader>

        {/* ── Current members ── */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Members
            </p>
            {!isOwner && myRole && (
              <Badge variant="outline" className="gap-1 text-xs">
                <LockIcon className="h-2.5 w-2.5" />
                You · {myRole}
              </Badge>
            )}
          </div>

          {loadingMembers && (
            <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          )}
          {membersError && (
            <p className="text-sm text-destructive">{membersError}</p>
          )}
          {!loadingMembers && !membersError && members.length === 0 && (
            <p className="text-sm text-muted-foreground py-1">
              {isOwner ? "No members yet — invite someone below." : "No other members."}
            </p>
          )}
          {!loadingMembers && members.length > 0 && (
            <div className="divide-y rounded-md border">
              {members.map((m) => (
                <div
                  key={m.clientId}
                  className="flex items-center justify-between gap-2 px-3 py-2"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-mono text-xs truncate">
                      {m.clientId}
                      {m.clientId === session?.clientId && (
                        <span className="ml-1 text-muted-foreground">(you)</span>
                      )}
                    </span>
                    <Badge variant="outline" className={roleBadgeClass(m.role)}>
                      {m.role}
                    </Badge>
                  </div>

                  {/* Remove button — owner only */}
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-7 w-7 text-muted-foreground hover:text-destructive"
                      disabled={removingId === m.clientId}
                      onClick={() => handleRemove(m.clientId)}
                    >
                      {removingId === m.clientId ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2Icon className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Add member form — owner only ── */}
        {isOwner ? (
          <>
            <Separator />
            <div className="flex flex-col gap-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Add member
              </p>

              <div className="grid grid-cols-[1fr_auto] gap-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="sp-userSelect" className="text-xs">User</Label>
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger id="sp-userSelect" className="h-8 text-sm">
                      <SelectValue placeholder={
                        eligibleClientIds.length === 0
                          ? "No eligible users"
                          : "Select a user…"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleClientIds.length === 0 ? (
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">
                          No eligible users to share with.
                        </div>
                      ) : (
                        eligibleClientIds.map((id) => (
                          <SelectItem key={id} value={id} className="font-mono text-xs">
                            {id}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="sp-role" className="text-xs">Role</Label>
                  <Select value={newRole} onValueChange={(v) => setNewRole(v as MemberRole)}>
                    <SelectTrigger id="sp-role" className="h-8 w-28 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {addError && <p className="text-sm text-destructive">{addError}</p>}

              <Button
                size="sm"
                onClick={handleAdd}
                disabled={addLoading || !selectedClientId}
                className="gap-2 self-end"
              >
                {addLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlusIcon className="h-4 w-4" />
                )}
                Add member
              </Button>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground pt-1">
            Only the project owner can add or remove members.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
