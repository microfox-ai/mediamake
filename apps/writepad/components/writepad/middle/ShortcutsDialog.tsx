'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RotateCcw } from 'lucide-react';
import { WORD_HELPERS } from './wordHelpers';
import { useKeymapStore } from '@/lib/stores/keymapStore';

const STATIC_SECTIONS = [
  {
    title: 'Editor',
    items: [
      { key: 'Ctrl+S', desc: 'Save active file' },
      { key: 'Ctrl+Shift+S', desc: 'Save all files' },
      { key: 'Ctrl+F', desc: 'Find / replace in file' },
      { key: 'Ctrl+Z', desc: 'Undo' },
      { key: 'Ctrl+Y', desc: 'Redo' },
      { key: 'Ctrl+A', desc: 'Select all' },
      { key: 'Ctrl+B', desc: 'Bold' },
      { key: 'Ctrl+I', desc: 'Italic' },
      { key: 'Alt+X', desc: 'Toggle word wrap' },
      { key: 'Alt+↑', desc: 'Move line up' },
      { key: 'Alt+↓', desc: 'Move line down' },
      { key: 'Ctrl+Scroll', desc: 'Increase / decrease font size' },
    ],
  },
  {
    title: 'AI & Chat',
    items: [
      { key: 'Ctrl+L', desc: 'Send selected text to AI chat' },
      { key: 'Ctrl+P', desc: 'Toggle markdown preview' },
      { key: 'F11', desc: 'Toggle focus mode (hide sidebars)' },
      { key: 'Enter (chat)', desc: 'Send AI message' },
      { key: 'Shift+Enter (chat)', desc: 'New line in chat' },
    ],
  },
  {
    title: 'AI Autocomplete',
    items: [
      { key: 'Alt+A', desc: 'Toggle cursor-placement AI auto-complete on / off' },
      { key: 'Alt+G', desc: 'Manually trigger / cycle to a different AI suggestion' },
      { key: 'Tab', desc: 'Accept autocomplete suggestion' },
      { key: 'Escape', desc: 'Dismiss autocomplete suggestion' },
    ],
  },
];

/** Converts a browser KeyboardEvent to a CodeMirror key string like "Alt-q". */
function eventToKeymapKey(e: KeyboardEvent): string | null {
  const mods: string[] = [];
  if (e.ctrlKey || e.metaKey) mods.push('Ctrl');
  if (e.altKey) mods.push('Alt');
  if (e.shiftKey) mods.push('Shift');
  const key = e.key;
  // Ignore modifier-only presses
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) return null;
  return [...mods, key.length === 1 ? key.toLowerCase() : key].join('-');
}

/** Render a CodeMirror key string as human-readable display text. */
function formatKeyDisplay(key: string): string {
  return key
    .split('-')
    .map((part) => (part.length === 1 ? part.toUpperCase() : part))
    .join('+');
}

// ── Editable word-tool row ────────────────────────────────────────────────────

function WordToolRow({
  helper,
  currentShortcut,
  currentDisplay,
  isOverridden,
  onSet,
  onReset,
}: {
  helper: { id: string; label: string; description: string; defaultShortcutDisplay: string };
  currentShortcut: string;
  currentDisplay: string;
  isOverridden: boolean;
  onSet: (key: string) => void;
  onReset: () => void;
}) {
  const [capturing, setCapturing] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const rowRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    if (!capturing) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') { setCapturing(false); setPending(null); return; }
      const mapped = eventToKeymapKey(e);
      if (!mapped) return;
      setPending(mapped);
    };
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, [capturing]);

  const confirm = () => {
    if (pending) { onSet(pending); }
    setCapturing(false);
    setPending(null);
  };

  const cancel = () => { setCapturing(false); setPending(null); };

  return (
    <tr ref={rowRef} className="border-b border-border/30 last:border-0">
      <td className="py-1.5 pr-3 whitespace-nowrap align-middle">
        {capturing ? (
          <div className="flex items-center gap-1">
            <kbd className="rounded bg-violet-500/20 border border-violet-500/40 px-1.5 py-0.5 font-mono text-xs text-violet-300 min-w-[52px] text-center animate-pulse">
              {pending ? formatKeyDisplay(pending) : '…'}
            </kbd>
            {pending && (
              <button
                onClick={confirm}
                className="rounded px-1.5 py-0.5 text-[10px] bg-violet-600 text-white hover:bg-violet-500"
              >
                Save
              </button>
            )}
            <button
              onClick={cancel}
              className="rounded px-1 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 group">
            <kbd
              onClick={() => setCapturing(true)}
              title="Click to remap"
              className={`rounded px-1.5 py-0.5 font-mono text-xs cursor-pointer transition-colors min-w-[52px] text-center select-none ${
                isOverridden
                  ? 'bg-violet-500/20 border border-violet-500/40 text-violet-300'
                  : 'bg-muted border border-transparent text-foreground'
              } hover:border-violet-500/50`}
            >
              {currentDisplay}
            </kbd>
            {isOverridden && (
              <button
                onClick={onReset}
                title={`Reset to ${helper.defaultShortcutDisplay}`}
                className="opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 text-muted-foreground hover:text-foreground"
              >
                <RotateCcw size={10} />
              </button>
            )}
          </div>
        )}
      </td>
      <td className="py-1.5 text-muted-foreground text-xs">
        <span className="text-foreground font-medium">{helper.label}</span>
        {' — '}
        {helper.description}
      </td>
    </tr>
  );
}

// ─── Main dialog ──────────────────────────────────────────────────────────────

export { STATIC_SECTIONS as SHORTCUT_SECTIONS };

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const { overrides, setOverride, resetOverride, resetAll, resolvedKeymaps } = useKeymapStore();
  const resolved = resolvedKeymaps();
  const hasAnyOverride = Object.keys(overrides).length > 0;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-5">
          {/* Static sections */}
          {STATIC_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {section.title}
              </p>
              <table className="w-full text-sm">
                <tbody>
                  {section.items.map(({ key, desc }) => (
                    <tr key={key} className="border-b border-border/30 last:border-0">
                      <td className="py-1.5 pr-4 whitespace-nowrap">
                        <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                          {key}
                        </kbd>
                      </td>
                      <td className="py-1.5 text-muted-foreground text-xs">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {/* Editable Word Tools section */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                Word Tools  (select a word first · click key to remap)
              </p>
              {hasAnyOverride && (
                <button
                  onClick={resetAll}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RotateCcw size={10} />
                  Reset all
                </button>
              )}
            </div>
            <table className="w-full text-sm">
              <tbody>
                {resolved.map((h) => {
                  const isOverridden = !!overrides[h.id];
                  const defaultHelper = WORD_HELPERS.find((d) => d.id === h.id)!;
                  return (
                    <WordToolRow
                      key={h.id}
                      helper={defaultHelper}
                      currentShortcut={h.shortcut}
                      currentDisplay={h.shortcutDisplay}
                      isOverridden={isOverridden}
                      onSet={(key) => setOverride(h.id, key)}
                      onReset={() => resetOverride(h.id)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
