"use client";

import { useState } from "react";
import { readTextShadow, textShadowPatch, type TextShadow } from "./text-shadow";
import { AdjustRow, EffectPopover, PopupColor, ShadowSwatch } from "./effect-popover";

const EMPTY: TextShadow = { x: 0, y: 4, blur: 8, color: "rgba(0,0,0,0.45)" };

export function TextShadowControl({
    style,
    patch,
    compact = false,
}: {
    style: Record<string, unknown>;
    patch: (changes: Record<string, unknown>) => void;
    compact?: boolean;
}) {
    const shadow = readTextShadow(style);
    const [draft, setDraft] = useState<TextShadow>(shadow ?? EMPTY);

    const shown = shadow ?? draft;
    const write = (next: TextShadow) => {
        setDraft(next);
        patch(textShadowPatch(next));
    };

    return (
        <EffectPopover
            swatch={<ShadowSwatch color={shadow?.color} />}
            title={shadow ? shadow.color : "None"}
            detail={shadow ? `${shadow.x}, ${shadow.y} · ${shadow.blur}px` : "Text shadow"}
            active={Boolean(shadow)}
            clearLabel="Remove text shadow"
            onClear={() => patch(textShadowPatch(undefined))}
            compact={compact}
        >
            <div className="space-y-3">
                <div
                    className="flex h-14 items-center justify-center rounded-md bg-muted text-2xl font-semibold"
                    style={{ color: "#111111", textShadow: shadow ? `${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.color}` : undefined }}
                >
                    Ag
                </div>
                <PopupColor value={shown.color} onChange={(color) => write({ ...shown, color })} />
                <AdjustRow label="X offset" min={-80} max={80} value={shown.x} onChange={(x) => write({ ...shown, x })} />
                <AdjustRow label="Y offset" min={-80} max={80} value={shown.y} onChange={(y) => write({ ...shown, y })} />
                <AdjustRow label="Blur" min={0} max={80} value={shown.blur} onChange={(blur) => write({ ...shown, blur })} />
            </div>
        </EffectPopover>
    );
}
