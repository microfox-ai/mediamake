"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
    FileAudio,
    Brain,
    Sparkles,
    Settings,
    Download,
    Copy,
    RefreshCw,
    Loader2,
    Edit2,
    Check,
    X,
    Files
} from "lucide-react";
import { useTranscriber } from "../contexts/transcriber-context";
import { AudioPlayerProvider, useAudioPlayer } from "../audio-player-context";
import { AudioPlayer } from "../audio-player";
import { TiptapCaptionEditor } from "../tiptap/tiptap-caption-editor";
import { Transcription } from "@/app/types/transcription";
import { toast } from "sonner";

// Internal component that uses the audio player context
function EditorUIInner() {
    const {
        transcriptionData,
        setTranscriptionData,
        refreshTranscription,
        isLoading,
        setIsLoading,
        isRefreshing,
        error,
        setError,
        setCurrentView
    } = useTranscriber();

    const { currentTime, isPlaying, seekTo, togglePlayPause, setAudioUrl } = useAudioPlayer();

    const [showMetadataDialog, setShowMetadataDialog] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState("");
    const [isSavingTitle, setIsSavingTitle] = useState(false);

    // Set audio URL when transcription data changes
    useEffect(() => {
        if (transcriptionData?.audioUrl) {
            console.log('Setting audio URL:', transcriptionData.audioUrl);
            setAudioUrl(transcriptionData.audioUrl);
        }
    }, [transcriptionData?.audioUrl, setAudioUrl]);

    const handleTranscriptionDataUpdate = async (updatedData: any) => {
        try {
            const beforeDataCaptions = transcriptionData?.captions;
            const mismatchLength = beforeDataCaptions?.length !== updatedData.captions?.length;
            let updatedDataCaptions =
                updatedData.captions?.map((caption: any, index: number) => {
                    return {
                        ...caption,
                        metadata: {
                            ...beforeDataCaptions?.[index]?.metadata,
                            ...caption.metadata
                        }
                    };
                });
            if (mismatchLength) {
                toast.error('Captions length mismatch, resetting & cleaning up metadata');
                updatedDataCaptions = updatedData.captions;
            }
            const response = await fetch(`/api/transcriptions/${updatedData._id ?? transcriptionData?._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...(updatedData.captions && { captions: updatedDataCaptions }),
                    ...(updatedData.processingData && { processingData: updatedData.processingData }),
                    ...(updatedData.status && { status: updatedData.status }),
                    ...(updatedData.error && { error: updatedData.error }),
                    ...(updatedData.tags && { tags: updatedData.tags })
                }),
            });

            if (!response.ok) {
                console.error('Failed to update transcription in database');
            } else {
                const data = await response.json();
                if (data.success) {
                    setTranscriptionData(data.transcription);
                }
            }
        } catch (error) {
            console.error('Error updating transcription:', error);
        }
    };

    const exportCaptionJson = () => {
        if (!transcriptionData) return;

        const exportData = {
            id: transcriptionData._id,
            audioUrl: transcriptionData.audioUrl,
            language: transcriptionData.language,
            captions: transcriptionData.captions,
            correctedText: transcriptionData.processingData?.step2?.humanCorrectedText,
            exportedAt: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `transcription-${transcriptionData._id}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const copyCaptionJson = () => {
        if (!transcriptionData) return;

        const exportData = {
            id: transcriptionData._id,
            audioUrl: transcriptionData.audioUrl,
            language: transcriptionData.language,
            captions: transcriptionData.captions,
            correctedText: transcriptionData.processingData?.step2?.humanCorrectedText,
            exportedAt: new Date().toISOString()
        };

        navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
        toast.success('Caption JSON copied to clipboard');
    };

    const copyAudioUrl = () => {
        if (!transcriptionData?.audioUrl) {
            toast.error('No audio URL available');
            return;
        }

        navigator.clipboard.writeText(transcriptionData.audioUrl);
        toast.success('Audio URL copied to clipboard');
    };

    const handleDuplicate = async () => {
        if (!transcriptionData?._id) return;

        try {
            toast.loading('Duplicating transcription...', { id: 'duplicate' });
            
            const response = await fetch(`/api/transcriptions/${transcriptionData._id}/duplicate`, {
                method: 'POST',
            });

            if (response.ok) {
                const data = await response.json();
                toast.success('Transcription duplicated successfully', { id: 'duplicate' });
                
                // Navigate to explorer view to see the new transcription
                if (setCurrentView) {
                    setCurrentView('explorer');
                }
            } else {
                const error = await response.json();
                toast.error(error.error || 'Failed to duplicate transcription', { id: 'duplicate' });
            }
        } catch (error) {
            console.error('Error duplicating transcription:', error);
            toast.error('Failed to duplicate transcription', { id: 'duplicate' });
        }
    };

    // Show loading state first (even if transcriptionData is null during loading)
    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-16 w-16 mx-auto mb-6 text-primary animate-spin" />
                    <h3 className="text-2xl font-semibold mb-4">Loading Transcription</h3>
                    <p className="text-muted-foreground">
                        Please wait while we load the transcription data...
                    </p>
                </div>
            </div>
        );
    }

    // Show refreshing state when refreshing existing transcription
    if (isRefreshing) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="h-16 w-16 mx-auto mb-6 text-primary animate-spin" />
                    <h3 className="text-2xl font-semibold mb-4">Refreshing Transcription</h3>
                    <p className="text-muted-foreground">
                        Updating transcription data...
                    </p>
                </div>
            </div>
        );
    }

    // Show error state if there's an error
    if (error) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-500 mb-4">{error}</div>
                    <Button
                        onClick={() => window.location.reload()}
                        variant="outline"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    // Show no transcription selected only if not loading and no error
    if (!transcriptionData) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <FileAudio className="h-16 w-16 mx-auto mb-6 text-muted-foreground" />
                    <h3 className="text-2xl font-semibold mb-4">No Transcription Selected</h3>
                    <p className="text-muted-foreground">
                        Select a transcription from the explorer to start editing.
                    </p>
                </div>
            </div>
        );
    }

    // Handler to save the edited title
    const handleSaveTitle = async () => {
        if (!transcriptionData?._id || !editedTitle.trim()) {
            setIsEditingTitle(false);
            return;
        }

        setIsSavingTitle(true);
        try {
            const response = await fetch(`/api/transcriptions/${transcriptionData._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: editedTitle.trim(),
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to update title');
            }

            // Update local state
            setTranscriptionData({
                ...transcriptionData,
                title: editedTitle.trim(),
            });

            setIsEditingTitle(false);
            toast.success('Title updated successfully');
        } catch (error) {
            console.error('Error updating title:', error);
            toast.error('Failed to update title');
        } finally {
            setIsSavingTitle(false);
        }
    };

    // Handler to start editing
    const handleStartEditingTitle = () => {
        setEditedTitle(transcriptionData.title || 'Untitled Transcription');
        setIsEditingTitle(true);
    };

    // Handler to cancel editing
    const handleCancelEditingTitle = () => {
        setIsEditingTitle(false);
        setEditedTitle("");
    };

    return (
        <div className="flex-1 flex flex-col h-full">
            {/* Audio Player */}
            {transcriptionData?.audioUrl && (
                <div className="p-4 border-b border-border">
                    <div className="mb-2 text-sm text-muted-foreground flex flex-row justify-between">
                        <div className="min-w-0 flex-1">
                            {isEditingTitle ? (
                                <div className="flex items-center gap-2">
                                    <Input
                                        value={editedTitle}
                                        onChange={(e) => setEditedTitle(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveTitle();
                                            if (e.key === 'Escape') handleCancelEditingTitle();
                                        }}
                                        className="text-xl font-bold h-auto py-1"
                                        autoFocus
                                        disabled={isSavingTitle}
                                    />
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleSaveTitle}
                                        disabled={isSavingTitle}
                                        className="flex-shrink-0"
                                    >
                                        {isSavingTitle ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Check className="h-4 w-4" />
                                        )}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleCancelEditingTitle}
                                        disabled={isSavingTitle}
                                        className="flex-shrink-0"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 group">
                                    <h1 className="text-xl font-bold truncate">
                                        {transcriptionData.title || 'Untitled Transcription'}
                                    </h1>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={handleStartEditingTitle}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 h-6 w-6 p-0"
                                    >
                                        <Edit2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-row items-center gap-2">
                            <span className="max-w-[30ch] truncate"> Audio (URL: {transcriptionData.audioUrl})</span>
                            <div className="flex flex-row items-center gap-2 cursor-pointer hover:text-primary" onClick={handleDuplicate}>
                                <Files className="h-4 w-4 mr-2" />
                                Duplicate
                            </div>
                            <div className="flex flex-row items-center gap-2 cursor-pointer hover:text-primary" onClick={copyAudioUrl}>
                                <Copy className="h-4 w-4 mr-2" />
                                URL
                            </div>
                            <div className="flex flex-row items-center gap-2 cursor-pointer hover:text-primary" onClick={copyCaptionJson}>
                                <Copy className="h-4 w-4 mr-2" />
                                JSON
                            </div>
                        </div>
                    </div>
                    <AudioPlayer />
                </div>
            )}

            {/* Main Editor Content */}
            <div className="flex-1 flex min-h-0">
                {/* Caption Editor with integrated timeline */}
                <div className="flex-1 flex flex-col">
                    <div className="flex-1 px-2 py-0">
                        <TiptapCaptionEditor
                            key={transcriptionData?._id + '-' + (transcriptionData?.updatedAt || '')}
                            transcriptionData={transcriptionData}
                            onTranscriptionDataUpdate={handleTranscriptionDataUpdate}
                            onStepChange={() => { }}
                            onRefreshTranscription={refreshTranscription}
                            defaultTimelineVisibility={true}
                        />
                    </div>
                </div>
            </div>

        </div>
    );
}

// Main component that provides the audio player context
export function EditorUI() {
    return (
        <AudioPlayerProvider>
            <EditorUIInner />
        </AudioPlayerProvider>
    );
}
