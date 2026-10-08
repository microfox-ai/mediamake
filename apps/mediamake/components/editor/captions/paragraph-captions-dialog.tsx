'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CaptionHtmlTextEditor } from '@/components/editor/captions/caption-html-text-editor';
import { captionsFromSentenceHtml } from '@/lib/captions/paragraph-captions';
import type { Caption } from '@/app/types/transcription';

interface ParagraphCaptionsDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (captions: Caption[]) => void;
}

export function ParagraphCaptionsDialog({
  open,
  onClose,
  onCreate,
}: ParagraphCaptionsDialogProps) {
  const [html, setHtml] = useState('<p></p>');

  const handleCreate = () => {
    const captions = captionsFromSentenceHtml(html);
    if (captions.length === 0) return;
    onCreate(captions);
    setHtml('<p></p>');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm">Captions from paragraph</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Each line is one sentence. Bold marks the highlighted words.
        </p>
        <CaptionHtmlTextEditor
          value={html}
          variant="sentences"
          compact={false}
          lines={10}
          onChange={setHtml}
        />
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={handleCreate}>
            Create captions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
