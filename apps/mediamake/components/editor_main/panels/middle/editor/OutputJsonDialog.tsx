"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { JsonEditor } from "@/components/editor/player/json-editor";
import type { InputCompositionProps } from "@microfox/remotion";

interface OutputJsonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  generatedOutput: InputCompositionProps | null;
}

export function OutputJsonDialog({
  open,
  onOpenChange,
  generatedOutput,
}: OutputJsonDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Timeline Output JSON</DialogTitle>
        </DialogHeader>
        <div className="h-[60vh]">
          <JsonEditor
            value={generatedOutput || {}}
            onChange={() => {}} // Read-only
            height="100%"
            className="h-full"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
