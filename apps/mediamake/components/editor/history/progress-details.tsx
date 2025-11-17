"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Clock,
    Cpu,
    HardDrive,
    Layers,
    Timer,
    Zap,
    FileVideo,
    Server,
    Globe,
    Settings,
    BarChart3,
    AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressDetailsProps {
    awsRenderPreset?: string;
    renderInfo?: {
        framesRendered?: number;
        bucket?: string;
        renderSize?: number;
        chunks?: number;
        currentTime?: number;
        done?: boolean;
        encodingStatus?: {
            framesEncoded?: number;
            combinedFrames?: number;
            timeToCombine?: number;
        };
        errors?: any[];
        fatalErrorEncountered?: boolean;
        lambdasInvoked?: number;
        outputFile?: string;
        renderId?: string;
        timeToFinish?: number;
        timeToFinishChunks?: number;
        timeToRenderFrames?: number;
        overallProgress?: number;
        retriesInfo?: any[];
        outKey?: string;
        outBucket?: string;
        mostExpensiveFrameRanges?: Array<{
            timeInMilliseconds: number;
            chunk: number;
            frameRange: [number, number];
        }>;
        timeToEncode?: number;
        outputSizeInBytes?: number;
        type?: string;
        estimatedBillingDurationInMilliseconds?: number;
        timeToCombine?: number;
        combinedFrames?: number;
        renderMetadata?: {
            startedDate?: number;
            totalChunks?: number;
            estimatedTotalLambdaInvokations?: number;
            estimatedRenderLambdaInvokations?: number;
            compositionId?: string;
            siteId?: string;
            codec?: string;
            type?: string;
            imageFormat?: string;
            inputProps?: any;
            lambdaVersion?: string;
            framesPerLambda?: number;
            memorySizeInMb?: number;
            region?: string;
            renderId?: string;
            privacy?: string;
            everyNthFrame?: number;
            frameRange?: [number, number];
            audioCodec?: string | null;
            deleteAfter?: string | null;
            numberOfGifLoops?: number | null;
            downloadBehavior?: any;
            audioBitrate?: number | null;
            muted?: boolean;
            metadata?: any;
            functionName?: string;
            dimensions?: {
                width: number;
                height: number;
            };
            rendererFunctionName?: string;
            scale?: number;
            awsRenderPreset?: string;
        };
        timeoutTimestamp?: number;
        compositionValidated?: number;
        functionLaunched?: number;
        serveUrlOpened?: number;
        artifacts?: any[];
    };
    className?: string;
}

const formatTime = (milliseconds?: number) => {
    if (!milliseconds) return "N/A";
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
};

const formatFileSize = (bytes?: number) => {
    if (!bytes) return "N/A";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

export function ProgressDetails({ renderInfo, awsRenderPreset, className }: ProgressDetailsProps) {
    if (!renderInfo) {
        return null;
    }

    const {
        framesRendered,
        bucket,
        renderSize,
        chunks,
        done,
        encodingStatus,
        errors,
        fatalErrorEncountered,
        lambdasInvoked,
        outputFile,
        renderId,
        timeToFinish,
        timeToFinishChunks,
        timeToRenderFrames,
        overallProgress,
        retriesInfo,
        outKey,
        outBucket,
        mostExpensiveFrameRanges,
        timeToEncode,
        outputSizeInBytes,
        estimatedBillingDurationInMilliseconds,
        timeToCombine,
        combinedFrames,
        renderMetadata,
        timeoutTimestamp,
        compositionValidated,
        functionLaunched,
        serveUrlOpened,
        artifacts
    } = renderInfo;

    return (
        <div className={cn("space-y-6", className)}>
            {/* Overall Progress */}
            {overallProgress !== undefined && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            Overall Progress
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span>Progress</span>
                                <span>{Math.round(overallProgress * 100)}%</span>
                            </div>
                            <Progress value={overallProgress * 100} className="w-full" />
                            <div className="flex items-center gap-2">
                                <Badge variant={done ? "default" : "secondary"}>
                                    {done ? "Completed" : "In Progress"}
                                </Badge>
                                {fatalErrorEncountered && (
                                    <Badge variant="destructive">
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        Fatal Error
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Render Statistics */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileVideo className="h-5 w-5" />
                        Render Statistics
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Frames Rendered</p>
                            <p className="text-lg font-semibold">{framesRendered?.toLocaleString() || "N/A"}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Chunks</p>
                            <p className="text-lg font-semibold">{chunks || "N/A"}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Lambdas Invoked</p>
                            <p className="text-lg font-semibold">{lambdasInvoked || "N/A"}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Output Size</p>
                            <p className="text-lg font-semibold">{formatFileSize(outputSizeInBytes)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Timing Information */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Timer className="h-5 w-5" />
                        Timing Information
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm font-medium">Total Time</span>
                                <span className="text-sm font-mono">{formatTime(timeToFinish)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm font-medium">Frame Rendering</span>
                                <span className="text-sm font-mono">{formatTime(timeToRenderFrames)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm font-medium">Chunk Processing</span>
                                <span className="text-sm font-mono">{formatTime(timeToFinishChunks)}</span>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm font-medium">Encoding Time</span>
                                <span className="text-sm font-mono">{formatTime(timeToEncode)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm font-medium">Combine Time</span>
                                <span className="text-sm font-mono">{formatTime(timeToCombine)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm font-medium">Estimated Billing</span>
                                <span className="text-sm font-mono">{formatTime(estimatedBillingDurationInMilliseconds)}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Encoding Status */}
            {encodingStatus && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Cpu className="h-5 w-5" />
                            Encoding Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Frames Encoded</p>
                                <p className="text-lg font-semibold">{encodingStatus.framesEncoded?.toLocaleString() || "N/A"}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Combined Frames</p>
                                <p className="text-lg font-semibold">{encodingStatus.combinedFrames?.toLocaleString() || "N/A"}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Combine Time</p>
                                <p className="text-lg font-semibold">{formatTime(encodingStatus.timeToCombine)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Render Metadata */}
            {renderMetadata && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            Render Configuration
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Composition</p>
                                <p className="text-sm font-mono">{renderMetadata.compositionId || "N/A"}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Codec</p>
                                <p className="text-sm font-mono">{renderMetadata.codec || "N/A"}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Resolution</p>
                                <p className="text-sm font-mono">
                                    {renderMetadata.dimensions ?
                                        `${renderMetadata.dimensions.width}x${renderMetadata.dimensions.height}` :
                                        "N/A"
                                    }
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Lambda Version</p>
                                <p className="text-sm font-mono">{renderMetadata.lambdaVersion || "N/A"}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Memory Size</p>
                                <p className="text-sm font-mono">{renderMetadata.memorySizeInMb ? `${renderMetadata.memorySizeInMb}MB` : "N/A"}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Region</p>
                                <p className="text-sm font-mono">{renderMetadata.region || "N/A"}</p>
                            </div>
                             <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">Render Preset</p>
                                <p className="text-sm font-mono">{awsRenderPreset || "N/A"}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Most Expensive Frame Ranges */}
            {mostExpensiveFrameRanges && mostExpensiveFrameRanges.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5" />
                            Most Expensive Frame Ranges
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {mostExpensiveFrameRanges.slice(0, 5).map((range, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">Chunk {range.chunk}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Frames {range.frameRange[0]} - {range.frameRange[1]}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-semibold">{formatTime(range.timeInMilliseconds)}</p>
                                        <p className="text-xs text-muted-foreground">Processing time</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Errors */}
            {errors && errors.length > 0 && (
                <Card className="border-red-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-600">
                            <AlertCircle className="h-5 w-5" />
                            Errors ({errors.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {errors.map((error, index) => (
                                <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm text-red-800">{JSON.stringify(error)}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Storage Information */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <HardDrive className="h-5 w-5" />
                        Storage Information
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm font-medium">Bucket</span>
                                <span className="text-sm font-mono">{bucket || "N/A"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm font-medium">Output Bucket</span>
                                <span className="text-sm font-mono">{outBucket || "N/A"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm font-medium">Output Key</span>
                                <span className="text-sm font-mono">{outKey || "N/A"}</span>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm font-medium">Render ID</span>
                                <span className="text-sm font-mono">{renderId || "N/A"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm font-medium">Output File</span>
                                <span className="text-sm font-mono truncate">
                                    {outputFile ? outputFile.split('/').pop() : "N/A"}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm font-medium">Artifacts</span>
                                <span className="text-sm font-mono">{artifacts?.length || 0}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
