"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { UploadDialog } from "./upload-dialog";
import { Dropzone } from "./dropzone";
import { cn } from "@/lib/utils";

interface UploadTriggerProps {
    onUploadComplete?: (mediaFiles: any[]) => void;
    variant?: "default" | "outline" | "ghost" | "secondary";
    size?: "default" | "sm" | "lg";
    className?: string;
    children?: React.ReactNode;
    uiType?: "button" | "dropzone";
    dropzoneClassName?: string;
    maxFiles?: number;
    autoUpload?: boolean;
    preselectedTags?: string[];
    pickerMode?: boolean;
    selectedProjectId?: string | null;
}

export function UploadTrigger({
    onUploadComplete,
    variant = "default",
    size = "default",
    className,
    children,
    uiType = "button",
    dropzoneClassName,
    maxFiles = 10,
    autoUpload = false,
    preselectedTags = [],
    pickerMode = false,
    selectedProjectId = null,
}: UploadTriggerProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadStatus, setDownloadStatus] = useState<string>("");
    const dropzoneRef = useRef<HTMLDivElement>(null);

    const handleUploadComplete = (mediaFiles: any[]) => {
        onUploadComplete?.(mediaFiles);
        setIsDialogOpen(false);
        setSelectedFiles([]);
    };

    // Global paste handling for picker mode
    useEffect(() => {
        if (!pickerMode) return;

        const handleGlobalPaste = async (e: ClipboardEvent) => {
            // Don't interfere with paste in input fields, textareas, or contenteditable elements
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.contentEditable === 'true' ||
                target.closest('input, textarea, [contenteditable]')) {
                return;
            }

            // Use the existing handlePaste logic
            await handlePaste(e);
        };

        document.addEventListener('paste', handleGlobalPaste);
        return () => document.removeEventListener('paste', handleGlobalPaste);
    }, [pickerMode]);

    const onDrop = (acceptedFiles: File[]) => {
        if (uiType === "dropzone") {
            setSelectedFiles(acceptedFiles);
            setIsDialogOpen(true);
        }
    };

    // Handle paste button click
    const handlePasteClick = async () => {
        try {
            // Access clipboard data directly
            const clipboardItems = await navigator.clipboard.read();
            const files: File[] = [];
            const urls: string[] = [];

            // Process clipboard items
            for (const item of clipboardItems) {
                if (item.types.includes('text/plain')) {
                    const text = await item.getType('text/plain');
                    const textContent = await text.text();

                    // Check if it's a URL
                    try {
                        const url = new URL(textContent);
                        if (url.protocol === 'http:' || url.protocol === 'https:') {
                            urls.push(textContent);
                        }
                    } catch (error) {
                        // Not a URL, ignore
                    }
                }

                if (item.types.some(type => type.startsWith('image/'))) {
                    const blob = await item.getType(item.types.find(type => type.startsWith('image/'))!);
                    const file = new File([blob], 'pasted-image.png', { type: blob.type });
                    files.push(file);
                }
            }

            // Handle files from clipboard
            if (files.length > 0) {
                setDownloadStatus("Processing pasted files...");
                setSelectedFiles(files);
                setIsDialogOpen(true);
                setDownloadStatus("");
            }

            // Handle URLs from clipboard
            if (urls.length > 0) {
                console.log('Processing URLs:', urls);
                setIsDownloading(true);
                setDownloadStatus(`Downloading from ${urls.length} URL${urls.length > 1 ? 's' : ''}...`);

                // Download and convert URLs to files
                const urlFiles = await Promise.all(
                    urls.map(async (url) => {
                        try {
                            console.log('Downloading URL:', url);
                            setDownloadStatus(`Downloading: ${url.length > 50 ? url.substring(0, 50) + '...' : url}`);

                            const response = await fetch('/api/download-media', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ url })
                            });

                            console.log('Download response status:', response.status);
                            if (response.ok) {
                                const blob = await response.blob();
                                console.log('Downloaded blob:', blob.type, blob.size);
                                const fileName = url.split('/').pop() || 'downloaded-file';
                                const file = new (File as any)([blob], fileName, { type: blob.type });
                                return file as File;
                            } else {
                                const errorText = await response.text();
                                console.error('Download failed:', response.status, errorText);
                            }
                        } catch (error) {
                            console.error('Error downloading from URL:', error);
                        }
                        return null;
                    })
                );

                const validFiles = urlFiles.filter((file): file is File => file !== null);
                if (validFiles.length > 0) {
                    setDownloadStatus("Opening upload dialog...");
                    setSelectedFiles(validFiles);
                    setIsDialogOpen(true);
                }

                setIsDownloading(false);
                setDownloadStatus("");
            }

        } catch (error) {
            console.error('Error accessing clipboard:', error);
            // Show a message to the user
            alert('Unable to access clipboard. Please try copying an image and using Ctrl+V instead.');
        }
    };

    // Handle clipboard paste
    const handlePaste = async (e: ClipboardEvent) => {
        e.preventDefault();

        const items = e.clipboardData?.items;
        if (!items) return;

        const files: File[] = [];
        const urls: string[] = [];

        // Process all items first
        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            if (item.kind === 'file') {
                const file = item.getAsFile();
                if (file) {
                    files.push(file);
                }
            } else if (item.kind === 'string' && item.type === 'text/plain') {
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

        // Handle files from clipboard
        if (files.length > 0) {
            setDownloadStatus("Processing pasted files...");
            setSelectedFiles(files);
            setIsDialogOpen(true);
            setDownloadStatus("");
        }

        // Handle URLs from clipboard
        if (urls.length > 0) {
            console.log('Processing URLs:', urls);
            setIsDownloading(true);
            setDownloadStatus(`Downloading from ${urls.length} URL${urls.length > 1 ? 's' : ''}...`);

            // Download and convert URLs to files
            const urlFiles = await Promise.all(
                urls.map(async (url) => {
                    try {
                        console.log('Downloading URL:', url);
                        setDownloadStatus(`Downloading: ${url.length > 50 ? url.substring(0, 50) + '...' : url}`);

                        const response = await fetch('/api/download-media', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ url })
                        });

                        console.log('Download response status:', response.status);
                        if (response.ok) {
                            const blob = await response.blob();
                            console.log('Downloaded blob:', blob.type, blob.size);
                            const fileName = url.split('/').pop() || 'downloaded-file';
                            const file = new (File as any)([blob], fileName, { type: blob.type });
                            return file as File;
                        } else {
                            const errorText = await response.text();
                            console.error('Download failed:', response.status, errorText);
                        }
                    } catch (error) {
                        console.error('Error downloading from URL:', error);
                    }
                    return null;
                })
            );

            const validFiles = urlFiles.filter((file): file is File => file !== null);
            if (validFiles.length > 0) {
                setDownloadStatus("Opening upload dialog...");
                setSelectedFiles(validFiles);
                setIsDialogOpen(true);
            }

            setIsDownloading(false);
            setDownloadStatus("");
        }
    };



    if (uiType === "dropzone") {
        return (
            <>
                <div className="relative">
                    <Dropzone
                        onDrop={onDrop}
                        onPaste={handlePaste}
                        onPasteClick={handlePasteClick}
                        maxFiles={maxFiles}
                        className={cn("p-8", dropzoneClassName)}
                        uploadLinkText="click to upload"
                        description="Drop your files here or"
                        hint={`Max ${maxFiles} files • Copy/Paste Image / URLs`}
                        showPasteButton={true}
                        pasteButtonText="Paste Image"
                    />

                    {/* Download Progress Overlay */}
                    {isDownloading && (
                        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center z-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                            <p className="text-sm text-muted-foreground text-center px-4">
                                {downloadStatus}
                            </p>
                        </div>
                    )}
                </div>

                <UploadDialog
                    isOpen={isDialogOpen}
                    onClose={() => {
                        setIsDialogOpen(false);
                        setSelectedFiles([]);
                    }}
                    onUploadComplete={handleUploadComplete}
                    initialFiles={selectedFiles}
                    autoUpload={autoUpload}
                    preselectedTags={preselectedTags}
                    selectedProjectId={selectedProjectId}
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
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Files
                    </>
                )}
            </Button>

            <UploadDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onUploadComplete={handleUploadComplete}
                autoUpload={autoUpload}
                preselectedTags={preselectedTags}
                selectedProjectId={selectedProjectId}
            />
        </>
    );
}
