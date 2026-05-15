'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WORD_HELPERS, type WordHelper } from '@/components/writepad/middle/wordHelpers';

interface KeymapState {
  /** helperId → overridden CodeMirror key string (e.g. "Alt-q") */
  overrides: Record<string, string>;
  setOverride: (helperId: string, key: string) => void;
  resetOverride: (helperId: string) => void;
  resetAll: () => void;
  /** Returns WORD_HELPERS with overridden shortcuts applied */
  resolvedKeymaps: () => WordHelper[];
}

export const useKeymapStore = create<KeymapState>()(
  persist(
    (set, get) => ({
      overrides: {},

      setOverride(helperId, key) {
        set((s) => ({ overrides: { ...s.overrides, [helperId]: key } }));
      },

      resetOverride(helperId) {
        set((s) => {
          const next = { ...s.overrides };
          delete next[helperId];
          return { overrides: next };
        });
      },

      resetAll() {
        set({ overrides: {} });
      },

      resolvedKeymaps() {
        const { overrides } = get();
        return WORD_HELPERS.map((h) =>
          overrides[h.id]
            ? {
                ...h,
                shortcut: overrides[h.id],
                shortcutDisplay: overrides[h.id]
                  .replace('Alt-', 'Alt+')
                  .replace('Ctrl-', 'Ctrl+')
                  .replace('Shift-', 'Shift+')
                  .toUpperCase(),
              }
            : h,
        );
      },
    }),
    { name: 'wp_keymaps' },
  ),
);
