"use client";

import { calculateCompositionLayoutMetadata, CompositionLayout, InputCompositionProps, getMediaLoadErrorMessage } from "@microfox/remotion";
import { Player } from "@microfox/remotion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Copy, Check, Loader2, Settings, Code, Eye, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Preset, DatabasePreset, PresetConfiguration, AppliedPreset } from "./types";
import { JsonEditor } from "../player/json-editor";
import { RenderButton } from "../player/render-button";
import { usePresetContext } from "./preset-provider";

interface PresetPlayerProps {
    // No props needed - everything comes from context
}

export function PresetPlayer({ }: PresetPlayerProps) {
    const {
        configuration,
        setConfiguration,
        generatedOutput,
        isGenerating
    } = usePresetContext();
    const [calculatedMetadata, setCalculatedMetadata] = useState<Awaited<ReturnType<typeof calculateCompositionLayoutMetadata>> | null>(null);
    const [metadataError, setMetadataError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'config' | 'output' | 'preview'>('preview');

    // Calculate metadata when generated output changes
    useEffect(() => {
        const calculateMetadata = async () => {
            if (!generatedOutput) return;
            if (!generatedOutput.childrenData) return;
            if (generatedOutput.childrenData.length === 0) return;

            try {
                const metadata = await calculateCompositionLayoutMetadata({
                    defaultProps: {},
                    props: generatedOutput,
                    abortSignal: new AbortController().signal,
                    compositionId: 'DataMotion',
                    isRendering: false,
                });
                setCalculatedMetadata(metadata);
                setMetadataError(null);
            } catch (error) {
                const errorMessage = getMediaLoadErrorMessage(error);
                setCalculatedMetadata(null);
                setMetadataError(errorMessage);
                toast.error(errorMessage, { duration: 10000 });
            }
        };
        calculateMetadata();
    }, [generatedOutput]);

    const copyOutput = async () => {
        if (!generatedOutput) return;

        try {
            await navigator.clipboard.writeText(JSON.stringify(generatedOutput, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy output:', err);
        }
    };

    const player: React.CSSProperties = {
        backgroundColor: "#00000030",
        maxHeight: "80vh",
        position: "relative",
    };

    return (
        <Tabs className="w-full" value={activeTab} onValueChange={(value) => setActiveTab(value as 'config' | 'output' | 'preview')}>
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="config" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Configuration
                </TabsTrigger>
                <TabsTrigger value="output" className="flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Output
                </TabsTrigger>
                <TabsTrigger value="preview" className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Preview
                </TabsTrigger>
            </TabsList>
            <TabsContent value="config" className="h-full mt-0 flex-1">
                <div className="h-full flex flex-col">
                    <div className="p-4 border-b">
                        <h3 className="text-lg font-semibold mb-2">Configuration</h3>
                        <p className="text-sm text-muted-foreground">
                            Edit style and config properties
                        </p>
                    </div>
                    <div className="flex-1 p-4">
                        <JsonEditor
                            value={configuration}
                            onChange={setConfiguration}
                            height="calc(100vh - 300px)"
                            className="h-full"
                        />
                    </div>
                </div>
            </TabsContent>

            <TabsContent value="output" className="h-full mt-0 flex-1">
                <div className="h-full flex flex-col">
                    <div className="p-4 border-b flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold mb-2">Generated Output</h3>
                            <p className="text-sm text-muted-foreground">
                                Final composition data ready for use
                            </p>
                        </div>
                        {generatedOutput && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        onClick={copyOutput}
                                        variant="outline"
                                        size="sm"
                                    >
                                        {copied ? (
                                            <>
                                                <Check className="w-3 h-3 text-green-600" />
                                                Copied!
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-3 h-3" />
                                                Copy
                                            </>
                                        )}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Copy output to clipboard</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                    <div className="flex-1 p-4">
                        <JsonEditor
                            value={generatedOutput || {}}
                            onChange={() => { }} // Read-only
                            height="calc(100vh - 300px)"
                            className="h-full"
                        />
                    </div>
                </div>
            </TabsContent>

            <TabsContent value="preview" className="h-full mt-0 flex-1">
                <div className="relative flex flex-row items-stretch w-full h-full p-4 flex items-center justify-center">
                    {metadataError ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center space-y-3 max-w-md px-4">
                                <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
                                <p className="text-sm font-medium text-destructive">Unable to load media</p>
                                <p className="text-xs text-muted-foreground break-words">{metadataError}</p>
                            </div>
                        </div>
                    ) : calculatedMetadata ? (
                        <Player
                            inputProps={calculatedMetadata.props}
                            durationInFrames={calculatedMetadata?.durationInFrames && calculatedMetadata?.durationInFrames > 0 ? calculatedMetadata?.durationInFrames : 20}
                            fps={calculatedMetadata?.fps ?? 30}
                            compositionHeight={calculatedMetadata?.height ?? 1920}
                            compositionWidth={calculatedMetadata?.width ?? 1920}
                            style={player}
                            className="w-fit h-full"
                            controls
                            loop

                        />
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                                <p className="text-muted-foreground">Generating preview...</p>
                            </div>
                        </div>
                    )}
                </div>
                <div className="absolute bottom-4 right-4">
                    <RenderButton />
                </div>
            </TabsContent>
        </Tabs>
    );
}