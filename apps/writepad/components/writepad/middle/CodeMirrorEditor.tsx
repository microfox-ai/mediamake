'use client';

/**
 * CodeMirrorEditor — VS Code-like editor for the writepad IDE.
 * Loaded via next/dynamic (ssr: false) because CodeMirror needs browser APIs.
 */

import {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useMemo,
} from 'react';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { vscodeDark, vscodeLight } from '@uiw/codemirror-theme-vscode';
import { EditorView, keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import { moveLineUp, moveLineDown } from '@codemirror/commands';
import type { EditorPreferences } from '@/hooks/useEditorPreferences';
import {
  autocompletion,
  type CompletionContext,
  type Completion,
} from '@codemirror/autocomplete';
import {
  search,
  SearchQuery,
  setSearchQuery,
  findNext,
  findPrevious,
} from '@codemirror/search';
import { ghostTextExtension } from './ghostText';
import { wordHelperExtension, type WordHelperRequest } from './wordHelperExtension';
import { WORD_HELPERS } from './wordHelpers';
import { useKeymapStore } from '@/lib/stores/keymapStore';
import type { SelectionContext, WikiTerm } from './types';
import { wikiDecorationsExtension, setWikiTermsEffect, setWikiGoToDefEffect, getWikiTermAtPos } from './wikiDecorations';
import { commentDecorationsExtension, setCommentLinesEffect, type CommentLineMeta } from './commentDecorations';

// ─── Markdown snippet completions ────────────────────────────────────────────

const MARKDOWN_SNIPPETS: Completion[] = [
  { label: '# ', detail: 'Heading 1', type: 'keyword' },
  { label: '## ', detail: 'Heading 2', type: 'keyword' },
  { label: '### ', detail: 'Heading 3', type: 'keyword' },
  { label: '**bold**', detail: 'Bold text', type: 'text', apply: '**bold**' },
  { label: '*italic*', detail: 'Italic text', type: 'text', apply: '*italic*' },
  { label: '```', detail: 'Code block', type: 'keyword', apply: '```\n\n```' },
  { label: '---', detail: 'Horizontal rule', type: 'keyword' },
  { label: '> ', detail: 'Blockquote', type: 'keyword' },
  { label: '- [ ] ', detail: 'Task list item', type: 'keyword' },
  { label: '- ', detail: 'List item', type: 'keyword' },
];

function markdownCompletions(context: CompletionContext) {
  const word = context.matchBefore(/\S*/);
  if (!word || (word.from === word.to && !context.explicit)) return null;
  const docText = context.state.doc.toString();
  const wordSet = new Set(docText.match(/\b\w{4,}\b/g) ?? []);
  const wordCompletions: Completion[] = Array.from(wordSet)
    .filter((w) => w.startsWith(word.text) && w !== word.text)
    .map((w) => ({ label: w, type: 'text' }));
  const snippetMatches = MARKDOWN_SNIPPETS.filter((s) => s.label.startsWith(word.text));
  return { from: word.from, options: [...snippetMatches, ...wordCompletions] };
}

// ─── Format helpers ──────────────────────────────────────────────────────────

type FormatType = 'bold' | 'italic' | 'h1' | 'h2' | 'h3' | 'hr' | 'quote' | 'ul' | 'ol' | 'code';

function buildInsertion(type: FormatType, selected: string): { text: string; cursorOffset: number } {
  switch (type) {
    case 'bold':   return { text: `**${selected || 'bold'}**`,     cursorOffset: selected ? 0 : 4 };
    case 'italic': return { text: `*${selected || 'italic'}*`,     cursorOffset: selected ? 0 : 6 };
    case 'h1':     return { text: `# ${selected || 'Heading 1'}`,  cursorOffset: 2 };
    case 'h2':     return { text: `## ${selected || 'Heading 2'}`, cursorOffset: 3 };
    case 'h3':     return { text: `### ${selected || 'Heading 3'}`,cursorOffset: 4 };
    case 'hr':     return { text: `\n\n---\n\n`,                   cursorOffset: 7 };
    case 'quote':  return { text: `> ${selected || 'Quote'}`,      cursorOffset: 2 };
    case 'ul':     return { text: `- ${selected || 'Item'}`,       cursorOffset: 2 };
    case 'ol':     return { text: `1. ${selected || 'Item'}`,      cursorOffset: 3 };
    case 'code':   return { text: `\`\`\`\n${selected || 'code'}\n\`\`\``, cursorOffset: 4 };
  }
}

// ─── Ref handle ──────────────────────────────────────────────────────────────

export interface CodeMirrorEditorHandle {
  applyFormat: (type: FormatType) => void;
  /** Insert at cursor (replaces current selection). */
  insertText: (text: string) => void;
  selectAll: () => void;
  goToLine: (line: number) => void;
  goToOffset: (offset: number) => void;
  focus: () => void;
  getSelectedText: () => string;
  /** Replace a range in the document (used by word helper popup to swap words). */
  replaceRange: (from: number, to: number, text: string) => void;
  /** CM doc positions of the current main selection. */
  getSelectionRange: () => { from: number; to: number } | null;
  /** 1-based line numbers of the current selection (null when empty). */
  getSelectionLines: () => { startLine: number; endLine: number } | null;
  /** Screen coords of the current selection start (for popup positioning). */
  getSelectionCoords: () => { top: number; left: number; bottom: number } | null;
  setSearch: (query: string, caseSensitive: boolean, isRegex: boolean) => void;
  findNextMatch: () => void;
  findPrevMatch: () => void;
  clearSearch: () => void;
  /** Returns the wiki term at the current cursor position, or null. */
  getWikiTermAtCursor: () => WikiTerm | null;
  /** Returns the word (identifier) at the current cursor position, or ''. */
  getWordAtCursor: () => string;
  /** Update which lines show comment decorations (amber highlight + badge). */
  setCommentLines: (metas: CommentLineMeta[]) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface CodeMirrorEditorProps {
  content: string;
  fileName: string;
  fileId: string;
  projectId?: string;
  prefs: EditorPreferences;
  onChange: (value: string) => void;
  onSave: () => void;
  onToggleSearch: () => void;
  onContextSelect: (ctx: SelectionContext) => void;
  onPrefsChange: (update: Partial<EditorPreferences>) => void;
  onWordHelper: (req: WordHelperRequest) => void;
  writepadRules?: string | null;
  /** Wiki terms to highlight in this editor (underlined with hover tooltips). */
  wikiTerms?: WikiTerm[];
  /** Called when the user Ctrl/Cmd+clicks a decorated wiki term. */
  onGoToDefinition?: (fileId: string) => void;
  /** Called when the user clicks a line that has comment decorations. */
  onCommentLineClick?: (lineNumber: number) => void;
}

export const CodeMirrorEditor = forwardRef<CodeMirrorEditorHandle, CodeMirrorEditorProps>(
  function CodeMirrorEditor({ content, fileName, fileId, projectId, prefs, onChange, onSave, onToggleSearch, onContextSelect, onPrefsChange, onWordHelper, writepadRules, wikiTerms, onGoToDefinition, onCommentLineClick }, ref) {
    const cmRef = useRef<ReactCodeMirrorRef>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Stable refs for all callbacks — prevents stale closures in the memoized keymap.
    // The keymap is created once (empty deps) but always calls the latest function via refs.
    const onSaveRef = useRef(onSave);
    const onToggleSearchRef = useRef(onToggleSearch);
    const onContextSelectRef = useRef(onContextSelect);
    const onPrefsChangeRef = useRef(onPrefsChange);
    const onWordHelperRef = useRef(onWordHelper);
    const writepadRulesRef = useRef(writepadRules);
    const projectIdRef = useRef(projectId);
    const prefsRef = useRef(prefs);
    const fileIdRef = useRef(fileId);
    const fileNameRef = useRef(fileName);

    useEffect(() => { onSaveRef.current = onSave; }, [onSave]);
    useEffect(() => { onToggleSearchRef.current = onToggleSearch; }, [onToggleSearch]);
    useEffect(() => { onContextSelectRef.current = onContextSelect; }, [onContextSelect]);
    useEffect(() => { onPrefsChangeRef.current = onPrefsChange; }, [onPrefsChange]);
    useEffect(() => { onWordHelperRef.current = onWordHelper; }, [onWordHelper]);
    useEffect(() => { writepadRulesRef.current = writepadRules; }, [writepadRules]);
    useEffect(() => { projectIdRef.current = projectId; }, [projectId]);
    useEffect(() => { prefsRef.current = prefs; }, [prefs]);
    useEffect(() => { fileIdRef.current = fileId; }, [fileId]);
    useEffect(() => { fileNameRef.current = fileName; }, [fileName]);

    // Stable ref for the comment line click callback.
    const onCommentLineClickRef = useRef(onCommentLineClick);
    useEffect(() => { onCommentLineClickRef.current = onCommentLineClick; }, [onCommentLineClick]);

    // Stable ref for the goToDef callback — kept in sync so the closure never goes stale.
    const onGoToDefinitionRef = useRef(onGoToDefinition);
    useEffect(() => { onGoToDefinitionRef.current = onGoToDefinition; }, [onGoToDefinition]);

    // Stable wrapper passed into CM state — identity never changes, so CM never sees a new fn.
    const goToDefCbRef = useRef<((fileId: string) => void) | null>(null);
    useEffect(() => {
      goToDefCbRef.current = onGoToDefinition
        ? (fileId: string) => onGoToDefinitionRef.current?.(fileId)
        : null;
    }, [onGoToDefinition]);

    // Push updated wiki terms into the running view whenever they change.
    // Exclude the term for this file so a wiki entry doesn't highlight itself.
    useEffect(() => {
      const view = cmRef.current?.view;
      if (!view) return;
      const filtered = (wikiTerms ?? []).filter((wt) => wt.fileId !== fileId);
      view.dispatch({ effects: setWikiTermsEffect.of(filtered) });
    }, [wikiTerms, fileId]);

    // Push the callback whenever its presence toggles (on → off or vice-versa).
    useEffect(() => {
      const view = cmRef.current?.view;
      if (!view) return;
      view.dispatch({ effects: setWikiGoToDefEffect.of(goToDefCbRef.current) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [!!onGoToDefinition]);

    // Ctrl+Wheel — increase/decrease font size
    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const handler = (e: WheelEvent) => {
        if (!e.ctrlKey) return;
        e.preventDefault();
        const delta = e.deltaY < 0 ? 1 : -1;
        const next = Math.max(11, Math.min(20, prefsRef.current.fontSize + delta));
        onPrefsChangeRef.current({ fontSize: next });
      };
      el.addEventListener('wheel', handler, { passive: false });
      return () => el.removeEventListener('wheel', handler);
    }, []);

    useImperativeHandle(ref, () => ({
      applyFormat(type: FormatType) {
        const view = cmRef.current?.view;
        if (!view) return;
        const sel = view.state.selection.main;
        const selected = view.state.sliceDoc(sel.from, sel.to);
        const { text, cursorOffset } = buildInsertion(type, selected);
        view.dispatch({
          changes: { from: sel.from, to: sel.to, insert: text },
          selection: { anchor: sel.from + cursorOffset },
        });
        view.focus();
      },
      insertText(text: string) {
        const view = cmRef.current?.view;
        if (!view) return;
        const sel = view.state.selection.main;
        view.dispatch({
          changes: { from: sel.from, to: sel.to, insert: text },
          selection: { anchor: sel.from + text.length },
        });
        view.focus();
      },
      selectAll() {
        const view = cmRef.current?.view;
        if (!view) return;
        view.dispatch({ selection: { anchor: 0, head: view.state.doc.length } });
        view.focus();
      },
      goToLine(line: number) {
        const view = cmRef.current?.view;
        if (!view) return;
        const doc = view.state.doc;
        const target = Math.max(1, Math.min(line, doc.lines));
        const lineObj = doc.line(target);
        view.dispatch({
          selection: { anchor: lineObj.from },
          effects: EditorView.scrollIntoView(lineObj.from, { y: 'center' }),
        });
        view.focus();
      },
      goToOffset(offset: number) {
        const view = cmRef.current?.view;
        if (!view) return;
        const clamped = Math.max(0, Math.min(offset, view.state.doc.length));
        view.dispatch({
          selection: { anchor: clamped },
          effects: EditorView.scrollIntoView(clamped, { y: 'center' }),
        });
        view.focus();
      },
      focus() {
        cmRef.current?.view?.focus();
      },
      getSelectedText() {
        const view = cmRef.current?.view;
        if (!view) return '';
        const sel = view.state.selection.main;
        return view.state.sliceDoc(sel.from, sel.to);
      },
      replaceRange(from: number, to: number, text: string) {
        const view = cmRef.current?.view;
        if (!view) return;
        view.dispatch({
          changes: { from, to, insert: text },
          selection: { anchor: from + text.length },
        });
        view.focus();
      },
      getSelectionRange() {
        const view = cmRef.current?.view;
        if (!view) return null;
        const sel = view.state.selection.main;
        if (sel.empty) return null;
        return { from: sel.from, to: sel.to };
      },
      getSelectionLines() {
        const view = cmRef.current?.view;
        if (!view) return null;
        const sel = view.state.selection.main;
        if (sel.empty) return null;
        const startLine = view.state.doc.lineAt(sel.from).number;
        const endLine = view.state.doc.lineAt(sel.to).number;
        return { startLine, endLine };
      },
      getSelectionCoords() {
        const view = cmRef.current?.view;
        if (!view) return null;
        const pos = view.state.selection.main.from;
        const coords = view.coordsAtPos(pos);
        if (!coords) return null;
        return { top: coords.top, left: coords.left, bottom: coords.bottom };
      },
      setSearch(query: string, caseSensitive: boolean, isRegex: boolean) {
        const view = cmRef.current?.view;
        if (!view) return;
        const q = new SearchQuery({ search: query, caseSensitive, regexp: isRegex });
        view.dispatch({ effects: setSearchQuery.of(q) });
      },
      findNextMatch() {
        const view = cmRef.current?.view;
        if (view) findNext(view as unknown as Parameters<typeof findNext>[0]);
      },
      findPrevMatch() {
        const view = cmRef.current?.view;
        if (view) findPrevious(view as unknown as Parameters<typeof findPrevious>[0]);
      },
      clearSearch() {
        const view = cmRef.current?.view;
        if (!view) return;
        view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ search: '' })) });
      },
      getWikiTermAtCursor() {
        const view = cmRef.current?.view;
        if (!view) return null;
        const pos = view.state.selection.main.head;
        return getWikiTermAtPos(view, pos);
      },
      getWordAtCursor() {
        const view = cmRef.current?.view;
        if (!view) return '';
        const pos = view.state.selection.main.head;
        // Try selected text first; fall back to word at cursor
        const sel = view.state.selection.main;
        if (!sel.empty) return view.state.sliceDoc(sel.from, sel.to).trim();
        const wordRange = view.state.wordAt(pos);
        if (!wordRange) return '';
        return view.state.sliceDoc(wordRange.from, wordRange.to);
      },
      setCommentLines(metas: CommentLineMeta[]) {
        const view = cmRef.current?.view;
        if (!view) return;
        view.dispatch({ effects: [setCommentLinesEffect.of(metas)] });
      },
    }));

    // All callbacks go through refs → keymap can use empty deps and never go stale.
    const customKeymap = useMemo(
      () =>
        Prec.highest(
          keymap.of([
            // Save (draft-first — logic lives in EditorPane.handleSave)
            { key: 'Ctrl-s', mac: 'Cmd-s', run: () => { onSaveRef.current(); return true; } },
            // Find/replace
            { key: 'Ctrl-f', mac: 'Cmd-f', run: () => { onToggleSearchRef.current(); return true; } },
            // Send selection to AI chat
            {
              key: 'Ctrl-l', mac: 'Cmd-l',
              run: (view) => {
                const sel = view.state.selection.main;
                const text = view.state.sliceDoc(sel.from, sel.to).trim();
                if (!text) return false;
                const docBefore = view.state.sliceDoc(0, sel.from);
                const startLine = docBefore.split('\n').length;
                const endLine = startLine + text.split('\n').length - 1;
                onContextSelectRef.current({ fileId: fileIdRef.current, file: fileNameRef.current, lines: `${startLine}-${endLine}`, startLine, endLine, text });
                return true;
              },
            },
            // Toggle word wrap
            { key: 'Alt-x', run: () => { onPrefsChangeRef.current({ wordWrap: !prefsRef.current.wordWrap }); return true; } },
            // Toggle AI auto-complete (cursor-triggered)
            { key: 'Alt-a', run: () => { onPrefsChangeRef.current({ autoComplete: !prefsRef.current.autoComplete }); return true; } },
            // Move current line up/down
            { key: 'Alt-ArrowUp', run: moveLineUp },
            { key: 'Alt-ArrowDown', run: moveLineDown },
          ]),
        ),
      [], // empty — everything reads through refs
    );

    // Wiki decorations — created once per file instance (state pushed via effect)
    const wikiExt = useMemo(
      () => wikiDecorationsExtension(),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [],
    );

    // Comment decorations — amber highlight + badge on commented lines; stable ref for callback.
    const commentExt = useMemo(
      () => commentDecorationsExtension((ln) => onCommentLineClickRef.current?.(ln)),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [], // stable — callback always read through ref
    );

    // Ghost text — recreated per file (component remounts via key={fileId})
    const ghostText = useMemo(
      () => ghostTextExtension(
        '/api/studio/chat/agent/editor/autocomplete',
        () => fileNameRef.current,
        () => projectIdRef.current,
        () => writepadRulesRef.current ?? undefined,
        () => prefsRef.current.autoComplete,
      ),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [],
    );

    // Word helper shortcuts — rebuilt only when the user actually remaps a key.
    // Select the raw overrides object (stable reference) to avoid calling a
    // function inside the selector (which would return a new array every render
    // and cause an infinite re-render loop).
    const keymapOverrides = useKeymapStore((s) => s.overrides);
    const resolvedHelpers = useMemo(
      () =>
        WORD_HELPERS.map((h) =>
          keymapOverrides[h.id]
            ? {
                ...h,
                shortcut: keymapOverrides[h.id],
                shortcutDisplay: keymapOverrides[h.id]
                  .replace('Alt-', 'Alt+')
                  .replace('Ctrl-', 'Ctrl+')
                  .replace('Shift-', 'Shift+')
                  .toUpperCase(),
              }
            : h,
        ),
      [keymapOverrides],
    );
    const wordHelper = useMemo(
      () => wordHelperExtension((req) => onWordHelperRef.current(req), resolvedHelpers),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [resolvedHelpers.map((h) => h.shortcut).join(',')],
    );

    // Word wrap extension — recreated when pref changes
    const wrapExt = useMemo(
      () => prefs.wordWrap ? EditorView.lineWrapping : [],
      [prefs.wordWrap],
    );

    // Font/size/line-height theme — applied via EditorView.theme so CM internals pick it up
    const fontTheme = useMemo(
      () => EditorView.theme({
        '&': { fontFamily: prefs.font },
        '.cm-content': {
          fontFamily: prefs.font,
          fontSize: `${prefs.fontSize}px`,
          lineHeight: `${prefs.lineHeight}`,
        },
        '.cm-gutters': {
          fontFamily: prefs.font,
          fontSize: `${prefs.fontSize}px`,
        },
        '.cm-lineNumbers .cm-gutterElement': {
          lineHeight: `${prefs.lineHeight}`,
        },
      }),
      [prefs.font, prefs.fontSize, prefs.lineHeight],
    );

    const extensions = useMemo(
      () => [
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        wrapExt,
        fontTheme,
        autocompletion({ override: [markdownCompletions] }),
        search({ top: false }),
        ghostText,
        wordHelper,
        wikiExt,
        commentExt,
        customKeymap,
      ],
      [customKeymap, ghostText, wordHelper, wikiExt, commentExt, wrapExt, fontTheme],
    );

    const cmTheme = prefs.theme === 'light' ? vscodeLight : vscodeDark;

    return (
      <div ref={containerRef} style={{ height: '100%' }}>
      <CodeMirror
        ref={cmRef}
        value={content}
        onChange={onChange}
        theme={cmTheme}
        extensions={extensions}
        onCreateEditor={(view) => {
          // Eagerly seed wiki state into the brand-new view.
          // This runs synchronously when the view is constructed — before the first
          // useEffect fires — so highlighting is present from the very first paint
          // even when `wikiTerms` hasn't changed since the last file was open.
          view.dispatch({
            effects: [
              setWikiTermsEffect.of((wikiTerms ?? []).filter((wt) => wt.fileId !== fileId)),
              setWikiGoToDefEffect.of(goToDefCbRef.current),
            ],
          });
        }}
        basicSetup={{
          lineNumbers: prefs.lineNumbers,
          highlightActiveLineGutter: true,
          highlightSpecialChars: true,
          foldGutter: false,
          drawSelection: true,
          dropCursor: true,
          allowMultipleSelections: true,
          indentOnInput: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          rectangularSelection: true,
          crosshairCursor: false,
          highlightActiveLine: true,
          highlightSelectionMatches: true,
          closeBracketsKeymap: true,
          searchKeymap: false,
          foldKeymap: false,
          completionKeymap: true,
          lintKeymap: false,
        }}
        height="100%"
        style={{ height: '100%' }}
      />
      </div>
    );
  },
);
