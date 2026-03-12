"use client";

import { SiteHeader } from "@/components/site-header";
import { SidebarInset } from "@/components/ui/sidebar";
import { HistorySidebar } from "@/components/editor/history/history-sidebar";
import { HistoryContent } from "@/components/editor/history/history-content";
import { useState } from "react";
import { RenderRequest } from "@/lib/render-history";

export default function VideoHistoryPage() {
  const [selectedRender, setSelectedRender] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RenderRequest | null>(null);
  const [deletedRenderId, setDeletedRenderId] = useState<string | null>(null);

  const handleRenderDeleted = (renderId: string) => {
    setSelectedRender(null);
    setSelectedRequest(null);
    setDeletedRenderId(renderId);
  };

  return (
    <SidebarInset>
      <SiteHeader title="Video Render History" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="flex h-[calc(100vh-8rem)]">
              <HistorySidebar
                renderType="video"
                selectedRender={selectedRender}
                deletedRenderId={deletedRenderId}
                onClearDeletedId={() => setDeletedRenderId(null)}
                onSelectRender={(renderId, renderRequest) => {
                  setSelectedRender(renderId);
                  setSelectedRequest(renderRequest || null);
                }}
                onRefreshApiRequest={(renderId, updatedRequest) => {
                  if (selectedRender === renderId) {
                    setSelectedRequest(updatedRequest);
                  }
                }}
              />
              <HistoryContent
                selectedRender={selectedRender}
                selectedRequest={selectedRequest}
                onRenderDeleted={handleRenderDeleted}
              />
            </div>
          </div>
        </div>
      </div>
    </SidebarInset>
  );
}

