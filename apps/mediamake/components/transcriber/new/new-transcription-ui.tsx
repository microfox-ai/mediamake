"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
    FileAudio,
    Upload,
    Loader2,
    AlertCircle,
    Globe,
    Link,
    CheckCircle,
    Bot,
    Sparkles,
    Tag as TagIcon,
    Image,
    Mic,
    FileText
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useTranscriber } from "../contexts/transcriber-context";
import { Transcription } from "@/app/types/transcription";
import { TagMultiSelect } from "@/components/ui/tag-multi-select";
import { MediaPicker } from "../../editor/media/media-picker";
import { MediaFile } from "@/app/types/media";
import { generateTextToSpeech, COMMON_VOICES, AVAILABLE_MODELS } from "@/components/transcriber/new-transcription-ui";

// MediaPickerButton component
function MediaPickerButton({ onSelect }: { onSelect: (files: MediaFile | MediaFile[]) => void }) {
    const [showPicker, setShowPicker] = useState(false);

    const handleSelect = (files: MediaFile | MediaFile[]) => {
        onSelect(files);
        setShowPicker(false);
    };

    return (
        <>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPicker(true)}
                className="px-3"
            >
                <Image className="h-4 w-4" />
            </Button>
            {showPicker && (
                <MediaPicker
                    pickerMode={true}
                    singular={true}
                    onSelect={handleSelect}
                    onClose={() => setShowPicker(false)}
                />
            )}
        </>
    );
}

export function NewTranscriptionUI() {
    const { setCurrentView, setSelectedTranscription, setTranscriptionData } = useTranscriber();

    // Mode selection: "audio-to-text" or "text-to-speech"
    const [mode, setMode] = useState<"audio-to-text" | "text-to-speech">("audio-to-text");

    // Audio-to-text states
    const [audioUrl, setAudioUrl] = useState("");
    const [language, setLanguage] = useState("");
    const [transcriptionProvider, setTranscriptionProvider] = useState<"assembly" | "gemini" | "elevenlabs">("assembly");
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    // Text-to-speech states
    const [ttsText, setTtsText] = useState("");
    const [selectedVoice, setSelectedVoice] = useState<string>(COMMON_VOICES[0].id);
    const [customVoiceId, setCustomVoiceId] = useState("");
    const [useCustomVoice, setUseCustomVoice] = useState(false);
    const [selectedModel, setSelectedModel] = useState<string>(AVAILABLE_MODELS[0].id);

    // Autofix options (only for audio-to-text)
    const [enableAutofix, setEnableAutofix] = useState(false);
    const [userRequest, setUserRequest] = useState("");
    const [userWrittenTranscription, setUserWrittenTranscription] = useState("");

    // Progress states
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [isAutofixing, setIsAutofixing] = useState(false);
    const [progressMessage, setProgressMessage] = useState("");

    // Tag management
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    const handleTTSSubmit = async () => {
        if (!ttsText.trim()) {
            setError("Please enter text to convert to speech");
            return;
        }

        const voiceId = useCustomVoice ? customVoiceId.trim() : selectedVoice;

        if (!voiceId) {
            setError("Please select or enter a voice ID");
            return;
        }

        setIsTranscribing(true);
        setError(null);
        setProgressMessage("Generating speech with ElevenLabs...");

        try {
            setProgressMessage("Generating speech with ElevenLabs...");
            const result = await generateTextToSpeech({
                text: ttsText.trim(),
                voiceId,
                modelId: selectedModel,
                language: language?.trim() || undefined,
                tags: selectedTags,
            });

            if (!result.success || !result.transcription) {
                throw new Error(result.error || 'TTS generation failed');
            }

            setProgressMessage("Speech generated successfully! Loading editor...");
            setTranscriptionData(result.transcription);
            setSelectedTranscription(result.transcription._id?.toString() || '');
            setCurrentView('editor');
            setIsSuccess(true);
        } catch (error) {
            console.error('TTS generation error:', error);
            setError(error instanceof Error ? error.message : 'Failed to generate speech');
        } finally {
            setIsTranscribing(false);
        }
    };

    const handleAudioToTextSubmit = async () => {
        if (!audioUrl.trim()) {
            setError("Please enter an audio URL");
            return;
        }

        if (!isValidUrl(audioUrl)) {
            setError("Please enter a valid URL");
            return;
        }

        setIsTranscribing(true);
        setError(null);
        setProgressMessage("Starting transcription...");

        try {
            console.log('Starting transcription with audio URL:', audioUrl.trim(), 'language:', language.trim() || undefined, 'provider:', transcriptionProvider);

            // Determine API endpoint based on provider
            const apiEndpoint = transcriptionProvider === 'gemini'
                ? '/api/transcribe/gemini'
                : transcriptionProvider === 'elevenlabs'
                ? '/api/transcribe/elevenlabs-stt'
                : '/api/transcribe/assembly';

            setProgressMessage(`Starting transcription with ${
                transcriptionProvider === 'gemini' ? 'Gemini' : 
                transcriptionProvider === 'elevenlabs' ? 'ElevenLabs Scribe' :
                'AssemblyAI'
            }...`);

            // Call the transcription API
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    audioUrl: audioUrl.trim(),
                    language: language?.trim() || undefined,
                    tags: selectedTags,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Transcription failed');
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Transcription failed');
            }

            setProgressMessage("Transcription completed! Processing with AI...");

            // If autofix is enabled, trigger it automatically
            // Autofix works with all transcription providers (AssemblyAI, Gemini, ElevenLabs)
            if (enableAutofix && result.transcription?._id) {
                setIsAutofixing(true);
                setProgressMessage("AI is fixing transcription errors...");
                try {
                    const autofixResponse = await fetch('/api/studio/chat/agent/transcription-fixer', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            transcriptionId: result.transcription._id,
                            userRequest: userRequest.trim() || undefined,
                            userWrittenTranscription: userWrittenTranscription.trim() || undefined,
                        }),
                    });

                    if (autofixResponse.ok) {
                        const autofixResult = await autofixResponse.json();
                        if (autofixResult.success) {
                            // Update the transcription with AI fixes
                            result.transcription.captions = autofixResult.transcription.captions;
                            result.transcription.processingData = {
                                ...result.transcription.processingData,
                                step2: {
                                    ...result.transcription.processingData?.step2,
                                    aiAutofix: {
                                        changes: autofixResult.changes,
                                        confidence: autofixResult.confidence,
                                        appliedAt: new Date().toISOString(),
                                        userRequest,
                                        userWrittenTranscription,
                                    }
                                }
                            };
                        }
                    }
                } catch (autofixError) {
                    console.warn('Autofix failed, continuing with original transcription:', autofixError);
                    setProgressMessage("AI autofix failed, using original transcription");
                } finally {
                    setIsAutofixing(false);
                }
            }

            setProgressMessage("Transcription completed successfully!");
            setTranscriptionData(result.transcription);
            setSelectedTranscription(result.transcription._id?.toString() || '');
            setCurrentView('editor');
            setIsSuccess(true);

        } catch (error) {
            console.error('Transcription start error:', error);
            setError(error instanceof Error ? error.message : 'Failed to start transcription');
        } finally {
            setIsTranscribing(false);
        }
    };

    const handleSubmit = async () => {
        if (mode === "text-to-speech") {
            await handleTTSSubmit();
        } else {
            await handleAudioToTextSubmit();
        }
    };

    const isValidUrl = (url: string) => {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !isTranscribing) {
            handleSubmit();
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-border">
                <div className="flex items-center gap-2">
                    <FileAudio className="h-5 w-5" />
                    <h1 className="text-xl font-bold">Start New Transcription</h1>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                    {mode === "audio-to-text"
                        ? "Enter an audio URL to begin transcribing. The audio will be processed and converted to text with timestamps."
                        : "Enter text to convert to speech with ElevenLabs. Audio and timing data will be generated automatically."
                    }
                </p>

                {/* Mode Toggle */}
                <div className="flex gap-2 mt-4">
                    <Button
                        type="button"
                        variant={mode === "audio-to-text" ? "default" : "outline"}
                        className="flex-1"
                        onClick={() => setMode("audio-to-text")}
                        disabled={isTranscribing}
                    >
                        <FileAudio className="h-4 w-4 mr-2" />
                        Audio to Text
                    </Button>
                    <Button
                        type="button"
                        variant={mode === "text-to-speech" ? "default" : "outline"}
                        className="flex-1"
                        onClick={() => setMode("text-to-speech")}
                        disabled={isTranscribing}
                    >
                        <Mic className="h-4 w-4 mr-2" />
                        Text to Speech
                    </Button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 overflow-y-auto">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Side - Mode-specific Settings */}
                        <div className="space-y-6">
                            {mode === "audio-to-text" ? (
                                <>
                                    {/* Transcription Settings */}
                                    <div className="p-4 border rounded-lg">
                                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                            <FileAudio className="h-5 w-5" />
                                            Transcription Settings
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="audioUrl" className="flex items-center gap-2">
                                                    <Link className="h-4 w-4" />
                                                    Audio URL *
                                                </Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        id="audioUrl"
                                                        type="url"
                                                        placeholder="https://example.com/audio.mp3"
                                                        value={audioUrl}
                                                        onChange={(e) => setAudioUrl(e.target.value)}
                                                        onKeyDown={handleKeyDown}
                                                        disabled={isTranscribing}
                                                        className={error && !audioUrl ? "border-red-500" : ""}
                                                    />
                                                    <MediaPickerButton
                                                        onSelect={(files) => {
                                                            const file = Array.isArray(files) ? files[0] : files;
                                                            if (file?.filePath) {
                                                                setAudioUrl(file.filePath);
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                {audioUrl && !isValidUrl(audioUrl) && (
                                                    <p className="text-sm text-red-500">Please enter a valid URL</p>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="transcriptionProvider" className="flex items-center gap-2">
                                                    <Bot className="h-4 w-4" />
                                                    Transcription Provider
                                                </Label>
                                                <Select
                                                    value={transcriptionProvider}
                                                    onValueChange={(value: "assembly" | "gemini" | "elevenlabs") => setTranscriptionProvider(value)}
                                                    disabled={isTranscribing}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="assembly">
                                                            <div className="flex flex-col">
                                                                <span className="font-medium">AssemblyAI</span>
                                                                <span className="text-xs text-muted-foreground">High accuracy, word-level timestamps</span>
                                                            </div>
                                                        </SelectItem>
                                                        <SelectItem value="gemini">
                                                            <div className="flex flex-col">
                                                                <span className="font-medium">Google Gemini</span>
                                                                <span className="text-xs text-muted-foreground">AI-powered transcription with timestamps</span>
                                                            </div>
                                                        </SelectItem>
                                                        <SelectItem value="elevenlabs">
                                                            <div className="flex flex-col">
                                                                <span className="font-medium">ElevenLabs Scribe</span>
                                                                <span className="text-xs text-muted-foreground">99 languages, speaker diarization, audio events</span>
                                                            </div>
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <p className="text-xs text-muted-foreground">
                                                    Choose your preferred transcription service provider.
                                                </p>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="language" className="flex items-center gap-2">
                                                    <Globe className="h-4 w-4" />
                                                    Language (Optional)
                                                </Label>
                                                <Input
                                                    id="language"
                                                    placeholder="en, es, fr, de, etc."
                                                    value={language}
                                                    onChange={(e) => setLanguage(e.target.value)}
                                                    onKeyDown={handleKeyDown}
                                                    disabled={isTranscribing}
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    Language code helps improve transcription accuracy. Leave empty for auto-detection.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* AI Autofix Section */}
                                    <div className="p-4 border rounded-lg">
                                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                            <Bot className="h-5 w-5 text-blue-600" />
                                            AI Autofix
                                            <Badge variant="outline" className="text-xs">Beta</Badge>
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="enableAutofix"
                                                    checked={enableAutofix}
                                                    onCheckedChange={(checked) => setEnableAutofix(checked as boolean)}
                                                    disabled={isTranscribing}
                                                />
                                                <Label htmlFor="enableAutofix" className="text-sm">
                                                    Automatically fix transcription errors with AI
                                                </Label>
                                            </div>

                                            {enableAutofix && (
                                                <div className="space-y-4 pl-4 border-l-2 border-blue-200 bg-blue-50/30 p-3 rounded-r-lg">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="userRequest" className="text-sm">User Request (Optional)</Label>
                                                        <Textarea
                                                            id="userRequest"
                                                            value={userRequest}
                                                            onChange={(e) => setUserRequest(e.target.value)}
                                                            placeholder="e.g., Fix spelling errors and improve sentence flow..."
                                                            className="min-h-[100px] resize-none text-sm overflow-y-auto"
                                                            disabled={isTranscribing}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="userWrittenTranscription" className="text-sm">Your Written Version (Optional)</Label>
                                                        <Textarea
                                                            id="userWrittenTranscription"
                                                            value={userWrittenTranscription}
                                                            onChange={(e) => setUserWrittenTranscription(e.target.value)}
                                                            placeholder="Paste your corrected version here for reference..."
                                                            className="min-h-[400px] resize-none text-sm overflow-y-auto"
                                                            disabled={isTranscribing}
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <Sparkles className="h-3 w-3" />
                                                        <span>AI will analyze and fix word boundaries, spelling, and sentence structure</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Text to Speech Settings */}
                                    <div className="p-4 border rounded-lg">
                                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                            <Mic className="h-5 w-5" />
                                            Text to Speech Settings
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="ttsText" className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4" />
                                                    Text *
                                                </Label>
                                                <Textarea
                                                    id="ttsText"
                                                    placeholder="Enter the text you want to convert to speech..."
                                                    value={ttsText}
                                                    onChange={(e) => setTtsText(e.target.value)}
                                                    disabled={isTranscribing}
                                                    className="min-h-[120px]"
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    {ttsText.length} characters
                                                </p>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="model">Model</Label>
                                                <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isTranscribing}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {AVAILABLE_MODELS.map((model) => (
                                                            <SelectItem key={model.id} value={model.id}>
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium">{model.name}</span>
                                                                    <span className="text-xs text-muted-foreground">{model.description}</span>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Voice</Label>
                                                <div className="flex items-center space-x-2 mb-2">
                                                    <Checkbox
                                                        id="useCustomVoice"
                                                        checked={useCustomVoice}
                                                        onCheckedChange={(checked) => setUseCustomVoice(checked as boolean)}
                                                        disabled={isTranscribing}
                                                    />
                                                    <Label htmlFor="useCustomVoice" className="text-sm">
                                                        Use custom voice ID
                                                    </Label>
                                                </div>

                                                {useCustomVoice ? (
                                                    <Input
                                                        id="customVoiceId"
                                                        placeholder="Enter custom voice ID..."
                                                        value={customVoiceId}
                                                        onChange={(e) => setCustomVoiceId(e.target.value)}
                                                        disabled={isTranscribing}
                                                    />
                                                ) : (
                                                    <Select value={selectedVoice} onValueChange={setSelectedVoice} disabled={isTranscribing}>
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {COMMON_VOICES.map((voice) => (
                                                                <SelectItem key={voice.id} value={voice.id}>
                                                                    {voice.name} ({voice.gender})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="ttsLanguage" className="flex items-center gap-2">
                                                    <Globe className="h-4 w-4" />
                                                    Language (Optional)
                                                </Label>
                                                <Input
                                                    id="ttsLanguage"
                                                    placeholder="en, es, fr, de, etc."
                                                    value={language}
                                                    onChange={(e) => setLanguage(e.target.value)}
                                                    disabled={isTranscribing}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Right Side - Tags & Start Transcription */}
                        <div className="space-y-6">
                            {/* Tags Section */}
                            <div className="p-4 border rounded-lg">
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <TagIcon className="h-5 w-5" />
                                    Tags
                                </h3>
                                <TagMultiSelect
                                    selectedTags={selectedTags}
                                    onTagsChange={setSelectedTags}
                                    label=""
                                />
                            </div>

                            {/* Start Transcription Section */}
                            <div className="p-4 border rounded-lg">
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <Upload className="h-5 w-5" />
                                    Start Transcription
                                </h3>

                                {/* Progress/Status Messages */}
                                {(isTranscribing || isAutofixing) && progressMessage && (
                                    <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                                        <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                                        <span className="text-sm text-blue-700">{progressMessage}</span>
                                    </div>
                                )}

                                {error && (
                                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                                        <AlertCircle className="h-4 w-4 text-red-600" />
                                        <span className="text-sm text-red-700">{error}</span>
                                    </div>
                                )}

                                {isSuccess && (
                                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                        <span className="text-sm text-green-700">Transcription completed successfully!</span>
                                    </div>
                                )}

                                {/* Submit Button */}
                                <Button
                                    onClick={handleSubmit}
                                    disabled={
                                        mode === "audio-to-text"
                                            ? !audioUrl.trim() || !isValidUrl(audioUrl) || isTranscribing || isAutofixing || isSuccess
                                            : !ttsText.trim() || isTranscribing || isSuccess
                                    }
                                    className="w-full min-h-[48px]"
                                    size="lg"
                                >
                                    {isTranscribing ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            {mode === "text-to-speech" ? "Generating..." : "Transcribing..."}
                                        </>
                                    ) : isAutofixing ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            AI Fixing...
                                        </>
                                    ) : isSuccess ? (
                                        <>
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Complete!
                                        </>
                                    ) : (
                                        <>
                                            {mode === "text-to-speech" ? (
                                                <>
                                                    <Mic className="h-4 w-4 mr-2" />
                                                    Generate Speech
                                                </>
                                            ) : (
                                                <>
                                                    <Upload className="h-4 w-4 mr-2" />
                                                    Start Transcription
                                                </>
                                            )}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
