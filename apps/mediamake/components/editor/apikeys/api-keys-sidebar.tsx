"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    Key,
    Plus,
    CheckCircle,
    XCircle,
    AlertCircle,
    Eye,
    EyeOff,
    Copy,
    Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface ApiKeyInfo {
    id: string;
    apiKey: string;
    clientId: string;
    clientName: string;
    isValid: boolean;
}

interface ApiKeysSidebarProps {
    selectedApiKey: string | null;
    onSelectApiKey: (apiKeyId: string) => void;
    listVersion?: number;
}

export function ApiKeysSidebar({ selectedApiKey, onSelectApiKey, listVersion = 0 }: ApiKeysSidebarProps) {
    const [apiKeys, setApiKeys] = useState<ApiKeyInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showApiKeys, setShowApiKeys] = useState<{ [key: string]: boolean }>({});

    // Load API keys from the API
    useEffect(() => {
        const loadApiKeys = async () => {
            try {
                const response = await fetch('/api/db/apikeys');
                if (response.ok) {
                    const data = await response.json();
                    setApiKeys(data || []);
                } else {
                    console.error('Failed to load API keys');
                    toast.error('Failed to load API keys');
                }
            } catch (error) {
                console.error('Error loading API keys:', error);
                toast.error('Error loading API keys');
            } finally {
                setIsLoading(false);
            }
        };

        loadApiKeys();
    }, [listVersion]);

    const getStatusIcon = (isValid: boolean) => {
        return isValid ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
            <XCircle className="h-4 w-4 text-red-500" />
        );
    };

    const getStatusBadge = (isValid: boolean) => {
        return (
            <Badge variant={isValid ? "default" : "destructive"} className="text-xs">
                {isValid ? "Active" : "Inactive"}
            </Badge>
        );
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString();
    };

    const toggleApiKeyVisibility = (apiKeyId: string) => {
        setShowApiKeys(prev => ({
            ...prev,
            [apiKeyId]: !prev[apiKeyId]
        }));
    };

    const copyApiKey = async (apiKey: string) => {
        try {
            await navigator.clipboard.writeText(apiKey);
            toast.success('API key copied to clipboard');
        } catch (error) {
            console.error('Failed to copy API key:', error);
            toast.error('Failed to copy API key');
        }
    };

    const deleteApiKey = async (apiKey: string) => {
        if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch('/api/db/apikeys', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ apiKey }),
            });

            if (response.ok) {
                setApiKeys(prev => prev.filter(key => key.apiKey !== apiKey));
                if (selectedApiKey === apiKey) {
                    onSelectApiKey('');
                }
                toast.success('API key deleted successfully');
            } else {
                toast.error('Failed to delete API key');
            }
        } catch (error) {
            console.error('Error deleting API key:', error);
            toast.error('Error deleting API key');
        }
    };

    const maskApiKey = (apiKey: string) => {
        if (apiKey.length <= 8) return apiKey;
        return apiKey.substring(0, 4) + '•'.repeat(apiKey.length - 8) + apiKey.substring(apiKey.length - 4);
    };

    if (isLoading) {
        return (
            <div className="w-80 border-r bg-background p-4">
                <h2 className="text-lg font-semibold mb-4">API Keys</h2>
                <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-20 bg-muted animate-pulse rounded" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="w-80 border-r bg-background">
            <div className="p-4 border-b">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-semibold">API Keys</h2>
                    <Button
                        size="sm"
                        onClick={() => onSelectApiKey('new')}
                        className="gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        New Key
                    </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                    {apiKeys?.length || 0} API keys
                </p>
            </div>

            <ScrollArea className="h-[calc(100vh-8rem)] overflow-y-auto">
                <div className="p-4 space-y-3">
                    {apiKeys?.map((apiKey) => (
                        <Card
                            key={apiKey.id}
                            className={cn(
                                "cursor-pointer transition-colors hover:bg-muted/50",
                                selectedApiKey === apiKey.id && "ring-2 ring-primary"
                            )}
                            onClick={() => onSelectApiKey(apiKey.id)}
                        >
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-medium truncate">
                                        {apiKey.clientName}
                                    </CardTitle>
                                    {getStatusIcon(apiKey.isValid)}
                                </div>
                                <div className="flex items-center gap-2">
                                    {getStatusBadge(apiKey.isValid)}
                                </div>
                            </CardHeader>

                            {selectedApiKey === apiKey.id && (
                                <CardContent className="pt-0">
                                    <div className="space-y-3">
                                        <div className="space-y-1 text-xs text-muted-foreground">
                                            <div className="flex justify-between">
                                                <span>Client ID:</span>
                                                <span className="font-mono">{apiKey.clientId}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Status:</span>
                                                {getStatusBadge(apiKey.isValid)}
                                            </div>
                                        </div>

                                        <Separator />

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-medium">API Key:</span>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-6 w-6 p-0"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleApiKeyVisibility(apiKey.id);
                                                        }}
                                                    >
                                                        {showApiKeys[apiKey.id] ? (
                                                            <EyeOff className="h-3 w-3" />
                                                        ) : (
                                                            <Eye className="h-3 w-3" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-6 w-6 p-0"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            copyApiKey(apiKey.apiKey);
                                                        }}
                                                    >
                                                        <Copy className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="bg-muted p-2 rounded text-xs font-mono break-all">
                                                {showApiKeys[apiKey.id] ? apiKey.apiKey : maskApiKey(apiKey.apiKey)}
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="flex-1"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    copyApiKey(apiKey.apiKey);
                                                }}
                                            >
                                                <Copy className="h-3 w-3 mr-1" />
                                                Copy
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                className="flex-1"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteApiKey(apiKey.apiKey);
                                                }}
                                            >
                                                <Trash2 className="h-3 w-3 mr-1" />
                                                Delete
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    ))}

                    {(!apiKeys || apiKeys.length === 0) && (
                        <div className="text-center text-muted-foreground py-8">
                            <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No API keys yet</p>
                            <p className="text-xs">Create your first API key to get started</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
