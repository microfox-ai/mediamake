"use client";

import { useRef, type ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ColorInput } from "./color-input";
import { SliderInput } from "./slider-input";
import {
    BLEND_MODES,
    EFFECT_DEFAULTS,
    SPECIAL_EFFECT_OPTIONS,
    commitSpecialEffects,
    effectEnabled,
    readSpecialEffects,
    type SpecialEffectId,
    type SpecialEffectsDraft,
} from "./special-effects";

type StyleValue = Record<string, unknown>;

/**
 * Optional visual treatments for a CSS style object.
 * Shown when that style is marked textStyle or blockStyle.
 */
export function SpecialEffectsSection({
    value,
    onChange,
}: {
    value?: StyleValue;
    onChange: (next: StyleValue | undefined) => void;
}) {
    const style: StyleValue = value && typeof value === "object" ? value : {};
    const draft = readSpecialEffects(style);
    const latestRef = useRef(style);
    latestRef.current = style;

    const write = (nextDraft: SpecialEffectsDraft) => {
        const next = commitSpecialEffects(latestRef.current, nextDraft);
        latestRef.current = next ?? {};
        onChange(next);
    };

    const add = (id: SpecialEffectId) => {
        write({ ...draft, [id]: EFFECT_DEFAULTS[id] });
    };

    const remove = (id: SpecialEffectId) => {
        write({ ...draft, [id]: undefined });
    };

    const available = SPECIAL_EFFECT_OPTIONS.filter((effect) => !effectEnabled(draft, effect.id));
    const enabled = SPECIAL_EFFECT_OPTIONS.filter((effect) => effectEnabled(draft, effect.id));

    return (
        <div className="space-y-2 text-sm border border-muted rounded-md p-3 shadow-md">
            <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">Special Effects</p>
                {available.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button type="button" variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs">
                                <Plus className="h-3 w-3" />
                                Add
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
                            {available.map((effect) => (
                                <DropdownMenuItem key={effect.id} onSelect={() => add(effect.id)}>
                                    {effect.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
            {enabled.length === 0 ? (
                <p className="text-xs text-muted-foreground">No effects yet.</p>
            ) : (
                <div className="space-y-2">
                    {draft.opacity !== undefined && (
                        <EffectRow label="Opacity" onRemove={() => remove("opacity")}>
                            <SliderInput
                                value={Math.round(draft.opacity * 100)}
                                min={0}
                                max={100}
                                step={1}
                                unit="%"
                                onChange={(next) => write({ ...draft, opacity: next / 100 })}
                            />
                        </EffectRow>
                    )}
                    {draft.blur !== undefined && (
                        <EffectRow label="Blur" onRemove={() => remove("blur")}>
                            <SliderInput
                                value={draft.blur}
                                min={0}
                                max={40}
                                step={0.5}
                                unit="px"
                                onChange={(blur) => write({ ...draft, blur })}
                            />
                        </EffectRow>
                    )}
                    {draft.brightness !== undefined && (
                        <PercentRow
                            label="Brightness"
                            value={draft.brightness}
                            onChange={(brightness) => write({ ...draft, brightness })}
                            onRemove={() => remove("brightness")}
                        />
                    )}
                    {draft.contrast !== undefined && (
                        <PercentRow
                            label="Contrast"
                            value={draft.contrast}
                            onChange={(contrast) => write({ ...draft, contrast })}
                            onRemove={() => remove("contrast")}
                        />
                    )}
                    {draft.saturate !== undefined && (
                        <PercentRow
                            label="Saturation"
                            value={draft.saturate}
                            onChange={(saturate) => write({ ...draft, saturate })}
                            onRemove={() => remove("saturate")}
                        />
                    )}
                    {draft.hue !== undefined && (
                        <EffectRow label="Hue" onRemove={() => remove("hue")}>
                            <SliderInput
                                value={draft.hue}
                                min={0}
                                max={360}
                                step={1}
                                unit="°"
                                onChange={(hue) => write({ ...draft, hue })}
                            />
                        </EffectRow>
                    )}
                    {draft.grayscale !== undefined && (
                        <PercentRow
                            label="Grayscale"
                            value={draft.grayscale}
                            max={100}
                            onChange={(grayscale) => write({ ...draft, grayscale })}
                            onRemove={() => remove("grayscale")}
                        />
                    )}
                    {draft.sepia !== undefined && (
                        <PercentRow
                            label="Sepia"
                            value={draft.sepia}
                            max={100}
                            onChange={(sepia) => write({ ...draft, sepia })}
                            onRemove={() => remove("sepia")}
                        />
                    )}
                    {draft.invert !== undefined && (
                        <PercentRow
                            label="Invert"
                            value={draft.invert}
                            max={100}
                            onChange={(invert) => write({ ...draft, invert })}
                            onRemove={() => remove("invert")}
                        />
                    )}
                    {draft.shadow && (
                        <EffectRow label="Drop shadow" onRemove={() => remove("shadow")}>
                            <div className="grid grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] gap-1">
                                <ColorInput
                                    compact
                                    value={draft.shadow.color}
                                    onChange={(color) =>
                                        write({ ...draft, shadow: { ...draft.shadow!, color } })
                                    }
                                />
                                <MiniNumber
                                    label="X"
                                    value={draft.shadow.x}
                                    onChange={(x) => write({ ...draft, shadow: { ...draft.shadow!, x } })}
                                />
                                <MiniNumber
                                    label="Y"
                                    value={draft.shadow.y}
                                    onChange={(y) => write({ ...draft, shadow: { ...draft.shadow!, y } })}
                                />
                                <MiniNumber
                                    label="Blur"
                                    value={draft.shadow.blur}
                                    onChange={(blur) => write({ ...draft, shadow: { ...draft.shadow!, blur: Math.max(0, blur) } })}
                                />
                            </div>
                        </EffectRow>
                    )}
                    {draft.glow && (
                        <EffectRow label="Glow" onRemove={() => remove("glow")}>
                            <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-1">
                                <ColorInput
                                    compact
                                    value={draft.glow.color}
                                    onChange={(color) => write({ ...draft, glow: { ...draft.glow!, color } })}
                                />
                                <MiniNumber
                                    label="Size"
                                    value={draft.glow.blur}
                                    onChange={(blur) => write({ ...draft, glow: { ...draft.glow!, blur: Math.max(0, blur) } })}
                                />
                            </div>
                        </EffectRow>
                    )}
                    {draft.blend !== undefined && (
                        <EffectRow label="Blend" onRemove={() => remove("blend")}>
                            <Select value={draft.blend} onValueChange={(blend) => write({ ...draft, blend })}>
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {BLEND_MODES.map((mode) => (
                                        <SelectItem key={mode} value={mode}>
                                            {mode}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </EffectRow>
                    )}
                    {draft.backdrop !== undefined && (
                        <EffectRow label="Backdrop blur" onRemove={() => remove("backdrop")}>
                            <SliderInput
                                value={draft.backdrop}
                                min={0}
                                max={40}
                                step={0.5}
                                unit="px"
                                onChange={(backdrop) => write({ ...draft, backdrop })}
                            />
                        </EffectRow>
                    )}
                </div>
            )}
        </div>
    );
}

function PercentRow({
    label,
    value,
    max = 200,
    onChange,
    onRemove,
}: {
    label: string;
    value: number;
    max?: number;
    onChange: (next: number) => void;
    onRemove: () => void;
}) {
    return (
        <EffectRow label={label} onRemove={onRemove}>
            <SliderInput value={value} min={0} max={max} step={1} unit="%" onChange={onChange} />
        </EffectRow>
    );
}

function EffectRow({
    label,
    onRemove,
    children,
}: {
    label: string;
    onRemove: () => void;
    children: ReactNode;
}) {
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
                <Label className="text-[10px] uppercase text-muted-foreground">{label}</Label>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 text-muted-foreground"
                    aria-label={`Remove ${label}`}
                    onClick={onRemove}
                >
                    <X className="h-3 w-3" />
                </Button>
            </div>
            {children}
        </div>
    );
}

function MiniNumber({
    label,
    value,
    onChange,
}: {
    label: string;
    value: number;
    onChange: (next: number) => void;
}) {
    return (
        <div className="relative">
            <span className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground">
                {label}
            </span>
            <Input
                type="number"
                value={value}
                className="h-8 pl-8 text-xs"
                onChange={(event) => {
                    const next = Number(event.target.value);
                    if (Number.isFinite(next)) onChange(next);
                }}
            />
        </div>
    );
}
