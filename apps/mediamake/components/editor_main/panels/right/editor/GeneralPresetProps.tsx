"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2 } from "lucide-react";
import { SchemaForm } from "@/components/editor/presets/form/schema-form";
import { createBaseDataFromReferences } from "@/components/editor/presets/engine/preset-data-mutation";
import { useCompileStore, usePresetReady } from "../../../stores/compile-store";
import { useProjectStore } from "../../../stores/project-store";
import { useTimelineEditsStore } from "../../../stores/timeline-edits-store";
import { PresetSkeleton } from "./PresetSkeleton";
import type { Preset } from "../../../stores/editor-store";
import type { Timeline } from "../../../stores/project-store";
import { useEffect, useState, useRef, useCallback } from "react";
import { getPredefinedPresetById } from "@/components/editor/presets/registry/registry/presets-registry";
import { Preset as PresetType, DatabasePreset } from "@/components/editor/presets/types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Check, X } from "lucide-react";

interface GeneralPresetPropsProps {
  preset: Preset;
  timeline: Timeline;
}

export function GeneralPresetProps({ preset, timeline }: GeneralPresetPropsProps) {
  const { fetchPresetInfo, generateOutput, isGenerating, generationProgress } = useCompileStore();
  const { isReady, isLoading, error } = usePresetReady(preset.presetId);
  const { updatePresetLabel, updatePresetInputData, getEditedTimeline } = useTimelineEditsStore();
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [editedLabel, setEditedLabel] = useState(preset.label);
  const isCompilingRef = useRef(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingFromStoreRef = useRef(false);
  const lastSyncedInputDataRef = useRef<string>("");

  // Get the current preset from edited timeline or original
  const editedTimeline = getEditedTimeline(timeline.id);
  const currentPreset = editedTimeline?.presets?.find(p => p.id === preset.id) || preset;

  // Initialize local state with current preset data
  const [localInputData, setLocalInputData] = useState(currentPreset.presetInputData || {});

  // Initialize the ref with the initial value
  useEffect(() => {
    lastSyncedInputDataRef.current = JSON.stringify(currentPreset.presetInputData || {});
  }, []); // Only on mount

  // Sync local state when preset changes externally
  // Only sync if data actually changed and we're not updating from our own debounced update
  useEffect(() => {
    // Skip if we're currently updating from our own debounced update
    if (isUpdatingFromStoreRef.current) return;

    // Skip if we're currently compiling (to prevent re-renders during generation)
    if (isCompilingRef.current) return;

    const newInputData = currentPreset.presetInputData || {};
    const newInputDataStr = JSON.stringify(newInputData);

    // Only update if the data actually changed
    if (newInputDataStr !== lastSyncedInputDataRef.current) {
      lastSyncedInputDataRef.current = newInputDataStr;
      setLocalInputData(newInputData);
    }
  }, [currentPreset.presetInputData]);

  // Update editedLabel when preset changes
  useEffect(() => {
    setEditedLabel(currentPreset.label);
  }, [currentPreset.label]);

  // Fetch preset info if not ready
  useEffect(() => {
    if (!isReady && !isLoading && !error) {
      fetchPresetInfo(preset.presetId);
    }
  }, [preset.presetId, isReady, isLoading, error, fetchPresetInfo]);

  // Get preset info from cache
  const presetInfo = useCompileStore(state => state.presetInfoCache.get(preset.presetId));
  const actualPreset = presetInfo?.preset as PresetType | DatabasePreset | null;

  // Handle label editing
  const handleLabelSave = () => {
    if (editedLabel.trim() !== currentPreset.label) {
      updatePresetLabel(timeline.id, preset.id, editedLabel.trim());
    }
    setIsEditingLabel(false);
  };

  const handleLabelCancel = () => {
    setEditedLabel(currentPreset.label);
    setIsEditingLabel(false);
  };


  // Create debounced function using useCallback with refs for stable closure
  const debouncedUpdateAndCompile = useCallback((newInputData: any) => {
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounce both store update and compilation
    debounceTimeoutRef.current = setTimeout(() => {
      // Mark that we're updating from our own debounced update
      isUpdatingFromStoreRef.current = true;

      // Update store
      updatePresetInputData(timeline.id, preset.id, newInputData);

      // Update the ref to track what we just set
      lastSyncedInputDataRef.current = JSON.stringify(newInputData);

      // Get updated timeline from edits store
      const { getEditedTimeline } = useTimelineEditsStore.getState();
      const editedTimeline = getEditedTimeline(timeline.id);
      const updatedTimeline = editedTimeline || timeline;

      // Update compile store's current timeline
      const compileStore = useCompileStore.getState();
      if (compileStore.currentTimeline?.id === updatedTimeline.id) {
        useCompileStore.setState({ currentTimeline: updatedTimeline });
      }

      // Reset the flag after a short delay to allow store updates to propagate
      setTimeout(() => {
        isUpdatingFromStoreRef.current = false;
      }, 100);

      // Auto-compile if preset metadata allows it (only if not already compiling)
      if (actualPreset?.metadata && !isCompilingRef.current) {
        const shouldAutoCompile = true; // Default to auto-compile
        if (shouldAutoCompile) {
          isCompilingRef.current = true;
          const compilePromise = generateOutput(updatedTimeline);
          // Handle promise if it returns one, otherwise just reset flag
          if (compilePromise && typeof compilePromise.then === 'function') {
            compilePromise.finally(() => {
              isCompilingRef.current = false;
            });
          } else {
            // If not a promise, reset after a delay
            setTimeout(() => {
              isCompilingRef.current = false;
            }, 100);
          }
        }
      }
    }, 800); // 800ms debounce
  }, [timeline.id, preset.id, actualPreset?.metadata, updatePresetInputData, generateOutput]);

  // Handle input data changes - update local state immediately, debounce store update and compilation
  const handleInputDataChange = useCallback((newInputData: any) => {
    // Update local state immediately (for UI responsiveness, no re-render from store)
    setLocalInputData(newInputData);

    // Call debounced function
    debouncedUpdateAndCompile(newInputData);
  }, [debouncedUpdateAndCompile]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // // Show skeleton while loading
  // if (isLoading || !isReady) {
  //   return (
  //     <ScrollArea className="flex-1">
  //       <div className="p-4 space-y-4">
  //         <div className="space-y-2">
  //           <PresetSkeleton className="h-8 w-32" />
  //           <PresetSkeleton className="h-4 w-24" />
  //         </div>
  //         <PresetSkeleton className="h-64 w-full" />
  //       </div>
  //     </ScrollArea>
  //   );
  // }

  // Show error state
  if (error || !actualPreset) {
    return (
      <ScrollArea className="flex-1">
        <div className="p-4">
          <Card className="border-destructive">
            <CardHeader>
              <h3 className="text-sm font-semibold text-destructive">Error Loading Preset</h3>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {error || `Preset ${preset.presetId} not found`}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => fetchPresetInfo(preset.presetId)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    );
  }

  // Get default data from timeline
  const defaultData = timeline.defaultData || { references: [] };
  const availableReferences = defaultData.references?.map((ref: any) => ref.key) || [];

  return (
    <ScrollArea className="flex-1 overflow-y-auto">
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            {isEditingLabel ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={editedLabel}
                  onChange={(e) => setEditedLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleLabelSave();
                    if (e.key === 'Escape') handleLabelCancel();
                  }}
                  className="text-md font-semibold h-8"
                  autoFocus
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLabelSave}
                  className="h-8 w-8 p-0"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLabelCancel}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <h3
                className="text-md font-semibold cursor-pointer hover:bg-muted/50 px-2 py-1 rounded -ml-2"
                onClick={() => setIsEditingLabel(true)}
                title="Click to edit label"
              >
                {currentPreset.label}
              </h3>
            )}
            {isGenerating && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Generating... {generationProgress}%</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {actualPreset.metadata.presetType}
            </Badge>
            {currentPreset.disabled && (
              <Badge variant="destructive" className="text-xs">
                Disabled
              </Badge>
            )}
            {actualPreset.metadata.tags?.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {actualPreset.metadata.description && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs">
                    Info
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{actualPreset.metadata.description}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Schema Form */}
        <SchemaForm
          title={actualPreset.metadata.title}
          metadata={actualPreset.metadata}
          schema={actualPreset.presetParams}
          value={localInputData}
          onChange={handleInputDataChange}
          availableReferences={availableReferences}
          baseData={createBaseDataFromReferences(defaultData.references || [])}
          showTabs={true}
        />
      </div>
    </ScrollArea>
  );
}
