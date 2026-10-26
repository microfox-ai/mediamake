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
import { useRender, ConfigMode, RenderMethod } from './render-provider';
import {
  isBrowserRenderActive,
  mimeTypeForBrowserRender,
  requestDeviceSaveHandle,
} from './use-browser-render';
import { BrowserRenderProgressPanel } from './browser-render-progress';
import {
  LocalMediaRenderNotice,
  useLocalRefProblems,
} from './local-media-render-notice';
import { findLocalMediaRefs } from '@/lib/local-media/urls';
import {
  analyzeRenderLoad,
  planRender,
  type LambdaAccess,
} from '@/lib/render-routing/plan';
import { probeMediaSizes } from '@/lib/render-routing/sizes';
import { cn } from '@/lib/utils';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from '@/components/session-provider';
import { useProjectStore } from '@/components/editor_main/stores/project-store';
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
  Globe,
  Lock,
  Cloud,
  Download,
  Play,
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

/**
 * Local Render runs @remotion/renderer (bundler + headless Chrome) inside the
 * Next server, which only works when the app runs on your own machine.
 * Hidden in production builds unless explicitly enabled.
 */
const SHOW_LOCAL_RENDER =
  process.env.NODE_ENV !== 'production' ||
  process.env.NEXT_PUBLIC_ENABLE_LOCAL_RENDER === 'true';

const METHOD_LABELS: Record<RenderMethod, string> = {
  aws: 'AWS Lambda',
  browser: 'Browser',
  local: 'Local Render',
};

/** Marks the tab the render routing suggests. */
function RecommendedMark() {
  return (
    <span
      className="ml-1 h-1.5 w-1.5 rounded-full bg-emerald-500"
      title="Suggested for this timeline"
      aria-label="Suggested"
    />
  );
}

/** Still renders send either a frame index or a time in seconds, never both. */
function stillPositionPayload(settings: {
  stillPositionMode: 'time' | 'frame';
  frame?: number;
  frameTime?: number;
}): { frame: number } | { frameTime: number } {
  if (settings.stillPositionMode === 'frame') {
    return { frame: Math.max(0, Math.round(settings.frame ?? 0)) };
  }
  return { frameTime: settings.frameTime ?? 0 };
}

/** Video filenames always end with exactly one `.mp4`. */
function ensureSingleMp4(value: string): string {
  let base = value.replace(/\.mp4/gi, '');
  // Keep a partial ".mp4" from being left behind while the suffix is edited.
  base = base.replace(/\.mp$/i, '').replace(/\.m$/i, '').replace(/\.$/, '');
  return `${base}.mp4`;
}

function StillPositionFields({ idPrefix }: { idPrefix: string }) {
  const { settings, updateSetting } = useRender();
  const byFrame = settings.stillPositionMode === 'frame';

  return (
    <>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor={`${idPrefix}-capture`} className="text-right">
          Capture
        </Label>
        <Select
          value={settings.stillPositionMode}
          onValueChange={value =>
            updateSetting('stillPositionMode', value as 'time' | 'frame')
          }
        >
          <SelectTrigger id={`${idPrefix}-capture`} className="col-span-3">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="time">Time (seconds)</SelectItem>
            <SelectItem value="frame">Frame number</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {byFrame ? (
        <div className="grid grid-cols-4 items-start gap-4">
          <Label htmlFor={`${idPrefix}-frame`} className="text-right pt-2">
            Frame
          </Label>
          <div className="col-span-3 space-y-1">
            <Input
              id={`${idPrefix}-frame`}
              type="number"
              step="1"
              min="0"
              value={settings.frame ?? 0}
              onChange={e =>
                updateSetting(
                  'frame',
                  Math.max(0, parseInt(e.target.value, 10) || 0),
                )
              }
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">
              0 is the first frame.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor={`${idPrefix}-time`} className="text-right">
            Frame Time (seconds)
          </Label>
          <Input
            id={`${idPrefix}-time`}
            type="number"
            step="0.1"
            min="0"
            value={settings.frameTime || 0}
            onChange={e =>
              updateSetting('frameTime', parseFloat(e.target.value) || 0)
            }
            className="col-span-3"
            placeholder="0"
          />
        </div>
      )}
    </>
  );
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
    browserRender: browserRenderController,
  } = useRender();

  const { state: browserRender, startBrowserRender, reset: resetBrowserRender } =
    browserRenderController;
  const browserActive = isBrowserRenderActive(browserRender.phase);

  // Files on this computer are only reachable from this browser: AWS is off
  // while the props reference any of them.
  const localRefs = useMemo(
    () => findLocalMediaRefs(settings.inputProps),
    [settings.inputProps],
  );
  const localProblems = useLocalRefProblems(localRefs);

  // Lambda is only for API keys with render access; null while loading.
  const [lambdaAccess, setLambdaAccess] = useState<LambdaAccess | null>(null);
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    fetch('/api/remotion/render/plan')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!cancelled) setLambdaAccess(data?.lambda ?? { allowed: false });
      })
      .catch(() => {
        if (!cancelled) setLambdaAccess({ allowed: false });
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, session?.clientId]);

  // File sizes of the timeline's video and audio, for the suggestion below.
  // null while they are being looked up.
  const mediaSrcs = useMemo(
    () =>
      analyzeRenderLoad(settings.inputProps, settings.renderType)
        .media.map(m => m.src)
        .join('\n'),
    [settings.inputProps, settings.renderType],
  );
  const [mediaSizes, setMediaSizes] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setMediaSizes(null);
    const srcs = mediaSrcs ? mediaSrcs.split('\n') : [];
    probeMediaSizes(srcs.map(src => ({ src })))
      .catch(() => ({}))
      .then(sizes => {
        if (!cancelled) setMediaSizes(sizes);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, mediaSrcs]);

  // A suggestion, never a lock: lots of footage or very large files suggest
  // local, light media suggests Lambda. The user picks.
  const renderPlan = useMemo(
    () =>
      planRender({
        inputProps: settings.inputProps,
        renderType: settings.renderType,
        lambda: lambdaAccess ?? { allowed: true },
        sizes: mediaSizes ?? {},
      }),
    [settings.inputProps, settings.renderType, lambdaAccess, mediaSizes],
  );
  const localMethod: RenderMethod = SHOW_LOCAL_RENDER ? 'local' : 'browser';
  const recommendedMethod: RenderMethod =
    renderPlan.target === 'lambda' ? 'aws' : localMethod;
  const lambdaDenied = lambdaAccess !== null && !lambdaAccess.allowed;
  const awsBlocked = localRefs.length > 0 || lambdaDenied;

  // Pick the suggested method once per opening, after access and sizes are
  // known. Later changes are the user's.
  const routedRef = useRef(false);
  useEffect(() => {
    if (!isOpen) {
      routedRef.current = false;
      return;
    }
    if (routedRef.current || lambdaAccess === null || mediaSizes === null || browserActive) return;
    routedRef.current = true;
    setRenderMethod(recommendedMethod);
  }, [isOpen, lambdaAccess, mediaSizes, browserActive, recommendedMethod, setRenderMethod]);

  useEffect(() => {
    if (awsBlocked && renderMethod === 'aws') setRenderMethod(localMethod);
    else if (!SHOW_LOCAL_RENDER && renderMethod === 'local') setRenderMethod('browser');
  }, [awsBlocked, renderMethod, setRenderMethod, localMethod]);

  const [safeConcurrency, setSafeConcurrency] = useState<number | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [projects, setProjects] = useState<{ id: string; displayName: string }[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const currentProjectName = useProjectStore((s) => s.currentProject?.displayName);
  const seededProjectRef = useRef<string | null>(null);

  // Quota-exhausted modal for 403/429 responses from /api/remotion/render
  const { setQuotaError, dialog: quotaDialog } = useQuotaExhaustedDialog();

  const updateVideoFileName = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const caret = input.selectionStart ?? input.value.length;
    const next = ensureSingleMp4(input.value);
    const nextCaret = Math.min(caret, Math.max(0, next.length - '.mp4'.length));
    if (next === settings.fileName) {
      input.value = next;
      input.setSelectionRange(nextCaret, nextCaret);
      return;
    }
    updateSetting('fileName', next);
    const inputId = input.id;
    requestAnimationFrame(() => {
      const el = document.getElementById(inputId);
      if (el instanceof HTMLInputElement) {
        el.setSelectionRange(nextCaret, nextCaret);
      }
    });
  };

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

  // The editor's loaded project is the default. Re-apply it each time the
  // dialog opens so a later project switch is picked up, without overwriting
  // a choice the user makes while the dialog stays open.
  useEffect(() => {
    if (!isOpen) {
      seededProjectRef.current = null;
      return;
    }
    if (!currentProjectId || seededProjectRef.current === currentProjectId) return;
    seededProjectRef.current = currentProjectId;
    updateSetting('projectId', currentProjectId);
  }, [isOpen, currentProjectId, updateSetting]);

  const projectOptions = useMemo(() => {
    if (!currentProjectId || projects.some((p) => p.id === currentProjectId)) {
      return projects;
    }
    return [
      {
        id: currentProjectId,
        displayName: currentProjectName || 'Current project',
      },
      ...projects,
    ];
  }, [projects, currentProjectId, currentProjectName]);

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
    // Browser renders report progress through the shared controller (modal
    // panel + floating dock), so they don't hold the modal's loading state.
    if (renderMethod === 'browser') {
      await handleBrowserRender();
      return;
    }

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

  const handleBrowserRender = async () => {
    if (browserActive) return;
    const toDevice = settings.browserDestination === 'device';
    if (!toDevice && !session?.clientId) {
      toast.error('Sign in to upload renders — or choose "This computer" to save it locally.');
      return;
    }
    if (localProblems.missing + localProblems.unknown > 0) {
      toast.error('Some local files in this timeline can’t be found. Relink them in the Media library first.');
      return;
    }
    if (localProblems.needsAccess > 0) {
      toast.error('Some local files need access again — click “Reconnect access” above.');
      return;
    }

    let parsedInputProps;
    try {
      parsedInputProps = JSON.parse(settings.inputProps);
    } catch (error) {
      toast.error('Invalid JSON in input props');
      return;
    }

    const isStill = settings.renderType === 'still';
    const ext = isStill ? settings.browserImageFormat : settings.browserContainer;
    const fileName = isStill
      ? settings.fileName.includes('.')
        ? settings.fileName
        : `${settings.fileName}.${ext}`
      : settings.browserContainer === 'webm'
        ? ensureSingleMp4(settings.fileName).replace(/\.mp4$/i, '.webm')
        : ensureSingleMp4(settings.fileName);

    // The save picker needs the click's user activation, so ask for the
    // destination now — before the render, not after it.
    let saveHandle: FileSystemFileHandle | null = null;
    if (toDevice) {
      try {
        saveHandle = await requestDeviceSaveHandle(
          fileName,
          mimeTypeForBrowserRender(
            isStill ? 'still' : 'video',
            settings.browserContainer,
            settings.browserImageFormat,
          ),
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        saveHandle = null; // fall back to a download
      }
    }

    try {
      const result = await startBrowserRender({
        inputProps: parsedInputProps,
        compositionId: settings.composition || 'DataMotion',
        renderType: isStill ? 'still' : 'video',
        container: settings.browserContainer,
        imageFormat: settings.browserImageFormat,
        fileName,
        ...stillPositionPayload(settings),
        projectId: settings.projectId,
        tags: settings.tags,
        clientId: session?.clientId ?? '',
        destination: toDevice ? 'device' : 'cloud',
        saveHandle,
      });

      const what = isStill ? 'Image' : 'Video';
      if (result.savedToDevice) {
        toast.success(`${what} saved to your computer`, { description: fileName });
      } else {
        toast.success(`${what} rendered and uploaded`, {
          description: `Find it in ${isStill ? 'Image' : 'Video'} Render History.`,
          action: result.url
            ? { label: 'Open', onClick: () => window.open(result.url!, '_blank', 'noopener') }
            : undefined,
        });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        toast.info('Browser render cancelled');
      } else {
        console.error('Browser render error:', error);
        toast.error(error instanceof Error ? error.message : 'Browser render failed');
      }
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
      ...(settings.renderType === 'still' ? stillPositionPayload(settings) : {}),
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
        ...stillPositionPayload(settings),
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

        <div className="flex-1 overflow-y-auto space-y-3">
          {localRefs.length > 0 && (
            <LocalMediaRenderNotice
              refs={localRefs}
              inputProps={settings.inputProps}
              onUseCloudCopies={(next) => {
                updateSetting('inputProps', next);
                setRenderMethod(lambdaDenied ? localMethod : 'aws');
              }}
            />
          )}
          <Tabs
            value={renderMethod}
            onValueChange={value => setRenderMethod(value as RenderMethod)}
            className="w-full"
          >
            <TabsList
              className={cn(
                'grid w-full',
                SHOW_LOCAL_RENDER ? 'grid-cols-3' : 'grid-cols-2',
              )}
            >
              <TabsTrigger
                value="aws"
                disabled={awsBlocked}
                className="flex items-center gap-1"
                title={
                  localRefs.length > 0
                    ? 'Unavailable: this timeline uses files from your computer'
                    : lambdaDenied
                      ? lambdaAccess?.reason
                      : undefined
                }
              >
                {awsBlocked && <Lock className="h-3.5 w-3.5" />}
                AWS Lambda
                {recommendedMethod === 'aws' && <RecommendedMark />}
              </TabsTrigger>
              <TabsTrigger value="browser" className="flex items-center gap-1">
                <Globe className="h-4 w-4" />
                Browser
                {browserActive ? (
                  <span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                ) : (
                  recommendedMethod === 'browser' && <RecommendedMark />
                )}
              </TabsTrigger>
              {SHOW_LOCAL_RENDER && (
                <TabsTrigger value="local" className="flex items-center gap-1">
                  Local Render
                  {recommendedMethod === 'local' && <RecommendedMark />}
                </TabsTrigger>
              )}
            </TabsList>
            {lambdaAccess !== null && (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  {mediaSizes === null
                    ? 'Checking the media to suggest where to render…'
                    : renderPlan.reason}
                  {mediaSizes !== null && renderMethod !== recommendedMethod && !browserActive && (
                    <>
                      {' '}
                      <button
                        type="button"
                        className="underline underline-offset-2 hover:text-foreground"
                        onClick={() => setRenderMethod(recommendedMethod)}
                      >
                        Use {METHOD_LABELS[recommendedMethod]}
                      </button>
                    </>
                  )}
                </span>
              </p>
            )}

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
                          } else {
                            updateSetting('fileName', ensureSingleMp4(settings.fileName));
                          }
                        }
                      }}
                      className="w-full"
                    >
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="video">Video</TabsTrigger>
                        <TabsTrigger value="image">Image</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </div>

                {settings.renderType === 'still' && (
                  <StillPositionFields idPrefix="aws" />
                )}

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
                        {projectOptions.map((p) => (
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
                      onChange={e =>
                        settings.renderType === 'still'
                          ? updateSetting('fileName', e.target.value)
                          : updateVideoFileName(e)
                      }
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

            <TabsContent value="browser" className="space-y-4">
              {browserRender.phase !== 'idle' && (
                <div className="pt-4">
                  <BrowserRenderProgressPanel
                    controller={browserRenderController}
                    onDismiss={resetBrowserRender}
                  />
                </div>
              )}
              <fieldset
                disabled={browserActive}
                className="flex flex-col gap-4 py-4 transition-opacity disabled:opacity-60"
              >
                {browserRender.phase === 'idle' && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Renders on this device</AlertTitle>
                    <AlertDescription>
                      Rendered with WebCodecs in this tab — no Lambda cost. You can
                      pause it, close this dialog and keep editing; progress stays in
                      the corner. Keep the tab open until it finishes. Requires a
                      Chromium-based browser.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Render target (video vs image) */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Render</Label>
                  <div className="col-span-3">
                    <Tabs
                      value={settings.renderType === 'still' ? 'image' : 'video'}
                      onValueChange={(value) => {
                        if (value === 'image') {
                          updateSetting('renderType', 'still');
                          if (settings.fileName.startsWith('video-')) {
                            updateSetting('fileName', 'image-' + Date.now().toString().replaceAll('-', ''));
                          }
                        } else {
                          updateSetting('renderType', 'video');
                          if (settings.fileName.startsWith('image-')) {
                            updateSetting('fileName', 'video-' + Date.now().toString().replaceAll('-', '') + '.mp4');
                          } else {
                            updateSetting('fileName', ensureSingleMp4(settings.fileName));
                          }
                        }
                      }}
                      className="w-full"
                    >
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="video">Video</TabsTrigger>
                        <TabsTrigger value="image">Image</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                </div>

                {/* Destination */}
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label className="text-right pt-2">Save to</Label>
                  <div className="col-span-3">
                    <div
                      role="radiogroup"
                      aria-label="Save to"
                      className="grid grid-cols-2 gap-2"
                    >
                      {([
                        {
                          value: 'cloud',
                          icon: Cloud,
                          title: 'Cloud storage',
                          hint: 'Shareable link + render history',
                        },
                        {
                          value: 'device',
                          icon: Download,
                          title: 'This computer',
                          hint: 'Saved as a file, nothing uploaded',
                        },
                      ] as const).map((option) => {
                        const selected = settings.browserDestination === option.value;
                        const Icon = option.icon;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => updateSetting('browserDestination', option.value)}
                            className={cn(
                              'flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                              selected
                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                : 'hover:bg-muted/50',
                            )}
                          >
                            <Icon
                              className={cn(
                                'mt-0.5 h-4 w-4 shrink-0',
                                selected ? 'text-primary' : 'text-muted-foreground',
                              )}
                            />
                            <span className="min-w-0">
                              <span className="block text-sm font-medium">{option.title}</span>
                              <span className="block text-xs text-muted-foreground">
                                {option.hint}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Project + tags metadata (cloud renders only) */}
                {settings.browserDestination === 'cloud' && (
                <>
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
                        {projectOptions.map((p) => (
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
                </>
                )}

                {settings.renderType !== 'still' ? (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Format</Label>
                    <Select
                      value={settings.browserContainer}
                      onValueChange={value =>
                        updateSetting('browserContainer', value as 'mp4' | 'webm')
                      }
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mp4">MP4 (H.264 + AAC)</SelectItem>
                        <SelectItem value="webm">WebM (VP9 + Opus)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">Format</Label>
                      <Select
                        value={settings.browserImageFormat}
                        onValueChange={value =>
                          updateSetting('browserImageFormat', value as 'png' | 'jpeg')
                        }
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="png">PNG</SelectItem>
                          <SelectItem value="jpeg">JPEG</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <StillPositionFields idPrefix="browser" />
                  </>
                )}

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="browserFileName" className="text-right">
                    File Name
                  </Label>
                  <Input
                    id="browserFileName"
                    value={settings.fileName}
                    onChange={e =>
                      settings.renderType === 'still'
                        ? updateSetting('fileName', e.target.value)
                        : updateVideoFileName(e)
                    }
                    className="col-span-3"
                    placeholder={settings.renderType === 'still' ? 'image' : 'video.mp4'}
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
                        id="browserInputProps"
                        value={settings.inputProps}
                        onChange={e => updateSetting('inputProps', e.target.value)}
                        className="min-h-[120px] font-mono text-sm max-h-[200px] overflow-y-auto"
                        placeholder="Enter JSON input props..."
                      />
                    )}
                  </div>
                </div>

              </fieldset>
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
                  <StillPositionFields idPrefix="local" />
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
                    onChange={e =>
                      settings.renderType === 'still'
                        ? updateSetting('fileName', e.target.value)
                        : updateVideoFileName(e)
                    }
                    className="col-span-3"
                    placeholder={settings.renderType === 'still' ? 'image' : 'video.mp4'}
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

        <DialogFooter className="items-center">
          {renderMethod === 'browser' && browserActive ? (
            <>
              <p className="mr-auto hidden text-xs text-muted-foreground sm:block">
                You can close this — the render keeps going in the corner.
              </p>
              <Button variant="outline" onClick={onClose}>
                Run in background
              </Button>
              <Button disabled>
                {browserRender.paused ? 'Paused' : 'Rendering…'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                {renderMethod === 'browser' && browserRender.phase === 'done' ? 'Close' : 'Cancel'}
              </Button>
              <Button
                onClick={handleRender}
                disabled={isLoading || (renderMethod === 'aws' && awsBlocked)}
              >
                {isLoading ? (
                  'Starting Render...'
                ) : renderMethod === 'browser' ? (
                  <>
                    <Play className="mr-1.5 h-4 w-4" />
                    {browserRender.phase === 'done' ||
                    browserRender.phase === 'error' ||
                    browserRender.phase === 'cancelled'
                      ? 'Render again'
                      : 'Start Render'}
                  </>
                ) : (
                  'Start Render'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
