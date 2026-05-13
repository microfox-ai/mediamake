/**
 * wordHelperExtension.ts — CodeMirror 6 extension that wires keyboard shortcuts
 * for all word-helper agents (synonyms, rhymes, antonyms, …).
 *
 * When a shortcut fires:
 *  1. Checks that the editor has a non-empty selection.
 *  2. Captures the selected word, surrounding context, and screen coordinates.
 *  3. Calls onRequest() so the React layer can fetch suggestions and show the popup.
 *
 * Shortcuts are all Alt+<letter> and do not conflict with any existing bindings.
 * They are registered at Prec.highest so they fire before CodeMirror defaults.
 */

import { Extension, Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { WORD_HELPERS, type WordHelper } from './wordHelpers';

export interface WordHelperRequest {
  agentId: string;
  /** The exact text the user had selected. */
  word: string;
  /** CodeMirror document position — start of selection (for replacement). */
  from: number;
  /** CodeMirror document position — end of selection (for replacement). */
  to: number;
  /** ~200 chars before + after cursor, for AI context. */
  context: string;
  /** Screen-space coords of the selection start (for popup positioning). */
  coords: { top: number; left: number; bottom: number };
}

function triggerHelper(
  view: EditorView,
  agentId: string,
  onRequest: (req: WordHelperRequest) => void,
): boolean {
  const sel = view.state.selection.main;
  if (sel.empty) return false;

  const word = view.state.sliceDoc(sel.from, sel.to).trim();
  if (!word) return false;

  const raw = view.state.doc.toString();
  const contextBefore = raw.slice(Math.max(0, sel.from - 200), sel.from);
  const contextAfter = raw.slice(sel.to, Math.min(raw.length, sel.to + 200));
  const context = contextBefore + '[WORD]' + contextAfter;

  const coords = view.coordsAtPos(sel.from);
  if (!coords) return false;

  onRequest({
    agentId,
    word,
    from: sel.from,
    to: sel.to,
    context,
    coords: { top: coords.top, left: coords.left, bottom: coords.bottom },
  });

  return true;
}

export function wordHelperExtension(
  onRequest: (req: WordHelperRequest) => void,
  resolvedHelpers: WordHelper[] = WORD_HELPERS,
): Extension {
  return Prec.highest(
    keymap.of(
      resolvedHelpers.map(({ id, shortcut }) => ({
        key: shortcut,
        run: (view: EditorView) => triggerHelper(view, id, onRequest),
      })),
    ),
  );
}
