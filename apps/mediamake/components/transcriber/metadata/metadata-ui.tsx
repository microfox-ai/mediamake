"use client";

import { useTranscriber } from "../contexts/transcriber-context";
import { useEffect, useMemo, useState } from "react";
import { aiRouterRegistry } from "@/app/ai";
import { callAgent } from "@/components/agents/agent-helper";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Play, Brain, CheckSquare, Square, History, Clock, CheckCircle, MoreVertical, Trash2 } from "lucide-react";
import { TiptapCaptionEditor } from "../tiptap/tiptap-caption-editor";
import { AudioPlayerProvider, useAudioPlayer } from "../audio-player-context";
import { AudioPlayer } from "../audio-player";
import { MetaDataCard } from "@/components/transcriber/metadata/meta-data-card";
import { SchemaForm } from "@/components/editor/presets/form/schema-form";
import { toJSONSchema } from "zod";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

// Helper function to generate smart title from form data
const generateSmartTitle = (formData: Record<string, any>, agentName: string): string => {
    // Try to find meaningful data for title
    if (formData.userRequest && typeof formData.userRequest === 'string') {
        const truncated = formData.userRequest.length > 40 ? formData.userRequest.substring(0, 40) + '...' : formData.userRequest;
        return `${agentName}: ${truncated}`;
    }
    
    // Fallback to agent name + timestamp
    const date = new Date().toLocaleString();
    return `${agentName} (${date})`;
};

function MetadataUIInner() {

    const {
        transcriptionData,
        setTranscriptionData,
        refreshTranscription,
        isLoading,
        setIsLoading,
        isRefreshing,
        error,
        setError
    } = useTranscriber();

    const { currentTime, setAudioUrl } = useAudioPlayer();

    const [selectedAgentPath, setSelectedAgentPath] = useState<string>("");
    const [userRequest, setUserRequest] = useState<string>("");
    const [isRunning, setIsRunning] = useState(false);
    const [metadataResult, setMetadataResult] = useState<any | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [agentFormData, setAgentFormData] = useState<Record<string, any>>({});
    const [selectedCaptions, setSelectedCaptions] = useState<Set<number>>(new Set());
    const [activeTab, setActiveTab] = useState<string>("editor"); // "editor" value kept for compatibility, but displays as "Caption Selector"

    // Use form persistence hook for history management
    const {
        savedEntries,
        saveFormData,
        loadEntry,
        deleteEntry,
        clearAllData
    } = useFormPersistence({
        agentPath: selectedAgentPath || 'metadata-default',
        initialFormData: agentFormData,
        onFormDataChange: (data) => {
            setAgentFormData(data);
        },
        onOutputChange: () => {
            // Refresh transcription to see updated metadata
            if (refreshTranscription) {
                refreshTranscription();
            }
        }
    });

    // Derive current sentence index from audio time and captions
    const currentSentenceIndex = useMemo(() => {
        if (!transcriptionData?.captions || transcriptionData.captions.length === 0) return -1;
        const idx = transcriptionData.captions.findIndex(c => {
            const start = c.absoluteStart ?? 0;
            const end = c.absoluteEnd ?? 0;
            return currentTime >= start && currentTime < end;
        });
        return idx;
    }, [currentTime, transcriptionData?.captions]);

    // Set audio URL when transcription data changes
    useEffect(() => {
        if (transcriptionData?.audioUrl) {
            setAudioUrl(transcriptionData.audioUrl);
        }
    }, [transcriptionData?.audioUrl, setAudioUrl]);

    // Build list of metadata agents from aiRouterRegistry
    const availableAgents = useMemo(() => {
        const list: { name: string; path: string }[] = [];
        for (const [path, value] of Object.entries(aiRouterRegistry.map)) {
            for (const agent of value.agents) {
                const meta = agent.actAsTool?.metadata as any;
                const hasMetadataTag = Array.isArray(meta?.tags) && meta.tags.includes('sentence-metadata');
                const hidden = meta?.hideUI === true; // align with app sidebar logic
                if (agent.actAsTool && hasMetadataTag && !hidden) {
                    list.push({ name: agent.actAsTool.name, path });
                    break; // one entry per route path
                }
            }
        }
        return list.sort((a, b) => a.name.localeCompare(b.name));
    }, []);

    useEffect(() => {
        if (!selectedAgentPath && availableAgents.length > 0) {
            setSelectedAgentPath(availableAgents[0].path);
        }
    }, [availableAgents, selectedAgentPath]);

    const runSelectedAgent = async () => {
        if (!transcriptionData) return;
        if (!selectedAgentPath) return;
        try {
            setIsRunning(true);
            setError(null);
            const hasTranscriptionId = Boolean(transcriptionData._id);
            const params: Record<string, any> = {
                // Include form data from the agent parameters
                ...agentFormData,
            };
            if (userRequest.trim()) params.userRequest = userRequest.trim();
            
            // If captions are selected, only send selected ones
            const captionsToProcess = selectedCaptions.size > 0
                ? Array.from(selectedCaptions).sort((a, b) => a - b)
                : null;
            
            if (hasTranscriptionId) {
                params.transcriptionId = transcriptionData._id;
                // If specific captions are selected, pass their indices
                if (captionsToProcess) {
                    params.selectedIndices = captionsToProcess;
                }
            } else if (Array.isArray(transcriptionData.captions)) {
                // If no transcription ID, send the actual caption texts
                if (captionsToProcess) {
                    params.sentences = captionsToProcess.map(idx => transcriptionData.captions[idx].text);
                } else {
                    params.sentences = transcriptionData.captions.map(c => c.text);
                }
            }
            const output = await callAgent(selectedAgentPath as any, params);
            //setMetadataResult(output);
            if (refreshTranscription && typeof refreshTranscription === 'function') {
                await refreshTranscription();
            }
            
            // Auto-save to history with smart title
            const agentName = availableAgents.find(a => a.path === selectedAgentPath)?.name || 'Agent';
            const title = generateSmartTitle(params, agentName);
            await saveFormData(title, params, output);
            
            toast.success(`Metadata agent ran successfully${captionsToProcess ? ` on ${captionsToProcess.length} selected caption(s)` : ''}`);
        } catch (e: any) {
            console.error('Failed to run metadata agent', e);
            setError(e?.message || 'Failed to run metadata agent');
            toast.error(e?.message || 'Failed to run metadata agent');
        } finally {
            setIsRunning(false);
        }
    };

    const handleSaveSentenceMetadata = async (sentenceIndex: number, updated: any) => {
        if (!transcriptionData) return;
        try {
            setIsSaving(true);
            let next = transcriptionData?.captions
            next[sentenceIndex].metadata = updated;

            // persist to DB (captions + processingData.step4.metadata)
            const response = await fetch(`/api/transcriptions/${transcriptionData._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    captions: next,
                    processingData: {
                        ...transcriptionData.processingData,
                        step4: {
                            ...transcriptionData.processingData?.step4,
                            metadata: {
                                ...transcriptionData.processingData?.step4?.metadata,
                                sentences: next.map(c => c.metadata),
                            },
                            updatedAt: new Date().toISOString(),
                        }
                    }
                })
            });
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setTranscriptionData(data.transcription);
                    // ensure UI reflects latest DB state
                    // await refreshTranscription();
                }
                else {
                    toast.error('Failed to save');
                }
            }
        } catch (e) {
            toast.error("Failed to save")
            console.error('Failed to save sentence metadata', e);
        } finally {
            setIsSaving(false);
        }
    };

    const metadataShape = useMemo(() => {
        return {
            sentences: transcriptionData?.captions?.map((c: any, index: number) => {
                return {
                    sentenceIndex: index,
                    originalText: c.text,
                    metadata: c.metadata,
                };
            }),
        };
    }, [transcriptionData?.captions]);

    const handleToggleCaption = (index: number) => {
        setSelectedCaptions(prev => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    };

    const handleSelectAll = () => {
        if (!transcriptionData?.captions) return;
        const allIndices = new Set(transcriptionData.captions.map((_, idx) => idx));
        setSelectedCaptions(allIndices);
    };

    const handleDeselectAll = () => {
        setSelectedCaptions(new Set());
    };

    // Get agent schema directly from registry
    const agentSchema = useMemo(() => {
        if (!selectedAgentPath) return null;
        const agentConfig = aiRouterRegistry.map[selectedAgentPath];
        const agent = agentConfig?.agents?.[0];
        return agent?.actAsTool?.inputSchema || null;
    }, [selectedAgentPath]);

    // Get default values from schema
    const getDefaultValues = (schema: any): Record<string, any> => {
        if (!schema || !schema.properties) return {};
        const defaults: Record<string, any> = {};
        const requiredFields = schema.required || [];
        Object.entries(schema.properties).forEach(([key, field]: [string, any]) => {
            if (field.default !== undefined) {
                defaults[key] = field.default;
            } else if (requiredFields.includes(key)) {
                if (field.type === 'array') {
                    defaults[key] = [];
                } else if (field.type === 'object') {
                    defaults[key] = {};
                } else if (field.type === 'boolean') {
                    defaults[key] = false;
                } else {
                    defaults[key] = '';
                }
            }
        });
        return defaults;
    };

    // Convert zod schema to JSON schema and filter out unwanted fields
    const jsonSchema = useMemo(() => {
        if (agentSchema && typeof agentSchema === 'object' && agentSchema._def) {
            const fullSchema = toJSONSchema(agentSchema);
            const filteredSchema = {
                ...fullSchema,
                properties: Object.fromEntries(
                    Object.entries(fullSchema.properties || {}).filter(
                        ([key]) => !['transcriptionId', 'sentences', 'userRequest'].includes(key)
                    )
                ),
                required: (fullSchema.required || []).filter(
                    (field: string) => !['transcriptionId', 'sentences', 'userRequest'].includes(field)
                )
            };
            return filteredSchema;
        }
        return agentSchema;
    }, [agentSchema]);

    // Initialize form data when schema changes
    useMemo(() => {
        if (jsonSchema) {
            const defaultValues = getDefaultValues(jsonSchema);
            setAgentFormData(defaultValues);
        }
    }, [jsonSchema]);

    const sentences = useMemo(() => {
        return Array.isArray(metadataShape?.sentences) ? metadataShape!.sentences : [];
    }, [metadataShape]);

    // Format timestamp for history display
    const formatTimestamp = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

        if (diffInHours < 1) {
            return 'Just now';
        } else if (diffInHours < 24) {
            return `${Math.floor(diffInHours)}h ago`;
        } else {
            return date.toLocaleDateString();
        }
    };

    // Handle loading history entry
    const handleLoadHistory = async (entryId: string) => {
        await loadEntry(entryId);
        // Switch to run agents tab to see the loaded data
        setActiveTab('run-agents');
        toast.success('History entry loaded');
    };

    return (
        <div className="flex-1 flex flex-col h-full w-full">
            {/* New Layout: Left Tabs, Right Audio Player + Captions */}
            <div className="flex-1 flex min-h-0 gap-4 p-4">
                {/* Left - Tabs (Caption Selector / Run Agents) */}
                <div className="flex-1 flex flex-col border rounded-lg min-w-0">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                        <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
                            <TabsTrigger 
                                value="editor" 
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                            >
                                Caption Selector
                            </TabsTrigger>
                            <TabsTrigger 
                                value="run-agents"
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                            >
                                Run Agents
                            </TabsTrigger>
                            <TabsTrigger 
                                value="history"
                                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent flex items-center gap-2"
                            >
                                <History className="h-4 w-4" />
                                History ({savedEntries.length})
                            </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="editor" className="flex-1 p-4 min-h-0 mt-0">
                            {transcriptionData && (
                                <TiptapCaptionEditor
                                    key={transcriptionData?._id + '-' + (transcriptionData?.updatedAt || '')}
                                    transcriptionData={transcriptionData}
                                    onTranscriptionDataUpdate={async () => { }}
                                    onStepChange={() => { }}
                                    onRefreshTranscription={refreshTranscription}
                                    defaultTimelineVisibility={false}
                                />
                            )}
                        </TabsContent>
                        
                        <TabsContent value="run-agents" className="flex-1 flex flex-col mt-0 min-h-0">
                            {/* Scrollable Content Area */}
                            <div className="flex-1 overflow-y-auto p-4 min-h-0">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Brain className="h-5 w-5" />
                                        <h3 className="text-lg font-semibold">Run Metadata Agent</h3>
                                        {isSaving && (
                                            <div className="flex items-center gap-2 rounded bg-background/80 px-3 py-1 border ml-auto">
                                                <svg className="animate-spin h-4 w-4 text-muted-foreground" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                                </svg>
                                                <span className="text-xs text-muted-foreground">Saving...</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Caption Selection Controls */}
                                    <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
                                        <Label className="text-sm font-medium">Caption Selection:</Label>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleSelectAll}
                                            className="h-8 px-3"
                                        >
                                            <CheckSquare className="h-3 w-3 mr-2" />
                                            Select All
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleDeselectAll}
                                            className="h-8 px-3"
                                        >
                                            <Square className="h-3 w-3 mr-2" />
                                            Clear
                                        </Button>
                                        {selectedCaptions.size > 0 && (
                                            <span className="text-sm text-muted-foreground ml-auto">
                                                {selectedCaptions.size} caption{selectedCaptions.size !== 1 ? 's' : ''} selected
                                            </span>
                                        )}
                                    </div>

                                    {/* Agent Selection */}
                                    <div className="space-y-2">
                                        <Label>Select Agent</Label>
                                        <Select value={selectedAgentPath} onValueChange={setSelectedAgentPath}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select an agent" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableAgents.map((a) => (
                                                    <SelectItem key={a.path} value={a.path}>{a.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Agent Parameters Form - Always Visible */}
                                    {selectedAgentPath && jsonSchema && jsonSchema.properties && Object.keys(jsonSchema.properties).length > 0 && (
                                        <div className="border rounded-lg p-4 bg-muted/30">
                                            <h4 className="text-sm font-medium mb-3">Agent Parameters</h4>
                                            <div className="space-y-4">
                                                <SchemaForm
                                                    schema={jsonSchema}
                                                    value={agentFormData}
                                                    onChange={(newData) => {
                                                        setAgentFormData(newData);
                                                    }}
                                                    onReset={() => {
                                                        const defaults = getDefaultValues(jsonSchema);
                                                        setAgentFormData(defaults);
                                                    }}
                                                    title=""
                                                    showTabs={false}
                                                    showResetButton={true}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* User Request */}
                                    <div className="space-y-2">
                                        <Label>Optional Instructions</Label>
                                        <Input
                                            placeholder="Enter any additional instructions for the agent..."
                                            value={userRequest}
                                            onChange={(e) => setUserRequest(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Fixed Bottom Buttons */}
                            <div className="border-t bg-background p-4">
                                <div className="flex items-center gap-2">
                                    <Button
                                        onClick={runSelectedAgent}
                                        disabled={isRunning || !selectedAgentPath}
                                        className="flex-1"
                                        size="lg"
                                    >
                                        <Play className="h-4 w-4 mr-2" />
                                        {isRunning ? 'Running Agent...' : 'Run Agent'}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={refreshTranscription}
                                        disabled={isRefreshing || isRunning}
                                        size="lg"
                                    >
                                        <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                                        {isRefreshing ? 'Refreshing...' : 'Refresh'}
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="history" className="flex-1 overflow-y-auto mt-0">
                            <div className="p-4">
                                {savedEntries.length > 0 ? (
                                    <div className="space-y-3">
                                        {savedEntries.map((entry) => (
                                            <div
                                                key={entry.id}
                                                onClick={() => handleLoadHistory(entry.id)}
                                                className="p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors group"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-medium text-sm truncate">{entry.title}</h4>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <Clock className="h-3 w-3 text-muted-foreground" />
                                                            <span className="text-xs text-muted-foreground">
                                                                {formatTimestamp(entry.timestamp)}
                                                            </span>
                                                            {entry.output && (
                                                                <Badge variant="outline" className="gap-1 text-xs">
                                                                    <CheckCircle className="h-3 w-3" />
                                                                    Completed
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        {/* Show agent path */}
                                                        <div className="mt-1 text-xs text-muted-foreground truncate">
                                                            Agent: {entry.agentPath}
                                                        </div>
                                                    </div>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    deleteEntry(entry.id);
                                                                    toast.success('History entry deleted');
                                                                }}
                                                                className="text-destructive"
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-2" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="text-center">
                                            <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                            <h3 className="text-sm font-medium mb-1">No History Yet</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Run a metadata agent to create your first history entry.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Right - Audio Player + Captions */}
                <div className="w-[45%] min-w-[400px] max-w-[600px] flex flex-col gap-4">
                    {/* Audio Player */}
                    {transcriptionData?.audioUrl && (
                        <div className="border rounded-lg p-4">
                            <div className="mb-3">
                                <h3 className="text-sm font-semibold mb-1">Audio Player</h3>
                                <div className="text-xs text-muted-foreground truncate">
                                    {transcriptionData.audioUrl}
                                </div>
                            </div>
                            <AudioPlayer />
                        </div>
                    )}

                    {/* Captions List */}
                    <div className="flex-1 border rounded-lg overflow-hidden flex flex-col">
                        <div className="p-3 border-b bg-muted/30">
                            <h3 className="text-sm font-semibold">Caption Metadata</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                                {sentences.length} caption{sentences.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                            {!metadataShape ? (
                                <div className="text-sm text-muted-foreground text-center py-8">
                                    No metadata yet. Run an agent to generate it.
                                </div>
                            ) : sentences.length === 0 ? (
                                <div className="text-sm text-muted-foreground text-center py-8">
                                    No sentence-level metadata found.
                                </div>
                            ) : (
                                sentences.map((s, idx) => (
                                    <MetaDataCard
                                        key={s.sentenceIndex ?? idx}
                                        sentenceIndex={s.sentenceIndex ?? idx}
                                        data={s}
                                        isActive={(s.sentenceIndex ?? idx) === currentSentenceIndex}
                                        onSave={(updated) => handleSaveSentenceMetadata(s.sentenceIndex ?? idx, updated)}
                                        isSelected={selectedCaptions.has(s.sentenceIndex ?? idx)}
                                        onToggleSelect={() => handleToggleCaption(s.sentenceIndex ?? idx)}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function MetadataUI() {
    return (
        <AudioPlayerProvider>
            <MetadataUIInner />
        </AudioPlayerProvider>
    );
}


