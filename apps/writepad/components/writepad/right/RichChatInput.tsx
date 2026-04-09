'use client';

/**
 * RichChatInput — contentEditable input that supports inline attachment chips,
 * model selection, and a web-search toggle (globe icon).
 *
 * Chips are <span contentEditable="false" data-attachment-id="..."> nodes
 * injected at the cursor position. On submit the DOM is walked to produce a
 * RichSegment[] array the parent uses to build the AI prompt.
 *
 * Keyboard:  Enter → send,  Shift+Enter → newline,  Ctrl+L → attach pending
 */

import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { Send, Square, Globe, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContextAttachment, RichSegment } from './types';
import { CHAT_MODELS, getModelDef } from '@/lib/ai-models';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

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
  selectedModelId: string;
  onModelChange: (id: string) => void;
  selectedAgentId: string;
  onAgentChange: (id: string) => void;
  agentOptions: Array<{ id: string; label: string }>;
  webSearchEnabled: boolean;
  onWebSearchToggle: () => void;
  canUseChat: boolean;
}

export function RichChatInput({
  pendingAttachment,
  onAttachmentConsumed,
  isLoading,
  onStop,
  onSend,
  selectedModelId,
  onModelChange,
  selectedAgentId,
  onAgentChange,
  agentOptions,
  webSearchEnabled,
  onWebSearchToggle,
  canUseChat,
}: RichChatInputProps) {
  const editableRef = useRef<HTMLDivElement>(null);
  const attachmentsRef = useRef<Record<string, ContextAttachment>>({});
  const savedRangeRef = useRef<Range | null>(null);
  const [hasContent, setHasContent] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentScope, setAgentScope] = useState<'all' | 'local' | 'project'>('all');

  const selectedModel = getModelDef(selectedModelId);
  const selectedAgentLabel =
    agentOptions.find((a) => a.id === selectedAgentId)?.label ?? 'Select Agent';

  const filteredAgents = useMemo(() => {
    if (agentScope === 'all') return agentOptions;
    if (agentScope === 'local') return agentOptions.filter((a) => a.id.startsWith('local:'));
    return agentOptions.filter((a) => a.id.startsWith('project:'));
  }, [agentOptions, agentScope]);

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
    if (!canUseChat || !hasContent || isLoading) return;
    const { segments, plainText, attachments } = parseDOM();
    if (!plainText.trim() && Object.keys(attachments).length === 0) return;

    onSend(segments, plainText, attachments);

    // Clear editor
    if (editableRef.current) editableRef.current.innerHTML = '';
    attachmentsRef.current = {};
    savedRangeRef.current = null;
    setHasContent(false);
  }, [canUseChat, hasContent, isLoading, onSend]);

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
          contentEditable={canUseChat}
          suppressContentEditableWarning
          onInput={syncHasContent}
          onKeyDown={handleKeyDown}
          onKeyUp={saveRange}
          onClick={saveRange}
          onBlur={saveRange}
          data-placeholder={
            canUseChat
              ? 'Ask anything… Ctrl+L attaches editor selection inline'
              : 'View-only access: chat is disabled for this project'
          }
          className={cn(
            'min-h-[72px] max-h-[200px] overflow-y-auto px-3 py-2.5',
            'text-[12px] text-foreground leading-relaxed outline-none',
            'empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50 empty:before:pointer-events-none',
          )}
        />

        {/* Toolbar row */}
        <div className="flex items-center justify-between gap-1 border-t border-border/60 px-1.5 py-1">
          {/* Left: model selector + web search toggle */}
          <div className="min-w-0 flex items-center gap-1">
            <Popover open={modelOpen} onOpenChange={setModelOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  disabled={isLoading || !canUseChat}
                  className="h-5 w-[120px] justify-between px-1 text-[9px] text-muted-foreground"
                >
                  <span className="truncate">{selectedModel.label}</span>
                  <ChevronsUpDown className="ml-1 size-3 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[210px] p-0">
                <Command>
                  <CommandInput placeholder="Search models..." className="h-8 text-[11px]" />
                  <CommandList>
                    <CommandEmpty>No model found.</CommandEmpty>
                    <CommandGroup>
                      {CHAT_MODELS.map((m) => (
                        <CommandItem
                          key={m.id}
                          value={`${m.label} ${m.id}`}
                          onSelect={() => {
                            onModelChange(m.id);
                            setModelOpen(false);
                          }}
                        >
                          <Check className={cn('mr-2 size-3', selectedModelId === m.id ? 'opacity-100' : 'opacity-0')} />
                          <span className="truncate text-[11px]">{m.label}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <Popover open={agentOpen} onOpenChange={setAgentOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  disabled={isLoading || !canUseChat}
                  className="h-5 w-[135px] justify-between px-1 text-[9px] text-muted-foreground"
                >
                  <span className="truncate">{selectedAgentLabel}</span>
                  <ChevronsUpDown className="ml-1 size-3 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[230px] p-0">
                <div className="flex items-center gap-1 border-b px-2 py-1.5">
                  {(['all', 'local', 'project'] as const).map((scope) => (
                    <button
                      key={scope}
                      onClick={() => setAgentScope(scope)}
                      className={cn(
                        'rounded px-1 py-0.5 text-[9px] capitalize transition-colors',
                        agentScope === scope
                          ? 'bg-violet-500/20 text-violet-300'
                          : 'text-muted-foreground/70 hover:bg-accent',
                      )}
                    >
                      {scope}
                    </button>
                  ))}
                </div>
                <Command>
                  <CommandInput placeholder="Search agents..." className="h-8 text-[11px]" />
                  <CommandList>
                    <CommandEmpty>No agent found.</CommandEmpty>
                    <CommandGroup>
                      {filteredAgents.map((a) => (
                        <CommandItem
                          key={a.id}
                          value={`${a.label} ${a.id}`}
                          onSelect={() => {
                            onAgentChange(a.id);
                            setAgentOpen(false);
                          }}
                        >
                          <Check className={cn('mr-2 size-3', selectedAgentId === a.id ? 'opacity-100' : 'opacity-0')} />
                          <span className="truncate text-[11px]">{a.label}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Web search toggle — only shown if the selected model supports it */}
            {selectedModel.supportsWebSearch && (
              <button
                onClick={onWebSearchToggle}
                disabled={isLoading || !canUseChat}
                title={webSearchEnabled ? 'Web search on' : 'Web search off'}
                className={cn(
                  'flex items-center justify-center rounded p-0.5 transition-colors',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                  webSearchEnabled
                    ? 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30'
                    : 'text-muted-foreground/40 hover:bg-accent hover:text-muted-foreground',
                )}
              >
                <Globe size={11} />
              </button>
            )}
          </div>

          {/* Right: stop / send */}
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
              disabled={!canUseChat || !hasContent}
              className="flex items-center justify-center rounded bg-violet-600 p-1.5 text-white transition-colors hover:bg-violet-500 disabled:opacity-25"
              title="Send (Enter)"
            >
              <Send size={13} />
            </button>
          )}
        </div>
        {!canUseChat && (
          <div className="border-t border-border/60 px-2 py-1 text-[10px] text-muted-foreground/70">
            Viewer permission detected. Ask an editor/owner for edit access to use chat.
          </div>
        )}
      </div>
    </div>
  );
}
