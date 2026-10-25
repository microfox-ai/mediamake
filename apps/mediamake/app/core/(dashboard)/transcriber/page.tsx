"use client";

import { SiteHeader } from "@/components/site-header";
import { SidebarInset } from "@/components/ui/sidebar";
import { TranscriptionContent } from "@/components/transcriber/transcription-content";

export default function TranscriberPage() {
    return (
        <SidebarInset>
            <SiteHeader title="Transcriber" />
            <div className="flex flex-1 flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                        <div className="flex h-[calc(100vh-8rem)] w-full">
                            <TranscriptionContent />
                        </div>
                    </div>
                </div>
            </div>
        </SidebarInset>
    );
}
