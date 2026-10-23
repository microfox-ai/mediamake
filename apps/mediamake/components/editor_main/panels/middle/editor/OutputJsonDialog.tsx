"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { JsonEditor } from "@/components/editor/player/json-editor";
import type { InputCompositionProps } from "@microfox/remotion";
import { Download } from "lucide-react";
import { useCompileStore } from "../../../stores/compile-store";
import { useLayerStateStore } from "../../../stores/layer-state-store";
import { useProjectStore, type Timeline } from "../../../stores/project-store";
import { useTimelineEditsStore } from "../../../stores/timeline-edits-store";
import { useMemo } from "react";
import { toast } from "sonner";

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function fileSlug(name: string | undefined) {
  const slug = (name ?? "timeline")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "timeline";
}

/** Payload `generateOutput` reads. Preset definitions are fetched by id, so cached `presetInfo` is omitted. */
function compilerInputFromTimeline(timeline: Timeline) {
  return {
    configuration: timeline.configuration ?? null,
    defaultData: timeline.defaultData ?? null,
    presets: (timeline.presets ?? []).map(({ presetInfo: _presetInfo, ...preset }) => preset),
    nodes: timeline.nodes ?? null,
    actions: timeline.actions ?? [],
  };
}

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
  const currentTimeline = useCompileStore((s) => s.currentTimeline);
  const loadedTimeline = useProjectStore((s) => s.loadedTimeline);
  const timelineId = loadedTimeline?.id ?? currentTimeline?.id ?? null;
  const editedTimeline = useTimelineEditsStore((s) =>
    timelineId ? s.editedTimelines.get(timelineId) : undefined,
  );
  const getLayerStateSnapshot = useLayerStateStore((s) => s.getLayerStateSnapshot);
  const childrenOrderByParentId = useLayerStateStore((s) => s.childrenOrderByParentId);
  const overrides = useLayerStateStore((s) => s.overrides);
  const addedNodes = useLayerStateStore((s) => s.addedNodes);
  const loadedChildrenData = useLayerStateStore((s) => s.loadedChildrenData);

  const timelineInput = useMemo(() => {
    const source = editedTimeline ?? loadedTimeline ?? currentTimeline;
    if (!source) return {};
    return compilerInputFromTimeline(source);
  }, [editedTimeline, loadedTimeline, currentTimeline]);

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

  const downloadTimelineFiles = () => {
    const source = editedTimeline ?? loadedTimeline ?? currentTimeline;
    const slug = fileSlug(source?.displayName);
    downloadJson(`${slug}-timeline-output.json`, timelineProps);
    window.setTimeout(() => {
      downloadJson(`${slug}-timeline-input.json`, timelineInput);
    }, 150);
    toast.success("Downloaded timeline output and timeline input");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh]">
        <DialogHeader className="flex-row items-center pr-8">
          <DialogTitle className="flex-1">Output JSON</DialogTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            title="Download timeline output and timeline input"
            onClick={downloadTimelineFiles}
          >
            <Download />
            <span className="sr-only">Download timeline output and timeline input</span>
          </Button>
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
              <TabsTrigger value="input" className="flex-1">
                Timeline Input
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
            <TabsContent value="input" className="flex-1 min-h-0">
              <JsonEditor
                value={timelineInput}
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
