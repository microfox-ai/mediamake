'use client';

/**
 * RichChatInput — contentEditable input that supports inline attachment chips.
 *
 * Chips are <span contentEditable="false" data-attachment-id="..."> nodes
 * injected at the cursor position. On submit the DOM is walked to produce a
 * RichSegment[] array the parent uses to build the AI prompt.
 *
 * Keyboard:  Enter → send,  Shift+Enter → newline,  Ctrl+L → attach pending
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { Send, Square, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContextAttachment, RichSegment } from './types';

interface RichChatInputProps {
  /** New attachment waiting to be inserted into the input. */
  pendingAttachment: ContextAttachment | null;
  onAttachmentConsumed: () => void;
  isLoading: boolean;
  onStop: () => void;
  onSend: (
    segments: RichSegment[],
    plainText: string,
    attachments: Record<string, ContextAttachment>,
  ) => void;
}

export function RichChatInput({
  pendingAttachment,
  onAttachmentConsumed,
  isLoading,
  onStop,
  onSend,
}: RichChatInputProps) {
  const editableRef = useRef<HTMLDivElement>(null);
  const attachmentsRef = useRef<Record<string, ContextAttachment>>({});
  const savedRangeRef = useRef<Range | null>(null);
  const [hasContent, setHasContent] = useState(false);

  // ── Chip builder ─────────────────────────────────────────────────────────

  const buildChip = useCallback((att: ContextAttachment): HTMLSpanElement => {
    const chip = document.createElement('span');
    chip.contentEditable = 'false';
    chip.dataset.attachmentId = att.id;
    chip.style.cssText = [
      'display:inline-flex',
      'align-items:center',
      'gap:3px',
      'background:rgba(139,92,246,0.18)',
      'border:1px solid rgba(139,92,246,0.35)',
      'border-radius:4px',
      'padding:1px 5px',
      'font-size:10px',
      'color:rgb(196,181,253)',
      'margin:0 2px',
      'vertical-align:middle',
      'cursor:default',
      'user-select:none',
      'white-space:nowrap',
    ].join(';');

    const label = document.createElement('span');
    label.textContent = `${att.fileName}:${att.startLine}–${att.endLine}`;
    chip.appendChild(label);

    const close = document.createElement('button');
    close.textContent = '×';
    close.style.cssText =
      'font-size:12px;line-height:1;color:rgba(196,181,253,0.5);background:none;border:none;cursor:pointer;padding:0 0 1px 2px;';
    close.addEventListener('mousedown', (e) => {
      e.preventDefault();
      chip.remove();
      syncHasContent();
    });
    chip.appendChild(close);

    return chip;
  }, []);

  // ── Insert chip at cursor (or append) ────────────────────────────────────

  const insertChipAtCursor = useCallback(
    (att: ContextAttachment) => {
      const div = editableRef.current;
      if (!div) return;

      attachmentsRef.current = { ...attachmentsRef.current, [att.id]: att };

      const chip = buildChip(att);
      const sel = window.getSelection();

      // Prefer the saved range (last known cursor in this div) over the live
      // selection, which may point elsewhere after the user clicked the editor.
      const savedRange = savedRangeRef.current;
      let targetRange: Range | null = null;

      if (savedRange && div.contains(savedRange.commonAncestorContainer)) {
        targetRange = savedRange;
      } else if (sel && sel.rangeCount > 0 && div.contains(sel.anchorNode)) {
        targetRange = sel.getRangeAt(0);
      }

      if (targetRange) {
        targetRange.deleteContents();
        targetRange.insertNode(chip);
        const after = document.createRange();
        after.setStartAfter(chip);
        after.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(after);
        savedRangeRef.current = after.cloneRange();
      } else {
        div.appendChild(chip);
        // Place cursor after appended chip
        const after = document.createRange();
        after.setStartAfter(chip);
        after.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(after);
        savedRangeRef.current = after.cloneRange();
      }

      div.focus();
      syncHasContent();
    },
    [buildChip],
  );

  // ── Consume pending attachment from parent ───────────────────────────────

  useEffect(() => {
    if (!pendingAttachment) return;
    insertChipAtCursor(pendingAttachment);
    onAttachmentConsumed();
  }, [pendingAttachment, insertChipAtCursor, onAttachmentConsumed]);

  // ── DOM → segment parser ─────────────────────────────────────────────────

  function parseDOM(): {
    segments: RichSegment[];
    plainText: string;
    attachments: Record<string, ContextAttachment>;
  } {
    const div = editableRef.current;
    if (!div) return { segments: [], plainText: '', attachments: {} };

    const segments: RichSegment[] = [];
    const usedAttachments: Record<string, ContextAttachment> = {};

    function appendText(t: string) {
      const last = segments[segments.length - 1];
      if (last?.type === 'text') last.text += t;
      else if (t) segments.push({ type: 'text', text: t });
    }

    function walk(node: Node, isFirstBlock: boolean) {
      if (node.nodeType === Node.TEXT_NODE) {
        appendText(node.textContent ?? '');
        return;
      }
      if (!(node instanceof HTMLElement)) return;

      const attId = node.dataset.attachmentId;
      if (attId) {
        segments.push({ type: 'attachment', attachmentId: attId });
        const att = attachmentsRef.current[attId];
        if (att) usedAttachments[attId] = att;
        return;
      }

      const isBlock =
        node !== div &&
        (node.tagName === 'DIV' || node.tagName === 'P' || node.tagName === 'BLOCKQUOTE');

      if (isBlock && !isFirstBlock) appendText('\n');

      if (node.tagName === 'BR') {
        appendText('\n');
        return;
      }

      let first = true;
      node.childNodes.forEach((child) => {
        walk(child, isBlock && first);
        first = false;
      });
    }

    let firstChild = true;
    div.childNodes.forEach((child) => {
      walk(child, firstChild);
      firstChild = false;
    });

    // Build plain text representation (for AI prompt + title)
    const plainText = segments
      .map((s) =>
        s.type === 'text'
          ? s.text
          : (() => {
              const a = usedAttachments[s.attachmentId];
              return a ? `[${a.fileName}:L${a.startLine}-${a.endLine}]` : '[context]';
            })(),
      )
      .join('');

    return { segments, plainText, attachments: usedAttachments };
  }

  // ── Save cursor on blur / selection change ───────────────────────────────

  const saveRange = useCallback(() => {
    const div = editableRef.current;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && div && div.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  }, []);

  // ── Sync hasContent ──────────────────────────────────────────────────────

  function syncHasContent() {
    const div = editableRef.current;
    if (!div) return;
    const hasText = (div.textContent?.trim() ?? '') !== '';
    const hasChip = !!div.querySelector('[data-attachment-id]');
    setHasContent(hasText || hasChip);
  }

  // ── Send ─────────────────────────────────────────────────────────────────

  const handleSend = useCallback(() => {
    if (!hasContent || isLoading) return;
    const { segments, plainText, attachments } = parseDOM();
    if (!plainText.trim() && Object.keys(attachments).length === 0) return;

    onSend(segments, plainText, attachments);

    // Clear editor
    if (editableRef.current) editableRef.current.innerHTML = '';
    attachmentsRef.current = {};
    savedRangeRef.current = null;
    setHasContent(false);
  }, [hasContent, isLoading, onSend]);

  // ── Keyboard ─────────────────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="shrink-0 border-t border-border p-2">
      <div
        className={cn(
          'rounded-md border bg-muted transition-colors',
          'focus-within:border-violet-500/50 border-border',
        )}
      >
        {/* ContentEditable area */}
        <div
          ref={editableRef}
          contentEditable
          suppressContentEditableWarning
          onInput={syncHasContent}
          onKeyDown={handleKeyDown}
          onKeyUp={saveRange}
          onClick={saveRange}
          onBlur={saveRange}
          data-placeholder="Ask anything… Ctrl+L attaches editor selection inline"
          className={cn(
            'min-h-[72px] max-h-[200px] overflow-y-auto px-3 py-2.5',
            'text-[12px] text-foreground leading-relaxed outline-none',
            'empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50 empty:before:pointer-events-none',
          )}
        />

        {/* Toolbar row */}
        <div className="flex items-center justify-between border-t border-border/60 px-2 py-1">
          <div className="flex items-center gap-1">
            <FileText size={10} className="text-muted-foreground/40" />
            <span className="text-[9px] text-muted-foreground/40">
              Ctrl+L to attach · Enter to send · Shift+Enter newline
            </span>
          </div>
          {isLoading ? (
            <button
              onClick={onStop}
              className="flex items-center gap-1 rounded bg-destructive/10 px-2 py-1 text-[10px] text-destructive hover:bg-destructive/20 transition-colors"
            >
              <Square size={10} />
              Stop
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!hasContent}
              className="flex items-center justify-center rounded bg-violet-600 p-1.5 text-white transition-colors hover:bg-violet-500 disabled:opacity-25"
              title="Send (Enter)"
            >
              <Send size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
