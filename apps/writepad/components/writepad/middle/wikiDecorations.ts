'use client';

/**
 * wikiDecorations — CodeMirror extension for local wiki term highlighting.
 *
 * Architecture:
 *  - setWikiTermsEffect:    Push updated WikiTerm[] from React into CM state.
 *  - setWikiGoToDefEffect:  Push the "go to definition" callback into CM state.
 *  - wikiTermsField:        Stores current WikiTerm[].
 *  - wikiGoToDefField:      Stores the navigation callback (fileId → void).
 *  - wikiRangesField:       Pre-computed match ranges for:
 *                             1. Whole-word auto-matches (all allTerms)  → dotted underline
 *                             2. [[wikilink]] / [[target|display]] syntax → solid underline
 *                           Longer matches win at the same position (dedup).
 *                           Explicit wikilinks win over auto-matches at same position.
 *  - wikiDecorationsPlugin: Renders Decorations (dotted vs solid) from ranges.
 *  - wikiClickPlugin:       Ctrl/Cmd+Click navigates to the wiki definition.
 *  - wikiHoverTooltip:      Hover popup with summary, alias, and tag info.
 *  - wikiTheme:             EditorView.baseTheme with all styles.
 */

import {
  StateEffect,
  StateField,
  RangeSet,
  type Range,
  type Extension,
} from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  hoverTooltip,
} from '@codemirror/view';
import type { WikiTerm } from './types';

// ─── Effects ─────────────────────────────────────────────────────────────────

export const setWikiTermsEffect = StateEffect.define<WikiTerm[]>();
export const setWikiGoToDefEffect = StateEffect.define<((fileId: string) => void) | null>();

// ─── Field: current wiki terms ────────────────────────────────────────────────

const wikiTermsField = StateField.define<WikiTerm[]>({
  create: () => [],
  update(terms, tr) {
    for (const e of tr.effects) {
      if (e.is(setWikiTermsEffect)) return e.value;
    }
    return terms;
  },
});

// ─── Field: navigation callback ──────────────────────────────────────────────

const wikiGoToDefField = StateField.define<((fileId: string) => void) | null>({
  create: () => null,
  update(cb, tr) {
    for (const e of tr.effects) {
      if (e.is(setWikiGoToDefEffect)) return e.value;
    }
    return cb;
  },
});

// ─── WikiRange ────────────────────────────────────────────────────────────────

interface WikiRange {
  from: number;
  to: number;
  term: WikiTerm;
  /** The exact text that was matched (may be an alias, display text, or the primary term) */
  matchedWord: string;
  /**
   * true  → came from [[wikilink]] / [[target|display]] syntax (solid underline)
   * false → came from whole-word auto-matching (dotted underline)
   */
  isWikilink: boolean;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── Field: pre-computed match ranges ────────────────────────────────────────
// wikiTermsField MUST appear before wikiRangesField in the extension array.
//
// Two passes:
//   1. [[wikilink]] / [[target|display]] scan — explicit links, solid underline
//   2. Whole-word regex scan across allTerms — auto-detected, dotted underline
//
// Sort by (from ASC, to DESC, isWikilink DESC) so:
//   - longer matches win at the same start position
//   - explicit wikilinks win over auto-matches at the exact same range
// Then deduplicate: skip any range that overlaps the last accepted one.
export const wikiRangesField = StateField.define<WikiRange[]>({
  create: () => [],
  update(ranges, tr) {
    const termsChanged = tr.effects.some((e) => e.is(setWikiTermsEffect));
    if (!tr.docChanged && !termsChanged) return ranges;

    const terms = tr.state.field(wikiTermsField);
    if (terms.length === 0) return [];

    const text = tr.state.doc.toString();
    const newRanges: WikiRange[] = [];

    // ── Pass 1: [[wikilink]] and [[target|display]] syntax ────────────────
    const wikilinkRe = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;
    let wm: RegExpExecArray | null;
    while ((wm = wikilinkRe.exec(text)) !== null) {
      const rawTarget = wm[1]!;              // e.g. "Aethelgard" or "aethelgard"
      const rawDisplay = wm[2];             // e.g. "The City", or undefined
      const targetName = rawTarget.trim();

      const matchedWt = terms.find((wt) =>
        wt.allTerms.some((n) => n.toLowerCase() === targetName.toLowerCase()),
      );
      if (!matchedWt) continue;

      // Decorate the display text (pipe syntax) or the target text
      const innerText = rawDisplay ?? rawTarget;
      // Offset from start of full match: "[[ " = 2 chars, then optionally "rawTarget|"
      const innerOffset = rawDisplay !== undefined ? 2 + rawTarget.length + 1 : 2;

      newRanges.push({
        from: wm.index + innerOffset,
        to: wm.index + innerOffset + innerText.length,
        term: matchedWt,
        matchedWord: innerText.trim(),
        isWikilink: true,
      });
    }

    // ── Pass 2: whole-word auto-matching across allTerms ──────────────────
    for (const wt of terms) {
      for (const matchName of wt.allTerms) {
        if (!matchName.trim()) continue;
        const re = new RegExp(`\\b${escapeRegex(matchName)}\\b`, 'gi');
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) {
          newRanges.push({
            from: m.index,
            to: m.index + m[0].length,
            term: wt,
            matchedWord: m[0],
            isWikilink: false,
          });
        }
      }
    }

    // Sort: position ASC, length DESC, wikilink first at same position+length
    newRanges.sort(
      (a, b) =>
        a.from - b.from ||
        b.to - a.to ||
        (b.isWikilink ? 1 : 0) - (a.isWikilink ? 1 : 0),
    );

    // Dedup: skip any range that overlaps the previous accepted range
    const deduped: WikiRange[] = [];
    let lastEnd = -1;
    for (const r of newRanges) {
      if (r.from >= lastEnd) {
        deduped.push(r);
        lastEnd = r.to;
      }
    }
    return deduped;
  },
});

// ─── Decoration marks ─────────────────────────────────────────────────────────
// Auto-match  → dotted underline (cm-wiki-term)
// [[wikilink]] → solid underline (cm-wiki-term cm-wiki-wikilink)

const wikiMark = Decoration.mark({ class: 'cm-wiki-term' });
const wikilinkMark = Decoration.mark({ class: 'cm-wiki-term cm-wiki-wikilink' });

function buildDecorations(view: EditorView): DecorationSet {
  const ranges = view.state.field(wikiRangesField);
  if (ranges.length === 0) return Decoration.none;
  const deco: Range<Decoration>[] = ranges.map(({ from, to, isWikilink }) =>
    (isWikilink ? wikilinkMark : wikiMark).range(from, to),
  );
  try {
    return RangeSet.of(deco, true); // already sorted
  } catch {
    return Decoration.none;
  }
}

// ─── ViewPlugin: renders decorations ─────────────────────────────────────────
// NOTE: ViewUpdate does NOT have an `effects` property — effects live on each
// Transaction inside `update.transactions`. StateField.update() receives a
// Transaction directly (where .effects is valid), but ViewPlugin.update()
// receives a ViewUpdate, so we must iterate .transactions.

const wikiDecorationsPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }
    update(update: ViewUpdate) {
      const wikiEffectFired = update.transactions.some((tr) =>
        tr.effects.some((e) => e.is(setWikiTermsEffect)),
      );
      if (update.docChanged || wikiEffectFired) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations },
);

// ─── domEventHandler: Ctrl/Cmd+mousedown to navigate to definition ───────────
// Using EditorView.domEventHandlers (not a ViewPlugin click listener) so our
// handler runs BEFORE CodeMirror's own mousedown handler that adds a cursor.
// Returning true marks the event as handled, preventing CM's cursor placement.

const wikiClickExtension = EditorView.domEventHandlers({
  mousedown(event, view) {
    if (!(event.ctrlKey || event.metaKey)) return false;
    const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
    if (pos === null) return false;
    const ranges = view.state.field(wikiRangesField, false);
    if (!ranges) return false;
    const match = ranges.find((r) => r.from <= pos && pos <= r.to);
    if (!match) return false;
    event.preventDefault();
    const cb = view.state.field(wikiGoToDefField, false);
    cb?.(match.term.fileId);
    return true; // prevents CM from processing the mousedown (no cursor added)
  },
});

// ─── Hover tooltip ────────────────────────────────────────────────────────────

const wikiHoverTooltip = hoverTooltip(
  (view, pos) => {
    const ranges = view.state.field(wikiRangesField);
    const match = ranges.find((r) => r.from <= pos && pos <= r.to);
    if (!match) return null;

    const isAlias = match.matchedWord.toLowerCase() !== match.term.term.toLowerCase();

    return {
      pos: match.from,
      end: match.to,
      above: true,
      create() {
        const dom = document.createElement('div');
        dom.className = 'cm-wiki-tooltip';

        // Term header (always shows the canonical primary term name)
        const header = document.createElement('div');
        header.className = 'cm-wiki-tooltip-header';
        header.textContent = match.term.term;
        dom.appendChild(header);

        // Alias attribution
        if (isAlias) {
          const aliasBadge = document.createElement('div');
          aliasBadge.className = 'cm-wiki-tooltip-alias';
          aliasBadge.textContent = `alias: ${match.matchedWord}`;
          dom.appendChild(aliasBadge);
        }

        // Wikilink badge
        if (match.isWikilink) {
          const wlBadge = document.createElement('div');
          wlBadge.className = 'cm-wiki-tooltip-alias';
          wlBadge.textContent = '[[wikilink]]';
          dom.appendChild(wlBadge);
        }

        // Tags row
        if (match.term.tags.length > 0) {
          const tagsRow = document.createElement('div');
          tagsRow.className = 'cm-wiki-tooltip-tags';
          match.term.tags.forEach((tag) => {
            const chip = document.createElement('span');
            chip.className = 'cm-wiki-tooltip-tag';
            chip.textContent = tag;
            tagsRow.appendChild(chip);
          });
          dom.appendChild(tagsRow);
        }

        // Summary body
        if (match.term.summary) {
          const body = document.createElement('div');
          body.className = 'cm-wiki-tooltip-body';
          body.textContent =
            match.term.summary.length > 220
              ? match.term.summary.slice(0, 220) + '…'
              : match.term.summary;
          dom.appendChild(body);
        }

        // Hint
        const hint = document.createElement('div');
        hint.className = 'cm-wiki-tooltip-hint';
        hint.textContent = 'Ctrl+click to open · Right-click for options';
        dom.appendChild(hint);

        return { dom };
      },
    };
  },
  { hoverTime: 400 },
);

// ─── Theme ────────────────────────────────────────────────────────────────────

const wikiTheme = EditorView.baseTheme({
  // Auto-matched wiki terms — dotted underline
  '.cm-wiki-term': {
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
    textDecorationColor: '#8b5cf6',
    textUnderlineOffset: '2px',
    cursor: 'pointer',
  },
  // Explicit [[wikilink]] — solid underline (overrides dotted from cm-wiki-term)
  '.cm-wiki-wikilink': {
    textDecorationStyle: 'solid',
  },
  '.cm-wiki-tooltip': {
    background: 'var(--popover, #1e1e2e)',
    border: '1px solid var(--border, #3f3f46)',
    borderRadius: '6px',
    padding: '8px 10px',
    maxWidth: '300px',
    boxShadow: '0 4px 14px rgba(0,0,0,0.22)',
    fontFamily: 'inherit',
  },
  '.cm-wiki-tooltip-header': {
    fontWeight: '600',
    fontSize: '11.5px',
    color: '#8b5cf6',
    marginBottom: '2px',
  },
  '.cm-wiki-tooltip-alias': {
    fontSize: '10px',
    color: '#a78bfa',
    opacity: '0.7',
    marginBottom: '3px',
    fontStyle: 'italic',
  },
  '.cm-wiki-tooltip-tags': {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '3px',
    marginBottom: '5px',
  },
  '.cm-wiki-tooltip-tag': {
    fontSize: '9px',
    padding: '1px 5px',
    borderRadius: '999px',
    background: 'rgba(139,92,246,0.15)',
    color: '#a78bfa',
    border: '1px solid rgba(139,92,246,0.25)',
  },
  '.cm-wiki-tooltip-body': {
    fontSize: '11px',
    lineHeight: '1.5',
    marginBottom: '5px',
    opacity: '0.85',
    wordBreak: 'break-word',
  },
  '.cm-wiki-tooltip-hint': {
    fontSize: '10px',
    opacity: '0.40',
    fontStyle: 'italic',
  },
});

// ─── Public extension factory ─────────────────────────────────────────────────

export function wikiDecorationsExtension(): Extension {
  return [
    wikiTermsField,
    wikiGoToDefField,
    wikiRangesField,
    wikiDecorationsPlugin,
    wikiClickExtension,
    wikiHoverTooltip,
    wikiTheme,
  ];
}

export function getWikiTermAtPos(view: EditorView, pos: number): WikiTerm | null {
  const ranges = view.state.field(wikiRangesField, false);
  if (!ranges) return null;
  const match = ranges.find((r) => r.from <= pos && pos <= r.to);
  return match?.term ?? null;
}
