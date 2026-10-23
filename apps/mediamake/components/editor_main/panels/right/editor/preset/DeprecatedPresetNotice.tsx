"use client";

import { AlertTriangle, ArrowRightLeft } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface DeprecatedPresetNoticeProps {
  trackName: string;
  presetTitle: string;
  replacementTitle: string;
  onReplace: () => void;
}

/** Shown instead of the form for a block whose preset is deprecated. */
export function DeprecatedPresetNotice({
  trackName,
  presetTitle,
  replacementTitle,
  onReplace,
}: DeprecatedPresetNoticeProps) {
  return (
    <ScrollArea className="flex-1 overflow-y-auto">
      <div className="flex min-h-full flex-col items-center justify-center gap-6 p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <div className="space-y-2">
          <h2 className="text-2xl font-bold leading-tight">
            This preset is deprecated
          </h2>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{trackName}</span> uses{" "}
            {presetTitle}, which is no longer edited. Move it to {replacementTitle} to keep
            working on it. The text, style, position, timing and transitions carry over.
          </p>
        </div>
        <Button size="lg" className="w-full max-w-xs" onClick={onReplace}>
          <ArrowRightLeft className="mr-2 h-4 w-4" />
          Transition to {replacementTitle}
        </Button>
      </div>
    </ScrollArea>
  );
}
