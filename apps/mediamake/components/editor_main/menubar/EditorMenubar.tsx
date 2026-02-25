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
import { useProjectStore } from "../stores/project-store";
import { useLayerStateStore } from "../stores/layer-state-store";
import { useCompileStore } from "../stores/compile-store";
import { toast } from "sonner";

export function EditorMenubar() {
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newTimelineOpen, setNewTimelineOpen] = useState(false);
  const [loadProjectOpen, setLoadProjectOpen] = useState(false);
  const [loadTimelineOpen, setLoadTimelineOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingLayerState, setIsSavingLayerState] = useState(false);

  const {
    isDirty,
    canUndo,
    canRedo,
    undo,
    redo,
    saveToDatabase,
    editedTimelines
  } = useTimelineEditsStore();
  const { loadedTimeline, currentProjectId } = useProjectStore();
  const calculatedMetadata = useCompileStore((s) => s.calculatedMetadata);
  const getLayerStateSnapshot = useLayerStateStore((s) => s.getLayerStateSnapshot);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (loadedTimeline && isDirty) {
          handleSave();
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
  }, [loadedTimeline, isDirty, canUndo, canRedo, undo, redo]);

  const handleSave = async () => {
    if (!loadedTimeline) return;

    setIsSaving(true);
    try {
      await saveToDatabase(loadedTimeline.id);
      toast.success('Timeline saved successfully');
    } catch (error) {
      toast.error('Failed to save timeline');
      console.error(error);
    } finally {
      setIsSaving(false);
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
              onClick={handleSave}
              disabled={!loadedTimeline || !isDirty || isSaving}
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
        {isDirty && loadedTimeline && (
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
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
                  Save Changes
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
