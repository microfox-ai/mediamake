/**
 * ghostText.ts — Cursor-style inline AI autocomplete for CodeMirror 6
 *
 * How it works:
 *  1. A ViewPlugin watches every document/selection change.
 *  2. After 500 ms of inactivity it sends the text before & after the cursor
 *     to /api/studio/chat/agent/editor/autocomplete.
 *  3. The response is stored in a StateField and rendered as a ghost italic
 *     widget after the cursor. `white-space: pre` means any leading \n in the
 *     completion is rendered as a real visual line break.
 *  4. Tab accepts the suggestion. Escape dismisses it.
 *  5. Alt+G manually triggers a new (different) suggestion immediately.
 *     The keymap and fetch logic share a closure — no fragile StateEffect IPC.
 */

import { Extension, Prec, StateEffect, StateField } from '@codemirror/state';
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
  keymap,
} from '@codemirror/view';

// ── State ─────────────────────────────────────────────────────────────────────

export const setGhostSuggestion = StateEffect.define<string | null>();

const ghostSuggestionField = StateField.define<string | null>({
  create: () => null,
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(setGhostSuggestion)) return e.value;
    }
    if (tr.docChanged) return null;
    if (tr.selection) return null;
    return value;
  },
});

// ── Widget ────────────────────────────────────────────────────────────────────

class GhostTextWidget extends WidgetType {
  constructor(readonly text: string) { super(); }

  toDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = 'cm-ghost-suggestion';
    span.setAttribute('aria-hidden', 'true');
    span.textContent = this.text;
    return span;
  }

  eq(other: GhostTextWidget) { return other.text === this.text; }
  ignoreEvent() { return true; }
}

// ── Decoration plugin ─────────────────────────────────────────────────────────

const ghostDecorationPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }

    update(update: ViewUpdate) {
      const prev = update.startState.field(ghostSuggestionField);
      const next = update.state.field(ghostSuggestionField);
      if (update.docChanged || update.selectionSet || prev !== next) {
        this.decorations = this.build(update.view);
      }
    }

    build(view: EditorView): DecorationSet {
      const text = view.state.field(ghostSuggestionField);
      if (!text) return Decoration.none;
      const sel = view.state.selection.main;
      if (!sel.empty) return Decoration.none;
      return Decoration.set([
        Decoration.widget({ widget: new GhostTextWidget(text), side: 1 }).range(sel.head),
      ]);
    }
  },
  { decorations: (v) => v.decorations },
);

// ── Styling ───────────────────────────────────────────────────────────────────

const ghostStyle = EditorView.baseTheme({
  '.cm-ghost-suggestion': {
    color: 'rgba(180, 165, 215, 0.38)',
    fontStyle: 'italic',
    pointerEvents: 'none',
    whiteSpace: 'pre',
    userSelect: 'none',
  },
});

// ── Shared fetch logic + keymaps (built together to share closure) ────────────

function buildGhostFeatures(
  apiUrl: string,
  getFileName: () => string,
  getProjectId: () => string | undefined,
  getWritepadRules: () => string | undefined,
  getEnabled: () => boolean,
): Extension {
  // Shared mutable state — lives in the closure, not in CM state.
  let timer: ReturnType<typeof setTimeout> | null = null;
  let abort: AbortController | null = null;
  let lastSuggestion: string | null = null;

  function cancelPending() {
    if (timer !== null) { clearTimeout(timer); timer = null; }
    if (abort) { abort.abort(); abort = null; }
  }

  async function fetchSuggestion(view: EditorView, manual: boolean) {
    cancelPending();

    const pos = view.state.selection.main.head;
    const raw = view.state.doc.toString();
    const prefix = raw.slice(Math.max(0, pos - 300), pos);
    const suffix = raw.slice(pos, Math.min(raw.length, pos + 150));

    const minLen = manual ? 8 : 12;
    if (prefix.trimEnd().length < minLen) return;

    abort = new AbortController();
    const currentAbort = abort;

    try {
      const body: Record<string, string> = {
        prefix,
        suffix,
        fileName: getFileName(),
      };
      const projectId = getProjectId();
      if (projectId) body.projectId = projectId;
      if (manual && lastSuggestion) body.previousSuggestion = lastSuggestion;
      const rules = getWritepadRules();
      if (rules) body.writepadRules = rules;

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: currentAbort.signal,
      });

      if (!res.ok) return;

      const data = await res.json() as { completion?: string };
      const completion = (data.completion ?? '').trimEnd();

      if (!completion) return;
      // For manual: always show. For auto: only if cursor hasn't moved.
      if (manual || view.state.selection.main.head === pos) {
        lastSuggestion = completion;
        view.dispatch({ effects: setGhostSuggestion.of(completion) });
      }
    } catch {
      // Aborted or network error — swallow silently.
    }
  }

  // Debounced auto-trigger on every doc/selection change
  const fetchPlugin = ViewPlugin.fromClass(
    class {
      constructor(private view: EditorView) {}

      update(update: ViewUpdate) {
        if (!update.docChanged && !update.selectionSet) return;
        // When auto-complete is disabled, cancel any pending fetch and bail out.
        // Alt+G (manual) still works — it calls fetchSuggestion directly.
        if (!getEnabled()) { cancelPending(); return; }
        cancelPending();
        const state = update.state;
        if (!state.selection.main.empty) return;
        if (state.doc.length < 15) return;
        timer = setTimeout(() => fetchSuggestion(this.view, false), 500);
      }

      destroy() { cancelPending(); }
    },
  );

  // Keymap: Tab accepts, Escape dismisses, Ctrl+Enter manually triggers.
  // Ctrl+Enter calls fetchSuggestion directly — no StateEffect IPC needed.
  const ghostKeymap = Prec.highest(
    keymap.of([
      {
        key: 'Tab',
        run(view) {
          const text = view.state.field(ghostSuggestionField);
          if (!text) return false;
          const pos = view.state.selection.main.head;
          view.dispatch({
            changes: { from: pos, insert: text },
            selection: { anchor: pos + text.length },
            effects: setGhostSuggestion.of(null),
          });
          return true;
        },
      },
      {
        key: 'Escape',
        run(view) {
          const text = view.state.field(ghostSuggestionField);
          if (!text) return false;
          view.dispatch({ effects: setGhostSuggestion.of(null) });
          return true;
        },
      },
      {
        // Alt+G (Generate): clear current ghost immediately, then fetch a new (different) suggestion.
        // Alt+letter shortcuts are confirmed working in CM (same pattern as word helpers).
        key: 'Alt-g',
        run(view) {
          view.dispatch({ effects: setGhostSuggestion.of(null) });
          fetchSuggestion(view, true);
          return true;
        },
      },
    ]),
  );

  return [fetchPlugin, ghostKeymap];
}

// ── Public API ────────────────────────────────────────────────────────────────

export function ghostTextExtension(
  apiUrl = '/api/studio/chat/agent/editor/autocomplete',
  getFileName: () => string = () => '',
  getProjectId: () => string | undefined = () => undefined,
  getWritepadRules: () => string | undefined = () => undefined,
  getEnabled: () => boolean = () => true,
): Extension {
  return [
    ghostSuggestionField,
    ghostDecorationPlugin,
    buildGhostFeatures(apiUrl, getFileName, getProjectId, getWritepadRules, getEnabled),
    ghostStyle,
  ];
}
