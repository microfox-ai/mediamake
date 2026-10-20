import React, { Children, ComponentType, ReactNode, useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import { BaseRenderableProps, ComponentConfig } from '../../core/types';
import { useAnimatedStyles } from '../effects';
import { joinCssTransform } from '../effects/mergeCSSStyles';
import { LayoutTransformProvider, splitTransformStyle } from '../effects/layout-transform';

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

    const { enhancedStyle, transform, transformOrigin } = useMemo(() => {
        const boundaries = !context?.boundaries?.reset ? (context?.boundaries ?? {}) : {};
        const container = splitTransformStyle(containerProps.style as React.CSSProperties | undefined);
        const effects = splitTransformStyle(overrideStyles);
        return {
            transform: joinCssTransform(container.transform, effects.transform),
            transformOrigin: effects.transformOrigin ?? container.transformOrigin,
            enhancedStyle: {
                ...boundaries,
                ...container.style,
                ...effects.style,
            },
        };
    }, [context?.boundaries, containerProps.style, overrideStyles]);

    // console.log('data in ', id, repeatChildrenProps, childrenProps);
    let body: ReactNode;
    if (Object.keys(repeatChildrenProps).length <= 0 && childrenProps.length <= 0) {

        if (data.isAbsoluteFill) {
            body = (
                <AbsoluteFill
                    {...containerProps} style={enhancedStyle}>
                    {childrenArray}
                </AbsoluteFill>
            );
        } else {
            body = (
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
    } else if (data.isAbsoluteFill) {
        body = (
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
    } else {
        body = (
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
    }

    return (
        <LayoutTransformProvider transform={transform} transformOrigin={transformOrigin}>
            {body}
        </LayoutTransformProvider>
    );
};

export const config: ComponentConfig = {
    displayName: 'BaseLayout',
    type: 'layout',
    isInnerSequence: false,
}