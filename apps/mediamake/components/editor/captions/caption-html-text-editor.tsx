'use client';

import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, CornerDownLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  buildHtmlTextFromLegacy,
} from '@/lib/captions/html-text';

interface CaptionHtmlTextEditorProps {
  value?: string;
  /** Plain caption text — used to seed empty htmlText */
  captionText?: string;
  /** Legacy fields used only when seeding empty value */
  keyword?: string;
  splitParts?: string[];
  onChange: (htmlText: string) => void;
  className?: string;
  compact?: boolean;
}

/**
 * Compact TipTap editor for caption metadata.htmlText.
 * Bold = keyword highlight; Enter / soft break = line split (<br/>).
 */
export function CaptionHtmlTextEditor({
  value,
  captionText,
  keyword,
  splitParts,
  onChange,
  className,
  compact = true,
}: CaptionHtmlTextEditorProps) {
  const initialContent =
    value?.trim() ||
    buildHtmlTextFromLegacy({
      text: captionText,
      keyword,
      splitParts,
    }) ||
    captionText ||
    '';

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
        // Keep hardBreak so Shift+Enter / Enter can produce <br>
      }),
    ],
    content: initialContent
      ? initialContent.includes('<')
        ? initialContent
        : `<p>${initialContent}</p>`
      : '<p></p>',
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none',
          'min-h-[56px] px-2 py-1.5 text-sm leading-relaxed',
          '[&_strong]:font-bold [&_strong]:text-primary [&_b]:font-bold [&_b]:text-primary',
          '[&_p]:my-0.5',
        ),
      },
    },
    onUpdate: ({ editor: ed }) => {
      // Normalize TipTap paragraph output into <b> + <br/> style htmlText
      onChange(normalizeEditorHtml(ed.getHTML()));
    },
  });

  // Sync external value changes (e.g. agent refresh)
  useEffect(() => {
    if (!editor) return;
    const next =
      value?.trim() ||
      buildHtmlTextFromLegacy({
        text: captionText,
        keyword,
        splitParts,
      }) ||
      '';
    const current = normalizeEditorHtml(editor.getHTML());
    if (next && next !== current) {
      editor.commands.setContent(
        next.includes('<') ? next : `<p>${next}</p>`,
        { emitUpdate: false },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-sync when value changes
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div
      className={cn(
        'rounded-md border bg-background overflow-hidden',
        className,
      )}
    >
      <div className="flex items-center gap-0.5 border-b bg-muted/30 px-1 py-0.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'h-6 w-6 p-0',
            editor.isActive('bold') && 'bg-primary/15 text-primary',
          )}
          title="Bold = highlight keyword"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          title="Insert line break"
          onClick={() => editor.chain().focus().setHardBreak().run()}
        >
          <CornerDownLeft className="h-3 w-3" />
        </Button>
        {!compact && (
          <span className="ml-1 text-[9px] text-muted-foreground">
            Bold = highlight · Enter = new line
          </span>
        )}
      </div>
      <EditorContent editor={editor} />
      {compact && (
        <p className="px-2 pb-1 text-[9px] text-muted-foreground/70">
          Bold highlights · line break splits lines
        </p>
      )}
    </div>
  );
}

/**
 * Convert TipTap HTML into the compact htmlText format presets expect:
 * <b>…</b> for highlights, <br/> for line breaks.
 */
export function normalizeEditorHtml(html: string): string {
  if (!html) return '';

  let out = html
    // Paragraphs → br between blocks
    .replace(/<\/p>\s*<p[^>]*>/gi, '<br/>')
    .replace(/<\/?p[^>]*>/gi, '')
    // strong → b
    .replace(/<\s*strong\b[^>]*>/gi, '<b>')
    .replace(/<\/\s*strong\s*>/gi, '</b>')
    // Normalize br variants
    .replace(/<br\s*\/?>/gi, '<br/>')
    // Drop empty tags / leftover wrappers TipTap may leave
    .replace(/<\/?span[^>]*>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();

  // Collapse whitespace between tags carefully
  out = out.replace(/\s+/g, ' ').replace(/\s*<br\/>\s*/g, '<br/>');

  return out;
}
