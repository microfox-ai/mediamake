'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Copy, Loader2, Save, Trash2 } from 'lucide-react';
import { useProjectAgentsStore } from '@/lib/stores/projectAgentsStore';

type AgentRecord = {
  id: string;
  name: string;
  prompt: string;
  description?: string;
  kind: 'local' | 'project';
};

interface AgentEditorPaneProps {
  projectId: string;
  agentId: string;
  onClose: () => void;
  onDeleted?: () => void;
}

export function AgentEditorPane({
  projectId,
  agentId,
  onClose,
  onDeleted,
}: AgentEditorPaneProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agent, setAgent] = useState<AgentRecord | null>(null);
  const [original, setOriginal] = useState<AgentRecord | null>(null);
  const projectData = useProjectAgentsStore((s) => s.byProjectId[projectId]);
  const fetchAgents = useProjectAgentsStore((s) => s.fetchAgents);
  const upsertProjectAgent = useProjectAgentsStore((s) => s.upsertProjectAgent);
  const removeProjectAgent = useProjectAgentsStore((s) => s.removeProjectAgent);

  const isProject = agent?.kind === 'project';
  const isDirty = useMemo(() => {
    if (!agent || !original) return false;
    return agent.name !== original.name || agent.prompt !== original.prompt;
  }, [agent, original]);

  useEffect(() => {
    fetchAgents(projectId).catch(console.error);
  }, [fetchAgents, projectId]);

  useEffect(() => {
    const data = projectData;
    if (!data) {
      setLoading(true);
      return;
    }
    let found: AgentRecord | null = null;
    if (agentId.startsWith('local:')) {
      const id = agentId.slice('local:'.length);
      const local = data.localAgents.find((a) => a.id === id);
      if (local) {
        found = {
          id: `local:${local.id}`,
          name: local.name,
          prompt: local.prompt,
          description: local.description,
          kind: 'local',
        };
      }
    } else if (agentId.startsWith('project:')) {
      const id = agentId.slice('project:'.length);
      const project = data.projectAgents.find((a) => a.id === id);
      if (project) {
        found = {
          id: `project:${project.id}`,
          name: project.name,
          prompt: project.prompt,
          kind: 'project',
        };
      }
    }
    setAgent(found);
    setOriginal(found);
    setLoading(false);
  }, [agentId, projectData]);

  const save = async () => {
    if (!agent || !isProject || !isDirty) return;
    setSaving(true);
    try {
      const id = agent.id.slice('project:'.length);
      await fetch(`/api/projects/${projectId}/agents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: agent.name, prompt: agent.prompt }),
      });
      upsertProjectAgent(projectId, {
        id,
        name: agent.name,
        prompt: agent.prompt,
      });
      setOriginal(agent);
    } finally {
      setSaving(false);
    }
  };

  const duplicateLocal = async () => {
    if (!agent || isProject) return;
    setSaving(true);
    try {
      const baseId = agent.id.slice('local:'.length);
      const res = await fetch(`/api/projects/${projectId}/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${agent.name} Copy`,
          prompt: agent.prompt,
          baseAgentId: baseId,
        }),
      });
      const json = (await res.json()) as { id?: string };
      if (json.id) {
        upsertProjectAgent(projectId, {
          id: json.id,
          name: `${agent.name} Copy`,
          prompt: agent.prompt,
          baseAgentId: baseId,
        });
        window.dispatchEvent(
          new CustomEvent('writepad:agent-created', {
            detail: { agentId: `project:${json.id}` },
          }),
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteProject = async () => {
    if (!agent || !isProject) return;
    setSaving(true);
    try {
      const id = agent.id.slice('project:'.length);
      await fetch(`/api/projects/${projectId}/agents/${id}`, { method: 'DELETE' });
      removeProjectAgent(projectId, id);
      onDeleted?.();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <Loader2 className="animate-spin text-muted-foreground" size={20} />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-background">
        <p className="text-sm text-muted-foreground">Agent not found.</p>
        <Button variant="outline" size="sm" onClick={onClose}>
          Back to Editor
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="min-w-0">
          <button
            onClick={onClose}
            className="mb-1 inline-flex items-center gap-1 rounded px-1 py-0.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Back to file editor"
          >
            <ArrowLeft size={12} />
            Back to editor
          </button>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            {isProject ? 'Project Agent' : 'Local Agent'}
          </p>
          <p className="truncate text-sm font-medium text-foreground">{agent.name}</p>
        </div>
        <div className="flex items-center gap-1">
          {!isProject ? (
            <Button
              variant="outline"
              size="sm"
              onClick={duplicateLocal}
              disabled={saving}
              className="h-7 gap-1.5 text-xs"
            >
              <Copy size={12} />
              Duplicate
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={save}
                disabled={saving || !isDirty}
                className="h-7 gap-1.5 text-xs"
              >
                <Save size={12} />
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={deleteProject}
                disabled={saving}
                className="h-7 gap-1.5 text-xs text-red-500 hover:text-red-400"
              >
                <Trash2 size={12} />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {agent.description && !isProject && (
          <p className="mb-3 rounded border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            {agent.description}
          </p>
        )}
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Agent Name</label>
            <Input
              value={agent.name}
              disabled={!isProject}
              onChange={(e) => setAgent((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Prompt</label>
            <Textarea
              value={agent.prompt}
              disabled={!isProject}
              onChange={(e) => setAgent((prev) => (prev ? { ...prev, prompt: e.target.value } : prev))}
              rows={15}
              className="min-h-[360px] text-[12px] leading-relaxed"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
