"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, X, Loader2 } from "lucide-react";
import { SchemaForm } from "@/components/editor/presets/form/schema-form";
import { DefaultCard } from "@/components/editor/presets/form/default-card";
import { createBaseDataFromReferences } from "@/components/editor/presets/engine/preset-data-mutation";
import type { Timeline } from "../../../stores/project-store";
import { useTimelineEditsStore } from "../../../stores/timeline-edits-store";
import { useCompileStore, usePresetReady } from "../../../stores/compile-store";
import { getPredefinedPresetById } from "@/components/editor/presets/registry/registry/presets-registry";
import { Preset as PresetType, DatabasePreset } from "@/components/editor/presets/types";
import { Separator } from "@/components/ui/separator";

interface TimelinePropsProps {
  timeline: Timeline;
}

export function TimelineProps({ timeline }: TimelinePropsProps) {
  const { getEditedTimeline, updateTimeline, updatePresetInputData } = useTimelineEditsStore();
  const { fetchPresetInfo, generateOutput, isGenerating, generationProgress } = useCompileStore();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(timeline.displayName);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(timeline.description || "");
  const isCompilingRef = useRef(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const configDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const defaultDataDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingFromStoreRef = useRef(false);
  const lastSyncedInputDataRef = useRef<string>("");

  // Get edited timeline if it exists, otherwise use original
  const editedTimeline = getEditedTimeline(timeline.id);
  const displayTimeline = editedTimeline || timeline;

  // Initialize local configuration state
  const [localConfig, setLocalConfig] = useState({
    fps: displayTimeline.configuration?.config?.fps || 30,
    width: displayTimeline.configuration?.config?.width || 1080,
    height: displayTimeline.configuration?.config?.height || 1920,
    duration: displayTimeline.configuration?.config?.duration || 0,
    fitDurationTo: displayTimeline.configuration?.config?.fitDurationTo || "",
    backgroundColor: displayTimeline.configuration?.style?.backgroundColor || "black",
  });

  // Get first preset
  const firstPreset = displayTimeline.presets?.[0];
  const { isReady, isLoading, error } = usePresetReady(firstPreset?.presetId || "");

  // Get preset info from cache
  const presetInfo = useCompileStore(state => firstPreset ? state.presetInfoCache.get(firstPreset.presetId) : null);
  const actualPreset = presetInfo?.preset as PresetType | DatabasePreset | null;

  // Initialize local state with first preset data
  const [localInputData, setLocalInputData] = useState(firstPreset?.presetInputData || {});

  // Initialize the ref with the initial value
  useEffect(() => {
    const initialData = firstPreset?.presetInputData || {};
    lastSyncedInputDataRef.current = JSON.stringify(initialData);
  }, []); // Only on mount

  // Update editedName when timeline changes
  useEffect(() => {
    setEditedName(displayTimeline.displayName);
  }, [displayTimeline.displayName]);

  // Update editedDescription when timeline changes
  useEffect(() => {
    setEditedDescription(displayTimeline.description || "");
  }, [displayTimeline.description]);

  // Sync local state when first preset changes externally
  // Only sync if data actually changed and we're not updating from our own debounced update
  useEffect(() => {
    if (!firstPreset) return;

    // Skip if we're currently updating from our own debounced update
    if (isUpdatingFromStoreRef.current) return;

    // Skip if we're currently compiling (to prevent re-renders during generation)
    if (isCompilingRef.current) return;

    const newInputData = firstPreset.presetInputData || {};
    const newInputDataStr = JSON.stringify(newInputData);

    // Only update if the data actually changed
    if (newInputDataStr !== lastSyncedInputDataRef.current) {
      lastSyncedInputDataRef.current = newInputDataStr;
      setLocalInputData(newInputData);
    }
  }, [firstPreset?.presetInputData]);

  // Sync local config when timeline configuration changes externally
  useEffect(() => {
    setLocalConfig({
      fps: displayTimeline.configuration?.config?.fps || 30,
      width: displayTimeline.configuration?.config?.width || 1080,
      height: displayTimeline.configuration?.config?.height || 1920,
      duration: displayTimeline.configuration?.config?.duration || 0,
      fitDurationTo: displayTimeline.configuration?.config?.fitDurationTo || "",
      backgroundColor: displayTimeline.configuration?.style?.backgroundColor || "black",
    });
  }, [displayTimeline.configuration]);

  // Default data (references) for this timeline
  const defaultData = displayTimeline.defaultData || { references: [] };

  // Fetch preset info if not ready
  useEffect(() => {
    if (firstPreset && !isReady && !isLoading && !error) {
      fetchPresetInfo(firstPreset.presetId);
    }
  }, [firstPreset?.presetId, isReady, isLoading, error, fetchPresetInfo]);

  // Handle name editing
  const handleNameSave = () => {
    const trimmedValue = editedName.trim();
    if (trimmedValue && trimmedValue !== displayTimeline.displayName) {
      updateTimeline(timeline.id, { displayName: trimmedValue });
    } else {
      setEditedName(displayTimeline.displayName);
    }
    setIsEditingName(false);
  };

  const handleNameCancel = () => {
    setEditedName(displayTimeline.displayName);
    setIsEditingName(false);
  };

  // Handle description editing
  const handleDescriptionSave = () => {
    const trimmedValue = editedDescription.trim();
    if (trimmedValue !== (displayTimeline.description || "")) {
      updateTimeline(timeline.id, { description: trimmedValue || undefined });
    } else {
      setEditedDescription(displayTimeline.description || "");
    }
    setIsEditingDescription(false);
  };

  const handleDescriptionCancel = () => {
    setEditedDescription(displayTimeline.description || "");
    setIsEditingDescription(false);
  };

  // Create debounced function for preset input data changes
  const debouncedUpdateAndCompile = useCallback((newInputData: any) => {
    if (!firstPreset) return;

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounce both store update and compilation
    debounceTimeoutRef.current = setTimeout(() => {
      // Mark that we're updating from our own debounced update
      isUpdatingFromStoreRef.current = true;

      // Update store
      updatePresetInputData(timeline.id, firstPreset.id, newInputData);

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
  }, [timeline.id, firstPreset?.id, actualPreset?.metadata, updatePresetInputData, generateOutput]);

  // Handle input data changes - update local state immediately, debounce store update and compilation
  const handleInputDataChange = useCallback((newInputData: any) => {
    // Update local state immediately (for UI responsiveness, no re-render from store)
    setLocalInputData(newInputData);

    // Call debounced function
    debouncedUpdateAndCompile(newInputData);
  }, [debouncedUpdateAndCompile]);

  // Create debounced function for configuration changes
  const debouncedUpdateConfigAndCompile = useCallback((newConfig: typeof localConfig) => {
    // Clear existing timeout
    if (configDebounceTimeoutRef.current) {
      clearTimeout(configDebounceTimeoutRef.current);
    }

    // Debounce both store update and compilation
    configDebounceTimeoutRef.current = setTimeout(() => {
      // Update store
      const configuration = {
        config: {
          fps: newConfig.fps,
          width: newConfig.width,
          height: newConfig.height,
          duration: newConfig.duration,
          ...(newConfig.fitDurationTo && { fitDurationTo: newConfig.fitDurationTo }),
        },
        style: {
          backgroundColor: newConfig.backgroundColor,
        },
      };
      updateTimeline(timeline.id, { configuration });

      // Get updated timeline from edits store
      const { getEditedTimeline } = useTimelineEditsStore.getState();
      const editedTimeline = getEditedTimeline(timeline.id);
      const updatedTimeline = editedTimeline || timeline;

      // Update compile store's current timeline
      const compileStore = useCompileStore.getState();
      if (compileStore.currentTimeline?.id === updatedTimeline.id) {
        useCompileStore.setState({ currentTimeline: updatedTimeline });
      }

      // Auto-compile (only if not already compiling)
      if (!isCompilingRef.current) {
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
    }, 800); // 800ms debounce
  }, [timeline.id, updateTimeline, generateOutput]);

  // Handle configuration changes - update local state immediately, debounce store update and compilation
  const handleConfigChange = useCallback((field: keyof typeof localConfig, value: string | number) => {
    const newConfig = { ...localConfig, [field]: value };
    // Update local state immediately (for UI responsiveness)
    setLocalConfig(newConfig);

    // Call debounced function
    debouncedUpdateConfigAndCompile(newConfig);
  }, [localConfig, debouncedUpdateConfigAndCompile]);

  // Create debounced function for default data changes
  const debouncedUpdateDefaultDataAndCompile = useCallback((newDefaultData: typeof defaultData) => {
    // Clear existing timeout
    if (defaultDataDebounceTimeoutRef.current) {
      clearTimeout(defaultDataDebounceTimeoutRef.current);
    }

    // Debounce both store update and compilation
    defaultDataDebounceTimeoutRef.current = setTimeout(() => {
      // Update store
      updateTimeline(timeline.id, { defaultData: newDefaultData });

      // Get updated timeline from edits store
      const { getEditedTimeline } = useTimelineEditsStore.getState();
      const editedTimeline = getEditedTimeline(timeline.id);
      const updatedTimeline = editedTimeline || timeline;

      // Update compile store's current timeline
      const compileStore = useCompileStore.getState();
      if (compileStore.currentTimeline?.id === updatedTimeline.id) {
        useCompileStore.setState({ currentTimeline: updatedTimeline });
      }

      // Auto-compile (only if not already compiling)
      if (!isCompilingRef.current) {
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
    }, 800); // 800ms debounce
  }, [timeline.id, updateTimeline, generateOutput]);

  // Handle default data changes - debounce store update and compilation
  const handleDefaultDataChange = useCallback((newDefaultData: typeof defaultData) => {
    // Call debounced function
    debouncedUpdateDefaultDataAndCompile(newDefaultData);
  }, [debouncedUpdateDefaultDataAndCompile]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (configDebounceTimeoutRef.current) {
        clearTimeout(configDebounceTimeoutRef.current);
      }
      if (defaultDataDebounceTimeoutRef.current) {
        clearTimeout(defaultDataDebounceTimeoutRef.current);
      }
    };
  }, []);

  return (
    <ScrollArea className="flex-1 overflow-y-auto">
      <div className="p-4">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">Timeline Properties

              {displayTimeline.id && (
                <span className="text-sm font-mono text-xs text-muted-foreground"> - {displayTimeline.id}</span>
              )}
            </h3>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Name</p>
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleNameSave();
                        if (e.key === 'Escape') handleNameCancel();
                      }}
                      className="text-sm font-medium h-8"
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleNameSave}
                      className="h-8 w-8 p-0"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleNameCancel}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <p
                    className="text-sm font-medium cursor-pointer hover:bg-muted/50 px-2 py-1 rounded -ml-2"
                    onClick={() => setIsEditingName(true)}
                    title="Click to edit name"
                  >
                    {displayTimeline.displayName}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                {isEditingDescription ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey) handleDescriptionSave();
                        if (e.key === 'Escape') handleDescriptionCancel();
                      }}
                      className="text-sm min-h-[80px]"
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDescriptionSave}
                        className="h-8"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDescriptionCancel}
                        className="h-8"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p
                    className="text-sm cursor-pointer hover:bg-muted/50 px-2 py-1 rounded -ml-2 min-h-[24px]"
                    onClick={() => setIsEditingDescription(true)}
                    title="Click to edit description"
                  >
                    {displayTimeline.description || <span className="text-muted-foreground italic">No description</span>}
                  </p>
                )}
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Default References (Base Data) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Default References</h3>
              {isGenerating && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Generating... {generationProgress}%</span>
                </div>
              )}
            </div>
            <DefaultCard
              defaultData={defaultData}
              onDefaultDataChange={handleDefaultDataChange}
            />
          </div>

          <Separator className="my-4" />

          {/* Timeline Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Timeline Configuration</h3>
              {isGenerating && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Generating... {generationProgress}%</span>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fps" className="text-xs">FPS</Label>
                  <Input
                    id="fps"
                    type="number"
                    value={localConfig.fps}
                    onChange={(e) => handleConfigChange("fps", parseInt(e.target.value) || 30)}
                    className="h-8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-xs">Duration (seconds)</Label>
                  <Input
                    id="duration"
                    type="number"
                    step="0.1"
                    value={localConfig.duration}
                    onChange={(e) => handleConfigChange("duration", parseFloat(e.target.value) || 0)}
                    className="h-8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="width" className="text-xs">Width</Label>
                  <Input
                    id="width"
                    type="number"
                    value={localConfig.width}
                    onChange={(e) => handleConfigChange("width", parseInt(e.target.value) || 1080)}
                    className="h-8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height" className="text-xs">Height</Label>
                  <Input
                    id="height"
                    type="number"
                    value={localConfig.height}
                    onChange={(e) => handleConfigChange("height", parseInt(e.target.value) || 1920)}
                    className="h-8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fitDurationTo" className="text-xs">Fit Duration To</Label>
                  <Input
                    id="fitDurationTo"
                    type="text"
                    value={localConfig.fitDurationTo}
                    onChange={(e) => handleConfigChange("fitDurationTo", e.target.value)}
                    placeholder="e.g., BaseScene"
                    className="h-8"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="backgroundColor" className="text-xs">Background Color</Label>
                  <Input
                    id="backgroundColor"
                    type="text"
                    value={localConfig.backgroundColor}
                    onChange={(e) => handleConfigChange("backgroundColor", e.target.value)}
                    placeholder="e.g., black, #000000"
                    className="h-8"
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* First Preset Schema Form */}
          {firstPreset && actualPreset && (
            <div className="space-y-4">
              <SchemaForm
                title={actualPreset.metadata.title}
                metadata={actualPreset.metadata}
                schema={actualPreset.presetParams}
                value={localInputData}
                onChange={handleInputDataChange}
                availableReferences={(displayTimeline.defaultData?.references || []).map((ref: any) => ref.key)}
                baseData={createBaseDataFromReferences(displayTimeline.defaultData?.references || [])}
                showTabs={true}
              />
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
