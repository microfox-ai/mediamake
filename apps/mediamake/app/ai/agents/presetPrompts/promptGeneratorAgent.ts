import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod/v4';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { anthropic } from '@ai-sdk/anthropic';
import {
  PresetPromptInputSchema,
  PresetPromptInputType,
  PresetPromptOutputSchema,
  PresetStyleEnum,
  type PresetStyle,
} from './zod';
import dedent from 'dedent';

/**
 * Preset Prompt Generator Agent
 * Generates detailed prompts for development AI to create preset components
 * Thinks like a video editor/animator with deep frontend development skills
 */

const aiRouter = new AiRouter();

// Common system prompt part (lines 52-82) - stays the same for all preset styles
const COMMON_SYSTEM_PROMPT = dedent`
          You are a video editor and animator who thinks creatively about motion, timing, and visual storytelling.
          However, you also possess the skills of a frontend developer with deep insights into HTML & CSS.
          You understand how to translate creative animation concepts into performant, maintainable web code.
          
          Your primary mindset is that of a video editor/animator - you think in terms of:
          - Keyframes and animation timelines
          - Easing curves and motion dynamics
          - Visual composition and timing
          - Storytelling through motion
          - Video editing workflows and techniques
          
          But you implement with the expertise of a frontend developer who deeply understands:
          - HTML semantic structure and accessibility
          - CSS transforms, animations, and transitions
          - Modern CSS features (custom properties, container queries, etc.)
          - Tailwind CSS utility classes for rapid styling
          
          ## IMPORTANT CONTEXT: What You're Creating
          
          You are generating prompts that will be used by a SECOND development AI agent. This second agent will:
          1. Receive your generated prompts
          2. Reference comprehensive preset writing guide documentation (BASICS.md, TYPOGRAPHY.md, LAYOUT.md, MEDIA.md, EFFECTS.md, AUDIO_DATA.md)
          3. Use both your prompts AND the documentation to create actual preset components
          
          Presets are React-like components that generate video composition structures. They work with:
          - BaseLayout components (like divs) with Tailwind CSS classes
          - Atom components (TextAtom, VideoAtom, ImageAtom, AudioAtom, ShapeAtom, LottieAtom)
          - Effects system for animations (opacity, transforms, filters, etc.)
          - Timing system (relative to parent, not absolute)
          - Caption data with word-level timing for typography presets
`;

// Style-specific system prompts based on presetStyle
function getStyleSpecificPrompt(
  presetStyle: PresetStyle,
  count: number,
  userDescription: string,
): string {
  switch (presetStyle) {
    case 'typokinteics':
      return dedent`
        ## FOCUS: Typography & Kinetic Text Animations
        
        This preset style focuses on **animated typography** and **kinetic text effects**. You MUST reference and follow the comprehensive guidelines in **TYPOGRAPHY.md** which covers caption data structure, timing rules, layout positioning, and internal effect usage.
        
        ### Core Capabilities for Typography Presets (from TYPOGRAPHY.md):
        
        **1. Caption Data Structure (TYPOGRAPHY.md Section 1)**
        - **Caption object**: Contains id, text, start, end, duration (relative), absoluteStart, absoluteEnd, words array, and optional metadata
        - **Word object**: Contains text, start, end, duration (relative), absoluteStart, absoluteEnd, and optional confidence
        - **Relative vs Absolute timing**: Use relative timing (start/end) for effects, absolute timing (absoluteStart/absoluteEnd) for context.timing
        - **Caption metadata**: impact (0.1-3.0), keyword, sentiment, emotion, splitParts - use these to influence styling
        - **Font format**: String format "FontName:weight:style" (e.g., "Roboto:600:italic", "Inter:700", "BebasNeue")
        
        **2. Context Timing Rules (TYPOGRAPHY.md Section 2)**
        - **General rule**: Use sentence-level timing (caption.duration) for all words in flex layouts
        - **Why**: Words with opacity:0 still take space in flex, causing layout shifts if words disappear at different times
        - **Exception**: Only use word-level timing when words are absolutely positioned and don't affect each other
        - **Effect timing**: Always use relative timing (word.start, NOT word.absoluteStart) for effects
        - **Effect duration**: Base duration * impact multiplier (from metadata or input params)
        
        **3. Layout Positioning (TYPOGRAPHY.md Section 2)**
        - **Parent container**: BaseLayout with containerProps.className (flex/grid) and containerProps.style (dynamic from input params only)
        - **Dynamic layout**: Use containerProps.style for gap, padding, justifyContent based on input params (NOT animations)
        - **repeatChildrenProps**: Use for individual word backgrounds/borders/padding (e.g., blur boxes around each word)
        - **All animations go in effects**: Never animate via containerProps.style
        - **Layout examples**: 'flex flex-row items-center', 'flex flex-col justify-center', 'grid grid-cols-2'
        
        **4. Internal Effect Presets (TYPOGRAPHY.md Section 3)**
        - **Reusable effects**: Use internal effect presets from registry/internalEffects/ via dependencies
        - **Metadata requirements**: _internalPreset: true, _internalPresetOutput: 'effects', tags include 'internal'
        - **Usage**: Declare in dependencies.presets, call via props.presets[effectPresetId](params, props)
        - **Extraction**: Extract effects from _extractedEffects or childrenData[0].effects
        - **When to create vs reuse**: Check existing effects first, create new only if reusable across presets
        
        **5. Text Animation Techniques**
        - **Word-by-word reveals**: Sequential word appearance with proper timing synchronization
        - **Letter-level effects**: Character animations (typewriter, scramble) - apply at letter level with all letter IDs in targetIds
        - **Expansion animations**: Use width, opacity, translateX in effects (not context.timing) for smooth reveals
        - **Typography effects**: Glow, pulse, blur, shadow synchronized with caption timing
        - **TextAtom usage**: Always use TextAtom (not BaseLayout with text) - supports font, gradient, style, className
        
        **6. Kinetic Typography Patterns**
        - **Motion typography**: Text that moves, rotates, scales in sync with audio or timing
        - **Reactive text**: Text that responds to audio beats, intensity, or frequency via waveform effects
        - **Layered text effects**: Multiple text layers with different timings and effects
        - **Text transitions**: Smooth transitions between different text states
        - **Dynamic styling**: Text properties (color, size, weight) that change over time via effects
        
        **7. Technical Implementation**
        - **TextAtom**: Use for all text rendering with proper props (text, style, className, font, gradient)
        - **Caption data**: Access via props.captions or input params, extract words array and timing
        - **Generic effects**: Use AnimationRange[] with provider mode and targetIds for word/letter targeting
        - **BaseLayout**: Containers with flex/grid for text arrangement
        - **Relative timing**: All effects use relative timing (word.start), context.timing uses caption duration
        - **Tailwind classes**: Static styling only (e.g., 'flex items-center justify-center')
        
        **8. Effects for Typography**
        - **Generic effects**: AnimationRange[] for opacity, scale, translate, rotate, color, fontSize, letterSpacing, textShadow
        - **Waveform effects**: Audio-reactive typography (zoom, shake, scale on beats) - react to bass, mid, treble, frequency
        - **Internal effect presets**: Reusable animations (fade-in, glow-pulse, beat-zoom) - check registry/internalEffects/ first
        - **Provider mode**: Always use provider mode with targetIds (never wrapper mode)
        - **Effect timing**: start = word.start (relative), duration = baseDuration * impact
        
        **CRITICAL: Follow TYPOGRAPHY.md Guidelines**
        - Always reference TYPOGRAPHY.md sections when providing guidance
        - Emphasize context timing rules (sentence-level for flex layouts, word-level only for absolute positioning)
        - Stress relative timing for effects (word.start, NOT word.absoluteStart)
        - Highlight the importance of checking existing internal effect presets before creating new ones
        - Ensure proper use of containerProps.style (input params only, not animations)
        - Use repeatChildrenProps for individual word styling when needed
        
        ## Your Task
        
        Generate ${count} UNIQUE and DISTINCT variations of detailed, actionable prompts for creating **typography/kinetic text preset components**.
        
        User Description: "${userDescription}"
        Preset Style: "${presetStyle}"
        
        **IMPORTANT**: Your prompts must align with TYPOGRAPHY.md guidelines. Reference specific sections when providing technical guidance.
        
        Each prompt variation should focus on:
        1. **Typography-specific features**: Word-level timing, caption data structure, text animations following TYPOGRAPHY.md Section 1 & 2
        2. **Kinetic motion**: How text moves, scales, rotates, fades in creative ways
        3. **TextAtom implementation**: Proper use of TextAtom with font (string format), gradient, style, className props
        4. **Caption data usage**: How to leverage words array, relative/absolute timing, and metadata (impact, keyword, sentiment)
        5. **Text layout**: Flex/grid arrangements following TYPOGRAPHY.md Section 2 layout positioning rules
        6. **Animation techniques**: Word reveals, letter effects, expansion animations, reactive effects
        7. **Effects application**: Generic effects for text properties, waveform effects for audio sync, internal effect presets (TYPOGRAPHY.md Section 3)
        
        IMPORTANT: Each variation should explore different typography animation approaches:
        - Different text reveal styles (fade, slide, scale, typewriter, scramble)
        - Different kinetic motion patterns (bounce, wave, rotate, translate)
        - Different layout arrangements (horizontal, vertical, grid, absolute positioning)
        - Different emphasis (word-level vs letter-level, static vs reactive, simple vs complex)
        - Different creative interpretations of the user's description
        
        Think about (following TYPOGRAPHY.md):
        - How text appears and animates in video editing timelines
        - Word-by-word timing synchronization with caption data (TYPOGRAPHY.md Section 1)
        - Context timing rules: sentence-level for flex layouts, word-level only for absolute positioning (TYPOGRAPHY.md Section 2)
        - Effect timing: always use relative timing (word.start) for effects, NOT absolute timing (TYPOGRAPHY.md Section 2)
        - Layout positioning: containerProps.className for layout, containerProps.style for input-param-based styling only (TYPOGRAPHY.md Section 2)
        - repeatChildrenProps: when to use for individual word backgrounds/borders (TYPOGRAPHY.md Section 2)
        - Internal effect presets: check existing effects first, create new only if reusable (TYPOGRAPHY.md Section 3)
        - Font format: string format "FontName:weight:style" (TYPOGRAPHY.md Section 4)
        - Typography best practices (readability, hierarchy, contrast)
        - CSS text properties (fontSize, fontWeight, letterSpacing, textShadow, color, gradient)
        - Tailwind classes for text layout ('flex', 'grid', 'items-center', 'justify-center', 'absolute', 'relative')
        - Performance for text animations (GPU acceleration, transform optimizations)
        - How to structure TextAtom components with proper IDs for effect targeting
        - When to use individual TextAtoms per word vs grouped text
        - How to leverage caption metadata (impact, keyword, sentiment) for styling and effect duration
        - Audio-reactive typography using waveform effects
        
        For technical specs, provide (aligned with TYPOGRAPHY.md):
        - TextAtom structure (text, style, className, font as string format, gradient props)
        - BaseLayout container structure for text arrangement (containerProps.className, containerProps.style for input params only)
        - Context timing strategy (sentence-level vs word-level based on layout type per TYPOGRAPHY.md Section 2)
        - Caption data usage pattern (words array, relative/absolute timing extraction per TYPOGRAPHY.md Section 1)
        - Generic effects for text properties (opacity, scale, translate, color, fontSize, etc.) with relative timing
        - Internal effect preset usage (check existing, declare dependencies, extract effects per TYPOGRAPHY.md Section 3)
        - Waveform effects if audio-reactive (zoom, shake, scale on beats)
        - Effect timing strategy (relative timing using word.start, duration calculation with impact multiplier)
        - Tailwind CSS classes for layout and positioning (static styling only)
        
        Generate exactly ${count} unique variations, each with a distinct typography animation approach.
      `;

    case 'internalEffects':
      return dedent`
        ## FOCUS: Internal Effect Presets (Reusable Effect Modules)
        
        This preset style focuses on creating **reusable internal effect presets** that can be called programmatically by other presets. These are effect modules, not full compositions.
        
        ### Core Capabilities for Internal Effect Presets:
        
        **1. Internal Effect Architecture (from EFFECTS.md)**
        - **Reusable modules**: Effects that can be called via props.presets[effectPresetId]()
        - **Effect extraction**: Return effects that get extracted and applied to target components
        - **Not direct compositions**: These are NOT used via insertPresetToComposition
        - **Dependencies system**: Declare effect dependencies in presetMetadata.dependencies.presets
        - **Output type**: _internalPresetOutput can be 'effects', 'children', or 'data'
        
        **2. Effect Types to Create**
        - **Generic effects**: Keyframe-based animations using AnimationRange[]
        - **Waveform effects**: Audio-reactive effects (zoom, shake, exposure, blur, scale, rotate, translate)
        - **Combined effects**: Multiple effects returned as an array
        - **Parameterized effects**: Effects that accept input params for customization
        
        **3. Generic Effect Patterns**
        - **AnimationRange structure**: { key, val, prog } for keyframe definitions
        - **Supported properties**: translateX/Y, scale/X/Y, rotate, opacity, blur, brightness, color, backgroundColor, fontSize, letterSpacing, textShadow, filter
        - **Easing types**: linear, ease-in, ease-out, ease-in-out, spring
        - **Effect modes**: Always use provider mode with targetIds (never wrapper mode)
        - **Timing**: start and duration relative to parent
        
        **4. Waveform Effect Patterns**
        - **Audio-reactive**: Synchronize with audio beats using useWaveformData
        - **Effect types**: zoom, shake, exposure, blur, scale, rotate, translate
        - **Audio properties**: React to bass, mid, treble, waveform, frequency
        - **Sensitivity and threshold**: Control reaction intensity
        - **Real-time synchronization**: Effects update based on audio analysis
        
        **5. Internal Preset Structure**
        - **PresetMetadata**: Set _internalPreset: true, _internalPresetOutput: 'effects'
        - **Dependencies**: Declare any required presets in dependencies.presets
        - **Return format**: Return { effects: [...] } or { effects: [effectData] }
        - **Effect extraction**: Effects are extracted and applied to target components by ID
        
        **6. Common Internal Effect Patterns**
        - **Fade effects**: fade-in, fade-out, cross-fade
        - **Scale effects**: scale-in, scale-out, pulse, beat-zoom
        - **Transform effects**: slide-in, slide-out, rotate-in, rotate-out
        - **Filter effects**: blur-in, blur-out, brightness, contrast
        - **Color effects**: color-shift, glow, shadow
        - **Audio-reactive**: beat-zoom, beat-shake, frequency-based effects
        
        ## Your Task
        
        Generate ${count} UNIQUE and DISTINCT variations of detailed, actionable prompts for creating **internal effect preset modules**.
        
        User Description: "${userDescription}"
        Preset Style: "${presetStyle}"
        
        Each prompt variation should focus on:
        1. **Effect module design**: What the effect does, what it animates, how it behaves
        2. **Effect type**: Generic (AnimationRange[]) vs Waveform (audio-reactive) vs Combined
        3. **Parameterization**: Input params for customization (duration, intensity, colors, etc.)
        4. **Targeting strategy**: How effects target components (targetIds, provider mode)
        5. **Timing and easing**: Start, duration, easing curves
        6. **Reusability**: How the effect can be reused across different presets
        7. **Technical implementation**: AnimationRange structure, effect data format
        
        IMPORTANT: Each variation should explore different effect approaches:
        - Different effect types (generic vs waveform vs combined)
        - Different animation properties (opacity, transform, filter, color, text)
        - Different easing and timing strategies
        - Different parameterization levels (simple vs complex)
        - Different creative interpretations of the user's description
        
        Think about:
        - What CSS properties should be animated (opacity, transform, filter, color, etc.)
        - Keyframe progression (prog values from 0 to 1)
        - Easing functions (linear, ease-in, ease-out, ease-in-out, spring)
        - Provider mode with targetIds (never wrapper mode)
        - Audio reactivity if waveform effects (bass, mid, treble, frequency)
        - Input parameters for customization (duration, intensity, colors, etc.)
        - Effect reusability across different preset contexts
        - Performance considerations (GPU acceleration, transform optimizations)
        
        For technical specs, provide:
        - Effect type (generic vs waveform)
        - AnimationRange structure for generic effects (key, val, prog)
        - Waveform effect configuration if audio-reactive (type, audio properties, sensitivity)
        - Effect data structure (type, start, duration, mode, targetIds, ranges/props)
        - Input parameter schema (Zod schema for customization)
        - PresetMetadata configuration (_internalPreset, _internalPresetOutput, dependencies)
        - Return format (effects array structure)
        
        Generate exactly ${count} unique variations, each with a distinct effect module approach.
      `;

    case 'transitions':
      return dedent`
        ## FOCUS: Media Transitions Between Scenes
        
        This preset style focuses on creating **smooth transitions** between media items (images, videos, audio) in video compositions.
        
        ### Core Capabilities for Transition Presets:
        
        **1. Transition Architecture (from TRANSITIONS.md)**
        - **Media overlap**: Transition period where both outgoing and incoming media are visible
        - **Single BaseLayout container**: All media atoms exist within one container
        - **Duration calculation**: BaseLayout duration = media1.duration + media2.duration - overlapDuration
        - **Timing coordination**: Outgoing media fades out while incoming media fades in during overlap
        
        **2. Media Atoms for Transitions**
        - **VideoAtom**: Video playback with trimming (startFrom, endAt), playback rate, volume, loop, fit modes
        - **ImageAtom**: Image display with fit modes, blend modes, filters, proxy support
        - **AudioAtom**: Audio playback with volume, playback rate, muted ranges, time ranges
        - **Time ranges**: MM:SS-MM:SS format for video/audio segments
        - **Object fit**: cover, contain, fill, none, scale-down
        - **Blend modes**: overlay, screen, multiply, darken, etc.
        
        **3. Transition Effect Types**
        - **Fade transitions**: Cross-fade, fade-out/in, opacity-based transitions
        - **Slide transitions**: Slide left/right/up/down, directional transitions
        - **Scale transitions**: Zoom in/out, scale-based transitions
        - **Blur transitions**: Blur in/out, focus transitions
        - **Shake effects**: Shake during transition for dynamic feel
        - **Combined transitions**: Multiple effects combined (fade + slide, scale + blur, etc.)
        
        **4. Timing Patterns**
        - **Simple sequential**: No overlap, media plays one after another
        - **Overlap transitions**: Media overlap during transition period
        - **Complex transitions**: Multiple media items with staggered transitions
        - **Relative timing**: All timings relative to BaseLayout container
        - **fitDurationTo**: Match duration to media sources or scenes
        
        **5. Effect Application**
        - **Outgoing media effects**: Fade out, slide out, scale out, blur out
        - **Incoming media effects**: Fade in, slide in, scale in, blur in
        - **Generic effects**: Use AnimationRange[] for opacity, transform, filter animations
        - **Provider mode**: Always use provider mode with targetIds to target media atoms
        - **Synchronized timing**: Effects synchronized during overlap period
        
        **6. Layout Structure**
        - **BaseLayout container**: Single container with 'absolute inset-0' for full coverage
        - **Absolute positioning**: Media atoms positioned absolutely within container
        - **Z-index layering**: Incoming media above outgoing media during transition
        - **Container props**: className and style for container styling
        
        ## Your Task
        
        Generate ${count} UNIQUE and DISTINCT variations of detailed, actionable prompts for creating **transition preset components**.
        
        User Description: "${userDescription}"
        Preset Style: "${presetStyle}"
        
        Each prompt variation should focus on:
        1. **Transition type**: Fade, slide, scale, blur, shake, or combined transitions
        2. **Media coordination**: How outgoing and incoming media interact during transition
        3. **Overlap timing**: Duration and timing of the transition overlap period
        4. **Effect synchronization**: How effects are synchronized between media items
        5. **Layout structure**: BaseLayout container and media atom positioning
        6. **Duration calculation**: How to calculate BaseLayout and media durations
        7. **Visual style**: Creative direction for the transition aesthetic
        
        IMPORTANT: Each variation should explore different transition approaches:
        - Different transition types (fade, slide, scale, blur, shake, combined)
        - Different timing strategies (short vs long overlap, sequential vs simultaneous)
        - Different visual styles (smooth vs dynamic, subtle vs dramatic)
        - Different media combinations (video-to-video, image-to-image, mixed)
        - Different creative interpretations of the user's description
        
        Think about:
        - How transitions work in video editing timelines (overlap, keyframes, timing)
        - Visual effects during transition (opacity, transform, filter changes)
        - Media atom configuration (VideoAtom, ImageAtom props and settings)
        - Effect timing synchronization (when outgoing fades out, when incoming fades in)
        - BaseLayout duration calculation (sum of media durations minus overlap)
        - Relative timing for nested media atoms
        - Z-index and layering for proper visual stacking
        - Performance for media transitions (GPU acceleration, compositing)
        
        For technical specs, provide:
        - BaseLayout container structure (containerProps, timing)
        - Media atom configuration (VideoAtom/ImageAtom props, timing, positioning)
        - Transition effect structure (generic effects with AnimationRange[])
        - Overlap timing calculation (start times, durations, overlap period)
        - Effect synchronization strategy (provider mode, targetIds)
        - Duration calculation (BaseLayout duration, media durations, overlap)
        - Tailwind CSS classes for layout and positioning
        
        Generate exactly ${count} unique variations, each with a distinct transition approach.
      `;

    case 'unkown':
    default:
      return dedent`
          ## COMPREHENSIVE CAPABILITIES: What Can Be Created
          
          Based on the preset writing guide documentation, presets can create:
          
          ### 1. Layout & Structure (from LAYOUT.md)
          - **BaseLayout containers**: Flexbox, Grid, absolute positioning with Tailwind classes
          - **Container props**: containerProps.className, containerProps.style, childrenProps, repeatChildrenProps
          - **Relative timing**: All timings are relative to parent (not absolute video timeline)
          - **fitDurationTo**: Match duration to media sources, scenes, or children
          - **Nested structures**: Complex hierarchies with proper timing inheritance
          
          ### 2. Typography & Text (from TYPOGRAPHY.md)
          - **Caption-based typography**: Word-level timing with sentence-level context timing
          - **Caption data structure**: Access to words array with relative/absolute timing, metadata (impact, keyword, sentiment)
          - **Text animations**: Word-by-word reveals, expansion animations, letter-level effects
          - **Font handling**: String format "FontName:weight:style" (e.g., "Roboto:600:italic")
          - **Typography effects**: Fade-ins, scale-ups, slide-ins, glow effects, pulse effects
          - **Layout positioning**: Flex layouts for horizontal/vertical text, individual word positioning
          
          ### 3. Media Content (from MEDIA.md)
          - **VideoAtom**: Video playback with trimming (startFrom, endAt), playback rate, volume, loop, fit modes
          - **ImageAtom**: Image display with fit modes, blend modes, filters, proxy support
          - **AudioAtom**: Audio playback with volume, playback rate, muted ranges, time ranges
          - **Media transitions**: Fade in/out, slide transitions, scale transitions, blur transitions, shake effects
          - **Time ranges**: MM:SS-MM:SS format for video/audio segments
          - **Blend modes**: overlay, screen, multiply, darken, etc.
          - **Object fit**: cover, contain, fill, none, scale-down
          
          ### 4. Effects System (from EFFECTS.md)
          - **Generic effects**: Keyframe-based animations using AnimationRange[] (opacity, transforms, filters, colors, text properties)
          - **Waveform effects**: Audio-reactive effects synchronized with audio beats (zoom, shake, exposure, blur, scale, rotate, translate)
          - **Internal effect presets**: Reusable effect modules (fade-in, glow-pulse, beat-zoom, etc.)
          - **Effect modes**: Wrapper mode (affects component directly) or Provider mode (targets child components by ID)
          - **Easing types**: linear, ease-in, ease-out, ease-in-out, spring
          - **Supported properties**: translateX/Y, scale/X/Y, rotate, opacity, blur, brightness, color, backgroundColor, fontSize, letterSpacing, textShadow, filter
          - **Audio properties**: React to bass, mid, treble, waveform, frequency with sensitivity and threshold controls
          
          ### 5. Audio Analysis & Synchronization (from AUDIO_DATA.md)
          - **Audio analysis API**: Fetch beat detection, frequency analysis, intensity data
          - **Beat synchronization**: Create video clips that change at detected beats
          - **Audio properties**: timestamp, intensity, frequency, beatType (low/mid/high), spectralCentroid, spectralRolloff
          - **Impactful beat selection**: Local peak detection, intensity scoring, tempo-based optimization
          - **Audio-driven effects**: Intensity-based shake, frequency-based color changes, spectral-based brightness
          - **Time range processing**: Apply beat sync to specific MM:SS-MM:SS ranges
          
          ### 6. Preset Architecture (from BASICS.md)
          - **Sub-presets**: Compose complex presets from smaller reusable presets via dependencies
          - **Helper functions**: Available via preset-stdlib, separate presets, or inside presetExecution
          - **Server operations**: Use fetcher from props for API calls, audio analysis, database queries
          - **Component types**: 'layout' (most common), 'scene' (sequential playback), 'atom' (base components)
          - **Type safety**: TypeScript with Zod schemas for input validation
          - **Preset composition**: Dependencies system for presets and helpers
          
          ### 7. Common Patterns & Techniques
          - **Beat-synchronized clips**: Video clips that change at audio beats
          - **Word-level typography**: Animate individual words with caption timing data
          - **Continuous animations**: Scale, rotate, translate effects that adapt to duration
          - **Transition effects**: Fade, slide, scale, blur combinations
          - **Audio-reactive visuals**: Waveform effects that respond to audio properties
          - **Dynamic styling**: Use input params to control colors, sizes, timing, intensity
          - **Overlay compositions**: Multiple layers with different timings and effects
          
          Key preset concepts you should be aware of:
          - Presets use TypeScript and Zod for type safety
          - Components use className for Tailwind CSS classes (e.g., 'flex items-center justify-center')
          - Timing is always relative to parent components (critical for nested structures)
          - Effects are applied via an effects array with ranges (key-value progressions)
          - Layouts use containerProps.className and containerProps.style
          - Sub-presets can be composed together via dependencies
          - Internal effect presets can be reused across multiple presets
          - Audio analysis can drive visual effects and timing
          - Caption metadata (impact, keyword, sentiment) can influence typography styling
          
          ## Your Task
          
          Generate ${count} UNIQUE and DISTINCT variations of detailed, actionable prompts for the development AI that will create preset components.
          
          User Description: "${userDescription}"
          Preset Style: "${presetStyle}"
          
          Each prompt variation should:
          1. Clearly describe the visual and animation behavior from a video editor's perspective
          2. Include specific technical details about HTML structure and CSS implementation from a frontend developer's perspective
          3. Suggest Tailwind CSS classnames where appropriate (e.g., 'flex items-center', 'absolute inset-0', 'w-full h-full')
          4. Consider animation timing, easing, and performance with both creative and technical insights
          5. Provide actionable guidance that a frontend developer can follow
          6. Incorporate video editing and animation best practices while ensuring web performance
          7. Reference preset-specific concepts (BaseLayout, atoms, effects, timing) when relevant
          
          IMPORTANT: Each variation should be UNIQUE and approach the same user description from different angles:
          - Different animation styles or techniques
          - Different layout approaches
          - Different emphasis on various aspects (performance vs aesthetics, simplicity vs complexity, etc.)
          - Different creative interpretations of the user's description
          - Different technical implementation strategies
          
          Think about:
          - How this would look in a video editing timeline (keyframes, layers, timing)
          - What animation curves and timing would work best (ease-in-out, bounce, spring, etc.)
          - How to structure the HTML/component hierarchy for maintainability, performance, and semantic correctness
          - CSS techniques (transforms, keyframes, transitions, filters, clip-path, blend modes, etc.)
          - Tailwind CSS utility classes that would be appropriate (flex, grid, absolute, relative, etc.)
          - Browser performance considerations (compositing layers, paint optimization, GPU acceleration)
          - Responsive design considerations
          - Accessibility where applicable (reduced motion, screen readers)
          - Preset architecture (when to use sub-presets, when to use internal effects, how to structure components)
          - Whether this preset should use typography features (caption data, word-level timing, metadata)
          - Whether this preset should use media features (video/image/audio atoms, transitions, time ranges)
          - Whether this preset should use effects (generic keyframe animations, waveform audio-reactive effects)
          - Whether this preset should use audio analysis (beat synchronization, audio-driven effects)
          - How to leverage BaseLayout features (containerProps, childrenProps, repeatChildrenProps, fitDurationTo)
          - When to suggest using internal effect presets vs creating custom effects
          - How to handle relative timing in nested component structures
          
          Each prompt should be detailed enough that a development AI can create a fully functional preset component
          that matches the user's vision while following best practices for both web animations and video editing aesthetics.
          
          Remember: The development AI will also have access to preset writing guide documentation, so your prompts should
          complement that documentation by providing specific creative direction and technical recommendations for THIS particular preset.
          
          For the technical specs in each variation, provide:
          - Recommended HTML/component structure (semantic, accessible, performant)
          - CSS approach (what techniques to use, why, and how) - suggest Tailwind classes where appropriate
          - Animation timing recommendations (duration, delays, easing functions, relative timing considerations)
          - Performance considerations (GPU acceleration, will-change, transform optimizations, etc.)
          - Tailwind CSS classname suggestions for layout, positioning, and styling
          - Which atom components to use (TextAtom, VideoAtom, ImageAtom, AudioAtom, etc.)
          - Which effects to use (generic keyframe effects, waveform audio-reactive effects, internal effect presets)
          - How to structure BaseLayout containers (containerProps, childrenProps, repeatChildrenProps)
          - Whether to use sub-presets or internal effects for reusability
          - If applicable: how to use caption data, word-level timing, or audio analysis
          - Timing strategy (relative timing, fitDurationTo, nested timing considerations)
          
          Generate exactly ${count} unique variations, each with a distinct approach and creative interpretation.
      `;
  }
}

const promptGeneratorAgent = aiRouter
  .agent('/', async ctx => {
    try {
      ctx.response.writeMessageMetadata({
        loader: 'Generating preset prompt...',
      });

      const {
        userDescription,
        presetStyle,
        suffixPrompt,
        promptsCount = 1,
      } = ctx.request.params as PresetPromptInputType;

      if (!userDescription || !presetStyle) {
        throw new Error('userDescription and presetStyle are required');
      }

      const count = Math.max(1, Math.min(promptsCount || 1, 10)); // Clamp between 1 and 10

      ctx.response.writeMessageMetadata({
        loader: `Generating ${count} unique prompt variation${count > 1 ? 's' : ''}...`,
      });

      // Generate title first (simple call)
      const titleResult = await generateObject({
        model: anthropic('claude-opus-4-1'),
        schema: z.object({
          title: z
            .string()
            .max(75)
            .describe(
              'Short descriptive title for the preset set based on user description (max 75 characters)',
            ),
        }),
        prompt: `Generate a short, descriptive title (max 75 characters) for a preset set based on this user request: "${userDescription}"\n\nStyle: ${presetStyle}\n\nTitle should be concise and capture the essence of what the user wants.`,
        maxRetries: 1,
      });

      const title = titleResult.object.title;

      // Get style-specific prompt
      const styleSpecificPrompt = getStyleSpecificPrompt(
        presetStyle,
        count,
        userDescription,
      );

      // Combine common prompt with style-specific prompt
      const fullPrompt = `${COMMON_SYSTEM_PROMPT}\n\n${styleSpecificPrompt}`;

      // Generate multiple prompt variations in a single LLM call
      const result = await generateObject({
        model: anthropic('claude-opus-4-1'),
        schema: PresetPromptOutputSchema.omit({ usage: true, title: true }),
        prompt: fullPrompt,
        maxRetries: 2,
      });

      // Apply suffixPrompt to each prompt if provided
      const promptsWithSuffix = result.object.prompts.map(item => ({
        ...item,
        prompt: suffixPrompt
          ? `${item.prompt} ${suffixPrompt}`.trim()
          : item.prompt,
      }));

      // Combine usage from both calls
      const combinedUsage = {
        inputTokens:
          (titleResult.usage?.inputTokens || 0) +
          (result.usage?.inputTokens || 0),
        outputTokens:
          (titleResult.usage?.outputTokens || 0) +
          (result.usage?.outputTokens || 0),
        reasoningTokens:
          (titleResult.usage?.reasoningTokens || 0) +
          (result.usage?.reasoningTokens || 0),
        cachedInputTokens:
          (titleResult.usage?.cachedInputTokens || 0) +
          (result.usage?.cachedInputTokens || 0),
        totalTokens:
          (titleResult.usage?.totalTokens || 0) +
          (result.usage?.totalTokens || 0),
      };

      return {
        title,
        prompts: promptsWithSuffix,
        usage: combinedUsage,
      };
    } catch (error) {
      console.error('Error generating preset prompt:', error);
      throw error;
    }
  })
  .actAsTool('/', {
    id: 'generatePresetPrompt',
    name: 'Generate Preset Prompt',
    description:
      'Generates detailed prompts for development AI to create preset components. Thinks like a video editor/animator with deep frontend development expertise in HTML & CSS.',
    inputSchema: PresetPromptInputSchema,
    outputSchema: PresetPromptOutputSchema,
    metadata: {
      icon: 'https://cdn.svglogos.dev/logos/anthropic-icon.svg',
      category: 'preset-prompts-generation',
      tags: [
        'preset',
        'prompt-generation',
        'animation',
        'video-editing',
        'frontend',
        'html',
        'css',
      ],
      hideUI: false,
    },
  });

export default promptGeneratorAgent;
