"use client";

import { LayersIcon, FileText, Settings, ChevronDownIcon, AlignStartVertical } from "lucide-react";
import { useEditorUIStore } from "../../../stores/editor-ui-store";
import { Button } from "@/components/ui/button";
import { MenubarItem, MenubarContent, MenubarMenu, MenubarTrigger, MenubarShortcut, MenubarSeparator } from "@/components/ui/menubar";
import { Menubar } from "@radix-ui/react-menubar";
import { IconTimeline } from "@tabler/icons-react";
import { TimelinesTree } from "./TimelinesTree";
import { LayersTree } from "./LayersTree";
import { cn } from "@/lib/utils";

export function EditFileTreeContent() {
    const { filePanelTab, setFilePanelTab } = useEditorUIStore();

    return (
        <div className="flex h-full flex-col">
            <div className="border-b px-2 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button
                        variant={filePanelTab === 'timelines' ? "secondary" : "ghost"}
                        size={"sm"}
                        onClick={() => setFilePanelTab('timelines')}
                        className={cn(
                            "text-xs",
                            filePanelTab === 'timelines' && "bg-accent text-accent-foreground"
                        )}
                    >
                        <AlignStartVertical className="h-4 w-4" />
                        Timelines
                    </Button>
                    <Button
                        variant={filePanelTab === 'layers' ? "secondary" : "ghost"}
                        size={"sm"}
                        onClick={() => setFilePanelTab('layers')}
                        className={cn(
                            "text-xs",
                            filePanelTab === 'layers' && "bg-accent text-accent-foreground"
                        )}
                    >
                        <LayersIcon className="h-4 w-4" />
                        Layers
                    </Button>
                </div>
                <div className="flex items-center gap-2">
                    <Menubar className="rounded-none">
                        <MenubarMenu>
                            <MenubarTrigger className="text-xs">
                                <ChevronDownIcon className="h-4 w-4" />
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
            {filePanelTab === 'timelines' ? <TimelinesTree /> : <LayersTree />}
        </div>
    );
}
