'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, RefreshCw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getReferenceLyricsText } from '@/app/ai/agents/autofix/lib/lyricsReference';
import type { Transcription } from '@/app/types/transcription';
import { cn } from '@/lib/utils';

interface UserGivenTextPanelProps {
  /** Transcription the captions were created from. The text is stored there. */
  transcriptionId: string | null;
  textareaClassName?: string;
}

async function readError(response: Response, fallback: string) {
  const data = await response.json().catch(() => ({}));
  return (data as { error?: string }).error || fallback;
}

export function UserGivenTextPanel({
  transcriptionId,
  textareaClassName,
}: UserGivenTextPanelProps) {
  const [text, setText] = useState('');
  const [savedText, setSavedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadGenRef = useRef(0);

  const load = useCallback(async () => {
    const gen = ++loadGenRef.current;
    setError(null);
    if (!transcriptionId) {
      setText('');
      setSavedText('');
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`/api/transcriptions/${transcriptionId}`);
      if (!response.ok) {
        throw new Error(await readError(response, 'Failed to load the transcription'));
      }
      const data = (await response.json()) as { transcription?: Partial<Transcription> };
      if (gen !== loadGenRef.current) return;
      const current = getReferenceLyricsText(data.transcription) ?? '';
      setText(current);
      setSavedText(current);
    } catch (err) {
      if (gen !== loadGenRef.current) return;
      setError(err instanceof Error ? err.message : 'Failed to load the transcription');
    } finally {
      if (gen === loadGenRef.current) setIsLoading(false);
    }
  }, [transcriptionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async () => {
    if (!transcriptionId) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/transcriptions/${transcriptionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userWrittenTranscription: text }),
      });
      if (!response.ok) {
        throw new Error(await readError(response, 'Failed to save the text'));
      }
      setText(text.trim());
      setSavedText(text.trim());
      toast.success('User given text saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save the text');
    } finally {
      setIsSaving(false);
    }
  };

  if (!transcriptionId) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center">
        <p className="text-xs text-muted-foreground">
          Link these captions to a transcription to store the original text.
        </p>
      </div>
    );
  }

  const isDirty = text.trim() !== savedText.trim();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Original text
        </Label>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => void load()}
            disabled={isLoading || isSaving}
            title="Reload from the transcription"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => void handleSave()}
            disabled={!isDirty || isLoading || isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save
          </Button>
        </div>
      </div>
      <Textarea
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => {
          if ((e.metaKey || e.ctrlKey) && e.key === 's') {
            e.preventDefault();
            if (isDirty && !isSaving) void handleSave();
          }
        }}
        placeholder="Paste or write the lyrics or script exactly as written."
        className={cn(
          'min-h-[320px] resize-y font-mono text-xs leading-relaxed',
          textareaClassName,
        )}
        disabled={isLoading || isSaving}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <p className="text-[10px] text-muted-foreground">
        Stored on the transcription. Spelling Correct uses this text as the reference.
      </p>
    </div>
  );
}
