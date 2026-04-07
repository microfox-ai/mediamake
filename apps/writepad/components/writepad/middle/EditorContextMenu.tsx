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
} from 'lucide-react';
import type { CodeMirrorEditorHandle } from './CodeMirrorEditor';
import type { SelectionContext } from './types';

interface EditorContextMenuProps {
  children: React.ReactNode;
  editorRef: React.RefObject<CodeMirrorEditorHandle | null>;
  activeFileName: string | null;
  onToggleSearch: () => void;
  onFormat: (type: string) => void;
  onSave: () => void;
  onContextSelect: (ctx: SelectionContext) => void;
}

export function EditorContextMenu({
  children,
  editorRef,
  activeFileName,
  onToggleSearch,
  onFormat,
  onSave,
  onContextSelect,
}: EditorContextMenuProps) {
  const [goToLineOpen, setGoToLineOpen] = useState(false);

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

  return (
    <ContextMenu>
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

        {/* ── 5. AI Chat ───────────────────────────────────────────── */}
        <ContextMenuSeparator />

        <ContextMenuItem disabled={disabled} onClick={handleSendToChat}>
          <MessageSquare size={14} /> Send Selection to Chat
          <ContextMenuShortcut>Ctrl+L</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
