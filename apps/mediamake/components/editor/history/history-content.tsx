"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
    Download,
    RefreshCw,
    AlertCircle,
    CheckCircle,
    Clock,
    Play,
    FileVideo,
    Calendar,
    Code,
    Settings,
    ExternalLink,
    Cpu,
    HardDrive,
    Timer,
    Layers,
    Zap,
    Settings2,
    Trash2,
    Archive,
    Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { type RenderRequest } from "@/lib/render-history";
import type { InputCompositionProps } from "@microfox/remotion";
import { CostDisplay } from "./cost-display";
import { ProgressDetails } from "./progress-details";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProgress } from "@/hooks/use-progress";
import Link from "next/link";
import useLocalState from "@/components/studio/context/hooks/useLocalState";
import { toast } from "sonner";
import { ReadOnlyJsonEditor } from "./readonly-json-editor";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface HistoryContentProps {
    selectedRender: string | null;
    selectedRequest?: RenderRequest | null;
    onRefreshApiRequest?: (renderId: string, updatedRequest: RenderRequest) => void;
    onRenderDeleted?: (renderId: string) => void;
    /**
     * Optional session clientId. When provided, live-progress polling, input-props
     * loading and delete work via x-client-id (session cookie) without requiring an
     * API key. The render-history pages omit this and keep API-key-only behavior.
     */
    clientId?: string;
}

export function HistoryContent({ selectedRender, selectedRequest: propSelectedRequest, onRefreshApiRequest, onRenderDeleted, clientId }: HistoryContentProps) {
    const [selectedRequest, setSelectedRequest] = useState<RenderRequest | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [archiveInDatabase, setArchiveInDatabase] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [loadedInputProps, setLoadedInputProps] = useState<InputCompositionProps | null>(null);
    const [isLoadingInputProps, setIsLoadingInputProps] = useState(false);
    const { fetchAndUpdateProgress } = useProgress();
    const [apiKey, setApiKey] = useLocalState("apiKey", process.env.NEXT_PUBLIC_DEV_API_KEY ?? "");
    // Auth for progress/detail calls: an API key OR a session clientId is enough.
    const hasAuth = Boolean(apiKey?.trim() || clientId);
    const progressAuth = { apiKey, clientId };
    const buildAuthHeaders = (base: Record<string, string> = {}) => {
        const headers = { ...base };
        if (apiKey?.trim()) headers.Authorization = `Bearer ${apiKey}`;
        if (clientId) headers["x-client-id"] = clientId;
        return headers;
    };
    const selectedRenderIdRef = useRef<string | null>(null);

    useEffect(() => {
        selectedRenderIdRef.current = selectedRender;
    }, [selectedRender]);

    // Load selected request from API and sync with parent
    useEffect(() => {
        if (selectedRender && propSelectedRequest) {
            setSelectedRequest(propSelectedRequest);
            setError(null);
            setLoadedInputProps(null); // clear on-demand inputProps when selection changes
        } else if (selectedRender && !propSelectedRequest) {
            setError('Request not found');
        } else {
            setSelectedRequest(null);
            setError(null);
            setLoadedInputProps(null);
        }
    }, [selectedRender, propSelectedRequest]);

    // When selection changes, fetch fresh details. Skip progress API only when we already have full data from DB.
    useEffect(() => {
        if (!selectedRender || !propSelectedRequest || !hasAuth) return;
        if (!propSelectedRequest.bucketName || !propSelectedRequest.renderId) return;
        // Completed/failed with full data already in DB: skip fetch to avoid unnecessary Lambda calls.
        const hasProgressData = Boolean(propSelectedRequest.progressData);
        const failedHasError = propSelectedRequest.status === "failed" && propSelectedRequest.error != null;
        if (
            (propSelectedRequest.status === "completed" && hasProgressData) ||
            (propSelectedRequest.status === "failed" && hasProgressData && failedHasError)
        ) {
            return;
        }

        const renderIdForThisEffect = selectedRender;
        let cancelled = false;
        const doFetch = async () => {
            setIsRefreshing(true);
            try {
                const result = await fetchAndUpdateProgress(propSelectedRequest, progressAuth);
                if (cancelled) return;
                if (selectedRenderIdRef.current !== renderIdForThisEffect) return;
                if (result.success && result.updatedRequest) {
                    setSelectedRequest(result.updatedRequest);
                    if (onRefreshApiRequest) {
                        onRefreshApiRequest(renderIdForThisEffect, result.updatedRequest);
                    }
                }
            } catch (err) {
                if (!cancelled && selectedRenderIdRef.current === renderIdForThisEffect) {
                    console.error('Error fetching details on selection:', err);
                }
            } finally {
                if (!cancelled) setIsRefreshing(false);
            }
        };
        doFetch();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when selection identity changes, not when callbacks change
    }, [selectedRender, propSelectedRequest?.id, apiKey, clientId]);

    // Check progress for the selected rendering request (only while status is "rendering")
    useEffect(() => {
        if (!selectedRequest || selectedRequest.status !== "rendering" || !selectedRequest.bucketName || !selectedRequest.renderId) {
            return;
        }

        if (!hasAuth) {
            return;
        }

        const requestId = selectedRequest.id;

        const checkProgress = async () => {
            try {
                const result = await fetchAndUpdateProgress(selectedRequest, progressAuth);
                if (selectedRenderIdRef.current !== requestId) return;
                if (result.success && result.updatedRequest) {
                    setSelectedRequest(result.updatedRequest);
                    if (onRefreshApiRequest) {
                        onRefreshApiRequest(requestId, result.updatedRequest);
                    }
                }
            } catch (err) {
                if (selectedRenderIdRef.current === requestId) {
                    console.error('Error checking progress:', err);
                }
            } finally {
                if (selectedRenderIdRef.current === requestId) {
                    setIsRefreshing(false);
                }
            }
        };

        setIsRefreshing(true);
        checkProgress();
        const interval = setInterval(checkProgress, 3000);
        return () => {
            clearInterval(interval);
            if (selectedRenderIdRef.current === requestId) {
                setIsRefreshing(false);
            }
        };
    }, [selectedRequest?.id, selectedRequest?.status, selectedRequest?.bucketName, selectedRequest?.renderId, apiKey, clientId, fetchAndUpdateProgress, onRefreshApiRequest]);

    const getStatusIcon = (status: RenderRequest["status"]) => {
        switch (status) {
            case "completed":
                return <CheckCircle className="h-5 w-5 text-green-500" />;
            case "rendering":
                return <Play className="h-5 w-5 text-blue-500" />;
            case "failed":
                return <AlertCircle className="h-5 w-5 text-red-500" />;
            case "pending":
                return <Clock className="h-5 w-5 text-yellow-500" />;
            default:
                return <AlertCircle className="h-5 w-5 text-gray-500" />;
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
            <Badge variant={variants[status]} className="text-sm">
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
        );
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return "Unknown";
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    const handleDownload = (url: string, fileName: string) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.target = '_blank';
        console.log('Downloading file:', url, fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleRefresh = async () => {
        if (!selectedRender || !propSelectedRequest) {
            toast.error("Selected request is not valid");
            return;
        }

        if (!hasAuth) {
            toast.error("Not authenticated");
            return;
        }

        console.log('Refreshing request for ID:', selectedRender);
        setIsRefreshing(true);
        setError(null);

        try {
            const result = await fetchAndUpdateProgress(propSelectedRequest, progressAuth);
            if (result.success && result.updatedRequest) {
                console.log('Refresh successful, updating with fresh data:', result.updatedRequest);
                setSelectedRequest(result.updatedRequest);
                // Also notify the parent component of the update
                if (onRefreshApiRequest) {
                    onRefreshApiRequest(selectedRender, result.updatedRequest);
                }
            } else if (result.error) {
                console.error('Refresh failed:', result.error);
                setError('Failed to refresh request');
            }
        } catch (error) {
            console.error('Refresh error:', error);
            setError('Failed to refresh request');
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleLoadInputProps = async () => {
        if (!selectedRender || !hasAuth) {
            toast.error("Missing selection or authentication");
            return;
        }
        setIsLoadingInputProps(true);
        try {
            const params = new URLSearchParams({
                renderId: selectedRender,
                inputPropsOnly: "true",
            });
            if (selectedRequest?.isArchived) params.set("includeArchived", "true");
            const res = await fetch(`/api/remotion/history?${params}`, {
                headers: buildAuthHeaders(),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                toast.error(data.error || "Failed to load input props");
                return;
            }
            const data = await res.json();
            setLoadedInputProps(data.inputProps ?? null);
            if (data.inputProps == null) {
                toast.info("No input props stored for this render");
            }
        } catch (err) {
            console.error("Failed to load input props:", err);
            toast.error("Failed to load input props");
        } finally {
            setIsLoadingInputProps(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!selectedRender || !selectedRequest || !hasAuth) {
            toast.error("Missing selection or authentication");
            return;
        }
        if (!selectedRequest.bucketName) {
            toast.error("This render has no bucket info; cannot delete from Lambda.");
            return;
        }
        setIsDeleting(true);
        try {
            const res = await fetch('/api/remotion/render/delete', {
                method: 'POST',
                headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                    renderId: selectedRender,
                    bucketName: selectedRequest.bucketName,
                    archiveInDatabase,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast.error(data.error || 'Failed to delete render');
                return;
            }
            const freedMB = ((data.freedBytes ?? 0) / (1024 * 1024)).toFixed(1);
            toast.success(
                `Render deleted from Lambda (${freedMB} MB freed)${data.archivedInDatabase ? '. Archived in database.' : ''}`
            );
            setDeleteDialogOpen(false);
            onRenderDeleted?.(selectedRender);
        } catch (err) {
            console.error('Delete render error:', err);
            toast.error('Failed to delete render');
        } finally {
            setIsDeleting(false);
        }
    };

    if (!selectedRender) {
        return (
            <div className="flex-1 flex items-center justify-center bg-muted/20">
                <div className="text-center">
                    <FileVideo className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Select a Render Request</h3>
                    <p className="text-muted-foreground">
                        Choose a render request from the sidebar to view its details
                    </p>
                </div>
            </div>
        );
    }

    if (error || !selectedRequest) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                    <h3 className="text-lg font-semibold mb-2">Error Loading Request</h3>
                    <p className="text-muted-foreground mb-4">
                        {error || 'Failed to load render request details'}
                    </p>
                    <Button
                        onClick={handleRefresh}
                        variant="outline"
                        disabled={isRefreshing}
                    >
                        <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
                        {isRefreshing ? "Refreshing..." : "Retry"}
                    </Button>
                </div>
            </div>
        );
    }

    // Support both shapes: progressData.renderInfo (from API response) or raw progressData (from DB)
    const rawProgress = selectedRequest.progressData;
    const renderInfo = rawProgress?.renderInfo ?? (rawProgress && 'costs' in rawProgress ? rawProgress : undefined) as typeof rawProgress extends { renderInfo?: infer R } ? R : undefined;

    return (
        <div className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 overflow-y-auto">
                <div className="p-6 space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {getStatusIcon(selectedRequest.status)}
                            <div>
                                <h1 className="text-2xl font-bold">{selectedRequest.fileName}</h1>
                                <p className="text-muted-foreground">
                                    Created {formatDate(selectedRequest.createdAt)}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {selectedRequest.projectId && (
                                        <Badge variant="secondary" className="text-xs">
                                            Project: {selectedRequest.projectId}
                                        </Badge>
                                    )}
                                    {(selectedRequest.tags ?? []).map((t) => (
                                        <Badge key={t} variant="outline" className="text-xs">
                                            #{t}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {getStatusBadge(selectedRequest.status)}
                            {selectedRequest.isArchived && (
                                <Badge variant="secondary" className="gap-1">
                                    <Archive className="h-3 w-3" />
                                    Archived
                                </Badge>
                            )}
                            {isRefreshing && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                    <span>Checking status...</span>
                                </div>
                            )}
                            {!selectedRequest.isArchived && (
                                <>
                                    <Button
                                        onClick={handleRefresh}
                                        variant="outline"
                                        size="sm"
                                        disabled={isRefreshing}
                                    >
                                        <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                                    </Button>
                                    <Button
                                        onClick={() => setDeleteDialogOpen(true)}
                                        variant="outline"
                                        size="sm"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    <Separator />

                    {/* Progress Section */}
                    {selectedRequest.status === "rendering" && selectedRequest.progress !== undefined && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Play className="h-5 w-5" />
                                    Rendering Progress
                                    {isRefreshing && (
                                        <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex justify-between text-sm">
                                        <span>Progress</span>
                                        <span>{Math.round(selectedRequest.progress * 100)}%</span>
                                    </div>
                                    <Progress value={selectedRequest.progress * 100} className="w-full" />
                                    <p className="text-sm text-muted-foreground">
                                        Your video is being rendered. This may take several minutes depending on the complexity.
                                        {isRefreshing && (
                                            <span className="block mt-1 text-blue-600">
                                                <RefreshCw className="h-3 w-3 inline animate-spin mr-1" />
                                                Checking for updates...
                                            </span>
                                        )}
                                    </p>

                                    {/* Show cost and progress details during rendering if available */}
                                    {renderInfo && (
                                        <div className="pt-4 border-t space-y-4">
                                            {renderInfo.costs && (
                                                <CostDisplay costs={renderInfo.costs} />
                                            )}
                                            <ProgressDetails renderInfo={renderInfo} awsRenderPreset={selectedRequest.awsRenderPreset ?? "N/A"} />
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Error Section */}
                    {selectedRequest.status === "failed" && selectedRequest.error && (
                        <Card className="border-red-200">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-red-600">
                                    <AlertCircle className="h-5 w-5" />
                                    Render Failed
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <p className="text-red-800 font-medium">Error Details:</p>
                                    <p className="text-red-700 mt-1">{selectedRequest.error}</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Download Section */}
                    {selectedRequest.status === "completed" && selectedRequest.downloadUrl && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                    Render Complete
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">Your video is ready!</p>
                                            <p className="text-sm text-muted-foreground">
                                                File size: {formatFileSize(selectedRequest.fileSize)}
                                            </p>
                                        </div>
                                        {!selectedRequest.isDownloadable ? (
                                            <Link href={selectedRequest.downloadUrl!} target="_blank">
                                                <Button className="gap-2 cursor-pointer">
                                                    <ExternalLink className="h-4 w-4" />
                                                    Video Link
                                                </Button>
                                            </Link>) : (
                                            <Button
                                                onClick={() => handleDownload(selectedRequest.downloadUrl!, selectedRequest.fileName)}
                                                className="gap-2"
                                            >
                                                <Download className="h-4 w-4" />
                                                Download
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Cost Display */}
                    {renderInfo?.costs && (
                        <CostDisplay costs={renderInfo.costs} />
                    )}

                    {/* Progress Details */}
                    {renderInfo && (
                        <ProgressDetails renderInfo={renderInfo} awsRenderPreset={selectedRequest.awsRenderPreset ?? "N/A"} />
                    )}

                    {/* Render Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="h-5 w-5" />
                                Render Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium">File Name:</span>
                                        <span className="text-sm font-mono">{selectedRequest.fileName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium">Codec:</span>
                                        <span className="text-sm font-mono">{selectedRequest.codec}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium">Audio Codec:</span>
                                        <span className="text-sm font-mono">{selectedRequest?.audioCodec || 'aac'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium">Composition:</span>
                                        <span className="text-sm font-mono">{selectedRequest.composition}</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium">Status:</span>
                                        {getStatusBadge(selectedRequest.status)}
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium">Created:</span>
                                        <span className="text-sm">{formatDate(selectedRequest.createdAt)}</span>
                                    </div>
                                    {selectedRequest.fileSize && (
                                        <div className="flex justify-between">
                                            <span className="text-sm font-medium">File Size:</span>
                                            <span className="text-sm">{formatFileSize(selectedRequest.fileSize)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Lambda Configuration */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {selectedRequest?.configMode === 'custom' ? (
                                    <Settings2 className="h-5 w-5" />
                                ) : (
                                    <Zap className="h-5 w-5" />
                                )}
                                Lambda Configuration
                                <Badge variant={selectedRequest?.configMode === 'custom' ? 'secondary' : 'outline'} className="ml-2">
                                    {selectedRequest?.configMode === 'custom' ? 'Custom' : 'Preset'}
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    {/* Config Mode & Preset */}
                                    {selectedRequest?.configMode !== 'custom' && selectedRequest?.awsRenderPreset && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium flex items-center gap-1">
                                                <Zap className="h-4 w-4 text-muted-foreground" />
                                                Preset:
                                            </span>
                                            <Badge variant="outline">{selectedRequest?.awsRenderPreset}</Badge>
                                        </div>
                                    )}

                                    {/* Memory */}
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium flex items-center gap-1">
                                            <Cpu className="h-4 w-4 text-muted-foreground" />
                                            Memory:
                                        </span>
                                        <span className="text-sm font-mono">
                                            {selectedRequest?.memoryUsed
                                                ? `${(selectedRequest?.memoryUsed / 1024).toFixed(1)} GB`
                                                : 'N/A'}
                                        </span>
                                    </div>

                                    {/* Disk */}
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium flex items-center gap-1">
                                            <HardDrive className="h-4 w-4 text-muted-foreground" />
                                            Disk:
                                        </span>
                                        <span className="text-sm font-mono">
                                            {selectedRequest?.diskUsed
                                                ? `${(selectedRequest?.diskUsed / 1024).toFixed(1)} GB`
                                                : 'N/A'}
                                        </span>
                                    </div>

                                    {/* Timeout */}
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium flex items-center gap-1">
                                            <Timer className="h-4 w-4 text-muted-foreground" />
                                            Timeout:
                                        </span>
                                        <span className="text-sm font-mono">
                                            {selectedRequest?.timeoutUsed
                                                ? `${selectedRequest?.timeoutUsed}s`
                                                : 'N/A'}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {/* Concurrency */}
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium flex items-center gap-1">
                                            <Layers className="h-4 w-4 text-muted-foreground" />
                                            Concurrency:
                                        </span>
                                        <span className="text-sm font-mono">
                                            {selectedRequest?.concurrencyUsed ?? 'Auto'}
                                        </span>
                                    </div>

                                    {/* Frames Per Lambda */}
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium flex items-center gap-1">
                                            <Play className="h-4 w-4 text-muted-foreground" />
                                            Frames/Lambda:
                                        </span>
                                        <span className="text-sm font-mono">
                                            {selectedRequest?.framesPerLambdaUsed ?? 'Auto'}
                                        </span>
                                    </div>

                                    {/* Function Name */}
                                    {selectedRequest?.functionNameUsed && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-medium flex items-center gap-1">
                                                <Code className="h-4 w-4 text-muted-foreground" />
                                                Function:
                                            </span>
                                            <span className="text-xs font-mono truncate max-w-[180px]" title={selectedRequest?.functionNameUsed ?? 'N/A'}>
                                                {selectedRequest?.functionNameUsed ?? 'N/A'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Custom Config Details */}
                            {selectedRequest?.configMode === 'custom' && selectedRequest?.customConfig && (
                                <div className="mt-4 pt-4 border-t">
                                    <p className="text-sm text-muted-foreground mb-2">Custom Configuration Used:</p>
                                    <div className="bg-muted/50 rounded-md p-3 font-mono text-xs">
                                        <pre className="whitespace-pre-wrap">
                                            {JSON.stringify(selectedRequest?.customConfig, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Input Props — loaded on demand to avoid heavy payloads in history list */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Code className="h-5 w-5" />
                                Input Properties
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {(selectedRequest?.inputProps ?? loadedInputProps) ? (
                                <ReadOnlyJsonEditor
                                    value={selectedRequest?.inputProps ?? loadedInputProps ?? {}}
                                    height="300px"
                                    className="w-full"
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                                    <p className="text-sm text-muted-foreground">
                                        Input props are not loaded with the history list to keep the page fast. Load them only when needed.
                                    </p>
                                    <Button
                                        variant="outline"
                                        onClick={handleLoadInputProps}
                                        disabled={isLoadingInputProps}
                                        className="gap-2"
                                    >
                                        {isLoadingInputProps ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Code className="h-4 w-4" />
                                        )}
                                        {isLoadingInputProps ? "Loading…" : "Load input props"}
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </ScrollArea>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete render</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will delete the render from Lambda (S3): output file and artifacts will be removed.
                            You can also remove this entry from the history list below.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex items-center space-x-2 py-2">
                        <Checkbox
                            id="archive-in-db"
                            checked={archiveInDatabase}
                            onCheckedChange={(checked) => setArchiveInDatabase(checked === true)}
                        />
                        <Label htmlFor="archive-in-db" className="text-sm font-normal cursor-pointer">
                            Archive in database (keep cost/details, hide from active list)
                        </Label>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleDeleteConfirm();
                            }}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
