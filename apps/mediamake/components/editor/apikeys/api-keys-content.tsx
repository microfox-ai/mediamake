"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
    Key,
    Plus,
    AlertCircle,
    CheckCircle,
    XCircle,
    Copy,
    Trash2,
    Save,
    Eye,
    EyeOff,
    RefreshCw,
    RotateCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface ApiKeyInfo {
    id: string;
    apiKey: string;
    clientId: string;
    clientName: string;
    isValid: boolean;
}

interface ApiKeysContentProps {
    selectedApiKey: string | null;
    onRotated?: (apiKey: ApiKeyInfo) => void;
}

export function ApiKeysContent({ selectedApiKey, onRotated }: ApiKeysContentProps) {
    const [selectedKey, setSelectedKey] = useState<ApiKeyInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showApiKey, setShowApiKey] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isRotating, setIsRotating] = useState(false);
    const [rotatedKey, setRotatedKey] = useState<string | null>(null);
    const selectedKeyRef = useRef<ApiKeyInfo | null>(null);
    selectedKeyRef.current = selectedKey;

    // Form state for creating/editing
    const [formData, setFormData] = useState({
        clientName: '',
        clientId: '',
        isValid: true
    });

    // Load selected API key details
    useEffect(() => {
        if (selectedApiKey && selectedApiKey !== 'new') {
            if (selectedKeyRef.current?.apiKey === selectedApiKey) return;
            loadApiKeyDetails(selectedApiKey);
        } else if (selectedApiKey === 'new') {
            setSelectedKey(null);
            setFormData({
                clientName: '',
                clientId: '',
                isValid: true
            });
            setError(null);
        } else {
            setSelectedKey(null);
            setError(null);
        }
    }, [selectedApiKey]);

    const loadApiKeyDetails = async (apiKeyId: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/db/apikeys?apiKey=${apiKeyId}`);
            if (response.ok) {
                const data = await response.json();
                setSelectedKey(data);
                setFormData({
                    clientName: data?.clientName || '',
                    clientId: data?.clientId || '',
                    isValid: data?.isValid ?? true
                });
            } else {
                setError('Failed to load API key details');
            }
        } catch (error) {
            console.error('Error loading API key details:', error);
            setError('Error loading API key details');
        } finally {
            setIsLoading(false);
        }
    };

    const generateApiKey = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 32; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    const handleCreateApiKey = async () => {
        if (!formData.clientName.trim() || !formData.clientId.trim()) {
            toast.error('Please fill in all required fields');
            return;
        }

        setIsSaving(true);
        try {
            const apiKey = generateApiKey();
            const response = await fetch('/api/db/apikeys', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    apiKey,
                    clientId: formData.clientId,
                    clientName: formData.clientName,
                    isValid: formData.isValid
                }),
            });

            if (response.ok) {
                const newApiKey = await response.json();
                setSelectedKey(newApiKey);
                toast.success('API key created successfully');
                // Refresh the sidebar by triggering a reload
                window.location.reload();
            } else {
                toast.error('Failed to create API key');
            }
        } catch (error) {
            console.error('Error creating API key:', error);
            toast.error('Error creating API key');
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateApiKey = async () => {
        if (!selectedKey || !formData.clientName.trim() || !formData.clientId.trim()) {
            toast.error('Please fill in all required fields');
            return;
        }

        setIsSaving(true);
        try {
            const response = await fetch('/api/db/apikeys', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    apiKey: selectedKey.apiKey,
                    clientId: formData.clientId,
                    clientName: formData.clientName,
                    isValid: formData.isValid
                }),
            });

            if (response.ok) {
                const updatedApiKey = await response.json();
                setSelectedKey(updatedApiKey);
                toast.success('API key updated successfully');
            } else {
                toast.error('Failed to update API key');
            }
        } catch (error) {
            console.error('Error updating API key:', error);
            toast.error('Error updating API key');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRotateApiKey = async () => {
        if (!selectedKey || isRotating) return;

        if (!confirm('Rotate this API key? The current key stops working immediately and is replaced with a new one.')) {
            return;
        }

        setIsRotating(true);
        try {
            const response = await fetch('/api/admin/apikeys/rotate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ apiKey: selectedKey.apiKey }),
            });

            const data = await response.json().catch(() => null);
            if (!response.ok) {
                toast.error(data?.error || 'Failed to rotate API key');
                return;
            }

            setSelectedKey(data);
            setShowApiKey(true);
            setRotatedKey(data.apiKey);
            onRotated?.(data);
            toast.success('API key rotated. Copy the new key now.');
        } catch (error) {
            console.error('Error rotating API key:', error);
            toast.error('Error rotating API key');
        } finally {
            setIsRotating(false);
        }
    };

    const handleDeleteApiKey = async () => {
        if (!selectedKey) return;

        if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch('/api/db/apikeys', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ apiKey: selectedKey.apiKey }),
            });

            if (response.ok) {
                toast.success('API key deleted successfully');
                setSelectedKey(null);
                // Refresh the sidebar by triggering a reload
                window.location.reload();
            } else {
                toast.error('Failed to delete API key');
            }
        } catch (error) {
            console.error('Error deleting API key:', error);
            toast.error('Error deleting API key');
        }
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

    const maskApiKey = (apiKey: string) => {
        if (apiKey.length <= 8) return apiKey;
        return apiKey.substring(0, 4) + '•'.repeat(apiKey.length - 8) + apiKey.substring(apiKey.length - 4);
    };

    const getStatusIcon = (isValid: boolean) => {
        return isValid ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
        ) : (
            <XCircle className="h-5 w-5 text-red-500" />
        );
    };

    const getStatusBadge = (isValid: boolean) => {
        return (
            <Badge variant={isValid ? "default" : "destructive"} className="text-sm">
                {isValid ? "Active" : "Inactive"}
            </Badge>
        );
    };

    if (!selectedApiKey) {
        return (
            <div className="flex-1 flex items-center justify-center bg-muted/20">
                <div className="text-center">
                    <Key className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Select an API Key</h3>
                    <p className="text-muted-foreground">
                        Choose an API key from the sidebar to view its details, or create a new one
                    </p>
                </div>
            </div>
        );
    }

    if (error || (selectedApiKey !== 'new' && !selectedKey && !isLoading)) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                    <h3 className="text-lg font-semibold mb-2">Error Loading API Key</h3>
                    <p className="text-muted-foreground mb-4">
                        {error || 'Failed to load API key details'}
                    </p>
                    <Button
                        onClick={() => selectedApiKey && loadApiKeyDetails(selectedApiKey)}
                        variant="outline"
                        disabled={isLoading}
                    >
                        <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                        {isLoading ? "Loading..." : "Retry"}
                    </Button>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-muted-foreground" />
                    <p className="text-muted-foreground">Loading API key details...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 min-w-0 p-6 space-y-6 overflow-y-auto">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    {selectedApiKey === 'new' ? (
                        <Plus className="h-6 w-6 text-blue-500" />
                    ) : (
                        getStatusIcon(selectedKey?.isValid ?? true)
                    )}
                    <div>
                        <h1 className="text-2xl font-bold">
                            {selectedApiKey === 'new' ? 'Create New API Key' : selectedKey?.clientName}
                        </h1>
                        <p className="text-muted-foreground">
                            {selectedApiKey === 'new'
                                ? 'Generate a new API key for your application'
                                : `Client ID: ${selectedKey?.clientId}`
                            }
                        </p>
                    </div>
                </div>
                {selectedApiKey !== 'new' && selectedKey && (
                    <div className="flex flex-wrap items-center gap-2">
                        {getStatusBadge(selectedKey.isValid)}
                        <Button
                            onClick={handleRotateApiKey}
                            variant="outline"
                            size="sm"
                            disabled={isRotating}
                        >
                            <RotateCw className={cn("h-4 w-4 mr-2", isRotating && "animate-spin")} />
                            {isRotating ? "Rotating..." : "Rotate"}
                        </Button>
                        <Button
                            onClick={handleDeleteApiKey}
                            variant="destructive"
                            size="sm"
                            disabled={isRotating}
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                        </Button>
                    </div>
                )}
            </div>

            <Separator />

            {/* Form */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Key className="h-5 w-5" />
                        {selectedApiKey === 'new' ? 'API Key Details' : 'Edit API Key'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="clientName">Client Name *</Label>
                            <Input
                                id="clientName"
                                value={formData.clientName}
                                onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                                placeholder="Enter client name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="clientId">Client ID *</Label>
                            <Input
                                id="clientId"
                                value={formData.clientId}
                                onChange={(e) => setFormData(prev => ({ ...prev, clientId: e.target.value }))}
                                placeholder="Enter client ID"
                            />
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="isValid"
                            checked={formData.isValid}
                            onChange={(e) => setFormData(prev => ({ ...prev, isValid: e.target.checked }))}
                            className="rounded border-gray-300"
                        />
                        <Label htmlFor="isValid">Active (API key is valid and can be used)</Label>
                    </div>

                    <div className="flex gap-2 pt-4">
                        <Button
                            onClick={selectedApiKey === 'new' ? handleCreateApiKey : handleUpdateApiKey}
                            disabled={isSaving || !formData.clientName.trim() || !formData.clientId.trim()}
                            className="gap-2"
                        >
                            <Save className="h-4 w-4" />
                            {isSaving ? "Saving..." : (selectedApiKey === 'new' ? "Create API Key" : "Update API Key")}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* API Key Display */}
            {selectedKey && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Key className="h-5 w-5" />
                            API Key
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Your API Key:</span>
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setShowApiKey(!showApiKey)}
                                    >
                                        {showApiKey ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => copyApiKey(selectedKey.apiKey)}
                                    >
                                        <Copy className="h-4 w-4 mr-2" />
                                        Copy
                                    </Button>
                                </div>
                            </div>
                            <div className="bg-muted p-4 rounded-lg">
                                <code className="text-sm font-mono break-all">
                                    {showApiKey ? selectedKey.apiKey : maskApiKey(selectedKey.apiKey)}
                                </code>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {selectedKey.apiKey === rotatedKey
                                    ? 'This key was just rotated. Copy it now. The previous key no longer works.'
                                    : 'Keep this API key secure and never share it publicly. You can use it to authenticate your API requests.'}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Usage Information */}
            <Card>
                <CardHeader>
                    <CardTitle>Usage Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3 text-sm">
                        <div>
                            <h4 className="font-medium mb-1">Authentication</h4>
                            <p className="text-muted-foreground">
                                Include your API key in the Authorization header: <code className="bg-muted px-1 rounded">Authorization: Bearer YOUR_API_KEY</code>
                            </p>
                        </div>
                        <div>
                            <h4 className="font-medium mb-1">Rate Limits</h4>
                            <p className="text-muted-foreground">
                                API keys are subject to rate limiting. Check the response headers for current usage information.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-medium mb-1">Security</h4>
                            <p className="text-muted-foreground">
                                If you suspect your API key has been compromised, rotate it. The old secret stops working immediately.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
