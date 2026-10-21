import React, { Children, ComponentType, ReactNode, useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import { BaseRenderableProps, ComponentConfig } from '../../core/types';
import { useAnimatedStyles } from '../effects';
import { joinCssTransform } from '../effects/mergeCSSStyles';

interface BaseLayoutProps extends BaseRenderableProps {
    children?: ReactNode;
    data: {
        isAbsoluteFill?: boolean;
        containerProps?: any;
        childrenProps?: any[];
        repeatChildrenProps?: boolean;
    }
}

export const Layout: ComponentType<BaseLayoutProps> = ({ id, children, data, context }) => {
    const { containerProps = {}, childrenProps = [], repeatChildrenProps = {} } = data;
    const overrideStyles = useAnimatedStyles(id);
    const childrenArray = Children.toArray(children);

    const enhancedStyle = useMemo(() => {
        const boundaries = !context?.boundaries?.reset ? (context?.boundaries ?? {}) : {};
        const containerStyle = (containerProps.style ?? {}) as React.CSSProperties;
        const effects = overrideStyles ?? {};
        // Keep the container transform on this box. Waveform vertical rotation
        // is authored here; moving it onto children drops the 90° turn.
        const transform = joinCssTransform(
            typeof containerStyle.transform === 'string' ? containerStyle.transform : undefined,
            typeof effects.transform === 'string' ? effects.transform : undefined,
        );
        const style: React.CSSProperties = {
            ...boundaries,
            ...containerStyle,
            ...effects,
        };
        if (transform) style.transform = transform;
        if (!effects.transformOrigin && containerStyle.transformOrigin) {
            style.transformOrigin = containerStyle.transformOrigin;
        }
        return style;
    }, [context?.boundaries, containerProps.style, overrideStyles]);

    // console.log('data in ', id, repeatChildrenProps, childrenProps);
    if (Object.keys(repeatChildrenProps).length <= 0 && childrenProps.length <= 0) {

        if (data.isAbsoluteFill) {
            return (
                <AbsoluteFill
                    {...containerProps} style={enhancedStyle}>
                    {childrenArray}
                </AbsoluteFill>
            );
        }

        return (
            <div
                id={id}
                {...containerProps} style={enhancedStyle}>
                {childrenArray.map((child, index) => (
                    <React.Fragment key={index}>
                        {child}
                    </React.Fragment>
                ))}
            </div>
        );
    }

    if (data.isAbsoluteFill) {
        return (
            <AbsoluteFill
                id={id}
                {...containerProps} style={enhancedStyle}>
                {childrenArray.map((child, index) => (
                    <div
                        key={index}
                        {...((childrenProps.length > 0 && index < childrenProps.length) ? childrenProps[index] : repeatChildrenProps ? repeatChildrenProps : {})}
                    >
                        {child}
                    </div>
                ))}
            </AbsoluteFill>
        );
    }

    return (
        <div
            id={id}
            {...containerProps} style={enhancedStyle}>
            {childrenArray.map((child, index) => (
                <div
                    key={index}
                    {...((childrenProps.length > 0 && index < childrenProps.length) ? childrenProps[index] : repeatChildrenProps ? repeatChildrenProps : {})}
                >
                    {child}
                </div>
            ))}
        </div>
    );
};

export const config: ComponentConfig = {
    displayName: 'BaseLayout',
    type: 'layout',
    isInnerSequence: false,
}