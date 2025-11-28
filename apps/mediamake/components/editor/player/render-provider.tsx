"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { InputCompositionProps } from "@microfox/remotion";

export interface RenderSettings {
    fileName: string;
    codec: string;
    audioCodec: string;
    composition: string;
    renderType: 'video' | 'audio' | 'still';
    inputProps: string;
    outputLocation?: string; // Only used for local rendering
    isDownloadable?: boolean; // Only used for AWS rendering
    awsRenderPreset?:
        | 'complex-fast'
        | 'complex-slow'
        | 'basic-fast'
        | 'throttled'
        | 'classic'; // Only used for AWS rendering
    concurrencyOverride?: number | 'auto'; // User-defined concurrency (AWS)
    concurrency?: number | 'auto'; // Concurrency for local renders
    quality?: 'fast' | 'balanced' | 'high'; // Quality preset for local renders
    isConcurrencyHelperActive?: boolean; // Toggle for calculator UI
    helperFps?: number; // FPS for calculator
    helperDuration?: number; // Duration in seconds for calculator
    frameTime?: number; // Frame time in seconds for still image rendering
}

export type RenderMethod = 'aws' | 'local';

interface RenderContextType {
    // Settings
    settings: RenderSettings;
    setSettings: (settings: Partial<RenderSettings>) => void;
    updateSetting: <K extends keyof RenderSettings>(key: K, value: RenderSettings[K]) => void;

    // Render method
    renderMethod: RenderMethod;
    setRenderMethod: (method: RenderMethod) => void;

    // Modal state
    isModalOpen: boolean;
    setIsModalOpen: (open: boolean) => void;

    // Loading state
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;

    // Actions
    openModal: () => void;
    closeModal: () => void;
    resetSettings: () => void;
}

const defaultSettings: RenderSettings = {
    fileName: "video-" + Date.now().toString().replaceAll("-", ""),
    codec: "h264",
    audioCodec: "aac",
    composition: "DataMotion",
    renderType: "video",
    inputProps: JSON.stringify({
        childrenData: [],
        config: {
            duration: 400,
            fps: 30,
            width: 1920,
            height: 1080,
            fitDurationTo: 'Audio-xyz',
        },
        style: { backgroundColor: "black" }
    } as InputCompositionProps, null, 2),
    outputLocation: "./out",
    isDownloadable: false,
    awsRenderPreset: "classic",
    concurrencyOverride: 'auto',
    isConcurrencyHelperActive: false,
    helperFps: 30,
    helperDuration: 40,
    frameTime: 0
};

const RenderContext = createContext<RenderContextType | undefined>(undefined);

interface RenderProviderProps {
    children: ReactNode;
    initialSettings?: Partial<RenderSettings>;
    initialRenderMethod?: RenderMethod;
}

export function RenderProvider({
    children,
    initialSettings = {},
    initialRenderMethod = 'aws'
}: RenderProviderProps) {
    const [settings, setSettingsState] = useState<RenderSettings>({
        ...defaultSettings,
        ...initialSettings
    });

    const [renderMethod, setRenderMethod] = useState<RenderMethod>(initialRenderMethod);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const setSettings = (newSettings: Partial<RenderSettings>) => {
        setSettingsState(prev => ({
            ...prev,
            ...newSettings
        }));
    };

    const updateSetting = <K extends keyof RenderSettings>(key: K, value: RenderSettings[K]) => {
        setSettingsState(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const openModal = () => {
        setSettingsState(prev => ({
            ...prev,
            fileName: "video-" + Date.now().toString().replaceAll("-", ""),
        }));
        setIsModalOpen(true);
    }
    const closeModal = () => setIsModalOpen(false);

    const resetSettings = () => {
        setSettingsState({
            ...defaultSettings,
            ...initialSettings
        });
    };

    const contextValue: RenderContextType = {
        settings,
        setSettings,
        updateSetting,
        renderMethod,
        setRenderMethod,
        isModalOpen,
        setIsModalOpen,
        isLoading,
        setIsLoading,
        openModal,
        closeModal,
        resetSettings
    };

    return (
        <RenderContext.Provider value={contextValue}>
            {children}
        </RenderContext.Provider>
    );
}

export function useRender() {
    const context = useContext(RenderContext);
    if (context === undefined) {
        throw new Error('useRender must be used within a RenderProvider');
    }
    return context;
}

// Hook for external components to control render settings
export function useRenderSettings() {
    const { settings, setSettings, updateSetting, renderMethod, setRenderMethod } = useRender();

    return {
        settings,
        setSettings,
        updateSetting,
        renderMethod,
        setRenderMethod
    };
}
