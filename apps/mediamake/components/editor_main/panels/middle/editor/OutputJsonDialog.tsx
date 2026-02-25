"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { JsonEditor } from "@/components/editor/player/json-editor";
import type { InputCompositionProps } from "@microfox/remotion";
import { useCompileStore } from "../../../stores/compile-store";
import { useLayerStateStore } from "../../../stores/layer-state-store";
import { useMemo } from "react";

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
  const calculatedMetadata = useCompileStore((s) => s.calculatedMetadata);
  const getLayerStateSnapshot = useLayerStateStore((s) => s.getLayerStateSnapshot);
  const childrenOrderByParentId = useLayerStateStore((s) => s.childrenOrderByParentId);
  const overrides = useLayerStateStore((s) => s.overrides);
  const addedNodes = useLayerStateStore((s) => s.addedNodes);
  const loadedChildrenData = useLayerStateStore((s) => s.loadedChildrenData);

  const timelineProps: InputCompositionProps | Record<string, never> = useMemo(() => {
    const fromMetadata = calculatedMetadata?.props as InputCompositionProps | undefined;
    if (fromMetadata) return fromMetadata;
    if (generatedOutput) return generatedOutput;
    return {};
  }, [calculatedMetadata?.props, generatedOutput]);

  const layersOutput: unknown = useMemo(() => {
    if (!("childrenData" in timelineProps)) return timelineProps;
    const base = timelineProps as InputCompositionProps;
    const snapshot = getLayerStateSnapshot(base.childrenData);
    return {
      ...base,
      ...(snapshot.childrenData ? { childrenData: snapshot.childrenData } : {}),
      layerState: {
        trackStates: snapshot.trackStates,
        hiddenLayerIds: snapshot.hiddenLayerIds,
        lockedLayerIds: snapshot.lockedLayerIds,
      },
    };
  }, [
    timelineProps,
    getLayerStateSnapshot,
    childrenOrderByParentId,
    overrides,
    addedNodes,
    loadedChildrenData,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Output JSON</DialogTitle>
        </DialogHeader>
        <div className="h-[60vh] flex flex-col">
          <Tabs defaultValue="timeline" className="flex-1 flex flex-col min-h-0">
            <TabsList className="w-full">
              <TabsTrigger value="timeline" className="flex-1">
                Timeline Output JSON
              </TabsTrigger>
              <TabsTrigger value="layers" className="flex-1">
                Layers Output JSON
              </TabsTrigger>
            </TabsList>
            <TabsContent value="timeline" className="flex-1 min-h-0">
              <JsonEditor
                value={timelineProps}
                onChange={() => {}} // Read-only
                height="100%"
                className="h-full"
              />
            </TabsContent>
            <TabsContent value="layers" className="flex-1 min-h-0">
              <JsonEditor
                value={layersOutput || {}}
                onChange={() => {}} // Read-only
                height="100%"
                className="h-full"
              />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
