"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Folder, File } from "lucide-react";

export function LayersTree() {
    return (
        <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                    <Folder className="h-4 w-4 text-muted-foreground" />
                    <span>Layers</span>
                </div>
                <div className="ml-6 space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <File className="h-3 w-3" />
                        <span>Layer 1</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <File className="h-3 w-3" />
                        <span>Layer 2</span>
                    </div>
                </div>
            </div>
        </ScrollArea>
    );
}
