'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { CaptionHtmlTextEditor } from '@/components/editor/captions/caption-html-text-editor';
import {
  extractKeywordsFromHtmlText,
  parseCaptionHtmlText,
} from '@/lib/captions/html-text';
import {
  captionMetadataFieldMeta,
  isTiptapFieldMeta,
  paramMetaTypes,
  type TiptapInputOptions,
} from '@/components/editor/presets/dataTypes';

// ─── Caption word editor ───────────────────────────────────────────────────────

export function WordEditor({
  word,
  index,
  onChange,
}: {
  word: any;
  index: number;
  onChange: (updated: any) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded border bg-background px-1.5 py-1 text-[10px]">
      <span className="w-5 shrink-0 font-mono text-muted-foreground/50 text-center">
        {index}
      </span>
      <Input
        value={word.text ?? ''}
        className="h-5 flex-1 min-w-0 text-xs px-1"
        title="word text"
        onChange={e => onChange({ ...word, text: e.target.value })}
      />
      <Input
        type="number"
        step="0.001"
        value={word.absoluteStart ?? 0}
        className="h-5 w-16 shrink-0 text-[10px] px-1"
        title="absoluteStart (s)"
        onChange={e =>
          onChange({
            ...word,
            absoluteStart: parseFloat(e.target.value) || 0,
          })
        }
      />
      <span className="text-muted-foreground/40 shrink-0">→</span>
      <Input
        type="number"
        step="0.001"
        value={word.absoluteEnd ?? 0}
        className="h-5 w-16 shrink-0 text-[10px] px-1"
        title="absoluteEnd (s)"
        onChange={e =>
          onChange({ ...word, absoluteEnd: parseFloat(e.target.value) || 0 })
        }
      />
      {typeof word.confidence === 'number' && (
        <span className="shrink-0 text-muted-foreground/40 w-8 text-right">
          {(word.confidence * 100).toFixed(0)}%
        </span>
      )}
    </div>
  );
}

// ─── Metadata key-value editor ────────────────────────────────────────────────

export function MetadataEditor({
  metadata,
  onChange,
  fieldMeta = captionMetadataFieldMeta,
  captionText,
  captionWords,
}: {
  metadata: Record<string, unknown>;
  onChange: (updated: Record<string, unknown>) => void;
  /** key → Zod .meta() map; fields with `tiptap` meta render TipTap */
  fieldMeta?: Record<string, Record<string, unknown>>;
  captionText?: string;
  captionWords?: Array<{ text?: string }>;
}) {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  // Always include schema-tagged tiptap fields (e.g. htmlText) even when empty
  const tiptapKeys = useMemo(() => {
    const fromMeta = Object.keys(fieldMeta).filter(k =>
      isTiptapFieldMeta(fieldMeta[k]),
    );
    const fromData = Object.keys(metadata).filter(k =>
      isTiptapFieldMeta(fieldMeta[k]),
    );
    return Array.from(new Set([...fromMeta, ...fromData]));
  }, [fieldMeta, metadata]);

  const tiptapKeySet = useMemo(() => new Set(tiptapKeys), [tiptapKeys]);
  const entries = Object.entries(metadata).filter(([k]) => !tiptapKeySet.has(k));

  const handleValueChange = (key: string, raw: string) => {
    let parsed: unknown = raw;
    try {
      parsed = JSON.parse(raw);
    } catch {
      /* keep as string */
    }
    onChange({ ...metadata, [key]: parsed });
  };

  const handleDelete = (key: string) => {
    const next = { ...metadata };
    delete next[key];
    onChange(next);
  };

  const handleAdd = () => {
    if (!newKey.trim()) return;
    let parsed: unknown = newValue;
    try {
      parsed = JSON.parse(newValue);
    } catch {
      /* keep as string */
    }
    onChange({ ...metadata, [newKey.trim()]: parsed });
    setNewKey('');
    setNewValue('');
  };

  const handleTiptapChange = (key: string, htmlText: string) => {
    const next: Record<string, unknown> = { ...metadata, [key]: htmlText };

    if (key === 'htmlText') {
      const keyword = extractKeywordsFromHtmlText(htmlText);
      const words =
        captionWords && captionWords.length > 0
          ? captionWords
          : String(captionText ?? '')
              .split(/\s+/)
              .filter(Boolean)
              .map(text => ({ text }));
      const parsed = parseCaptionHtmlText(htmlText, words);
      if (keyword) next.keyword = keyword;
      if (parsed?.splitParts) next.splitParts = parsed.splitParts;
    }

    onChange(next);
  };

  return (
    <div className="mt-1.5 space-y-2">
      {tiptapKeys.map(key => {
        const meta = fieldMeta[key] ?? {};
        const opts = (meta[paramMetaTypes.inputOptions] ??
          {}) as TiptapInputOptions;
        const lines = opts.lines ?? 5;
        const seed = opts.seedFromCaption !== false;
        return (
          <div key={key} className="space-y-0.5">
            <div className="flex items-center justify-between gap-1">
              <label className="block text-[9px] font-mono text-muted-foreground/70 uppercase tracking-wide">
                {key}
              </label>
              {metadata[key] != null && metadata[key] !== '' && (
                <button
                  type="button"
                  className="shrink-0 p-0.5 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(key)}
                  title="Clear value"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <CaptionHtmlTextEditor
              value={
                typeof metadata[key] === 'string'
                  ? (metadata[key] as string)
                  : ''
              }
              captionText={seed ? captionText : undefined}
              keyword={
                seed && typeof metadata.keyword === 'string'
                  ? metadata.keyword
                  : undefined
              }
              splitParts={
                seed && Array.isArray(metadata.splitParts)
                  ? (metadata.splitParts as string[])
                  : undefined
              }
              lines={lines}
              onChange={html => handleTiptapChange(key, html)}
            />
          </div>
        );
      })}

      <div className="space-y-1">
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-center gap-1">
            <span
              className="w-24 shrink-0 truncate text-[10px] font-mono text-muted-foreground"
              title={k}
            >
              {k}
            </span>
            <Input
              value={typeof v === 'string' ? v : JSON.stringify(v)}
              className="h-5 flex-1 text-xs px-1"
              onChange={e => handleValueChange(k, e.target.value)}
            />
            <button
              type="button"
              className="shrink-0 p-0.5 text-muted-foreground hover:text-destructive"
              onClick={() => handleDelete(k)}
              title="Remove key"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <div className="flex items-center gap-1 pt-0.5 border-t border-dashed border-border/50">
          <Input
            placeholder="key"
            value={newKey}
            className="h-5 w-20 shrink-0 text-[10px] px-1"
            onChange={e => setNewKey(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAdd();
            }}
          />
          <Input
            placeholder="value"
            value={newValue}
            className="h-5 flex-1 text-[10px] px-1"
            onChange={e => setNewValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAdd();
            }}
          />
          <button
            type="button"
            className="shrink-0 p-0.5 text-muted-foreground hover:text-primary disabled:opacity-40"
            disabled={!newKey.trim()}
            onClick={handleAdd}
            title="Add key"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Full caption item editor ──────────────────────────────────────────────────

export function CaptionItemEditor({
  caption,
  index,
  totalCount,
  onChange,
  defaultMetaOpen = false,
}: {
  caption: any;
  index: number;
  totalCount: number;
  onChange: (updated: any) => void;
  defaultMetaOpen?: boolean;
}) {
  const [timingOpen, setTimingOpen] = useState(false);
  const [wordsOpen, setWordsOpen] = useState(false);
  const [metaOpen, setMetaOpen] = useState(defaultMetaOpen);

  const words: any[] = caption.words ?? [];
  const metadata: Record<string, unknown> = caption.metadata ?? {};
  const metaCount = Object.keys(metadata).length;

  const absStart =
    typeof caption.absoluteStart === 'number' ? caption.absoluteStart : null;
  const absEnd =
    typeof caption.absoluteEnd === 'number' ? caption.absoluteEnd : null;
  const dur =
    absStart !== null && absEnd !== null
      ? (absEnd - absStart).toFixed(3)
      : null;

  const timingFields: [string, string][] = [
    ['absoluteStart', 'Abs Start'],
    ['absoluteEnd', 'Abs End'],
    ['start', 'Start'],
    ['end', 'End'],
    ['duration', 'Duration'],
  ];

  return (
    <div className="rounded-md border overflow-hidden">
      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-muted/30 border-b">
        <span className="font-mono text-[11px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
          #{index}
        </span>
        <span className="text-[10px] text-muted-foreground">of {totalCount}</span>
        <div className="flex-1" />
        {absStart !== null && absEnd !== null && (
          <>
            <span className="text-[10px] font-mono text-muted-foreground">
              {absStart.toFixed(3)}s → {absEnd.toFixed(3)}s
            </span>
            <span className="text-[10px] text-muted-foreground/60">({dur}s)</span>
          </>
        )}
      </div>

      <div className="p-2.5 space-y-2.5">
        <Textarea
          value={caption.text ?? ''}
          rows={2}
          className="resize-none text-sm bg-background"
          placeholder="Caption text…"
          onChange={e => onChange({ ...caption, text: e.target.value })}
        />

        <Collapsible open={timingOpen} onOpenChange={setTimingOpen}>
          <CollapsibleTrigger className="flex w-full items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
            {timingOpen ? (
              <ChevronDown className="h-2.5 w-2.5" />
            ) : (
              <ChevronRight className="h-2.5 w-2.5" />
            )}
            <span className="uppercase tracking-wide font-medium">Timing</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-1.5">
              {timingFields.map(([field, label]) => (
                <div key={field} className="space-y-0.5">
                  <label className="block text-[9px] text-muted-foreground/70 uppercase tracking-wide">
                    {label}
                  </label>
                  <Input
                    type="number"
                    step="0.001"
                    value={
                      typeof caption[field] === 'number' ? caption[field] : ''
                    }
                    className="h-6 text-xs px-1.5"
                    onChange={e =>
                      onChange({
                        ...caption,
                        [field]: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Collapsible open={wordsOpen} onOpenChange={setWordsOpen}>
          <CollapsibleTrigger className="flex w-full items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
            {wordsOpen ? (
              <ChevronDown className="h-2.5 w-2.5" />
            ) : (
              <ChevronRight className="h-2.5 w-2.5" />
            )}
            <span className="uppercase tracking-wide font-medium">Words</span>
            <span className="ml-1 text-muted-foreground/50">({words.length})</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {words.length === 0 ? (
              <p className="mt-1.5 text-[10px] text-muted-foreground/50">
                No words
              </p>
            ) : (
              <div className="mt-1.5 space-y-0.5">
                <div className="flex items-center gap-1 px-1.5 text-[9px] text-muted-foreground/50 uppercase tracking-wide">
                  <span className="w-5 text-center">#</span>
                  <span className="flex-1">text</span>
                  <span className="w-16 text-center">abs start</span>
                  <span className="w-4" />
                  <span className="w-16 text-center">abs end</span>
                  <span className="w-8 text-right">conf</span>
                </div>
                {words.map((word, wi) => (
                  <WordEditor
                    key={word.id ?? wi}
                    word={word}
                    index={wi}
                    onChange={updated => {
                      const next = [...words];
                      next[wi] = updated;
                      onChange({ ...caption, words: next });
                    }}
                  />
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        <Collapsible open={metaOpen} onOpenChange={setMetaOpen}>
          <CollapsibleTrigger className="flex w-full items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
            {metaOpen ? (
              <ChevronDown className="h-2.5 w-2.5" />
            ) : (
              <ChevronRight className="h-2.5 w-2.5" />
            )}
            <span className="uppercase tracking-wide font-medium">Metadata</span>
            <span className="ml-1 text-muted-foreground/50">({metaCount})</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <MetadataEditor
              metadata={metadata}
              captionText={caption.text}
              captionWords={words}
              onChange={newMeta => onChange({ ...caption, metadata: newMeta })}
            />
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
