"use client";

import { HistoryContent } from "@/components/editor/history/history-content";
import { useSession } from "@/components/session-provider";
import { useRendersStore } from "../../../stores/renders-store";

/**
 * Right-panel details view for the Renders tab. Reuses the exact detail panel
 * from the render history pages (HistoryContent) so the editor and the
 * standalone render pages stay in sync. Selection + list mutations flow
 * through the renders store.
 */
export function RenderDetailsPanel() {
    const session = useSession();
    const selectedRenderId = useRendersStore((s) => s.selectedRenderId);
    const selectedRequest = useRendersStore((s) => s.selectedRequest);
    const applyUpdatedRequest = useRendersStore((s) => s.applyUpdatedRequest);
    const markDeleted = useRendersStore((s) => s.markDeleted);

    return (
        <div className="flex h-full flex-col min-h-0">
            <HistoryContent
                selectedRender={selectedRenderId}
                selectedRequest={selectedRequest}
                clientId={session?.clientId}
                onRefreshApiRequest={(_id, updated) => applyUpdatedRequest(updated)}
                onRenderDeleted={(id) => markDeleted(id)}
            />
        </div>
    );
}
