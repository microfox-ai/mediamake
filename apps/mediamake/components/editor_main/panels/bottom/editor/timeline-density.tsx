"use client";

import { createContext, useContext, type ReactNode } from "react";
import { COMPACT_ROW_HEIGHT, ROW_HEIGHT } from "./timeline-layout";

export interface TimelineDensity {
  /** Title-only rows and shorter range blocks. */
  compact: boolean;
  showWaveforms: boolean;
  toggleCompact: () => void;
  toggleWaveforms: () => void;
}

const noop = () => {};

const TimelineDensityContext = createContext<TimelineDensity>({
  compact: false,
  showWaveforms: true,
  toggleCompact: noop,
  toggleWaveforms: noop,
});

export function TimelineDensityProvider({
  value,
  children,
}: {
  value: TimelineDensity;
  children: ReactNode;
}) {
  return (
    <TimelineDensityContext.Provider value={value}>{children}</TimelineDensityContext.Provider>
  );
}

export function useTimelineDensity(): TimelineDensity {
  return useContext(TimelineDensityContext);
}

export function rowHeightFor(compact: boolean): number {
  return compact ? COMPACT_ROW_HEIGHT : ROW_HEIGHT;
}

/** Narrow blocks are square. Expanded blocks keep their usual corner. */
export function blockCornerClass(
  compact: boolean,
  expanded: "rounded" | "rounded-md" = "rounded",
): string {
  return compact ? "rounded-none" : expanded;
}
