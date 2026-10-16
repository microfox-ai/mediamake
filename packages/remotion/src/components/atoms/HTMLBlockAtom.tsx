import React from 'react';
import { BaseRenderableProps, ComponentConfig } from '../../core/types';
import { useAnimatedStyles } from '../effects';
import { atomCategory } from '../../atom-category';
import { HTMLBlockAtomInput } from './input-schemas';
import { mergeSpecialEffects } from './special-effects-style';

export { HTMLBlockAtomInput } from './input-schemas';

export interface HTMLBlockAtomData {
    html: string;
    className?: string;
    style?: React.CSSProperties;
}

interface HTMLBlockAtomProps extends BaseRenderableProps {
    data: HTMLBlockAtomData;
}

/**
 * HTMLBlockAtom - Renders raw HTML content
 * 
 * Features:
 * - Renders raw HTML strings using dangerouslySetInnerHTML
 * - Supports custom className and style props
 * - Integrates with animation effects system
 * 
 * Use cases:
 * - Injecting custom HTML/CSS/JS into compositions
 * - Adding SVG definitions and clip paths
 * - Creating custom styled HTML overlays
 * - Embedding third-party HTML widgets
 */
export const Atom: React.FC<HTMLBlockAtomProps> = ({ id, data }) => {
    const overrideStyles = useAnimatedStyles(id);

    const combinedStyle: React.CSSProperties = mergeSpecialEffects({
        ...data.style,
        ...overrideStyles,
    });

    return (
        <div
            className={data.className}
            style={combinedStyle}
            dangerouslySetInnerHTML={{ __html: data.html }}
        />
    );
};

export const config: ComponentConfig = {
    displayName: 'HTMLBlockAtom',
    type: 'atom',
    isInnerSequence: false,
    inputSchema: HTMLBlockAtomInput,
    category: atomCategory('atoms'),
};

