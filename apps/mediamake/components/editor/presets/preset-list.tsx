"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Trash2, Play, Loader2, RefreshCw, GripVertical, Copy, Save, Upload, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { Preset, DatabasePreset, PresetInputData, AppliedPresetsState, AppliedPreset, DefaultPresetData } from "./types";
import { SchemaForm } from "./form/schema-form";
import { usePresetContext } from "./preset-provider";
import { OutputCard } from "./output-card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { getPredefinedPresetById } from "./registry/registry/presets-registry";
import { SavePresetDialog } from "./save-preset-dialog";
import { LoadPresetDialog } from "./load-preset-dialog";
import { DefaultCard } from "./form/default-card";
import { createBaseDataFromReferences } from "./engine/preset-data-mutation";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Types for applied presets

interface SortablePresetItemProps {
    appliedPreset: AppliedPreset;
    onToggleExpansion: (id: string) => void;
    onUpdateInputData: (id: string, inputData: PresetInputData) => void;
    onRefresh: (id: string) => void;
    onCopy: (id: string) => void;
    onRemove: (id: string) => void;
    onToggleDisabled: (id: string) => void;
    availableReferences?: string[];
    defaultData?: any;
}

function SortablePresetItem({
    appliedPreset,
    onToggleExpansion,
    onUpdateInputData,
    onRefresh,
    onCopy,
    onRemove,
    onToggleDisabled,
    availableReferences = [],
    defaultData
}: SortablePresetItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: appliedPreset.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="w-full">
            <Card className={`w-full p-0 ${appliedPreset.disabled ? 'opacity-60 bg-muted/50' : ''}`}>
                <CardHeader className="pb-2 px-3 py-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onToggleExpansion(appliedPreset.id)}
                                className="p-1 h-5 w-5"
                            >
                                {appliedPreset.isExpanded ? (
                                    <ChevronDown className="h-3 w-3" />
                                ) : (
                                    <ChevronRight className="h-3 w-3" />
                                )}
                            </Button>
                            <div
                                {...attributes}
                                {...listeners}
                                className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
                            >
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm truncate">
                                    {appliedPreset.inputData?.trackName && appliedPreset.inputData?.trackName.length > 0 ?
                                        appliedPreset.inputData?.trackName
                                        : appliedPreset.preset.metadata.title}
                                </h4>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                                        {appliedPreset.preset.metadata.presetType}
                                    </Badge>
                                    {appliedPreset.disabled && (
                                        <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                                            Disabled
                                        </Badge>
                                    )}
                                    {appliedPreset.preset.metadata.tags?.slice(0, 2).map((tag) => (
                                        <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0.5">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onRefresh(appliedPreset.id)}
                                className="text-blue-500 hover:text-blue-700 p-1 h-6 w-6"
                                title="Refresh preset (reloads function and schema)"
                            >
                                <RefreshCw className="h-3 w-3" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onCopy(appliedPreset.id)}
                                className="text-purple-500 hover:text-purple-700 p-1 h-6 w-6"
                                title="Duplicate preset"
                            >
                                <Copy className="h-3 w-3" />
                            </Button>
                            {appliedPreset.preset.metadata.presetType === 'children' && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onToggleDisabled(appliedPreset.id)}
                                    className={`p-1 h-6 w-6 ${appliedPreset.disabled
                                        ? 'text-gray-400 hover:text-gray-600'
                                        : 'text-green-500 hover:text-green-700'
                                        }`}
                                    title={appliedPreset.disabled ? 'Enable preset' : 'Disable preset'}
                                >
                                    {appliedPreset.disabled ? (
                                        <EyeOff className="h-3 w-3" />
                                    ) : (
                                        <Eye className="h-3 w-3" />
                                    )}
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onRemove(appliedPreset.id)}
                                className="text-red-500 hover:text-red-700 p-1 h-6 w-6"
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                {appliedPreset.isExpanded && (
                    <CardContent className="pt-0 px-3 pb-3">
                        <SchemaForm
                            metadata={appliedPreset.preset.metadata}
                            schema={appliedPreset.preset.presetParams}
                            value={appliedPreset.inputData}
                            onChange={(inputData) => onUpdateInputData(appliedPreset.id, inputData)}
                            className=""
                            availableReferences={availableReferences}
                            baseData={createBaseDataFromReferences(defaultData.references)}
                        />
                    </CardContent>
                )}
            </Card>
        </div>
    );
}

interface PresetListProps {
    onGenerateOutput: () => void;
}

interface SavedPresetData {
    id: string;
    name: string;
    createdAt: string;
    presetData: {
        presets: Array<{
            presetId: string;
            presetType: string;
            presetInputData: any;
            disabled?: boolean;
        }>;
        defaultData?: DefaultPresetData; // Include baseData (references)
    };
}

// Helper function to get default values from schema
function getDefaultValues(schema: any): any {
    if (!schema.properties) return {};

    const defaults: any = {};
    Object.entries(schema.properties).forEach(([key, field]: [string, any]) => {
        if (field.default !== undefined) {
            defaults[key] = field.default;
        } else if (field.type === 'object' && field.properties) {
            defaults[key] = getDefaultValues(field);
        } else if (field.type === 'array') {
            defaults[key] = [];
        } else if (field.type === 'string') {
            defaults[key] = field.enum ? (field.enum[0] || '') : '';
        } else if (field.type === 'number') {
            defaults[key] = 0;
        } else if (field.type === 'boolean') {
            defaults[key] = false;
        } else {
            defaults[key] = '';
        }
    });
    return defaults;
}

export function PresetList({
    onGenerateOutput
}: PresetListProps) {
    const {
        appliedPresets,
        setAppliedPresets,
        togglePresetExpansion,
        togglePresetDisabled,
        updatePresetInputData,
        removePreset,
        refreshPreset,
        reorderPresets,
        defaultData,
        setDefaultData,
        isGenerating,
        currentLoadedPreset,
        setCurrentLoadedPreset
    } = usePresetContext();

    const [savedPresets, setSavedPresets] = useState<SavedPresetData[]>([]);
    const [isLoadingSaved, setIsLoadingSaved] = useState(false);
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [showLoadDialog, setShowLoadDialog] = useState(false);
    const [isSavingPreset, setIsSavingPreset] = useState(false);

    // Load saved presets on component mount
    useEffect(() => {
        loadSavedPresets();
    }, []);

    const loadSavedPresets = async () => {
        try {
            setIsLoadingSaved(true);
            const response = await fetch('/api/preset-data');
            if (response.ok) {
                const data = await response.json();
                setSavedPresets(data);
            }
        } catch (error) {
            console.error('Failed to load saved presets:', error);
        } finally {
            setIsLoadingSaved(false);
        }
    };

    // Helper function to generate random 6-character string
    const generateRandomString = (length: number = 6): string => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    // Duplicate a preset
    const copyPreset = (id: string) => {
        const presetToCopy = appliedPresets.presets.find(p => p.id === id);
        if (!presetToCopy) return;

        // Deep clone the input data
        let newInputData = JSON.parse(JSON.stringify(presetToCopy.inputData));

        // Check if there's a trackName field and update it with a random string
        if (newInputData && typeof newInputData === 'object') {
            const processObject = (obj: any) => {
                for (const key in obj) {
                    if (key === 'trackName' && typeof obj[key] === 'string') {
                        obj[key] = generateRandomString(6);
                    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                        processObject(obj[key]);
                    }
                }
            };
            processObject(newInputData);
        }

        // Create the duplicated preset
        const duplicatedPreset: AppliedPreset = {
            id: `preset-${Date.now()}-${Math.random()}`,
            preset: presetToCopy.preset,
            inputData: newInputData,
            isExpanded: true,
            disabled: presetToCopy.disabled
        };

        // Find the index of the original preset and insert the duplicate right after it
        const originalIndex = appliedPresets.presets.findIndex(p => p.id === id);
        const newPresets = [...appliedPresets.presets];
        newPresets.splice(originalIndex + 1, 0, duplicatedPreset);

        setAppliedPresets({
            ...appliedPresets,
            presets: newPresets
        });

        toast.success('Preset duplicated successfully');
    };

    const copyPresetData = async () => {
        try {
            const presetData = {
                presets: appliedPresets.presets.map(appliedPreset => ({
                    presetId: appliedPreset.preset.metadata.id,
                    presetType: appliedPreset.preset.metadata.presetType,
                    presetInputData: appliedPreset.inputData,
                    disabled: appliedPreset.disabled || false
                }))
            };

            await navigator.clipboard.writeText(JSON.stringify(presetData, null, 2));
            toast.success('Preset data copied to clipboard');
        } catch (error) {
            console.error('Failed to copy preset data:', error);
            toast.error('Failed to copy preset data');
        }
    };

    // Clear loaded preset when presets are modified manually
    useEffect(() => {
        if (appliedPresets.presets.length > 0 && currentLoadedPreset) {
            // Check if any preset was added that's not from a loaded preset
            const hasNewPresets = appliedPresets.presets.some(preset =>
                !preset.id.startsWith('loaded-')
            );
            // Only clear if we have new presets AND we're not in the middle of a save operation
            if (hasNewPresets && !showSaveDialog && !isSavingPreset) {
                setCurrentLoadedPreset(null);
            }
        }
    }, [appliedPresets.presets, currentLoadedPreset, setCurrentLoadedPreset, showSaveDialog, isSavingPreset]);

    const savePresetData = async (name: string, overwriteId?: string) => {
        try {
            setIsSavingPreset(true);
            const presetData = {
                presets: appliedPresets.presets.map(appliedPreset => ({
                    presetId: appliedPreset.preset.metadata.id,
                    presetType: appliedPreset.preset.metadata.presetType,
                    presetInputData: appliedPreset.inputData,
                    disabled: appliedPreset.disabled || false
                })),
                defaultData: defaultData // Include baseData (references)
            };

            const response = await fetch('/api/preset-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    presetData,
                    overwriteId // Include the ID to overwrite if provided
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log(`✅ SUCCESSFULLY SAVED PRESET DATA:`, {
                    presetDataId: result.id,
                    name: name,
                    overwriteId: overwriteId,
                    isOverwrite: !!overwriteId
                });
                // If we're overwriting, update the current loaded preset
                if (overwriteId) {
                    setCurrentLoadedPreset(result.id || overwriteId);
                } else {
                    // If we're creating a new preset, set it as the current loaded preset
                    setCurrentLoadedPreset(result.id);
                }
                toast.success(overwriteId ? 'Preset data overwritten successfully' : 'Preset data saved successfully');
                loadSavedPresets(); // Refresh the list
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to save preset data');
            }
        } catch (error) {
            console.error('Failed to save preset data:', error);
            toast.error('Failed to save preset data');
            throw error; // Re-throw to handle in dialog
        } finally {
            setIsSavingPreset(false);
        }
    };

    const loadPresetData = async (savedPreset: SavedPresetData) => {
        try {
            console.log(`🔍 LOADING PRESET DATA:`, {
                presetDataId: savedPreset.id,
                presetDataName: savedPreset.name,
                createdAt: savedPreset.createdAt,
                numberOfPresets: savedPreset.presetData.presets.length
            });

            // Clear current applied presets
            setAppliedPresets({
                presets: [],
                activePresetId: null
            });

            console.log('Saved preset data:', savedPreset);
            // Load the saved preset data
            const newAppliedPresets: AppliedPreset[] = [];

            for (const presetItem of savedPreset.presetData.presets) {
                let actualPreset: Preset | DatabasePreset | null = null;

                const foundPredefinedPreset = getPredefinedPresetById(presetItem.presetId);
                if (foundPredefinedPreset) {
                    actualPreset = foundPredefinedPreset;
                } else {
                    console.log(`🔍 Fetching database preset with metadata ID: ${presetItem.presetId}`);
                    try {
                        const response = await fetch(`/api/presets/by-metadata-id/${presetItem.presetId}`);
                        if (response.ok) {
                            const data = await response.json();
                            actualPreset = data.preset;
                            console.log(`✅ Successfully loaded database preset:`, {
                                id: presetItem.presetId,
                                title: actualPreset?.metadata?.title,
                                type: actualPreset?.metadata?.presetType
                            });
                        } else {
                            console.warn(`❌ Database preset ${presetItem.presetId} not found`);
                            continue;
                        }
                    } catch (error) {
                        console.warn(`❌ Failed to fetch database preset ${presetItem.presetId}:`, error);
                        continue;
                    }
                }

                if (actualPreset) {
                    const appliedPreset: AppliedPreset = {
                        id: `loaded-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        preset: actualPreset,
                        inputData: presetItem.presetInputData,
                        isExpanded: true,
                        disabled: presetItem.disabled || false
                    };

                    newAppliedPresets.push(appliedPreset);
                }
            }

            // Set the loaded presets
            setAppliedPresets({
                presets: newAppliedPresets,
                activePresetId: newAppliedPresets[0]?.id || null
            });

            // Restore defaultData (references) if it exists
            if (savedPreset.presetData.defaultData) {
                setDefaultData(savedPreset.presetData.defaultData);
                console.log(`✅ RESTORED DEFAULT DATA:`, {
                    referencesCount: savedPreset.presetData.defaultData.references?.length || 0,
                    references: savedPreset.presetData.defaultData.references?.map((r: any) => r.key) || []
                });
            }

            if (newAppliedPresets.length > 0) {
                // Track the loaded preset
                setCurrentLoadedPreset(savedPreset.id);
                console.log(`✅ SUCCESSFULLY LOADED PRESET DATA:`, {
                    presetDataId: savedPreset.id,
                    presetDataName: savedPreset.name,
                    loadedPresetsCount: newAppliedPresets.length,
                    hasDefaultData: !!savedPreset.presetData.defaultData
                });
                toast.success(`Loaded preset: ${savedPreset.name} (${newAppliedPresets.length} presets)`);
            } else {
                console.log(`❌ NO VALID PRESETS FOUND IN PRESET DATA:`, {
                    presetDataId: savedPreset.id,
                    presetDataName: savedPreset.name
                });
                toast.error('No valid presets found in saved data');
            }
        } catch (error) {
            console.error('Failed to load preset data:', error);
            toast.error('Failed to load preset data');
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event;

        if (active.id !== over?.id) {
            const oldIndex = appliedPresets.presets.findIndex((preset) => preset.id === active.id);
            const newIndex = appliedPresets.presets.findIndex((preset) => preset.id === over?.id);

            reorderPresets(oldIndex, newIndex);
        }
    }

    if (appliedPresets.presets.length === 0) {
        return (
            <div className="h-full flex flex-col">
                <div className="p-4 border-b">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold">Applied Presets</h3>
                            <p className="text-sm text-muted-foreground">
                                {currentLoadedPreset ? `Loaded preset data ID: ${currentLoadedPreset}` : 'No presets applied yet'}
                            </p>
                        </div>

                        {/* Load Preset Data Button - Available even with no presets */}
                        <Button
                            onClick={() => setShowLoadDialog(true)}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1"
                            title="Load saved preset data"
                        >
                            <Upload className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="flex-1 flex items-center justify-center">
                    <Card className="w-full max-w-md">
                        <CardHeader className="text-center">
                            <h3 className="text-lg font-semibold">No Presets Applied</h3>
                        </CardHeader>
                        <CardContent className="text-center">
                            <p className="text-muted-foreground">
                                Select presets from the sidebar to add them to your composition
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold">Applied Presets</h3>
                        <p className="text-sm text-muted-foreground">
                            Configure your applied presets
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={onGenerateOutput}
                            disabled={isGenerating}
                            className="flex items-center gap-2"
                        >
                            {isGenerating ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Play className="h-4 w-4" />
                            )}
                            {isGenerating ? 'Generating...' : 'Generate Output'}
                        </Button>

                        {/* Copy Preset Data Button */}
                        <Button
                            onClick={copyPresetData}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1"
                            title="Copy preset data to clipboard"
                        >
                            <Copy className="h-4 w-4" />
                        </Button>

                        {/* Save Preset Data Button */}
                        <Button
                            onClick={() => setShowSaveDialog(true)}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1"
                            title="Save preset data to database"
                        >
                            <Save className="h-4 w-4" />
                        </Button>

                        {/* Load Preset Data Button */}
                        <Button
                            onClick={() => setShowLoadDialog(true)}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1"
                            title="Load saved preset data"
                        >
                            <Upload className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="p-3 space-y-2">
                    {/* Default Card - appears at the top */}
                    <DefaultCard
                        defaultData={defaultData}
                        onDefaultDataChange={setDefaultData}
                    />

                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={appliedPresets.presets.map(preset => preset.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {appliedPresets.presets.map((appliedPreset) => (
                                <SortablePresetItem
                                    key={appliedPreset.id}
                                    appliedPreset={appliedPreset}
                                    onToggleExpansion={togglePresetExpansion}
                                    onUpdateInputData={updatePresetInputData}
                                    onRefresh={refreshPreset}
                                    onCopy={copyPreset}
                                    onRemove={removePreset}
                                    onToggleDisabled={togglePresetDisabled}
                                    availableReferences={defaultData.references.map(ref => ref.key)}
                                    defaultData={defaultData}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>

                    {/* Output Card - appears at the end of the list */}
                    <OutputCard />
                </div>
            </div>

            {/* Save Preset Dialog */}
            <SavePresetDialog
                key={`save-dialog-${currentLoadedPreset || 'new'}`}
                open={showSaveDialog}
                onOpenChange={setShowSaveDialog}
                onSave={savePresetData}
                currentLoadedPreset={currentLoadedPreset}
                currentLoadedPresetName={
                    currentLoadedPreset
                        ? savedPresets.find(p => p.id === currentLoadedPreset)?.name || ""
                        : ""
                }
            />

            {/* Load Preset Dialog */}
            <LoadPresetDialog
                open={showLoadDialog}
                onOpenChange={setShowLoadDialog}
                onLoad={loadPresetData}
            />
        </div>
    );
}

// Helper function to create a new applied preset with default values
export function createAppliedPreset(preset: Preset | DatabasePreset): AppliedPreset {
    const presetId = `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Get default input data - prioritize metadata defaultInputParams, fallback to schema defaults
    let defaultInputData = {};
    if (preset.metadata.defaultInputParams) {
        defaultInputData = preset.metadata.defaultInputParams;
    } else {
        defaultInputData = getDefaultValues(preset.presetParams);
    }

    return {
        id: presetId,
        preset,
        inputData: defaultInputData,
        isExpanded: true
    };
}
