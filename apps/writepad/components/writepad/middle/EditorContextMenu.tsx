'use client';

/**
 * EditorContextMenu
 *
 * VS Code-style right-click menu for the markdown editor area.
 * Wraps children with a Radix ContextMenu trigger.
 *
 * Groups (matching VS Code's structure):
 *   1. Clipboard  — Cut, Copy, Paste, Select All
 *   2. Find       — Find & Replace, Go to Line
 *   3. Format     — Markdown formatting submenu
 *   4. File       — Save
 *   5. Chat       — Send Selection to AI Chat
 */

import { useCallback, useState } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Scissors,
  Copy,
  Clipboard,
  ChevronsLeftRight,
  Search,
  MoveVertical,
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  Code,
  Quote,
  List,
  ListOrdered,
  Minus,
  Save,
  MessageSquare,
  Wand2,
  Keyboard,
  Link,
  BookOpen,
  Layers,
  FilePlus,
} from 'lucide-react';
import type { CodeMirrorEditorHandle } from './CodeMirrorEditor';
import type { SelectionContext, WikiTerm } from './types';
import { WORD_HELPERS } from './wordHelpers';

interface EditorContextMenuProps {
  children: React.ReactNode;
  editorRef: React.RefObject<CodeMirrorEditorHandle | null>;
  activeFileName: string | null;
  onToggleSearch: () => void;
  onFormat: (type: string) => void;
  onSave: () => void;
  onContextSelect: (ctx: SelectionContext) => void;
  onWordHelper: (agentId: string) => void;
  onShowShortcuts: () => void;
  onCopySelectionLink?: () => void;
  /** Called when "Find All References" is selected for a wiki term. */
  onFindAllRefs?: (term: WikiTerm) => void;
  /** Called when "Go to Definition" is selected for a wiki term. */
  onGoToDefinition?: (fileId: string) => void;
  /** Called when "Create Wiki Entry" is selected for a word. */
  onCreateWikiEntry?: (word: string) => void;
  /** Called when "Add comment" is selected — passes the current cursor's 1-based line number. */
  onAddComment?: (lineNumber: number, lineContent: string) => void;
}

export function EditorContextMenu({
  children,
  editorRef,
  activeFileName,
  onToggleSearch,
  onFormat,
  onSave,
  onContextSelect,
  onWordHelper,
  onShowShortcuts,
  onCopySelectionLink,
  onFindAllRefs,
  onGoToDefinition,
  onCreateWikiEntry,
  onAddComment,
}: EditorContextMenuProps) {
  const [goToLineOpen, setGoToLineOpen] = useState(false);
  // Captured wiki term at the time the context menu opens
  const [activeWikiTerm, setActiveWikiTerm] = useState<WikiTerm | null>(null);
  const [activeWord, setActiveWord] = useState<string>('');

  // ── Clipboard ──────────────────────────────────────────────────────────

  const handleCut = useCallback(() => {
    editorRef.current?.focus();
    document.execCommand('cut');
  }, [editorRef]);

  const handleCopy = useCallback(() => {
    editorRef.current?.focus();
    document.execCommand('copy');
  }, [editorRef]);

  const handlePaste = useCallback(async () => {
    editorRef.current?.focus();
    // Use Clipboard API when available; fall back to execCommand.
    try {
      const text = await navigator.clipboard.readText();
      document.execCommand('insertText', false, text);
    } catch {
      document.execCommand('paste');
    }
  }, [editorRef]);

  const handleSelectAll = useCallback(() => {
    editorRef.current?.selectAll();
  }, [editorRef]);

  // ── Go to Line ─────────────────────────────────────────────────────────

  const handleGoToLine = useCallback(() => {
    const input = window.prompt('Go to line:');
    if (!input) return;
    const n = parseInt(input, 10);
    if (!isNaN(n)) editorRef.current?.goToLine(n);
  }, [editorRef]);

  // ── Send selection to chat ─────────────────────────────────────────────

  const handleSendToChat = useCallback(() => {
    const handle = editorRef.current;
    if (!handle || !activeFileName) return;
    const text = handle.getSelectedText();
    if (!text.trim()) return;
    // Line range isn't available here without a deeper CM query,
    // so we surface what we have.
    onContextSelect({ file: activeFileName, lines: '?', text: text.trim() });
  }, [editorRef, activeFileName, onContextSelect]);

  const disabled = !activeFileName;

  // ── Wiki actions ───────────────────────────────────────────────────────────

  const handleFindAllRefs = useCallback(() => {
    if (activeWikiTerm) onFindAllRefs?.(activeWikiTerm);
  }, [activeWikiTerm, onFindAllRefs]);

  const handleGoToDefinition = useCallback(() => {
    if (activeWikiTerm) onGoToDefinition?.(activeWikiTerm.fileId);
  }, [activeWikiTerm, onGoToDefinition]);

  const handleCreateWikiEntry = useCallback(() => {
    if (activeWord) onCreateWikiEntry?.(activeWord);
  }, [activeWord, onCreateWikiEntry]);

  const showWikiActions = !!(onFindAllRefs || onGoToDefinition || onCreateWikiEntry);

  return (
    <ContextMenu
      onOpenChange={(open) => {
        if (open && activeFileName) {
          // Capture wiki term + word at cursor when the menu opens
          const term = editorRef.current?.getWikiTermAtCursor() ?? null;
          const word = editorRef.current?.getWordAtCursor() ?? '';
          setActiveWikiTerm(term);
          setActiveWord(word);
        }
      }}
    >
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>

      <ContextMenuContent className="w-60">
        {/* ── 1. Clipboard ─────────────────────────────────────────── */}
        <ContextMenuLabel>Edit</ContextMenuLabel>

        <ContextMenuItem disabled={disabled} onClick={handleCut}>
          <Scissors size={14} /> Cut
          <ContextMenuShortcut>Ctrl+X</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuItem disabled={disabled} onClick={handleCopy}>
          <Copy size={14} /> Copy
          <ContextMenuShortcut>Ctrl+C</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuItem disabled={disabled} onClick={handlePaste}>
          <Clipboard size={14} /> Paste
          <ContextMenuShortcut>Ctrl+V</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem disabled={disabled} onClick={handleSelectAll}>
          <ChevronsLeftRight size={14} /> Select All
          <ContextMenuShortcut>Ctrl+A</ContextMenuShortcut>
        </ContextMenuItem>

        {/* ── 2. Find ──────────────────────────────────────────────── */}
        <ContextMenuSeparator />

        <ContextMenuItem disabled={disabled} onClick={onToggleSearch}>
          <Search size={14} /> Find &amp; Replace
          <ContextMenuShortcut>Ctrl+F</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuItem disabled={disabled} onClick={handleGoToLine}>
          <MoveVertical size={14} /> Go to Line
          <ContextMenuShortcut>Ctrl+G</ContextMenuShortcut>
        </ContextMenuItem>

        {/* ── 3. Format submenu ────────────────────────────────────── */}
        <ContextMenuSeparator />

        <ContextMenuSub>
          <ContextMenuSubTrigger disabled={disabled}>
            <Bold size={14} /> Format
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-52">
            <ContextMenuItem onClick={() => onFormat('bold')}>
              <Bold size={14} /> Bold
              <ContextMenuShortcut>Ctrl+B</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onFormat('italic')}>
              <Italic size={14} /> Italic
              <ContextMenuShortcut>Ctrl+I</ContextMenuShortcut>
            </ContextMenuItem>

            <ContextMenuSeparator />

            <ContextMenuItem onClick={() => onFormat('h1')}>
              <Heading1 size={14} /> Heading 1
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onFormat('h2')}>
              <Heading2 size={14} /> Heading 2
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onFormat('h3')}>
              <Heading3 size={14} /> Heading 3
            </ContextMenuItem>

            <ContextMenuSeparator />

            <ContextMenuItem onClick={() => onFormat('code')}>
              <Code size={14} /> Code Block
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onFormat('quote')}>
              <Quote size={14} /> Blockquote
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onFormat('hr')}>
              <Minus size={14} /> Horizontal Rule
            </ContextMenuItem>

            <ContextMenuSeparator />

            <ContextMenuItem onClick={() => onFormat('ul')}>
              <List size={14} /> Bullet List
            </ContextMenuItem>
            <ContextMenuItem onClick={() => onFormat('ol')}>
              <ListOrdered size={14} /> Numbered List
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        {/* ── 4. File ──────────────────────────────────────────────── */}
        <ContextMenuSeparator />

        <ContextMenuItem disabled={disabled} onClick={onSave}>
          <Save size={14} /> Save
          <ContextMenuShortcut>Ctrl+S</ContextMenuShortcut>
        </ContextMenuItem>

        {/* ── 5. Word Tools submenu ────────────────────────────────── */}
        <ContextMenuSeparator />

        <ContextMenuSub>
          <ContextMenuSubTrigger disabled={disabled}>
            <Wand2 size={14} /> Word Tools
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-56">
            {WORD_HELPERS.map((helper) => (
              <ContextMenuItem
                key={helper.id}
                onClick={() => onWordHelper(helper.id)}
              >
                {helper.label}
                <ContextMenuShortcut>{helper.shortcutDisplay}</ContextMenuShortcut>
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>

        {/* ── 6. AI Chat ───────────────────────────────────────────── */}
        <ContextMenuSeparator />

        <ContextMenuItem disabled={disabled} onClick={handleSendToChat}>
          <MessageSquare size={14} /> Send Selection to Chat
          <ContextMenuShortcut>Ctrl+L</ContextMenuShortcut>
        </ContextMenuItem>

        {onCopySelectionLink && (
          <ContextMenuItem disabled={disabled} onClick={onCopySelectionLink}>
            <Link size={14} /> Copy Link to Selection
          </ContextMenuItem>
        )}

        {/* ── 7. Wiki / References ─────────────────────────────────── */}
        {showWikiActions && (
          <>
            <ContextMenuSeparator />
            <ContextMenuLabel>References</ContextMenuLabel>

            {activeWikiTerm ? (
              <>
                {onFindAllRefs && (
                  <ContextMenuItem disabled={disabled} onClick={handleFindAllRefs}>
                    <Layers size={14} /> Find All References
                  </ContextMenuItem>
                )}
                {onGoToDefinition && (
                  <ContextMenuItem disabled={disabled} onClick={handleGoToDefinition}>
                    <BookOpen size={14} /> Go to Definition
                  </ContextMenuItem>
                )}
              </>
            ) : (
              onCreateWikiEntry && activeWord && (
                <ContextMenuItem disabled={disabled} onClick={handleCreateWikiEntry}>
                  <FilePlus size={14} /> Create Wiki Entry for &quot;{activeWord.slice(0, 24)}&quot;
                </ContextMenuItem>
              )
            )}

            {!activeWikiTerm && !activeWord && onCreateWikiEntry && (
              <ContextMenuItem disabled onClick={() => {}}>
                <FilePlus size={14} />
                <span className="text-muted-foreground/50">No word at cursor</span>
              </ContextMenuItem>
            )}
          </>
        )}

        {/* ── 8. Comment ───────────────────────────────────────────── */}
        {onAddComment && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              disabled={disabled}
              onClick={() => {
                const lines = editorRef.current?.getSelectionLines();
                const lineNum = lines?.startLine ?? 1;
                onAddComment(lineNum, '');
              }}
            >
              <MessageSquare size={14} /> Add Comment on This Line
            </ContextMenuItem>
          </>
        )}

        {/* ── 9. Help ──────────────────────────────────────────────── */}
        <ContextMenuSeparator />

        <ContextMenuItem onClick={onShowShortcuts}>
          <Keyboard size={14} /> Keyboard Shortcuts
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
