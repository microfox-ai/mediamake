"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { Button } from "@/components/ui/button";
import {
  FileText,
  FolderOpen,
  Save,
  Settings,
  Undo,
  Redo,
  Copy,
  ClipboardPaste,
  ClipboardEdit,
  Play,
  Pause,
  Eye,
  Grid,
  HelpCircle,
  Plus,
  Download,
  Loader2,
  CheckIcon,
  Layers,
} from "lucide-react";
import { NewProjectDialog } from "../dialogs/NewProjectDialog";
import { NewTimelineDialog } from "../dialogs/NewTimelineDialog";
import { LoadProjectDialog } from "../dialogs/LoadProjectDialog";
import { LoadTimelineDialog } from "../dialogs/LoadTimelineDialog";
import { useTimelineEditsStore } from "../stores/timeline-edits-store";
import { useProjectEditsStore } from "../stores/project-edits-store";
import { useProjectStore } from "../stores/project-store";
import { getUnsyncedTimelineIds, isTimelineUnsyncedWithCloud } from "../stores/timeline-sync";
import { useLayerStateStore } from "../stores/layer-state-store";
import { useCompileStore } from "../stores/compile-store";
import { useSession } from "@/components/session-provider";
import { toast } from "sonner";

export function EditorMenubar() {
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newTimelineOpen, setNewTimelineOpen] = useState(false);
  const [loadProjectOpen, setLoadProjectOpen] = useState(false);
  const [loadTimelineOpen, setLoadTimelineOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingLayerState, setIsSavingLayerState] = useState(false);

  const [isSavingAllTimelines, setIsSavingAllTimelines] = useState(false);
  const [isSavingProject, setIsSavingProject] = useState(false);

  const {
    canUndo,
    canRedo,
    undo,
    redo,
    saveToDatabase,
    saveAllTimelinesToDatabase,
    editedTimelines,
  } = useTimelineEditsStore();
  const {
    saveToDatabase: saveProjectToDatabase,
    cloudProject,
    localEditUpdatedAt: projectLocalEditUpdatedAt,
  } = useProjectEditsStore();
  const { loadedTimeline, currentProjectId, timelines } = useProjectStore();
  const session = useSession();
  const calculatedMetadata = useCompileStore((s) => s.calculatedMetadata);
  const getLayerStateSnapshot = useLayerStateStore((s) => s.getLayerStateSnapshot);

  const cloudUpdatedAtByTimelineId = useTimelineEditsStore(
    (state) => state.cloudUpdatedAtByTimelineId
  );
  const localEditUpdatedAtByTimelineId = useTimelineEditsStore(
    (state) => state.localEditUpdatedAtByTimelineId
  );

  const currentTimelineUnsynced = useMemo(
    () =>
      loadedTimeline
        ? isTimelineUnsyncedWithCloud(
            loadedTimeline.id,
            cloudUpdatedAtByTimelineId,
            localEditUpdatedAtByTimelineId,
            loadedTimeline.updatedAt
          )
        : false,
    [loadedTimeline, cloudUpdatedAtByTimelineId, localEditUpdatedAtByTimelineId]
  );

  const unsyncedTimelineIds = useMemo(
    () =>
      getUnsyncedTimelineIds(
        timelines,
        cloudUpdatedAtByTimelineId,
        localEditUpdatedAtByTimelineId
      ),
    [timelines, cloudUpdatedAtByTimelineId, localEditUpdatedAtByTimelineId]
  );
  const hasProjectChanges = Boolean(
    projectLocalEditUpdatedAt &&
      cloudProject &&
      Date.parse(projectLocalEditUpdatedAt) > Date.parse(cloudProject.updatedAt)
  );
  const unsyncedTimelineCount = unsyncedTimelineIds.length;
  const hasAnyUnsyncedTimelines = unsyncedTimelineCount > 0;

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (loadedTimeline && currentTimelineUnsynced) {
          handleSaveCurrentTimeline();
        }
      }
      // Cmd/Ctrl + Z to undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) {
          undo();
          toast.success('Undone');
        }
      }
      // Cmd/Ctrl + Shift + Z to redo
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'Z') {
        e.preventDefault();
        if (canRedo()) {
          redo();
          toast.success('Redone');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loadedTimeline, currentTimelineUnsynced, canUndo, canRedo, undo, redo]);

  const getTimelineName = (timelineId: string) => {
    const edited = editedTimelines.get(timelineId);
    return edited?.displayName?.trim() || timelineId;
  };

  const handleSaveCurrentTimeline = async () => {
    if (!loadedTimeline) return;

    const timelineName = getTimelineName(loadedTimeline.id);
    const savingMessage = `Saving timeline: ${timelineName}`;

    setIsSaving(true);
    toast.loading(savingMessage, { id: "save-timeline" });
    try {
      await saveToDatabase(loadedTimeline.id);
      toast.success(`Saved timeline: ${timelineName}`, { id: "save-timeline", duration: 2000 });
    } catch (error) {
      toast.error(`Failed to save timeline: ${timelineName}`, { id: "save-timeline", duration: 2000 });
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAllTimelines = async () => {
    const unsyncedIds = unsyncedTimelineIds;
    if (unsyncedIds.length === 0) {
      toast.info("No timeline changes to save");
      return;
    }

    const timelineNames = unsyncedIds.map(getTimelineName);
    const savingMessage =
      timelineNames.length === 1
        ? `Saving timeline: ${timelineNames[0]}`
        : `Saving ${timelineNames.length} timelines: ${timelineNames.join(", ")}`;

    setIsSavingAllTimelines(true);
    toast.loading(savingMessage, { id: "save-all-timelines" });
    try {
      const savedNames = await saveAllTimelinesToDatabase();
      toast.success(
        savedNames.length === 1
          ? `Saved timeline: ${savedNames[0]}`
          : `Saved ${savedNames.length} timelines: ${savedNames.join(", ")}`,
        { id: "save-all-timelines", duration: 3000 }
      );
    } catch (error) {
      toast.error("Failed to save timelines", { id: "save-all-timelines", duration: 3000 });
      console.error(error);
    } finally {
      setIsSavingAllTimelines(false);
    }
  };

  const handleSaveProject = async () => {
    if (!currentProjectId || !cloudProject) {
      toast.info("No project loaded");
      return;
    }
    if (!hasProjectChanges) {
      toast.info("No project changes to save");
      return;
    }

    const projectName = cloudProject.displayName?.trim() || currentProjectId;
    setIsSavingProject(true);
    toast.loading(`Saving project: ${projectName}`, { id: "save-project" });
    try {
      await saveProjectToDatabase(session?.clientId);
      toast.success(`Saved project: ${projectName}`, { id: "save-project", duration: 2000 });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save project",
        { id: "save-project", duration: 2000 }
      );
      console.error(error);
    } finally {
      setIsSavingProject(false);
    }
  };

  const handleSaveLayerState = async () => {
    if (!loadedTimeline || !currentProjectId) return;

    setIsSavingLayerState(true);
    try {
      const snapshot = getLayerStateSnapshot(calculatedMetadata?.props?.childrenData);
      const res = await fetch("/api/project/timeline/layer-state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: currentProjectId,
          timelineId: loadedTimeline.id,
          ...snapshot,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save layer state");
      }
      toast.success("Layer state saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save layer state");
      console.error(error);
    } finally {
      setIsSavingLayerState(false);
    }
  };

  return (
    <>
      <Menubar className="h-8 rounded-none border-b border-x-0 border-t-0 px-2 flex items-center">
        <MenubarMenu>
          <MenubarTrigger className="text-xs">File</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={() => setNewProjectOpen(true)}>
              <FileText className="mr-2 h-4 w-4" />
              New Project
              <MenubarShortcut>⌘N</MenubarShortcut>
            </MenubarItem>
            <MenubarItem onClick={() => setLoadProjectOpen(true)}>
              <FolderOpen className="mr-2 h-4 w-4" />
              Load Project
              <MenubarShortcut>⌘O</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem onClick={() => setNewTimelineOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Timeline
            </MenubarItem>
            <MenubarItem onClick={() => setLoadTimelineOpen(true)}>
              <Download className="mr-2 h-4 w-4" />
              Load Timeline
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem
              onClick={handleSaveCurrentTimeline}
              disabled={!loadedTimeline || !currentTimelineUnsynced || isSaving}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Current Timeline
              <MenubarShortcut>⌘S</MenubarShortcut>
            </MenubarItem>
            <MenubarItem
              onClick={handleSaveAllTimelines}
              disabled={!hasAnyUnsyncedTimelines || isSavingAllTimelines}
            >
              {isSavingAllTimelines ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save All Timelines
              {unsyncedTimelineCount > 0 ? ` (${unsyncedTimelineCount})` : ""}
            </MenubarItem>
            <MenubarItem
              onClick={handleSaveProject}
              disabled={!currentProjectId || !hasProjectChanges || isSavingProject}
            >
              {isSavingProject ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Project
            </MenubarItem>
            <MenubarItem
              onClick={handleSaveLayerState}
              disabled={!loadedTimeline || !currentProjectId || isSavingLayerState}
            >
              {isSavingLayerState ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Layers className="mr-2 h-4 w-4" />
              )}
              Save layer state
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>
              <Settings className="mr-2 h-4 w-4" />
              Preferences
              <MenubarShortcut>⌘,</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger className="text-xs">Edit</MenubarTrigger>
          <MenubarContent>
            <MenubarItem
              onClick={() => undo() && toast.success('Undone')}
              disabled={!canUndo()}
            >
              <Undo className="mr-2 h-4 w-4" />
              Undo
              <MenubarShortcut>⌘Z</MenubarShortcut>
            </MenubarItem>
            <MenubarItem
              onClick={() => redo() && toast.success('Redone')}
              disabled={!canRedo()}
            >
              <Redo className="mr-2 h-4 w-4" />
              Redo
              <MenubarShortcut>⇧⌘Z</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>
              <ClipboardEdit className="mr-2 h-4 w-4" />
              Cut
              <MenubarShortcut>⌘X</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              <Copy className="mr-2 h-4 w-4" />
              Copy
              <MenubarShortcut>⌘C</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              <ClipboardPaste className="mr-2 h-4 w-4" />
              Paste
              <MenubarShortcut>⌘V</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger className="text-xs">Timeline</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              <Play className="mr-2 h-4 w-4" />
              Play
              <MenubarShortcut>Space</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              <Pause className="mr-2 h-4 w-4" />
              Pause
              <MenubarShortcut>Space</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>
              Go to Start
              <MenubarShortcut>Home</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              Go to End
              <MenubarShortcut>End</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger className="text-xs">View</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              <Eye className="mr-2 h-4 w-4" />
              Show Grid
              <MenubarShortcut>⌘G</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              <Grid className="mr-2 h-4 w-4" />
              Toggle Panels
              <MenubarShortcut>⌘B</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>
              Zoom In
              <MenubarShortcut>⌘+</MenubarShortcut>
            </MenubarItem>
            <MenubarItem>
              Zoom Out
              <MenubarShortcut>⌘-</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        <MenubarMenu>
          <MenubarTrigger className="text-xs">Help</MenubarTrigger>
          <MenubarContent>
            <MenubarItem>
              <HelpCircle className="mr-2 h-4 w-4" />
              Documentation
            </MenubarItem>
            <MenubarItem>
              Keyboard Shortcuts
              <MenubarShortcut>⌘?</MenubarShortcut>
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>
              About
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* Save Button - shown when there are unsaved changes */}
        {currentTimelineUnsynced && loadedTimeline && (
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleSaveCurrentTimeline}
              disabled={isSaving}
              className="h-5 px-1 text-xs"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckIcon className="mr-1 h-3 w-3" />
                  Save Current Timeline
                </>
              )}
            </Button>
          </div>
        )}
      </Menubar>
      <NewProjectDialog open={newProjectOpen} onOpenChange={setNewProjectOpen} />
      <NewTimelineDialog open={newTimelineOpen} onOpenChange={setNewTimelineOpen} />
      <LoadProjectDialog open={loadProjectOpen} onOpenChange={setLoadProjectOpen} />
      <LoadTimelineDialog open={loadTimelineOpen} onOpenChange={setLoadTimelineOpen} />
    </>
  );
}
