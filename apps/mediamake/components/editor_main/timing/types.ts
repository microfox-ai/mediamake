/** Parent-relative placement of a preset instance inside its scene. */
export type NodeTiming =
  | { kind: 'explicit'; start: number; duration: number }
  | { kind: 'hug'; start: number }
  | { kind: 'intrinsic'; start: number }
  | { kind: 'lock'; refId: string }
  /**
   * One-release read path for old `fitDurationTo` values.
   * Copies duration from the reference and keeps the authored start.
   * A full `lock` copies both, which would move clips that only shared a length.
   */
  | { kind: 'durationLock'; refId: string; start: number }
  /** No instance span yet. The compiler leaves this node on its previous path. */
  | { kind: 'unspecified'; start: number };

export type SceneArrangement = 'sequence' | 'aligned';

export type PresetRole = 'scene' | 'track' | 'modifier';

export interface AppliedNode {
  id: string;
  presetId: string;
  name: string;
  disabled?: boolean;
  role: PresetRole;
  /** Scene containers only. Sequence packs children; aligned overlaps them. */
  arrangement?: SceneArrangement;
  input: unknown;
  timing: NodeTiming;
  children: AppliedNode[];
}

export type TimingDiagnosticCode =
  | 'missing-duration'
  | 'lock-missing'
  | 'lock-out-of-scope'
  | 'lock-cycle'
  | 'non-positive-duration'
  | 'child-overflow'
  | 'duplicate-id'
  | 'external-lock';

export interface TimingDiagnostic {
  nodeId: string;
  code: TimingDiagnosticCode;
  message: string;
}

/** Resolved parent-relative span. `start` is relative to the parent scene. */
export interface ResolvedSpan {
  start: number;
  duration: number;
  absoluteStart: number;
  parentAbsoluteStart: number;
  locked: boolean;
}
