'use client';

/**
 * ContinuityTriggerForm
 *
 * Custom trigger UI for the continuity-orchestrator worker. Rendered inline
 * inside the generic WorkerRunPane (middle panel) — the WorkerRunPane handles
 * the actual job dispatch via `useWorkflowJob`.
 *
 * Inputs gathered:
 *   - scope: entire project / specific folders (multi-select tree)
 *   - modelId: AI model to use
 *
 * Submitted input shape (matches continuity-orchestrator's inputSchema):
 *   { projectId, triggeredBy, scope, modelId }
 */

import { useState, useMemo } from 'react';
import {
  Loader2,
  HardHat,
  ChevronRight,
  ChevronDown,
  Folder,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CHAT_MODELS } from '@/lib/ai-models';
import type { FileNode } from '@/components/writepad/left/types';
import type { TriggerFormProps } from '@/lib/workers/registry';

const RECOMMENDED_MODELS = [
  'google/gemini-2.5-pro',
  'google/gemini-pro-latest',
  'anthropic/claude-opus-4-6',
  'anthropic/claude-sonnet-4-6',
];

export function ContinuityTriggerForm({
  projectId,
  files,
  clientId,
  onTrigger,
  triggering,
  error: externalError,
}: TriggerFormProps) {
  const [scopeKind, setScopeKind] = useState<'all' | 'folders'>('all');
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
  const [modelId, setModelId] = useState<string>('google/gemini-2.5-pro');
  const [localError, setLocalError] = useState<string | null>(null);

  const folderNodes = useMemo(() => files.filter((n) => n.type === 'folder'), [files]);

  function toggleFolder(id: string) {
    setSelectedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    setLocalError(null);
    if (scopeKind === 'folders' && selectedFolderIds.size === 0) {
      setLocalError('Pick at least one folder, or switch to "Entire project".');
      return;
    }
    const scope =
      scopeKind === 'all'
        ? { type: 'all' as const }
        : { type: 'folders' as const, folderIds: Array.from(selectedFolderIds) };
    try {
      await onTrigger({
        projectId,
        triggeredBy: clientId,
        scope,
        modelId,
      });
    } catch (e: any) {
      setLocalError(e?.message ?? String(e));
    }
  }

  const error = externalError ?? localError;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-6">
      {/* ── Header ───────────────────────────────────────────── */}
      <header className="flex items-center gap-3 border-b border-border pb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
          <HardHat size={20} className="text-cyan-400" />
        </div>
        <div className="flex-1">
          <h1 className="text-[14px] font-semibold text-foreground">Run Continuity Check</h1>
          <p className="text-[11px] leading-relaxed text-muted-foreground/70">
            Analyzes prose files for contradictions, age inconsistencies, timeline gaps, and location issues.
            Runs as a background job — you can keep editing while it works.
          </p>
        </div>
      </header>

      {/* ── Scope ────────────────────────────────────────────── */}
      <section className="space-y-2">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Scope
        </label>
        <div className="flex gap-2">
          <ScopePill
            active={scopeKind === 'all'}
            label="Entire project"
            onClick={() => setScopeKind('all')}
          />
          <ScopePill
            active={scopeKind === 'folders'}
            label={
              selectedFolderIds.size > 0
                ? `Folders (${selectedFolderIds.size})`
                : 'Specific folders'
            }
            onClick={() => setScopeKind('folders')}
          />
        </div>

        {scopeKind === 'folders' && (
          <div className="mt-2 max-h-64 overflow-y-auto rounded border border-border bg-card/40 p-2">
            {folderNodes.length === 0 ? (
              <p className="px-2 py-3 text-center text-[10px] text-muted-foreground/40">
                No folders in this project — switch to &ldquo;Entire project&rdquo;.
              </p>
            ) : (
              folderNodes.map((node) => (
                <FolderRow
                  key={node.id}
                  node={node}
                  depth={0}
                  selected={selectedFolderIds}
                  onToggle={toggleFolder}
                />
              ))
            )}
          </div>
        )}
      </section>

      {/* ── Model ────────────────────────────────────────────── */}
      <section className="space-y-2">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Model
        </label>
        <select
          value={modelId}
          onChange={(e) => setModelId(e.target.value)}
          className="w-full rounded border border-border bg-background px-3 py-2 text-[12px] text-foreground outline-none focus:border-cyan-500/50"
        >
          <optgroup label="Recommended">
            {CHAT_MODELS.filter((m) => RECOMMENDED_MODELS.includes(m.id)).map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Other">
            {CHAT_MODELS.filter((m) => !RECOMMENDED_MODELS.includes(m.id)).map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </optgroup>
        </select>
        <p className="text-[10px] leading-relaxed text-muted-foreground/40">
          Long-context models (Gemini Pro, Claude Opus) handle larger projects in fewer shards.
        </p>
      </section>

      {/* ── Error ────────────────────────────────────────────── */}
      {error && (
        <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
          {error}
        </div>
      )}

      {/* ── Submit ───────────────────────────────────────────── */}
      <div className="flex justify-end border-t border-border pt-4">
        <Button
          onClick={handleSubmit}
          disabled={triggering}
          className="gap-2 bg-cyan-500 text-white hover:bg-cyan-400"
        >
          {triggering ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
          {triggering ? 'Starting…' : 'Run Check'}
        </Button>
      </div>
    </div>
  );
}

// ── Scope pill ────────────────────────────────────────────────────────────────

function ScopePill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 rounded border px-3 py-2 text-[11px] transition-colors',
        active
          ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400'
          : 'border-border text-muted-foreground/60 hover:border-border/80 hover:text-foreground',
      )}
    >
      {label}
    </button>
  );
}

// ── Folder tree row (recursive) ───────────────────────────────────────────────

interface FolderRowProps {
  node: FileNode;
  depth: number;
  selected: Set<string>;
  onToggle: (id: string) => void;
}

function FolderRow({ node, depth, selected, onToggle }: FolderRowProps) {
  const [expanded, setExpanded] = useState(depth < 1);
  if (node.type !== 'folder') return null;
  const childFolders = (node.children ?? []).filter((c) => c.type === 'folder');
  const isSelected = selected.has(node.id);

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1 rounded px-1 py-0.5 hover:bg-accent/40',
          isSelected && 'bg-cyan-500/10',
        )}
        style={{ paddingLeft: `${depth * 14 + 4}px` }}
      >
        <button
          onClick={() => setExpanded((x) => !x)}
          className="text-muted-foreground/40 hover:text-foreground"
          disabled={childFolders.length === 0}
        >
          {childFolders.length > 0 ? (
            expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />
          ) : (
            <span className="inline-block h-2.5 w-2.5" />
          )}
        </button>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggle(node.id)}
          className="h-3 w-3 cursor-pointer accent-cyan-500"
        />
        <Folder size={12} className="text-muted-foreground/50" />
        <span className="flex-1 truncate text-[11px] text-foreground/70">{node.name}</span>
      </div>
      {expanded &&
        childFolders.map((child) => (
          <FolderRow
            key={child.id}
            node={child}
            depth={depth + 1}
            selected={selected}
            onToggle={onToggle}
          />
        ))}
    </div>
  );
}
