"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagMultiSelect } from "@/components/ui/tag-multi-select";
import {
    Clock,
    CheckCircle,
    XCircle,
    Download,
    AlertCircle,
    Play,
    Key,
    RefreshCw,
    Archive
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { type RenderRequest } from "@/lib/render-history";
import useLocalState from "@/components/studio/context/hooks/useLocalState";
import { toast } from "sonner";
import { useSession } from "@/components/session-provider";

interface HistorySidebarProps {
    selectedRender: string | null;
    deletedRenderId?: string | null;
    onClearDeletedId?: () => void;
    onSelectRender: (renderId: string, renderRequest?: RenderRequest) => void;
    onRefreshApiRequest?: (renderId: string, updatedRequest: RenderRequest) => void;
    /** Server-side filtering for this list. */
    renderType?: 'any' | 'video' | 'audio' | 'still';
}

const HISTORY_PAGE_SIZE = 5;

export function HistorySidebar({
  selectedRender,
  deletedRenderId,
  onClearDeletedId,
  onSelectRender,
  onRefreshApiRequest,
  renderType = 'any',
}: HistorySidebarProps) {
    const [renderRequests, setRenderRequests] = useState<RenderRequest[]>([]);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [apiKey, setApiKey] = useLocalState("apiKey", process.env.NEXT_PUBLIC_DEV_API_KEY ?? "");
    const [isApiLoading, setIsApiLoading] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());
    const [showArchived, setShowArchived] = useState(false);
    const session = useSession();
    const [projects, setProjects] = useState<{ id: string; displayName: string }[]>([]);
    const [projectsLoading, setProjectsLoading] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('any');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    useEffect(() => {
      const loadProjects = async () => {
        if (!session?.clientId) return;
        setProjectsLoading(true);
        try {
          const res = await fetch('/api/project', {
            headers: { 'x-client-id': session.clientId },
          });
          const data = res.ok ? await res.json() : [];
          setProjects(Array.isArray(data) ? data : []);
        } catch {
          setProjects([]);
        } finally {
          setProjectsLoading(false);
        }
      };
      void loadProjects();
    }, [session?.clientId]);

    // Fetch first page of render history (active or archived)
    const fetchApiHistory = async (key: string, archived = false) => {
        setIsApiLoading(true);
        setApiError(null);
        try {
            const params = new URLSearchParams({ limit: String(HISTORY_PAGE_SIZE) });
            if (archived) params.set('archived', 'true');
            if (renderType !== 'any') params.set('renderType', renderType);
            if (selectedProjectId !== 'any') params.set('projectId', selectedProjectId);
            if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));
            const url = `/api/remotion/history?${params}`;
            const response = await fetch(url, {
                headers: {
                  "Authorization": `Bearer ${key}`,
                  ...(session?.clientId ? { "x-client-id": session.clientId } : {}),
                },
            });
            if (!response.ok) throw new Error(`API request failed: ${response.status}`);
            const data = await response.json();
            setRenderRequests(data.items ?? []);
            setNextCursor(data.nextCursor ?? null);
            setHasMore(data.hasMore ?? false);
        } catch (error) {
            console.error('Failed to fetch API history:', error);
            setApiError(error instanceof Error ? error.message : 'Failed to fetch history');
        } finally {
            setIsApiLoading(false);
        }
    };

    // Load next page and append
    const loadMore = async () => {
        if (!apiKey.trim() || !nextCursor || isLoadingMore) return;
        setIsLoadingMore(true);
        setApiError(null);
        try {
            const params = new URLSearchParams({
                limit: String(HISTORY_PAGE_SIZE),
                cursor: nextCursor,
            });
            if (showArchived) params.set('archived', 'true');
            if (renderType !== 'any') params.set('renderType', renderType);
            if (selectedProjectId !== 'any') params.set('projectId', selectedProjectId);
            if (selectedTags.length > 0) params.set('tags', selectedTags.join(','));
            const response = await fetch(`/api/remotion/history?${params}`, {
                headers: {
                  "Authorization": `Bearer ${apiKey}`,
                  ...(session?.clientId ? { "x-client-id": session.clientId } : {}),
                },
            });
            if (!response.ok) throw new Error(`API request failed: ${response.status}`);
            const data = await response.json();
            const newItems = data.items ?? [];
            setRenderRequests(prev => [...prev, ...newItems]);
            setNextCursor(data.nextCursor ?? null);
            setHasMore(data.hasMore ?? false);
        } catch (error) {
            console.error('Failed to load more history:', error);
            setApiError(error instanceof Error ? error.message : 'Failed to load more');
        } finally {
            setIsLoadingMore(false);
        }
    };

    // Refresh a single render (fetch by id). Use includeArchived when the item is archived.
    const refreshApiRequest = async (renderId: string, isArchived?: boolean): Promise<RenderRequest | null> => {
        if (!apiKey.trim()) return null;
        setRefreshingIds(prev => new Set(prev).add(renderId));
        try {
            const params = new URLSearchParams({ renderId });
            if (isArchived) params.set('includeArchived', 'true');
            const response = await fetch(`/api/remotion/history?${params}`, {
                headers: {
                  "Authorization": `Bearer ${apiKey}`,
                  ...(session?.clientId ? { "x-client-id": session.clientId } : {}),
                },
            });
            if (!response.ok) throw new Error(`API request failed: ${response.status}`);
            const data = await response.json();
            const updatedRequest = (data.items && data.items[0]) as RenderRequest | undefined;
            if (updatedRequest && updatedRequest.id === renderId) {
                setRenderRequests(prev =>
                    prev.map(req => req.id === renderId ? updatedRequest : req)
                );
                if (onRefreshApiRequest) onRefreshApiRequest(renderId, updatedRequest);
                return updatedRequest;
            }
            return null;
        } catch (error) {
            console.error('Failed to refresh API request:', error);
            return null;
        } finally {
            setRefreshingIds(prev => {
                const next = new Set(prev);
                next.delete(renderId);
                return next;
            });
        }
    };

    // Load render history from API (refetch when switching active/archived)
    useEffect(() => {
        if (apiKey.trim().length > 0) {
            fetchApiHistory(apiKey, showArchived);
        } else {
            toast.error("Please enter an API key");
            setIsLoading(false);
        }
    }, [apiKey, showArchived, renderType, selectedProjectId, selectedTags, session?.clientId]);

    // Remove deleted render from list when parent signals it
    useEffect(() => {
        if (!deletedRenderId) return;
        setRenderRequests((prev) => prev.filter((r) => r.id !== deletedRenderId));
        onClearDeletedId?.();
    }, [deletedRenderId, onClearDeletedId]);


    const getStatusIcon = (status: RenderRequest["status"]) => {
        switch (status) {
            case "completed":
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case "rendering":
                return <Play className="h-4 w-4 text-blue-500" />;
            case "failed":
                return <XCircle className="h-4 w-4 text-red-500" />;
            case "pending":
                return <Clock className="h-4 w-4 text-yellow-500" />;
            default:
                return <AlertCircle className="h-4 w-4 text-gray-500" />;
        }
    };

    const getStatusBadge = (status: RenderRequest["status"]) => {
        const variants = {
            completed: "default",
            rendering: "secondary",
            failed: "destructive",
            pending: "outline"
        } as const;

        return (
            <Badge variant={variants[status]} className="text-xs">
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
        );
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return "";
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    if (isApiLoading) {
        return (
            <div className="w-80 border-r bg-background flex flex-col h-full">
                <div className="p-4">
                    <h2 className="text-lg font-semibold mb-4">Render History</h2>
                    <div className="space-y-2">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-20 bg-muted animate-pulse rounded" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-80 border-r bg-background flex flex-col h-full">
            <ScrollArea className="flex-1 min-h-0">
                <div className="p-4 space-y-4">
                    <div>
                        <h2 className="text-lg font-semibold">Render History</h2>
                        <p className="text-sm text-muted-foreground">
                            {renderRequests?.length || 0} loaded
                            {hasMore ? " · more available" : ""}
                            {showArchived ? " (archived)" : ""}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant={showArchived ? "secondary" : "ghost"}
                            size="sm"
                            className="flex-1"
                            onClick={() => setShowArchived(false)}
                        >
                            Active
                        </Button>
                        <Button
                            type="button"
                            variant={showArchived ? "ghost" : "secondary"}
                            size="sm"
                            className="flex-1"
                            onClick={() => setShowArchived(true)}
                        >
                            <Archive className="h-3 w-3 mr-1" />
                            Archived
                        </Button>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="api-key" className="text-xs font-medium">
                            API Key (optional)
                        </Label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Key className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                                <Input
                                    id="api-key"
                                    type="password"
                                    placeholder="Enter your API key"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    className="pl-8 text-xs"
                                />
                            </div>
                            {apiKey && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => fetchApiHistory(apiKey, showArchived)}
                                    disabled={isApiLoading}
                                    className="px-2"
                                >
                                    <RefreshCw className={cn("h-3 w-3", isApiLoading && "animate-spin")} />
                                </Button>
                            )}
                        </div>
                        {apiError && (
                            <p className="text-xs text-destructive">{apiError}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-medium">Project</Label>
                        <Select
                            value={selectedProjectId}
                            onValueChange={setSelectedProjectId}
                            disabled={projectsLoading}
                        >
                            <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder={projectsLoading ? "Loading..." : "All projects"} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="any">All projects</SelectItem>
                                {projects.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.displayName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-medium">Tags</Label>
                        <div className="rounded-md border p-2">
                            <TagMultiSelect
                                selectedTags={selectedTags}
                                onTagsChange={setSelectedTags}
                                label=""
                                required={false}
                                showCreateNew={false}
                            />
                        </div>
                    </div>

                    <Separator />

                    {renderRequests?.map((request) => (
                        <Card
                            key={request.id}
                            className={cn(
                                "cursor-pointer transition-colors hover:bg-muted/50",
                                selectedRender === request.id && "ring-2 ring-primary"
                            )}
                            onClick={() => onSelectRender(request.id, request)}
                        >
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-medium truncate">
                                        {request.fileName}
                                    </CardTitle>
                                    <div className="flex items-center gap-2">
                                        {refreshingIds.has(request.id) && (
                                            <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                                        )}
                                        {getStatusIcon(request.status)}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {getStatusBadge(request.status)}
                                    {request.isArchived && (
                                        <Badge variant="outline" className="text-xs">
                                            <Archive className="h-3 w-3 mr-0.5" />
                                            Archived
                                        </Badge>
                                    )}
                                    {request.status === "rendering" && request.progress !== undefined && (
                                        <span className="text-xs text-muted-foreground">
                                            {Math.round(request.progress * 100)}%
                                        </span>
                                    )}
                                </div>
                            </CardHeader>

                            {selectedRender === request.id && <CardContent className="pt-0">
                                {/* Video Preview for completed renders */}
                                {request.status === "completed" && request.downloadUrl && (
                                    <div className="mb-3">
                                        <video
                                            src={request.downloadUrl}
                                            controls
                                            className="w-full h-32 object-cover rounded-md"
                                            preload="metadata"
                                        />
                                    </div>
                                )}

                                <div className="space-y-1 text-xs text-muted-foreground">
                                    <div className="flex justify-between">
                                        <span>Codec:</span>
                                        <span className="font-mono">{request.codec}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Composition:</span>
                                        <span className="font-mono truncate ml-2">
                                            {request.composition}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Created:</span>
                                        <span>{formatDate(request.createdAt)}</span>
                                    </div>
                                    {request.fileSize && (
                                        <div className="flex justify-between">
                                            <span>Size:</span>
                                            <span>{formatFileSize(request.fileSize)}</span>
                                        </div>
                                    )}
                                </div>

                                {request.status === "rendering" && request.progress !== undefined && (
                                    <div className="mt-2">
                                        <div className="w-full bg-secondary rounded-full h-1.5">
                                            <div
                                                className={cn(
                                                    "h-1.5 rounded-full transition-all duration-300",
                                                    refreshingIds.has(request.id)
                                                        ? "bg-blue-500 animate-pulse"
                                                        : "bg-primary"
                                                )}
                                                style={{ width: `${request.progress * 100}%` }}
                                            />
                                        </div>
                                        {refreshingIds.has(request.id) && (
                                            <div className="flex items-center gap-1 mt-1">
                                                <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />
                                                <span className="text-xs text-blue-600">Updating...</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>}
                        </Card>
                    ))}

                    {(!renderRequests || renderRequests.length === 0) && (
                        <div className="text-center text-muted-foreground py-8">
                            <Download className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No render requests yet</p>
                            <p className="text-xs">Start rendering to see your history here</p>
                        </div>
                    )}

                    {hasMore && renderRequests.length > 0 && (
                        <div className="pt-2 pb-4 flex justify-center">
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={loadMore}
                                disabled={isLoadingMore}
                            >
                                {isLoadingMore ? (
                                    <>
                                        <RefreshCw className="h-3 w-3 animate-spin mr-2" />
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
