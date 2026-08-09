"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    Film,
    Download,
    ExternalLink,
    Loader2,
    AlertCircle,
    Clock,
    CheckCircle,
    Play,
    ImageOff,
} from "lucide-react";
import Link from "next/link";
import { useRendersStore } from "../../../stores/renders-store";
import { type RenderRequest } from "@/lib/render-history";

function StatusBadge({ status }: { status: RenderRequest["status"] }) {
    const variants = {
        completed: "default",
        rendering: "secondary",
        failed: "destructive",
        pending: "outline",
    } as const;
    return (
        <Badge variant={variants[status]} className="text-xs">
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
    );
}

function EmptyState() {
    return (
        <div className="flex flex-1 items-center justify-center bg-muted/20">
            <div className="space-y-2 text-center">
                <Film className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                <p className="text-sm font-medium">No render selected</p>
                <p className="text-xs text-muted-foreground">
                    Pick a render from the Renders tab to preview it here.
                </p>
            </div>
        </div>
    );
}

export function RenderPreviewPanel() {
    const request = useRendersStore((s) => s.selectedRequest);

    if (!request) {
        return (
            <div className="flex h-full flex-col">
                <EmptyState />
            </div>
        );
    }

    const isImage = request.renderType === "still";
    const isAudio = request.renderType === "audio";
    const progressPct =
        request.progress !== undefined ? Math.round(request.progress * 100) : undefined;

    return (
        <div className="flex h-full flex-col bg-muted/10">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 border-b bg-background px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-medium" title={request.fileName}>
                        {request.fileName || "Untitled render"}
                    </span>
                    <StatusBadge status={request.status} />
                    {request.renderSource === "browser" && (
                        <Badge variant="outline" className="text-xs">
                            Browser
                        </Badge>
                    )}
                </div>
                {request.status === "completed" && request.downloadUrl && (
                    <div className="flex shrink-0 items-center gap-2">
                        <Link href={request.downloadUrl} target="_blank" rel="noreferrer">
                            <Button variant="outline" size="sm" className="gap-1.5">
                                <ExternalLink className="h-3.5 w-3.5" />
                                Open
                            </Button>
                        </Link>
                        <a href={request.downloadUrl} download={request.fileName}>
                            <Button size="sm" className="gap-1.5">
                                <Download className="h-3.5 w-3.5" />
                                Download
                            </Button>
                        </a>
                    </div>
                )}
            </div>

            {/* Preview stage */}
            <div className="flex flex-1 items-center justify-center overflow-auto p-4">
                {request.status === "completed" && request.downloadUrl ? (
                    isImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={request.downloadUrl}
                            alt={request.fileName}
                            className="max-h-full max-w-full rounded-md object-contain shadow-sm"
                        />
                    ) : isAudio ? (
                        <div className="w-full max-w-md space-y-4 text-center">
                            <div className="flex h-40 items-center justify-center rounded-md border bg-background">
                                <CheckCircle className="h-10 w-10 text-green-500" />
                            </div>
                            <audio src={request.downloadUrl} controls className="w-full" />
                        </div>
                    ) : (
                        <video
                            src={request.downloadUrl}
                            controls
                            autoPlay={false}
                            className="max-h-full max-w-full rounded-md shadow-sm"
                        />
                    )
                ) : request.status === "completed" && !request.downloadUrl ? (
                    <div className="space-y-2 text-center text-muted-foreground">
                        <ImageOff className="mx-auto h-10 w-10 opacity-50" />
                        <p className="text-sm">Render completed, but no output URL is available.</p>
                    </div>
                ) : request.status === "rendering" ? (
                    <div className="w-full max-w-sm space-y-4 text-center">
                        <Play className="mx-auto h-10 w-10 animate-pulse text-blue-500" />
                        <p className="text-sm font-medium">Rendering…</p>
                        {progressPct !== undefined && (
                            <div className="space-y-1">
                                <Progress value={progressPct} className="w-full" />
                                <p className="text-xs text-muted-foreground">{progressPct}%</p>
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                            This preview updates automatically as the render progresses.
                        </p>
                    </div>
                ) : request.status === "pending" ? (
                    <div className="space-y-2 text-center text-muted-foreground">
                        <Clock className="mx-auto h-10 w-10 text-yellow-500" />
                        <p className="text-sm font-medium">Queued</p>
                        <p className="text-xs">Waiting for the render to start…</p>
                    </div>
                ) : request.status === "failed" ? (
                    <div className="max-w-md space-y-2 text-center">
                        <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
                        <p className="text-sm font-medium text-red-600">Render failed</p>
                        {request.error && (
                            <p className="rounded-md border border-red-200 bg-red-50 p-3 text-left text-xs text-red-700">
                                {request.error}
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="space-y-2 text-center text-muted-foreground">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin opacity-50" />
                        <p className="text-sm">Loading preview…</p>
                    </div>
                )}
            </div>
        </div>
    );
}
