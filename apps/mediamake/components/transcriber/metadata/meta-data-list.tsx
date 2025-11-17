"use client";

import { MetaDataCard } from "./meta-data-card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, Play, Brain, Settings, ChevronDown, ChevronUp, CheckSquare, Square } from "lucide-react";
import { SchemaForm } from "@/components/editor/presets/form/schema-form";
import { toJSONSchema } from "zod";
import { useState, useMemo } from "react";
import { aiRouterRegistry } from "@/app/ai";

type MetadataShape = {
    sentences?: Array<{
        sentenceIndex: number;
        originalText?: string;
        metadata?: any;
        usage?: any;
    }>;
    [key: string]: any;
};

export function MetaDataList({
    metadata,
    currentSentenceIndex,
    availableAgents,
    selectedAgentPath,
    onSelectAgent,
    userRequest,
    onChangeRequest,
    isRunning,
    isRefreshing,
    onRefresh,
    onRun,
    onSaveSentence,
    isSaving,
    onAgentFormDataChange,
    selectedCaptions,
    onToggleCaption,
    onSelectAll,
    onDeselectAll,
}: {
    metadata: MetadataShape | null | undefined;
    currentSentenceIndex: number;
    availableAgents: { name: string; path: string }[];
    selectedAgentPath: string;
    onSelectAgent: (path: string) => void;
    userRequest: string;
    onChangeRequest: (s: string) => void;
    isRunning: boolean;
    isRefreshing: boolean;
    onRefresh: () => void | Promise<void>;
    onRun: () => void | Promise<void>;
    onSaveSentence: (sentenceIndex: number, updated: any) => Promise<void> | void;
    isSaving?: boolean;
    onAgentFormDataChange?: (formData: Record<string, any>) => void;
    selectedCaptions: Set<number>;
    onToggleCaption: (index: number) => void;
    onSelectAll: () => void;
    onDeselectAll: () => void;
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [agentFormData, setAgentFormData] = useState<Record<string, any>>({});

    const sentences = Array.isArray(metadata?.sentences) ? metadata!.sentences : [];

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
            // Filter out fields that shouldn't be displayed in the form
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

    return (
        <div className="space-y-3 relative">

            {/* Sticky Agent Toolbar */}
            <div className="sticky top-0 z-10 bg-background border-b p-3">
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 min-w-[220px]">
                        <Brain className="h-4 w-4" />
                        <div className="text-sm font-semibold">Transcription Metadata</div>
                        {isSaving && (
                            <div className="flex items-center gap-2 rounded bg-background/80 px-3 py-1 border">
                                <svg className="animate-spin h-4 w-4 text-muted-foreground" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                </svg>
                                <span className="text-xs text-muted-foreground">Saving...</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 border-l pl-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onSelectAll}
                            className="h-7 px-2 text-xs"
                        >
                            <CheckSquare className="h-3 w-3 mr-1" />
                            Select All
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onDeselectAll}
                            className="h-7 px-2 text-xs"
                        >
                            <Square className="h-3 w-3 mr-1" />
                            Clear
                        </Button>
                        {selectedCaptions.size > 0 && (
                            <span className="text-xs text-muted-foreground">
                                ({selectedCaptions.size} selected)
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Label className="text-xs">Agent</Label>
                        <Select value={selectedAgentPath} onValueChange={onSelectAgent}>
                            <SelectTrigger className="min-w-[220px] h-8">
                                <SelectValue placeholder="Select agent" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableAgents.map((a) => (
                                    <SelectItem key={a.path} value={a.path}>{a.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsExpanded(!isExpanded)}
                            disabled={!selectedAgentPath}
                            className="h-8 w-8 p-0"
                        >
                            {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                            ) : (
                                <Settings className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                    <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                        <Input
                            placeholder="Optional request/instructions for the agent"
                            value={userRequest}
                            onChange={(e) => onChangeRequest(e.target.value)}
                            className="h-8"
                        />
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onRefresh}
                            disabled={isRefreshing || isRunning}
                        >
                            <RefreshCw className={`h-3 w-3 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                            {isRefreshing ? 'Refreshing...' : 'Refresh'}
                        </Button>
                        <Button
                            onClick={onRun}
                            disabled={isRunning || !selectedAgentPath}
                            className="min-w-[100px] h-8"
                            size="sm"
                        >
                            <Play className="h-3 w-3 mr-2" />
                            {isRunning ? 'Running...' : 'Run'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Expandable Agent Parameters Form */}
            {isExpanded && selectedAgentPath && (
                <div className="border rounded-lg p-4 bg-muted/30">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium">Agent Parameters</h4>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsExpanded(false)}
                            className="h-6 w-6 p-0"
                        >
                            <ChevronUp className="h-4 w-4" />
                        </Button>
                    </div>
                    {jsonSchema && jsonSchema.properties ? (
                        <div className="max-h-[300px] overflow-y-auto">
                            <SchemaForm
                                schema={jsonSchema}
                                value={agentFormData}
                                onChange={(newData) => {
                                    setAgentFormData(newData);
                                    onAgentFormDataChange?.(newData);
                                }}
                                onReset={() => {
                                    const defaults = getDefaultValues(jsonSchema);
                                    setAgentFormData(defaults);
                                    onAgentFormDataChange?.(defaults);
                                }}
                                title=""
                                showTabs={false}
                                showResetButton={false}
                            />
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground">
                            No parameters available for this agent
                        </div>
                    )}
                </div>
            )}

            {/* Content */}
            {!metadata ? (
                <div className="text-sm text-muted-foreground">No metadata yet. Run an agent to generate it.</div>
            ) : (
                <>
                    {sentences.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No sentence-level metadata found.</div>
                    ) : (
                        sentences.map((s, idx) => (
                            <MetaDataCard
                                key={s.sentenceIndex ?? idx}
                                sentenceIndex={s.sentenceIndex ?? idx}
                                data={s}
                                isActive={(s.sentenceIndex ?? idx) === currentSentenceIndex}
                                onSave={(updated) => onSaveSentence(s.sentenceIndex ?? idx, updated)}
                                isSelected={selectedCaptions.has(s.sentenceIndex ?? idx)}
                                onToggleSelect={() => onToggleCaption(s.sentenceIndex ?? idx)}
                            />
                        ))
                    )}
                </>
            )}
        </div>
    );
}


