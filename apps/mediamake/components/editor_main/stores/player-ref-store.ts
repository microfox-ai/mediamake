"use client";

import { create } from "zustand";
import type { RefObject } from "react";
import type { PlayerRef } from "@remotion/player";

const emptyRef: RefObject<PlayerRef | null> = { current: null };

interface PlayerRefState {
  playerRef: RefObject<PlayerRef | null>;
  setPlayerRef: (ref: RefObject<PlayerRef | null>) => void;
}

export const usePlayerRefStore = create<PlayerRefState>((set) => ({
  playerRef: emptyRef,
  setPlayerRef: (ref) => set({ playerRef: ref }),
}));
