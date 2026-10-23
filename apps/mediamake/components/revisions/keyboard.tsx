'use client';

import { useSyncExternalStore } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/** Text boxes keep plain keys (Space, letters, arrows) for typing. */
export function isTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return true;
  if (target.tagName !== 'INPUT') return false;
  const type = (target as HTMLInputElement).type;
  return !['button', 'checkbox', 'radio', 'range', 'submit', 'reset'].includes(
    type,
  );
}

const subscribe = () => () => undefined;
const isMac = () =>
  /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

/** "⌘" on Apple devices, "Ctrl" elsewhere ("⌘/Ctrl" while rendering on the server). */
export function useModKey(): string {
  return useSyncExternalStore(
    subscribe,
    () => (isMac() ? '⌘' : 'Ctrl'),
    () => '⌘/Ctrl',
  );
}

/**
 * Play/pause from inside a text box. ⌘Space is Spotlight on macOS, so a Mac
 * shows ⌥Space; ⌃Space and ⌘Space (if Spotlight is moved) work there too.
 */
export function usePlayAnywhereKeys(): string {
  return useSyncExternalStore(
    subscribe,
    () => (isMac() ? '⌥ Space' : 'Ctrl Space'),
    () => '⌥/Ctrl Space',
  );
}

/** Replaces "Mod" and "PlayAnywhere" in a shortcut label for this platform. */
export function useKeys(keys: string | undefined): string | undefined {
  const mod = useModKey();
  const play = usePlayAnywhereKeys();
  return keys?.replace('PlayAnywhere', play).replace(/Mod/g, mod);
}

/**
 * Tooltip naming a control and its shortcut. Write the modifier as "Mod"
 * ("Mod →"); it shows as ⌘ on a Mac and Ctrl elsewhere.
 */
export function Hint({
  label,
  keys,
  side = 'top',
  children,
}: {
  label: string;
  keys?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
}) {
  const shown = useKeys(keys);
  return (
    <Tooltip delayDuration={300}>
      {/* Names icon-only controls; a control's own aria-label wins. */}
      <TooltipTrigger asChild aria-label={label}>
        {children}
      </TooltipTrigger>
      <TooltipContent side={side} className="flex items-center gap-2 px-2 py-1">
        <span>{label}</span>
        {shown && (
          <kbd className="rounded border border-primary-foreground/30 px-1 font-mono text-[10px] leading-4">
            {shown}
          </kbd>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
