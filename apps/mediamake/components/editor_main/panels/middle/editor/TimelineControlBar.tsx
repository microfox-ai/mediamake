"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Code, Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, Rocket, Loader2, CheckIcon } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { calculateCompositionLayoutMetadata } from "@microfox/remotion";
import type { InputCompositionProps } from "@microfox/remotion";
import type { PlayerRef } from "@remotion/player";
import { interpolate } from "remotion";
import { useRender } from "@/components/editor/player/render-provider";
import { RenderModal } from "@/components/editor/player/render-modal";

interface TimelineControlBarProps {
  generatedOutput: InputCompositionProps | null;
  calculatedMetadata: Awaited<ReturnType<typeof calculateCompositionLayoutMetadata>> | null;
  playerRef: React.RefObject<PlayerRef | null>;
  loop: boolean;
  onLoopChange: (loop: boolean) => void;
  onShowJson: () => void;
  isGenerating: boolean;
}

const formatTime = (frame: number, fps: number): string => {
  const hours = Math.floor(frame / fps / 3600);
  const remainingMinutes = frame - hours * fps * 3600;
  const minutes = Math.floor(remainingMinutes / 60 / fps);
  const remainingSec = frame - hours * fps * 3600 - minutes * fps * 60;
  const seconds = Math.floor(remainingSec / fps);
  const frameAfterSec = Math.round(frame % fps);

  const hoursStr = String(hours);
  const minutesStr = String(minutes).padStart(2, '0');
  const secondsStr = String(seconds).padStart(2, '0');
  const frameStr = String(frameAfterSec).padStart(2, '0');

  if (hours > 0) {
    return `${hoursStr}:${minutesStr}:${secondsStr}.${frameStr}`;
  }

  return `${minutesStr}:${secondsStr}.${frameStr}`;
};

export function TimelineControlBar({
  generatedOutput,
  calculatedMetadata,
  playerRef,
  loop,
  onLoopChange,
  isGenerating,
  onShowJson,
}: TimelineControlBarProps) {
  const [playing, setPlaying] = useState(false);
  const [frame, setFrame] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [supportsFullscreen, setSupportsFullscreen] = useState(false);
  const seekBarRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [wasPlaying, setWasPlaying] = useState(false);

  const { isModalOpen, openModal, closeModal, updateSetting } = useRender();

  const durationInFrames = calculatedMetadata?.durationInFrames ?? 0;
  const fps = calculatedMetadata?.fps ?? 30;

  // Check fullscreen support
  useEffect(() => {
    if (typeof document !== 'undefined') {
      setSupportsFullscreen(
        document.fullscreenEnabled ||
        // @ts-expect-error Types not defined
        document.webkitFullscreenEnabled ||
        false
      );
    }
  }, []);

  // Play/Pause state
  useEffect(() => {
    const { current } = playerRef;
    if (!current) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    setPlaying(current.isPlaying() ?? false);
    current.addEventListener('play', onPlay);
    current.addEventListener('pause', onPause);

    return () => {
      current.removeEventListener('play', onPlay);
      current.removeEventListener('pause', onPause);
    };
  }, [playerRef]);

  // Frame updates
  useEffect(() => {
    const { current } = playerRef;
    if (!current) return;

    const onFrameUpdate = () => {
      setFrame(current.getCurrentFrame());
    };

    current.addEventListener('frameupdate', onFrameUpdate);

    return () => {
      current.removeEventListener('frameupdate', onFrameUpdate);
    };
  }, [playerRef]);

  // Volume state
  useEffect(() => {
    const { current } = playerRef;
    if (!current) return;

    const onVolumeChange = () => {
      setVolume(current.getVolume());
    };

    const onMuteChange = () => {
      setMuted(current.isMuted());
    };

    setVolume(current.getVolume() ?? 1);
    setMuted(current.isMuted() ?? false);

    current.addEventListener('volumechange', onVolumeChange);
    current.addEventListener('mutechange', onMuteChange);

    return () => {
      current.removeEventListener('volumechange', onVolumeChange);
      current.removeEventListener('mutechange', onMuteChange);
    };
  }, [playerRef]);

  // Fullscreen state
  useEffect(() => {
    const { current } = playerRef;
    if (!current) return;

    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement !== null);
    };

    current.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      current.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [playerRef]);

  const handlePlayPause = useCallback(() => {
    playerRef.current?.toggle();
  }, [playerRef]);

  const handleMute = useCallback(() => {
    if (!playerRef.current) return;
    if (playerRef.current.isMuted()) {
      playerRef.current.unmute();
    } else {
      playerRef.current.mute();
    }
  }, [playerRef]);

  const handleVolumeChange = useCallback((value: number[]) => {
    if (!playerRef.current) return;
    const newVolume = value[0];
    if (newVolume > 0 && playerRef.current.isMuted()) {
      playerRef.current.unmute();
    }
    playerRef.current.setVolume(newVolume);
  }, [playerRef]);

  const handleFullscreen = useCallback(() => {
    if (!playerRef.current) return;
    if (isFullscreen) {
      playerRef.current.exitFullscreen();
    } else {
      playerRef.current.requestFullscreen();
    }
  }, [isFullscreen, playerRef]);

  const handleLoop = useCallback(() => {
    onLoopChange(!loop);
  }, [loop, onLoopChange]);

  const handleRenderClick = useCallback(() => {
    if (generatedOutput) {
      // Sync render settings with current composition
      updateSetting('inputProps', JSON.stringify(generatedOutput, null, 2));
      updateSetting('composition', 'DataMotion');
    }
    openModal();
  }, [generatedOutput, updateSetting, openModal]);

  // Seek bar handlers
  const getFrameFromX = useCallback((clientX: number, durationInFrames: number, width: number) => {
    const pos = clientX;
    const frame = Math.round(
      interpolate(pos, [0, width], [0, Math.max(durationInFrames - 1, 0)], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }),
    );
    return frame;
  }, []);

  const handleSeekBarPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !playerRef.current || !seekBarRef.current) return;

    const rect = seekBarRef.current.getBoundingClientRect();
    const newFrame = getFrameFromX(
      e.clientX - rect.left,
      durationInFrames,
      rect.width,
    );

    playerRef.current.pause();
    playerRef.current.seekTo(newFrame);
    setDragging(true);
    setWasPlaying(playing);
  }, [durationInFrames, playerRef, playing, getFrameFromX]);

  const handleSeekBarPointerMove = useCallback((e: PointerEvent) => {
    if (!dragging || !playerRef.current || !seekBarRef.current) return;

    const rect = seekBarRef.current.getBoundingClientRect();
    const newFrame = getFrameFromX(
      e.clientX - rect.left,
      durationInFrames,
      rect.width,
    );

    playerRef.current.seekTo(newFrame);
  }, [dragging, durationInFrames, playerRef, getFrameFromX]);

  const handleSeekBarPointerUp = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    if (!playerRef.current) return;

    if (wasPlaying) {
      playerRef.current.play();
    } else {
      playerRef.current.pause();
    }
  }, [dragging, wasPlaying, playerRef]);

  useEffect(() => {
    if (!dragging) return;

    const body = document.body;
    body.addEventListener('pointermove', handleSeekBarPointerMove);
    body.addEventListener('pointerup', handleSeekBarPointerUp);

    return () => {
      body.removeEventListener('pointermove', handleSeekBarPointerMove);
      body.removeEventListener('pointerup', handleSeekBarPointerUp);
    };
  }, [dragging, handleSeekBarPointerMove, handleSeekBarPointerUp]);

  const seekBarProgress = useMemo(() => {
    if (durationInFrames === 0) return 0;
    return (frame / Math.max(1, durationInFrames - 1)) * 100;
  }, [frame, durationInFrames]);

  if (!calculatedMetadata) {
    return (
      <div className="border-t px-4 py-3 bg-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onShowJson}
              disabled={!generatedOutput}
            >
              <Code className="h-4 w-4 mr-2" />
              JSON
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t px-2 py-1 bg-background">
      <div className="flex items-center gap-2">
        {/* Play/Pause Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handlePlayPause}
          disabled={!calculatedMetadata}
          className="shrink-0"
        >
          {playing ? (
            <>
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Play
            </>
          )}
        </Button>
        <div className="flex flex-1 flex-col items-start gap-1 mx-2">
          <div className="flex w-full items-center gap-2">

            {/* Seek Bar */}
            <div
              ref={seekBarRef}
              onPointerDown={handleSeekBarPointerDown}
              className="flex-1 w-full relative h-5 cursor-pointer touch-none"
            >
              <div className="absolute inset-0 flex items-center">
                <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${seekBarProgress}%` }}
                  />
                </div>
              </div>
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full shadow-md transition-all"
                style={{
                  left: `calc(${seekBarProgress}% - 6px)`,
                  opacity: dragging ? 1 : 0.7,
                }}
              />
            </div>
          </div>
          <div className="flex w-full items-center justify-between gap-2">
            {/* Time Display */}
            <div className="text-xs font-mono text-muted-foreground">
              {formatTime(frame, fps)} / {formatTime(durationInFrames, fps)}
            </div>

            {/* Metadata Display */}
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              {calculatedMetadata.width} × {calculatedMetadata.height} @ {fps}fps
              {durationInFrames > 0 && (
                <> • {Math.round(durationInFrames / fps)}s</>
              )}
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />
              ) : (
                <CheckIcon className="h-4 w-4 text-green-500" />
              )}
            </div>

          </div>
        </div>

        {/* Volume Control */}
        {/* <div className="flex items-center gap-2 min-w-[120px]">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMute}
            className="h-8 w-8 p-0"
          >
            {muted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          <Slider
            value={[muted ? 0 : volume]}
            onValueChange={handleVolumeChange}
            min={0}
            max={1}
            step={0.01}
            className="flex-1"
          />
        </div> */}

        {/* Loop Button */}
        {/* <Button
          variant={loop ? "default" : "outline"}
          size="sm"
          onClick={handleLoop}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Loop
        </Button> */}

        {/* Fullscreen Button */}
        {supportsFullscreen && (
          <Button
            variant="outline"
            size="icon"
            onClick={handleFullscreen}
          >
            <Maximize className="h-4 w-4" />
          </Button>
        )}

        {/* Render Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleRenderClick}
          disabled={!generatedOutput}
          title="Render Video"
        >
          <Rocket className="h-4 w-4" />
        </Button>

        {/* JSON Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={onShowJson}
          disabled={!generatedOutput}
        >
          <Code className="h-4 w-4" />
        </Button>
      </div>

      {/* Render Modal */}
      <RenderModal
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </div>
  );
}
