"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "lucide-react";
import { UrlIndexingDialog } from "./url-indexing-dialog";
import { cn } from "@/lib/utils";
import { RagImageMetadata } from "@/app/types/media";
import { useMedia } from "@/components/editor/media/media-context";
import { useWorkflowJob } from "@/hooks/useWorkflowJob";
import { useSession } from "@/components/session-provider";

interface UrlIndexingTriggerProps {
    onIndexingComplete?: (mediaFiles: any[]) => void;
    variant?: "default" | "outline" | "ghost" | "secondary";
    size?: "default" | "sm" | "lg";
    className?: string;
    children?: React.ReactNode;
    uiType?: "button" | "dropzone";
    dropzoneClassName?: string;
    preselectedTags?: string[];
}

export function UrlIndexingTrigger({
    onIndexingComplete,
    variant = "default",
    size = "default",
    className,
    children,
    uiType = "button",
    dropzoneClassName,
    preselectedTags = []
}: UrlIndexingTriggerProps) {
    const { hashtagFilters, indexingLimit, setIndexingLimit } = useMedia();
    const session = useSession();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [indexingStatus, setIndexingStatus] = useState<string>("");
    const dropzoneRef = useRef<HTMLDivElement>(null);
    const lastProjectIdRef = useRef<string | null>(null);

    const handleIndexingComplete = (mediaFiles: any[]) => {
        onIndexingComplete?.(mediaFiles);
        setIsDialogOpen(false);
    };

    const {
        trigger,
        loading,
    } = useWorkflowJob({
        type: "worker",
        workerId: "sparkboard-batch-index",
        pollIntervalMs: 10000,
        pollTimeoutMs: 900_000,
        autoPoll: false,
    });

    // Handle clipboard paste for URLs
    const handlePaste = async (e: ClipboardEvent) => {
        e.preventDefault();

        const items = e.clipboardData?.items;
        if (!items) return;

        const urls: string[] = [];

        // Process all items first
        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            if (item.kind === 'string' && item.type === 'text/plain') {
                // Use a promise to handle the async getAsString
                const text = await new Promise<string>((resolve) => {
                    item.getAsString((text) => resolve(text));
                });

                // Check if it's a URL
                try {
                    const url = new URL(text);
                    if (url.protocol === 'http:' || url.protocol === 'https:') {
                        console.log('Valid URL detected:', text);
                        urls.push(text);
                    }
                } catch (error) {
                    console.log('Invalid URL:', text, error);
                }
            }
        }

        // Handle URLs from clipboard
            if (urls.length > 0) {
                console.log('Processing URLs for indexing:', urls);

                // Open dialog with URLs pre-filled
                setIsDialogOpen(true);
            }
    };

    // Handle paste only when dropzone is focused
    const handleDropzonePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
        e.preventDefault();
        await handlePaste(e.nativeEvent);
    };

    if (uiType === "dropzone") {
        return (
            <>
                <div className="relative">
                    <div
                        ref={dropzoneRef}
                        className={cn(
                            "border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                            dropzoneClassName
                        )}
                        onClick={() => setIsDialogOpen(true)}
                        onPaste={handleDropzonePaste}
                        tabIndex={0}
                    >
                        <Link className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                        <p className="text-sm font-medium mb-2">Index from Websites</p>
                        <p className="text-xs text-muted-foreground">
                            Click & Paste your URLs
                        </p>
                    </div>

                    {/* Simple status text (fire-and-forget) */}
                    {indexingStatus && (
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded-md border">
                            {indexingStatus}
                        </div>
                    )}
                </div>

                <UrlIndexingDialog
                    isOpen={isDialogOpen}
                    onClose={() => setIsDialogOpen(false)}
                    onSubmit={async ({ url, indexingLimit, crawlVideos, tags, projectId, projectDisplayName }) => {
                        setIndexingLimit(indexingLimit);
                            setIsDialogOpen(false);
                            const pid = projectId ?? 'default';
                            lastProjectIdRef.current = projectId ?? null;
                            const clientId = session?.clientId ?? "default";
                            const randomSuffix = Math.random().toString(36).slice(2, 11);
                            const indexingId = `${clientId}_${pid}_${randomSuffix}`;
                            try {
                                await trigger({
                                    siteLinks: [url],
                                    projectId: pid,
                                    projectDisplayName: projectDisplayName ?? undefined,
                                    indexingId,
                                    indexingLimit,
                                    tags,
                                    crawlVideos,
                                    dbFolder: `mediamake/scraped/${pid}`,
                                });
                                setIndexingStatus("Indexing triggered. It will continue in the background.");
                                setTimeout(() => setIndexingStatus(""), 5000);
                            } catch (err) {
                                console.error('Failed to trigger batch indexing:', err);
                                setIndexingStatus("Failed to trigger indexing");
                            }
                        }}
                        loading={loading}
                    preselectedTags={hashtagFilters}
                />
            </>
        );
    }

    return (
        <>
            <Button
                variant={variant}
                size={size}
                className={className}
                onClick={() => setIsDialogOpen(true)}
            >
                {children || (
                    <>
                        <Link className="h-4 w-4 mr-2" />
                        Paste URL
                    </>
                )}
            </Button>

            <UrlIndexingDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSubmit={async ({ url, indexingLimit, crawlVideos, tags, projectId, projectDisplayName }) => {
                    setIndexingLimit(indexingLimit);
                    setIsDialogOpen(false);
                    const pid = projectId ?? 'default';
                    lastProjectIdRef.current = projectId ?? null;
                    const clientId = session?.clientId ?? "default";
                    const randomSuffix = Math.random().toString(36).slice(2, 11);
                    const indexingId = `${clientId}_${pid}_${randomSuffix}`;
                    try {
                        await trigger({
                            siteLinks: [url],
                            projectId: pid,
                            projectDisplayName: projectDisplayName ?? undefined,
                            indexingId,
                            indexingLimit,
                            tags,
                            crawlVideos,
                            dbFolder: `mediamake/scraped/${pid}`,
                        });
                        setIndexingStatus("Indexing triggered. It will continue in the background.");
                        setTimeout(() => setIndexingStatus(""), 5000);
                    } catch (err) {
                        console.error('Failed to trigger batch indexing:', err);
                        setIndexingStatus("Failed to trigger indexing");
                    }
                }}
                loading={loading}
                preselectedTags={hashtagFilters}
            />
        </>
    );
}
