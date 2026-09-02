"use client";

import { useEffect, useCallback } from "react";
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
import { useProjectEditsStore } from "./stores/project-edits-store";
import useQueryState from "@/hooks/use-query-state";
import { useSession } from "@/components/session-provider";
import { RenderProvider } from "@/components/editor/player/render-provider";

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
    const { setCurrentProjectId: setEditsProjectId } = useTimelineEditsStore();
    const { loadProject: loadProjectEdits, clear: clearProjectEdits } = useProjectEditsStore();
    const session = useSession();

    const loadCurrentProject = useCallback(async (id: string) => {
        try {
            const headers: Record<string, string> = {};
            if (session?.clientId) {
                headers['x-client-id'] = session.clientId;
            }
            const response = await fetch(`/api/project?id=${encodeURIComponent(id)}`, { headers });
            if (!response.ok) return;
            const project = await response.json();
            if (project?.id && project?.displayName && project?.updatedAt) {
                loadProjectEdits({
                    id: project.id,
                    displayName: project.displayName,
                    tags: project.tags,
                    updatedAt: project.updatedAt,
                });
            }
        } catch (error) {
            console.error('Error loading project metadata:', error);
        }
    }, [session?.clientId, loadProjectEdits]);

    // Load timelines when projectId changes
    useEffect(() => {
        if (projectId && projectId !== currentProjectId) {
            setCurrentProjectId(projectId);
            setEditsProjectId(projectId); // Sync edits store
            loadProjectTimelines(projectId, session?.clientId);
            loadCurrentProject(projectId);
        } else if (!projectId && currentProjectId) {
            setCurrentProjectId(null);
            setEditsProjectId(null); // Clear edits store
            clearProjectEdits();
        }
    }, [projectId, currentProjectId, loadProjectTimelines, setCurrentProjectId, setEditsProjectId, session?.clientId, loadCurrentProject, clearProjectEdits]);

    // Calculate top panel size based on timeline panel size
    const topPanelSize = 100 - timelinePanelSize;

    return (
        <RenderProvider>
            <div className="flex h-screen flex-col overflow-hidden">
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