import React, { createContext, useContext } from 'react';
import { Sequence, Series, useVideoConfig } from 'remotion';
import { useComposition } from '../../core/context';
import { getComponent, getComponentConfig } from '../../core/registry';
import { BaseRenderableData, CalculatedBoundaries, CalculatedTiming, InternalRenderableContext, RenderableContext } from '../../core/types';
import { calculateHierarchy, calculateTimingWithInheritance } from '../../core/utils/hierarchyUtils';
import { seriesPlacement } from '../../core/utils/timing';
import { useAnimatedStyles } from '../effects';
import { joinCssTransform } from '../effects/mergeCSSStyles';
import { EffectWrapper } from './EffectWrapper';

// Create a context for passing down calculated values
const RenderContext = createContext<RenderableContext | null>(null);

/**
 * Sequence tracks are scenes, so they never mount BaseLayout. The shell still
 * paints containerProps, including rotation, on this box.
 */
function SceneContainer({
    id,
    data,
    children,
}: {
    id: string;
    data?: {
        containerProps?: { className?: string; style?: React.CSSProperties };
    };
    children: React.ReactNode;
}) {
    const containerProps = data?.containerProps;
    const overrideStyles = useAnimatedStyles(id);
    const containerStyle = containerProps?.style ?? {};
    const effects = overrideStyles ?? {};
    const transform = joinCssTransform(
        typeof containerStyle.transform === 'string' ? containerStyle.transform : undefined,
        typeof effects.transform === 'string' ? effects.transform : undefined,
    );
    const style: React.CSSProperties = { ...containerStyle, ...effects };
    if (transform) style.transform = transform;
    if (!effects.transformOrigin && containerStyle.transformOrigin) {
        style.transformOrigin = containerStyle.transformOrigin;
    }
    const className = containerProps?.className;
    if (!className && Object.keys(style).length === 0) {
        return <>{children}</>;
    }
    return (
        <div id={id} className={className} style={style}>
            {children}
        </div>
    );
}

export const useRenderContext = () => {
    const context = useContext(RenderContext);
    if (!context) {
        throw new Error('useRenderContext must be used within a ComponentRenderer');
    }
    return context;
};


export const ComponentRenderer: React.FC<BaseRenderableData> = ({
    id,
    componentId,
    type,
    data,
    childrenData,
    context,
    effects
}) => {
    const videoConfig = useVideoConfig();
    const { root } = useComposition();

    // Establish a default root context if we are at the top of the tree
    const defaultContext: RenderableContext = {
        boundaries: {
            left: 0,
            top: 0,
            width: videoConfig.width,
            height: videoConfig.height,
            zIndex: 0,
        },
        timing: {
            startInFrames: 0,
            durationInFrames: videoConfig.durationInFrames,
        },
        hierarchy: {
            depth: 0,
            parentIds: [],
        },
    };

    if (!context) {
        context = {
        };
    }


    // Calculate new hierarchy based on position in root data
    const newHierarchy = calculateHierarchy(root, id, context ?? defaultContext);


    // Calculate timing with inheritance from parent
    const componentData = {
        id,
        componentId,
        type,
        data,
        childrenData,
        context,
        effects
    };
    let newTiming: CalculatedTiming = calculateTimingWithInheritance(componentData, root, videoConfig);


    const newContext: InternalRenderableContext = {
        ...context,
        boundaries: (context?.boundaries) as CalculatedBoundaries,
        hierarchy: newHierarchy,
        timing: newTiming
    };

    const ComponentClass = getComponent(componentId);

    if (type === 'scene') {
        // Series appends each child. The stored start is already that packed
        // position, so it must not be passed through as another delay. The
        // child is then rendered at 0 inside its own slot.
        // The scene's own start delays the whole series. A negative
        // startOffset pulls it earlier so this sequence clips the head.
        const startOffsetFrames = Math.round(
            Math.min(0, Number(context?.timing?.startOffset) || 0) * videoConfig.fps,
        );
        let packedCursor = 0;
        let headTrim = startOffsetFrames;
        const series = (
            <Series>
                {childrenData?.map((child) => {
                    const childTiming = calculateTimingWithInheritance(child, root, videoConfig);
                    // Series.Sequence requires a positive duration — a zero/unset
                    // duration used to throw and take down the whole player.
                    const childDuration = childTiming.durationInFrames ?? 0;
                    if (!(childDuration > 0)) {
                        console.warn(
                            `Skipping "${child.componentId} - ${child.id}": timing resolved to ${childDuration} frames`
                        );
                        return null;
                    }
                    const authored = child.context?.timing;
                    const hasStart =
                        typeof authored?.startInFrames === 'number' ||
                        typeof authored?.start === 'number';
                    const placement = seriesPlacement({
                        hasStart,
                        startInFrames: childTiming.startInFrames ?? 0,
                        durationInFrames: childDuration,
                        packedCursor,
                    });
                    if (headTrim !== 0) {
                        placement.offset += headTrim;
                        placement.nextCursor += headTrim;
                        headTrim = 0;
                    }
                    packedCursor = placement.nextCursor;
                    const placedChild = {
                        ...child,
                        context: {
                            ...(child.context ?? {}),
                            timing: {
                                ...(authored ?? {}),
                                start: 0,
                                startInFrames: 0,
                            },
                        },
                    };
                    return (
                        <Series.Sequence
                            key={child.id}
                            name={child.componentId + " - " + child.id}
                            offset={placement.offset}
                            durationInFrames={childDuration}>
                            {child.effects && child.effects.length > 0 ? (
                                <EffectWrapper effects={child.effects} context={newContext}>
                                    <ComponentRenderer key={child.id} {...placedChild} />
                                </EffectWrapper>
                            ) : (
                                <ComponentRenderer key={child.id} {...placedChild} />
                            )}
                        </Series.Sequence>
                    )
                })}
            </Series>
        );

        const sceneDuration = newTiming.durationInFrames ?? 0;
        const sceneTree = (
            <SceneContainer id={id} data={data}>
                {series}
            </SceneContainer>
        );
        const sceneBody = sceneDuration > 0 ? (
            <Sequence
                layout="none"
                name={componentId + " - " + id}
                from={newTiming.startInFrames ?? 0}
                durationInFrames={sceneDuration}
            >
                {sceneTree}
            </Sequence>
        ) : sceneTree;

        return (
            <RenderContext.Provider value={newContext}>
                {sceneBody}
            </RenderContext.Provider>
        );
    }


    if (!ComponentClass) {
        console.warn(`Component type ${id} not found in registry`);
        return null;
    }
    const props = {
        id, componentId, data, context: context
    };


    if (type === 'layout') {
        const startOffsetSec = Math.min(0, Number(context?.timing?.startOffset) || 0);
        const shiftChild = (child: NonNullable<typeof childrenData>[number]) => {
            if (!startOffsetSec) return child;
            const timing = child.context?.timing ?? {};
            const start = typeof timing.start === 'number' ? timing.start : 0;
            return {
                ...child,
                context: {
                    ...child.context,
                    timing: {
                        ...timing,
                        start: start + startOffsetSec,
                        startInFrames: undefined,
                    },
                },
            };
        };

        const config = getComponentConfig(componentId);

        const isInnerSequence = config?.isInnerSequence;

        if (isInnerSequence) {
            return (
                <RenderContext.Provider value={newContext}>
                    <ComponentClass {...props}>
                        {effects && effects.length > 0 ? (
                            <EffectWrapper effects={effects} context={newContext}>
                                {childrenData?.map((child) => (
                                    <ComponentRenderer key={child.id} {...shiftChild(child)} />
                                ))}
                            </EffectWrapper>
                        ) : (
                            childrenData?.map((child) => (
                                <ComponentRenderer key={child.id} {...shiftChild(child)} />
                            ))
                        )}
                    </ComponentClass>
                </RenderContext.Provider>
            );
        }

        const layoutContent = effects && effects.length > 0 ? (
            <EffectWrapper effects={effects} context={newContext}>
                <ComponentClass {...props}>
                    {childrenData?.map((child) => (
                        <ComponentRenderer key={child.id} {...shiftChild(child)} />
                    ))}
                </ComponentClass>
            </EffectWrapper>
        ) : (
            <ComponentClass {...props}>
                {childrenData?.map((child) => (
                    <ComponentRenderer key={child.id} {...shiftChild(child)} />
                ))}
            </ComponentClass>
        );

        // Only wrap in a Sequence when the duration resolved to something
        // positive — Remotion throws on 0, which previously crashed the whole
        // player. Mirrors how the atom branch below handles unset timing.
        if (!(newTiming.durationInFrames && newTiming.durationInFrames > 0)) {
            return (
                <RenderContext.Provider value={newContext}>
                    {layoutContent}
                </RenderContext.Provider>
            );
        }

        return (
            <RenderContext.Provider value={newContext}>
                <Sequence layout='none' name={componentId + " - " + id} from={newTiming.startInFrames} durationInFrames={newTiming.durationInFrames}>
                    {layoutContent}
                </Sequence>
            </RenderContext.Provider>
        );
    }

    if (type === 'atom') {
        const atomData = data as {
            boundaries?: { left?: number; top?: number; width?: number; height?: number };
            containerProps?: { className?: string; style?: React.CSSProperties };
        } | undefined;
        const bounds = atomData?.boundaries;
        const containerProps = atomData?.containerProps;
        const hasBoundaries =
            bounds &&
            typeof bounds.left === 'number' &&
            typeof bounds.top === 'number' &&
            typeof bounds.width === 'number' &&
            typeof bounds.height === 'number';
        const wrapperStyle: React.CSSProperties | undefined = hasBoundaries
            ? {
                position: 'absolute',
                left: bounds!.left,
                top: bounds!.top,
                width: bounds!.width,
                height: bounds!.height,
            }
            : containerProps?.style;
        const wrapperClassName = containerProps?.className;

        const renderAtom = (atomProps: typeof props) => {
            const node = effects && effects.length > 0 ? (
                <EffectWrapper effects={effects} context={newContext}>
                    <ComponentClass {...atomProps} />
                </EffectWrapper>
            ) : (
                <ComponentClass {...atomProps} />
            );
            return wrapperStyle || wrapperClassName ? (
                <div className={wrapperClassName} style={wrapperStyle}>{node}</div>
            ) : node;
        };

        if (newTiming.durationInFrames && newTiming.durationInFrames > 0) {
            return (
                <RenderContext.Provider value={newContext}>
                    <Sequence layout='none' name={componentId + " - " + id} from={newTiming.startInFrames} durationInFrames={newTiming.durationInFrames}>
                        {renderAtom({
                            ...props,
                            context: { ...(props.context || {}), timing: { durationInFrames: newTiming.durationInFrames } },
                        })}
                    </Sequence>
                </RenderContext.Provider>
            );
        }

        return (
            <RenderContext.Provider value={newContext}>
                {renderAtom(props)}
            </RenderContext.Provider>
        );
    }
}; 