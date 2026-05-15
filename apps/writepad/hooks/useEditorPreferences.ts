'use client';

import { useState, useEffect, useCallback } from 'react';

export type EditorTheme = 'dark' | 'light';

export type EditorFont =
  | 'ui-monospace'
  | 'JetBrains Mono'
  | 'Fira Code'
  | 'Source Code Pro'
  | 'Cascadia Code'
  | 'Courier New';

export interface EditorPreferences {
  theme: EditorTheme;
  font: EditorFont;
  fontSize: number;    // 11–20
  lineHeight: number;  // 1.2–2.2 (step 0.1)
  wordWrap: boolean;
  lineNumbers: boolean;
  /** Whether cursor-placement AI auto-complete is active. Alt+G manual trigger always works. */
  autoComplete: boolean;
  /** Show .writepad/plans/ files in the file explorer. Hidden by default. */
  showPlanFiles: boolean;
}

export const FONT_LABELS: Record<EditorFont, string> = {
  'ui-monospace': 'System Mono',
  'JetBrains Mono': 'JetBrains Mono',
  'Fira Code': 'Fira Code',
  'Source Code Pro': 'Source Code Pro',
  'Cascadia Code': 'Cascadia Code',
  'Courier New': 'Courier New',
};

const DEFAULTS: EditorPreferences = {
  theme: 'dark',
  font: 'ui-monospace',
  fontSize: 13,
  lineHeight: 1.6,
  wordWrap: true,
  lineNumbers: true,
  autoComplete: true,
  showPlanFiles: false,
};

const STORAGE_KEY = 'writepad_editor_prefs';

export function useEditorPreferences() {
  const [prefs, setPrefsState] = useState<EditorPreferences>(DEFAULTS);

  // Load from localStorage on mount (client-only)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPrefsState({ ...DEFAULTS, ...(JSON.parse(raw) as Partial<EditorPreferences>) });
    } catch { /* ignore */ }
  }, []);

  const setPrefs = useCallback((update: Partial<EditorPreferences>) => {
    setPrefsState((prev) => {
      const next = { ...prev, ...update };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  return { prefs, setPrefs };
}
