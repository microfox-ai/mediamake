const oldtaskPrompt = (
  count: number,
  userDescription: string,
  presetStyle: string,
) => ` ## Your Task
          
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
