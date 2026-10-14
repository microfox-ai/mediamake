"use client";

import { LayersIcon, FileText, Settings, ChevronDownIcon, AlignStartVertical, Film } from "lucide-react";
import { useEditorUIStore } from "../../../stores/editor-ui-store";
import { Button } from "@/components/ui/button";
import { MenubarItem, MenubarContent, MenubarMenu, MenubarTrigger, MenubarShortcut, MenubarSeparator } from "@/components/ui/menubar";
import { Menubar } from "@radix-ui/react-menubar";
import { IconTimeline } from "@tabler/icons-react";
import { TimelinesTree } from "./TimelinesTree";
import { LayersTree } from "./LayersTree";
import { RendersTree } from "./RendersTree";
import { cn } from "@/lib/utils";

export function EditFileTreeContent() {
    const { filePanelTab, setFilePanelTab } = useEditorUIStore();

    return (
        <div className="flex h-full flex-col">
            <div className="border-b px-1.5 py-1 flex items-center justify-between">
                <div className="flex items-center gap-0.5">
                    <Button
                        variant={filePanelTab === 'timelines' ? "secondary" : "ghost"}
                        size={"sm"}
                        onClick={() => setFilePanelTab('timelines')}
                        className={cn(
                            "h-7 px-2 text-sm",
                            filePanelTab === 'timelines' && "bg-accent text-accent-foreground"
                        )}
                    >
                        <AlignStartVertical className="h-3 w-3" />
                        Timelines
                    </Button>
                    <Button
                        variant={filePanelTab === 'layers' ? "secondary" : "ghost"}
                        size={"sm"}
                        onClick={() => setFilePanelTab('layers')}
                        className={cn(
                            "h-7 px-2 text-sm",
                            filePanelTab === 'layers' && "bg-accent text-accent-foreground"
                        )}
                    >
                        <LayersIcon className="h-3 w-3" />
                        Layers
                    </Button>
                    <Button
                        variant={filePanelTab === 'renders' ? "secondary" : "ghost"}
                        size={"sm"}
                        onClick={() => setFilePanelTab('renders')}
                        className={cn(
                            "h-7 px-2 text-sm",
                            filePanelTab === 'renders' && "bg-accent text-accent-foreground"
                        )}
                    >
                        <Film className="h-3 w-3" />
                        Renders
                    </Button>
                </div>
                <div className="flex items-center gap-1">
                    <Menubar className="rounded-none h-7">
                        <MenubarMenu>
                            <MenubarTrigger className="h-7 px-1.5 text-xs">
                                <ChevronDownIcon className="h-3 w-3" />
                            </MenubarTrigger>
                            <MenubarContent align="end">
                                <MenubarItem>
                                    <FileText className="mr-2 h-4 w-4" />
                                    New Project
                                    <MenubarShortcut>⌘N</MenubarShortcut>
                                </MenubarItem>
                                <MenubarSeparator />
                                <MenubarItem>
                                    <Settings className="mr-2 h-4 w-4" />
                                    Preferences
                                    <MenubarShortcut>⌘,</MenubarShortcut>
                                </MenubarItem>
                            </MenubarContent>
                        </MenubarMenu>
                    </Menubar>
                </div>
            </div>
            {filePanelTab === 'timelines' && <TimelinesTree />}
            {filePanelTab === 'layers' && <LayersTree />}
            {filePanelTab === 'renders' && <RendersTree />}
        </div>
    );
}
