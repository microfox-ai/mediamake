"use client";

import { useRef, useState, type ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TextFillControl } from "./text-fill-control";
import { AdjustRow, EffectPopover, PopupColor, ShadowSwatch } from "./effect-popover";
import {
    blurPatch,
    dropShadowPatch,
    glowPatch,
    readBlockBlur,
    readDropShadow,
    readGlow,
    readStroke,
    strokePatch,
    STROKE_STYLES,
    type DropShadowDraft,
    type GlowDraft,
    type StrokeDraft,
} from "./block-style";

type StyleValue = Record<string, unknown>;

export function BlockStyleSection({
    value,
    onChange,
}: {
    value?: StyleValue;
    onChange: (next: StyleValue | undefined) => void;
}) {
    const style: StyleValue = value && typeof value === "object" ? value : {};
    const latestRef = useRef(style);
    latestRef.current = style;

    const patch = (changes: Record<string, unknown>) => {
        const next: StyleValue = { ...latestRef.current };
        for (const [key, val] of Object.entries(changes)) {
            if (val === undefined || val === "") delete next[key];
            else next[key] = val;
        }
        latestRef.current = next;
        onChange(Object.keys(next).length > 0 ? next : undefined);
    };

    return (
        <div className="space-y-2 text-sm border border-muted rounded-md p-3 shadow-md">
            <p className="text-sm font-medium">Block</p>
            <Row label="Fill">
                <TextFillControl surface="block" style={style} patch={patch} />
            </Row>
            <StrokeControl style={style} patch={patch} />
            <BlurControl style={style} patch={patch} />
            <GlowControl style={style} patch={patch} />
            <DropShadowControl style={style} patch={patch} />
        </div>
    );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            {children}
        </div>
    );
}

function StrokeControl({ style, patch }: { style: StyleValue; patch: (changes: Record<string, unknown>) => void }) {
    const stroke = readStroke(style);
    const shown: StrokeDraft = stroke ?? { width: 2, radius: 0, style: "solid", color: "#000000" };
    const write = (next: StrokeDraft) => patch(strokePatch(next));
    return (
        <Row label="Stroke">
            <EffectPopover
                swatch={<ShadowSwatch color={stroke?.color} />}
                title={stroke ? `${stroke.width}px ${stroke.style}` : "None"}
                detail={stroke ? `${stroke.radius}px radius` : "Border"}
                active={Boolean(stroke)}
                clearLabel="Remove stroke"
                onClear={() => patch(strokePatch(undefined))}
            >
                <div className="space-y-3">
                    <div
                        className="h-14 rounded-md bg-muted"
                        style={{
                            borderWidth: shown.width,
                            borderStyle: shown.style,
                            borderColor: shown.color,
                            borderRadius: shown.radius,
                        }}
                    />
                    <PopupColor value={shown.color} onChange={(color) => write({ ...shown, color })} />
                    <AdjustRow label="Width" min={0} max={48} value={shown.width} onChange={(width) => write({ ...shown, width })} />
                    <AdjustRow label="Radius" min={0} max={120} value={shown.radius} onChange={(radius) => write({ ...shown, radius })} />
                    <Select value={shown.style} onValueChange={(next) => write({ ...shown, style: next as StrokeDraft["style"] })}>
                        <SelectTrigger className="h-8 text-xs" aria-label="Stroke style">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {STROKE_STYLES.map((option) => (
                                <SelectItem key={option} value={option}>
                                    {option}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </EffectPopover>
        </Row>
    );
}

function BlurControl({ style, patch }: { style: StyleValue; patch: (changes: Record<string, unknown>) => void }) {
    const blur = readBlockBlur(style);
    const [tab, setTab] = useState<"layer" | "backdrop">("layer");
    const active = blur.layer > 0 || blur.backdrop > 0;
    const detail = [
        blur.layer > 0 ? `Layer ${blur.layer}px` : "",
        blur.backdrop > 0 ? `Backdrop ${blur.backdrop}px` : "",
    ].filter(Boolean).join(" · ");
    return (
        <Row label="Blur">
            <EffectPopover
                swatch={<span className="h-7 w-7 shrink-0 rounded-md border bg-muted" style={{ filter: blur.layer ? `blur(${Math.min(blur.layer, 6)}px)` : undefined, backdropFilter: blur.backdrop ? `blur(${blur.backdrop}px)` : undefined }} />}
                title={active ? detail : "None"}
                detail={active ? "Blur" : "Layer or backdrop"}
                active={active}
                clearLabel="Remove blur"
                onClear={() => patch(blurPatch({ layer: 0, backdrop: 0 }))}
            >
                <div className="space-y-3">
                    <Tabs value={tab} onValueChange={(next) => setTab(next as "layer" | "backdrop")}>
                        <TabsList className="grid h-8 w-full grid-cols-2">
                            <TabsTrigger value="layer" className="text-xs">Layer blur</TabsTrigger>
                            <TabsTrigger value="backdrop" className="text-xs">Backdrop blur</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    {tab === "layer" ? (
                        <>
                            <AdjustRow label="Blur" min={0} max={40} value={blur.layer} onChange={(layer) => patch(blurPatch({ ...blur, layer }))} />
                            <p className="text-[11px] leading-snug text-muted-foreground">Blurs this layer, including its contents.</p>
                        </>
                    ) : (
                        <>
                            <AdjustRow label="Blur" min={0} max={40} value={blur.backdrop} onChange={(backdrop) => patch(blurPatch({ ...blur, backdrop }))} />
                            <p className="text-[11px] leading-snug text-muted-foreground">Blurs what is behind this layer. The fill needs to be partly transparent.</p>
                        </>
                    )}
                </div>
            </EffectPopover>
        </Row>
    );
}

function GlowControl({ style, patch }: { style: StyleValue; patch: (changes: Record<string, unknown>) => void }) {
    const outer = readGlow(style, "outer");
    const inner = readGlow(style, "inner");
    const [tab, setTab] = useState<"outer" | "inner">(outer || !inner ? "outer" : "inner");
    const current = tab === "outer" ? outer : inner;
    const shown: GlowDraft = current ?? { blur: 16, spread: 0, color: "rgba(255,255,255,0.9)" };
    const write = (next: GlowDraft) => patch(glowPatch(style, tab, next));
    const label = [outer ? "Outer" : "", inner ? "Inner" : ""].filter(Boolean).join(" · ");
    return (
        <Row label="Glow">
            <EffectPopover
                swatch={<ShadowSwatch color={outer?.color || inner?.color} />}
                title={label || "None"}
                detail={current ? `${current.blur}px blur` : "Inner or outer"}
                active={Boolean(outer || inner)}
                clearLabel="Remove glow"
                onClear={() => {
                    const withoutOuter = glowPatch(style, "outer", undefined);
                    const cleared: StyleValue = { ...style };
                    for (const [key, val] of Object.entries(withoutOuter)) {
                        if (val === undefined) delete cleared[key];
                        else cleared[key] = val;
                    }
                    patch({ ...withoutOuter, ...glowPatch(cleared, "inner", undefined) });
                }}
            >
                <div className="space-y-3">
                    <Tabs value={tab} onValueChange={(next) => setTab(next as "outer" | "inner")}>
                        <TabsList className="grid h-8 w-full grid-cols-2">
                            <TabsTrigger value="outer" className="text-xs">Outer glow</TabsTrigger>
                            <TabsTrigger value="inner" className="text-xs">Inner glow</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <div
                        className="h-14 rounded-md bg-muted"
                        style={{
                            boxShadow: tab === "inner"
                                ? `inset 0 0 ${shown.blur}px ${shown.spread}px ${shown.color}`
                                : `0 0 ${shown.blur}px ${shown.spread}px ${shown.color}`,
                        }}
                    />
                    <PopupColor value={shown.color} onChange={(color) => write({ ...shown, color })} />
                    <AdjustRow label="Blur" min={0} max={80} value={shown.blur} onChange={(blur) => write({ ...shown, blur })} />
                    <AdjustRow label="Spread" min={-40} max={40} value={shown.spread} onChange={(spread) => write({ ...shown, spread })} />
                </div>
            </EffectPopover>
        </Row>
    );
}

function DropShadowControl({ style, patch }: { style: StyleValue; patch: (changes: Record<string, unknown>) => void }) {
    const shadow = readDropShadow(style);
    const shown: DropShadowDraft = shadow ?? { x: 0, y: 8, blur: 18, spread: 0, color: "rgba(0,0,0,0.35)" };
    const write = (next: DropShadowDraft) => patch(dropShadowPatch(style, next));
    return (
        <Row label="Drop shadow">
            <EffectPopover
                swatch={<ShadowSwatch color={shadow?.color} />}
                title={shadow ? shadow.color : "None"}
                detail={shadow ? `${shadow.x}, ${shadow.y} · ${shadow.blur}px` : "Box shadow"}
                active={Boolean(shadow)}
                clearLabel="Remove drop shadow"
                onClear={() => patch(dropShadowPatch(style, undefined))}
            >
                <div className="space-y-3">
                    <div
                        className="mx-auto h-12 w-24 rounded-md bg-foreground/80"
                        style={{ boxShadow: `${shown.x}px ${shown.y}px ${shown.blur}px ${shown.spread}px ${shown.color}` }}
                    />
                    <PopupColor value={shown.color} onChange={(color) => write({ ...shown, color })} />
                    <AdjustRow label="X offset" min={-80} max={80} value={shown.x} onChange={(x) => write({ ...shown, x })} />
                    <AdjustRow label="Y offset" min={-80} max={80} value={shown.y} onChange={(y) => write({ ...shown, y })} />
                    <AdjustRow label="Blur" min={0} max={80} value={shown.blur} onChange={(blur) => write({ ...shown, blur })} />
                    <AdjustRow label="Spread" min={-40} max={40} value={shown.spread} onChange={(spread) => write({ ...shown, spread })} />
                </div>
            </EffectPopover>
        </Row>
    );
}
