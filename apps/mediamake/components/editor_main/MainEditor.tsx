"use client";

import { useEffect } from "react";
import { EditorMenubar } from "./menubar/EditorMenubar";
import { LeftPanel } from "./panels/left/LeftPanel";
import { MiddlePanel } from "./panels/middle/MiddlePanel";
import { RightPanel } from "./panels/right/RightPanel";
import { BottomPanel } from "./panels/bottom/BottomPanel";
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
} from "@/components/ui/resizable";
import { useResizableGridStore } from "./stores/resizable-grid-store";
import { useProjectStore } from "./stores/project-store";
import { useTimelineEditsStore } from "./stores/timeline-edits-store";
import { useLayerStateStore } from "./stores/layer-state-store";
import { useLayerHistoryStore } from "./stores/layer-history-store";
import { useEditorUIStore } from "./stores/editor-ui-store";
import useQueryState from "@/hooks/use-query-state";
import { useSession } from "@/components/session-provider";
import { RenderProvider } from "@/components/editor/player/render-provider";
import { TimelineMergeDialog } from "./dialogs/TimelineMergeDialog";
import { LayerMergeDialog } from "./dialogs/LayerMergeDialog";

export const MainEditor = () => {
    const {
        leftPanelSize,
        centerPanelSize,
        rightPanelSize,
        timelinePanelSize,
        setLeftPanelSize,
        setCenterPanelSize,
        setRightPanelSize,
        setTimelinePanelSize,
    } = useResizableGridStore();

    const [projectId] = useQueryState("id", "");
    const { loadProjectTimelines, currentProjectId, setCurrentProjectId } = useProjectStore();
    const { setCurrentProjectId: setEditsProjectId, setClientId: setTimelineClientId } = useTimelineEditsStore();
    const session = useSession();
    const setHistoryClientId = useLayerHistoryStore((s) => s.setClientId);

    // Propagate clientId into both history stores so DB entries are attributed correctly
    useEffect(() => {
        if (session?.clientId) {
            setHistoryClientId(session.clientId);
            setTimelineClientId(session.clientId);
        }
    }, [session?.clientId, setHistoryClientId, setTimelineClientId]);

    // Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z — LAYER undo/redo, only while the Layers tab
    // is active (the Timelines tab has its own undo handled in the menubar).
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only drive layer undo when the Layers tab is the active left panel.
            if (useEditorUIStore.getState().filePanelTab !== "layers") return;
            // Ignore when typing in an input, textarea, or contenteditable
            const target = e.target as HTMLElement;
            if (
                target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable
            ) {
                return;
            }
            const isMod = e.ctrlKey || e.metaKey;
            if (!isMod) return;

            if (e.key === "z" && !e.shiftKey) {
                e.preventDefault();
                useLayerStateStore.getState().undoLayerChange();
            } else if (e.key === "y" || (e.key === "z" && e.shiftKey)) {
                e.preventDefault();
                useLayerStateStore.getState().redoLayerChange();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Load timelines when projectId changes
    useEffect(() => {
        if (projectId && projectId !== currentProjectId) {
            setCurrentProjectId(projectId);
            setEditsProjectId(projectId); // Sync edits store
            loadProjectTimelines(projectId, session?.clientId);
        } else if (!projectId && currentProjectId) {
            setCurrentProjectId(null);
            setEditsProjectId(null); // Clear edits store
        }
    }, [projectId, currentProjectId, loadProjectTimelines, setCurrentProjectId, setEditsProjectId, session?.clientId]);

    // Calculate top panel size based on timeline panel size
    const topPanelSize = 100 - timelinePanelSize;

    return (
        <RenderProvider initialSettings={{ projectId: projectId || undefined }}>
            <div className="flex h-screen flex-col overflow-hidden">
                {/* Conflict-resolution dialogs (open on a publish conflict) */}
                <TimelineMergeDialog />
                <LayerMergeDialog />

                {/* Fixed Menubar at the top */}
                <div className="fixed top-0 left-0 right-0 z-50">
                    <EditorMenubar />
                </div>

                {/* Main content area with resizable panels */}
                <div className="flex-1 pt-8">
                    <ResizablePanelGroup direction="vertical" className="h-full">
                        {/* Top section: Horizontal panels (FilterTree, Preview, Props) */}
                        <ResizablePanel defaultSize={topPanelSize} minSize={30} className="flex">
                            <ResizablePanelGroup direction="horizontal" className="h-full">
                                {/* FilterTree Panel - 25% */}
                                <ResizablePanel
                                    defaultSize={leftPanelSize}
                                    minSize={15}
                                    maxSize={40}
                                    onResize={(size) => {
                                        if (size !== undefined) {
                                            setLeftPanelSize(size);
                                        }
                                    }}
                                >
                                    <LeftPanel />
                                </ResizablePanel>

                                <ResizableHandle withHandle />

                                {/* Preview Panel - 50% */}
                                <ResizablePanel
                                    defaultSize={centerPanelSize}
                                    minSize={30}
                                    onResize={(size) => {
                                        if (size !== undefined) {
                                            setCenterPanelSize(size);
                                        }
                                    }}
                                >
                                    <MiddlePanel />
                                </ResizablePanel>

                                <ResizableHandle withHandle />

                                {/* Props Panel - 25% */}
                                <ResizablePanel
                                    defaultSize={rightPanelSize}
                                    minSize={15}
                                    maxSize={40}
                                    onResize={(size) => {
                                        if (size !== undefined) {
                                            setRightPanelSize(size);
                                        }
                                    }}
                                >
                                    <RightPanel />
                                </ResizablePanel>
                            </ResizablePanelGroup>
                        </ResizablePanel>

                        <ResizableHandle withHandle />

                        {/* Bottom section: Timeline Panel - Full width */}
                        <ResizablePanel
                            defaultSize={timelinePanelSize}
                            minSize={10}
                            maxSize={50}
                            onResize={(size) => {
                                if (size !== undefined) {
                                    setTimelinePanelSize(size);
                                }
                            }}
                        >
                            <BottomPanel />
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </div>
            </div>
        </RenderProvider>
    );
};