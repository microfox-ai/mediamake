'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
// localStorage functionality removed - render requests are now handled by API
import { useRender } from './render-provider';
import { useEffect, useMemo, useState } from 'react';
import { AWS_RENDER_CONFIGS } from '../../../config.mjs';
import { getSafeConcurrency } from '@/lib/remotion-utils';
import { AlertCircle, CheckCircle, HelpCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import {
  calculateCompositionLayoutMetadata,
  InputCompositionProps,
} from '@microfox/remotion';

interface RenderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RenderModal({ isOpen, onClose }: RenderModalProps) {
  const router = useRouter();
  const {
    settings,
    updateSetting,
    renderMethod,
    setRenderMethod,
    isLoading,
    setIsLoading,
  } = useRender();

  const [safeConcurrency, setSafeConcurrency] = useState<number | null>(null);
  const [showJson, setShowJson] = useState(false);
  const selectedConfig = useMemo(() => {
    return (
      AWS_RENDER_CONFIGS[
      settings.awsRenderPreset as keyof typeof AWS_RENDER_CONFIGS
      ] || null
    );
  }, [settings.awsRenderPreset]);

  useEffect(() => {
    const inputProps = JSON.parse(settings.inputProps) as InputCompositionProps;
    const calculateMetadata = async () => {
      if (!inputProps) return;
      if (!inputProps.childrenData) return;
      if (inputProps.childrenData.length === 0) return;

      const metadata = await calculateCompositionLayoutMetadata({
        defaultProps: {},
        props: inputProps,
        abortSignal: new AbortController().signal,
        compositionId: 'DataMotion',
        isRendering: false,
      });
      console.log('gen metadat', metadata);
      if (metadata) {
        if (metadata.fps) {
          updateSetting('helperFps', metadata.fps);
          if (metadata.durationInFrames) {
            updateSetting(
              'helperDuration',
              metadata.durationInFrames / metadata.fps,
            );
          } else {
            updateSetting('helperDuration', 40);
          }
        } else {
          updateSetting('helperFps', 30);
          updateSetting('helperDuration', 40);
        }
      }
    };
    calculateMetadata();
  }, [settings.inputProps]);

  useEffect(() => {
    if (!selectedConfig || !settings.isConcurrencyHelperActive) {
      setSafeConcurrency(null);
      return;
    }

    const safeValue = getSafeConcurrency(
      settings.helperDuration ?? 40,
      settings.helperFps ?? 30,
      selectedConfig.timeout,
      selectedConfig.memory,
    );
    setSafeConcurrency(safeValue);
  }, [
    settings.isConcurrencyHelperActive,
    settings.helperDuration,
    settings.helperFps,
    selectedConfig,
  ]);

  const handleRender = async () => {
    setIsLoading(true);

    try {
      if (renderMethod === 'aws') {
        await handleAWSRender();
      } else {
        await handleLocalRender();
      }
    } catch (error) {
      console.error('Render error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to start render',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAWSRender = async () => {
    let parsedInputProps;
    try {
      parsedInputProps = JSON.parse(settings.inputProps);
    } catch (error) {
      toast.error('Invalid JSON in input props');
      return;
    }

    const response = await fetch('/api/remotion/render', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: settings.composition,
        inputProps: parsedInputProps,
        fileName: settings.isDownloadable ? settings.fileName : undefined,
        codec: settings.codec,
        audioCodec: settings.audioCodec,
        renderType: settings.renderType,
        isDownloadable: settings.isDownloadable,
        awsRenderPreset: settings.awsRenderPreset,
        concurrencyOverride: settings.concurrencyOverride,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Render request failed');
    }

    const result = await response.json();

    // Save render request to localStorage
    const renderRequest = {
      id: result.renderId || `render-${Date.now()}`,
      fileName: settings.fileName,
      codec: settings.codec,
      composition: settings.composition,
      status: 'rendering' as const,
      createdAt: new Date().toISOString(),
      progress: 0,
      inputProps: parsedInputProps,
      bucketName: result.bucketName,
      renderId: result.renderId,
      isDownloadable: settings.isDownloadable,
    };

    // Render request is now handled by the API directly

    toast.success('AWS render started successfully!');
    onClose();

    // Navigate to history page
    //router.push("/history");
  };

  const handleLocalRender = async () => {
    let parsedInputProps;
    try {
      parsedInputProps = JSON.parse(settings.inputProps);
    } catch (error) {
      toast.error('Invalid JSON in input props');
      return;
    }

    const response = await fetch('/api/remotion/render/local', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        compositionId: settings.composition,
        inputProps: parsedInputProps,
        codec: settings.codec,
        audioCodec: settings.audioCodec,
        renderType: settings.renderType,
        outputLocation: settings.outputLocation,
        fileName: settings.fileName,
        frameTime: settings.frameTime,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Local render request failed');
    }

    const result = await response.json();

    toast.success(
      `Local ${settings.renderType} render completed successfully!`,
    );
    toast.info(`Output saved to: ${result.result.outputPath}`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Render Video</DialogTitle>
          <DialogDescription>
            Configure your render settings and start the video generation
            process.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Tabs
            value={renderMethod}
            onValueChange={value => setRenderMethod(value as 'aws' | 'local')}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="aws">AWS Lambda</TabsTrigger>
              <TabsTrigger value="local">Local Render</TabsTrigger>
            </TabsList>

            <TabsContent value="aws" className="space-y-4">
              <div className="flex flex-col gap-4 py-4">
                <div className="grid grid-cols-1 items-center gap-4">
                  <Label htmlFor="awsRenderPreset" className="text-right">
                    Render Preset
                  </Label>
                  <Select
                    value={settings.awsRenderPreset}
                    onValueChange={value =>
                      updateSetting(
                        'awsRenderPreset',
                        value as
                        | 'complex-fast'
                        | 'complex-slow'
                        | 'basic-fast'
                        | 'throttled'
                        | 'classic',
                      )
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select preset" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="classic">
                        Classic (Short Videos)
                      </SelectItem>
                      <SelectItem value="complex-fast">
                        Complex (Fast)
                      </SelectItem>
                      <SelectItem value="complex-slow">
                        Complex (Slow)
                      </SelectItem>
                      <SelectItem value="basic-fast">Basic (Fast)</SelectItem>
                      <SelectItem value="throttled">
                        Throttled (API Safe)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedConfig && (
                  <Card className="col-span-4">
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {selectedConfig.name}
                      </CardTitle>
                      <CardDescription>
                        {selectedConfig.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                        <div>
                          <span className="font-semibold">Best for:</span>{' '}
                          {selectedConfig.bestFor}
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <XCircle className="h-4 w-4 text-red-500 mt-1" />
                        <div>
                          <span className="font-semibold">Not for:</span>{' '}
                          {selectedConfig.notFor}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-4 items-start gap-4 pt-4 border-t">
                  <Label className="text-right pt-2">Concurrency</Label>
                  <div className="col-span-3 space-y-4">
                    <RadioGroup
                      value={
                        typeof settings.concurrencyOverride === 'number'
                          ? 'custom'
                          : 'auto'
                      }
                      onValueChange={value => {
                        if (value === 'auto') {
                          updateSetting('concurrencyOverride', 'auto');
                        } else {
                          updateSetting('concurrencyOverride', 50);
                        }
                      }}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="auto" id="auto" />
                        <Label htmlFor="auto">Auto (Fast)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="custom" id="custom" />
                        <Label htmlFor="custom">Custom</Label>
                      </div>
                    </RadioGroup>

                    {settings.concurrencyOverride !== 'auto' && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={settings.concurrencyOverride}
                          onChange={e => {
                            const value = parseInt(e.target.value, 10);
                            updateSetting(
                              'concurrencyOverride',
                              Math.min(200, Math.max(1, value || 1)),
                            );
                          }}
                          max={200}
                          min={1}
                          className="w-24"
                        />
                        <p className="text-xs text-muted-foreground">
                          Max: 200
                        </p>
                      </div>
                    )}

                    <div className="pt-4 border-t">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="concurrency-helper"
                          checked={settings.isConcurrencyHelperActive}
                          onCheckedChange={checked =>
                            updateSetting('isConcurrencyHelperActive', checked)
                          }
                        />
                        <Label htmlFor="concurrency-helper">
                          Calculate Recommended Concurrency
                        </Label>
                      </div>

                      {settings.isConcurrencyHelperActive && (
                        <div className="grid grid-cols-2 gap-4 pt-4">
                          <div>
                            <Label htmlFor="helper-duration">
                              Duration (s)
                            </Label>
                            <Input
                              id="helper-duration"
                              type="number"
                              value={settings.helperDuration}
                              onChange={e =>
                                updateSetting(
                                  'helperDuration',
                                  parseInt(e.target.value) || 0,
                                )
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor="helper-fps">FPS</Label>
                            <Input
                              id="helper-fps"
                              type="number"
                              value={settings.helperFps}
                              onChange={e =>
                                updateSetting(
                                  'helperFps',
                                  parseInt(e.target.value) || 0,
                                )
                              }
                            />
                          </div>
                        </div>
                      )}

                      {safeConcurrency !== null && (
                        <Alert
                          variant={
                            safeConcurrency > 200 ? 'destructive' : 'default'
                          }
                          className="mt-4"
                        >
                          <HelpCircle className="h-4 w-4" />
                          <AlertTitle>
                            {safeConcurrency > 200
                              ? 'Warning!'
                              : 'Recommendation'}
                          </AlertTitle>
                          <AlertDescription className="flex items-center justify-between">
                            <span>
                              {safeConcurrency > 200
                                ? `High concurrency (${safeConcurrency}) needed. Render may fail.`
                                : `Recommended safe concurrency is ~${safeConcurrency}.`}
                            </span>
                            <Button
                              variant="link"
                              className="p-0 h-auto"
                              onClick={() => {
                                updateSetting(
                                  'concurrencyOverride',
                                  Math.min(safeConcurrency, 200),
                                );
                              }}
                            >
                              Apply
                            </Button>
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="isDownloadable" className="text-right">
                    Downloadable
                  </Label>
                  <div className="col-span-3 flex items-center space-x-2">
                    <Switch
                      id="isDownloadable"
                      checked={settings.isDownloadable || false}
                      onCheckedChange={checked =>
                        updateSetting('isDownloadable', checked)
                      }
                    />
                    <Label
                      htmlFor="isDownloadable"
                      className="text-sm text-muted-foreground"
                    >
                      Enable file download ( Not recommended )
                    </Label>
                  </div>
                </div>

                {settings.isDownloadable && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="fileName" className="text-right">
                      File Name
                    </Label>
                    <Input
                      id="fileName"
                      value={settings.fileName}
                      onChange={e => updateSetting('fileName', e.target.value)}
                      className="col-span-3"
                      placeholder="video.mp4"
                    />
                  </div>
                )}

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="codec" className="text-right">
                    Codec
                  </Label>
                  <Select
                    value={settings.codec}
                    onValueChange={value => updateSetting('codec', value)}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select codec" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="h264">H.264</SelectItem>
                      <SelectItem value="h265">H.265</SelectItem>
                      <SelectItem value="vp8">VP8</SelectItem>
                      <SelectItem value="vp9">VP9</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="composition" className="text-right">
                    Composition
                  </Label>
                  <Input
                    id="composition"
                    value={settings.composition}
                    onChange={e => updateSetting('composition', e.target.value)}
                    className="col-span-3"
                    placeholder="CompositionLayout"
                  />
                </div>

                <div className="grid grid-cols-4 items-start gap-4">
                  <Label className="text-right pt-2">Input Props</Label>
                  <div className="col-span-3 space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowJson(!showJson)}
                      className="w-full justify-between"
                    >
                      <span>{showJson ? 'Hide JSON' : 'Show JSON'}</span>
                      {showJson ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    {showJson && (
                      <Textarea
                        id="inputProps"
                        value={settings.inputProps}
                        onChange={e => updateSetting('inputProps', e.target.value)}
                        className="min-h-[120px] font-mono text-sm max-h-[200px] overflow-y-auto"
                        placeholder="Enter JSON input props..."
                      />
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="local" className="space-y-4">
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="localComposition" className="text-right">
                    Composition
                  </Label>
                  <Select
                    value={settings.composition}
                    onValueChange={value => updateSetting('composition', value)}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select composition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DataMotion">DataMotion</SelectItem>
                      <SelectItem value="ExampleDataMotion">
                        ExampleDataMotion
                      </SelectItem>
                      <SelectItem value="Ripple">Ripple</SelectItem>
                      <SelectItem value="Waveform">Waveform</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="renderType" className="text-right">
                    Render Type
                  </Label>
                  <Select
                    value={settings.renderType}
                    onValueChange={value =>
                      updateSetting(
                        'renderType',
                        value as 'video' | 'audio' | 'still',
                      )
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select render type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="audio">Audio Only</SelectItem>
                      <SelectItem value="still">Still Image</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {settings.renderType === 'still' && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="frameTime" className="text-right">
                      Frame Time (seconds)
                    </Label>
                    <Input
                      id="frameTime"
                      type="number"
                      step="0.1"
                      min="0"
                      value={settings.frameTime || 0}
                      onChange={e =>
                        updateSetting(
                          'frameTime',
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      className="col-span-3"
                      placeholder="0"
                    />
                  </div>
                )}

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="localCodec" className="text-right">
                    Video Codec
                  </Label>
                  <Select
                    value={settings.codec}
                    onValueChange={value => updateSetting('codec', value)}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select codec" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="h264">H.264</SelectItem>
                      <SelectItem value="h265">H.265</SelectItem>
                      <SelectItem value="vp8">VP8</SelectItem>
                      <SelectItem value="vp9">VP9</SelectItem>
                      <SelectItem value="prores">ProRes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="audioCodec" className="text-right">
                    Audio Codec
                  </Label>
                  <Select
                    value={settings.audioCodec}
                    onValueChange={value => updateSetting('audioCodec', value)}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select audio codec" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aac">AAC</SelectItem>
                      <SelectItem value="mp3">MP3</SelectItem>
                      <SelectItem value="pcm-16">PCM-16</SelectItem>
                      <SelectItem value="opus">Opus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="localFileName" className="text-right">
                    File Name
                  </Label>
                  <Input
                    id="localFileName"
                    value={settings.fileName}
                    onChange={e => updateSetting('fileName', e.target.value)}
                    className="col-span-3"
                    placeholder="video"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="outputLocation" className="text-right">
                    Output Location
                  </Label>
                  <Input
                    id="outputLocation"
                    value={settings.outputLocation || './out'}
                    onChange={e =>
                      updateSetting('outputLocation', e.target.value)
                    }
                    className="col-span-3"
                    placeholder="./out"
                  />
                </div>

                <div className="grid grid-cols-4 items-start gap-4">
                  <Label className="text-right pt-2">Input Props</Label>
                  <div className="col-span-3 space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowJson(!showJson)}
                      className="w-full justify-between"
                    >
                      <span>{showJson ? 'Hide JSON' : 'Show JSON'}</span>
                      {showJson ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    {showJson && (
                      <Textarea
                        id="localInputProps"
                        value={settings.inputProps}
                        onChange={e => updateSetting('inputProps', e.target.value)}
                        className="min-h-[120px] font-mono text-sm max-h-[200px] overflow-y-auto"
                        placeholder="Enter JSON input props..."
                      />
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleRender} disabled={isLoading}>
            {isLoading ? 'Starting Render...' : 'Start Render'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
