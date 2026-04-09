'use client';

import { useEffect, useMemo, useState } from 'react';
import { Copy, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjectAgentsStore } from '@/lib/stores/projectAgentsStore';

interface AgentsPanelProps {
  projectId: string;
  activeAgentId: string | null;
  onOpenAgent: (agentId: string) => void;
}

export function AgentsPanel({ projectId, activeAgentId, onOpenAgent }: AgentsPanelProps) {
  const projectData = useProjectAgentsStore((s) => s.byProjectId[projectId]);
  const fetchAgents = useProjectAgentsStore((s) => s.fetchAgents);
  const upsertProjectAgent = useProjectAgentsStore((s) => s.upsertProjectAgent);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<'all' | 'local' | 'project'>('all');
  const localAgents = projectData?.localAgents ?? [];
  const projectAgents = projectData?.projectAgents ?? [];
  const canEdit = projectData?.canEdit === true;

  const sortedProjectAgents = useMemo(
    () => [...projectAgents].sort((a, b) => a.name.localeCompare(b.name)),
    [projectAgents],
  );
  const filteredLocalAgents = useMemo(
    () =>
      localAgents.filter(
        (a) =>
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.description.toLowerCase().includes(search.toLowerCase()),
      ),
    [localAgents, search],
  );
  const filteredProjectAgents = useMemo(
    () =>
      sortedProjectAgents.filter((a) =>
        a.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [sortedProjectAgents, search],
  );

  useEffect(() => {
    fetchAgents(projectId).catch(console.error);
  }, [fetchAgents, projectId]);

  const duplicateLocal = async (local: { id: string; name: string; prompt: string }) => {
    if (!canEdit) return;
    setSavingId(`dup:${local.id}`);
    try {
      const res = await fetch(`/api/projects/${projectId}/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${local.name} Copy`,
          prompt: local.prompt,
          baseAgentId: local.id,
        }),
      });
      const data = (await res.json()) as { id?: string };
      if (data.id) {
        upsertProjectAgent(projectId, {
          id: data.id,
          name: `${local.name} Copy`,
          prompt: local.prompt,
          baseAgentId: local.id,
        });
        onOpenAgent(`project:${data.id}`);
      }
    } finally {
      setSavingId(null);
    }
  };

  const createProjectAgent = async () => {
    if (!canEdit) return;
    setSavingId('new');
    try {
      const res = await fetch(`/api/projects/${projectId}/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Agent',
          prompt: 'You are a helpful writing assistant.',
        }),
      });
      const data = (await res.json()) as { id?: string };
      if (data.id) {
        upsertProjectAgent(projectId, {
          id: data.id,
          name: 'New Agent',
          prompt: 'You are a helpful writing assistant.',
        });
        onOpenAgent(`project:${data.id}`);
      }
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-foreground/80">
          Agents
        </p>
        <button
          onClick={createProjectAgent}
          disabled={!canEdit}
          className={cn(
            'rounded p-1 transition-colors',
            canEdit
              ? 'text-muted-foreground/60 hover:bg-accent hover:text-foreground'
              : 'cursor-not-allowed text-muted-foreground/25',
          )}
          title={canEdit ? 'Create project agent' : 'View-only access'}
        >
          <Plus size={12} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search agents..."
          className="mb-2 h-8 w-full rounded border border-border/60 bg-background/70 px-2 text-[11px] outline-none"
        />
        <div className="mb-2 flex items-center gap-1 border-b border-border/60 pb-2">
          {(['all', 'local', 'project'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={cn(
                'rounded px-1.5 py-0.5 text-[10px] capitalize transition-colors',
                scope === s
                  ? 'bg-violet-500/20 text-violet-300'
                  : 'text-muted-foreground/70 hover:bg-accent',
              )}
            >
              {s}
            </button>
          ))}
        </div>

        {(scope === 'all' || scope === 'local') && (
          <>
            <p className="mb-1 px-1 text-[10px] uppercase tracking-wide text-muted-foreground/60">
              Local (read-only)
            </p>
            <div className="space-y-2">
              {filteredLocalAgents.map((a) => (
                <div
                  key={a.id}
                  className={cn(
                    'rounded border p-2',
                    activeAgentId === `local:${a.id}`
                      ? 'border-violet-500/40 bg-violet-500/10'
                      : 'border-border/60 bg-muted/20',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => onOpenAgent(`local:${a.id}`)}
                      className="min-w-0 flex-1 truncate text-left text-[11px] font-medium text-foreground/80 hover:text-foreground"
                    >
                      {a.name}
                    </button>
                    <button
                      onClick={() => duplicateLocal(a)}
                      disabled={!canEdit || savingId === `dup:${a.id}`}
                      className="rounded p-1 text-muted-foreground/50 hover:bg-accent hover:text-foreground disabled:opacity-40"
                      title="Duplicate into project agents"
                    >
                      <Copy size={11} />
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground/70">{a.description}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {(scope === 'all' || scope === 'project') && (
          <>
            <p className="mb-1 mt-4 px-1 text-[10px] uppercase tracking-wide text-muted-foreground/60">
              Project Agents
            </p>
            <div className="space-y-2">
              {filteredProjectAgents.map((a) => (
                <button
                  key={a.id}
                  onClick={() => onOpenAgent(`project:${a.id}`)}
                  className={cn(
                    'w-full rounded border p-2 text-left transition-colors',
                    activeAgentId === `project:${a.id}`
                      ? 'border-violet-500/40 bg-violet-500/10'
                      : 'border-border/60 bg-muted/20 hover:bg-accent/50',
                  )}
                >
                  <p className="truncate text-[11px] font-medium text-foreground/85">{a.name}</p>
                  <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground/70">{a.prompt}</p>
                </button>
              ))}
              {sortedProjectAgents.length === 0 && (
                <p className="px-1 text-[10px] text-muted-foreground/60">
                  No project agents yet.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
