/**
 * commentDecorations.ts
 *
 * CodeMirror 6 extension that highlights lines that have comments.
 * - Subtle amber left-border + background tint on commented lines
 * - A small count badge widget at end of line
 * - Dispatches a custom event when a commented line is clicked
 */

import {
  StateEffect,
  StateField,
  type Extension,
  type Range,
} from '@codemirror/state';
import {
  EditorView,
  Decoration,
  type DecorationSet,
  WidgetType,
} from '@codemirror/view';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CommentLineMeta {
  lineNumber: number; // 1-based
  count: number;
}

// ─── Effects ──────────────────────────────────────────────────────────────────

export const setCommentLinesEffect = StateEffect.define<CommentLineMeta[]>();

// ─── Widget ──────────────────────────────────────────────────────────────────

class CommentBadgeWidget extends WidgetType {
  constructor(private count: number) {
    super();
  }
  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-comment-badge';
    span.textContent = `💬 ${this.count}`;
    return span;
  }
  eq(other: CommentBadgeWidget) {
    return other.count === this.count;
  }
}

// ─── State field ──────────────────────────────────────────────────────────────

const commentLinesField = StateField.define<CommentLineMeta[]>({
  create: () => [],
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setCommentLinesEffect)) return effect.value;
    }
    return value;
  },
});

// ─── Decoration provider ──────────────────────────────────────────────────────

const commentDecorationPlugin = EditorView.decorations.compute(
  [commentLinesField],
  (state) => {
    const metas = state.field(commentLinesField);
    if (!metas.length) return Decoration.none;

    const decorations: Range<Decoration>[] = [];

    for (const meta of metas) {
      const lineNum = meta.lineNumber;
      if (lineNum < 1 || lineNum > state.doc.lines) continue;
      const line = state.doc.line(lineNum);

      // Line background decoration
      decorations.push(
        Decoration.line({ class: 'cm-comment-line' }).range(line.from),
      );
      // Badge widget at end of line
      decorations.push(
        Decoration.widget({
          widget: new CommentBadgeWidget(meta.count),
          side: 1,
        }).range(line.to),
      );
    }

    // Must be sorted by `from`
    decorations.sort((a, b) => a.from - b.from);
    return Decoration.set(decorations, true);
  },
);

// ─── Click handler ────────────────────────────────────────────────────────────

function commentClickHandler(
  onLineClick: (lineNumber: number) => void,
): Extension {
  return EditorView.domEventHandlers({
    click(event, view) {
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
      if (pos === null) return false;
      const metas = view.state.field(commentLinesField, false);
      if (!metas?.length) return false;
      const clickedLine = view.state.doc.lineAt(pos).number;
      const meta = metas.find((m) => m.lineNumber === clickedLine);
      if (!meta) return false;
      onLineClick(clickedLine);
      return true;
    },
  });
}

// ─── Theme ───────────────────────────────────────────────────────────────────

const commentTheme = EditorView.baseTheme({
  '.cm-comment-line': {
    borderLeft: '2px solid hsl(38 92% 50% / 0.6)',
    backgroundColor: 'hsl(38 92% 50% / 0.06)',
  },
  '.cm-comment-badge': {
    marginLeft: '8px',
    fontSize: '10px',
    opacity: '0.55',
    userSelect: 'none',
    cursor: 'pointer',
  },
});

// ─── Public API ──────────────────────────────────────────────────────────────

export function commentDecorationsExtension(
  onLineClick: (lineNumber: number) => void,
): Extension {
  return [
    commentLinesField,
    commentDecorationPlugin,
    commentClickHandler(onLineClick),
    commentTheme,
  ];
}
