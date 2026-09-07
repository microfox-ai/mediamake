"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
    Bot,
    Sparkles,
    Loader2,
    Check,
    X,
    AlertCircle,
    Users,
    Copy,
    Edit2,
    Scissors,
    FileText
} from "lucide-react";
import {
    STRUCTURE_PROFILES,
    SPLIT_DENSITY_OPTIONS,
    DEFAULT_STRUCTURE_PROFILE_ID,
    type SplitDensity,
} from "@/app/ai/agents/autofix/lib/structureProfiles";
import { getReferenceLyricsText } from "@/app/ai/agents/autofix/lib/lyricsReference";
import { useTranscriber } from "../contexts/transcriber-context";
import { AudioPlayerProvider, useAudioPlayer } from "../audio-player-context";
import { AudioPlayer } from "../audio-player";
import { Transcription } from "@/app/types/transcription";
import { toast } from "sonner";
import { callAgent } from "@/components/agents/agent-helper";
import { aiRouterRegistry } from "@/app/ai";

// Internal component that uses the audio player context
function AutofixUIInner() {
    const {
        transcriptionData,
        setTranscriptionData,
        refreshTranscription,
        isLoading,
        isRefreshing,
        error
    } = useTranscriber();

    const { setAudioUrl } = useAudioPlayer();

    const [userRequest, setUserRequest] = useState("");
    const [userWrittenTranscription, setUserWrittenTranscription] = useState("");
    const [isAIFixing, setIsAIFixing] = useState(false);
    const [aiChanges, setAiChanges] = useState<any[]>([]);
    const [aiConfidence, setAiConfidence] = useState<number>(0);
    const [aiFixesAppliedToDatabase, setAiFixesAppliedToDatabase] = useState(false);
    const [autofixError, setAutofixError] = useState<string | null>(null);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState("");
    const [isSavingTitle, setIsSavingTitle] = useState(false);
    const [selectedAgentPath, setSelectedAgentPath] = useState<string>("");

    // Sentence-structure options
    const [structureStyle, setStructureStyle] = useState<string>(DEFAULT_STRUCTURE_PROFILE_ID);
    const [splitDensity, setSplitDensity] = useState<SplitDensity>("auto");
    // Spelling options
    const [useReferenceLyrics, setUseReferenceLyrics] = useState(true);
    const [allowWordRemoval, setAllowWordRemoval] = useState(false);

    // Build list of autofix agents from aiRouterRegistry
    const availableAutofixAgents = useMemo(() => {
        const list: { name: string; path: string; description?: string; icon?: string }[] = [];
        for (const [path, value] of Object.entries(aiRouterRegistry.map)) {
            for (const agent of value.agents) {
                const meta = agent.actAsTool?.metadata as any;
                const hasAutofixTag = Array.isArray(meta?.tags) && meta.tags.includes('transcription-autofix');
                const hidden = meta?.hideUI === true;
                if (agent.actAsTool && hasAutofixTag && !hidden) {
                    list.push({ 
                        name: agent.actAsTool.name, 
                        path,
                        description: meta.description || agent.actAsTool.description,
                        icon: meta.icon
                    });
                    break;
                }
            }
        }
        return list.sort((a, b) => a.name.localeCompare(b.name));
    }, []);

    // Which extra option panels apply to the currently selected agent. The
    // orchestrator can dispatch to either fixer, so it shows both.
    const isOrchestrator = selectedAgentPath.replace(/\/$/, "").endsWith("/autofix");
    const showStructureOptions =
        isOrchestrator || selectedAgentPath.endsWith("sentence-structure");
    const showSpellingOptions =
        isOrchestrator || selectedAgentPath.endsWith("spelling");

    const selectedProfile = useMemo(
        () => STRUCTURE_PROFILES.find(p => p.id === structureStyle),
        [structureStyle]
    );

    const referenceLyrics =
        getReferenceLyricsText(transcriptionData ?? undefined) ?? "";

    // Set default agent on load
    useEffect(() => {
        if (!selectedAgentPath && availableAutofixAgents.length > 0) {
            // Default to orchestrator if available
            const orchestrator = availableAutofixAgents.find(a => a.name.includes('Orchestrator'));
            setSelectedAgentPath(orchestrator?.path || availableAutofixAgents[0].path);
        }
    }, [availableAutofixAgents, selectedAgentPath]);

    // Set audio URL when transcription data changes
    useEffect(() => {
        if (transcriptionData?.audioUrl) {
            console.log('Setting audio URL:', transcriptionData.audioUrl);
            setAudioUrl(transcriptionData.audioUrl);
        }
    }, [transcriptionData?.audioUrl, setAudioUrl]);

    // Load existing autofix data if available
    useEffect(() => {
        if (transcriptionData?.processingData?.step2?.aiAutofix) {
            const autofix = transcriptionData.processingData.step2.aiAutofix;
            setUserRequest(autofix.userRequest || "");
            setUserWrittenTranscription(autofix.userWrittenTranscription || "");
        }
    }, [transcriptionData]);

    const copyAudioUrl = () => {
        if (!transcriptionData?.audioUrl) {
            toast.error('No audio URL available');
            return;
        }

        navigator.clipboard.writeText(transcriptionData.audioUrl);
        toast.success('Audio URL copied to clipboard');
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
        if (!transcriptionData) return;
        setEditedTitle(transcriptionData.title || 'Untitled Transcription');
        setIsEditingTitle(true);
    };

    // Handler to cancel editing
    const handleCancelEditingTitle = () => {
        setIsEditingTitle(false);
        setEditedTitle("");
    };

    const handleTranscriptionDataUpdate = async (updatedData: any) => {
        try {
            const response = await fetch(`/api/transcriptions/${updatedData._id ?? transcriptionData?._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...(updatedData.captions && { captions: updatedData.captions }),
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

    const handleAIAutofix = async () => {
        if (!transcriptionData?._id) {
            setAutofixError("Transcription ID not found. Cannot perform AI autofix.");
            return;
        }

        if (!selectedAgentPath) {
            setAutofixError("Please select an autofix agent.");
            return;
        }

        setIsAIFixing(true);
        setAutofixError(null);

        try {
            const result = await callAgent(selectedAgentPath, {
                transcriptionId: transcriptionData._id,
                userRequest: userRequest.trim() || undefined,
                userWrittenTranscription: userWrittenTranscription.trim() || undefined,
                applyToDatabase: true, // Apply directly to database
                ...(showStructureOptions && {
                    structureStyle,
                    splitDensity,
                }),
                ...(showSpellingOptions && {
                    useReferenceLyrics,
                    allowWordRemoval,
                }),
            })

            console.log('AI autofix result:', result);
            if (result && result.success) {
                setAiChanges(result.changes);
                setAiConfidence(result.confidence);

                // If fixes were automatically applied to database, refresh and update UI
                if (result.appliedToDatabase) {
                    setAiFixesAppliedToDatabase(true);

                    // Refresh transcription data from database to get the latest updates
                    if (refreshTranscription) {
                        await refreshTranscription();
                    }

                    toast.success(`AI autofix completed and applied! ${result.changes.length} changes made with ${(result.confidence * 100).toFixed(1)}% confidence.`);
                } else {
                    setAiFixesAppliedToDatabase(false);
                    toast.success(`AI autofix completed! ${result.changes.length} changes made with ${(result.confidence * 100).toFixed(1)}% confidence. Review and apply changes.`);
                }
            } else {
                if (refreshTranscription) {
                    await refreshTranscription();
                }
                throw new Error('AI autofix might have failed - no result returned');
            }
        } catch (err) {
            console.error('AI autofix error:', err);
            setAutofixError(err instanceof Error ? err.message : 'Failed to perform AI autofix');
            toast.error('AI autofix failed');
        } finally {
            setIsAIFixing(false);
        }
    };

    const handleApplyAIFixes = async () => {
        if (aiChanges.length === 0) {
            setAutofixError("No AI fixes to apply");
            return;
        }

        toast.success("AI fixes are already applied automatically!");
    };

    const handleClear = () => {
        setAiChanges([]);
        setAiConfidence(0);
        setAiFixesAppliedToDatabase(false);
        setAutofixError(null);
    };

    // Show loading state
    if (isLoading || isRefreshing) {
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

    // Show error state if there's an error
    if (error) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-500 mb-4">{error}</div>
                </div>
            </div>
        );
    }

    // Show no transcription selected
    if (!transcriptionData) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <Bot className="h-16 w-16 mx-auto mb-6 text-muted-foreground" />
                    <h3 className="text-2xl font-semibold mb-4">No Transcription Selected</h3>
                    <p className="text-muted-foreground">
                        Select a transcription from the explorer to start using AI autofix.
                    </p>
                </div>
            </div>
        );
    }

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

            {/* Header */}
            <div className="py-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <Bot className="h-6 w-6 text-primary" />
                    <div>
                        <h1 className="text-2xl font-bold">AI Autofix</h1>
                        <p className="text-muted-foreground">
                            Use AI to automatically fix transcription errors, improve word boundaries, and enhance sentence structure.
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6 overflow-y-auto">
                <div className="space-y-6">
                    {/* AI Autofix Section */}

                    <div className="space-y-4">
                        {/* Agent Selector */}
                        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                            <Label className="text-sm font-semibold whitespace-nowrap">Autofix Agent:</Label>
                            <Select value={selectedAgentPath} onValueChange={setSelectedAgentPath}>
                                <SelectTrigger className="w-full max-w-md">
                                    <SelectValue placeholder="Select an autofix agent" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableAutofixAgents.map((agent) => (
                                        <SelectItem key={agent.path} value={agent.path}>
                                            <div className="flex items-center gap-2">
                                                {agent.icon && <span>{agent.icon}</span>}
                                                <span>{agent.name}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {selectedAgentPath && (
                                <Badge variant="outline" className="ml-auto">
                                    {availableAutofixAgents.find(a => a.path === selectedAgentPath)?.icon || '🔧'}
                                </Badge>
                            )}
                        </div>

                        {/* Agent Description */}
                        {selectedAgentPath && (
                            <div className="text-sm text-muted-foreground p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                <span className="font-semibold">Description: </span>
                                {availableAutofixAgents.find(a => a.path === selectedAgentPath)?.description || 'No description available'}
                            </div>
                        )}

                        {/* Sentence structure options */}
                        {showStructureOptions && (
                            <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
                                <div className="flex items-center gap-2">
                                    <Scissors className="h-4 w-4 text-primary" />
                                    <Label className="text-sm font-semibold">Caption structure</Label>
                                    {isOrchestrator && (
                                        <Badge variant="outline" className="text-[10px]">
                                            applies if the structure fixer runs
                                        </Badge>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="structureStyle" className="text-xs text-muted-foreground">
                                            Delivery style
                                        </Label>
                                        <Select value={structureStyle} onValueChange={setStructureStyle}>
                                            <SelectTrigger id="structureStyle" className="w-full">
                                                <SelectValue placeholder="Select a delivery style" />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-80">
                                                {STRUCTURE_PROFILES.map((profile) => (
                                                    <SelectItem key={profile.id} value={profile.id}>
                                                        {profile.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="splitDensity" className="text-xs text-muted-foreground">
                                            Division amount
                                        </Label>
                                        <Select
                                            value={splitDensity}
                                            onValueChange={(v) => setSplitDensity(v as SplitDensity)}
                                        >
                                            <SelectTrigger id="splitDensity" className="w-full">
                                                <SelectValue placeholder="Profile default" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {SPLIT_DENSITY_OPTIONS.map((option) => (
                                                    <SelectItem key={option.id} value={option.id}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {selectedProfile && (
                                    <div className="text-xs text-muted-foreground space-y-1">
                                        <p>{selectedProfile.description}</p>
                                        <p className="font-mono text-[11px] opacity-80">
                                            ~{selectedProfile.targetChars} chars / ~{selectedProfile.targetWords} words per line
                                            {" · "}max {selectedProfile.maxChars} chars
                                            {" · "}breaks on gaps ≥ {selectedProfile.hardGapSeconds}s
                                            {splitDensity !== "auto" && (
                                                <> {" · "}adjusted: {SPLIT_DENSITY_OPTIONS.find(o => o.id === splitDensity)?.label.toLowerCase()}</>
                                            )}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Spelling options */}
                        {showSpellingOptions && (
                            <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-primary" />
                                    <Label className="text-sm font-semibold">Word corrections</Label>
                                    <Badge
                                        variant={referenceLyrics ? "default" : "outline"}
                                        className="text-[10px]"
                                    >
                                        {referenceLyrics
                                            ? `Suno lyrics available (${referenceLyrics.trim().split(/\s+/).length} words)`
                                            : "No Suno lyrics on this transcription"}
                                    </Badge>
                                </div>

                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <Label htmlFor="useReferenceLyrics" className="text-xs">
                                            Use Suno lyrics as reference
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Corrects words ElevenLabs misheard against the lyrics the song was generated from.
                                        </p>
                                    </div>
                                    <Switch
                                        id="useReferenceLyrics"
                                        checked={useReferenceLyrics}
                                        onCheckedChange={setUseReferenceLyrics}
                                        disabled={!referenceLyrics}
                                    />
                                </div>

                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <Label htmlFor="allowWordRemoval" className="text-xs">
                                            Remove hallucinated words
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Deletes words that are absent from the lyrics and duplicate a neighbour. Off by default.
                                        </p>
                                    </div>
                                    <Switch
                                        id="allowWordRemoval"
                                        checked={allowWordRemoval}
                                        onCheckedChange={setAllowWordRemoval}
                                    />
                                </div>

                                <p className="text-xs text-muted-foreground">
                                    Only single words are replaced — timestamps and caption line boundaries are never modified.
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="userRequest">User Request (Optional)</Label>
                                <Textarea
                                    id="userRequest"
                                    value={userRequest}
                                    onChange={(e) => setUserRequest(e.target.value)}
                                    placeholder="e.g., Fix spelling errors and improve sentence flow..."
                                    className="min-h-[200px] resize-none overflow-y-auto"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="userWrittenTranscription">Your Written Version (Optional)</Label>
                                <Textarea
                                    id="userWrittenTranscription"
                                    value={userWrittenTranscription}
                                    onChange={(e) => setUserWrittenTranscription(e.target.value)}
                                    placeholder="Paste your corrected version here for reference..."
                                    className="h-[400px] resize-none overflow-y-auto"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            <Button
                                onClick={handleAIAutofix}
                                disabled={isAIFixing}
                                variant="default"
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {isAIFixing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        AI Fixing...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        AI Autofix
                                    </>
                                )}
                            </Button>

                            {aiChanges.length > 0 && !aiFixesAppliedToDatabase && (
                                <>
                                    <Button
                                        onClick={handleApplyAIFixes}
                                        variant="default"
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        <Check className="h-4 w-4 mr-2" />
                                        Apply AI Fixes
                                    </Button>
                                    <Button
                                        onClick={handleClear}
                                        variant="outline"
                                        size="sm"
                                    >
                                        <X className="h-4 w-4 mr-2" />
                                        Clear
                                    </Button>
                                </>
                            )}
                        </div>

                        {/* AI Changes Display */}
                        {aiChanges.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Label>AI Changes Made</Label>
                                    {aiFixesAppliedToDatabase && (
                                        <Badge className="bg-green-100 text-green-800">
                                            <Check className="h-3 w-3 mr-1" />
                                            Applied to Database
                                        </Badge>
                                    )}
                                </div>
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="space-y-2">
                                        {aiChanges.map((change, index) => (
                                            <div key={index} className="text-sm">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Badge variant="outline" className="text-xs">
                                                        {change.type.replace('_', ' ')}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground">
                                                        {change.confidence ? `${(change.confidence * 100).toFixed(0)}% confidence` : ''}
                                                    </span>
                                                </div>
                                                <div className="text-xs">
                                                    <span className="text-red-600 line-through">{change.original}</span>
                                                    <span className="mx-2">→</span>
                                                    <span className="text-green-600">{change.fixed}</span>
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    {change.reason}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Human Correction Section */}
                    {/* <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-green-600" />
                                Human Correction
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-muted-foreground">
                                For manual corrections, use the main editor interface. This tab focuses on AI-powered autofix capabilities.
                            </div>
                        </CardContent>
                    </Card> */}

                    {/* Error Display */}
                    {autofixError && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center gap-2 text-red-700">
                                <AlertCircle className="h-4 w-4" />
                                <span className="font-medium">Error:</span>
                            </div>
                            <p className="text-red-600 mt-1">{autofixError}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Main component that provides the audio player context
export function AutofixUI() {
    return (
        <AudioPlayerProvider>
            <AutofixUIInner />
        </AudioPlayerProvider>
    );
}
