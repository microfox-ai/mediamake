"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dropzone } from "./dropzone";
import { cn } from "@/lib/utils";
import {
    Upload,
    X,
    FileVideo,
    FileAudio,
    Image,
    Link,
    Youtube,
    Check,
    AlertCircle
} from "lucide-react";
import { TagMultiSelect } from "@/components/ui/tag-multi-select";
import { useSession } from "@/components/session-provider";
import { callAgent } from "@/components/agents/agent-helper";
import { useWorkflowJob } from "@/hooks/useWorkflowJob";

interface UploadDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onUploadComplete: (mediaFiles: any[]) => void;
    initialFiles?: File[];
    autoUpload?: boolean;
    preselectedTags?: string[];
    selectedProjectId?: string | null;
}

interface UploadProgress {
    file: File;
    status: 'pending' | 'uploading' | 'completed' | 'error';
    progress: number;
    mediaUrl?: string;
    error?: string;
}

export function UploadDialog({
    isOpen,
    onClose,
    onUploadComplete,
    initialFiles = [],
    autoUpload = false,
    preselectedTags = [],
    selectedProjectId = null,
}: UploadDialogProps) {
    const session = useSession();
    const [files, setFiles] = useState<File[]>(initialFiles);
    const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadComplete, setUploadComplete] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [uploadedMedia, setUploadedMedia] = useState<any[]>([]);
    const [isCreatingEntries, setIsCreatingEntries] = useState(false);
    const [entryCreationProgress, setEntryCreationProgress] = useState<number>(0);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadStatus, setDownloadStatus] = useState<string>("");

    // File parameters
    const [contentSubType, setContentSubType] = useState<string>('full');
    const [contentSource, setContentSource] = useState<string>('upload');
    const [selectedTags, setSelectedTags] = useState<string[]>(preselectedTags);
    const [analyzeAudio, setAnalyzeAudio] = useState<boolean>(true);
    const [projects, setProjects] = useState<{ id: string; displayName: string }[]>([]);
    const [projectsLoading, setProjectsLoading] = useState(false);
    const [selectedProject, setSelectedProject] = useState<{ id: string; displayName: string } | null>(null);
    const [analyzeImages, setAnalyzeImages] = useState<boolean>(true);
    const [generateDescription, setGenerateDescription] = useState<boolean>(true);
    const [generateKeywords, setGenerateKeywords] = useState<boolean>(true);

    // Abort controller for upload cancellation
    const abortControllerRef = useRef<AbortController | null>(null);
    const uploadInProgressRef = useRef<boolean>(false);

    const {
        trigger: triggerMediaIndexWorker,
        status: mediaIndexStatus,
        loading: mediaIndexLoading,
        polling: mediaIndexPolling,
        reset: resetMediaIndexWorker,
    } = useWorkflowJob({
        type: "worker",
        workerId: "sparkboard-index",
        pollIntervalMs: 5000,
        pollTimeoutMs: 900_000,
        autoPoll: true,
    });

    // Fetch projects when dialog opens
    useEffect(() => {
        if (!isOpen) return;
        const loadProjects = async () => {
            try {
                setProjectsLoading(true);
                const headers: Record<string, string> = {};
                if (session?.clientId) {
                    headers["x-client-id"] = session.clientId;
                }
                const res = await fetch("/api/project", { headers });
                if (!res.ok) {
                    setProjects([]);
                    return;
                }
                const data = await res.json();
                if (Array.isArray(data)) {
                    setProjects(data);
                    if (selectedProjectId) {
                        const match = data.find((p: any) => p.id === selectedProjectId);
                        if (match) {
                            setSelectedProject({ id: match.id, displayName: match.displayName });
                        }
                    }
                } else {
                    setProjects([]);
                }
            } catch {
                setProjects([]);
            } finally {
                setProjectsLoading(false);
            }
        };
        loadProjects();
    }, [isOpen, session?.clientId, selectedProjectId]);

    // Update files when initialFiles prop changes, but only if files array is empty
    // This prevents overwriting files that were added via paste or drop
    useEffect(() => {
        if (initialFiles.length > 0 && files.length === 0) {
            setFiles(initialFiles);
        }
    }, [initialFiles, files.length]);

    // Initialize upload progress when files change
    useEffect(() => {
        if (files.length > 0) {
            const progress = files.map(file => ({
                file,
                status: 'pending' as const,
                progress: 0,
            }));
            setUploadProgress(progress);
        }
    }, [files]);

    // Auto-upload effect (only uploads to S3, doesn't create database entries)
    useEffect(() => {
        if (autoUpload && files.length > 0 && !uploadInProgressRef.current) {
            // Start countdown
            setCountdown(0.5);
            const countdownInterval = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 0.1) {
                        clearInterval(countdownInterval);
                        uploadFilesToS3(); // Only upload to S3, don't create database entries
                        return 0;
                    }
                    return prev - 0.1;
                });
            }, 100);

            return () => clearInterval(countdownInterval);
        }
    }, [files.length, autoUpload]); // Only depend on files.length and autoUpload

    const uploadFilesToS3 = async () => {
        if (files.length === 0 || uploadInProgressRef.current) return;

        // Cancel any existing upload
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Create new abort controller
        abortControllerRef.current = new AbortController();
        uploadInProgressRef.current = true;
        setIsUploading(true);

        // Start with uploading status
        setUploadProgress(prev =>
            prev.map(item => ({
                ...item,
                status: 'uploading' as const,
                progress: 0,
            }))
        );

        try {
            // Upload all files in parallel while tracking per-file progress
            const uploadPromises = files.map((file, index) => (async () => {
                // 1. Get Presigned URL
                const presignedResponse = await fetch(
                    `/api/upload-url?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}`,
                    {
                        signal: abortControllerRef.current?.signal,
                    },
                );

                if (!presignedResponse.ok) {
                    throw new Error(`Failed to get upload URL for ${file.name}`);
                }

                const { uploadUrl, publicUrl } = await presignedResponse.json();

                // 2. Upload to S3 with progress tracking
                await new Promise<void>((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open('PUT', uploadUrl);
                    xhr.setRequestHeader('Content-Type', file.type);
                    xhr.setRequestHeader('x-amz-acl', 'public-read'); // Ensure ACL matches signature

                    xhr.upload.onprogress = (event) => {
                        if (event.lengthComputable) {
                            const percentComplete = (event.loaded / event.total) * 100;
                            setUploadProgress(prev =>
                                prev.map((item, idx) =>
                                    idx === index ? { ...item, progress: percentComplete } : item,
                                ),
                            );
                        }
                    };

                    xhr.onload = () => {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            resolve();
                        } else {
                            reject(new Error(`Upload failed with status ${xhr.status}`));
                        }
                    };

                    xhr.onerror = () => reject(new Error('Network error during upload'));
                    xhr.onabort = () => reject(new Error('Upload aborted'));

                    // Handle cancellation
                    if (abortControllerRef.current) {
                        abortControllerRef.current.signal.addEventListener('abort', () => {
                            xhr.abort();
                        });
                    }

                    xhr.send(file);
                });

                // Mark as completed for this file
                setUploadProgress(prev =>
                    prev.map((item, idx) =>
                        idx === index
                            ? {
                                  ...item,
                                  status: 'completed' as const,
                                  progress: 100,
                                  mediaUrl: publicUrl,
                              }
                            : item,
                    ),
                );

                return {
                    mediaName: file.name,
                    mediaType: file.type,
                    mediaFormat: file.name.split('.').pop() || 'file',
                    mediaUrl: publicUrl,
                };
            })());

            const uploadedMediaResults = await Promise.all(uploadPromises);

            // Store uploaded media for later use
            setUploadedMedia(uploadedMediaResults);
            return uploadedMediaResults;

        } catch (error) {
            // Don't show error if upload was aborted
            if (error instanceof Error && (error.name === 'AbortError' || error.message === 'Upload aborted')) {
                console.log('Upload cancelled');
                return;
            }

            console.error('Error uploading files:', error);
            setUploadProgress(prev =>
                prev.map(item => ({
                    ...item,
                    status: 'error' as const,
                    error: error instanceof Error ? error.message : 'Upload failed',
                }))
            );
            throw error;
        } finally {
            setIsUploading(false);
            uploadInProgressRef.current = false;
            abortControllerRef.current = null;
        }
    };

    const createMediaFileEntries = async (uploadedMedia: any[]) => {
        if (uploadedMedia.length === 0 || selectedTags.length === 0) return;

        try {
            setIsCreatingEntries(true);
            setEntryCreationProgress(0);

            const createdMediaFiles: any[] = [];
            let completedCount = 0;

            // Trigger indexing for all files in parallel and wait for all to complete
            const indexingPromises = uploadedMedia.map(async (media, index) => {
                const file = files[index];
                const detectedContentType = detectContentType(file);
                const projectIdToUse = selectedProject?.id ?? null;

                const mediaFileData: Record<string, unknown> = {
                    tags: selectedTags,
                    clientId: session?.clientId ?? 'default',
                    contentType: detectedContentType,
                    contentMimeType: media.mediaType || file.type || "application/octet-stream",
                    contentSubType,
                    contentSource,
                    contentSourceUrl: contentSource !== 'upload' ? media.mediaUrl : "upload",
                    fileName: media.mediaName,
                    fileSize: file.size,
                    filePath: media.mediaUrl,
                    analyzeImage: analyzeImages,
                    generateDescription,
                    generateKeywords,
                };
                if (projectIdToUse) {
                    mediaFileData.projectId = projectIdToUse;
                }

                // Trigger worker and wait for completion for this file
                const workerResult = await triggerMediaIndexWorker(mediaFileData as Record<string, unknown>);

                const result: any = { input: mediaFileData, workerResult };

                // Run audio analysis if it's an audio file and analyzeAudio is enabled
                if (detectedContentType === 'audio' && analyzeAudio && media.mediaUrl) {
                    try {
                        console.log('Running audio analysis for:', media.mediaName);

                        const analysisResult = await callAgent('audio-analysis', {
                            audioUrls: [media.mediaUrl],
                            clientId: 'default',
                            tags: selectedTags,
                            userRequest: `Analyze audio file: ${media.mediaName}`,
                            analysisOptions: {
                                extractWaveform: true,
                                analyzeFrequency: true,
                                detectBeats: true,
                            },
                        });

                        console.log('Audio analysis completed for:', media.mediaName);

                        result.analysisResult = analysisResult;
                    } catch (analysisError) {
                        console.warn('Error running audio analysis:', analysisError);
                    }
                }

                createdMediaFiles.push(result);

                // Update progress based on number of completed index jobs
                completedCount += 1;
                setEntryCreationProgress(() => {
                    const newProgress = (completedCount / uploadedMedia.length) * 100;
                    return Math.round(newProgress);
                });
            });

            await Promise.all(indexingPromises);

            setUploadComplete(true);
            setIsCreatingEntries(false);
            onUploadComplete(createdMediaFiles);

            // Auto-close after 2 seconds
            setTimeout(() => {
                handleClose();
            }, 2000);

        } catch (error) {
            console.error('Error creating media file entries:', error);
            setIsCreatingEntries(false);
            setEntryCreationProgress(0);
            throw error;
        }
    };

    const uploadFiles = async () => {
        if (files.length === 0 || selectedTags.length === 0 || uploadInProgressRef.current) return;

        try {
            let mediaToUse = uploadedMedia;

            // If files haven't been uploaded to S3 yet, upload them first
            if (uploadedMedia.length === 0) {
                mediaToUse = await uploadFilesToS3() ?? [];
            }

            // Then create database entries
            await createMediaFileEntries(mediaToUse);

        } catch (error) {
            console.error('Error in upload process:', error);
        }
    };

    const handleClose = () => {
        // Cancel any ongoing uploads
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        setFiles([]);
        setUploadProgress([]);
        setIsUploading(false);
        setUploadComplete(false);
        setSelectedTags([]);
        setUploadedMedia([]);
        setCountdown(0);
                        setSelectedProject(null);
        setAnalyzeImages(true);
        setGenerateDescription(true);
        setGenerateKeywords(true);
        uploadInProgressRef.current = false;
        abortControllerRef.current = null;
        onClose();
    };

    const handleOpenChange = (open: boolean) => {
        // Only reset when dialog is closing, not when opening
        if (!open) {
            handleClose();
        }
    };

    // Reset files when dialog closes (but not when it opens)
    useEffect(() => {
        if (!isOpen) {
            setFiles([]);
            setUploadProgress([]);
        }
    }, [isOpen]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // Handle clipboard paste in dialog
    const handleDialogPaste = async (e: ClipboardEvent) => {
        if (!isOpen) return;

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

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
                        urls.push(text);
                    }
                } catch {
                    // Not a valid URL, ignore
                }
            }
        }

        // Handle files from clipboard - append to existing files
        if (files.length > 0) {
            setDownloadStatus("Processing pasted files...");
            setFiles(prev => {
                // Check for duplicates by name and size to avoid adding the same file twice
                const newFiles = files.filter(newFile =>
                    !prev.some(existingFile =>
                        existingFile.name === newFile.name &&
                        existingFile.size === newFile.size &&
                        existingFile.lastModified === newFile.lastModified
                    )
                );
                return [...prev, ...newFiles];
            });
            setDownloadStatus("");
        }

        // Handle URLs from clipboard - append to existing files
        if (urls.length > 0) {
            setIsDownloading(true);
            setDownloadStatus(`Downloading from ${urls.length} URL${urls.length > 1 ? 's' : ''}...`);

            // Download and convert URLs to files
            const urlFiles = await Promise.all(
                urls.map(async (url) => {
                    try {
                        setDownloadStatus(`Downloading: ${url.length > 50 ? url.substring(0, 50) + '...' : url}`);

                        const response = await fetch('/api/download-media', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ url })
                        });

                        if (response.ok) {
                            const blob = await response.blob();
                            const fileName = url.split('/').pop() || 'downloaded-file';
                            const file = new (File as any)([blob], fileName, { type: blob.type });
                            return file as File;
                        }
                    } catch (error) {
                        console.error('Error downloading from URL:', error);
                    }
                    return null;
                })
            );

            const validFiles = urlFiles.filter((file): file is File => file !== null);
            if (validFiles.length > 0) {
                setDownloadStatus("Adding files to upload...");
                setFiles(prev => {
                    // Check for duplicates by name and size to avoid adding the same file twice
                    const newFiles = validFiles.filter(newFile =>
                        !prev.some(existingFile =>
                            existingFile.name === newFile.name &&
                            existingFile.size === newFile.size &&
                            existingFile.lastModified === newFile.lastModified
                        )
                    );
                    return [...prev, ...newFiles];
                });
            }

            setIsDownloading(false);
            setDownloadStatus("");
        }
    };


    const getContentTypeIcon = (contentType: string) => {
        switch (contentType) {
            case 'video':
                return <FileVideo className="h-4 w-4" />;
            case 'audio':
                return <FileAudio className="h-4 w-4" />;
            case 'image':
                return <Image className="h-4 w-4" />;
            default:
                return <FileVideo className="h-4 w-4" />;
        }
    };

    const canUpload = files.length > 0 && !isUploading && !uploadInProgressRef.current;
    const canCreateEntries = files.length > 0 && selectedTags.length > 0 && !isUploading && !uploadInProgressRef.current && !isCreatingEntries;

    // Function to detect content type from file
    const detectContentType = (file: File): 'video' | 'audio' | 'image' | 'document' | 'unknown' => {
        const mimeType = file.type.toLowerCase();

        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType.startsWith('audio/')) return 'audio';
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text/')) return 'document';

        return 'unknown';
    };

    // Internal dropzone functionality
    const onDrop = useCallback((acceptedFiles: File[]) => {
        setFiles(prev => [...prev, ...acceptedFiles]);
    }, []);


    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {getContentTypeIcon('video')}
                        Upload Media Files
                        {autoUpload && (
                            <Badge variant="secondary" className="ml-2">
                                Auto-Upload
                            </Badge>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        {autoUpload
                            ? "Files will upload to S3 automatically when dropped. Configure parameters and click 'CREATE ENTRIES' to save to database."
                            : "Upload files to S3, then configure parameters and click 'ADD' to create database entries."
                        }
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="files" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="files">Files ({files.length})</TabsTrigger>
                        <TabsTrigger value="parameters">Parameters</TabsTrigger>
                    </TabsList>

                    <TabsContent value="files" className="space-y-4">
                        {/* File List */}
                        {files.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label>Selected Files ({files.length})</Label>
                                    {autoUpload && countdown > 0 && (
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="animate-pulse">
                                                Auto-upload in {countdown < 1 ? `${Math.round(countdown * 1000)}ms` : `${countdown}s`}
                                            </Badge>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setCountdown(0);
                                                }}
                                                className="h-6 px-2 text-xs"
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                                    {uploadProgress.map((item, index) => {
                                        const isImage = item.file.type.startsWith('image/');
                                        const isVideo = item.file.type.startsWith('video/');
                                        const isAudio = item.file.type.startsWith('audio/');

                                        return (
                                            <Card key={`${item.file.name}-${index}`} className="relative overflow-hidden p-0 m-0">
                                                <CardContent className="p-0">
                                                    {/* Media Preview */}
                                                    <div className="relative aspect-video bg-muted flex items-center justify-center">
                                                        {isImage ? (
                                                            <img
                                                                src={URL.createObjectURL(item.file)}
                                                                alt={item.file.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : isVideo ? (
                                                            <video
                                                                src={URL.createObjectURL(item.file)}
                                                                className="w-full h-full object-cover"
                                                                muted
                                                            />
                                                        ) : (
                                                            <div className="flex flex-col items-center justify-center p-4">
                                                                {getContentTypeIcon(item.file.type.split('/')[0] as any)}
                                                                <span className="text-xs text-muted-foreground mt-2">
                                                                    {item.file.type.split('/')[0]}
                                                                </span>
                                                            </div>
                                                        )}

                                                        {/* Upload Status Overlay */}
                                                        {item.status === 'uploading' && (
                                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                                <div className="animate-pulse bg-white/20 rounded-full p-4">
                                                                    <Upload className="h-6 w-6 text-white" />
                                                                </div>
                                                            </div>
                                                        )}

                                                        {item.status === 'completed' && (
                                                            <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                                                                <Check className="h-4 w-4 text-white" />
                                                            </div>
                                                        )}

                                                        {item.status === 'error' && (
                                                            <div className="absolute top-2 right-2 bg-red-500 rounded-full p-1">
                                                                <AlertCircle className="h-4 w-4 text-white" />
                                                            </div>
                                                        )}

                                                        {/* Remove Button */}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                const newFiles = files.filter((_, i) => i !== index);
                                                                setFiles(newFiles);
                                                            }}
                                                            className="absolute top-2 left-2 h-6 w-6 p-0 bg-black/50 hover:bg-black/70 text-white"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </Button>
                                                    </div>

                                                    {/* File Info */}
                                                    <div className="p-3 space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm font-medium truncate" title={item.file.name}>
                                                                {item.file.name}
                                                            </span>
                                                            <Badge variant="secondary" className="text-xs">
                                                                {(item.file.size / 1024 / 1024).toFixed(2)} MB
                                                            </Badge>
                                                            <Badge variant="outline" className="text-xs text-blue-600">
                                                                {detectContentType(item.file).toUpperCase()}
                                                            </Badge>
                                                        </div>

                                                        {item.status === 'uploading' && (
                                                            <div className="space-y-1">
                                                                <Progress value={item.progress} className="h-2" />
                                                                <p className="text-xs text-muted-foreground">
                                                                    Uploading... {item.progress}%
                                                                </p>
                                                            </div>
                                                        )}

                                                        {item.status === 'error' && (
                                                            <p className="text-xs text-red-500">{item.error}</p>
                                                        )}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Dropzone */}
                        <div className="space-y-2">
                            <Label>Add Files</Label>
                            <div className="relative">
                                <Dropzone
                                    onDrop={onDrop}
                                    onPaste={handleDialogPaste}
                                    maxFiles={10}
                                    uploadLinkText="click to select"
                                    description="Drag & drop files here or"
                                    hint="Copy/Paste Image / URLs"
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
                        </div>
                    </TabsContent>

                    <TabsContent value="parameters" className="space-y-4">
                        {/* Status Message */}
                        {uploadedMedia.length > 0 && selectedTags.length === 0 && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <p className="text-sm text-blue-700">
                                        Files uploaded to S3 successfully! Please select tags and configure parameters to create database entries.
                                    </p>
                                </div>
                            </div>
                        )}


                        {/* Project selection */}
                        <div className="space-y-2">
                            <Label>Project</Label>
                            <Select
                                value={selectedProject?.id ?? 'default'}
                                onValueChange={(value) => {
                                    if (value === 'default') {
                                        setSelectedProject(null);
                                    } else {
                                        const p = projects.find((proj) => proj.id === value);
                                        if (p) {
                                            setSelectedProject({ id: p.id, displayName: p.displayName });
                                        }
                                    }
                                }}
                                disabled={projectsLoading}
                            >
                                <SelectTrigger className="w-64">
                                    <SelectValue placeholder={projectsLoading ? "Loading projects..." : "Stocksearch (shared namespace)"} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="default">Stocksearch (shared namespace)</SelectItem>
                                    {projects.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.displayName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                Choose a project to associate with these media files, or use Default to keep them in the global stocksearch namespace.
                            </p>
                        </div>

                        {/* Content Sub Type */}
                        <div className="space-y-2">
                            <Label>Content Sub Type</Label>
                            <Input
                                value={contentSubType}
                                onChange={(e) => setContentSubType(e.target.value)}
                                placeholder="e.g., clip, full, preview, etc."
                            />
                        </div>

                        {/* Content Source */}
                        <div className="space-y-2">
                            <Label>Content Source</Label>
                            <Input
                                value={contentSource}
                                onChange={(e) => setContentSource(e.target.value)}
                                placeholder="e.g., upload, web, youtube, pinterest, etc."
                            />
                        </div>

                        {/* Image AI Analysis */}
                        <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="analyzeImages"
                                    checked={analyzeImages}
                                    onCheckedChange={(checked) => setAnalyzeImages(checked as boolean)}
                                />
                                <Label htmlFor="analyzeImages" className="text-sm">
                                    Analyze Images with AI
                                </Label>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                When enabled, images will be sent to the AI analysis pipeline for descriptions & tags and indexed into the visual search (RAG) system.
                            </p>

                            {analyzeImages && (
                                <div className="ml-6 space-y-2">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="generateDescription"
                                            checked={generateDescription}
                                            onCheckedChange={(checked) => {
                                                const v = checked as boolean;
                                                setGenerateDescription(v);
                                                if (!v && !generateKeywords) setAnalyzeImages(false);
                                            }}
                                        />
                                        <Label htmlFor="generateDescription" className="text-xs">
                                            Generate description
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="generateKeywords"
                                            checked={generateKeywords}
                                            onCheckedChange={(checked) => {
                                                const v = checked as boolean;
                                                setGenerateKeywords(v);
                                                if (!v && !generateDescription) setAnalyzeImages(false);
                                            }}
                                        />
                                        <Label htmlFor="generateKeywords" className="text-xs">
                                            Generate keywords
                                        </Label>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Audio Analysis */}
                        <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="analyzeAudio"
                                    checked={analyzeAudio}
                                    onCheckedChange={(checked) => setAnalyzeAudio(checked as boolean)}
                                />
                                <Label htmlFor="analyzeAudio" className="text-sm">
                                    Analyze Audio Files
                                </Label>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Automatically analyze audio files for mood, genre, and technical characteristics.
                            </p>
                        </div>

                        {/* Tags */}
                        <TagMultiSelect
                            selectedTags={selectedTags}
                            onTagsChange={setSelectedTags}
                            label={`Tags${selectedTags.length === 0 && uploadedMedia.length > 0 ? ' (Required to create entries)' : ''}`}
                            required={uploadedMedia.length > 0}
                        />

                    </TabsContent>
                </Tabs>

                <DialogFooter className="flex flex-col gap-3">
                    {/* Entry Creation Progress Bar */}
                    {isCreatingEntries && (
                        <div className="w-full space-y-2">
                            <div className="flex justify-between text-sm text-muted-foreground">
                                <span>
                                    Creating database entries...
                                    {mediaIndexStatus && mediaIndexStatus !== 'idle'
                                        ? ` (${mediaIndexStatus})`
                                        : null}
                                </span>
                                <span>{entryCreationProgress}%</span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-2">
                                <div
                                    className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${entryCreationProgress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleClose}>
                            Cancel
                        </Button>
                        <Button
                            onClick={uploadFiles}
                            disabled={uploadedMedia.length > 0 ? !canCreateEntries : !canUpload || (autoUpload && countdown > 0)}
                            className="min-w-[120px]"
                        >
                            {isCreatingEntries ? 'Creating Entries...' : isUploading || uploadInProgressRef.current ? 'Uploading...' : uploadComplete ? 'Complete!' : autoUpload && countdown > 0 ? `Auto-upload in ${countdown < 1 ? `${Math.round(countdown * 1000)}ms` : `${countdown}s`}` : uploadedMedia.length > 0 ? `+ CREATE ENTRIES (${files.length})` : `+ ADD (${files.length})`}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
