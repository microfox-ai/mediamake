import {
  ArrowLeftRight,
  BracketsIcon,
  ChartNoAxesGantt,
  ChevronsLeftRightEllipsisIcon,
  Link,
  MenuIcon,
  Rows2,
  Tally4Icon,
  UnfoldHorizontal,
  type LucideIcon,
} from 'lucide-react';
import {
  trackModeOf,
  type TrackTimingMode,
} from '@/components/editor/presets/form/apply-track-mode';

/** Lock is a chain. Sequence points both ways. Parallel is two horizontal bars. */
export const TRACK_MODE_ICON: Record<TrackTimingMode, LucideIcon> = {
  lockedTo: Link,
  sequence: BracketsIcon,
  aligned: ChartNoAxesGantt,
  autoRange: ChevronsLeftRightEllipsisIcon,
};

export const TRACK_MODE_HINT: Record<TrackTimingMode, string> = {
  lockedTo: 'Lock start and duration to another track',
  sequence: 'Play children one after another',
  aligned: 'Run in parallel. Drag start and duration on the timeline',
  autoRange: 'Start at the first child and end at the last',
};

export function sceneModeOf(input: unknown): TrackTimingMode {
  const record =
    input && typeof input === 'object' && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};
  return trackModeOf(record);
}
