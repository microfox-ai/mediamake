"use client";

import { useEditorStore } from "../../../stores/editor-store";
import { TimelineContent } from "./TimelineContent";
import { PresetContent } from "./PresetContent";

export function EditorContent() {
    const { selectedItem } = useEditorStore();

    if (!selectedItem) {
        return (
            <div className="flex-1 flex items-center justify-center p-4 text-sm text-muted-foreground">
                No item selected
            </div>
        );
    }

    if (selectedItem.type === 'timeline') {
        return <TimelineContent timeline={selectedItem.item} />;
    }

    return <PresetContent preset={selectedItem.item} timeline={selectedItem.timeline} />;
}
