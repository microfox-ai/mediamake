"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { InputCompositionProps } from "@microfox/remotion";

// Configuration mode types
export type ConfigMode = 'preset' | 'custom';

// Custom configuration for advanced users
export interface CustomLambdaConfig {
    memory: number;      // Memory in MB (1024, 2048, 3008, 4096, 6144, 10240)
    disk: number;        // Disk in MB (2048, 5120, 10240)
    timeout: number;     // Timeout in seconds (1-900)
    concurrency: number | 'auto'; // Number of concurrent lambdas or auto
    framesPerLambda: number | 'auto'; // Frames per lambda or auto
    timeoutInMilliseconds: number; // Timeout for render operation
}

export interface RenderSettings {
    fileName: string;
    codec: string;
    audioCodec: string;
    composition: string;
    renderType: 'video' | 'audio' | 'still';
    inputProps: string;
    outputLocation?: string; // Only used for local rendering
    isDownloadable?: boolean; // Only used for AWS rendering
    // AWS region selection for Lambda renders
    region?: string;
    // Metadata
    projectId?: string;
    tags?: string[];
    
    // Configuration mode
    configMode: ConfigMode;
    
    // Preset mode settings
    awsRenderPreset:
        | 'classic'
        | 'complex-fast'
        | 'complex-slow'
        | 'basic-fast'
        | 'throttled'
        | 'lightweight'
        | 'broadcast'
        | 'enterprise';
    
    // Custom mode settings
    customConfig: CustomLambdaConfig;
    
    // Legacy concurrency override (still supported for presets)
    concurrencyOverride?: number | 'auto';
    
    // Concurrency calculator settings
    isConcurrencyHelperActive?: boolean;
    helperFps?: number;
    helperDuration?: number;
    
    // Still image settings
    frameTime?: number;
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
    
    // Custom config helpers
    updateCustomConfig: <K extends keyof CustomLambdaConfig>(key: K, value: CustomLambdaConfig[K]) => void;
    resetCustomConfig: () => void;
}

const defaultCustomConfig: CustomLambdaConfig = {
    memory: 3008,
    disk: 10240,
    timeout: 900,
    concurrency: 'auto',
    framesPerLambda: 'auto',
    timeoutInMilliseconds: 900 * 1000,
};

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
    
    // Configuration mode
    configMode: 'preset',
    
    // Preset settings
    awsRenderPreset: "classic",
    
    // Custom settings
    customConfig: defaultCustomConfig,
    
    // Legacy
    concurrencyOverride: 'auto',
    
    // Calculator
    isConcurrencyHelperActive: false,
    helperFps: 30,
    helperDuration: 40,
    
    // Still
  frameTime: 0,

  // Region (initialized elsewhere from config default if available)
  region: undefined,
  projectId: undefined,
  tags: [],
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

    const updateCustomConfig = <K extends keyof CustomLambdaConfig>(key: K, value: CustomLambdaConfig[K]) => {
        setSettingsState(prev => ({
            ...prev,
            customConfig: {
                ...prev.customConfig,
                [key]: value
            }
        }));
    };

    const resetCustomConfig = () => {
        setSettingsState(prev => ({
            ...prev,
            customConfig: defaultCustomConfig
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
        resetSettings,
        updateCustomConfig,
        resetCustomConfig
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
    const { settings, setSettings, updateSetting, renderMethod, setRenderMethod, updateCustomConfig, resetCustomConfig } = useRender();

    return {
        settings,
        setSettings,
        updateSetting,
        renderMethod,
        setRenderMethod,
        updateCustomConfig,
        resetCustomConfig
    };
}

// Export default custom config for use elsewhere
export { defaultCustomConfig };
