"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { MAX_PPS } from "./timeline-layout";

export interface TimelineViewportValue {
  totalDuration: number;
  containerWidth: number;
  pixelsPerSecond: number;
  setPixelsPerSecond: (v: number | ((p: number) => number)) => void;
  minPps: number;
  totalWidth: number;
  secToPx: (s: number) => number;
  pxToSec: (px: number) => number;
  ppsToSlider: (pps: number) => number;
  sliderToPps: (v: number) => number;
  fitToView: () => void;
  /** Multiply current zoom (e.g. 1.3 zoom in, 1/1.3 zoom out). */
  zoomByFactor: (factor: number) => void;
  handleWheel: (e: React.WheelEvent) => void;
  trackRightRef: RefObject<HTMLDivElement | null>;
  scrollRef: RefObject<HTMLDivElement | null>;
  labelScrollRef: RefObject<HTMLDivElement | null>;
  rulerInnerRef: RefObject<HTMLDivElement | null>;
  onScroll: () => void;
  rulerTicks: Array<{ sec: number; major: boolean }>;
}

const TimelineViewportContext = createContext<TimelineViewportValue | null>(
  null,
);

export function useTimelineViewport(): TimelineViewportValue {
  const ctx = useContext(TimelineViewportContext);
  if (!ctx) {
    throw new Error(
      "useTimelineViewport must be used within TimelineViewportProvider",
    );
  }
  return ctx;
}

export function useOptionalTimelineViewport(): TimelineViewportValue | null {
  return useContext(TimelineViewportContext);
}

export function TimelineViewportProvider({
  totalDuration,
  children,
}: {
  totalDuration: number;
  children: ReactNode;
}) {
  const [containerWidth, setContainerWidth] = useState(800);
  const trackRightRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const labelScrollRef = useRef<HTMLDivElement>(null);
  const rulerInnerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = trackRightRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 800;
      setContainerWidth(Math.max(1, w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const minPps = useMemo(
    () => Math.max(0.05, containerWidth / Math.max(1, totalDuration)),
    [containerWidth, totalDuration],
  );

  /** Default zoom slider position (log scale from fit → max). */
  const DEFAULT_ZOOM_SLIDER = 25;

  const sliderToPps = useCallback(
    (v: number) =>
      Math.exp(
        Math.log(minPps) + (v / 100) * (Math.log(MAX_PPS) - Math.log(minPps)),
      ),
    [minPps],
  );

  // null = still on default 25% zoom (recomputed when minPps changes)
  const [pixelsPerSecond, setPixelsPerSecondState] = useState<number | null>(
    null,
  );

  const resolvedPps =
    pixelsPerSecond === null
      ? Math.min(MAX_PPS, Math.max(minPps, sliderToPps(DEFAULT_ZOOM_SLIDER)))
      : Math.min(MAX_PPS, Math.max(minPps, pixelsPerSecond));

  const setPixelsPerSecond = useCallback(
    (v: number | ((p: number) => number)) => {
      setPixelsPerSecondState((prev) => {
        const current =
          prev === null
            ? Math.min(
                MAX_PPS,
                Math.max(minPps, sliderToPps(DEFAULT_ZOOM_SLIDER)),
              )
            : prev;
        const next = typeof v === "function" ? v(current) : v;
        return Math.min(MAX_PPS, Math.max(minPps, next));
      });
    },
    [minPps, sliderToPps],
  );

  const totalWidth = Math.max(containerWidth, totalDuration * resolvedPps);

  const secToPx = useCallback((s: number) => s * resolvedPps, [resolvedPps]);
  const pxToSec = useCallback((px: number) => px / resolvedPps, [resolvedPps]);

  const ppsToSlider = useCallback(
    (pps: number) => {
      if (minPps >= MAX_PPS) return 0;
      const t =
        (Math.log(pps) - Math.log(minPps)) /
        (Math.log(MAX_PPS) - Math.log(minPps));
      return Math.round(Math.min(100, Math.max(0, t * 100)));
    },
    [minPps],
  );

  const fitToView = useCallback(() => {
    setPixelsPerSecondState(minPps);
  }, [minPps]);

  const zoomByFactor = useCallback(
    (factor: number) => {
      setPixelsPerSecond((p) => p * factor);
    },
    [setPixelsPerSecond],
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        zoomByFactor(e.deltaY < 0 ? 1.2 : 1 / 1.2);
      }
    },
    [zoomByFactor],
  );

  const onScroll = useCallback(() => {
    const sl = scrollRef.current?.scrollLeft ?? 0;
    const st = scrollRef.current?.scrollTop ?? 0;
    if (rulerInnerRef.current) {
      rulerInnerRef.current.style.transform = `translateX(${-sl}px)`;
    }
    if (labelScrollRef.current) {
      labelScrollRef.current.scrollTop = st;
    }
  }, []);

  const rulerTicks = useMemo(() => {
    const pps = resolvedPps;
    let step = 1;
    if (pps < 4) step = 60;
    else if (pps < 10) step = 30;
    else if (pps < 25) step = 10;
    else if (pps < 60) step = 5;
    else if (pps < 120) step = 2;
    else if (pps >= 400) step = 0.1;
    else if (pps >= 200) step = 0.5;

    const ticks: Array<{ sec: number; major: boolean }> = [];
    const majorEvery = step >= 10 ? step : step * 5;
    for (let s = 0; s <= totalDuration + step; s += step) {
      const rounded = Math.round(s / step) * step;
      ticks.push({
        sec: rounded,
        major: Math.abs(rounded % majorEvery) < step * 0.01 || rounded === 0,
      });
    }
    return ticks;
  }, [resolvedPps, totalDuration]);

  const value = useMemo<TimelineViewportValue>(
    () => ({
      totalDuration,
      containerWidth,
      pixelsPerSecond: resolvedPps,
      setPixelsPerSecond,
      minPps,
      totalWidth,
      secToPx,
      pxToSec,
      ppsToSlider,
      sliderToPps,
      fitToView,
      zoomByFactor,
      handleWheel,
      trackRightRef,
      scrollRef,
      labelScrollRef,
      rulerInnerRef,
      onScroll,
      rulerTicks,
    }),
    [
      totalDuration,
      containerWidth,
      resolvedPps,
      setPixelsPerSecond,
      minPps,
      totalWidth,
      secToPx,
      pxToSec,
      ppsToSlider,
      sliderToPps,
      fitToView,
      zoomByFactor,
      handleWheel,
      onScroll,
      rulerTicks,
    ],
  );

  return (
    <TimelineViewportContext.Provider value={value}>
      {children}
    </TimelineViewportContext.Provider>
  );
}
