'use client';

import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Paragraph from '@tiptap/extension-paragraph';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { generateId } from '@microfox/datamotion';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { WordMark } from '@/components/transcriber/tiptap/word-mark-extension';
import {
  HighlightExtension,
  updateHighlightTime,
} from '@/components/transcriber/tiptap/highlight-extension';
import { ClickAndSeekExtension } from '@/components/transcriber/tiptap/click-seek-extension';
import { CaptionItemEditor } from '@/components/editor/captions/caption-item-editor';
import '@/components/transcriber/tiptap/tiptap-editor.css';
import './full-captions-editor.css';

const DEFAULT_NEW_WORD_DURATION = 1;

const CaptionParagraph = Paragraph.extend({
  addAttributes() {
    return {
      'data-sentence-id': { default: null },
    };
  },
});

type CaptionLike = {
  id?: string;
  text?: string;
  absoluteStart?: number;
  absoluteEnd?: number;
  start?: number;
  end?: number;
  duration?: number;
  words?: Array<{
    id?: string;
    text?: string;
    absoluteStart?: number;
    absoluteEnd?: number;
    start?: number;
    end?: number;
    duration?: number;
    confidence?: number;
  }>;
  metadata?: Record<string, unknown>;
};

function captionsToDocContent(captions: CaptionLike[]) {
  return {
    type: 'doc',
    content:
      captions.length === 0
        ? [{ type: 'paragraph', attrs: { 'data-sentence-id': generateId() }, content: [] }]
        : captions.map(sentence => {
            const words = sentence.words ?? [];
            const wordNodes = words.flatMap((word, index) => {
              const wordNode = {
                type: 'text' as const,
                marks: [
                  {
                    type: 'word' as const,
                    attrs: {
                      'data-absolute-start': word.absoluteStart ?? 0,
                      'data-absolute-end':
                        word.absoluteEnd ??
                        (word.absoluteStart ?? 0) +
                          (word.duration ?? DEFAULT_NEW_WORD_DURATION),
                      'data-confidence': word.confidence ?? 1,
                      class: 'word-highlight',
                    },
                  },
                ],
                text: word.text || '',
              };
              if (index < words.length - 1) {
                return [wordNode, { type: 'text' as const, text: ' ' }];
              }
              return [wordNode];
            });
            return {
              type: 'paragraph' as const,
              attrs: {
                'data-sentence-id': sentence.id || generateId(),
              },
              content:
                wordNodes.length > 0
                  ? [...wordNodes, { type: 'text' as const, text: ' ' }]
                  : [],
            };
          }),
  };
}

function parseParagraphWords(pNode: {
  content: { forEach: (fn: (child: any) => void) => void };
  textContent: string;
}): NonNullable<CaptionLike['words']> {
  const words: NonNullable<CaptionLike['words']> = [];
  let nextStart: number | null = null;

  const pushTimed = (
    text: string,
    absoluteStart: number,
    absoluteEnd: number,
    confidence = 1,
  ) => {
    words.push({
      id: generateId(),
      text,
      absoluteStart,
      absoluteEnd,
      duration: absoluteEnd - absoluteStart,
      confidence,
      start: 0,
      end: 0,
    });
    nextStart = absoluteEnd;
  };

  const pushNew = (text: string) => {
    const start =
      nextStart ??
      (words.length > 0 ? (words[words.length - 1].absoluteEnd ?? 0) : 0);
    pushTimed(text, start, start + DEFAULT_NEW_WORD_DURATION, 1);
  };

  pNode.content.forEach((child: any) => {
    if (!child.isText) return;
    const tokens = (child.text || '').split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return;

    const wordMark = child.marks?.find((m: any) => m.type.name === 'word');
    if (wordMark) {
      const markStart = parseFloat(wordMark.attrs['data-absolute-start']);
      const markEnd = parseFloat(wordMark.attrs['data-absolute-end']);
      const confidence = wordMark.attrs['data-confidence'] ?? 1;
      if (!isNaN(markStart) && !isNaN(markEnd) && markEnd > markStart) {
        if (tokens.length === 1) {
          pushTimed(tokens[0], markStart, markEnd, confidence);
          return;
        }
        const slice = (markEnd - markStart) / tokens.length;
        tokens.forEach((token: string, i: number) => {
          const s = markStart + i * slice;
          const e = i === tokens.length - 1 ? markEnd : s + slice;
          pushTimed(token, s, e, confidence);
        });
        return;
      }
    }

    tokens.forEach((token: string) => pushNew(token));
  });

  if (words.length > 0) {
    const sentenceStart = words[0].absoluteStart ?? 0;
    words.forEach(w => {
      w.start = (w.absoluteStart ?? 0) - sentenceStart;
      w.end = (w.absoluteEnd ?? 0) - sentenceStart;
    });
  }

  return words;
}

function normalizeCaptionText(text: string | undefined): string {
  return (text ?? '').trim().replace(/\s+/g, ' ');
}

function sameLineContent(
  prev: CaptionLike,
  text: string,
  words: NonNullable<CaptionLike['words']>,
): boolean {
  if (normalizeCaptionText(prev.text) === normalizeCaptionText(text)) {
    return true;
  }
  const prevWords = (prev.words ?? [])
    .map(w => w.text ?? '')
    .join(' ')
    .trim();
  const nextWords = words
    .map(w => w.text ?? '')
    .join(' ')
    .trim();
  return prevWords.length > 0 && prevWords === nextWords;
}

function docToCaptions(
  doc: any,
  prevCaptions: CaptionLike[],
): CaptionLike[] {
  const prevById = new Map(
    prevCaptions.filter(c => c.id).map(c => [c.id as string, c]),
  );
  const prevCount = prevCaptions.length;

  type Draft = {
    id: string;
    text: string;
    words: NonNullable<CaptionLike['words']>;
    absoluteStart: number;
    absoluteEnd: number;
  };
  const drafts: Draft[] = [];

  doc.forEach((pNode: any) => {
    if (pNode.type.name !== 'paragraph') return;
    const words = parseParagraphWords(pNode);
    const id = (pNode.attrs['data-sentence-id'] as string) || generateId();
    const text = (pNode.textContent || '').trim();

    if (words.length === 0 && !text) {
      const prev = prevById.get(id);
      drafts.push({
        id,
        text: '',
        words: [],
        absoluteStart: prev?.absoluteStart ?? 0,
        absoluteEnd: (prev?.absoluteStart ?? 0) + DEFAULT_NEW_WORD_DURATION,
      });
      return;
    }
    if (words.length === 0) return;

    drafts.push({
      id,
      text,
      words,
      absoluteStart: words[0].absoluteStart ?? 0,
      absoluteEnd: words[words.length - 1].absoluteEnd ?? 0,
    });
  });

  const structureChanged = drafts.length !== prevCount;

  return drafts.map(draft => {
    const prev = prevById.get(draft.id);
    const duration = draft.absoluteEnd - draft.absoluteStart;

    // Only clear metadata for lines involved in a split/merge:
    // - brand-new id (e.g. Enter split offspring)
    // - existing id whose content changed while line count changed
    // Untouched lines always keep their metadata.
    let metadata: Record<string, unknown> = {};
    if (prev) {
      const contentUnchanged = sameLineContent(prev, draft.text, draft.words);
      if (!structureChanged || contentUnchanged) {
        metadata = { ...(prev.metadata || {}) };
      }
    }

    return {
      id: draft.id,
      text: draft.text,
      absoluteStart: draft.absoluteStart,
      absoluteEnd: draft.absoluteEnd,
      start: draft.absoluteStart,
      end: draft.absoluteEnd,
      duration,
      words: draft.words,
      metadata,
    };
  });
}

const LineEditPluginKey = new PluginKey('captionLineEdit');

/** Ensure each paragraph has a unique data-sentence-id (Enter split copies attrs). */
const UniqueSentenceIdExtension = Extension.create({
  name: 'uniqueSentenceId',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('uniqueSentenceId'),
        appendTransaction(transactions, _oldState, newState) {
          if (!transactions.some(t => t.docChanged)) return null;
          const seen = new Set<string>();
          let tr = newState.tr;
          let modified = false;
          newState.doc.forEach((node, pos) => {
            if (node.type.name !== 'paragraph') return;
            let id = node.attrs['data-sentence-id'] as string | null;
            if (!id || seen.has(id)) {
              id = generateId();
              tr = tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                'data-sentence-id': id,
              });
              modified = true;
            }
            seen.add(id);
          });
          return modified ? tr : null;
        },
      }),
    ];
  },
});

const LineEditExtension = Extension.create({
  name: 'captionLineEdit',

  addOptions() {
    return {
      onEditLine: (_sentenceId: string, _index: number) => {},
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: LineEditPluginKey,
        props: {
          decorations: state => {
            const decorations: Decoration[] = [];
            let index = 0;
            const extension = this;
            state.doc.forEach((node, offset) => {
              if (node.type.name !== 'paragraph') return;
              const sentenceId = node.attrs['data-sentence-id'] || '';
              const lineIndex = index++;
              decorations.push(
                Decoration.widget(
                  offset + node.nodeSize - 1,
                  () => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'caption-line-edit-btn';
                    btn.title = 'Edit caption';
                    btn.setAttribute('contenteditable', 'false');
                    btn.innerHTML =
                      '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>';
                    btn.addEventListener('mousedown', e => {
                      e.preventDefault();
                      e.stopPropagation();
                    });
                    btn.addEventListener('click', e => {
                      e.preventDefault();
                      e.stopPropagation();
                      extension.options.onEditLine(sentenceId, lineIndex);
                    });
                    return btn;
                  },
                  { side: 1, key: `edit-${sentenceId || lineIndex}` },
                ),
              );
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

export interface FullCaptionsEditorProps {
  captions: CaptionLike[];
  onChange: (captions: CaptionLike[]) => void;
  currentTimeSec: number;
  onSeek: (timeSec: number) => void;
  className?: string;
}

export function FullCaptionsEditor({
  captions,
  onChange,
  currentTimeSec,
  onSeek,
  className,
}: FullCaptionsEditorProps) {
  const captionsRef = useRef(captions);
  const lastSyncedRef = useRef<string>('');
  const applyingExternalRef = useRef(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const editLineRef = useRef<(sentenceId: string, index: number) => void>(
    () => {},
  );
  editLineRef.current = (_sentenceId, index) => setEditIndex(index);

  useEffect(() => {
    captionsRef.current = captions;
  }, [captions]);

  const onSeekRef = useRef(onSeek);
  onSeekRef.current = onSeek;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: false,
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
      }),
      CaptionParagraph,
      WordMark,
      HighlightExtension,
      UniqueSentenceIdExtension,
      ClickAndSeekExtension.configure({
        onSeek: (time: number) => onSeekRef.current(time),
      }),
      LineEditExtension.configure({
        onEditLine: (id: string, index: number) =>
          editLineRef.current(id, index),
      }),
    ],
    content: captionsToDocContent(captions),
    editable: true,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          'full-captions-editor caption-tiptap-light prose prose-sm max-w-none',
          'focus:outline-none min-h-[200px] px-2 py-2 text-sm leading-relaxed text-neutral-900',
        ),
      },
    },
    onUpdate: ({ editor: ed, transaction }) => {
      if (!transaction.docChanged || applyingExternalRef.current) return;
      const next = docToCaptions(ed.state.doc, captionsRef.current);
      const json = JSON.stringify(next);
      if (json === lastSyncedRef.current) return;
      lastSyncedRef.current = json;
      captionsRef.current = next;
      onChange(next);
    },
  });

  // Sync external caption changes into the editor
  useEffect(() => {
    if (!editor) return;
    const json = JSON.stringify(captions);
    if (json === lastSyncedRef.current) return;
    lastSyncedRef.current = json;
    applyingExternalRef.current = true;
    editor.commands.setContent(captionsToDocContent(captions), {
      emitUpdate: false,
    });
    applyingExternalRef.current = false;
  }, [captions, editor]);

  // Playhead highlight
  useEffect(() => {
    if (!editor?.view) return;
    updateHighlightTime(currentTimeSec, editor.view);
  }, [currentTimeSec, editor]);

  const editingCaption =
    editIndex != null && editIndex >= 0 && editIndex < captions.length
      ? captions[editIndex]
      : null;

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-[10px] text-muted-foreground">
        One caption per line · click a word to seek · hover a line to edit
      </p>
      <div className="caption-tiptap-light rounded-md border border-neutral-200 bg-white overflow-hidden">
        <EditorContent editor={editor} />
      </div>

      <Dialog
        open={editIndex != null && !!editingCaption}
        onOpenChange={open => {
          if (!open) setEditIndex(null);
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">
              Edit caption #{editIndex != null ? editIndex : ''}
            </DialogTitle>
          </DialogHeader>
          {editingCaption && editIndex != null && (
            <CaptionItemEditor
              caption={editingCaption}
              index={editIndex}
              totalCount={captions.length}
              defaultMetaOpen
              onChange={updated => {
                const next = [...captions];
                next[editIndex] = updated;
                lastSyncedRef.current = JSON.stringify(next);
                captionsRef.current = next;
                onChange(next);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
