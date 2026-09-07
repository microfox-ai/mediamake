"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Search,
    X,
    Loader2,
    RefreshCw,
    FileVideo,
    Image as ImageIcon,
    Music,
    CheckCircle,
    XCircle,
    Clock,
    Play,
    Archive,
    Film,
    LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/components/session-provider";
import { useProjectStore } from "../../../stores/project-store";
import { useRendersStore } from "../../../stores/renders-store";
import { type RenderRequest } from "@/lib/render-history";

const RENDERS_PAGE_SIZE = 15;

type RenderTypeFilter = "any" | "video" | "still";

const TYPE_FILTERS: { value: RenderTypeFilter; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { value: "any", label: "All", icon: LayoutGrid },
    { value: "video", label: "Video", icon: FileVideo },
    { value: "still", label: "Image", icon: ImageIcon },
];

function getTypeIcon(renderType: RenderRequest["renderType"]) {
    switch (renderType) {
        case "still":
            return <ImageIcon className="h-4 w-4 text-purple-500" />;
        case "audio":
            return <Music className="h-4 w-4 text-amber-500" />;
        case "video":
        default:
            return <FileVideo className="h-4 w-4 text-blue-500" />;
    }
}

function getStatusIcon(status: RenderRequest["status"]) {
    switch (status) {
        case "completed":
            return <CheckCircle className="h-3.5 w-3.5 text-green-500" />;
        case "rendering":
            return <Play className="h-3.5 w-3.5 text-blue-500" />;
        case "failed":
            return <XCircle className="h-3.5 w-3.5 text-red-500" />;
        case "pending":
        default:
            return <Clock className="h-3.5 w-3.5 text-yellow-500" />;
    }
}

function formatDate(dateString?: string) {
    if (!dateString) return "";
    return new Date(dateString).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function RendersTree() {
    const session = useSession();
    const currentProjectId = useProjectStore((s) => s.currentProjectId);
    const currentProjectName = useProjectStore((s) => s.currentProject?.displayName);

    const selectedRenderId = useRendersStore((s) => s.selectedRenderId);
    const selectRender = useRendersStore((s) => s.selectRender);
    const lastUpdatedRequest = useRendersStore((s) => s.lastUpdatedRequest);
    const deletedRenderId = useRendersStore((s) => s.deletedRenderId);
    const clearDeleted = useRendersStore((s) => s.clearDeleted);

    const [items, setItems] = useState<RenderRequest[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [typeFilter, setTypeFilter] = useState<RenderTypeFilter>("any");
    const [scopeAll, setScopeAll] = useState(false);
    const [showArchived, setShowArchived] = useState(false);
    const [search, setSearch] = useState("");

    // Scope to the current project unless the user opts into "All projects".
    const effectiveProjectId = scopeAll ? undefined : currentProjectId ?? undefined;

    const buildParams = useCallback(
        (cursor?: string | null) => {
            const params = new URLSearchParams({ limit: String(RENDERS_PAGE_SIZE) });
            if (cursor) params.set("cursor", cursor);
            if (typeFilter !== "any") params.set("renderType", typeFilter);
            if (showArchived) params.set("archived", "true");
            if (effectiveProjectId) params.set("projectId", effectiveProjectId);
            return params;
        },
        [typeFilter, showArchived, effectiveProjectId],
    );

    const fetchFirstPage = useCallback(async () => {
        if (!session?.clientId) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/remotion/history?${buildParams()}`, {
                headers: { "x-client-id": session.clientId },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setItems(Array.isArray(data?.items) ? data.items : []);
            setNextCursor(data?.nextCursor ?? null);
            setHasMore(Boolean(data?.hasMore));
        } catch (e) {
            console.error("Failed to fetch renders:", e);
            setError(e instanceof Error ? e.message : "Failed to load renders");
            setItems([]);
            setNextCursor(null);
            setHasMore(false);
        } finally {
            setIsLoading(false);
        }
    }, [session?.clientId, buildParams]);

    const loadMore = useCallback(async () => {
        if (!session?.clientId || !nextCursor || isLoadingMore) return;
        setIsLoadingMore(true);
        try {
            const res = await fetch(`/api/remotion/history?${buildParams(nextCursor)}`, {
                headers: { "x-client-id": session.clientId },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const newItems = Array.isArray(data?.items) ? data.items : [];
            setItems((prev) => [...prev, ...newItems]);
            setNextCursor(data?.nextCursor ?? null);
            setHasMore(Boolean(data?.hasMore));
        } catch (e) {
            console.error("Failed to load more renders:", e);
        } finally {
            setIsLoadingMore(false);
        }
    }, [session?.clientId, nextCursor, isLoadingMore, buildParams]);

    useEffect(() => {
        void fetchFirstPage();
    }, [fetchFirstPage]);

    // Patch the list when the details panel refreshes a render (e.g. status change).
    useEffect(() => {
        if (!lastUpdatedRequest) return;
        setItems((prev) =>
            prev.map((r) => (r.id === lastUpdatedRequest.id ? lastUpdatedRequest : r)),
        );
    }, [lastUpdatedRequest]);

    // Remove a render from the list after it is deleted/archived in the details panel.
    useEffect(() => {
        if (!deletedRenderId) return;
        setItems((prev) => prev.filter((r) => r.id !== deletedRenderId));
        clearDeleted();
    }, [deletedRenderId, clearDeleted]);

    const filteredItems = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return items;
        return items.filter((i) => (i.fileName ?? "").toLowerCase().includes(q));
    }, [items, search]);

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Filters */}
            <div className="border-b p-2 space-y-2">
                {/* Type segmented control */}
                <div className="flex items-center gap-1">
                    {TYPE_FILTERS.map((f) => {
                        const Icon = f.icon;
                        const active = typeFilter === f.value;
                        return (
                            <Button
                                key={f.value}
                                type="button"
                                variant={active ? "secondary" : "ghost"}
                                size="sm"
                                onClick={() => setTypeFilter(f.value)}
                                className={cn(
                                    "h-7 flex-1 gap-1 px-2 text-xs",
                                    active && "bg-accent text-accent-foreground",
                                )}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {f.label}
                            </Button>
                        );
                    })}
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        title="Refresh"
                        onClick={fetchFirstPage}
                        disabled={isLoading}
                    >
                        <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                    </Button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Filter by filename..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-7 pl-7 pr-7 text-xs"
                    />
                    {search && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-0.5 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground"
                            onClick={() => setSearch("")}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    )}
                </div>

                {/* Scope + archived toggles */}
                <div className="flex items-center gap-1">
                    <Button
                        type="button"
                        variant={scopeAll ? "ghost" : "secondary"}
                        size="sm"
                        className={cn("h-7 flex-1 gap-1 px-2 text-xs", !scopeAll && "bg-accent text-accent-foreground")}
                        onClick={() => setScopeAll(false)}
                        disabled={!currentProjectId}
                        title={currentProjectName ? `Only ${currentProjectName}` : "This project"}
                    >
                        <Film className="h-3.5 w-3.5" />
                        This project
                    </Button>
                    <Button
                        type="button"
                        variant={scopeAll ? "secondary" : "ghost"}
                        size="sm"
                        className={cn("h-7 flex-1 gap-1 px-2 text-xs", scopeAll && "bg-accent text-accent-foreground")}
                        onClick={() => setScopeAll(true)}
                    >
                        <LayoutGrid className="h-3.5 w-3.5" />
                        All
                    </Button>
                    <Button
                        type="button"
                        variant={showArchived ? "secondary" : "ghost"}
                        size="icon"
                        className={cn("h-7 w-7 shrink-0", showArchived && "bg-accent text-accent-foreground")}
                        title={showArchived ? "Showing archived" : "Show archived"}
                        onClick={() => setShowArchived((v) => !v)}
                    >
                        <Archive className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            {/* List */}
            <ScrollArea className="flex-1 overflow-y-auto">
                <div className="p-1.5 space-y-1.5">
                    {isLoading && items.length === 0 ? (
                        [...Array(5)].map((_, i) => (
                            <div key={i} className="h-14 animate-pulse rounded-md bg-muted" />
                        ))
                    ) : error ? (
                        <div className="px-2 py-8 text-center text-xs text-destructive">
                            {error}
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="px-2 py-10 text-center text-muted-foreground">
                            <Film className="mx-auto mb-2 h-8 w-8 opacity-40" />
                            <p className="text-sm">No renders found</p>
                            <p className="text-xs">
                                {showArchived
                                    ? "No archived renders here."
                                    : "Renders for this project will appear here."}
                            </p>
                        </div>
                    ) : (
                        filteredItems.map((r) => {
                            const active = selectedRenderId === r.id;
                            const isImage = r.renderType === "still";
                            return (
                                <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => selectRender(r.id, r)}
                                    className={cn(
                                        "flex w-full items-center gap-2 rounded-md border p-1.5 text-left transition-colors hover:bg-muted/60",
                                        active
                                            ? "border-primary bg-muted/50 ring-1 ring-primary"
                                            : "border-transparent",
                                    )}
                                >
                                    {/* Thumbnail / type icon */}
                                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                                        {isImage && r.status === "completed" && r.downloadUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={r.downloadUrl}
                                                alt={r.fileName}
                                                className="h-full w-full object-cover"
                                                loading="lazy"
                                            />
                                        ) : (
                                            getTypeIcon(r.renderType)
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1">
                                            <span className="truncate text-xs font-medium" title={r.fileName}>
                                                {r.fileName || "Untitled render"}
                                            </span>
                                        </div>
                                        <div className="mt-0.5 flex items-center gap-1.5">
                                            {getStatusIcon(r.status)}
                                            <span className="text-[10px] text-muted-foreground">
                                                {formatDate(r.createdAt)}
                                            </span>
                                            {r.status === "rendering" && r.progress !== undefined && (
                                                <span className="text-[10px] text-blue-500">
                                                    {Math.round(r.progress * 100)}%
                                                </span>
                                            )}
                                            {r.renderSource === "browser" && (
                                                <Badge variant="outline" className="h-4 px-1 text-[9px]">
                                                    Browser
                                                </Badge>
                                            )}
                                            {r.isArchived && (
                                                <Archive className="h-3 w-3 text-muted-foreground" />
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })
                    )}

                    {hasMore && filteredItems.length > 0 && (
                        <div className="flex justify-center pt-1 pb-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-xs"
                                onClick={loadMore}
                                disabled={isLoadingMore}
                            >
                                {isLoadingMore ? (
                                    <>
                                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                        Loading...
                                    </>
                                ) : (
                                    "Load more"
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
