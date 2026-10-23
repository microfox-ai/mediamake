"use client";

import { useState } from "react";
import { PresetsSidebar } from "./presets-sidebar";
import { Preset, DatabasePreset } from "./types";
import { SidebarInset } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/site-header";
import { PresetEditorWithProvider } from "./preset-editor-with-provider";

export function PresetEditor() {
    const [selectedPresets, setSelectedPresets] = useState<(Preset | DatabasePreset)[]>([]);

    const handleSelectPreset = (preset: Preset | DatabasePreset | null) => {
        // Add the selected preset to the array (only if not null)
        if (preset) {
            setSelectedPresets(prev => [...prev, preset]);
        }
    };

    // Clear selectedPresets after they've been processed
    const handlePresetsProcessed = () => {
        setSelectedPresets([]);
    };

    return (
        <SidebarInset>
            <SiteHeader title="Presets (deprecated)" />
            <div className="flex flex-1 flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                        <div className="flex h-[calc(100vh-8rem)] w-full">
                            <PresetsSidebar
                                selectedPreset={null} // No longer needed for single selection
                                onSelectPreset={handleSelectPreset}
                            />
                            <PresetEditorWithProvider
                                selectedPresets={selectedPresets}
                                onPresetsProcessed={handlePresetsProcessed}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </SidebarInset>
    );
}
