'use client';

/**
 * ActivityBar
 *
 * VS Code-style narrow vertical icon strip on the LEFT edge of the left panel.
 * Each tab is a 32px icon; active tab gets a left-edge accent bar + filled icon color.
 * Hover shows a tooltip on the right.
 *
 * Settings cog renders at the bottom (separate from the tab list).
 */

import { Settings, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PANEL_VIEWS, type PanelView } from './panelTypes';

interface ActivityBarProps {
  active: PanelView;
  onChange: (view: PanelView) => void;
  /** Per-view numeric badges (e.g. open comment count, unread jobs). */
  badges?: Partial<Record<PanelView, number>>;
  /** Per-view pulsing dots (e.g. running jobs). */
  pulses?: Partial<Record<PanelView, boolean>>;
  /** Hide the VCS tab when there's no VCS panel wired up. */
  hasVcs: boolean;
  /** Optional click for the settings cog at the bottom. */
  onOpenSettings?: () => void;
}

export function ActivityBar({
  active,
  onChange,
  badges = {},
  pulses = {},
  hasVcs,
  onOpenSettings,
}: ActivityBarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full w-11 shrink-0 flex-col items-center border-r border-border bg-card/50 py-1">
        {/* ── Top tab list ──────────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col items-center gap-0.5">
          {PANEL_VIEWS.map((meta) => {
            if (meta.id === 'vcs' && !hasVcs) return null;
            const isActive = active === meta.id;
            const badge = badges[meta.id] ?? 0;
            const pulse = pulses[meta.id] ?? false;
            return (
              <ActivityBarButton
                key={meta.id}
                label={meta.label}
                Icon={meta.Icon}
                active={isActive}
                accent={meta.accent}
                badge={badge}
                pulse={pulse}
                onClick={() => onChange(meta.id)}
              />
            );
          })}
        </div>

        {/* ── Bottom — settings ─────────────────────────────────────────── */}
        {onOpenSettings && (
          <div className="flex flex-col items-center gap-0.5">
            <ActivityBarButton
              label="Settings"
              Icon={Settings}
              active={false}
              onClick={onOpenSettings}
            />
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// ── Single icon button ────────────────────────────────────────────────────────

interface ActivityBarButtonProps {
  label: string;
  Icon: LucideIcon;
  active: boolean;
  accent?: string;
  badge?: number;
  pulse?: boolean;
  onClick: () => void;
}

function ActivityBarButton({
  label,
  Icon,
  active,
  accent,
  badge = 0,
  pulse = false,
  onClick,
}: ActivityBarButtonProps) {
  const accentColors = accent
    ? {
        violet: 'text-violet-400',
        amber: 'text-amber-400',
        cyan: 'text-cyan-400',
      }[accent] ?? 'text-foreground'
    : 'text-foreground';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          aria-label={label}
          className={cn(
            'group relative flex h-9 w-9 items-center justify-center rounded transition-colors',
            active
              ? cn('bg-accent/40', accentColors)
              : 'text-muted-foreground/50 hover:text-foreground hover:bg-accent/20',
          )}
        >
          {/* Active accent bar — left edge */}
          {active && (
            <span
              className={cn(
                'absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r',
                accent === 'violet' && 'bg-violet-400',
                accent === 'amber' && 'bg-amber-400',
                accent === 'cyan' && 'bg-cyan-400',
                !accent && 'bg-primary',
              )}
            />
          )}

          <Icon size={18} strokeWidth={active ? 2 : 1.6} />

          {/* Numeric badge */}
          {badge > 0 && (
            <span
              className={cn(
                'absolute -right-0.5 -top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-1 text-[8px] font-medium leading-none text-white',
                accent === 'violet' && 'bg-violet-500',
                accent === 'amber' && 'bg-amber-500',
                accent === 'cyan' && 'bg-cyan-500',
                !accent && 'bg-primary',
              )}
            >
              {badge > 99 ? '99+' : badge}
            </span>
          )}

          {/* Pulse dot for active jobs */}
          {pulse && badge === 0 && (
            <span
              className={cn(
                'absolute -right-0 -top-0 h-2 w-2 animate-pulse rounded-full',
                accent === 'cyan' && 'bg-cyan-400',
                !accent && 'bg-primary',
              )}
            />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-[11px]">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
