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

      // Generate multiple prompt variations in a single LLM call
      const result = await generateObject({
        model: anthropic('claude-opus-4-1'),
        schema: PresetPromptOutputSchema.omit({ usage: true }),
        prompt: dedent`
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
          - Performance optimization (GPU acceleration, will-change, etc.)
          - Browser rendering pipelines
          - Responsive design principles
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
        `,
        maxRetries: 2,
      });

      // Apply suffixPrompt to each prompt if provided
      const promptsWithSuffix = result.object.prompts.map(item => ({
        ...item,
        prompt: suffixPrompt
          ? `${item.prompt} ${suffixPrompt}`.trim()
          : item.prompt,
      }));

      return {
        prompts: promptsWithSuffix,
        usage: result.usage,
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
