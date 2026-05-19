"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { DefaultCard } from "@/components/editor/presets/form/default-card";
import { remapDataReferenceKeys } from "@/components/editor/presets/engine/preset-data-mutation";
import type { DefaultPresetData, ReferenceItem } from "@/components/editor/presets/types";
import type { Timeline } from "../../../../stores/project-store";
import { useTimelineEditsStore } from "../../../../stores/timeline-edits-store";
import { useCompileStore } from "../../../../stores/compile-store";

interface ReferencePropsPanelProps {
  reference: ReferenceItem;
  timeline: Timeline;
  referenceIndex: number;
}

export function ReferenceProps({
  reference,
  timeline,
  referenceIndex,
}: ReferencePropsPanelProps) {
  const { getEditedTimeline, updateTimeline } = useTimelineEditsStore();
  const { generateOutput, isGenerating, generationProgress } = useCompileStore();
  const [activeTab, setActiveTab] = useState<"smart" | "full">("smart");
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const editedTimeline = getEditedTimeline(timeline.id);
  const displayTimeline = editedTimeline || timeline;
  const references = displayTimeline.defaultData?.references || [];
  const selectedReference = references[referenceIndex] || reference;

  const onReferenceChange = useCallback(
    (newDefaultData: DefaultPresetData) => {
      const currentReferences = displayTimeline.defaultData?.references || [];
      if (!currentReferences[referenceIndex]) {
        return;
      }

      const updatedReference = newDefaultData.references[0];
      if (!updatedReference) {
        return;
      }

      const nextReferences = [...currentReferences];
      const oldKey = currentReferences[referenceIndex]?.key;
      nextReferences[referenceIndex] = {
        ...nextReferences[referenceIndex],
        ...updatedReference,
      };
      const newKey = nextReferences[referenceIndex]?.key;
      const keyMapping =
        oldKey && newKey && oldKey !== newKey ? { [oldKey]: newKey } : {};
      const migratedPresets =
        Object.keys(keyMapping).length > 0
          ? (displayTimeline.presets || []).map((preset) => ({
              ...preset,
              presetInputData: remapDataReferenceKeys(
                preset.presetInputData || {},
                keyMapping,
              ),
            }))
          : displayTimeline.presets;

      updateTimeline(timeline.id, {
        defaultData: {
          ...(displayTimeline.defaultData || {}),
          references: nextReferences,
        },
        ...(migratedPresets ? { presets: migratedPresets } : {}),
      });

      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(() => {
        const latestEdited = useTimelineEditsStore.getState().getEditedTimeline(timeline.id);
        const timelineForCompile = latestEdited || timeline;
        generateOutput(timelineForCompile);
      }, 700);
    },
    [
      displayTimeline.defaultData,
      generateOutput,
      referenceIndex,
      timeline,
      updateTimeline,
    ],
  );

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);
  const title = selectedReference?.key || `reference_${referenceIndex + 1}`;
  const referenceType = selectedReference?.type || "object";
  const referenceDataType = selectedReference?.dataType || referenceType;
  const selectedDefaultData: DefaultPresetData = {
    references: selectedReference ? [selectedReference] : [],
  };

  return (
    <ScrollArea className="flex-1 overflow-y-auto">
      <div className="p-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Reference Properties</h3>
              {isGenerating && (
                <div className="text-xs text-muted-foreground">
                  Generating... {generationProgress}%
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{title}</p>
              <Badge variant="secondary" className="text-xs">
                {referenceType}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {referenceDataType}
              </Badge>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-3">
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as "smart" | "full")}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="smart" className="text-xs">
                  Smart
                </TabsTrigger>
                <TabsTrigger value="full" className="text-xs">
                  Full
                </TabsTrigger>
              </TabsList>

              <TabsContent value="smart" className="mt-3">
                <DefaultCard
                  defaultData={selectedDefaultData}
                  onDefaultDataChange={onReferenceChange}
                  isExpanded={true}
                  singleReferenceMode={true}
                />
              </TabsContent>

              <TabsContent value="full" className="mt-3">
                <DefaultCard
                  defaultData={selectedDefaultData}
                  onDefaultDataChange={onReferenceChange}
                  isExpanded={true}
                  singleReferenceMode={true}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

