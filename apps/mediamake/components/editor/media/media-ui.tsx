"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { httpCache } from '@/lib/audio-cache';
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogPortal,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DialogOverlay, DialogTitle } from "@radix-ui/react-dialog";
import { Expand, ExternalLink, Film, User, View, XIcon, ClipboardIcon, Copy, Search, Palette, Play, Pause, Volume2, FileText, Download, MoreVertical, Edit, Trash2, Link, Check, Scissors, Loader2 } from "lucide-react";
import { UiCommonTypes } from "@microfox/types";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { MediaFile } from "@/app/types/media";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useVideoThumbnail } from "@/hooks/use-video-thumbnail";

const VideoThumbnail = ({
    src,
    title,
}: {
    src: string;
    title?: string;
}) => {
    const { thumbnailSrc } = useVideoThumbnail(src, {
        timeInSeconds: 2,
        width: 240,
    });

    if (thumbnailSrc) {
        return (
            <div className="relative w-full aspect-video bg-black">
                <img
                    src={thumbnailSrc}
                    alt={title ?? "Video thumbnail"}
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Play className="w-8 h-8 text-white" />
                </div>
            </div>
        );
    }

    return (
        <div className="w-full aspect-video bg-black flex items-center justify-center">
            <Play className="w-8 h-8 text-white" />
        </div>
    );
};

export type MediaDialogItem = {
    type: "image";
    image: UiCommonTypes["ImageSet"];
    video?: never;
    audio?: never;
    document?: never;
} | {
    type: "video-embed";
    video: UiCommonTypes["VideoSet"] & { metadata?: any };
    image?: never;
    audio?: never;
    document?: never;
} | {
    type: "video-direct";
    video: { src: string; title?: string; creator?: string; views?: number; duration?: string; metadata?: any };
    image?: never;
    audio?: never;
    document?: never;
} | {
    type: "audio";
    audio: { src: string; title?: string; creator?: string; duration?: string; metadata?: any };
    image?: never;
    video?: never;
    document?: never;
} | {
    type: "document";
    document: { src: string; title?: string; fileType?: string; fileSize?: number; metadata?: any };
    image?: never;
    video?: never;
    audio?: never;
}

const VideoEmbed = ({ video }: { video: UiCommonTypes["VideoSet"] }) => {
    const getEmbedUrl = (url: string) => {
        if (url.includes("youtube.com/watch?v=")) {
            const videoId = url.split("v=")[1]?.split("&")[0];
            return `https://www.youtube.com/embed/${videoId}`;
        } else if (url.includes("youtu.be/")) {
            const videoId = url.split("youtu.be/")[1]?.split("?")[0];
            return `https://www.youtube.com/embed/${videoId}`;
        } else if (url.includes("dailymotion.com/video/")) {
            const videoId = url.split("/video/")[1]?.split("?")[0];
            return `https://www.dailymotion.com/embed/video/${videoId}`;
        }
        return url;
    };

    const embedUrl = getEmbedUrl(video.src);

    if (!embedUrl) {
        return <div className="w-full aspect-video bg-black flex items-center justify-center text-white">Cannot play this video format.</div>;
    }

    return (
        <iframe
            src={embedUrl}
            className="w-full aspect-video rounded-lg"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={video.creator || "Video"}
        ></iframe>
    );
};

const VideoDirect = ({ video }: { video: { src: string; title?: string; creator?: string; views?: number; duration?: string; metadata?: any } }) => {
    return (
        <video
            src={video.src}
            className="w-full aspect-video rounded-lg"
            controls
            preload="metadata"
            title={video.title || "Video"}
        >
            Your browser does not support the video tag.
        </video>
    );
};

const AudioPlayer = ({ audio }: { audio: { src: string; title?: string; creator?: string; duration?: string; metadata?: any } }) => {
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [technicalData, setTechnicalData] = useState<any>(null);
    const [isLoadingTechnical, setIsLoadingTechnical] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    // Extract waveform and beat data from technical data
    const waveform = technicalData?.technicalAnalysis?.waveform || [];
    const beats = technicalData?.technicalAnalysis?.beats || [];
    const audioAnalysis = audio.metadata?.analysis;

    // Format time helper
    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Handle audio events
    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    // Load technical analysis data when component mounts
    useEffect(() => {
        const loadTechnicalData = async () => {
            if (!audio.src || technicalData || isLoadingTechnical) return;

            setIsLoadingTechnical(true);
            try {
                console.log('🎵 Loading technical analysis for:', audio.src);

                // Check cache first
                const cacheKey = `audio-technical-${audio.src}`;
                const cached = await httpCache.get(cacheKey);

                if (cached) {
                    console.log('🎵 Technical analysis served from cache');
                    setTechnicalData(cached);
                    setIsLoadingTechnical(false);
                    return;
                }

                console.log('🎵 Technical analysis not in cache, fetching from API...');
                const response = await fetch('/api/media-files/audio', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        audioUrl: audio.src,
                        analysisOptions: {
                            extractWaveform: true,
                            analyzeFrequency: true,
                            detectBeats: true,
                        },
                    }),
                });

                if (response.ok) {
                    const result = await response.json();
                    setTechnicalData(result);

                    // Cache the result
                    await httpCache.set(cacheKey, result, undefined);
                    console.log('🎵 Technical analysis cached successfully');

                    console.log('🎵 Technical analysis loaded:', {
                        hasWaveform: !!result.technicalAnalysis?.waveform,
                        hasBeats: !!result.technicalAnalysis?.beats,
                    });
                } else {
                    console.warn('Failed to load technical analysis');
                }
            } catch (error) {
                console.error('Error loading technical analysis:', error);
            } finally {
                setIsLoadingTechnical(false);
            }
        };

        loadTechnicalData();
    }, [audio.src, technicalData, isLoadingTechnical]);

    // Calculate waveform bar heights
    const getWaveformBars = () => {
        if (!waveform.length) return [];

        const maxBars = 100; // Limit number of bars for performance
        const step = Math.max(1, Math.floor(waveform.length / maxBars));
        const bars = [];

        for (let i = 0; i < waveform.length; i += step) {
            const value = Math.abs(waveform[i] || 0);
            bars.push({
                height: Math.max(2, value * 100), // Minimum height of 2px
                time: (i / waveform.length) * duration
            });
        }

        return bars;
    };

    const waveformBars = getWaveformBars();
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="w-full bg-neutral-900 rounded-lg p-6">
            <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-neutral-800 rounded-lg flex items-center justify-center">
                    <Volume2 className="w-8 h-8 text-neutral-400" />
                </div>
                <div className="flex-1">
                    <h3 className="text-white font-medium">{audio.title || "Audio File"}</h3>
                    {audio.creator && <p className="text-neutral-400 text-sm">{audio.creator}</p>}
                    {audioAnalysis && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-1 rounded">
                                {audioAnalysis.mood}
                            </span>
                            <span className="text-xs bg-green-900/50 text-green-300 px-2 py-1 rounded">
                                {audioAnalysis.genre}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Waveform Visualization */}
            {isLoadingTechnical ? (
                <div className="mb-4">
                    <div className="relative h-16 bg-neutral-800 rounded-lg p-2 overflow-hidden">
                        <div className="flex items-center justify-center h-full">
                            <div className="flex items-center gap-2 text-neutral-400">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                                <span className="text-sm">Loading waveform...</span>
                            </div>
                        </div>
                    </div>
                </div>
            ) : waveformBars.length > 0 ? (
                <div className="mb-4">
                    <div className="relative h-16 bg-neutral-800 rounded-lg p-2 overflow-hidden">
                        <div className="flex items-end justify-between h-full gap-0.5">
                            {waveformBars.map((bar, index) => {
                                const isActive = (index / waveformBars.length) * 100 <= progress;
                                return (
                                    <div
                                        key={index}
                                        className={`flex-1 transition-colors duration-100 ${isActive ? 'bg-blue-500' : 'bg-neutral-600'
                                            }`}
                                        style={{ height: `${Math.max(2, bar.height)}%` }}
                                    />
                                );
                            })}
                        </div>

                        {/* Beat markers */}
                        {beats.length > 0 && (
                            <div className="absolute bottom-0 left-0 right-0 h-1">
                                {beats.map((beat: number, index: number) => {
                                    const beatPosition = (beat / duration) * 100;
                                    return (
                                        <div
                                            key={index}
                                            className="absolute w-0.5 h-full bg-yellow-400 opacity-60"
                                            style={{ left: `${beatPosition}%` }}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Time display */}
                    <div className="flex justify-between text-xs text-neutral-400 mt-1">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>
            ) : null}

            {/* Audio Controls */}
            <audio
                ref={audioRef}
                src={audio.src}
                controls
                className="w-full"
                preload="metadata"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onPlay={handlePlay}
                onPause={handlePause}
            >
                Your browser does not support the audio element.
            </audio>

            {/* Copy Audio URL Button */}
            <div className="mt-4 flex justify-end">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        navigator.clipboard.writeText(audio.src);
                    }}
                    className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Audio URL
                </Button>
            </div>

            {/* Audio Analysis Display */}
            {audioAnalysis && (
                <div className="mt-4 p-3 bg-neutral-800/50 rounded-lg">
                    <h4 className="text-sm font-medium text-white mb-2">AI Analysis</h4>
                    <p className="text-xs text-neutral-300 mb-2">{audioAnalysis.analysis}</p>

                    {audioAnalysis.keyElements.length > 0 && (
                        <div className="mb-2">
                            <span className="text-xs text-neutral-400">Key Elements: </span>
                            <span className="text-xs text-neutral-300">
                                {audioAnalysis.keyElements.join(', ')}
                            </span>
                        </div>
                    )}

                    {audioAnalysis.emotions.length > 0 && (
                        <div>
                            <span className="text-xs text-neutral-400">Emotions: </span>
                            <span className="text-xs text-neutral-300">
                                {audioAnalysis.emotions.join(', ')}
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const DocumentViewer = ({ document }: { document: { src: string; title?: string; fileType?: string; fileSize?: number; metadata?: any } }) => {
    const formatFileSize = (bytes?: number) => {
        if (!bytes) return '';
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    };

    return (
        <div className="w-full bg-neutral-900 rounded-lg p-6">
            <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-neutral-800 rounded-lg flex items-center justify-center">
                    <FileText className="w-8 h-8 text-neutral-400" />
                </div>
                <div className="flex-1">
                    <h3 className="text-white font-medium">{document.title || "Document"}</h3>
                    <div className="flex items-center gap-2 text-neutral-400 text-sm">
                        {document.fileType && <span>{document.fileType.toUpperCase()}</span>}
                        {document.fileSize && <span>• {formatFileSize(document.fileSize)}</span>}
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(document.src, '_blank')}
                    className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                </Button>
            </div>
            <div className="bg-neutral-800 rounded-lg p-4 text-center">
                <p className="text-neutral-400 text-sm">
                    Preview not available for this document type.
                </p>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(document.src, '_blank')}
                    className="mt-2 text-white hover:bg-white/10"
                >
                    Open in new tab
                </Button>
            </div>
        </div>
    );
};

// Abstracted dropdown menu component for media options
export const MediaOptionsDropdown = ({
    mediaFile,
    onEditDetails,
    onCopyUrl,
    onCopyId,
    onDeleteMedia
}: {
    mediaFile: MediaFile;
    onEditDetails: (file: MediaFile) => void;
    onCopyUrl: (file: MediaFile) => void;
    onCopyId: (file: MediaFile) => void;
    onDeleteMedia: (file: MediaFile) => void;
}) => {
    const handleCopyUrl = (e: React.MouseEvent) => {
        e.stopPropagation();
        onCopyUrl(mediaFile);
    };

    const handleCopyId = (e: React.MouseEvent) => {
        e.stopPropagation();
        onCopyId(mediaFile);
    };

    const handleEditDetails = (e: React.MouseEvent) => {
        e.stopPropagation();
        onEditDetails(mediaFile);
    };

    const handleDeleteMedia = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDeleteMedia(mediaFile);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => e.stopPropagation()}
                    className="opacity-0 group-hover/media:opacity-100 transition-opacity p-1 m-0 absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white border-none"
                >
                    <MoreVertical className="h-4 w-4 text-white" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEditDetails}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyUrl}>
                    <Link className="h-4 w-4 mr-2" />
                    Copy Media URL
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyId}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy ID
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={handleDeleteMedia}
                    className="text-red-600"
                >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Media
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export const MediaDialog = ({
    media,
    setMedia
}: {
    media: MediaDialogItem | null;
    setMedia: (media: MediaDialogItem | null) => void;
}) => {
    const item = media ? (
        media.type === 'image' ? media.image :
            media.type === 'video-embed' || media.type === 'video-direct' ? media.video :
                media.type === 'audio' ? media.audio :
                    media.type === 'document' ? media.document : null
    ) : null;
    const [showFullDescription, setShowFullDescription] = useState(false);
    const [showFullKeywords, setShowFullKeywords] = useState(false);
    const [isGeneratingSegmentation, setIsGeneratingSegmentation] = useState(false);
    const [segmentationError, setSegmentationError] = useState<string | null>(null);
    const [localSegmentation, setLocalSegmentation] = useState<any>(null);
    const [childSegments, setChildSegments] = useState<MediaFile[] | null>(null);
    const [childSegmentsLoading, setChildSegmentsLoading] = useState(false);

    // Initialize segmentation from metadata when dialog opens
    useEffect(() => {
        if (media?.type === 'image' && media.image?.metadata) {
            const metadata = media.image.metadata as any;
            if (metadata.segmentation) {
                setLocalSegmentation(metadata.segmentation);
            } else {
                setLocalSegmentation(null);
            }
        } else {
            setLocalSegmentation(null);
        }
        setSegmentationError(null);
        setChildSegments(null);
        setChildSegmentsLoading(false);

        const loadChildren = async () => {
            if (!media || (media.type !== 'video-direct' && media.type !== 'video-embed')) {
                return;
            }
            const parentId = (media.video?.metadata as any)?._id as string | undefined;
            if (!parentId) return;
            try {
                setChildSegmentsLoading(true);
                const res = await fetch(`/api/media-files?parentMediaId=${parentId}&contentType=video&sort=createdAt&order=asc`);
                if (!res.ok) {
                    setChildSegments([]);
                    return;
                }
                const data = await res.json();
                const files: MediaFile[] = Array.isArray(data?.files) ? data.files : [];
                setChildSegments(files);
            } catch (e) {
                console.error('Failed to load child segments', e);
                setChildSegments([]);
            } finally {
                setChildSegmentsLoading(false);
            }
        };

        void loadChildren();
    }, [media]);

    const handleGenerateSegmentation = async () => {
        if (!media || media.type !== 'image') return;

        // We need to get the media file ID from somewhere
        // For now, we'll need to pass it through the metadata or find another way
        const mediaFileId = (media.image.metadata as any)?._id || (media.image.metadata as any)?.id;

        if (!mediaFileId) {
            setSegmentationError('Cannot generate segmentation: Media file ID not found');
            console.error('Media file ID not found in metadata:', media.image.metadata);
            return;
        }

        console.log('Generating segmentation for media file:', mediaFileId);
        setIsGeneratingSegmentation(true);
        setSegmentationError(null);

        try {
            // Initiate segmentation (async with webhook)
            const response = await fetch(`/api/media-files/${mediaFileId}/segmentation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            console.log('Segmentation API response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Segmentation API error:', errorData);
                const errorMessage = errorData.details || errorData.error || errorData.message || 'Failed to generate segmentation';
                throw new Error(errorMessage);
            }

            const result = await response.json();
            console.log('Segmentation API result:', result);

            if (result.success && result.status === 'processing') {
                console.log('Segmentation request accepted, polling for completion...');

                // Poll for completion
                const pollInterval = 2000; // 2 seconds
                const maxAttempts = 60; // 2 minutes total
                let attempts = 0;

                const poll = async (): Promise<void> => {
                    attempts++;

                    if (attempts > maxAttempts) {
                        throw new Error('Segmentation timed out. Please try again.');
                    }

                    const statusResponse = await fetch(`/api/media-files/${mediaFileId}/segmentation`, {
                        method: 'GET',
                    });

                    if (!statusResponse.ok) {
                        throw new Error('Failed to check segmentation status');
                    }

                    const statusData = await statusResponse.json();
                    console.log('Segmentation status:', statusData);

                    if (statusData.hasSegmentation && statusData.segmentation) {
                        setLocalSegmentation(statusData.segmentation);
                        console.log('Segmentation completed successfully');
                        setIsGeneratingSegmentation(false);
                    } else {
                        // Continue polling
                        setTimeout(poll, pollInterval);
                    }
                };

                // Start polling
                setTimeout(poll, pollInterval);
            } else {
                throw new Error('Invalid response from segmentation API');
            }
        } catch (error) {
            console.error('Error generating segmentation:', error);
            setSegmentationError(error instanceof Error ? error.message : 'Failed to generate segmentation');
            setIsGeneratingSegmentation(false);
        }
    };

    return (
        <Dialog open={!!media} onOpenChange={(open) => !open && setMedia(null)}>
            <DialogPortal>
                <DialogOverlay

                    className="fixed z-100 inset-0 bg-black/50 backdrop-blur-xl" />
                <DialogContent
                    onClick={(e) => {
                        setMedia(null);
                    }}
                    className="w-screen max-w-screen! h-screen z-101 bg-transparent border-none shadow-none grid grid-cols-3 items-center gap-4 overflow-y-auto">
                    <div className="col-span-1  flex flex-col gap-4 justify-start h-full">
                        {media?.type === 'image' && 'image' in media && media.image?.metadata &&
                            (media.image.metadata.dominantColor || media.image.metadata.secondaryColor ||
                                media.image.metadata.accentColor || (media.image.metadata.palette && media.image.metadata.palette.length > 0)) && (
                                <div
                                    className="bg-neutral-900 rounded-xl p-4 text-white shadow-lg"
                                >
                                    <h3 className="px-2 pb-4 text-md text-neutral-300 mb-3 flex items-center gap-4">
                                        <Palette className="w-4 h-4 text-neutral-400" />
                                        Color Palette
                                    </h3>
                                    <div className="grid grid-cols-12 gap-3">
                                        {media.image.metadata.dominantColor && typeof media.image.metadata.dominantColor === 'string' && (
                                            <div className="col-span-4 flex flex-col gap-1">
                                                <span className="text-xs text-neutral-400">Dominant Color</span>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div
                                                                className="w-full h-8 rounded-md cursor-pointer"
                                                                style={{ backgroundColor: media.image.metadata.dominantColor }}
                                                                onClick={() => {
                                                                    if (media.image?.metadata?.dominantColor) {
                                                                        navigator.clipboard.writeText(media.image.metadata.dominantColor);
                                                                    }
                                                                }}
                                                            />
                                                        </TooltipTrigger>
                                                        <TooltipContent className="z-[200]">
                                                            <p>Copy {media.image.metadata.dominantColor}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                        )}
                                        {media.image.metadata.secondaryColor && typeof media.image.metadata.secondaryColor === 'string' && (
                                            <div className="col-span-4 flex flex-col gap-1">
                                                <span className="text-xs text-neutral-400">Secondary Color</span>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div
                                                                className="w-full h-8 rounded-md cursor-pointer"
                                                                style={{ backgroundColor: media.image.metadata.secondaryColor }}
                                                                onClick={() => {
                                                                    if (media.image?.metadata?.secondaryColor) {
                                                                        navigator.clipboard.writeText(media.image.metadata.secondaryColor);
                                                                    }
                                                                }}
                                                            />
                                                        </TooltipTrigger>
                                                        <TooltipContent className="z-[200]">
                                                            <p>Copy {media.image.metadata.secondaryColor}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                        )}
                                        {media.image.metadata.accentColor && typeof media.image.metadata.accentColor === 'string' && (
                                            <div className="col-span-4 flex flex-col gap-1">
                                                <span className="text-xs text-neutral-400">Accent Color</span>
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div
                                                                className="w-full h-8 rounded-md cursor-pointer"
                                                                style={{ backgroundColor: media.image.metadata.accentColor }}
                                                                onClick={() => {
                                                                    if (media.image?.metadata?.accentColor) {
                                                                        navigator.clipboard.writeText(media.image.metadata.accentColor);
                                                                    }
                                                                }}
                                                            />
                                                        </TooltipTrigger>
                                                        <TooltipContent className="z-[200]">
                                                            <p>Copy {media.image.metadata.accentColor}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                        )}
                                        {media.image.metadata.palette && Array.isArray(media.image.metadata.palette) && media.image.metadata.palette.length > 0 && (
                                            <div className="col-span-12 flex flex-col gap-1">
                                                <span className="text-xs text-neutral-400">Color Palette</span>
                                                <div className="grid grid-cols-6 gap-1">
                                                    {media.image.metadata.palette.map((color, index) => (
                                                        <TooltipProvider key={color + index}>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <div
                                                                        className="h-6 rounded-md cursor-pointer"
                                                                        style={{ backgroundColor: color }}
                                                                        onClick={() => {
                                                                            if (typeof color === 'string') {
                                                                                navigator.clipboard.writeText(color);
                                                                            }
                                                                        }}
                                                                    />
                                                                </TooltipTrigger>
                                                                <TooltipContent className="z-[200]">
                                                                    <p>Copy {color}</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        {media?.type === 'image' && 'image' in media && media.image?.metadata && (media.image.metadata.audienceKeywords || media.image.metadata.artStyle || media.image.metadata.keywords) &&
                            <div
                                onClick={(e) => e.stopPropagation()}
                                className="bg-neutral-900 rounded-xl py-4 text-white shadow-lg">

                                <h2 className="px-8 text-md text-neutral-300 mb-3 flex items-center gap-4">
                                    <Search className="w-4 h-4 text-neutral-400" />
                                    Search Finetuning
                                </h2>

                                <div className="w-full h-[0.5px] bg-neutral-700 my-4" />

                                <div className="px-8">
                                    {media.image.metadata.artStyle && media.image.metadata.artStyle.length > 0 && (
                                        <div className="mb-8">
                                            <h3 className="text-xs uppercase tracking-[0.5em] text-neutral-300 mb-2">Art Style</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {media.image.metadata.artStyle?.map((word) => (
                                                    <Badge
                                                        key={word}
                                                        variant="outline"
                                                        className="cursor-pointer bg-white/10 hover:bg-white/20 text-white border-none"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const url = new URL(window.location.href);
                                                            url.searchParams.set('artStyle', word);
                                                            window.open(url.toString(), '_blank');
                                                        }}
                                                    >
                                                        @{word}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {media.image.metadata.audienceKeywords && media.image.metadata.audienceKeywords.length > 0 && (
                                        <div className="mb-8">
                                            <h3 className="text-xs uppercase tracking-[0.5em] text-neutral-300 mb-2">Suite to</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {media.image.metadata.audienceKeywords.map((word) => (
                                                    <Badge
                                                        key={word}
                                                        variant="outline"
                                                        className="cursor-pointer bg-white/10 hover:bg-white/20 text-white border-none"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const url = new URL(window.location.href);
                                                            url.searchParams.set('audienceKeyword', word);
                                                            window.open(url.toString(), '_blank');
                                                        }}
                                                    >
                                                        !{word}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {(media.image.metadata as any).userTags && (media.image.metadata as any).userTags.length > 0 && (
                                        <div className="mb-8">
                                            <h3 className="text-xs uppercase tracking-[0.5em] text-neutral-300 mb-2">User Folders</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {(media.image.metadata as any).userTags.map((word: string) => (
                                                    <Badge
                                                        key={word}
                                                        variant="outline"
                                                        className="cursor-pointer bg-white/10 hover:bg-white/20 text-white border-none"
                                                    >
                                                        {word}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {media.image.metadata.keywords && (
                                        <div>
                                            <div className={`relative overflow-hidden transition-all duration-300 ${showFullKeywords ? 'max-h-full' : 'max-h-[160px]'}`}>
                                                <h3 className="text-xs uppercase tracking-[0.5em] text-neutral-300 mb-2">Keywords</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {media.image.metadata.keywords.map((word) => (
                                                        <Badge
                                                            key={word}
                                                            variant="outline"
                                                            className="cursor-pointer bg-white/10 hover:bg-white/20 text-white border-none"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const url = new URL(window.location.href);
                                                                url.searchParams.set('keyword', word);
                                                                window.open(url.toString(), '_blank');
                                                            }}
                                                        >
                                                            #{word}
                                                        </Badge>
                                                    ))}
                                                </div>
                                                {!showFullKeywords && (
                                                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-neutral-900 to-transparent" />
                                                )}
                                            </div>
                                            <div className="mt-4 flex items-center justify-between">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowFullKeywords(!showFullKeywords);
                                                    }}
                                                    className="text-xs text-neutral-400 hover:text-white bg-transparent hover:bg-transparent"
                                                >
                                                    {showFullKeywords ? 'Show Less' : 'Show More'}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        }
                    </div>
                    <div className="col-span-1 ">
                        <div onClick={(e) => e.stopPropagation()} className="flex flex-col gap-4 max-w-xl">
                            <DialogTitle title="Expanded view" hidden />
                            <div className="flex-1">
                                {media?.type === 'image' &&
                                    <img src={media.image.originalSrc ?? media.image.src} alt={media.image.title ?? "Expanded view"} className="w-auto h-auto object-contain rounded-2xl mx-auto" />
                                }
                                {media?.type === 'video-embed' &&
                                    <VideoEmbed video={media.video} />
                                }
                                {media?.type === 'video-direct' &&
                                    <VideoDirect video={media.video} />
                                }
                                {media?.type === 'audio' &&
                                    <AudioPlayer audio={media.audio} />
                                }
                                {media?.type === 'document' &&
                                    <DocumentViewer document={media.document} />
                                }
                            </div>
                            {item && (media?.type === 'video-embed' || media?.type === 'video-direct') && <div className=" w-full bg-neutral-900/80 p-4 rounded-xl text-white flex flex-col gap-2">
                                <div className="text-xs text-neutral-400 flex flex-row gap-2 mt-auto">
                                    {media.video.creator && <div className="flex items-center gap-2"><User size={12} /><span>{media.video.creator}</span></div>}
                                    {media.video.views && <div className="flex items-center gap-2"><View size={12} /><span>{media.video.views.toLocaleString()} views</span></div>}
                                    {media.video.duration && <div className="flex items-center gap-2"><Film size={12} /><span>{media.video.duration}</span></div>}
                                    <a href={media.video?.src} target="_blank" rel="noopener noreferrer" className="bg-white/80 text-black ml-auto hover:bg-white p-2 rounded-full transition-colors flex flex-row gap-2" title="View Source" onClick={(e) => e.stopPropagation()}>
                                        <ExternalLink className="w-4 h-4 text-neutral-800" />
                                        View Source
                                    </a>
                                </div>
                            </div>}
                            {item && media?.type === "image" && <div className=" w-full bg-neutral-900/80 p-2 rounded-3xl text-white flex flex-col gap-2">
                                <div className="px-2 py-2 text-xs text-neutral-400 flex flex-row items-center gap-2 mt-auto">
                                    <p className="font-bold text-white text-sm line-clamp-1 truncate">{media?.image?.title}</p>
                                    <a href={media.image?.src} target="_blank" rel="noopener noreferrer" className="bg-white/50 text-black ml-auto hover:bg-white p-2 rounded-full transition-colors flex flex-row gap-2" title="View Source" onClick={(e) => e.stopPropagation()}>
                                        <ExternalLink className="w-4 h-4 text-neutral-800" />
                                        Source
                                    </a>
                                </div>
                            </div>}
                            <DialogClose className="bg-black/50 rounded-full p-2 absolute top-4 right-4">
                                <XIcon className="w-4 h-4 text-white" />
                            </DialogClose>
                        </div>
                    </div>
                    <div className="col-span-1 flex flex-col gap-4 justify-start h-full overflow-y-auto">
                        {media && (media.type === 'video-direct' || media.type === 'video-embed') && (
                            <div
                                onClick={(e) => e.stopPropagation()}
                                className="bg-neutral-900 rounded-xl p-4 text-white shadow-lg max-w-md"
                            >
                                <h3 className="text-sm font-medium mb-1 flex items-center gap-2">
                                    <Scissors className="w-4 h-4 text-neutral-400" />
                                    Split scenes
                                </h3>
                                {childSegmentsLoading ? (
                                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        <span>Loading split scenes...</span>
                                    </div>
                                ) : !childSegments || childSegments.length === 0 ? (
                                    <p className="text-xs text-neutral-500">
                                        No split scenes found for this video.
                                    </p>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2 mt-2">
                                        {childSegments
                                            .slice()
                                            .sort((a, b) => {
                                                const ai = Number((a as any)?.metadata?.sceneIndex ?? 0);
                                                const bi = Number((b as any)?.metadata?.sceneIndex ?? 0);
                                                return ai - bi;
                                            })
                                            .map((child) => {
                                                const url = child.filePath ?? '';
                                                const idx = (child as any)?.metadata?.sceneIndex as number | undefined;
                                                return (
                                                    <button
                                                        key={child._id?.toString() ?? url}
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (url) {
                                                                window.open(url, '_blank');
                                                            }
                                                        }}
                                                        className="flex flex-col gap-1 text-left bg-neutral-800/70 rounded-lg overflow-hidden hover:bg-neutral-700/80 transition-colors"
                                                    >
                                                        {url ? (
                                                            <VideoThumbnail src={url} title={child.fileName} />
                                                        ) : (
                                                            <div className="w-full aspect-video bg-black flex items-center justify-center">
                                                                <Play className="w-6 h-6 text-white" />
                                                            </div>
                                                        )}
                                                        <div className="px-2 pb-2">
                                                            <p className="text-xs font-medium truncate">
                                                                Scene {idx ?? '?'}
                                                            </p>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                    </div>
                                )}
                            </div>
                        )}
                        {media?.image && media?.image?.description && media.image.description.trim() &&
                            <div
                                onClick={(e) => e.stopPropagation()}
                                className="bg-neutral-900 rounded-xl p-4 text-white shadow-lg max-w-md">
                                <div className={`relative overflow-hidden transition-all duration-300 ${showFullDescription ? 'max-h-full' : 'max-h-[160px]'}`}>
                                    <h3 className="text-md text-neutral-300 mb-2 font-bold">Image Prompt</h3>
                                    <p className="text-sm text-neutral-300 leading-relaxed">
                                        {media?.image?.description}
                                    </p>
                                    {!showFullDescription && (
                                        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-neutral-900 to-transparent" />
                                    )}
                                </div>
                                <div className="mt-4 flex items-center justify-between">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowFullDescription(!showFullDescription);
                                        }}
                                        className="text-xs text-neutral-400 hover:text-white bg-transparent hover:bg-transparent"
                                    >
                                        {showFullDescription ? 'Show Less' : 'Read More'}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const description = media?.type === 'image'
                                                ? media.image.description || 'No image description available'
                                                : 'No description available';
                                            navigator.clipboard.writeText(description);
                                        }}
                                        className="bg-neutral-800 hover:bg-transparent hover:text-white text-xs"
                                        title="Copy description"
                                        style={{
                                            backgroundColor: media?.image?.metadata?.dominantColor ? `${media.image.metadata.dominantColor}` : undefined,
                                            color: media?.image?.metadata?.accentColor ? `${media.image.metadata.accentColor}` : "#ffffff",
                                        }}
                                    >
                                        <span className="">Copy Prompt</span>
                                        <Copy
                                            style={{
                                                color: media?.image?.metadata?.accentColor ? `${media.image.metadata.accentColor}` : undefined,
                                            }}
                                            className="w-4 h-4 text-white" />
                                    </Button>
                                </div>
                            </div>
                        }

                        {/* Segmentation Section */}
                        {media?.type === 'image' && (
                            <div
                                onClick={(e) => e.stopPropagation()}
                                className="bg-neutral-900 rounded-xl p-4 text-white shadow-lg max-w-md">
                                <h3 className="text-md text-neutral-300 mb-3 font-bold flex items-center gap-2">
                                    <Scissors className="w-4 h-4 text-neutral-400" />
                                    Segmentation
                                </h3>

                                {segmentationError && (
                                    <div className="mb-3 p-2 bg-red-900/20 border border-red-500/50 rounded text-red-400 text-sm">
                                        {segmentationError}
                                    </div>
                                )}

                                {!localSegmentation && !isGeneratingSegmentation && (
                                    <div className="flex flex-col items-center gap-3 py-4">
                                        <p className="text-sm text-neutral-400 text-center">
                                            Generate AI-powered background removal to extract foreground, background, and mask images.
                                        </p>
                                        <Button
                                            onClick={handleGenerateSegmentation}
                                            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                                            variant="outline"
                                        >
                                            <Scissors className="w-4 h-4 mr-2" />
                                            Generate Segmentation
                                        </Button>
                                    </div>
                                )}

                                {isGeneratingSegmentation && (
                                    <div className="flex flex-col items-center gap-3 py-8">
                                        <Loader2 className="w-8 h-8 text-neutral-400 animate-spin" />
                                        <p className="text-sm text-neutral-400">
                                            Processing segmentation...
                                        </p>
                                    </div>
                                )}

                                {localSegmentation && !isGeneratingSegmentation && (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-3 gap-2">
                                            {/* Foreground */}
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs text-neutral-400 uppercase tracking-wider">Foreground</span>
                                                <div className="relative aspect-square rounded-lg overflow-hidden bg-neutral-800 group">
                                                    <img
                                                        src={localSegmentation.foreground?.url}
                                                        alt="Foreground"
                                                        className="w-full h-full object-contain"
                                                    />
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <a
                                                                    href={localSegmentation.foreground?.url}
                                                                    download={localSegmentation.foreground?.file_name || 'foreground.png'}
                                                                    className="absolute bottom-2 right-2 bg-white/90 hover:bg-white p-1.5 rounded-md transition-all opacity-0 group-hover:opacity-100 cursor-pointer z-10"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <Download className="w-3 h-3 text-neutral-800" />
                                                                </a>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="z-[200]">
                                                                <p>Download foreground</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </div>

                                            {/* Background */}
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs text-neutral-400 uppercase tracking-wider">Background</span>
                                                <div className="relative aspect-square rounded-lg overflow-hidden bg-neutral-800 group">
                                                    <img
                                                        src={localSegmentation.background?.url}
                                                        alt="Background"
                                                        className="w-full h-full object-contain"
                                                    />
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <a
                                                                    href={localSegmentation.background?.url}
                                                                    download={localSegmentation.background?.file_name || 'background.png'}
                                                                    className="absolute bottom-2 right-2 bg-white/90 hover:bg-white p-1.5 rounded-md transition-all opacity-0 group-hover:opacity-100 cursor-pointer z-10"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <Download className="w-3 h-3 text-neutral-800" />
                                                                </a>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="z-[200]">
                                                                <p>Download background</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </div>

                                            {/* Mask */}
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs text-neutral-400 uppercase tracking-wider">Mask</span>
                                                <div className="relative aspect-square rounded-lg overflow-hidden bg-neutral-800 group">
                                                    <img
                                                        src={localSegmentation.mask?.url}
                                                        alt="Mask"
                                                        className="w-full h-full object-contain"
                                                    />
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <a
                                                                    href={localSegmentation.mask?.url}
                                                                    download={localSegmentation.mask?.file_name || 'mask.png'}
                                                                    className="absolute bottom-2 right-2 bg-white/90 hover:bg-white p-1.5 rounded-md transition-all opacity-0 group-hover:opacity-100 cursor-pointer z-10"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <Download className="w-3 h-3 text-neutral-800" />
                                                                </a>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="z-[200]">
                                                                <p>Download mask</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Regenerate button */}
                                        <Button
                                            onClick={handleGenerateSegmentation}
                                            variant="ghost"
                                            size="sm"
                                            className="w-full text-xs text-neutral-400 hover:text-white bg-transparent hover:bg-white/10"
                                        >
                                            Regenerate
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </DialogContent>
            </DialogPortal>
        </Dialog>
    )
}

// Field mapper function to convert MediaFile to MediaDialogItem
export const mapMediaFileToDialogItem = (mediaFile: MediaFile): MediaDialogItem | null => {
    if (!mediaFile) return null;

    const { contentType, filePath, fileName, metadata, contentMimeType, contentSubType, contentSourceUrl, tags } = mediaFile;

    switch (contentType) {
        case 'image':
            return {
                type: 'image',
                image: {
                    src: filePath,
                    originalSrc: filePath,
                    type: contentMimeType,
                    metadata: { ...metadata, tags: tags, mediaType: metadata?.mediaType || contentSubType, _id: mediaFile._id?.toString() },
                    size: metadata?.size,
                    srcWidth: metadata?.width,
                    srcHeight: metadata?.height,
                    title: metadata?.title ?? fileName,
                    description: metadata?.description,
                    url: contentSourceUrl,
                    imagePageUrl: metadata?.imagePageUrl ?? contentSourceUrl,
                    pageUrl: metadata?.pageUrl ?? contentSourceUrl,
                    set: metadata?.set ?? [],
                } as UiCommonTypes["ImageSet"]
            };
        case 'video':
            // Check if it's an embed URL or direct video
            const isEmbedUrl = filePath?.includes('youtube.com') || filePath?.includes('youtu.be') || filePath?.includes('dailymotion.com');

            if (isEmbedUrl) {
                return {
                    type: 'video-embed',
                    video: {
                        src: filePath ?? '',
                        creator: metadata?.creator,
                        views: metadata?.views,
                        duration: metadata?.duration,
                        metadata: { ...metadata, title: fileName, _id: mediaFile._id?.toString(), tags, mediaType: metadata?.mediaType || contentSubType },
                    }
                };
            } else {
                return {
                    type: 'video-direct',
                    video: {
                        src: filePath ?? '',
                        creator: metadata?.creator,
                        views: metadata?.views,
                        duration: metadata?.duration,
                        metadata: { ...metadata, title: fileName, tags: tags, mediaType: metadata?.mediaType || contentSubType, _id: mediaFile._id?.toString() },
                    }
                };
            }
        case 'audio':
            return {
                type: 'audio',
                audio: {
                    src: filePath ?? '',
                    title: fileName,
                    creator: metadata?.creator,
                    duration: metadata?.duration,
                    metadata: metadata,
                }
            };
        case 'document':
            return {
                type: 'document',
                document: {
                    src: filePath ?? '',
                    title: fileName,
                    fileType: metadata?.fileType || 'PDF',
                    fileSize: metadata?.fileSize,
                    metadata: metadata,
                }
            };
        default:
            return null;
    }
};

export const MediaGrid = ({
    mediaFiles,
    onEditDetails,
    onCopyUrl,
    onCopyId,
    onDeleteMedia,
    pickerMode = false,
    selectedFiles = new Set(),
    onFileSelect,
    // New props for bulk editing
    editMode = false,
    onBulkSelect,
    onBulkSelectAll,
    onBulkDeselectAll,
    bulkSelectedFiles = new Set(),
    onBulkFileSelect
}: {
    mediaFiles: MediaFile[];
    onEditDetails: (file: MediaFile) => void;
    onCopyUrl: (file: MediaFile) => void;
    onCopyId: (file: MediaFile) => void;
    onDeleteMedia: (file: MediaFile) => void;
    pickerMode?: boolean;
    selectedFiles?: Set<string>;
    onFileSelect?: (file: MediaFile) => void;
    // New props for bulk editing
    editMode?: boolean;
    onBulkSelect?: (fileIds: string[]) => void;
    onBulkSelectAll?: () => void;
    onBulkDeselectAll?: () => void;
    bulkSelectedFiles?: Set<string>;
    onBulkFileSelect?: (fileId: string, selected: boolean) => void;
}) => {
    const [selectedMedia, setSelectedMedia] = useState<MediaDialogItem | null>(null);
    const [numColumns, setNumColumns] = useState(1);

    useEffect(() => {
        const getNumColumns = () => {
            const width = window.innerWidth;
            if (width >= 1536) return 6; // 2xl
            if (width >= 1280) return 5; // xl
            if (width >= 1024) return 4; // lg
            if (width >= 768) return 3; // md
            if (width >= 640) return 2; // sm
            return 1;
        };

        const handleResize = () => {
            setNumColumns(getNumColumns());
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const columns = useMemo(() => {
        const newColumns: MediaFile[][] = Array.from({ length: numColumns }, () => []);
        mediaFiles.forEach((file, index) => {
            newColumns[index % numColumns].push(file);
        });
        return newColumns;
    }, [mediaFiles, numColumns]);

    // Bulk selection helpers
    const allFileIds = useMemo(() =>
        mediaFiles.map(file => file._id?.toString()).filter(Boolean) as string[],
        [mediaFiles]
    );

    const allBulkSelected = useMemo(() =>
        allFileIds.length > 0 && allFileIds.every(id => bulkSelectedFiles.has(id)),
        [allFileIds, bulkSelectedFiles]
    );

    const handleBulkSelectAll = () => {
        if (allBulkSelected) {
            onBulkDeselectAll?.();
        } else {
            onBulkSelectAll?.();
        }
    };

    const handleBulkFileToggle = (fileId: string) => {
        const isSelected = bulkSelectedFiles.has(fileId);
        onBulkFileSelect?.(fileId, !isSelected);
    };


    if (!mediaFiles || mediaFiles.length === 0) {
        return null;
    }

    return (
        <>
            {/* Bulk Selection Header */}
            {editMode && (
                <div className="mb-4 p-3 bg-muted/50 rounded-lg border">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleBulkSelectAll}
                                className="h-8"
                            >
                                {allBulkSelected ? 'Deselect All' : 'Select All'}
                            </Button>
                            <span className="text-sm text-muted-foreground">
                                {bulkSelectedFiles.size} of {allFileIds.length} selected
                            </span>
                        </div>
                        {bulkSelectedFiles.size > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onBulkDeselectAll}
                                className="text-destructive hover:text-destructive"
                            >
                                Clear Selection
                            </Button>
                        )}
                    </div>
                </div>
            )}

            <div className="flex gap-2 md:gap-4">
                {columns.map((columnFiles, colIndex) => (
                    <div key={colIndex} className="flex w-full flex-col gap-2 md:gap-4">
                        {columnFiles.map((mediaFile, idx) => {
                            const dialogItem = mapMediaFileToDialogItem(mediaFile);
                            if (!dialogItem) return null;

                            const fileId = mediaFile._id?.toString();
                            const isSelected = pickerMode ? selectedFiles.has(fileId || '') : false;
                            const isBulkSelected = editMode ? bulkSelectedFiles.has(fileId || '') : false;

                            return (
                                <div
                                    onClick={() => {
                                        if (editMode && onBulkFileSelect) {
                                            handleBulkFileToggle(fileId || '');
                                        } else if (pickerMode && onFileSelect) {
                                            onFileSelect(mediaFile);
                                        } else {
                                            setSelectedMedia(dialogItem);
                                        }
                                    }}
                                    key={mediaFile._id?.toString() || idx}
                                    className={`relative group/media bg-neutral-900 rounded-lg overflow-hidden cursor-pointer ${isSelected ? 'ring-2 ring-primary bg-primary/10' : ''
                                        } ${isBulkSelected ? 'ring-2 ring-blue-500 bg-blue-500/10' : ''}`}
                                >
                                    {!!(mediaFile as any)?.parentMediaId && (
                                        <div className="absolute top-2 right-2 z-20 pointer-events-none">
                                            <Badge variant="secondary" className="bg-black/70 text-white border border-white/10">
                                                Split
                                            </Badge>
                                        </div>
                                    )}
                                    {dialogItem.type === 'image' && (
                                        <img
                                            src={dialogItem.image.src ?? ""}
                                            alt={dialogItem.image.title ?? ""}
                                            className="w-full h-auto transition-transform duration-300 group-hover/media:scale-110"
                                        />
                                    )}
                                    {dialogItem.type === 'video-embed' && (
                                        <div className="w-full aspect-video bg-black flex items-center justify-center">
                                            <Play className="w-8 h-8 text-white" />
                                        </div>
                                    )}
                                    {dialogItem.type === 'video-direct' && (
                                        <VideoThumbnail
                                            src={dialogItem.video.src}
                                            title={dialogItem.video.metadata?.title ?? mediaFile.fileName}
                                        />
                                    )}
                                    {dialogItem.type === 'audio' && (
                                        <div className="w-full aspect-video bg-neutral-800 flex flex-col items-center justify-center p-4">
                                            <Volume2 className="w-8 h-8 text-neutral-400 mb-2" />
                                            <div className="text-center">
                                                <p className="text-sm font-medium text-white truncate w-full max-w-[14ch] line-clamp-2" title={mediaFile.fileName}>
                                                    {mediaFile.fileName || 'Audio File'}
                                                </p>
                                                {mediaFile.tags && mediaFile.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-2 justify-center">
                                                        {mediaFile.tags.slice(0, 3).map((tag: string, index: number) => (
                                                            <Badge key={index} variant="secondary" className="text-xs">
                                                                {tag}
                                                            </Badge>
                                                        ))}
                                                        {mediaFile.tags.length > 3 && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                +{mediaFile.tags.length - 3}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {dialogItem.type === 'document' && (
                                        <div className="w-full aspect-video bg-neutral-800 flex items-center justify-center">
                                            <FileText className="w-8 h-8 text-neutral-400" />
                                        </div>
                                    )}

                                    {/* Selection indicators */}
                                    {pickerMode && isSelected && (
                                        <div className="absolute top-2 left-2 z-10">
                                            <div className="bg-primary text-primary-foreground rounded-full p-1">
                                                <Check className="w-4 h-4" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Bulk selection checkbox */}
                                    {editMode && (
                                        <div className="absolute top-2 left-2 z-10">
                                            <div
                                                className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer ${isBulkSelected
                                                    ? 'bg-blue-500 border-blue-500 text-white'
                                                    : 'bg-white/80 border-white/80 hover:bg-white'
                                                    }`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleBulkFileToggle(fileId || '');
                                                }}
                                            >
                                                {isBulkSelected && <Check className="w-3 h-3" />}
                                            </div>
                                        </div>
                                    )}

                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/media:opacity-100 transition-opacity duration-300">
                                        {/* Top right dropdown - only show in non-picker mode and non-edit mode */}
                                        {!pickerMode && !editMode && (
                                            <MediaOptionsDropdown
                                                mediaFile={mediaFile}
                                                onEditDetails={onEditDetails}
                                                onCopyUrl={onCopyUrl}
                                                onCopyId={onCopyId}
                                                onDeleteMedia={onDeleteMedia}
                                            />
                                        )}

                                        {/* Bottom right action buttons - only show in non-picker mode and non-edit mode */}
                                        {!pickerMode && !editMode && (
                                            <div className="absolute bottom-3 right-3 flex items-center gap-2 transform scale-75 group-hover/media:scale-100 transition-transform duration-300">
                                                <a href={mediaFile.filePath} target="_blank" rel="noopener noreferrer" className="bg-white/80 hover:bg-white p-2 rounded-full transition-colors" title="View Source" onClick={(e) => e.stopPropagation()}>
                                                    <ExternalLink className="w-4 h-4 text-neutral-800" />
                                                </a>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedMedia(dialogItem);
                                                    }}
                                                    className="bg-white/80 hover:bg-white p-2 rounded-full transition-colors"
                                                    title="Expand Media"
                                                >
                                                    <Expand className="w-4 h-4 text-neutral-800" />
                                                </button>
                                            </div>
                                        )}

                                        {/* Edit mode action buttons */}
                                        {editMode && (
                                            <div className="absolute bottom-3 right-3 flex items-center gap-2 transform scale-75 group-hover/media:scale-100 transition-transform duration-300">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onEditDetails(mediaFile);
                                                    }}
                                                    className="bg-blue-500/80 hover:bg-blue-500 p-2 rounded-full transition-colors"
                                                    title="Edit Details"
                                                >
                                                    <Edit className="w-4 h-4 text-white" />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDeleteMedia(mediaFile);
                                                    }}
                                                    className="bg-red-500/80 hover:bg-red-500 p-2 rounded-full transition-colors"
                                                    title="Delete Media"
                                                >
                                                    <Trash2 className="w-4 h-4 text-white" />
                                                </button>
                                                <a href={mediaFile.filePath} target="_blank" rel="noopener noreferrer" className="bg-white/80 hover:bg-white p-2 rounded-full transition-colors" title="View Source" onClick={(e) => e.stopPropagation()}>
                                                    <ExternalLink className="w-4 h-4 text-neutral-800" />
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
            <MediaDialog media={selectedMedia} setMedia={setSelectedMedia} />
        </>
    );
}; 