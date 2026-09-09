"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Plus, Play, Loader2, Star, Trash2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SchemaForm } from "@/components/editor/presets/form/schema-form";
import { collectTrackNamesFromPresets } from "@/components/editor/presets/form/collect-track-names";
import { createBaseDataFromReferences } from "@/components/editor/presets/engine/preset-data-mutation";
import type { Timeline } from "@/components/editor_main/stores/project-store";
import type { TimelineAction, ActionTarget } from "../types";
import {
  getActionDefinition,
  getSupportedActionsForTarget,
} from "../registry";
import { useTimelineEditsStore } from "@/components/editor_main/stores/timeline-edits-store";
import { useEditorStore } from "@/components/editor_main/stores/editor-store";
import { useCompileStore } from "@/components/editor_main/stores/compile-store";
import { applyActionOutputToTargetData } from "../engine/run-action";
import {
  confirmRemoveAction,
  confirmRerunAction,
  executeAndApply,
  getTargetData,
  removeTimelineAction,
  writeTargetData,
} from "../engine/action-lifecycle";
import { cn } from "@/lib/utils";

/** Compact Actions row under preset/reference title. */
export function LinkedActionsSection({
  timeline,
  target,
  className,
}: {
  timeline: Timeline;
  target: ActionTarget;
  className?: string;
}) {
  const getEditedTimeline = useTimelineEditsStore((s) => s.getEditedTimeline);
  const addActionToTimeline = useTimelineEditsStore((s) => s.addActionToTimeline);
  const editedActions = useTimelineEditsStore(
    (s) => s.editedTimelines.get(timeline.id)?.actions,
  );
  const { selectAction } = useEditorStore();
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);
  const effective = getEditedTimeline(timeline.id) || timeline;
  const actions = (editedActions || effective.actions || []).filter((a) => {
    if (target.type === "preset") {
      return (
        a.target.type === "preset" &&
        a.target.presetInstanceId === target.presetInstanceId
      );
    }
    return (
      a.target.type === "reference" &&
      a.target.referenceKey === target.referenceKey
    );
  });
  const supported = useMemo(
    () => getSupportedActionsForTarget(effective, target),
    [effective, target],
  );

  const handleRemove = (action: TimelineAction) => {
    const { proceed, deleteOutputs } = confirmRemoveAction(action.label);
    if (!proceed) return;
    removeTimelineAction(timeline.id, action.id, { deleteOutputs });
    if (expandedActionId === action.id) {
      setExpandedActionId(null);
    }
  };

  const handleAdd = async (actionDefId: string) => {
    const definition = getActionDefinition(actionDefId);
    if (!definition) return;
    const created = addActionToTimeline(timeline.id, {
      actionId: definition.metadata.id,
      label: definition.metadata.title,
      target,
      inputData: { ...definition.defaultInputParams },
    });
    if (!created) return;
    setExpandedActionId(created.id);
    try {
      await executeAndApply(timeline.id, created.id);
    } catch {
      // stay on form so user can fill inputs and re-run
    }
  };

  const expandedAction =
    expandedActionId != null
      ? actions.find((a) => a.id === expandedActionId)
      : undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Actions
        </span>
        <span className="text-[10px] text-muted-foreground">{actions.length}</span>
        <div className="flex-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              disabled={supported.length === 0}
              title={
                supported.length === 0
                  ? "No actions available for this target"
                  : "Add action"
              }
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {supported.map((action) => (
              <DropdownMenuItem
                key={action.metadata.id}
                onClick={() => void handleAdd(action.metadata.id)}
              >
                <Zap className="h-3.5 w-3.5 mr-2" />
                {action.metadata.title}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {actions.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {actions.map((action) => (
              <Badge
                key={action.id}
                variant={
                  expandedActionId === action.id
                    ? "default"
                    : action.status === "error"
                      ? "destructive"
                      : "secondary"
                }
                className="text-[10px] cursor-pointer gap-1 pr-1"
                onClick={() =>
                  setExpandedActionId((prev) =>
                    prev === action.id ? null : action.id,
                  )
                }
              >
                {action.label}
                <button
                  type="button"
                  className="ml-0.5 rounded-sm hover:bg-background/50 p-0.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(action);
                  }}
                  title="Remove action"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))}
          </div>
          {expandedAction && (
            <div className="rounded-md border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium flex-1">
                  {expandedAction.label}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => selectAction(expandedAction, timeline)}
                >
                  Open
                </Button>
              </div>
              <ActionEditor
                timeline={timeline}
                action={expandedAction}
                showTargetLink={false}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Full action editor (inputs, run, output picker) used in ActionProps and optionally inline. */
export function ActionEditor({
  timeline,
  action,
  showTargetLink = true,
}: {
  timeline: Timeline;
  action: TimelineAction;
  showTargetLink?: boolean;
}) {
  const updateAction = useTimelineEditsStore((s) => s.updateAction);
  // Subscribe only to this action — avoids re-rendering the player host via full-store use.
  const storeAction = useTimelineEditsStore(
    (s) =>
      s.editedTimelines
        .get(timeline.id)
        ?.actions?.find((a) => a.id === action.id),
  );
  const editedPresets = useTimelineEditsStore(
    (s) => s.editedTimelines.get(timeline.id)?.presets,
  );
  const editedReferences = useTimelineEditsStore(
    (s) => s.editedTimelines.get(timeline.id)?.defaultData?.references,
  );
  const { selectPreset, selectReference } = useEditorStore();
  const [isRunning, setIsRunning] = useState(false);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUpdatingFromStoreRef = useRef(false);

  const current = storeAction || action;
  const presets = editedPresets || timeline.presets;
  const references =
    editedReferences || timeline.defaultData?.references || [];
  const definition = getActionDefinition(current.actionId);
  const availableTrackNames = collectTrackNamesFromPresets(presets);
  const baseData = createBaseDataFromReferences(references);

  const [localInputData, setLocalInputData] = useState<Record<string, unknown>>(
    () => current.inputData || {},
  );

  useEffect(() => {
    if (isUpdatingFromStoreRef.current) return;
    setLocalInputData(current.inputData || {});
  }, [current.id, current.inputData]);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const debouncedUpdateAction = useCallback(
    (next: Record<string, unknown>) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      debounceTimeoutRef.current = setTimeout(() => {
        isUpdatingFromStoreRef.current = true;
        updateAction(timeline.id, action.id, { inputData: next });
        setTimeout(() => {
          isUpdatingFromStoreRef.current = false;
        }, 100);
      }, 800);
    },
    [timeline.id, action.id, updateAction],
  );

  if (!definition) {
    return (
      <div className="text-sm text-destructive">
        Unknown action: {current.actionId}
      </div>
    );
  }

  const handleInputChange = (next: Record<string, unknown>) => {
    setLocalInputData(next);
    debouncedUpdateAction(next);
  };

  const handleRun = async () => {
    if (!confirmRerunAction(current)) return;
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
      updateAction(timeline.id, current.id, { inputData: localInputData });
    }
    setIsRunning(true);
    try {
      await executeAndApply(timeline.id, current.id);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleRemove = () => {
    const { proceed, deleteOutputs } = confirmRemoveAction(current.label);
    if (!proceed) return;
    removeTimelineAction(timeline.id, current.id, { deleteOutputs });
  };

  const handleSelectOutput = (outputId: string) => {
    const output = current.outputs.find((o) => o.id === outputId);
    if (!output) return;
    const refreshed =
      useTimelineEditsStore.getState().getEditedTimeline(timeline.id) ||
      timeline;
    const currentData = getTargetData(refreshed, current.target);
    const nextData = applyActionOutputToTargetData({
      definition,
      currentData,
      action: current,
      output,
    });
    writeTargetData(timeline.id, refreshed, current.target, nextData);
    updateAction(timeline.id, current.id, {
      selectedOutputId: outputId,
      outputs: current.outputs.map((o) => ({
        ...o,
        isFavorite: o.id === outputId,
      })),
    });
    if (current.target.type === "reference") {
      const latest =
        useTimelineEditsStore.getState().getEditedTimeline(timeline.id) ||
        refreshed;
      void useCompileStore.getState().generateOutput(latest);
    }
  };

  const goToTarget = () => {
    const refreshed =
      useTimelineEditsStore.getState().getEditedTimeline(timeline.id) ||
      timeline;
    const target = current.target;
    if (target.type === "preset") {
      const preset = refreshed.presets?.find(
        (p) => p.id === target.presetInstanceId,
      );
      if (preset) selectPreset(preset, refreshed);
      return;
    }
    const refs = refreshed.defaultData?.references || [];
    const index = refs.findIndex((r: any) => r.key === target.referenceKey);
    if (index >= 0) selectReference(refs[index], refreshed, index);
  };

  const targetLabel = (() => {
    const target = current.target;
    if (target.type === "preset") {
      return (
        presets?.find((p) => p.id === target.presetInstanceId)?.label ||
        target.presetInstanceId
      );
    }
    return target.referenceKey;
  })();

  return (
    <div className="space-y-4">
      {showTargetLink && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            Linked to {current.target.type}:{" "}
            <button
              type="button"
              className="underline hover:text-foreground"
              onClick={goToTarget}
            >
              {targetLabel}
            </button>
          </span>
          <div className="flex-1" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-destructive"
            onClick={handleRemove}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Remove
          </Button>
        </div>
      )}

      <SchemaForm
        title={definition.metadata.title}
        description={definition.metadata.description}
        schema={definition.inputSchema}
        value={localInputData}
        onChange={handleInputChange}
        availableTrackNames={availableTrackNames}
        baseData={baseData}
        showTabs={false}
        showResetButton={false}
        showReferencableAuto={false}
      />

      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => void handleRun()}
          disabled={isRunning || current.status === "running"}
        >
          {isRunning || current.status === "running" ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5 mr-1.5" />
          )}
          {current.lastRunAt ? "Run again" : "Run action"}
        </Button>
        {current.lastRunAt && (
          <span className="text-[10px] text-muted-foreground">
            Last run {new Date(current.lastRunAt).toLocaleString()}
          </span>
        )}
      </div>

      {current.error && (
        <p className="text-xs text-destructive">{current.error}</p>
      )}

      {current.outputs.length > 0 && (
        <div className="space-y-2 rounded-md border p-3">
          <div className="flex items-center gap-2">
            <Star className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium">Generated outputs</span>
          </div>
          <Select
            value={current.selectedOutputId || current.outputs[0]?.id}
            onValueChange={handleSelectOutput}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select output" />
            </SelectTrigger>
            <SelectContent>
              {current.outputs.map((output) => (
                <SelectItem key={output.id} value={output.id} className="text-xs">
                  {output.isFavorite ? "★ " : ""}
                  {output.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground">
            Switching applies that variant to the linked preset/reference.
          </p>
        </div>
      )}
    </div>
  );
}
