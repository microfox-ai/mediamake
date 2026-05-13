/**
 * panelTypes.ts
 *
 * Single source of truth for the left-panel view tabs.
 * Drives the ActivityBar (vertical icon strip on the far left of the left panel).
 */

import {
  Files,
  Search,
  Bot,
  GitBranch,
  BookOpen,
  MessageSquare,
  Workflow,
  type LucideIcon,
} from 'lucide-react';

export type PanelView =
  | 'explorer'
  | 'search'
  | 'agents'
  | 'vcs'
  | 'refs'
  | 'comments'
  | 'workers';

export interface PanelViewMeta {
  id: PanelView;
  label: string;
  Icon: LucideIcon;
  /** Optional accent color used for the active state + badge. Tailwind color name. */
  accent?: string;
}

/**
 * Order in this array = order in the activity bar (top to bottom).
 * Settings cog renders separately at the bottom.
 */
export const PANEL_VIEWS: PanelViewMeta[] = [
  { id: 'explorer', label: 'Files', Icon: Files },
  { id: 'search', label: 'Search', Icon: Search },
  { id: 'vcs', label: 'Source Control', Icon: GitBranch },
  { id: 'agents', label: 'Agents', Icon: Bot },
  { id: 'refs', label: 'Wiki / References', Icon: BookOpen, accent: 'violet' },
  { id: 'comments', label: 'Comments', Icon: MessageSquare, accent: 'amber' },
  { id: 'workers', label: 'Workers', Icon: Workflow, accent: 'cyan' },
];
