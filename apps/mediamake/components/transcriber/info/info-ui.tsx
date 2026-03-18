"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Info, Copy, Download, RefreshCw, Files } from "lucide-react";
import { useTranscriber } from "../contexts/transcriber-context";
import { JsonEditor } from "@/components/editor/player/json-editor";
import { toast } from "sonner";

export function InfoUI() {
    const { transcriptionData, refreshTranscription, setCurrentView } = useTranscriber();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const sunoLyrics =
        transcriptionData?.sunoLyrics ||
        transcriptionData?.processingData?.step1?.sunoLyrics ||
        "";

    const handleRefresh = async () => {
        if (!transcriptionData?._id) return;

        setIsLoading(true);
        setError(null);

        try {
            if (refreshTranscription) {
                await refreshTranscription();
            }
        } catch (err) {
            console.error('Error refreshing transcription:', err);
            setError('Failed to refresh transcription data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyJson = () => {
        if (!transcriptionData) return;

        navigator.clipboard.writeText(JSON.stringify(transcriptionData, null, 2));
        toast.success("Transcription data copied to clipboard");
    };

    const handleDownloadJson = () => {
        if (!transcriptionData) return;

        const blob = new Blob([JSON.stringify(transcriptionData, null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `transcription-${transcriptionData._id}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success("Transcription data downloaded");
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

    if (!transcriptionData) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <Info className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No Transcription Selected</h3>
                    <p className="text-muted-foreground">
                        Select a transcription to view its database document.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-border">
                <div className="flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    <h1 className="text-xl font-bold">Transcription Info</h1>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                    View and edit the complete database document for this transcription
                </p>
            </div>

            {/* Actions */}
            <div className="p-4 border-b border-border">
                <div className="flex items-center gap-2">
                    <Button
                        onClick={handleRefresh}
                        disabled={isLoading}
                        variant="outline"
                        size="sm"
                    >
                        {isLoading ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Refresh
                    </Button>
                    <Button
                        onClick={handleDuplicate}
                        variant="outline"
                        size="sm"
                    >
                        <Files className="h-4 w-4 mr-2" />
                        Duplicate
                    </Button>
                    <Button
                        onClick={handleCopyJson}
                        variant="outline"
                        size="sm"
                    >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy JSON
                    </Button>
                    <Button
                        onClick={handleDownloadJson}
                        variant="outline"
                        size="sm"
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Download JSON
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 overflow-y-auto">
                <div className="space-y-6">
                    {/* Step 1 Content */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Info className="h-5 w-5" />
                                Step 1: Audio Input Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Audio URL</label>
                                    <p className="text-sm break-all">{transcriptionData.audioUrl}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Language</label>
                                    <p className="text-sm">{transcriptionData.language || 'Auto-detect'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                                    <p className="text-sm">{transcriptionData.status || 'Unknown'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Created At</label>
                                    <p className="text-sm">{new Date(transcriptionData.createdAt || '').toLocaleString()}</p>
                                </div>
                            </div>

                            {transcriptionData.processingData?.step1 && (
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">Raw Text</label>
                                    <div className="mt-2 p-3 bg-muted rounded-md max-h-32 overflow-y-auto">
                                        <p className="text-sm whitespace-pre-wrap">{transcriptionData.processingData.step1.rawText}</p>
                                    </div>
                                </div>
                            )}

                            {sunoLyrics && (
                                <div>
                                    <label className="text-sm font-medium text-muted-foreground">
                                        Suno Lyrics (Source)
                                    </label>
                                    <div className="mt-2 p-3 bg-muted rounded-md max-h-48 overflow-y-auto">
                                        <p className="text-sm whitespace-pre-wrap">{sunoLyrics}</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Database Document */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Info className="h-5 w-5" />
                                Complete Database Document
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[600px] border rounded-md">
                                <JsonEditor
                                    value={transcriptionData}
                                    onChange={() => { }} // Read-only for now
                                    height="100%"
                                    className="h-full"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="p-4 border-t border-border">
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="text-red-700 text-sm">{error}</div>
                    </div>
                </div>
            )}
        </div>
    );
}
