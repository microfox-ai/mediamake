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
import { Badge } from "@/components/ui/badge";
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
  Layers,
  Upload,
  Users,
  UserPlus,
  RefreshCw,
} from "lucide-react";
import { NewProjectDialog } from "../dialogs/NewProjectDialog";
import { NewTimelineDialog } from "../dialogs/NewTimelineDialog";
import { LoadProjectDialog } from "../dialogs/LoadProjectDialog";
import { LoadTimelineDialog } from "../dialogs/LoadTimelineDialog";
import { ShareProjectDialog } from "../dialogs/ShareProjectDialog";
import { useTimelineEditsStore } from "../stores/timeline-edits-store";
import { useProjectEditsStore } from "../stores/project-edits-store";
import { useProjectStore } from "../stores/project-store";
import { getUnsyncedTimelineIds } from "../stores/timeline-sync";
import { useLayerStateStore } from "../stores/layer-state-store";
import { useHasUnpublishedChanges } from "../stores/layer-history-store";
import { useEditorUIStore } from "../stores/editor-ui-store";
import { useCompileStore } from "../stores/compile-store";
import { useSession } from "@/components/session-provider";
import { toast } from "sonner";

export function EditorMenubar() {
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newTimelineOpen, setNewTimelineOpen] = useState(false);
  const [loadProjectOpen, setLoadProjectOpen] = useState(false);
  const [loadTimelineOpen, setLoadTimelineOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingLayerState, setIsSavingLayerState] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [isSavingAllTimelines, setIsSavingAllTimelines] = useState(false);
  const [isSavingProject, setIsSavingProject] = useState(false);

  const {
    canUndo,
    canRedo,
    undo,
    redo,
    isDirty: storeIsDirty,
    history,
    historyIndex,
    publishTimeline,
    saveAllTimelinesToDatabase,
    editedTimelines,
  } = useTimelineEditsStore();
  // Recover mid-session when history has unpublished entries but isDirty was never flipped
  // (regression from the timeline-sync refactor).
  const isDirty =
    storeIsDirty ||
    (historyIndex >= 0 &&
      history.some((entry, index) => index <= historyIndex && !entry.published));
  const {
    saveToDatabase: saveProjectToDatabase,
    cloudProject,
    localEditUpdatedAt: projectLocalEditUpdatedAt,
  } = useProjectEditsStore();
  const {
    loadedTimeline,
    currentProjectId,
    currentProject,
    timelines,
  } = useProjectStore();
  const session = useSession();
  const calculatedMetadata = useCompileStore((s) => s.calculatedMetadata);
  const publishLayerState = useLayerStateStore((s) => s.publishLayerState);
  const revertToTeamBase = useLayerStateStore((s) => s.revertToTeamBase);
  const hasUnpublishedChanges = useHasUnpublishedChanges();

  // Derive viewer-mode flag — viewers cannot save/publish/edit
  const isViewer = currentProject != null && !currentProject.isOwned && currentProject.sharedRole === "viewer";

  const handleSyncWithTeam = async () => {
    if (!loadedTimeline || !currentProjectId) return;
    setIsSyncing(true);
    try {
      // Proactively clear any stale local WIP from localStorage before re-loading
      // so the canonical server state is applied cleanly.
      try {
        localStorage.removeItem(`wip-layer-state-${currentProjectId}-${loadedTimeline.id}`);
      } catch { /* ignore quota/security errors */ }

      await revertToTeamBase(currentProjectId, loadedTimeline.id);
      toast.success("Synced with team — showing latest published state");
    } catch {
      toast.error("Failed to sync with team");
    } finally {
      setIsSyncing(false);
    }
  };

  const cloudUpdatedAtByTimelineId = useTimelineEditsStore(
    (state) => state.cloudUpdatedAtByTimelineId
  );
  const localEditUpdatedAtByTimelineId = useTimelineEditsStore(
    (state) => state.localEditUpdatedAtByTimelineId
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

  // Heal persisted isDirty if history already has unpublished work from before the fix.
  useEffect(() => {
    const state = useTimelineEditsStore.getState();
    if (
      !state.isDirty &&
      state.historyIndex >= 0 &&
      state.history.some((entry, index) => index <= state.historyIndex && !entry.published)
    ) {
      useTimelineEditsStore.setState({ isDirty: true });
    }
  }, [history, historyIndex, storeIsDirty]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (loadedTimeline && isDirty && !isViewer) {
          handleSaveCurrentTimeline();
        }
      }
      // Timeline undo/redo only while the Timelines tab is active (the Layers
      // tab has its own undo handled in MainEditor).
      const onTimelinesTab =
        useEditorUIStore.getState().filePanelTab === "timelines";
      // Cmd/Ctrl + Z to undo
      if (onTimelinesTab && (e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) {
          undo();
          toast.success("Undone");
        }
      }
      // Cmd/Ctrl + Shift + Z to redo
      if (onTimelinesTab && (e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "Z") {
        e.preventDefault();
        if (canRedo()) {
          redo();
          toast.success("Redone");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [loadedTimeline, isDirty, isViewer, canUndo, canRedo, undo, redo]);

  const getTimelineName = (timelineId: string) => {
    const edited = editedTimelines.get(timelineId);
    return edited?.displayName?.trim() || timelineId;
  };

  const handleSaveCurrentTimeline = async () => {
    if (!loadedTimeline) return;
    if (isViewer) {
      toast.error("Viewers cannot save timeline changes");
      return;
    }

    const timelineName = getTimelineName(loadedTimeline.id);
    const savingMessage = `Saving timeline: ${timelineName}`;

    setIsSaving(true);
    toast.loading(savingMessage, { id: "save-timeline" });
    try {
      const result = await publishTimeline(loadedTimeline.id);
      if (result.ok) {
        toast.success(
          "merged" in result
            ? "Merged teammate's changes & published"
            : `Published timeline: ${timelineName}`,
          { id: "save-timeline", duration: 2000 },
        );
      } else if (result.reason === "nochange") {
        toast.info("Already up to date — nothing to publish", { id: "save-timeline", duration: 2000 });
      } else if (result.reason === "merge") {
        toast.info(`${result.conflicts} conflict(s) to resolve before publishing.`, { id: "save-timeline" });
      } else if (result.reason === "conflict") {
        toast.error("Publish conflict — please try again.", { id: "save-timeline", duration: 6000 });
      } else {
        toast.error(result.message ?? "Failed to publish timeline", { id: "save-timeline" });
      }
    } catch (error) {
      toast.error(`Failed to publish timeline: ${timelineName}`, { id: "save-timeline", duration: 2000 });
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
    if (isViewer) {
      toast.error("Viewers cannot publish layer state");
      return;
    }

    setIsSavingLayerState(true);
    try {
      const result = await publishLayerState(
        currentProjectId,
        loadedTimeline.id,
        calculatedMetadata?.props?.childrenData,
      );
      if (result.ok) {
        toast.success("merged" in result ? "Merged teammate's changes & published" : "Published to team");
      } else if (result.reason === "nochange") {
        toast.info("Already up to date — nothing to publish");
      } else if (result.reason === "merge") {
        toast.info(`${result.conflicts} layer conflict(s) to resolve before publishing.`);
      } else if (result.reason === "conflict") {
        toast.error("Publish conflict — please try again.", { duration: 6000 });
      } else {
        toast.error(result.message ?? "Failed to publish layer state");
      }
    } finally {
      setIsSavingLayerState(false);
    }
  };

  return (
    <>
      <Menubar className="h-8 rounded-none border-b border-x-0 border-t-0 px-2 flex items-center">
        {/* ── File ── */}
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
            <MenubarItem
              onClick={() => setNewTimelineOpen(true)}
              disabled={isViewer}
            >
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
              disabled={!loadedTimeline || !isDirty || isSaving || isViewer}
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
              disabled={
                !loadedTimeline ||
                !currentProjectId ||
                isSavingLayerState ||
                !hasUnpublishedChanges ||
                isViewer
              }
            >
              {isSavingLayerState ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Layers className="mr-2 h-4 w-4" />
              )}
              Publish layers to team
              {hasUnpublishedChanges && !isViewer && (
                <span className="ml-2 h-1.5 w-1.5 rounded-full bg-amber-400" />
              )}
            </MenubarItem>
            <MenubarSeparator />
            <MenubarItem>
              <Settings className="mr-2 h-4 w-4" />
              Preferences
              <MenubarShortcut>⌘,</MenubarShortcut>
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* ── Edit ── */}
        <MenubarMenu>
          <MenubarTrigger className="text-xs">Edit</MenubarTrigger>
          <MenubarContent>
            <MenubarItem
              onClick={() => undo() && toast.success("Undone")}
              disabled={!canUndo()}
            >
              <Undo className="mr-2 h-4 w-4" />
              Undo
              <MenubarShortcut>⌘Z</MenubarShortcut>
            </MenubarItem>
            <MenubarItem
              onClick={() => redo() && toast.success("Redone")}
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

        {/* ── Timeline ── */}
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

        {/* ── View ── */}
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

        {/* ── Share ── */}
        <MenubarMenu>
          <MenubarTrigger className="text-xs">Share</MenubarTrigger>
          <MenubarContent>
            <MenubarItem
              onClick={() => setShareOpen(true)}
              disabled={!currentProjectId}
            >
              <Users className="mr-2 h-4 w-4" />
              Manage Access
            </MenubarItem>
            {currentProject?.isOwned && (
              <MenubarItem
                onClick={() => setShareOpen(true)}
                disabled={!currentProjectId}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Member
              </MenubarItem>
            )}
            <MenubarSeparator />
            <MenubarItem
              onClick={handleSyncWithTeam}
              disabled={!loadedTimeline || !currentProjectId || isSyncing}
            >
              {isSyncing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Sync with Team
            </MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* ── Help ── */}
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
            <MenubarItem>About</MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* ── Right side: viewer badge + sync + save buttons ── */}
        <div className="ml-auto flex items-center gap-2">
          {isViewer && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs gap-1">
              <Eye className="h-2.5 w-2.5" />
              Viewer
            </Badge>
          )}

          {/* Sync button — always visible when a timeline is open; especially prominent for viewers */}
          {loadedTimeline && currentProjectId && (
            <Button
              variant={isViewer ? "outline" : "ghost"}
              size="sm"
              onClick={handleSyncWithTeam}
              disabled={isSyncing}
              className="h-5 px-1.5 text-xs gap-1"
              title="Pull the latest published state from the team"
            >
              {isSyncing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              {isViewer ? "Sync" : ""}
            </Button>
          )}

          {isDirty && loadedTimeline && !isViewer && (
            <Button
              variant="default"
              size="sm"
              onClick={handleSaveCurrentTimeline}
              disabled={isSaving}
              className="h-5 px-1 text-xs"
              title="Publish timeline changes to the team"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Upload className="mr-1 h-3 w-3" />
                  Publish Timeline
                </>
              )}
            </Button>
          )}

          {hasUnpublishedChanges && loadedTimeline && !isViewer && (
            <Button
              variant="default"
              size="sm"
              onClick={handleSaveLayerState}
              disabled={isSavingLayerState}
              className="h-5 px-1 text-xs"
              title="Publish layer changes to the team"
            >
              {isSavingLayerState ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Layers className="mr-1 h-3 w-3" />
                  Publish Layers
                </>
              )}
            </Button>
          )}
        </div>
      </Menubar>

      {/* ── Dialogs ── */}
      <NewProjectDialog open={newProjectOpen} onOpenChange={setNewProjectOpen} />
      <NewTimelineDialog open={newTimelineOpen} onOpenChange={setNewTimelineOpen} />
      <LoadProjectDialog open={loadProjectOpen} onOpenChange={setLoadProjectOpen} />
      <LoadTimelineDialog open={loadTimelineOpen} onOpenChange={setLoadTimelineOpen} />
      <ShareProjectDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        projectId={currentProjectId ?? ""}
        projectName={currentProject?.displayName ?? currentProjectId ?? "Project"}
      />
    </>
  );
}
