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
import useQueryState from "@/hooks/use-query-state";
import { useSession } from "@/components/session-provider";

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
    const session = useSession();

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
    );
};