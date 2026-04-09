'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2 } from 'lucide-react';

interface ShareProjectDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Member {
  clientId: string;
  role: 'editor' | 'viewer';
}

export function ShareProjectDialog({
  projectId,
  open,
  onOpenChange,
}: ShareProjectDialogProps) {
  const [ownerId, setOwnerId] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [clientIds, setClientIds] = useState<string[]>([]);
  const [targetClientId, setTargetClientId] = useState('');
  const [targetRole, setTargetRole] = useState<'editor' | 'viewer'>('viewer');
  const [userFilter, setUserFilter] = useState('');
  const [memberFilter, setMemberFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const availableClientIds = useMemo(() => {
    const taken = new Set([ownerId, ...members.map((m) => m.clientId)]);
    return clientIds
      .filter((id) => !taken.has(id))
      .filter((id) => id.toLowerCase().includes(userFilter.toLowerCase()));
  }, [clientIds, members, ownerId, userFilter]);

  const filteredMembers = useMemo(
    () =>
      members.filter((m) =>
        m.clientId.toLowerCase().includes(memberFilter.toLowerCase()),
      ),
    [members, memberFilter],
  );

  const load = async () => {
    setLoading(true);
    try {
      const [mRes, cRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/members`),
        fetch('/api/db/client-ids'),
      ]);
      if (mRes.ok) {
        const mData = (await mRes.json()) as {
          ownerId: string;
          members: Member[];
        };
        setOwnerId(mData.ownerId ?? '');
        setMembers(mData.members ?? []);
      }
      if (cRes.ok) {
        const cData = (await cRes.json()) as { clientIds: string[] };
        setClientIds(cData.clientIds ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    load().catch(console.error);
  }, [open, projectId]);

  const addMember = async () => {
    if (!targetClientId) return;
    await fetch(`/api/projects/${projectId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: targetClientId, role: targetRole }),
    });
    setTargetClientId('');
    await load();
  };

  const removeMember = async (clientId: string) => {
    await fetch(
      `/api/projects/${projectId}/members?clientId=${encodeURIComponent(clientId)}`,
      { method: 'DELETE' },
    );
    await load();
  };

  const updateRole = async (clientId: string, role: 'editor' | 'viewer') => {
    await fetch(`/api/projects/${projectId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, role }),
    });
    await load();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Share Project</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex h-28 items-center justify-center">
            <Loader2 size={18} className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded border border-border/70 bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Owner</p>
              <p className="mt-1 text-sm text-foreground">{ownerId || 'Unknown'}</p>
            </div>

            <div className="rounded border border-border/70 p-3">
              <p className="mb-2 text-xs text-muted-foreground">Add member</p>
              <input
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                placeholder="Search users…"
                className="mb-2 h-8 w-full rounded border border-border bg-transparent px-2 text-xs"
              />
              <div className="flex items-center gap-2">
                <select
                  value={targetClientId}
                  onChange={(e) => setTargetClientId(e.target.value)}
                  className="h-9 flex-1 rounded border border-border bg-transparent px-2 text-sm"
                >
                  <option value="">Select user…</option>
                  {availableClientIds.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value as 'editor' | 'viewer')}
                  className="h-9 rounded border border-border bg-transparent px-2 text-sm"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
                <Button size="sm" onClick={addMember} disabled={!targetClientId}>
                  Add
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">Members</p>
                <input
                  value={memberFilter}
                  onChange={(e) => setMemberFilter(e.target.value)}
                  placeholder="Filter members…"
                  className="h-7 w-40 rounded border border-border bg-transparent px-2 text-[11px]"
                />
              </div>
              {members.length === 0 && (
                <p className="text-sm text-muted-foreground">No shared members yet.</p>
              )}
              {filteredMembers.map((m) => (
                <div
                  key={m.clientId}
                  className="flex items-center gap-2 rounded border border-border/60 px-2.5 py-2"
                >
                  <span className="min-w-0 flex-1 truncate text-sm">{m.clientId}</span>
                  <span
                    className={
                      m.role === 'editor'
                        ? 'rounded bg-violet-500/15 px-1.5 py-0.5 text-[10px] text-violet-400'
                        : 'rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] text-sky-400'
                    }
                  >
                    {m.role}
                  </span>
                  <select
                    value={m.role}
                    onChange={(e) =>
                      updateRole(m.clientId, e.target.value as 'editor' | 'viewer')
                    }
                    className="h-8 rounded border border-border bg-transparent px-2 text-xs"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                  </select>
                  <button
                    onClick={() => removeMember(m.clientId)}
                    className="rounded p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
                    title="Remove member"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
