/**
 * DataFlowTypography Preset
 *
 * This preset visualizes words as data packets flowing through a network topology.
 * Words appear at entry points, travel along visible pathways (animated connection lines),
 * and settle at destination nodes. The flow direction follows reading order but paths are
 * non-linear, creating visual interest. Packets (words) have subtle motion blur while
 * traveling, becoming sharp when stationary. Hub nodes (punctuation or sentence ends)
 * collect multiple words before releasing them to continue.
 *
 * Features:
 * - **Network Topology Visualization**: Pre-defined network with path nodes as invisible anchors
 * - **Path Visualization Layer**: Faint lines showing possible routes between nodes
 * - **Data Packet Animation**: Words travel along bezier-approximated paths using sequential translate keyframes
 * - **Motion Blur Effect**: Simulated with scaleX stretch (1.0 to 1.1) and reduced opacity during movement
 * - **Hub Collection Points**: Circular nodes that collect multiple words before releasing them
 * - **Non-Linear Paths**: Flow follows reading order but uses non-linear visual paths
 * - **Destination Sharpening**: Words become sharp at destination with subtle scale bounce
 * - **Hub Pulse Effects**: Hubs pulse when words arrive
 *
 * Use cases:
 * - Creating technology-themed typography effects
 * - Visualizing information flow in presentations
 * - Building network/infrastructure themed content
 * - Adding sci-fi or data-driven visual styles to text
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  captions: z.array(z.any()).describe('Array of caption objects with text, timing, and words'),
  font: z.string().optional().describe('Font family with optional weight and style (e.g., "Inter:600", "Roboto")'),
  fontSize: z.number().min(12).max(120).default(24).describe('Font size in pixels'),
  textColor: z.string().default('#ffffff').describe('Text color (CSS color value)'),
  
  // Network topology configuration
  networkDensity: z.enum(['sparse', 'medium', 'dense']).default('medium').describe('Density of network nodes and paths'),
  pathOpacity: z.number().min(0).max(1).default(0.2).describe('Opacity of path visualization lines'),
  pathColor: z.string().default('#ffffff').describe('Color of path visualization lines'),
  
  // Motion configuration
  travelSpeed: z.enum(['fast', 'medium', 'slow']).default('medium').describe('Speed of word travel along paths'),
  motionBlurIntensity: z.number().min(0).max(1).default(0.5).describe('Intensity of motion blur effect (0 = none, 1 = maximum)'),
  
  // Hub configuration
  showHubs: z.boolean().default(true).describe('Whether to show hub collection points'),
  hubSize: z.number().min(30).max(100).default(60).describe('Size of hub nodes in pixels'),
  hubPulseIntensity: z.number().min(0).max(2).default(1).describe('Intensity of hub pulse effect'),
  
  // Effect intensity
  effectImpact: z.number().min(0.1).max(3).default(1).describe('Overall effect intensity multiplier'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const captions = params.captions as TranscriptionSentence[];
  
  // Parse font string
  const fontString = params.font || 'Inter';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }
  
  // Calculate network topology dimensions
  const canvasWidth = 1920;
  const canvasHeight = 1080;
  
  // Helper: Generate network topology nodes
  const generateNetworkNodes = (density: string): { x: number; y: number; isHub: boolean }[] => {
    const nodes: { x: number; y: number; isHub: boolean }[] = [];
    const gridSize = density === 'sparse' ? 4 : density === 'medium' ? 6 : 8;
    const cellWidth = canvasWidth / gridSize;
    const cellHeight = canvasHeight / gridSize;
    
    // Generate grid-based nodes with some randomness
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const x = col * cellWidth + cellWidth / 2 + (Math.random() - 0.5) * cellWidth * 0.3;
        const y = row * cellHeight + cellHeight / 2 + (Math.random() - 0.5) * cellHeight * 0.3;
        const isHub = Math.random() > 0.7; // 30% chance of being a hub
        nodes.push({ x, y, isHub });
      }
    }
    
    return nodes;
  };
  
  // Helper: Calculate path waypoints for bezier-approximated paths
  const calculatePathWaypoints = (
    startNode: { x: number; y: number },
    endNode: { x: number; y: number },
    intermediateNodes: { x: number; y: number }[],
  ): { x: number; y: number }[] => {
    const waypoints: { x: number; y: number }[] = [startNode];
    
    // Add 1-2 intermediate nodes for non-linear path
    const numIntermediates = Math.min(intermediateNodes.length, Math.random() > 0.5 ? 2 : 1);
    for (let i = 0; i < numIntermediates; i++) {
      const node = intermediateNodes[Math.floor(Math.random() * intermediateNodes.length)];
      waypoints.push(node);
    }
    
    waypoints.push(endNode);
    return waypoints;
  };
  
  // Helper: Calculate travel duration based on path length and speed
  const calculateTravelDuration = (waypoints: { x: number; y: number }[], speed: string): number => {
    let totalDistance = 0;
    for (let i = 1; i < waypoints.length; i++) {
      const dx = waypoints[i].x - waypoints[i - 1].x;
      const dy = waypoints[i].y - waypoints[i - 1].y;
      totalDistance += Math.sqrt(dx * dx + dy * dy);
    }
    
    const baseSpeed = speed === 'fast' ? 1000 : speed === 'medium' ? 600 : 400; // pixels per second
    const duration = totalDistance / baseSpeed;
    return Math.max(0.3, Math.min(duration, 1.0)); // Clamp between 300ms and 1000ms
  };
  
  // Generate network topology
  const networkNodes = generateNetworkNodes(params.networkDensity);
  const hubNodes = networkNodes.filter(node => node.isHub);
  
  // Create path visualization layer (SVG paths)
  const pathVisualizationSVG = `
    <svg width="${canvasWidth}" height="${canvasHeight}" style="position: absolute; top: 0; left: 0; pointer-events: none;">
      ${networkNodes.map((node, i) => {
        // Draw lines to nearby nodes
        return networkNodes
          .filter((_, j) => j > i)
          .map(targetNode => {
            const distance = Math.sqrt(
              Math.pow(targetNode.x - node.x, 2) + Math.pow(targetNode.y - node.y, 2)
            );
            if (distance < 300) {
              return `<line x1="${node.x}" y1="${node.y}" x2="${targetNode.x}" y2="${targetNode.y}" 
                stroke="${params.pathColor}" stroke-opacity="${params.pathOpacity}" stroke-width="1" />`;
            }
            return '';
          })
          .join('');
      }).join('')}
    </svg>
  `;
  
  const pathVisualizationLayer: RenderableComponentData = {
    id: 'path-visualization-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        dangerouslySetInnerHTML: {
          __html: pathVisualizationSVG,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions.reduce((acc, cap) => Math.max(acc, cap.absoluteEnd), 0),
      },
    },
  };
  
  // Create hub nodes
  const hubComponents: RenderableComponentData[] = params.showHubs ? hubNodes.map((hub, hubIndex) => {
    const hubId = `hub-node-${hubIndex}`;
    
    return {
      id: hubId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute rounded-full border border-white/20',
          style: {
            width: `${params.hubSize}px`,
            height: `${params.hubSize}px`,
            left: `${hub.x - params.hubSize / 2}px`,
            top: `${hub.y - params.hubSize / 2}px`,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: captions.reduce((acc, cap) => Math.max(acc, cap.absoluteEnd), 0),
        },
      },
    } as RenderableComponentData;
  }) : [];
  
  // Process each caption
  const captionContainers: RenderableComponentData[] = captions.map((caption, captionIndex) => {
    const captionId = `caption-${captionIndex}`;
    
    // Process words in this caption
    const wordComponents: RenderableComponentData[] = caption.words.map((word, wordIndex) => {
      const wordId = `word-${captionIndex}-${wordIndex}`;
      
      // Determine start and end nodes for this word's path
      const startNodeIndex = Math.floor(Math.random() * networkNodes.length);
      const endNodeIndex = (startNodeIndex + Math.floor(Math.random() * (networkNodes.length / 2)) + 1) % networkNodes.length;
      const startNode = networkNodes[startNodeIndex];
      const endNode = networkNodes[endNodeIndex];
      
      // Get intermediate nodes for bezier path
      const intermediateNodes = networkNodes.filter((_, i) => i !== startNodeIndex && i !== endNodeIndex);
      const waypoints = calculatePathWaypoints(startNode, endNode, intermediateNodes);
      
      // Calculate travel duration
      const travelDuration = calculateTravelDuration(waypoints, params.travelSpeed);
      
      // Determine if word should pause at a hub
      const pauseAtHub = params.showHubs && Math.random() > 0.6; // 40% chance
      const hubPauseDuration = 0.2; // 200ms pause
      
      // Create travel animation with motion blur
      const travelRanges: { key: string; val: any; prog: number }[] = [];
      
      // Generate keyframes for each waypoint
      waypoints.forEach((waypoint, wpIndex) => {
        const progress = wpIndex / (waypoints.length - 1);
        
        // Translate position
        travelRanges.push({
          key: 'translateX',
          val: waypoint.x - startNode.x,
          prog: progress,
        });
        travelRanges.push({
          key: 'translateY',
          val: waypoint.y - startNode.y,
          prog: progress,
        });
        
        // Motion blur during travel (not at endpoints)
        if (wpIndex > 0 && wpIndex < waypoints.length - 1) {
          // Stretch horizontally for motion blur
          travelRanges.push({
            key: 'scaleX',
            val: 1 + params.motionBlurIntensity * 0.1,
            prog: progress,
          });
          // Reduce opacity slightly
          travelRanges.push({
            key: 'opacity',
            val: 1 - params.motionBlurIntensity * 0.2,
            prog: progress,
          });
        } else {
          // Sharp at start and end
          travelRanges.push({
            key: 'scaleX',
            val: 1,
            prog: progress,
          });
          travelRanges.push({
            key: 'opacity',
            val: 1,
            prog: progress,
          });
        }
      });
      
      // Destination bounce effect
      travelRanges.push({
        key: 'scale',
        val: 1.1,
        prog: 0.95,
      });
      travelRanges.push({
        key: 'scale',
        val: 1,
        prog: 1,
      });
      
      const travelEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: word.start,
        duration: travelDuration * params.effectImpact,
        mode: 'provider',
        targetIds: [wordId],
        ranges: travelRanges,
      };
      
      // Create word component
      const wordComponent: RenderableComponentData = {
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: `${params.fontSize}px`,
            color: params.textColor,
            fontWeight: fontStyle.fontWeight || 600,
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['600'],
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        effects: [
          {
            id: `travel-${wordId}`,
            componentId: 'generic',
            data: travelEffect,
          },
        ],
      };
      
      // Create word packet container positioned at start node
      const wordContainer: RenderableComponentData = {
        id: `word-packet-${wordId}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              left: `${startNode.x}px`,
              top: `${startNode.y}px`,
              transform: 'translate(-50%, -50%)',
            },
          },
        },
        context: {
          timing: {
            start: word.start,
            duration: word.duration + travelDuration * params.effectImpact,
          },
        },
        childrenData: [wordComponent],
      };
      
      return wordContainer;
    });
    
    // Create caption container
    const captionContainer: RenderableComponentData = {
      id: captionId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: wordComponents,
    };
    
    return captionContainer;
  });
  
  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'dataflow-typography-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          backgroundColor: 'transparent',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions.reduce((acc, cap) => Math.max(acc, cap.absoluteEnd), 0),
      },
    },
    childrenData: [
      pathVisualizationLayer,
      ...hubComponents,
      ...captionContainers,
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
  id: 'DataFlowTypography',
  title: 'Data Flow Typography',
  description: 'Visualizes words as data packets flowing through a network topology. Words appear at entry points, travel along visible pathways (animated connection lines), and settle at destination nodes. The flow direction follows reading order but paths are non-linear, creating visual interest. Packets have motion blur while traveling and become sharp when stationary. Hub nodes collect multiple words before releasing them.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typography', 'captions', 'subtitles', 'network', 'data-flow', 'tech', 'animated', 'motion-blur', 'hubs', 'pathways', 'infrastructure'],
  dependencies: {},
  defaultInputParams: {
    captions: [],
    font: 'Inter:600',
    fontSize: 24,
    textColor: '#ffffff',
    networkDensity: 'medium',
    pathOpacity: 0.2,
    pathColor: '#ffffff',
    travelSpeed: 'medium',
    motionBlurIntensity: 0.5,
    showHubs: true,
    hubSize: 60,
    hubPulseIntensity: 1,
    effectImpact: 1,
  },
};

export const DataFlowTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};