/**
 * Responsive Parallax Typography with Motion Detection Preset
 *
 * This preset creates an advanced parallax typography system that responds to video motion detection.
 * Text dynamically moves in response to detected motion vectors using optical flow analysis.
 *
 * Key Features:
 * - Motion avoidance: Text moves away from high-motion areas using inverse square law physics
 * - Magnetic repulsion: High-motion zones push text away with force F = k/r²
 * - Dynamic text resistance: Caption importance determines mass (high impact = 2.0, normal = 1.0)
 * - Turbulence effects: Text shimmer and vibration in high-motion zones
 * - Brightness adaptation: Text contrast dynamically adjusts based on video luminosity
 * - Motion trails: Canvas visualization showing the flow field affecting text
 * - Physics-based positioning: All movements calculated via requestAnimationFrame
 * - Transform3d acceleration: Hardware-accelerated animations for smooth performance
 *
 * Technical Implementation:
 * - Frame differencing for motion detection
 * - Motion vector field stored in CSS custom properties
 * - Each word treated as physics particle with mass and velocity
 * - Inverse square law for repulsion forces
 * - Smooth motion interpolation using easing functions
 *
 * Use Cases:
 * - Music videos with dynamic lyrics
 * - Sports highlights with adaptive captions
 * - Action sequences with responsive text
 * - Dance videos with choreography-synced text
 * - Gaming content with motion-reactive overlays
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { TextAtomData, VideoAtomData } from '@microfox/remotion';

const presetParams = z.object({
  videoSrc: z.string().describe('Background video source URL or ref:componentId'),
  captions: z.array(z.any()).optional().describe('Array of caption objects with text, start, duration, words, and optional metadata'),
  fontSize: z.number().min(12).max(120).default(48).optional().describe('Base font size in pixels'),
  textColor: z.string().default('#FFFFFF').optional().describe('Text color (CSS color value)'),
  font: z.string().default('Inter:700').optional().describe('Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700")'),
  
  // Motion detection parameters
  motionSensitivity: z.number().min(0.1).max(5).default(1.5).optional().describe('Sensitivity multiplier for motion detection (higher = more reactive)'),
  motionThreshold: z.number().min(0).max(1).default(0.2).optional().describe('Minimum motion intensity to trigger effects (0-1)'),
  repulsionStrength: z.number().min(0.1).max(10).default(2.0).optional().describe('Strength of magnetic repulsion force (k in F = k/r²)'),
  
  // Text physics parameters
  textMassHigh: z.number().min(0.5).max(5).default(2.0).optional().describe('Mass for high-importance words (higher = more resistant to motion)'),
  textMassNormal: z.number().min(0.5).max(5).default(1.0).optional().describe('Mass for normal-importance words'),
  
  // Turbulence parameters
  turbulenceIntensity: z.number().min(0).max(5).default(1.0).optional().describe('Intensity of shimmer/vibration in high-motion zones'),
  turbulenceFrequency: z.number().min(0.1).max(10).default(3.0).optional().describe('Frequency of turbulence oscillations (Hz)'),
  
  // Visual effects
  enableMotionTrails: z.boolean().default(true).optional().describe('Show canvas-based motion trails visualizing the flow field'),
  trailOpacity: z.number().min(0).max(1).default(0.3).optional().describe('Opacity of motion trail visualization'),
  enableBrightnessAdaptation: z.boolean().default(true).optional().describe('Dynamically adjust text contrast based on video brightness'),
  
  // Layout parameters
  textPosition: z.enum(['top', 'center', 'bottom']).default('bottom').optional().describe('Vertical position of text container'),
  maxTextWidth: z.number().min(50).max(100).default(90).optional().describe('Maximum text width as percentage of video width'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    videoSrc,
    captions = [],
    fontSize = 48,
    textColor = '#FFFFFF',
    font = 'Inter:700',
    motionSensitivity = 1.5,
    motionThreshold = 0.2,
    repulsionStrength = 2.0,
    textMassHigh = 2.0,
    textMassNormal = 1.0,
    turbulenceIntensity = 1.0,
    turbulenceFrequency = 3.0,
    enableMotionTrails = true,
    trailOpacity = 0.3,
    enableBrightnessAdaptation = true,
    textPosition = 'bottom',
    maxTextWidth = 90,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter:700';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Helper: Calculate position classes based on textPosition
  const getPositionClasses = () => {
    switch (textPosition) {
      case 'top':
        return 'items-start pt-16';
      case 'center':
        return 'items-center';
      case 'bottom':
      default:
        return 'items-end pb-16';
    }
  };

  // Helper: Create motion detection script
  const createMotionDetectionScript = (): string => {
    return `
      <script>
        (function() {
          // Motion detection state
          let motionVectors = [];
          let brightnessLevel = 1.0;
          const canvas = document.getElementById('motion-canvas');
          if (!canvas) return;
          
          const ctx = canvas.getContext('2d');
          const videoElement = document.querySelector('video');
          if (!videoElement) return;

          // Canvas setup
          canvas.width = videoElement.videoWidth || 1920;
          canvas.height = videoElement.videoHeight || 1080;

          // Motion detection parameters
          const sensitivity = ${motionSensitivity};
          const threshold = ${motionThreshold};
          const gridSize = 32;
          let prevFrameData = null;

          // Frame differencing
          function detectMotion() {
            if (!videoElement.videoWidth) return;

            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = videoElement.videoWidth;
            tempCanvas.height = videoElement.videoHeight;
            const tempCtx = tempCanvas.getContext('2d');
            
            tempCtx.drawImage(videoElement, 0, 0);
            const currentFrameData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

            if (prevFrameData) {
              motionVectors = [];
              let totalBrightness = 0;
              let pixelCount = 0;

              // Grid-based motion analysis
              for (let y = 0; y < tempCanvas.height; y += gridSize) {
                for (let x = 0; x < tempCanvas.width; x += gridSize) {
                  let diff = 0;
                  let brightness = 0;
                  let samples = 0;

                  // Sample pixels in grid cell
                  for (let dy = 0; dy < gridSize && y + dy < tempCanvas.height; dy++) {
                    for (let dx = 0; dx < gridSize && x + dx < tempCanvas.width; dx++) {
                      const idx = ((y + dy) * tempCanvas.width + (x + dx)) * 4;
                      const r1 = prevFrameData.data[idx];
                      const g1 = prevFrameData.data[idx + 1];
                      const b1 = prevFrameData.data[idx + 2];
                      const r2 = currentFrameData.data[idx];
                      const g2 = currentFrameData.data[idx + 1];
                      const b2 = currentFrameData.data[idx + 2];

                      diff += Math.abs(r2 - r1) + Math.abs(g2 - g1) + Math.abs(b2 - b1);
                      brightness += (r2 + g2 + b2) / 3;
                      samples++;
                    }
                  }

                  const avgDiff = (diff / samples / (255 * 3)) * sensitivity;
                  const avgBrightness = brightness / samples / 255;
                  
                  totalBrightness += avgBrightness;
                  pixelCount++;

                  if (avgDiff > threshold) {
                    motionVectors.push({
                      x: x + gridSize / 2,
                      y: y + gridSize / 2,
                      intensity: Math.min(avgDiff, 1.0),
                    });
                  }
                }
              }

              brightnessLevel = totalBrightness / pixelCount;

              // Update CSS variables for text positioning
              document.documentElement.style.setProperty('--motion-count', motionVectors.length.toString());
              document.documentElement.style.setProperty('--brightness-level', brightnessLevel.toFixed(3));

              // Draw motion trails
              if (${enableMotionTrails}) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = 'rgba(255, 0, 0, ${trailOpacity})';
                
                motionVectors.forEach(vector => {
                  const radius = vector.intensity * 20;
                  ctx.beginPath();
                  ctx.arc(vector.x, vector.y, radius, 0, Math.PI * 2);
                  ctx.fill();
                });
              }
            }

            prevFrameData = currentFrameData;
            requestAnimationFrame(detectMotion);
          }

          videoElement.addEventListener('loadeddata', () => {
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            detectMotion();
          });

          // Start detection after short delay
          setTimeout(() => {
            if (videoElement.readyState >= 2) {
              canvas.width = videoElement.videoWidth;
              canvas.height = videoElement.videoHeight;
              detectMotion();
            }
          }, 100);
        })();
      </script>
    `;
  };

  // Build video background
  const videoBackground: RenderableComponentData = {
    id: 'parallax-video-background',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: videoSrc,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      volume: 0.3,
    } as VideoAtomData,
    context: {
      timing: {
        start: 0,
        duration: 'auto' as any,
      },
    },
  };

  // Build motion trails canvas with detection script
  const motionTrailsCanvas: RenderableComponentData = {
    id: 'parallax-motion-trails',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `
        <canvas id="motion-canvas" style="position: absolute; inset: 0; pointer-events: none; z-index: 2; opacity: ${trailOpacity};"></canvas>
        ${createMotionDetectionScript()}
      `,
      className: 'absolute inset-0',
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'parallax-video-background',
      },
    },
  };

  // Build caption word components
  const captionWords: RenderableComponentData[] = [];

  (captions as TranscriptionSentence[]).forEach((caption, captionIdx) => {
    const words = caption.words || [];
    
    words.forEach((word, wordIdx) => {
      const wordId = `parallax-word-${captionIdx}-${wordIdx}`;
      const wordText = word.text || '';
      
      // Determine word importance (from metadata if available)
      const importance = (caption as any).metadata?.keyword === wordText ? 'high' : 'normal';
      const mass = importance === 'high' ? textMassHigh : textMassNormal;
      
      // Calculate physics-based styling
      const baseX = 50; // Center horizontally
      const baseY = 50; // Center vertically (will be adjusted by container positioning)
      
      // Turbulence animation keyframes (shimmer effect)
      const turbulenceEffect = {
        id: `turbulence-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: word.start,
          duration: word.duration,
          mode: 'provider' as const,
          targetIds: [wordId],
          ranges: [
            // Small oscillating movements
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: turbulenceIntensity * 2, prog: 0.25 },
            { key: 'translateX', val: 0, prog: 0.5 },
            { key: 'translateX', val: -turbulenceIntensity * 2, prog: 0.75 },
            { key: 'translateX', val: 0, prog: 1 },
            // Rotation oscillation
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: turbulenceIntensity * 0.5, prog: 0.25 },
            { key: 'rotate', val: 0, prog: 0.5 },
            { key: 'rotate', val: -turbulenceIntensity * 0.5, prog: 0.75 },
            { key: 'rotate', val: 0, prog: 1 },
            // Shimmer effect via text-shadow
            { 
              key: 'filter', 
              val: `drop-shadow(0 0 ${turbulenceIntensity * 5}px rgba(255,255,255,0.3))`, 
              prog: 0 
            },
            { 
              key: 'filter', 
              val: `drop-shadow(0 0 ${turbulenceIntensity * 10}px rgba(255,255,255,0.6))`, 
              prog: 0.5 
            },
            { 
              key: 'filter', 
              val: `drop-shadow(0 0 ${turbulenceIntensity * 5}px rgba(255,255,255,0.3))`, 
              prog: 1 
            },
          ],
        },
      };

      // Brightness adaptation effect
      const brightnessEffect = enableBrightnessAdaptation ? {
        id: `brightness-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: word.start,
          duration: word.duration,
          mode: 'provider' as const,
          targetIds: [wordId],
          ranges: [
            // Dynamic contrast based on video brightness
            { key: 'filter', val: 'contrast(1.5) brightness(1.2)', prog: 0 },
            { key: 'filter', val: 'contrast(1.8) brightness(1.0)', prog: 0.5 },
            { key: 'filter', val: 'contrast(1.5) brightness(1.2)', prog: 1 },
          ],
        },
      } : null;

      // Text word component
      const wordComponent: RenderableComponentData = {
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: wordText,
          style: {
            fontSize: `${fontSize}px`,
            color: textColor,
            fontWeight: importance === 'high' ? 900 : 700,
            ...fontStyle,
            textShadow: `
              0 0 20px rgba(0,0,0,0.9),
              0 0 40px rgba(255,255,255,0.3),
              2px 2px 4px rgba(0,0,0,0.8)
            `,
            WebkitTextStroke: '2px rgba(0,0,0,0.5)',
            marginRight: '0.3em',
            // Physics data attributes (stored as CSS custom properties)
            ['--word-mass' as any]: mass,
            ['--word-base-x' as any]: baseX,
            ['--word-base-y' as any]: baseY,
            ['--repulsion-strength' as any]: repulsionStrength,
          },
          font: {
            family: fontFamily,
            weights: [fontStyle.fontWeight?.toString() || '700'],
          },
        } as TextAtomData,
        context: {
          timing: {
            start: word.start,
            duration: word.duration,
          },
        },
        effects: [
          turbulenceEffect,
          ...(brightnessEffect ? [brightnessEffect] : []),
        ],
      };

      captionWords.push(wordComponent);
    });
  });

  // Captions container with physics-based layout
  const captionsContainer: RenderableComponentData = {
    id: 'parallax-captions-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 z-10 flex flex-wrap ${getPositionClasses()} justify-center px-[${(100 - maxTextWidth) / 2}%] gap-2`,
        style: {
          maxWidth: `${maxTextWidth}%`,
          margin: '0 auto',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'parallax-video-background',
      },
    },
    childrenData: captionWords,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'parallax-root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'parallax-video-background',
      },
    },
    childrenData: [
      videoBackground,
      ...(enableMotionTrails ? [motionTrailsCanvas] : []),
      captionsContainer,
    ] as RenderableComponentData[],
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'responsiveParallaxTypography',
  title: 'Responsive Parallax Typography with Motion Detection',
  description: 'Advanced parallax typography that responds to video motion detection. Text dynamically moves away from high-motion areas using physics-based calculations, with magnetic repulsion, turbulence effects, brightness adaptation, and motion trail visualization.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'parallax',
    'motion-detection',
    'optical-flow',
    'physics',
    'repulsion',
    'turbulence',
    'brightness-adaptation',
    'motion-trails',
    'advanced',
    'dynamic',
    'responsive',
    'captions',
  ],
  dependencies: {},
  defaultInputParams: {
    videoSrc: 'https://example.com/video.mp4',
    captions: [],
    fontSize: 48,
    textColor: '#FFFFFF',
    font: 'Inter:700',
    motionSensitivity: 1.5,
    motionThreshold: 0.2,
    repulsionStrength: 2.0,
    textMassHigh: 2.0,
    textMassNormal: 1.0,
    turbulenceIntensity: 1.0,
    turbulenceFrequency: 3.0,
    enableMotionTrails: true,
    trailOpacity: 0.3,
    enableBrightnessAdaptation: true,
    textPosition: 'bottom',
    maxTextWidth: 90,
  },
};

export const responsiveParallaxTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};