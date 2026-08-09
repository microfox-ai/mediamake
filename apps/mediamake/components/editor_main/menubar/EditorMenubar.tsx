"use client";

import { useState, useEffect } from "react";
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
  CheckIcon,
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
import { useProjectStore } from "../stores/project-store";
import { useLayerStateStore } from "../stores/layer-state-store";
import { useHasUnpublishedChanges } from "../stores/layer-history-store";
import { useEditorUIStore } from "../stores/editor-ui-store";
import { useCompileStore } from "../stores/compile-store";
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

  const {
    isDirty,
    canUndo,
    canRedo,
    undo,
    redo,
    publishTimeline,
    editedTimelines,
  } = useTimelineEditsStore();
  const { loadedTimeline, currentProjectId, currentProject } = useProjectStore();
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

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (loadedTimeline && isDirty && !isViewer) {
          handleSave();
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

  const handleSave = async () => {
    if (!loadedTimeline) return;
    if (isViewer) {
      toast.error("Viewers cannot save timeline changes");
      return;
    }

    setIsSaving(true);
    try {
      const result = await publishTimeline(loadedTimeline.id);
      if (result.ok) {
        toast.success("merged" in result ? "Merged teammate's changes & published" : "Timeline published to team");
      } else if (result.reason === "nochange") {
        toast.info("Already up to date — nothing to publish");
      } else if (result.reason === "merge") {
        toast.info(`${result.conflicts} conflict(s) to resolve before publishing.`);
      } else if (result.reason === "conflict") {
        toast.error("Publish conflict — please try again.", { duration: 6000 });
      } else {
        toast.error(result.message ?? "Failed to publish timeline");
      }
    } finally {
      setIsSaving(false);
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
              onClick={handleSave}
              disabled={!loadedTimeline || !isDirty || isSaving || isViewer}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save
              <MenubarShortcut>⌘S</MenubarShortcut>
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
              onClick={handleSave}
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
