"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import {
    SidebarInset,
} from "@/components/ui/sidebar";
import { MidjourneyTable } from "@/components/editor/midjourney/midjourney-table";
import { MidjourneyDialog } from "@/components/editor/midjourney/midjourney-dialog";
import { useState } from "react";
import { MidjourneyPromptRecord } from "@/app/ai/agents/midjourney/helpers";

export default function MidjourneyPage() {
    const [selectedRecord, setSelectedRecord] = useState<string | null>(null);
    const [selectedRecordData, setSelectedRecordData] = useState<MidjourneyPromptRecord | null>(null);

    return (
        <SidebarInset>
            <SiteHeader title="Midjourney Prompts" />
            <div className="flex flex-1 flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                        <MidjourneyTable
                            selectedRecord={selectedRecord}
                            onSelectRecord={(recordId, recordData) => {
                                setSelectedRecord(recordId);
                                setSelectedRecordData(recordData || null);
                            }}
                        />
                    </div>
                </div>
            </div>
            <MidjourneyDialog
                recordId={selectedRecord}
                recordData={selectedRecordData}
                onClose={() => {
                    setSelectedRecord(null);
                    setSelectedRecordData(null);
                }}
            />
        </SidebarInset>
    );
}
