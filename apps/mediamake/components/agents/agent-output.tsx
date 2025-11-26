"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { PresetUI } from "./preset-ui";
import { RenderProvider } from "../editor/player";
import { JsonEditor } from "../editor/player/json-editor";

interface AgentOutputProps {
    output: any;
    isLoading: boolean;
    customUIType?: string;
}

export function AgentOutput({ output, isLoading, customUIType }: AgentOutputProps) {
    const [copiedKeys, setCopiedKeys] = useState<Set<string>>(new Set());

    const copyToClipboard = async (text: string, key: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedKeys(prev => new Set([...prev, key]));
            setTimeout(() => {
                setCopiedKeys(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(key);
                    return newSet;
                });
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    const renderValue = (value: any, key: string): React.ReactNode => {
        if (value === null || value === undefined) {
            return <span className="text-muted-foreground italic">null</span>;
        }

        if (typeof value === "boolean") {
            return (
                <Badge variant={value ? "default" : "secondary"}>
                    {value ? "true" : "false"}
                </Badge>
            );
        }

        if (typeof value === "string") {
            return (
                <div className="flex items-start gap-2 whitespace-pre-wrap">
                    <pre className="text-sm break-all flex-1 whitespace-pre-wrap max-w-[400px]">{value}</pre>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(value, key)}
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        {copiedKeys.has(key) ? (
                            <Check className="h-3 w-3 text-green-500" />
                        ) : (
                            <Copy className="h-3 w-3" />
                        )}
                    </Button>
                </div>
            );
        }

        if (typeof value === "number") {
            return <span className="text-sm font-mono">{value}</span>;
        }

        if (Array.isArray(value)) {
            return (
                <div className="space-y-2">
                    {value.map((item, index) => (
                        <div key={index} className="flex items-start gap-2">
                            <Badge variant="outline" className="text-xs flex-shrink-0">
                                {index + 1}
                            </Badge>
                            {typeof item === "string" ? (
                                <pre className="text-sm break-words flex-1 whitespace-pre-wrap font-sans">{item}</pre>
                            ) : (
                                <span className="text-sm whitespace-pre-wrap break-all">{JSON.stringify(item)}</span>
                            )}
                        </div>
                    ))}
                </div>
            );
        }

        if (typeof value === "object") {
            return (
                <div className="space-y-2">
                    {Object.entries(value).map(([nestedKey, nestedValue]) => (
                        <div key={nestedKey} className="ml-4 border-l-2 border-muted pl-3">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-muted-foreground">{nestedKey}:</span>
                            </div>
                            <div className="text-sm">
                                {renderValue(nestedValue, `${key}.${nestedKey}`)}
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        return <span className="text-sm whitespace-pre-wrap">{JSON.stringify(value)}</span>;
    };

    // Handle custom UI for presets
    if (customUIType === 'presets' && output?.presetSets) {
        return <RenderProvider>
            <PresetUI presetSets={output.presetSets} isLoading={isLoading} />
        </RenderProvider>
    }

    const copyFullJSON = () => {
        if (output) {
            copyToClipboard(JSON.stringify(output, null, 2), "full-json");
        }
    };

    if (isLoading) {
        return (
            <Card className="h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg font-semibold">Output</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-32">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-sm text-muted-foreground">Processing...</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!output) {
        return (
            <Card className="h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg font-semibold">Output</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-32">
                    <p className="text-sm text-muted-foreground">No output yet. Run the agent to see results.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold">Output</CardTitle>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={copyFullJSON}
                    className="h-8 px-2"
                >
                    {copiedKeys.has("full-json") ? (
                        <>
                            <Check className="h-4 w-4 mr-2 text-green-500" />
                            <span className="text-sm">Copied</span>
                        </>
                    ) : (
                        <>
                            <Copy className="h-4 w-4 mr-2" />
                            <span className="text-sm">Copy JSON</span>
                        </>
                    )}
                </Button>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
                {Object.entries(output).map(([key, value]) => (
                    <div key={key} className="group">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-medium text-foreground capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                            </h3>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(JSON.stringify(value), key)}
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                {copiedKeys.has(key) ? (
                                    <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                    <Copy className="h-3 w-3" />
                                )}
                            </Button>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                            {renderValue(value, key)}
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
