"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { InputCompositionProps, RenderableComponentData } from "@microfox/remotion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
    Play,
    Pause,
    Loader2,
    MoreVertical,
    Settings,
    Edit,
    Download,
    Eye
} from "lucide-react";
import { SimplePresetPlayer } from "./preset-player-simple";
import { runPreset, insertPresetToComposition } from "../editor/presets/engine/preset-helpers";
import { processPresetInputData, createBaseDataFromReferences } from "../editor/presets/engine/preset-data-mutation";
import { createCachedFetcher } from "@/lib/audio-cache";
import { SimplePresetProvider } from "./preset-provider-simple";
import { getPredefinedPresetById, predefinedPresets } from "../editor/presets/registry/registry/presets-registry";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RenderButton, RenderProvider, useRender } from '../editor/player';
import { useRouter } from 'next/navigation';
import { Preset } from '../editor/presets/types';
import { createAppliedPreset } from '../editor/presets/preset-list';

interface PresetSet {
    presetId: string;
    presetType: 'full' | 'children' | 'data' | 'context' | 'effects';
    presetInputData: any;
    disabled: boolean;
}

interface PresetSetWrapper {
    presets: PresetSet[];
}

interface PresetUIProps {
    presetSets: PresetSetWrapper[]; // Array of preset set wrappers
    isLoading?: boolean;
    baseData?: Record<string, any>; // Base data for data references
}

interface PresetCardState {
    isGenerating: boolean;
    generatedOutput: InputCompositionProps | null;
    isPlaying: boolean;
}

export function PresetUI({ presetSets = [], isLoading = false, baseData = {} }: PresetUIProps) {
    const [cardStates, setCardStates] = useState<Record<number, PresetCardState>>({});
    const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
    const [showRenderDialog, setShowRenderDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [isGeneratingAll, setIsGeneratingAll] = useState(false);
    const { updateSetting } = useRender();
    const router = useRouter();
    // Initialize card states
    useEffect(() => {
        const initialStates: Record<number, PresetCardState> = {};
        if (Array.isArray(presetSets)) {
            presetSets.forEach((presetSetWrapper, index) => {
                if (presetSetWrapper && presetSetWrapper.presets && Array.isArray(presetSetWrapper.presets)) {
                    initialStates[index] = {
                        isGenerating: false,
                        generatedOutput: null,
                        isPlaying: false
                    };
                } else {
                    console.warn(`Preset set at index ${index} is not valid:`, presetSetWrapper);
                }
            });
        }
        setCardStates(initialStates);
    }, [presetSets]);

    const generateOutput = useCallback(async (cardIndex: number) => {
        const presetSetWrapper = presetSets[cardIndex];
        if (!presetSetWrapper || !presetSetWrapper.presets || !Array.isArray(presetSetWrapper.presets)) {
            console.error(`Preset set at index ${cardIndex} is not valid:`, presetSetWrapper);
            return;
        }
        const presetSet = presetSetWrapper.presets;

        setCardStates(prev => ({
            ...prev,
            [cardIndex]: {
                ...prev[cardIndex],
                isGenerating: true,
                generatedOutput: null
            }
        }));

        try {
            // Start with default composition
            let baseComposition: InputCompositionProps = {
                childrenData: [],
                config: {
                    fps: 30,
                    width: 1920,
                    height: 1080,
                    duration: 20
                },
                style: {
                    backgroundColor: "black"
                }
            };

            let clip = {};

            // Process each preset in the set
            for (const presetItem of presetSet) {
                if (presetItem.disabled) continue;

                try {
                    // Get the preset from the registry
                    const preset = getPredefinedPresetById(presetItem.presetId);
                    if (!preset) {
                        console.warn(`Preset ${presetItem.presetId} not found in registry`);
                        continue;
                    }

                    // Process input data with base data references
                    const processedInputData = processPresetInputData(presetItem.presetInputData, baseData);

                    const presetOutput = await runPreset(
                        processedInputData,
                        preset.presetFunction,
                        {
                            config: baseComposition.config,
                            style: baseComposition.style,
                            clip: clip,
                            baseData: baseData,
                            fetcher: createCachedFetcher((url: string, data: any) =>
                                fetch(url, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify(data),
                                })
                            ),
                        },
                        preset.metadata // Pass metadata for dependency injection
                    );

                    if (presetOutput) {
                        if (presetOutput.options?.clip && presetItem.presetType === 'full') {
                            clip = presetOutput.options.clip;
                        }
                        baseComposition = insertPresetToComposition(baseComposition, {
                            presetOutput: presetOutput,
                            presetType: presetItem.presetType
                        });
                    }
                } catch (error) {
                    console.error(`Error processing preset ${presetItem.presetId}:`, error);
                }
            }

            setCardStates(prev => ({
                ...prev,
                [cardIndex]: {
                    ...prev[cardIndex],
                    isGenerating: false,
                    generatedOutput: baseComposition
                }
            }));

        } catch (error) {
            console.error('Error generating output:', error);
            setCardStates(prev => ({
                ...prev,
                [cardIndex]: {
                    ...prev[cardIndex],
                    isGenerating: false,
                    generatedOutput: null
                }
            }));
        }
    }, [presetSets]);

    const togglePlay = useCallback((cardIndex: number) => {
        const currentState = cardStates[cardIndex];
        if (!currentState) return;

        if (!currentState.generatedOutput) {
            // Generate output first
            generateOutput(cardIndex);
        } else {
            // Toggle play state
            setCardStates(prev => ({
                ...prev,
                [cardIndex]: {
                    ...prev[cardIndex],
                    isPlaying: !prev[cardIndex].isPlaying
                }
            }));
        }
    }, [cardStates, generateOutput]);

    const handleRender = useCallback((cardIndex: number) => {
        setSelectedCardIndex(cardIndex);
        updateSetting('inputProps', JSON.stringify(cardStates[cardIndex].generatedOutput, null, 2));
        setShowRenderDialog(true);
    }, [cardStates]);

    const handleEdit = useCallback((cardIndex: number) => {
        setSelectedCardIndex(cardIndex);
        setShowEditDialog(true);
    }, [cardStates]);

    const generateAll = useCallback(async () => {
        if (isGeneratingAll) return;

        setIsGeneratingAll(true);

        try {
            // Generate all preset sets sequentially
            for (let i = 0; i < presetSets.length; i++) {
                await generateOutput(i);
                // Add a small delay between generations to prevent overwhelming the system
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        } catch (error) {
            console.error('Error generating all outputs:', error);
        } finally {
            setIsGeneratingAll(false);
        }
    }, [presetSets.length, generateOutput, isGeneratingAll]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Generating preset sets...</p>
                </div>
            </div>
        );
    }

    if (!presetSets || presetSets.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <p className="text-muted-foreground">No preset sets generated yet.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Generated Media</h2>
                    <p className="text-muted-foreground">
                        {presetSets.length} preset sets generated
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        onClick={generateAll}
                        disabled={isGeneratingAll || presetSets.length === 0}
                        className="flex items-center gap-2"
                    >
                        {isGeneratingAll ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Generating All...
                            </>
                        ) : (
                            <>
                                <Play className="h-4 w-4" />
                                Generate All
                            </>
                        )}
                    </Button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ">
                {presetSets.map((presetSetWrapper, index) => {
                    if (!presetSetWrapper || !presetSetWrapper.presets || !Array.isArray(presetSetWrapper.presets)) {
                        console.warn(`Preset set at index ${index} is not valid:`, presetSetWrapper);
                        return null;
                    }
                    const cardState = cardStates[index];
                    const hasOutput = !!cardState?.generatedOutput;
                    const isGenerating = cardState?.isGenerating || false;

                    return (
                        <div key={index} className="relative">
                            <div className="pt-0">
                                <div className="bg-black min-h-[400px] rounded-lg flex items-center justify-center relative ">
                                    {isGenerating ? (
                                        <div className="text-center">
                                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-white" />
                                            <p className="text-white text-sm">Generating...</p>
                                        </div>
                                    ) : hasOutput ? (
                                        <SimplePresetProvider initialOutput={cardState?.generatedOutput}>
                                            <div className="w-full h-auto">
                                                <SimplePresetPlayer />
                                            </div>
                                        </SimplePresetProvider>
                                    ) : (
                                        <Button
                                            variant="ghost"
                                            size="lg"
                                            onClick={() => generateOutput(index)}
                                            className="text-white hover:text-white hover:bg-white/20"
                                        >
                                            <Play className="h-8 w-8" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <div className='absolute top-0 right-0'>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleRender(index)}>
                                            <Download className="h-4 w-4 mr-2" />
                                            Render
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleEdit(index)}>
                                            <Edit className="h-4 w-4 mr-2" />
                                            Edit
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Render Dialog */}
            <Dialog open={showRenderDialog} onOpenChange={setShowRenderDialog}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogTitle>Render Preset Set {selectedCardIndex !== null ? selectedCardIndex + 1 : ''}</DialogTitle>
                    <div className="h-[60vh]">
                        {selectedCardIndex !== null && cardStates[selectedCardIndex]?.generatedOutput && (
                            <SimplePresetProvider initialOutput={cardStates[selectedCardIndex].generatedOutput}>
                                <div className="h-full">
                                    <SimplePresetPlayer />
                                </div>
                            </SimplePresetProvider>
                        )}
                    </div>
                    <DialogFooter>
                        {(process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_DEV_CLIENT_ID != undefined) && (
                            <div className="absolute bottom-4 right-4">
                                <RenderButton />
                            </div>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Preset Set {selectedCardIndex !== null ? selectedCardIndex + 1 : ''}</DialogTitle>
                    </DialogHeader>
                    <div className="p-4">
                        <p className="text-muted-foreground">
                            THis will replace your existing composition in the editor, if you have not saved yet, please save it before proceeding.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            if (selectedCardIndex === null) return;
                            const appliedPresets = {
                                presets: presetSets[selectedCardIndex].presets.map(preset => {
                                    const thisPresetInfo = predefinedPresets.find(p => p.metadata.id === preset.presetId);
                                    return createAppliedPreset({
                                        ...thisPresetInfo,
                                        metadata: {
                                            ...thisPresetInfo?.metadata,
                                            defaultInputParams: preset.presetInputData
                                        }
                                    } as Preset)
                                }),
                                activePresetId: null
                            }
                            localStorage.setItem('preset-applied-presets', JSON.stringify(appliedPresets))
                            localStorage.setItem('preset-configuration', JSON.stringify({}))
                            if (cardStates[selectedCardIndex].generatedOutput) {
                                localStorage.setItem('preset-generated-output', JSON.stringify(cardStates[selectedCardIndex].generatedOutput))
                                localStorage.setItem('preset-editable-output', JSON.stringify(cardStates[selectedCardIndex].generatedOutput))
                            }
                            else {
                                localStorage.removeItem('preset-generated-output')
                                localStorage.removeItem('preset-editable-output')
                            }
                            localStorage.removeItem('preset-current-loaded')
                            setShowEditDialog(false)
                            router.push('/core/presets')
                        }}>Open Editor</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
