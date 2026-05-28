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
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useRender, ConfigMode } from './render-provider';
import { useEffect, useMemo, useState } from 'react';
import { useSession } from '@/components/session-provider';
import { useQuotaExhaustedDialog, extractQuotaError } from '@/components/quota-exhausted-dialog';
import { TagMultiSelect } from '@/components/ui/tag-multi-select';
import {
  AWS_RENDER_CONFIGS,
  AWS_REGION_OPTIONS,
  DEFAULT_REGION,
  LAMBDA_MEMORY_OPTIONS,
  LAMBDA_TIMEOUT_OPTIONS,
  LAMBDA_DISK_OPTIONS,
  CONCURRENCY_LIMITS,
  FRAMES_PER_LAMBDA_LIMITS,
} from '../../../config.mjs';
import { getSafeConcurrency } from '@/lib/remotion-utils';
import {
  AlertCircle,
  CheckCircle,
  HelpCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Zap,
  Rocket,
  Shield,
  Gauge,
  Timer,
  Leaf,
  Tv,
  Building,
  Settings2,
  Cpu,
  HardDrive,
  Clock,
  Layers,
  Info,
} from 'lucide-react';
import {
  calculateCompositionLayoutMetadata,
  InputCompositionProps,
} from '@microfox/remotion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface RenderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Icon mapping for presets
const presetIcons: Record<string, React.ReactNode> = {
  Zap: <Zap className="h-4 w-4" />,
  Rocket: <Rocket className="h-4 w-4" />,
  Shield: <Shield className="h-4 w-4" />,
  Gauge: <Gauge className="h-4 w-4" />,
  Timer: <Timer className="h-4 w-4" />,
  Leaf: <Leaf className="h-4 w-4" />,
  Tv: <Tv className="h-4 w-4" />,
  Building: <Building className="h-4 w-4" />,
};

export function RenderModal({ isOpen, onClose }: RenderModalProps) {
  const router = useRouter();
  const session = useSession();
  const {
    settings,
    updateSetting,
    updateCustomConfig,
    renderMethod,
    setRenderMethod,
    isLoading,
    setIsLoading,
  } = useRender();

  const [safeConcurrency, setSafeConcurrency] = useState<number | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [projects, setProjects] = useState<{ id: string; displayName: string }[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  // Quota-exhausted modal for 403/429 responses from /api/remotion/render
  const { setQuotaError, dialog: quotaDialog } = useQuotaExhaustedDialog();

  // Ensure region has a sensible default
  useEffect(() => {
    if (!settings.region) {
      updateSetting('region', DEFAULT_REGION);
    }
  }, [settings.region, updateSetting]);

  useEffect(() => {
    const loadProjects = async () => {
      if (!session?.clientId) return;
      setProjectsLoading(true);
      try {
        const res = await fetch('/api/project', {
          headers: { 'x-client-id': session.clientId },
        });
        const data = res.ok ? await res.json() : [];
        setProjects(Array.isArray(data) ? data : []);
      } catch {
        setProjects([]);
      } finally {
        setProjectsLoading(false);
      }
    };
    void loadProjects();
  }, [session?.clientId]);

  const selectedConfig = useMemo(() => {
    if (settings.configMode === 'custom') {
      return {
        name: 'Custom',
        memory: settings.customConfig.memory,
        disk: settings.customConfig.disk,
        timeout: settings.customConfig.timeout,
        concurrency: settings.customConfig.concurrency === 'auto' ? undefined : settings.customConfig.concurrency,
        timeoutInMilliseconds: settings.customConfig.timeoutInMilliseconds,
        framesPerLambda: settings.customConfig.framesPerLambda === 'auto' ? undefined : settings.customConfig.framesPerLambda,
        description: 'Custom configuration with your own settings.',
        bestFor: 'Advanced users who know their requirements.',
        notFor: 'Users unfamiliar with AWS Lambda settings.',
        icon: 'Settings2',
      };
    }
    return (
      AWS_RENDER_CONFIGS[
        settings.awsRenderPreset as keyof typeof AWS_RENDER_CONFIGS
      ] || null
    );
  }, [settings.configMode, settings.awsRenderPreset, settings.customConfig]);

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

    // Build request body based on config mode
    const requestBody: Record<string, unknown> = {
      id: settings.composition,
      inputProps: parsedInputProps,
      fileName:
        settings.renderType === 'still'
          ? settings.fileName
          : settings.isDownloadable
            ? settings.fileName
            : undefined,
      codec: settings.codec,
      audioCodec: settings.audioCodec,
      renderType: settings.renderType,
      projectId: settings.projectId,
      tags: settings.tags,
      isDownloadable: settings.isDownloadable,
      configMode: settings.configMode,
      region: settings.region ?? DEFAULT_REGION,
    };

    if (settings.configMode === 'preset') {
      requestBody.awsRenderPreset = settings.awsRenderPreset;
      requestBody.concurrencyOverride = settings.concurrencyOverride;
    } else {
      // Custom mode - send full custom config
      requestBody.customConfig = settings.customConfig;
    }

    const response = await fetch('/api/remotion/render', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.clientId ? { 'x-client-id': session.clientId } : {}),
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const quotaErr = await extractQuotaError(response);
      if (quotaErr) {
        setQuotaError(quotaErr);
        onClose(); // close the render modal so the quota modal is unambiguous
        return;
      }
      const errorData = await response.json();
      throw new Error(errorData.message || 'Render request failed');
    }

    const result = await response.json();

    toast.success('AWS render started successfully!');
    onClose();
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

  // Get effective concurrency for display
  const getEffectiveConcurrency = () => {
    if (settings.configMode === 'preset') {
      return settings.concurrencyOverride === 'auto' 
        ? 'Auto' 
        : settings.concurrencyOverride;
    }
    return settings.customConfig.concurrency === 'auto' 
      ? 'Auto' 
      : settings.customConfig.concurrency;
  };

  return (
    <>
    {quotaDialog}
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {settings.renderType === 'still' ? 'Render Image' : 'Render Video'}
          </DialogTitle>
          <DialogDescription>
            Configure your render settings and start the generation process.
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
                {/* Render target (video vs image) */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Render</Label>
                  <div className="col-span-3">
                    <Tabs
                      value={settings.renderType === 'still' ? 'image' : 'video'}
                      onValueChange={(value) => {
                        if (value === 'image') {
                          updateSetting('renderType', 'still');
                          updateSetting('codec', 'png');
                          // Default to lowest RAM preset for images
                          updateSetting('awsRenderPreset', 'lightweight');
                          if (settings.fileName.startsWith('video-')) {
                            updateSetting('fileName', 'image-' + Date.now().toString().replaceAll('-', '') + '.png');
                          }
                        } else {
                          updateSetting('renderType', 'video');
                          if (settings.codec === 'png') updateSetting('codec', 'h264');
                          if (settings.fileName.startsWith('image-')) {
                            updateSetting('fileName', 'video-' + Date.now().toString().replaceAll('-', '') + '.mp4');
                          }
                        }
                      }}
                      className="w-full"
                    >
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="video">Video</TabsTrigger>
                        <TabsTrigger value="image">Image (frame 1)</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </div>

                {/* Project + tags metadata */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Project</Label>
                  <div className="col-span-3">
                    <Select
                      value={settings.projectId ?? 'none'}
                      onValueChange={(value) => updateSetting('projectId', value === 'none' ? undefined : value)}
                      disabled={projectsLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={projectsLoading ? 'Loading...' : 'No project'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No project</SelectItem>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label className="text-right pt-2">Tags</Label>
                  <div className="col-span-3">
                    <TagMultiSelect
                      selectedTags={settings.tags ?? []}
                      onTagsChange={(t) => updateSetting('tags', t)}
                      label=""
                      required={false}
                      showCreateNew={true}
                    />
                  </div>
                </div>

                {/* Configuration Mode Selector */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Config Mode</Label>
                  <div className="col-span-3">
                    <Tabs
                      value={settings.configMode}
                      onValueChange={(value) => updateSetting('configMode', value as ConfigMode)}
                      className="w-full"
                    >
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="preset" className="flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          Preset
                        </TabsTrigger>
                        <TabsTrigger value="custom" className="flex items-center gap-2">
                          <Settings2 className="h-4 w-4" />
                          Custom
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </div>

                {/* Preset Mode */}
                {settings.configMode === 'preset' && (
                  <>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="awsRenderPreset" className="text-right">
                        Render Preset
                      </Label>
                      <Select
                        value={settings.awsRenderPreset}
                        onValueChange={value =>
                          updateSetting('awsRenderPreset', value as typeof settings.awsRenderPreset)
                        }
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select preset" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(AWS_RENDER_CONFIGS).map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                              <div className="flex items-center gap-2">
                                {presetIcons[config.icon] || <Zap className="h-4 w-4" />}
                                <span>{config.name}</span>
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {Math.round(config.memory / 1024)}GB
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedConfig && (
                      <Card className="col-span-4">
                        <CardHeader className="pb-2">
                          <div className="flex items-center gap-2">
                            {presetIcons[selectedConfig.icon] || <Zap className="h-5 w-5" />}
                            <CardTitle className="text-lg">
                              {selectedConfig.name}
                            </CardTitle>
                            <Badge variant="secondary">
                              {selectedConfig.memory / 1024}GB • {selectedConfig.timeout}s
                            </Badge>
                          </div>
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

                    {/* Preset Concurrency Override */}
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
                              updateSetting('concurrencyOverride', CONCURRENCY_LIMITS.default);
                            }
                          }}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="auto" id="auto" />
                            <Label htmlFor="auto">Auto (Recommended)</Label>
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
                                  Math.min(CONCURRENCY_LIMITS.max, Math.max(CONCURRENCY_LIMITS.min, value || CONCURRENCY_LIMITS.min)),
                                );
                              }}
                              max={CONCURRENCY_LIMITS.max}
                              min={CONCURRENCY_LIMITS.min}
                              className="w-24"
                            />
                            <p className="text-xs text-muted-foreground">
                              Range: {CONCURRENCY_LIMITS.min} - {CONCURRENCY_LIMITS.max}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Custom Mode */}
                {settings.configMode === 'custom' && (
                  <div className="space-y-6">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Advanced Configuration</AlertTitle>
                      <AlertDescription>
                        Ensure you have deployed Lambda functions with matching configurations.
                        Mismatched settings will cause render failures.
                      </AlertDescription>
                    </Alert>

                    {/* Memory Selection */}
                    <div className="grid grid-cols-4 items-start gap-4">
                      <Label className="text-right pt-2 flex items-center gap-1">
                        <Cpu className="h-4 w-4" />
                        Memory
                      </Label>
                      <div className="col-span-3 space-y-2">
                        <Select
                          value={settings.customConfig.memory.toString()}
                          onValueChange={value => updateCustomConfig('memory', parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select memory" />
                          </SelectTrigger>
                          <SelectContent>
                            {LAMBDA_MEMORY_OPTIONS.map(option => (
                              <SelectItem key={option.value} value={option.value.toString()}>
                                <div className="flex flex-col">
                                  <span>{option.label}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {option.description}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Disk Size Selection */}
                    <div className="grid grid-cols-4 items-start gap-4">
                      <Label className="text-right pt-2 flex items-center gap-1">
                        <HardDrive className="h-4 w-4" />
                        Disk Size
                      </Label>
                      <div className="col-span-3">
                        <Select
                          value={settings.customConfig.disk.toString()}
                          onValueChange={value => updateCustomConfig('disk', parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select disk size" />
                          </SelectTrigger>
                          <SelectContent>
                            {LAMBDA_DISK_OPTIONS.map(option => (
                              <SelectItem key={option.value} value={option.value.toString()}>
                                <div className="flex flex-col">
                                  <span>{option.label}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {option.description}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Timeout Selection */}
                    <div className="grid grid-cols-4 items-start gap-4">
                      <Label className="text-right pt-2 flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Timeout
                      </Label>
                      <div className="col-span-3 space-y-2">
                        <Select
                          value={settings.customConfig.timeout.toString()}
                          onValueChange={value => {
                            const timeout = parseInt(value);
                            updateCustomConfig('timeout', timeout);
                            updateCustomConfig('timeoutInMilliseconds', timeout * 1000);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select timeout" />
                          </SelectTrigger>
                          <SelectContent>
                            {LAMBDA_TIMEOUT_OPTIONS.map(option => (
                              <SelectItem key={option.value} value={option.value.toString()}>
                                <div className="flex flex-col">
                                  <span>{option.label}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {option.description}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          AWS Lambda maximum is 15 minutes (900s)
                        </p>
                      </div>
                    </div>

                    <Separator />

                    {/* Concurrency */}
                    <div className="grid grid-cols-4 items-start gap-4">
                      <Label className="text-right pt-2 flex items-center gap-1">
                        <Layers className="h-4 w-4" />
                        Concurrency
                      </Label>
                      <div className="col-span-3 space-y-3">
                        <RadioGroup
                          value={settings.customConfig.concurrency === 'auto' ? 'auto' : 'custom'}
                          onValueChange={value => {
                            if (value === 'auto') {
                              updateCustomConfig('concurrency', 'auto');
                            } else {
                              updateCustomConfig('concurrency', CONCURRENCY_LIMITS.default);
                            }
                          }}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="auto" id="custom-auto" />
                            <Label htmlFor="custom-auto">Auto (Let Remotion decide)</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="custom" id="custom-manual" />
                            <Label htmlFor="custom-manual">Manual</Label>
                          </div>
                        </RadioGroup>

                        {settings.customConfig.concurrency !== 'auto' && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-4">
                              <Slider
                                value={[settings.customConfig.concurrency as number]}
                                onValueChange={([value]) => updateCustomConfig('concurrency', value)}
                                min={CONCURRENCY_LIMITS.min}
                                max={CONCURRENCY_LIMITS.max}
                                step={1}
                                className="flex-1"
                              />
                              <Input
                                type="number"
                                value={settings.customConfig.concurrency}
                                onChange={e => {
                                  const value = parseInt(e.target.value, 10);
                                  updateCustomConfig(
                                    'concurrency',
                                    Math.min(CONCURRENCY_LIMITS.max, Math.max(CONCURRENCY_LIMITS.min, value || CONCURRENCY_LIMITS.min)),
                                  );
                                }}
                                className="w-20"
                                min={CONCURRENCY_LIMITS.min}
                                max={CONCURRENCY_LIMITS.max}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Number of parallel Lambda invocations ({CONCURRENCY_LIMITS.min}-{CONCURRENCY_LIMITS.max})
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Frames Per Lambda */}
                    <div className="grid grid-cols-4 items-start gap-4">
                      <Label className="text-right pt-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="flex items-center gap-1 cursor-help">
                              Frames/Lambda
                              <Info className="h-3 w-3" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>How many frames each Lambda processes. Lower values = more parallelism but higher costs.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                      <div className="col-span-3 space-y-3">
                        <RadioGroup
                          value={settings.customConfig.framesPerLambda === 'auto' ? 'auto' : 'custom'}
                          onValueChange={value => {
                            if (value === 'auto') {
                              updateCustomConfig('framesPerLambda', 'auto');
                            } else {
                              updateCustomConfig('framesPerLambda', FRAMES_PER_LAMBDA_LIMITS.default);
                            }
                          }}
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="auto" id="fpl-auto" />
                            <Label htmlFor="fpl-auto">Auto</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="custom" id="fpl-manual" />
                            <Label htmlFor="fpl-manual">Manual</Label>
                          </div>
                        </RadioGroup>

                        {settings.customConfig.framesPerLambda !== 'auto' && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-4">
                              <Slider
                                value={[settings.customConfig.framesPerLambda as number]}
                                onValueChange={([value]) => updateCustomConfig('framesPerLambda', value)}
                                min={FRAMES_PER_LAMBDA_LIMITS.min}
                                max={FRAMES_PER_LAMBDA_LIMITS.max}
                                step={5}
                                className="flex-1"
                              />
                              <Input
                                type="number"
                                value={settings.customConfig.framesPerLambda}
                                onChange={e => {
                                  const value = parseInt(e.target.value, 10);
                                  updateCustomConfig(
                                    'framesPerLambda',
                                    Math.min(FRAMES_PER_LAMBDA_LIMITS.max, Math.max(FRAMES_PER_LAMBDA_LIMITS.min, value || FRAMES_PER_LAMBDA_LIMITS.min)),
                                  );
                                }}
                                className="w-20"
                                min={FRAMES_PER_LAMBDA_LIMITS.min}
                                max={FRAMES_PER_LAMBDA_LIMITS.max}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Range: {FRAMES_PER_LAMBDA_LIMITS.min}-{FRAMES_PER_LAMBDA_LIMITS.max} frames
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Custom Config Summary */}
                    <Card className="bg-muted/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Settings2 className="h-4 w-4" />
                          Configuration Summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Memory:</span>
                            <Badge variant="outline">{settings.customConfig.memory / 1024} GB</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Disk:</span>
                            <Badge variant="outline">{settings.customConfig.disk / 1024} GB</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Timeout:</span>
                            <Badge variant="outline">{settings.customConfig.timeout}s</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Concurrency:</span>
                            <Badge variant="outline">
                              {settings.customConfig.concurrency === 'auto' ? 'Auto' : settings.customConfig.concurrency}
                            </Badge>
                          </div>
                          <div className="flex justify-between col-span-2">
                            <span className="text-muted-foreground">Frames/Lambda:</span>
                            <Badge variant="outline">
                              {settings.customConfig.framesPerLambda === 'auto' ? 'Auto' : settings.customConfig.framesPerLambda}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Concurrency Calculator (works for both modes) */}
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
                        <Label htmlFor="helper-duration">Duration (s)</Label>
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
                      variant={safeConcurrency > CONCURRENCY_LIMITS.max ? 'destructive' : 'default'}
                      className="mt-4"
                    >
                      <HelpCircle className="h-4 w-4" />
                      <AlertTitle>
                        {safeConcurrency > CONCURRENCY_LIMITS.max ? 'Warning!' : 'Recommendation'}
                      </AlertTitle>
                      <AlertDescription className="flex items-center justify-between">
                        <span>
                          {safeConcurrency > CONCURRENCY_LIMITS.max
                            ? `High concurrency (${safeConcurrency}) needed. Render may fail.`
                            : `Recommended safe concurrency is ~${safeConcurrency}.`}
                        </span>
                        <Button
                          variant="link"
                          className="p-0 h-auto"
                          onClick={() => {
                            const value = Math.min(safeConcurrency, CONCURRENCY_LIMITS.max);
                            if (settings.configMode === 'preset') {
                              updateSetting('concurrencyOverride', value);
                            } else {
                              updateCustomConfig('concurrency', value);
                            }
                          }}
                        >
                          Apply
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <Separator />

                {/* Common AWS Settings */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="awsRegion" className="text-right">
                    AWS Region
                  </Label>
                  <div className="col-span-3">
                    <Select
                      value={settings.region ?? DEFAULT_REGION}
                      onValueChange={(value) => updateSetting('region', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                      <SelectContent>
                        {AWS_REGION_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label} — {option.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                      Enable file download (Not recommended)
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
                      {settings.renderType === 'still' ? (
                        <SelectItem value="png">PNG</SelectItem>
                      ) : (
                        <>
                          <SelectItem value="h264">H.264</SelectItem>
                          <SelectItem value="h265">H.265</SelectItem>
                          <SelectItem value="vp8">VP8</SelectItem>
                          <SelectItem value="vp9">VP9</SelectItem>
                        </>
                      )}
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
    </>
  );
}
