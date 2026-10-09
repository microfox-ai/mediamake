'use client';

import { useState } from 'react';
import { Image, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TagMultiSelect } from '@/components/ui/tag-multi-select';
import { MediaPicker } from '@/components/editor/media/media-picker';
import { LANGUAGES } from '@/components/transcriber/new/new-transcription-ui';
import type { MediaFile } from '@/app/types/media';
import type { Transcription } from '@/app/types/transcription';

interface AudioToTextDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (transcription: Transcription) => void;
}

function isValidUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function AudioToTextDialog({ open, onClose, onCreated }: AudioToTextDialogProps) {
  const [audioUrl, setAudioUrl] = useState('');
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('en');
  const [provider, setProvider] = useState<'assembly' | 'gemini' | 'elevenlabs'>('elevenlabs');
  const [autofix, setAutofix] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!audioUrl.trim() || !isValidUrl(audioUrl.trim())) {
      setError('Enter a valid audio URL');
      return;
    }
    setIsRunning(true);
    setError(null);
    try {
      const endpoint =
        provider === 'gemini'
          ? '/api/transcribe/gemini'
          : provider === 'elevenlabs'
            ? '/api/transcribe/elevenlabs-stt'
            : '/api/transcribe/assembly';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioUrl: audioUrl.trim(),
          language: language === 'auto' ? undefined : language,
          tags,
          title: title.trim() || undefined,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success || !result.transcription) {
        throw new Error(result.error || 'Transcription failed');
      }

      let transcription = result.transcription as Transcription;
      if (title.trim() && !transcription.title) {
        transcription = { ...transcription, title: title.trim() };
      }
      if (autofix && transcription._id) {
        try {
          const autofixResponse = await fetch('/api/studio/chat/agent/transcription-fixer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcriptionId: transcription._id.toString() }),
          });
          if (autofixResponse.ok) {
            const autofixResult = await autofixResponse.json();
            if (autofixResult.success && autofixResult.transcription) {
              transcription = {
                ...transcription,
                captions: autofixResult.transcription.captions ?? transcription.captions,
              };
            }
          }
        } catch {
          // Keep the original transcription if autofix fails.
        }
      }

      onCreated(transcription);
      setAudioUrl('');
      setTitle('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transcription failed');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={next => {
          if (!next && !isRunning) onClose();
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm">Audio to text</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Audio URL
                </Label>
                <Input
                  value={audioUrl}
                  onChange={e => setAudioUrl(e.target.value)}
                  placeholder="https://example.com/audio.mp3"
                  className="h-8 text-xs"
                  disabled={isRunning}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-3"
                disabled={isRunning}
                onClick={() => setShowPicker(true)}
                title="Pick audio"
              >
                <Image className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Title
                </Label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Transcription title"
                  className="h-8 text-xs"
                  disabled={isRunning}
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Language
                </Label>
                <Select value={language} onValueChange={setLanguage} disabled={isRunning}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(item => (
                      <SelectItem key={item.code} value={item.code}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Provider
                </Label>
                <Select
                  value={provider}
                  onValueChange={value =>
                    setProvider(value as 'assembly' | 'gemini' | 'elevenlabs')
                  }
                  disabled={isRunning}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                    <SelectItem value="assembly">AssemblyAI</SelectItem>
                    <SelectItem value="gemini">Gemini</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label
                className="flex h-8 items-center gap-1.5 text-xs shrink-0 text-muted-foreground"
                title="Autofix is temporarily disabled"
              >
                <Checkbox
                  checked={autofix}
                  onCheckedChange={value => setAutofix(value === true)}
                  disabled
                />
                Autofix
              </label>
            </div>

            <TagMultiSelect
              selectedTags={tags}
              onTagsChange={setTags}
              label="Tags"
              showCreateNew={false}
            />
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isRunning}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={() => void handleSubmit()} disabled={isRunning}>
              {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Create captions'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {showPicker && (
        <MediaPicker
          pickerMode
          singular
          onSelect={(files: MediaFile | MediaFile[]) => {
            const file = Array.isArray(files) ? files[0] : files;
            if (file?.filePath) setAudioUrl(file.filePath);
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}
