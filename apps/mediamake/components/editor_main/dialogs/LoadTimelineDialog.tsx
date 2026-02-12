"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search } from "lucide-react";
import { useProjectStore } from "../stores/project-store";
import useQueryState from "@/hooks/use-query-state";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useSession } from "@/components/session-provider";

interface Timeline {
    id: string;
    displayName: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
}

interface LegacyTimeline {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
}

interface PaginationInfo {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface LoadTimelineDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}


export function LoadTimelineDialog({ open, onOpenChange }: LoadTimelineDialogProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [timelines, setTimelines] = useState<Timeline[]>([]);
    const [legacyTimelines, setLegacyTimelines] = useState<LegacyTimeline[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingLegacy, setIsLoadingLegacy] = useState(false);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState<PaginationInfo | null>(null);
    const [showLegacy, setShowLegacy] = useState(false);
    const [projectIdFromQuery] = useQueryState("id", "");
    const { setTimelines: setStoreTimelines, currentProjectId, loadProjectTimelines } = useProjectStore();
    const session = useSession();
    
    const projectId = projectIdFromQuery || currentProjectId;
    const clientId = session?.clientId;

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setPage(1); // Reset to first page on search
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Load timelines
    const loadTimelines = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: "20",
            });
            if (debouncedSearch.trim()) {
                params.append("search", debouncedSearch.trim());
            }
            // Don't include projectId - search/load all timelines for clientId

            const headers: Record<string, string> = {};
            if (clientId) {
                headers['x-client-id'] = clientId;
            }
            const response = await fetch(`/api/project/timeline?${params.toString()}`, {
                headers,
            });

            if (!response.ok) {
                throw new Error("Failed to load timelines");
            }

            const data = await response.json();
            // Check if response has pagination structure (search mode) or is array (projectId mode)
            if (data.timelines && Array.isArray(data.timelines)) {
                setTimelines(data.timelines);
                setPagination(data.pagination);
            } else if (Array.isArray(data)) {
                // Fallback for projectId query (returns array directly)
                setTimelines(data);
                setPagination(null);
            } else {
                setTimelines([]);
                setPagination(null);
            }
        } catch (error) {
            console.error("Error loading timelines:", error);
        } finally {
            setIsLoading(false);
        }
    }, [projectId, debouncedSearch, page, clientId]);

    // Load legacy timelines
    const loadLegacyTimelines = useCallback(async () => {
        setIsLoadingLegacy(true);
        try {
            const headers: Record<string, string> = {};
            if (clientId) {
                headers['x-client-id'] = clientId;
            }
            const response = await fetch("/api/preset-data", {
                headers,
            });

            if (!response.ok) {
                throw new Error("Failed to load legacy timelines");
            }

            const data = await response.json();
            setLegacyTimelines(data);
        } catch (error) {
            console.error("Error loading legacy timelines:", error);
        } finally {
            setIsLoadingLegacy(false);
        }
    }, [clientId]);

    useEffect(() => {
        if (open) {
            if (showLegacy) {
                loadLegacyTimelines();
            } else {
                loadTimelines();
            }
        }
    }, [open, showLegacy, loadTimelines, loadLegacyTimelines]);

    const handleLoadTimeline = async (timelineId: string) => {
        if (!projectId) {
            alert("Please create or load a project first");
            return;
        }

        setIsLoading(true);
        try {
            // Fetch full timeline
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (clientId) {
                headers['x-client-id'] = clientId;
            }
            const response = await fetch(`/api/project/timeline?id=${timelineId}`, {
                headers,
            });

            if (!response.ok) {
                throw new Error("Failed to load timeline");
            }

            const timeline = await response.json();

            // Create duplicate with new projectId
            const duplicate = {
                ...timeline,
                projectId: projectId,
                displayName: `${timeline.displayName} (Copy)`,
            };
            delete duplicate.id;

            const createHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
            if (clientId) {
                createHeaders['x-client-id'] = clientId;
            }
            const createResponse = await fetch("/api/project/timeline", {
                method: "POST",
                headers: createHeaders,
                body: JSON.stringify(duplicate),
            });

            if (!createResponse.ok) {
                throw new Error("Failed to duplicate timeline");
            }

            // Reload timelines
            await loadProjectTimelines(projectId, clientId);
            onOpenChange(false);
        } catch (error) {
            console.error("Error loading timeline:", error);
            alert("Failed to load timeline. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLoadLegacyTimeline = async (legacyId: string) => {
        if (!projectId) {
            alert("Please create or load a project first");
            return;
        }

        setIsLoading(true);
        try {
            // Import legacy timeline via backend endpoint
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (clientId) {
                headers['x-client-id'] = clientId;
            }
            const createResponse = await fetch("/api/project/timeline", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    projectId,
                    legacyId,
                }),
            });

            if (!createResponse.ok) {
                const errorData = await createResponse.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to import legacy timeline");
            }

            // Reload timelines
            await loadProjectTimelines(projectId, clientId);
            onOpenChange(false);
        } catch (error) {
            console.error("Error loading legacy timeline:", error);
            alert(error instanceof Error ? error.message : "Failed to load legacy timeline. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };


    const currentItems = showLegacy ? legacyTimelines : timelines;
    const isLoadingItems = showLegacy ? isLoadingLegacy : isLoading;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Load Timeline</DialogTitle>
                    <DialogDescription>
                        Search and load an existing timeline or import from legacy timelines.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search timelines..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                                disabled={showLegacy}
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="legacy"
                                checked={showLegacy}
                                onCheckedChange={(checked) => {
                                    setShowLegacy(checked === true);
                                    setSearchQuery("");
                                }}
                            />
                            <Label htmlFor="legacy" className="cursor-pointer text-sm">
                                Legacy Timelines
                            </Label>
                        </div>
                    </div>
                    <ScrollArea className="h-[400px]">
                        {isLoadingItems ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : currentItems.length === 0 ? (
                            <div className="py-8 text-center text-sm text-muted-foreground">
                                {showLegacy
                                    ? "No legacy timelines found."
                                    : "No timelines found. Create a new timeline to get started."}
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {currentItems.map((item) => (
                                    <Button
                                        key={item.id}
                                        variant="ghost"
                                        className="w-full justify-start text-left"
                                        onClick={() =>
                                            showLegacy
                                                ? handleLoadLegacyTimeline(item.id)
                                                : handleLoadTimeline(item.id)
                                        }
                                        disabled={isLoading}
                                    >
                                        <div className="flex flex-col items-start">
                                            <div className="font-medium">
                                                {showLegacy ? (item as LegacyTimeline).name : (item as Timeline).displayName}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {showLegacy
                                                    ? `Legacy • Updated ${new Date(item.updatedAt).toLocaleDateString()}`
                                                    : `Updated ${new Date(item.updatedAt).toLocaleDateString()}`}
                                            </div>
                                        </div>
                                    </Button>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                    {!showLegacy && pagination && pagination.totalPages > 1 && (
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1 || isLoading}
                                >
                                    Previous
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                                    disabled={page === pagination.totalPages || isLoading}
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
