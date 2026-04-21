'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { WORD_HELPERS } from './wordHelpers';

const SHORTCUT_SECTIONS = [
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
  {
    title: 'Word Tools  (select a word first)',
    items: WORD_HELPERS.map((h) => ({
      key: h.shortcutDisplay,
      desc: `${h.label} — ${h.description}`,
    })),
  },
];

export { SHORTCUT_SECTIONS };

export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-5">
          {SHORTCUT_SECTIONS.map((section) => (
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
