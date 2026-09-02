"use client"

import { calculateCompositionLayoutMetadata, CompositionLayout, InputCompositionProps, RenderableComponentData, getMediaLoadErrorMessage } from "@microfox/remotion";
import { Loader2, Copy, Check, RotateCcw, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RenderButton } from "./render-button";
import { JsonEditor } from "./json-editor";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RenderProvider, RenderSettings, useRender } from "./render-provider";
import { Player } from "@microfox/remotion";

const AudioScene = {
    "childrenData": [
        {
            "id": "video-scene",
            "componentId": "BaseLayout",
            "type": "scene",
            "data": {},
            "childrenData": [
                {
                    "id": "video-0",
                    "componentId": "VideoAtom",
                    "type": "atom",
                    "data": {
                        "src": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
                        "className": "w-full h-auto object-cover bg-black",
                        "fit": "cover"
                    }
                },
                {
                    "id": "video-1",
                    "componentId": "VideoAtom",
                    "type": "atom",
                    "data": {
                        "src": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
                        "className": "w-full h-auto object-cover bg-black",
                        "fit": "cover"
                    }
                },
                {
                    "id": "video-2",
                    "componentId": "VideoAtom",
                    "type": "atom",
                    "data": {
                        "src": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
                        "className": "w-full h-auto object-cover bg-black",
                        "fit": "cover"
                    }
                }
            ]
        }
    ],
    "config": {
        "fps": 30,
        "width": 1920,
        "height": 1080,
        "duration": 20
    },
    "style": {
        "backgroundColor": "black"
    }
}

const container: React.CSSProperties = {
    margin: "auto",
    marginBottom: 20,
    width: "100%",
};

const outer: React.CSSProperties = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    maxHeight: "80vh",
    maxWidth: "70vw",
};

const player: React.CSSProperties = {
    backgroundColor: "#00000030",
    maxHeight: "80vh",
    position: "relative",
};

export const MediaMakePlayerPlain: React.FC = () => {

    const { updateSetting } = useRender();
    const defaultInputProps: InputCompositionProps = {
        childrenData: AudioScene.childrenData as RenderableComponentData[],
        config: AudioScene.config,
        style: { ...AudioScene.style }
    };

    const [inputProps, setInputProps] = useState<InputCompositionProps>(defaultInputProps);
    const [calculatedMetadata, setCalculatedMetadata] = useState<Awaited<ReturnType<typeof calculateCompositionLayoutMetadata>> | null>(null);
    const [metadataError, setMetadataError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const calculateMetadata = async () => {
            try {
                const metadata = await calculateCompositionLayoutMetadata({
                    defaultProps: {},
                    props: inputProps,
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
        updateSetting('inputProps', JSON.stringify(inputProps, null, 2));
    }, [inputProps]);

    const copyProps = async () => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(inputProps, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy props:', err);
        }
    };

    const resetProps = () => {
        setInputProps(defaultInputProps);
    };

    const handleInputPropsChange = (newProps: InputCompositionProps) => {
        setInputProps(newProps);
    };

    if (metadataError) {
        return (
            <div className="flex justify-center items-center w-full h-full">
                <div className="text-center space-y-3 max-w-md px-4">
                    <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
                    <p className="text-sm font-medium text-destructive">Unable to load media</p>
                    <p className="text-xs text-muted-foreground break-words">{metadataError}</p>
                </div>
            </div>
        );
    }

    if (!calculatedMetadata) {
        return <div className="flex justify-center items-center w-full h-full">
            <Loader2 className="w-full h-6 animate-spin" />
        </div>;
    }

    return (
        <div className="relative flex flex-row justify-center items-stretch w-full h-full gap-10">
            <div className="min-w-1/3 h-full bg-white rounded-lg border border-neutral-200 ml-10 overflow-hidden relative">
                <div className="rounded-lg h-full flex flex-col">
                    <div className="flex items-center justify-between p-4 border-b">
                        <h1 className="text-xl font-bold">Input Properties</h1>
                        <div className="flex gap-2">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        onClick={resetProps}
                                        variant="outline"
                                        size="sm"
                                    >
                                        <RotateCcw className="w-3 h-3" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Reset to default</p>
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        onClick={copyProps}
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
                                    <p>Copy props to clipboard</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
                    <div className="flex-1 p-4">
                        <JsonEditor
                            value={inputProps}
                            onChange={handleInputPropsChange}
                            height="calc(80vh - 120px)"
                            className="h-full"
                        />
                    </div>
                </div>
            </div>
            <Player
                inputProps={calculatedMetadata.props}
                durationInFrames={calculatedMetadata?.durationInFrames ?? 20}
                fps={calculatedMetadata?.fps ?? 30}
                compositionHeight={calculatedMetadata?.height ?? 1920}
                compositionWidth={calculatedMetadata?.width ?? 1920}
                style={player}
                className="w-fit h-full"
                controls
                loop
            />
            {(process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_DEV_CLIENT_ID != undefined) && (
                <div className="absolute top-4 right-4">
                    <RenderButton />
                </div>
            )}
        </div>
    )
}

export const MediaMakePlayer = () => {
    return (
        <RenderProvider>
            <MediaMakePlayerPlain />
        </RenderProvider>
    )
}