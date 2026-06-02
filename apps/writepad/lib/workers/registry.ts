/**
 * Worker UI registry.
 *
 * Each entry is the minimum metadata + custom UI components needed to render a
 * worker in the left-sidebar Workers panel and the middle-pane WorkerRunPane.
 *
 * To add a new worker:
 *   1. Implement the worker handler in `app/ai/workers/<group>/<id>.worker.ts`
 *   2. Add a registry entry below with a `TriggerForm` and `OutputViewer`
 *   3. The Workers panel + WorkerRunPane pick it up automatically
 *
 * Triggering, status polling, and output retrieval all use the existing
 * `useWorkflowJob` hook against `/api/workflows/workers/...`. The registry is
 * purely for UI presentation.
 */

import type { ComponentType } from 'react';
import { HardHat, type LucideIcon } from 'lucide-react';
import { ContinuityTriggerForm } from '@/components/writepad/workers/continuity/ContinuityTriggerForm';
import { ContinuityOutputViewer } from '@/components/writepad/workers/continuity/ContinuityOutputViewer';
import type { FileNode } from '@/components/writepad/left/types';

// ─── Component prop contracts ────────────────────────────────────────────────

export interface TriggerFormProps {
  projectId: string;
  /** Project file tree — passed so workers that need scope picking can render it. */
  files: FileNode[];
  /** Authenticated client id (for workers that need a triggeredBy field). */
  clientId: string;
  /** Submit the worker. The hook will manage the job lifecycle from here. */
  onTrigger: (input: Record<string, unknown>) => Promise<void>;
  /** True while the trigger request is in flight. */
  triggering: boolean;
  /** Most recent error from a trigger attempt, if any. */
  error?: string | null;
}

export interface OutputViewerProps {
  projectId: string;
  /** The worker_jobs record for this run (status, output, error, metadata). */
  job: {
    jobId: string;
    workerId: string;
    status: string;
    output?: unknown;
    error?: { message: string };
    metadata?: Record<string, unknown>;
    createdAt?: string;
    completedAt?: string;
  };
  /** Resolves a relative file path back to a fileId (for jump-to-file). */
  filePathToFileId: Record<string, string>;
  /** Open a file in the editor at a 1-based line number. */
  onJumpToLocation?: (fileId: string, lineNumber: number) => void;
  /** Switch the worker pane back to trigger mode for this worker (Re-run). */
  onRequestRerun?: () => void;
}

// ─── Registry entry ──────────────────────────────────────────────────────────

export interface WorkerUiEntry {
  /** Matches the worker `id` from `createWorker({ id })`. */
  workerId: string;
  /** Display label (used in panel + dropdowns). */
  label: string;
  /** One-line description shown in pickers. */
  description: string;
  Icon: LucideIcon;
  /** Tailwind color name for the worker's accent (e.g. "cyan", "violet"). */
  accent: string;
  /** Custom form rendered when user wants to start a new run. */
  TriggerForm: ComponentType<TriggerFormProps>;
  /** Custom output viewer rendered when user opens a past or active run. */
  OutputViewer: ComponentType<OutputViewerProps>;
}

// ─── Registered workers ──────────────────────────────────────────────────────

export const WORKER_REGISTRY: WorkerUiEntry[] = [
  {
    workerId: 'continuity-orchestrator',
    label: 'Continuity Check',
    description:
      'Scans the project for contradictions, age inconsistencies, timeline gaps, and location issues.',
    Icon: HardHat,
    accent: 'cyan',
    TriggerForm: ContinuityTriggerForm,
    OutputViewer: ContinuityOutputViewer,
  },
];

export function getWorkerEntry(workerId: string): WorkerUiEntry | undefined {
  return WORKER_REGISTRY.find((w) => w.workerId === workerId);
}
