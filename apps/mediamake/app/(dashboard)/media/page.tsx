"use client";

import { SiteHeader } from "@/components/site-header";
import {
    SidebarInset,
} from "@/components/ui/sidebar";
import { MediaPicker } from "@/components/editor/media/media-picker";
import { useState } from "react";
import { MediaFile } from "@/app/types/media";
import { MediaLibrarySidebar } from "@/components/media/media-library-sidebar";
import { MediaProvider } from "@/components/editor/media/media-context";

export default function MediaPage() {
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
    const [hashtagFilters, setHashtagFilters] = useState<string[]>([]);

    const handleTagSelection = (tagId: string | null) => {
        if (tagId) {
            setSelectedTag(tagId);
            setHashtagFilters([tagId]);
        } else {
            setSelectedTag(null);
            setHashtagFilters([]);
        }
        setSelectedFile(null);
    };

    const handleProjectSelection = (projectId: string | null) => {
        setSelectedProjectId(projectId);
        setSelectedFile(null);
    };

    const handleHashtagFiltersChange = (filters: string[]) => {
        setHashtagFilters(filters);
    };

    return (
        <SidebarInset>
            <SiteHeader title="Media Library" />
            <div className="flex flex-1 flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                    <div className="flex flex-col gap-4 md:gap-6 ">
                        <div className="flex h-[calc(100vh-8rem)]">
                            <MediaLibrarySidebar
                                selectedTag={selectedTag}
                                onSelectTag={handleTagSelection}
                                selectedProjectId={selectedProjectId}
                                onSelectProject={handleProjectSelection}
                                hashtagFilters={hashtagFilters}
                                onHashtagFiltersChange={handleHashtagFiltersChange}
                            />
                            <div className="flex-1 min-w-0">
                                <MediaPicker
                                    pickerMode={false}
                                    selectedTag={selectedTag}
                                    selectedProjectId={selectedProjectId}
                                    selectedFile={selectedFile}
                                    onSelectFile={(file) => setSelectedFile(file)}
                                    hashtagFilters={hashtagFilters}
                                    onHashtagFiltersChange={handleHashtagFiltersChange}
                                    showSidebar={false}
                                    onClearSelectedTag={() => handleTagSelection(null)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </SidebarInset>
    );
}
