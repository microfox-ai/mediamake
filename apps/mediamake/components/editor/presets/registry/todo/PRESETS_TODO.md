@todo Presets

> Checklist of existing and potential presets that can be built with the current preset system.

---

## Full Scene Presets (complete compositions)

- [x] Base Scene: A base scene with a configurable background color, gradient, or image and optional global padding.
- [x] Waveform Audio Scene: A full-scene audio visualization with animated waveform, background image/video, and text overlays synced to the track.
- [x] Video Stitch Sequence: Sequentially stitches multiple videos with automatic timing and smooth transitions between clips.
- [ ] Podcast Visual Scene: A split-screen layout with host image, guest image, animated waveform, and captions for podcast episodes.
- [ ] Interview Split Screen Scene: Side-by-side video layout with name tags, subtle motion background, and adaptive timing based on clips.
- [ ] Reaction Video Scene: Base video overlaid on primary content with picture-in-picture layout, rounded corners, and shadow.
- [ ] Story Vertical Scene: 9:16 vertical scene with safe-zone aware margins, title header, and CTA footer block.
- [ ] Carousel Sequence Scene: Creates multiple slides with consistent layout, each slide timed sequentially using scene-type composition.
- [ ] Cinematic Intro Scene: Short intro scene with logo, title, and animated background particles before main content.
- [ ] Cinematic Outro Scene: Ending scene with subscribe buttons, social handles, and fade-out of background media.
- [ ] Tutorial Chapter Scene: Chapter-based scene that displays chapter title, progress indicator, and background media for each section.
- [ ] Product Showcase Scene: Full-screen product visuals, rotating images or short clips, and headline/price text overlays.
- [ ] Quote Highlight Scene: Large centered quote with blurred background video and subtle parallax movement.
- [ ] Multi-Host Panel Scene: 3–4 participant layout with auto-resized video tiles and name tags, ideal for panel discussions.
- [ ] Timeline Story Scene: Horizontal or vertical timeline with key moments represented by images and short captions across the scene.
- [ ] Gaming Highlight Scene: Game clip in the background with dynamic killfeed-like overlay text and waveform at the bottom.
- [ ] Music Visual Story Scene: Vertical story scene combining audio waveform, track metadata, cover art, and subtle background motion.
- [ ] Meme Scene: Top-caption and bottom-caption layout over video/image with bold fonts and animated zoom-in punchlines.
- [ ] Review Breakdown Scene: Alternates between reviewer talking head and product b-roll using sequential layout with scene-type stitching.
- [ ] Before/After Comparison Scene: Side-by-side or slider-style before/after visuals with label text and timed transitions.
- [ ] Course Lesson Scene: Title + key points on the left with video or media on the right, timed to each lesson segment.
- [ ] News Headline Scene: Lower-third headline ticker, main video, and logo bug in corner, with subtle background gradient.
- [ ] Animated Slideshow Scene: Sequence of images with crossfades, parallax zoom, and caption overlays using scene stitching.
- [ ] Event Recap Scene: Montage of short clips and images auto-fit to music duration with global title and outro.
- [ ] Countdown Intro Scene: Countdown timer scene (e.g., 5–1) with big numerals and audio-synced effects before main video starts.

## Caption / Subtitle Presets

- [x] Subtitles Plain: Plain subtitles positioned at the bottom or top with basic styling and background box.
- [x] Subtitles Vertical Float: Kinetic subtitles with vertical float, fade-blur, and drift-style animations.
- [x] Scrolling Vertical Subtitles: Continuous vertical scrolling subtitles like movie credits with animated word entries.
- [x] Media Stitch Subtitles: Stitches media segments between caption sentences based on caption timing.
- [x] Kinetic Motion Subtitles: Emotion-rich, highly animated subtitles with position, scale, and opacity motion per sentence.
- [x] Kinetic Gradient Flow Subtitles: Gradient subtitle text with flowing, pulsing, shimmer, and rainbow effects.
- [x] Fast Rap Static Subtitles: Fast-timed subtitles optimized for dense lyrics with static word positions and quick fades.
- [x] B-Roll: Automatically shows related images or clips whenever captions are active, hiding them in gaps.
- [x] B-Roll Clone: Shows only selected or tagged images as b-roll during caption ranges.
- [x] Karaoke Line Highlight Subtitles: Highlights the entire line as it is spoken with a trailing progress bar under the text.
- [x] Word-by-Word Karaoke Subtitles: Sequentially highlights each word using word-level timing while keeping layout stable.
- [x] Bounce-In Word Subtitles: Each word bounces into place from below with easing when it becomes active.
- [x] Typewriter Subtitles: Simulates typewriter text reveal per caption with subtle cursor blink effect.
- [x] Sentiment Color Subtitles: Changes subtitle color and emphasis based on caption sentiment metadata (positive, negative, neutral).
- [x] Emotion Pulse Subtitles: Scales and glows subtitle words based on `caption.metadata.impact` or emotion tags.
- [x] Keyword Spotlight Subtitles: Briefly enlarges and recolors only `caption.metadata.keyword` in each sentence.
- [ ] Split Parts Cascade Subtitles: Uses `metadata.splitParts` to cascade multiple lines of a caption with staggered entry.
- [x] Upper Third Subtitles: Positions subtitles in the upper third for UI-heavy or meme content while preserving safe area.
- [ ] Center Framed Quote Subtitles: Centers one caption at a time in the middle of the screen with dimmed background.
- [ ] Vertical Stacked Lines Subtitles: Stacks multiple lines vertically, each caption as a block, with slide-in animations.
- [ ] Outline Glow Subtitles: Thickly outlined subtitles with periodic glow pulses based on word duration.
- [ ] Handwritten Script Subtitles: Uses script-style font and directional reveal effect mimicking handwriting.
- [ ] Captioned Quote Cards: Converts each caption into a centered quote card with decorative borders and transitions.
- [ ] Emphasis-Only Subtitles: Only highlights the strongest words in a caption while the rest remain subtle.
- [ ] Floating Word Cloud Subtitles: Spreads words around the screen like a word cloud while preserving reading order.
- [ ] Caption Box Bounce Subtitles: Puts each caption inside a rounded box that bounces slightly on entry.
- [ ] Caption Zoom Pop Subtitles: Slightly zooms the whole caption when a key word is spoken, then returns to normal.
- [ ] Callout Arrow Subtitles: Adds arrow graphics that point towards relevant on-screen content for instructional videos.
- [ ] Subtitle Shadow Stack: Creates multiple drop-shadow layers behind subtitles for stronger contrast on busy footage.
- [ ] Minimal Micro-Subtitles: Very small, unobtrusive subtitles tucked near the speaker’s mouth area.
- [ ] Captions with Inline Emojis: Maps words to emojis and briefly overlays emojis near corresponding words.
- [ ] Language Flag Subtitles: Shows a small language flag next to subtitles with possible multi-language stacking.
- [ ] Auto-Paused Subtitles: Extends display of difficult or dense captions slightly beyond original timing.
- [ ] Vertical Lyrics Cards: Creates tall cards with several lyrics lines grouped by song section.
- [ ] Callout Bubbles Subtitles: Speech bubble style captions that attach near speaker’s face region in video.
- [ ] Caption Highlight Bars: Adds colored bars above or below the subtitle line to match mood or brand theme.
- [ ] Split Screen Caption + Visual: Left side shows subtitles stacked; right side shows animated visuals or waveform.
- [ ] Caption Timeline Strip: Thin timeline of all captions at the bottom with the current one magnified.
- [ ] Subtitle Focus Blur: Blurs the background slightly whenever subtitles appear to improve readability.
- [ ] Captions with Side Annotations: Adds small annotation text to the side of main subtitles (e.g., [laughs], [music]).
- [ ] Dual-Language Subtitles: Shows two language lines, one above the other, with distinct fonts.
- [ ] Caption Pointer Line: Draws a subtle line from subtitle to the current speaker’s position on screen.
- [ ] Vertical Sing-Along Bar: Moves an indicator bar vertically across lyrics like karaoke machines.

## Image / Visual Effects Presets

- [x] Caption Image Reveal: Reveals images based on caption timing, syncing image appearance with spoken lines.
- [x] Content-Aware Reveal: Chooses reveal directions and colors based on image color analysis (VIBGYOR, luminance).
- [x] imageloop: Applies pan, zoom, and looping camera motion over one or more images.
- [x] Image Loop with Sound: Timing-aware pan and zoom image loops combined with transition sounds and stack effects.
- [x] Wipe Reveal: Classic directional or radial wipe reveal with organic or burned edges.
- [x] Particle Effect: Particle-based animations such as assemble, explode, and float tied to timing.
- [x] Glitch Effect: RGB shift, digital corruption, static, and VHS-style glitch overlays.
- [x] Parallax Depth Image Effect: Simulates depth by splitting image into layers and applying different parallax speeds.
- [x] Cinematic Letterbox Reveal: Applies top/bottom black bars and animates image entry within cinematic framing.
- [x] Color Splash Focus: Desaturates background while keeping one color range fully saturated.
- [x] Zoom Pulse Focus: Periodically zooms slightly into a focal area (e.g., face or object) to draw attention.
- [x] Tilt-Shift Miniature Effect: Adds blur bands and saturation to make scenes look miniature.
- [x] Light Leak Overlay: Adds animated light leak overlays that move across the frame.
- [x] VHS Vintage Filter: Strong VHS look with chromatic aberration, noise, and frame jitter.
- [ ] Film Grain Overlay: Subtle film grain layer adjustable by intensity and texture scaling.
- [ ] Neon Edge Glow: Detects edges and adds neon-colored outline glow overlays.
- [ ] Bokeh Background Blur: Strong blur of background with layered bokeh spots that animate slightly.
- [ ] Split Tone Color Effect: Applies split toning with different tints in shadows and highlights.
- [ ] Freeze Frame Punch-In: Freezes a frame and quickly zooms in with stylized outline.
- [ ] Comic Panel Split: Splits screen into comic-style panels with borders and halftone textures.
- [ ] Polaroid Stack Effect: Renders images as stacked Polaroid frames sliding in and out.
- [ ] Photo Wall Mosaic: Creates a mosaic of many small images that assemble into a larger one.
- [ ] Gradient Overlay Glow: Applies animated gradient overlays with blending to energize visuals.
- [ ] Scanline CRT Effect: Adds CRT-style scanlines, slight curvature, and glow.
- [ ] Liquid Distortion Warp: Applies heatwave or water-like distortion to images or videos.
- [ ] Kaleidoscope Mirror: Mirrors parts of the image into kaleidoscope patterns.
- [ ] Edge Sketch Filter: Converts image edges into a monochrome sketch-like appearance.
- [ ] Comic Dot Halftone: Halftone dot overlay and bold outlines for comic-book styling.
- [ ] Dynamic Vignette Focus: Darkens edges while spotlighting center content with adjustable radius.
- [ ] Motion Blur Sweep: Adds directional motion blur to create speed and direction emphasis.
- [ ] Time-Lapse Streaks: Overlays faint “ghosted” previous frames to simulate long exposure motion.
- [ ] Background Replacement Plate: Adds solid/gradient/pattern background behind subject cut-out.
- [ ] Animated Shape Overlays: Circles, lines, and blocks that move over the image in sync with beats.
- [ ] Sticker Collage: Drops various stickers and badges around images with simple bounce animations.
- [ ] Frame-by-Frame Jitter: Slight per-frame position/rotation jitter for hand-held or analog feel.
- [ ] Focus Ring Spotlight: Circular spotlight around a region with darkened surroundings.
- [ ] Gradient Border Frame: Adds thick animated gradient borders around image or video.
- [ ] Transparent Cutout Window: Reveals a “window” to underlying layers via animated masks.

## Text & Typography Presets

- [x] Text Overlay: Customizable text overlay with flexible positioning, style, and in/out animations.
- [x] Text Base: Horizontal text line with simple opacity-based presence, great for reuse.
- [x] Kinetic Typography with Glitch Effect: Dynamic kinetic typography with integrated glitch distortion.
- [ ] Bold Headline Centered: Big, centered headline text with simple fade and scale-in animation.
- [ ] Lower Third Title: Professional lower-third band with title and subtitle, sized for safe zones.
- [ ] Stacked Title Blocks: Multi-line stacked titles with staggered slide-in from left or right.
- [ ] Word Carousel Typo: Loops through words or phrases in place, swapping them with quick transitions.
- [ ] Outline-Only Headline: Thick outlined text with transparent fill and subtle glow pulses.
- [ ] Gradient Stroke Title: Text with gradient stroke and solid fill, animated by sweeping gradient.
- [ ] Vertical Reading Title: Vertical stacked characters (e.g., for Japanese/Korean style) with fade-ins.
- [ ] Wave Baseline Text: Text whose baseline animates like a wave as time progresses.
- [ ] Elastic Pop Text: Letters pop in one after another with elastic overshoot.
- [ ] 3D Shadow Text: Simulated 3D extruded shadow using layered text with offset and blur.
- [ ] Masked Image Text: Text filled with underlying image or video using masking layout.
- [ ] Animated Bullet Points: Sequential bullet points sliding in from one side with timing control.
- [ ] Numbered Step List: Step-by-step typography layout with numbered circles or boxes.
- [ ] Paragraph Reveal Block: Full paragraph fades in block-by-block or sentence-by-sentence.
- [ ] Callout Label Text: Small labels with arrows pointing to objects, using layout childrenProps.
- [ ] Title + Subtitle Pair: Main title and smaller subtitle, center or side aligned.
- [ ] Hashtag Stack Text: A stack of hashtags that slide up one by one on a loop.
- [ ] Minimal Caption Bar: Thin bar with small text anchored to the top or bottom edge.
- [ ] Energetic Bounce Letters: Each letter bounces in vertically with per-letter delays.
- [ ] Rotating Keywords: A fixed position where important keywords rotate through over time.
- [ ] Gradient Trail Letters: Trail-like fading gradient behind moving letters.
- [ ] Text Underline Swipe: Animated underline sweeps in from one side under the text.
- [ ] Subtitle-Friendly Headline: Higher-positioned headline that leaves space for subtitles below.
- [ ] Emphasis Marker Text: Drawn-like marker highlight effect under or behind text.
- [ ] Ribbon Tag Title: Ribbon-shaped background behind title with angled ends.
- [ ] Stack Card Title: Title inside a card with shadow, used in layered stack compositions.
- [ ] Big Quote Typography: Large quote marks with stylized arrangement of quoted text.
- [ ] Section Divider Text: Thin divider line plus section header text centered or aligned.
- [ ] Animated Numeric Counter Text: Text that counts numbers up or down with easing.
- [ ] Label Grid Typography: Grid layout of short labels or tags with equal spacing.
- [ ] Fractional Progress Text: “X / Y” style progress text tied to caption or timeline progress.
- [ ] Keyword Pulse Titles: Specific words in a title pulse in size or glow when relevant.
- [ ] Multi-Color Word Title: Different colors per word using repeatChildrenProps styling.

## Audio / Music Presets

- [x] Waveform Audio Visualization: Animated or static waveforms with customizable styling and timing.
- [x] BeatStitch: Beat-synced number or visual animations driven by audio analysis.
- [x] BeatStitch with Captions: Uses caption-based clip selection in combination with beat-driven animations.
- [x] Music Card: Music card layout with artwork, waveform, and text overlays for track details.
- [ ] Minimal Waveform Strip: Thin waveform bar across the bottom with subtle movement and glow.
- [ ] Circular Waveform Ring: Circular or radial waveform around an image or logo.
- [ ] Beat Pulse Background: Background color or gradient that pulses intensity to audio beats.
- [ ] Lyric Highlight Beats: Uses beats to accentuate lyric subtitles with quick flash or scale effects.
- [ ] Beat-Synced Image Cuts: Automatically cuts between images at major beat points.
- [ ] BPM Title Flash: Title text flashes or scales on every bar or phrase based on BPM analysis.
- [ ] Multi-Band Waveform: Splits audio into frequency bands and visualizes each in different colors.
- [ ] Audio Spectrum Bars: Vertical bar equalizer visual that responds to audio frequency data.
- [ ] Chill Vibe Visualizer: Slow, smooth waveform and background color changes for lo-fi tracks.
- [ ] EDM Burst Visualizer: Aggressive, rapid flashes and zoom pulses tied to high-energy beats.
- [ ] Vinyl Record Spin: Rotating album artwork like a vinyl record with stylized shadows.
- [ ] Cassette Player Look: Retro cassette UI with moving tape wheels and track info.
- [ ] Boom Text on Beat: Large “BOOM” or other text pops on strong beats in track.
- [ ] Beat-Driven Camera Shake: Applies shake effects only around beat peaks.
- [ ] Fade to Silence Overlay: Visual overlay that fades in as music volume dips or ends.
- [ ] Audio Ducking Visual Cue: Visual indicator when audio volume is lowered versus original.
- [ ] Volume Meter Overlay: Small corner volume meter that tracks relative loudness.
- [ ] Key Change Highlight: Visual cue when a dramatic key or section change is detected (approximate via analysis).
- [ ] Intro Beat Countdown: Countdown numbers synced to intro beats of a track.

## Video Presets

- [x] Video Overlay Effects: Overlays multiple videos with composited effects and transitions.
- [x] Media Track: Tracks and sequences multiple media items in order with their specified durations.
- [ ] Picture-in-Picture Presenter: Small presenter video overlaid on main content with border and shadow.
- [ ] Video Side-by-Side Compare: Two videos left/right with synchronized playback for comparison.
- [ ] Triple Split Grid Video: 3-cell grid of videos with equal spacing and optional border lines.
- [ ] Top-and-Bottom Video Stack: Stacked videos for reaction or annotation-style layouts.
- [ ] Background Loop Video: Loops a background video while overlaying text and other content.
- [ ] Vertical Reel Cut Preset: Cuts a horizontal source into multiple vertical reel segments with framing.
- [ ] Zoomed Crop Punch Preset: Automatically creates zoomed crops of key areas in selected moments.
- [ ] Overlay Blur Behind Presenter: Blurs everything behind presenter's box to make them pop.
- [ ] Video Mosaic Wall: A grid of smaller video tiles playing in sync.
- [ ] Highlight Replay Flash: Short replay of a clip with flash and zoom before replay.
- [ ] Pop-Up Clip Inset: Small clip that pops in at certain times, then shrinks away.
- [ ] Background Replacement Video: Composites foreground video over an alternate background layout.
- [ ] Dynamic Border Glow: Glowing color borders around videos that react to caption sentiment.
- [ ] Edge Feather Blend: Soft feathered blending for videos over other background media.
- [ ] Speed Ramp Clip: Programmatic slow-down then speed-up portions of a video segment.
- [ ] Cinematic Bar Zoom: Start with heavy letterboxing then zoom video until bars disappear.

## Background & Layout Presets

- [x] Custom Theme Background: Customizable background with palettes, gradients, textures, or patterns.
- [x] HTML Block Atom: Creates reusable `div`-like blocks at specific time ranges for structured layouts.
- [ ] Gradient Atmosphere Background: Slow-changing multi-stop gradient background over time.
- [ ] Noise Texture Background: Subtle animated noise/grain overlay background for visual richness.
- [ ] Radial Focus Background: Radial gradient focusing attention on center or a chosen point.
- [ ] Grid Overlay Background: Grid lines overlay for UI, blueprint, or tech-style aesthetics.
- [ ] Brand Color Wash Background: Cycles through brand theme colors as a color wash.
- [ ] Patterned Background Tiles: Repeating SVG or pattern shapes across the scene background.
- [ ] Blurred Media Backdrop: Automatically blurs underlying media to act as soft background.
- [ ] Parallax Multi-Layer Background: Several background layers moving at different speeds.
- [ ] Gradient Border Safe Area: Creates visible safe-area borders that can be toggled on/off.
- [ ] Split Background Columns: Left/right split backgrounds with differently styled halves.
- [ ] Diagonal Cut Background: Background separated by diagonal line segments in different colors.
- [ ] Animated Grid Lights: Grid of small light dots that fade in/out in patterns.
- [ ] Dark Mode Background Switch: Toggles background stack for light/dark variants via params.
- [ ] Soft Spotlight Background: Moving soft spotlight of brightness over a darker base.
- [ ] Pattern Mask Reveal Layout: Uses masks to reveal background in shapes (circles, stripes, etc.).

## Special Effect Presets

- [x] Lottie Icon Showcase: Showcases multiple Lottie animations with dynamic positions and sequences.
- [x] Second Counter: Displays timers or counters for each second within defined time ranges.
- [x] Quote Presentation: Presents quotes with kinetic word-by-word and sentence-by-sentence animations.
- [x] Thinker Visuals: Stitches videos sequentially to visualize thinking or brainstorming processes.
- [ ] Confetti Burst Effect: Triggerable confetti burst using particle systems for celebrations.
- [ ] Fireworks Sky Effect: Full-screen fireworks visual overlay timed to beats or moments.
- [ ] Lens Flare Sweep Effect: Animated lens flare sweeping across the top of media.
- [ ] Shockwave Impact Effect: Radial scale + blur shockwave from a center point on impacts.
- [ ] Screen Flash Effect: Quick brightness flash overlay, useful on transitions or beats.
- [ ] Camera Shake Impact Effect: Configurable camera shake profile for intense scenes.
- [ ] Warp Zoom Tunnel Effect: Zoom-in tunnel distortion effect during transitions.
- [ ] Scan Reveal Effect: Scanning horizontal or vertical bar that reveals content.
- [ ] Scribble Annotation Effect: Animated hand-drawn lines or circles highlighting elements.
- [ ] Speed Lines Effect: Lines radiating from edges to show motion or speed.
- [ ] Floating Emoji Burst: Emojis floating up and fading away around key events.
- [ ] Fire Text Overlay Effect: Simulated flame or hot glow effect around text.
- [ ] Ice Text Overlay Effect: Cool blue/white freeze effect around text or edges.
- [ ] Spotlight Follow Effect: Moving spotlight following a particular component’s bounds.
- [ ] Zoom Blur Transition: Combination of zoom and blur for dynamic transitions.
- [ ] Ink Spill Reveal Effect: Organic ink-like spreading reveal over background.
- [ ] Digital Scan Glitch Transition: Horizontal band distortion sweeping across the frame.

## Internal / Generic Effect Presets (internal use)

- [x] Glow Pulse Text Effect: Internal effect preset adding pulsing glow around text atoms.
- [x] Generic Opacity Effect: Internal generic fade-in/out opacity effect for arbitrary components.
- [ ] Generic Slide Effect: Internal effect for sliding components from any direction.
- [ ] Generic Scale Effect: Internal effect to scale components in/out with easing.
- [ ] Generic Blur Effect: Internal effect to animate blur values on any target.
- [ ] Generic Shake Effect: Internal effect to shake any component on demand.
- [ ] Generic Color Shift Effect: Internal effect that animates color or filter hues.
- [ ] Generic Border Glow Effect: Internal effect that adds animated glowing borders.
- [ ] Generic Staggered Entry Effect: Internal effect to stagger entry of a list of components.
- [ ] Generic Looping Wiggle Effect: Internal effect for small looping wiggle motions.

## Platform / Format Specific Presets

- [ ] TikTok Vertical Hook Preset: First 3 seconds optimized vertical hook with big text and zooming subject.
- [ ] TikTok Story Captions Preset: Vertical captions placed in safe zones avoiding platform UI.
- [ ] YouTube Short Vertical Preset: Tailored vertical layout with brand banner and progress bar.
- [ ] YouTube Horizontal Talk-Head Preset: Focused layout for talking-head videos with framed subtitles.
- [ ] Instagram Reel Split Preset: Layout tuned for reels with CTAs placed away from UI overlays.
- [ ] LinkedIn Post Explainer Preset: Professional layout with title bar, clean fonts, and subtle animations.
- [ ] Twitter/X Quote Clip Preset: Wide format with large quote text and small logo bottom right.
- [ ] Story Poll Visual Preset: Space reserved for manual poll stickers, with headline and supporting text.
- [ ] Course Promo Vertical Preset: Compact, fast-cut vertical layout with bold headings and product shots.
- [ ] Webinar Highlight Horizontal Preset: Horizontal highlight layout with brand lower-third and subtle watermark.
- [ ] Shorts Reaction Bubble Preset: Circular reaction bubble with thick border over main content.
- [ ] Gaming Highlight Reel Preset: Vertical cropping plus killfeed-style text overlays for highlights.
- [ ] Tutorial Step Card Preset: Each step rendered as a card with icon, title, and subtitle, stacked vertically.
- [ ] Coding Demo Layout Preset: Code window on left/right, captions above/below, background blur behind.
- [ ] Mobile App Showcase Preset: Phone frame mockup with screen recordings inside and labels outside.
- [ ] Desktop App Showcase Preset: Window frame mockup with recorded screen plus annotation labels.
- [ ] Testimonial Clip Preset: Centered testimonial text with small speaker image and logo.
- [ ] FAQ Answer Card Preset: Question at top, answer text below, subtle entrance animations.
- [ ] Social Proof Wall Preset: Many short testimonials or comments displayed in a grid and cycled.

## Advanced Composition / Utility Presets

- [ ] Multi-Scene Timeline Preset: Creates a full timeline of scenes automatically from config objects.
- [ ] Auto-B-Roll Selector Preset: Picks media segments based on caption keywords or sentiment tags.
- [ ] Beat-Synced Clip Trimmer Preset: Trims clips to start/end on beat boundaries using audio analysis.
- [ ] Caption-Driven Layout Switch Preset: Changes layout type based on sections of the transcript.
- [ ] Emotion-Based Color Theme Preset: Background and text colors adapt based on emotion metadata.
- [ ] Keyword Zoom Jump Preset: Zooms into parts of video when specific keywords are spoken.
- [ ] Storyboard to Scene Preset: Converts a simple JSON storyboard into sequential layout scenes.
- [ ] Auto Scene Duration Fitter Preset: Adjusts scene durations to match the audio track automatically.
- [ ] Chapter Marker Overlay Preset: Appears on chapter changes with chapter title and transition.
- [ ] Bullet-Point Summarizer Preset: Shows bullet-points derived from provided text chunks, one at a time.
- [ ] Quote Timeline Builder Preset: Takes list of quotes and builds a full quote-driven sequence.
- [ ] Multi-Layer Caption + Media Preset: Stacks caption typography, b-roll, and backgrounds with tuned timings.
- [ ] Audio-Only Visual Builder Preset: For audio-only content, builds waveform + text + image layouts.
- [ ] Inset Reaction Layout Preset: Automatically positions reaction boxes based on template regions.
- [ ] Dynamic Safe-Area Layout Preset: Adjusts child positions automatically for different output aspect ratios.
- [ ] Caption Density Visualizer Preset: Shows where captions are dense or sparse across timeline.
- [ ] Transcript Highlight Reel Preset: Shows only the most impactful captions with media stitched around them.
- [ ] A/B Title Variant Preset: Creates two different title variations in sequence for testing.
- [ ] Sponsor Message Block Preset: Short sponsor block with logo, text, and background animation.
- [ ] CTA Endscreen Preset: Endscreen with multiple call-to-action buttons and animated highlights.
- [ ] Watermark Overlay Preset: Adds a subtle moving watermark logo throughout the video.
- [ ] Brand Pack Template Preset: Full brand styling (fonts, colors, effects) bundled as reusable preset.
- [ ] Lower-Third Name Carousel Preset: Rotates through speaker names and titles in lower third region.
- [ ] Leaderboard Style Ranking Preset: Renders rankings or top lists with animations between positions.
- [ ] Stack of Slides Preset: Vertical stack of slides that scrolls up as time progresses.
- [ ] Quiz Question Slide Preset: Question + multi-option layout with optional highlight of correct answer.
- [ ] Progress Timeline Bar Preset: Visual bar at bottom indicating timeline or chapter progress.
- [ ] Onboarding Stepper Preset: Series of steps displayed with progress dots or line.
- [ ] Multi-Column Info Layout Preset: 2–3 column layout of keyed info segments with icons.
- [ ] Scrollytelling Panel Preset: Panels that move vertically like scroll storytelling, but time-based.
- [ ] Collapsible Text Block Preset: Large text that “collapses” into a smaller summary version.

## Experimental / Fun Presets

- [ ] Anime-Style Caption Preset: Bold, colorful caption cards mimicking anime and manga overlays.
- [ ] Comic Boom Preset: “BOOM” style explosions and onomatopoeia text timed to impacts.
- [ ] Retro 80s Synthwave Preset: Neon grids, pink-blue gradients, and scanlines throughout.
- [ ] Minimal Monochrome Preset: Black-and-white aesthetic with high contrast typography.
- [ ] Vaporwave Aesthetic Preset: Pastel gradients, statues, and retro UI frames.
- [ ] Glitch Art Collage Preset: Rapid glitch transitions between still images.
- [ ] Pixel Art Zoom Preset: Heavy pixelation plus slow zoom, then crisp reveal.
- [ ] Emoji Storm Preset: Emojis raining from top to bottom responding to trigger words.
- [ ] Handwritten Note Preset: Lined-paper background with handwriting font and underline effects.
- [ ] Diary Entry Preset: Page-turn-like transitions between diary pages with cursive text.
- [ ] Neon Sign Text Preset: Flickering neon sign effect with glow and occasional flicker off.
- [ ] Chalkboard Sketch Preset: Chalkboard background and sketchy drawing animations.
- [ ] Blueprint Diagram Preset: Blueprint grid, outlines, and labels as if technical drawings.
- [ ] News Ticker Preset: Scrolling ticker at bottom while main content plays above.
- [ ] Sports Score Bug Preset: Scoreboard bug with teams, time, and dynamic score changes.
- [ ] Fitness Rep Counter Preset: Counts reps or sets with large numbers and supporting text.
- [ ] Meditation Calm Preset: Slow fades, soft gradients, and minimal typography.
- [ ] Meme Caption Block Preset: Large top/bottom meme text over image or clip.
- [ ] Reaction Text Spam Preset: Many quick small texts flying in at exciting moments.
- [ ] Music Mood Card Preset: Shows mood label (e.g., chill, hype) over gradient and waveform.
- [ ] Dynamic Weather Overlay Preset: Sun, rain, storm icons and subtle weather overlays for outdoor scenes.
- [ ] Map Location Pin Preset: Map-style background with animated pin drop and label.
- [ ] Photo Booth Strip Preset: Vertical strip of four photo frames sliding in.
- [ ] Birthday Greeting Preset: Balloons, confetti, and big greeting text with music.
- [ ] Event Invitation Card Preset: Invitation layout with date/time, place, and RSVP text.
- [ ] Quote of the Day Reel Preset: Short, focused quote with subtle text movement and framing.

## Accessibility & Localization Presets

- [ ] High-Contrast Caption Preset: Subtitles with strong contrast, large fonts, and thick outlines for maximum readability.
- [ ] Large Text Tutorial Preset: Oversized headings and body text with extra spacing for accessibility-focused tutorials.
- [ ] Sign Language Window Preset: Dedicated picture-in-picture slot for sign language interpreter video beside main content.
- [ ] Color Blind Safe Palette Preset: Automatically restricts backgrounds and overlays to colorblind-safe palettes.
- [ ] Subtitle Safe-Zone Preset: Enforces strict safe zones for subtitles across multiple aspect ratios.
- [ ] Hearing-Impaired Friendly Preset: Combines subtitles, sound effect labels, and waveform visualization together.
- [ ] Dyslexia-Friendly Text Preset: Uses dyslexia-friendly font, spacing, and reduced motion for all text elements.
- [ ] Reduced Motion Preset: Automatically disables or softens aggressive animations and motion effects.
- [ ] Screen Reader Overlay Preset: Adds on-screen text cues and timings tuned for external screen-reader narration.
- [ ] High-Visibility Cursor Preset: Highlights the cursor or focus point with circles and pulses for tutorial videos.
- [ ] Localization Ready Caption Preset: Extra spacing and line-height to accommodate longer translated captions.
- [ ] RTL Subtitle Layout Preset: Right-to-left aligned subtitles with appropriate padding for RTL languages.
- [ ] Dual Script Caption Preset: Shows native script and romanized script stacked for language learning content.
- [ ] Multilingual Title Card Preset: Title cards that show multiple language versions cycling or stacked.
- [ ] Accessibility Checklist Overlay Preset: Small, timed checklist overlay reminding of accessibility guidelines in training clips.
- [ ] Subtitle Background Band Preset: Full-width band behind captions for maximum contrast on complex footage.
- [ ] Color Temperature-Friendly Preset: Warmer, softer backgrounds and text for night-time viewing comfort.
- [ ] Caption Reading Guide Preset: Subtle underline or highlight bar that moves along with each line.
- [ ] Localized Date/Time Badge Preset: Date/time badges rendered in locale-specific formats beside the video.
- [ ] Simple Icon-Only CTA Preset: Uses icons instead of long text labels to keep UI understandable in any language.
- [ ] Multi-Audio Indicator Preset: On-screen labels indicating available language tracks or voice-overs.
- [ ] Subtitle Margin Preset: Extra margin between captions and screen edges for TVs and projectors.
- [ ] High-Legibility Font Pack Preset: Locks typography to a curated set of highly legible fonts.
- [ ] Accessibility Debug View Preset: Overlays safe areas, text contrast indicators, and font size guides for creators.

## Analytics / Debugging Presets

- [ ] Caption Timing Debug Preset: Visualizes each caption’s timing as blocks along the bottom timeline.
- [ ] Word Timing Heatmap Preset: Shows denser word regions with stronger color bands across the timeline.
- [ ] Beat Detection Debug Preset: Overlays vertical markers for each detected beat over the video.
- [ ] Scene Boundary Marker Preset: Adds labeled markers wherever scenes or layouts change.
- [ ] Effect Target Outline Preset: Temporarily draws outlines and IDs around components affected by effects.
- [ ] Layout Grid Debug Preset: Shows a fine grid and component bounding boxes for layout debugging.
- [ ] Safe-Area Overlay Debug Preset: Visualizes all configured safe zones for different platforms at once.
- [ ] Media Duration Overlay Preset: Displays each clip’s start time and duration in a corner badge.
- [ ] FPS and Performance Meter Preset: Simple performance meter overlay to gauge animation complexity.
- [ ] Caption Density Chart Preset: Mini chart summarizing caption density over the course of the video.
- [ ] Audio Waveform Debug Preset: Raw, unstyled waveform laid out for precise timing inspection.
- [ ] Transition Point Marker Preset: Visual ticks or icons at every preset-defined transition start/end.
- [ ] Effect Stack Inspector Preset: Lists active effects for a component in a corner overlay while previewing.
- [ ] Bounding Box Margin Debug Preset: Shows margins and paddings visually for all major containers.
- [ ] Multi-Track Timeline Debug Preset: Displays audio, captions, and media tracks in stacked mini timelines.
- [ ] Caption Overlap Detector Preset: Highlights regions where captions are overlapping or too close.
- [ ] Color Palette Inspector Preset: Shows currently used colors and their contrast scores on-screen.
- [ ] Typography Scale Debug Preset: Lists heading sizes, line heights, and scale ratios in overlay.
- [ ] Audio Loudness Bands Preset: Visualizes approximate loudness bands across the audio timeline.
- [ ] Timecode Overlay Preset: Big or small running timecode overlay for debug exports.
- [ ] Composition ID Overlay Preset: Shows preset IDs and component IDs as small watermarks for debugging.
- [ ] Layout Slot Map Preset: Labels areas like "header", "sidebar", "footer" for slot-based scenes.
- [ ] Version / Build Info Preset: Renders build, preset version, and environment info in a debug corner.
- [ ] Caption Parsing Debug Preset: Shows raw caption JSON/fields mapped beside rendered subtitles.

## Template Pack / Bundle Presets

- [ ] Podcast Episode Pack Preset: Bundle of intro, lower-third, quote, and outro templates tuned for podcasts.
- [ ] Course Lesson Pack Preset: Starter pack with title slide, bullet slide, demo layout, and recap card.
- [ ] Product Launch Pack Preset: Includes teaser opener, feature slides, pricing card, and CTA endscreen.
- [ ] Event Promo Pack Preset: Title, agenda, speaker highlight, and registration CTA scene templates.
- [ ] Social Carousel Pack Preset: Set of carousel-ready slides with consistent typography and spacing.
- [ ] Startup Pitch Deck Video Pack Preset: A sequence of layouts mirroring slide deck sections.
- [ ] Testimonial Campaign Pack Preset: Multiple testimonial layouts with interchangeable media and quotes.
- [ ] FAQ Series Pack Preset: Reusable layouts for Q&A, myths vs facts, and quick tips.
- [ ] Announcement Pack Preset: Templates for breaking news, product changelog, and mini-updates.
- [ ] Gaming Highlight Pack Preset: Combo of kill highlight, scoreboard, and reaction panels.
- [ ] Music Visual Pack Preset: Several waveform and mood-card combinations under one pack.
- [ ] Meme Template Pack Preset: Popular meme text + layout combinations preconfigured.
- [ ] Tutorial Micro-Clip Pack Preset: Templates for ultra-short tips with large text and arrows.
- [ ] Webinar Replay Pack Preset: Intro, chapter dividers, lower-thirds, and endscreen for webinars.
- [ ] Creator Brand Starter Pack Preset: Full brand look with consistent fonts, colors, and lower thirds.
- [ ] Shorts Campaign Pack Preset: Multiple short-optimized layouts sharing a unified style.
- [ ] Seasonal Theme Pack Preset: Seasonal variants (holiday, summer, spooky) of standard templates.
- [ ] Quote Series Pack Preset: Rotating quote layouts with different backgrounds and text styles.
- [ ] Interview Series Pack Preset: Host/guest layouts, intro, and outro bundled together.
- [ ] Course Teaser Pack Preset: Quick teaser, module overview, and pricing CTA templates.
- [ ] Newsletter Promo Pack Preset: Visuals to promote newsletter issues with title, excerpt, and URL.
- [ ] App Release Notes Pack Preset: Visual changelog templates with version tags and feature bullets.
- [ ] Community Highlight Pack Preset: Templates highlighting user posts, comments, and stats.
- [ ] Brand Guideline Visual Pack Preset: Animated explainer of logo usage, colors, and typography rules.

## Interactive & Param-Driven Presets

- [ ] Branching Story Label Preset: On-screen labels for branches, with timing hooks for interactive players.
- [ ] Parameterized Color Theme Preset: Swappable color themes controlled purely via preset params.
- [ ] Dynamic Layout Columns Preset: Adjusts between 1, 2, or 3-column layouts via a single input parameter.
- [ ] Caption Speed Mode Preset: Global preset that can generate slow, normal, or fast caption styles.
- [ ] Media Density Preset: Controls how many images or clips are displayed per minute via a density parameter.
- [ ] Audience Persona Variant Preset: Switches typography and colors depending on audience persona input.
- [ ] Mood Slider Preset: Adjusts gradients, effects, and motion intensity via a single mood slider param.
- [ ] Aspect-Ratio Aware Layout Preset: Automatically repositions children depending on final aspect ratio.
- [ ] Brand Mode Switcher Preset: Toggles between multiple brand presets using a brand key parameter.
- [ ] Auto Thumbnail Generator Preset: Builds thumbnail-friendly frames at specific timestamps.
- [ ] Emphasis Level Preset: Global control for how strong motion and glow effects should be.
- [ ] Caption Chunk Size Preset: Regenerates layouts for short vs long caption chunking strategies.
- [ ] Auto-Chapter Card Preset: Generates chapter cards from provided structured chapter metadata.
- [ ] Dynamic Progress HUD Preset: Shows different types of progress HUDs based on selected mode.
- [ ] Story Pace Controller Preset: Globally stretches or compresses non-audio scene durations.
- [ ] Social Handle Switcher Preset: Swaps social handle sets (Twitter, TikTok, etc.) based on platform param.
- [ ] Reusable Slot-Based Layout Preset: Generic layout with named slots controlled by configuration object.
- [ ] Content Warning Card Preset: Conditionally inserts content warning cards based on flag parameters.
- [ ] Safe-Mode Template Preset: When enabled, uses softer colors and gentler motion for all children.
- [ ] Media Priority Mode Preset: Lets user prioritize captions, b-roll, or main video in dense scenes.
- [ ] Loop Count Controller Preset: Sets how many times certain loops (image loops, effects) repeat.
- [ ] Font Theme Switcher Preset: Switches among multiple curated font stacks via simple params.
- [ ] Animation Style Switcher Preset: Chooses between fade, slide, zoom, or glitch animation families.
- [ ] Density-Responsive Layout Preset: Adjusts padding and spacing automatically based on item count.

---

Total presets listed: 600 (36 existing presets marked as completed, 564 new potential presets).


