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
    ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { type RenderRequest } from "@/lib/render-history";
import { CostDisplay } from "./cost-display";
import { ProgressDetails } from "./progress-details";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProgress } from "@/hooks/use-progress";
import Link from "next/link";
import useLocalState from "@/components/studio/context/hooks/useLocalState";
import { toast } from "sonner";
import { ReadOnlyJsonEditor } from "./readonly-json-editor";

interface HistoryContentProps {
    selectedRender: string | null;
    selectedRequest?: RenderRequest | null;
    onRefreshApiRequest?: (renderId: string, updatedRequest: RenderRequest) => void;
}

export function HistoryContent({ selectedRender, selectedRequest: propSelectedRequest, onRefreshApiRequest }: HistoryContentProps) {
    const [selectedRequest, setSelectedRequest] = useState<RenderRequest | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const { fetchAndUpdateProgress } = useProgress();
    const [apiKey, setApiKey] = useLocalState("apiKey", process.env.NEXT_PUBLIC_DEV_API_KEY ?? "");

    const [localRender, setLocalRender] = useState<any | null>(null);
    const [isLocalRender, setIsLocalRender] = useState(false);

    // Load selected request from API or local store
    useEffect(() => {
        if (selectedRender && propSelectedRequest) {
            // Check if it's a local render
            if ((propSelectedRequest as any).concurrency !== undefined) {
                setIsLocalRender(true);
                setLocalRender(propSelectedRequest);
                setSelectedRequest(null);
                setError(null);
            } else {
                console.log('Using passed request from API:', propSelectedRequest);
                setIsLocalRender(false);
                setSelectedRequest(propSelectedRequest);
                setLocalRender(null);
                setError(null);
            }
        } else if (selectedRender && !propSelectedRequest) {
            setError('Request not found');
        } else {
            setSelectedRequest(null);
            setLocalRender(null);
            setError(null);
        }
    }, [selectedRender, propSelectedRequest]);

    // Poll local render progress
    useEffect(() => {
        if (!isLocalRender || !selectedRender) return;

        const pollProgress = async () => {
            try {
                const response = await fetch(`/api/remotion/render/local/progress/${selectedRender}`);
                if (response.ok) {
                    const data = await response.json();
                    setLocalRender(data.render);
                }
            } catch (error) {
                console.error('Failed to poll local render progress:', error);
            }
        };

        pollProgress();
        const interval = setInterval(pollProgress, 2000); // Poll every 2 seconds
        return () => clearInterval(interval);
    }, [isLocalRender, selectedRender]);

    // Poll local render progress
    useEffect(() => {
        if (!isLocalRender || !selectedRender) return;

        const pollProgress = async () => {
            try {
                const response = await fetch(`/api/remotion/render/local/progress/${selectedRender}`);
                if (response.ok) {
                    const data = await response.json();
                    setLocalRender(data.render);
                }
            } catch (error) {
                console.error('Failed to poll local render progress:', error);
            }
        };

        pollProgress();
        const interval = setInterval(pollProgress, 2000); // Poll every 2 seconds
        return () => clearInterval(interval);
    }, [isLocalRender, selectedRender]);

    // Check progress for the selected AWS rendering request
    useEffect(() => {
        console.log('selectedRequest', selectedRequest);
        if (isLocalRender || !selectedRequest || selectedRequest.status !== "rendering" || !selectedRequest.bucketName || !selectedRequest.renderId) {
            return;
        }

        if (!apiKey) {
            return;
        }

        const checkProgress = async () => {
            setIsRefreshing(true);
            try {
                const result = await fetchAndUpdateProgress(selectedRequest, apiKey);
                if (result.success && result.updatedRequest) {
                    setSelectedRequest(result.updatedRequest);
                    // Also notify the parent component of the update
                    if (onRefreshApiRequest) {
                        onRefreshApiRequest(selectedRequest.id, result.updatedRequest);
                    }
                }
            } catch (error) {
                console.error('Error checking progress:', error);
            } finally {
                setIsRefreshing(false);
            }
        };

        // Check immediately first, then set up interval
        checkProgress();
        const interval = setInterval(checkProgress, 3000); // Check every 3 seconds
        return () => clearInterval(interval);
    }, [isLocalRender, selectedRequest, fetchAndUpdateProgress, onRefreshApiRequest, apiKey]);

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
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleRefresh = async () => {
        if (!selectedRender || !propSelectedRequest) {
            toast.error("Selected request is not valid");
            return;
        }

        if (!apiKey) {
            toast.error("API key is not valid");
            return;
        }

        console.log('Refreshing request for ID:', selectedRender);
        setIsRefreshing(true);
        setError(null);

        try {
            const result = await fetchAndUpdateProgress(propSelectedRequest, apiKey);
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

    // Handle cancel local render
    const handleCancelLocalRender = async (renderId: string) => {
        try {
            const response = await fetch(`/api/remotion/render/local/cancel/${renderId}`, {
                method: 'POST',
            });
            if (response.ok) {
                toast.success('Render cancelled successfully');
                // Refresh the render data
                const progressResponse = await fetch(`/api/remotion/render/local/progress/${renderId}`);
                if (progressResponse.ok) {
                    const data = await progressResponse.json();
                    setLocalRender(data.render);
                }
            } else {
                toast.error('Failed to cancel render');
            }
        } catch (error) {
            console.error('Failed to cancel render:', error);
            toast.error('Failed to cancel render');
        }
    };

    if (error || (!selectedRequest && !localRender)) {
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

    // Show local render UI
    if (isLocalRender && localRender) {
        return (
            <div className="flex-1 flex flex-col min-h-0">
                <ScrollArea className="flex-1 overflow-y-auto">
                    <div className="p-6 space-y-6">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {getStatusIcon(localRender.status as any)}
                                <div>
                                    <h1 className="text-2xl font-bold">{localRender.fileName}</h1>
                                    <p className="text-muted-foreground">
                                        Local Render • Started {new Date(localRender.startTime).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {getStatusBadge(localRender.status as any)}
                                {(localRender.status === 'rendering' || localRender.status === 'pending') && (
                                    <Button
                                        onClick={() => handleCancelLocalRender(localRender.id)}
                                        variant="destructive"
                                        size="sm"
                                    >
                                        Cancel Render
                                    </Button>
                                )}
                                {localRender.status === 'failed' && localRender.checkpointPath && (
                                    <Button
                                        onClick={() => toast.info('Resume functionality coming soon')}
                                        variant="default"
                                        size="sm"
                                    >
                                        Resume from Checkpoint
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Progress Section */}
                        {localRender.status === 'rendering' && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Play className="h-5 w-5" />
                                        Rendering Progress
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="flex justify-between text-sm">
                                            <span>Progress</span>
                                            <span className="font-medium">{Math.round((localRender.progress || 0) * 100)}%</span>
                                        </div>
                                        <Progress value={(localRender.progress || 0) * 100} className="w-full" />
                                        {localRender.currentFrame && localRender.totalFrames && (
                                            <p className="text-sm text-muted-foreground">
                                                Frame {localRender.currentFrame} of {localRender.totalFrames}
                                            </p>
                                        )}
                                        {localRender.estimatedTimeRemaining && (
                                            <p className="text-sm text-muted-foreground">
                                                Estimated time remaining: {Math.ceil(localRender.estimatedTimeRemaining / 60000)} minutes
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Render Details */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Render Details</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <dl className="space-y-2">
                                    <div className="flex justify-between">
                                        <dt className="text-muted-foreground">Composition</dt>
                                        <dd className="font-medium">{localRender.compositionId}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-muted-foreground">Render Type</dt>
                                        <dd className="font-medium">{localRender.renderType}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-muted-foreground">Codec</dt>
                                        <dd className="font-medium">{localRender.codec}</dd>
                                    </div>
                                    {localRender.audioCodec && (
                                        <div className="flex justify-between">
                                            <dt className="text-muted-foreground">Audio Codec</dt>
                                            <dd className="font-medium">{localRender.audioCodec}</dd>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <dt className="text-muted-foreground">Quality</dt>
                                        <dd className="font-medium capitalize">{localRender.quality}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-muted-foreground">Concurrency</dt>
                                        <dd className="font-medium">{localRender.concurrency} threads</dd>
                                    </div>
                                    {localRender.outputPath && (
                                        <div className="flex justify-between">
                                            <dt className="text-muted-foreground">Output Path</dt>
                                            <dd className="font-medium text-sm truncate max-w-xs">{localRender.outputPath}</dd>
                                        </div>
                                    )}
                                </dl>
                            </CardContent>
                        </Card>

                        {/* Error Display */}
                        {localRender.status === 'failed' && localRender.error && (
                            <Card className="border-destructive">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-destructive">
                                        <AlertCircle className="h-5 w-5" />
                                        Render Failed
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">{localRender.error}</p>
                                    {localRender.checkpointPath && (
                                        <p className="text-sm text-muted-foreground mt-2">
                                            A checkpoint was saved. You can resume this render from where it failed.
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Success Display */}
                        {localRender.status === 'completed' && localRender.outputPath && (
                            <Card className="border-green-500">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-green-600">
                                        <CheckCircle className="h-5 w-5" />
                                        Render Completed
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Your video has been rendered successfully!
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => {
                                                navigator.clipboard.writeText(localRender.outputPath);
                                                toast.success('Path copied to clipboard');
                                            }}
                                            variant="outline"
                                            size="sm"
                                        >
                                            Copy Path
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </ScrollArea>
            </div>
        );
    }

    // Show AWS render UI
    return (
        <div className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 overflow-y-auto">
                <div className="p-6 space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {getStatusIcon(selectedRequest!.status)}
                            <div>
                                <h1 className="text-2xl font-bold">{selectedRequest!.fileName}</h1>
                                <p className="text-muted-foreground">
                                    Created {formatDate(selectedRequest!.createdAt)}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {getStatusBadge(selectedRequest!.status)}
                            {isRefreshing && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                    <span>Checking status...</span>
                                </div>
                            )}
                            <Button
                                onClick={handleRefresh}
                                variant="outline"
                                size="sm"
                                disabled={isRefreshing}
                            >
                                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                            </Button>
                        </div>
                    </div>

                    <Separator />

                    {/* Progress Section */}
                    {selectedRequest && selectedRequest.status === "rendering" && selectedRequest.progress !== undefined && (
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
                                    {selectedRequest.progressData?.renderInfo && (
                                        <div className="pt-4 border-t space-y-4">
                                            {selectedRequest.progressData.renderInfo.costs && (
                                                <CostDisplay costs={selectedRequest.progressData.renderInfo.costs} />
                                            )}
                                            <ProgressDetails renderInfo={selectedRequest.progressData.renderInfo}  awsRenderPreset={selectedRequest.awsRenderPreset ?? "N/A"} />
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Error Section */}
                    {selectedRequest && selectedRequest.status === "failed" && selectedRequest.error && (
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
                    {selectedRequest && selectedRequest.status === "completed" && selectedRequest.downloadUrl && (
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
                    {selectedRequest && selectedRequest.progressData?.renderInfo?.costs && (
                        <CostDisplay costs={selectedRequest.progressData.renderInfo.costs} />
                    )}

                    {/* Progress Details */}
                    {selectedRequest && selectedRequest.progressData?.renderInfo && (
                        <ProgressDetails renderInfo={selectedRequest.progressData.renderInfo} awsRenderPreset={selectedRequest.awsRenderPreset ?? "N/A"} />
                    )}

                    {/* Render Details */}
                    {selectedRequest && (
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
                                        <span className="text-sm font-medium">Composition:</span>
                                        <span className="text-sm font-mono">{selectedRequest.composition}</span>
                                    </div>
                                    {selectedRequest.awsRenderPreset && (
                                        <div className="flex justify-between">
                                            <span className="text-sm font-medium">AWS Preset:</span>
                                            <span className="text-sm font-mono">{selectedRequest.awsRenderPreset}</span>
                                        </div>
                                    )}
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
                    )}

                    {/* Input Props */}
                    {selectedRequest && selectedRequest.inputProps && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Code className="h-5 w-5" />
                                    Input Properties
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ReadOnlyJsonEditor
                                    value={selectedRequest.inputProps}
                                    height="300px"
                                    className="w-full"
                                />
                            </CardContent>
                        </Card>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
