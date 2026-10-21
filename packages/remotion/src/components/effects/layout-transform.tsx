import React, { createContext, useContext } from 'react';
import { joinCssTransform, mergeCSSStyles } from './mergeCSSStyles';

/**
 * A transform on an ancestor isolates mix-blend-mode, so layout transforms are
 * taken off the container and reapplied where the media paints.
 * With a blend mode, that transform sits on the same full-size element as the
 * blend, which keeps the container's rotation and still blends with tracks behind.
 * Without a blend mode, the layout transform is appended to the element's own.
 */

type LayoutTransformValue = {
    transform: string;
    transformOrigin?: React.CSSProperties['transformOrigin'];
};

const LayoutTransformContext = createContext<LayoutTransformValue | undefined>(undefined);

export function splitTransformStyle<T extends object>(
    style: T | null | undefined,
): {
    style: Omit<T, 'transform' | 'transformOrigin'>;
    transform?: string;
    transformOrigin?: React.CSSProperties['transformOrigin'];
} {
    if (!style || typeof style !== 'object') {
        return { style: {} as Omit<T, 'transform' | 'transformOrigin'> };
    }
    const record = style as T & React.CSSProperties;
    const transform = joinCssTransform(
        typeof record.transform === 'string' ? record.transform : undefined,
    );
    if (!transform) return { style: style as Omit<T, 'transform' | 'transformOrigin'> };
    const next = { ...record };
    delete next.transform;
    const transformOrigin = next.transformOrigin;
    delete next.transformOrigin;
    return {
        style: next as Omit<T, 'transform' | 'transformOrigin'>,
        transform,
        transformOrigin,
    };
}

export function LayoutTransformProvider({
    transform,
    transformOrigin,
    children,
}: {
    transform?: string;
    transformOrigin?: React.CSSProperties['transformOrigin'];
    children: React.ReactNode;
}) {
    const parent = useContext(LayoutTransformContext);
    const nextTransform = joinCssTransform(parent?.transform, transform);
    if (!nextTransform) return <>{children}</>;
    const value: LayoutTransformValue = {
        transform: nextTransform,
        transformOrigin: transformOrigin ?? parent?.transformOrigin,
    };
    if (
        parent &&
        parent.transform === value.transform &&
        parent.transformOrigin === value.transformOrigin
    ) {
        return <>{children}</>;
    }
    return (
        <LayoutTransformContext.Provider value={value}>
            {children}
        </LayoutTransformContext.Provider>
    );
}

export function useLayoutTransform(): LayoutTransformValue | undefined {
    return useContext(LayoutTransformContext);
}

/**
 * Paint `style` under the layout transform collected from ancestor containers.
 * A blend mode stays outside that transform so it still blends with the tracks behind.
 */
export function AncestorTransform({
    style,
    children,
}: {
    style: React.CSSProperties;
    children: (style: React.CSSProperties) => React.ReactElement;
}) {
    const layout = useLayoutTransform();
    if (!layout?.transform) return children(style);

    const blend = style.mixBlendMode;
    if (blend && blend !== 'normal') {
        const { mixBlendMode: _blend, ...rest } = style;
        // Blend and the layout transform share one element. A transform on an
        // ancestor would trap the blend inside the container.
        return (
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    mixBlendMode: blend,
                    transform: layout.transform,
                    transformOrigin: layout.transformOrigin ?? 'center center',
                }}
            >
                {children(rest)}
            </div>
        );
    }

    return children(
        mergeCSSStyles(
            {
                transform: layout.transform,
                ...(layout.transformOrigin ? { transformOrigin: layout.transformOrigin } : {}),
            },
            style,
        ),
    );
}
