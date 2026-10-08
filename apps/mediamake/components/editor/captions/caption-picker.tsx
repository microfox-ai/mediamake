'use client';

import { useEffect, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { CaptionsDocument } from '@/app/types/transcription';

interface CaptionPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (doc: CaptionsDocument) => void;
}

export function CaptionPicker({ open, onClose, onSelect }: CaptionPickerProps) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<CaptionsDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ limit: '30' });
        if (search.trim()) params.set('search', search.trim());
        const response = await fetch(`/api/captions?${params.toString()}`);
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to search captions');
        }
        const data = await response.json();
        setResults(Array.isArray(data.captions) ? data.captions : []);
      } catch (err) {
        setResults([]);
        setError(err instanceof Error ? err.message : 'Failed to search captions');
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [open, search]);

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">Link caption</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search title or description"
            className="h-8 pl-7 text-xs"
            autoFocus
          />
        </div>
        <ScrollArea className="h-72 rounded-md border">
          <div className="p-1">
            {loading && (
              <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Searching
              </div>
            )}
            {!loading && error && (
              <p className="px-2 py-6 text-center text-xs text-destructive">{error}</p>
            )}
            {!loading && !error && results.length === 0 && (
              <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                No captions found
              </p>
            )}
            {!loading &&
              results.map(doc => {
                const id = doc._id?.toString() ?? '';
                const count = doc.captions?.length ?? 0;
                return (
                  <button
                    key={id}
                    type="button"
                    className="flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-2 text-left hover:bg-muted"
                    onClick={() => onSelect(doc)}
                  >
                    <span className="text-xs font-medium">
                      {doc.title || 'Untitled Captions'}
                    </span>
                    {doc.description ? (
                      <span className="line-clamp-2 text-[11px] text-muted-foreground">
                        {doc.description}
                      </span>
                    ) : null}
                    <span className="text-[10px] text-muted-foreground/70">
                      {count} sentence{count === 1 ? '' : 's'}
                    </span>
                  </button>
                );
              })}
          </div>
        </ScrollArea>
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
