/**
 * ghostText.ts — Cursor-style inline AI autocomplete for CodeMirror 6
 *
 * How it works:
 *  1. A ViewPlugin watches every document/selection change.
 *  2. After 500 ms of inactivity it sends the text before & after the cursor
 *     to /api/editor/autocomplete.
 *  3. The response is stored in a StateField and rendered as a gray italic
 *     widget after the cursor. `white-space: pre` means any leading \n in the
 *     completion is rendered as a real visual line break, so next-line
 *     suggestions appear below the cursor — not appended on the same line.
 *  4. Tab accepts the suggestion (inserts the FULL text, newlines included).
 *     Escape dismisses it.
 *  5. Any doc change or cursor movement cancels the request and clears ghost.
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
    // white-space: pre (set in theme) means \n is rendered as a real visual
    // line break, so multi-line completions appear below the cursor correctly.
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

// ── Keymap ────────────────────────────────────────────────────────────────────

const ghostKeymap = Prec.highest(
  keymap.of([
    {
      key: 'Tab',
      run(view) {
        const text = view.state.field(ghostSuggestionField);
        if (!text) return false;
        const pos = view.state.selection.main.head;
        // Insert the FULL text at cursor — leading \n creates a real new line.
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
  ]),
);

// ── Async fetch plugin ────────────────────────────────────────────────────────

function makeFetchPlugin(apiUrl: string, getFileName: () => string) {
  return ViewPlugin.fromClass(
    class {
      private timer: ReturnType<typeof setTimeout> | null = null;
      private abort: AbortController | null = null;

      constructor(private view: EditorView) {}

      update(update: ViewUpdate) {
        if (!update.docChanged && !update.selectionSet) return;
        this.cancelFetch();
        const state = update.state;
        if (!state.selection.main.empty) return;
        if (state.doc.length < 15) return;
        this.timer = setTimeout(() => this.fetch(), 500);
      }

      private cancelFetch() {
        if (this.timer !== null) { clearTimeout(this.timer); this.timer = null; }
        if (this.abort) { this.abort.abort(); this.abort = null; }
      }

      private async fetch() {
        const view = this.view;
        const pos = view.state.selection.main.head;
        const raw = view.state.doc.toString();

        const prefix = raw.slice(Math.max(0, pos - 1000), pos);
        const suffix = raw.slice(pos, Math.min(raw.length, pos + 200));

        if (prefix.trimEnd().length < 12) return;

        this.abort = new AbortController();

        try {
          const res = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prefix, suffix, fileName: getFileName() }),
            signal: this.abort.signal,
          });

          if (!res.ok) return;

          const data = await res.json() as { completion?: string };
          // trimEnd only — preserve any leading \n so next-line completions
          // render below the cursor in the ghost widget.
          const completion = (data.completion ?? '').trimEnd();

          if (completion && view.state.selection.main.head === pos) {
            view.dispatch({ effects: setGhostSuggestion.of(completion) });
          }
        } catch {
          // Aborted or network error — silently swallow.
        }
      }

      destroy() { this.cancelFetch(); }
    },
  );
}

// ── Styling ───────────────────────────────────────────────────────────────────

const ghostStyle = EditorView.baseTheme({
  '.cm-ghost-suggestion': {
    color: 'rgba(180, 165, 215, 0.38)',
    fontStyle: 'italic',
    pointerEvents: 'none',
    // pre: preserves \n as a real visual line break inside the widget span,
    // so next-line completions appear below the cursor in the editor view.
    whiteSpace: 'pre',
    userSelect: 'none',
  },
});

// ── Public API ────────────────────────────────────────────────────────────────

export function ghostTextExtension(
  apiUrl = '/api/editor/autocomplete',
  getFileName: () => string = () => '',
): Extension {
  return [
    ghostSuggestionField,
    ghostDecorationPlugin,
    ghostKeymap,
    makeFetchPlugin(apiUrl, getFileName),
    ghostStyle,
  ];
}
