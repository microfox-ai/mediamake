"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Screen colour sampling via the native EyeDropper API.
 *
 * Chromium (Chrome/Edge/Brave/Electron) exposes `window.EyeDropper`, which lets
 * the user sample *any* pixel on screen — the preview frame, another panel, or
 * a window outside the browser — with the OS-level magnifier. There is no
 * userland equivalent: rasterising arbitrary DOM is both lossy and blocked for
 * cross-origin media, so on non-Chromium browsers we report `isSupported:false`
 * and callers fall back to the swatch/text entry paths.
 */

interface EyeDropperResult {
    sRGBHex: string;
}

interface EyeDropperInstance {
    open: (options?: { signal?: AbortSignal }) => Promise<EyeDropperResult>;
}

type EyeDropperConstructor = new () => EyeDropperInstance;

declare global {
    interface Window {
        EyeDropper?: EyeDropperConstructor;
    }
}

export function useEyeDropper() {
    // Resolved after mount so SSR and the first client render agree.
    const [isSupported, setIsSupported] = useState(false);
    const [isPicking, setIsPicking] = useState(false);

    useEffect(() => {
        setIsSupported(typeof window !== "undefined" && typeof window.EyeDropper === "function");
    }, []);

    /** Opens the picker. Resolves to a hex string, or null if cancelled. */
    const pick = useCallback(async (): Promise<string | null> => {
        if (typeof window === "undefined" || typeof window.EyeDropper !== "function") return null;
        setIsPicking(true);
        try {
            const dropper = new window.EyeDropper();
            const result = await dropper.open();
            return result.sRGBHex;
        } catch {
            // User pressed Escape or the browser aborted the pick.
            return null;
        } finally {
            setIsPicking(false);
        }
    }, []);

    return { isSupported, isPicking, pick };
}
