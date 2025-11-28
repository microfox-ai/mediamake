/**
 * Evidence Board Mystery Solver Preset
 * 
 * Creates a detective-style investigation board where words appear as evidence pieces
 * (photographs, newspaper clippings, handwritten notes, typed documents) pinned at various
 * angles with push pins, tape, or magnets. Features discovery animations (folder slides,
 * magnifying glass reveals, UV light), red string connections between related words, and
 * methodical hand movement simulations.
 * 
 * Features:
 * - Cork board texture background with gradient overlay
 * - Evidence pieces with varied styles: aged paper, photo borders, lined notepad
 * - Discovery animations: slide from folders, magnifying glass reveal, UV fade-in
 * - Push pins, tape, and magnet attachment styles with ::before pseudo-elements
 * - Red string connections using SVG paths between related words
 * - Hand cursor simulation with bezier curve movements
 * - Paper flutter effects with rotateY oscillation
 * - Box shadow depth for lifted paper effect
 * - Random rotation and z-index layering for authentic board aesthetic
 * 
 * Use cases:
 * - Mystery/detective themed content
 * - Investigation or research presentations
 * - Crime documentary visuals
 * - Conspiracy theory boards
 * - Evidence-based storytelling
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  trackId: z.string().default('evidence-board').describe('Unique track identifier'),
  captions: z.array(z.any()).describe('Array of caption sentences with words (TranscriptionSentence[])'),
  
  // Board styling
  boardColor: z.string().default('from-gray-200 to-gray-300').describe('Tailwind gradient colors for cork board background'),
  corkTextureIntensity: z.number().min(0).max(1).default(0.1).describe('Intensity of cork texture overlay (0-1)'),
  
  // Evidence piece styles
  evidenceTypes: z.array(z.enum(['photo', 'clipping', 'note', 'document'])).default(['photo', 'clipping', 'note', 'document']).describe('Types of evidence pieces to use'),
  rotationRange: z.number().min(0).max(45).default(15).describe('Maximum rotation angle in degrees for evidence pieces'),
  
  // Attachment styles
  attachmentTypes: z.array(z.enum(['pin', 'tape', 'magnet'])).default(['pin', 'tape', 'magnet']).describe('Types of attachment methods (pin, tape, magnet)'),
  
  // Discovery animations
  discoveryMethods: z.array(z.enum(['folder', 'magnify', 'uv'])).default(['folder', 'magnify', 'uv']).describe('Discovery animation types'),
  discoveryDuration: z.number().min(0.3).max(2).default(0.8).describe('Duration of discovery animations in seconds'),
  
  // String connections
  enableConnections: z.boolean().default(true).describe('Enable red string connections between words'),
  connectionColor: z.string().default('#dc2626').describe('Color of connection strings (default: red-600)'),
  connectionWidth: z.number().min(1).max(5).default(2).describe('Width of connection strings in pixels'),
  
  // Typography
  fontSize: z.number().min(12).max(72).default(24).describe('Base font size for evidence text in pixels'),
  font: z.string().optional().describe('Font family with optional weight and style (e.g., "CourierPrime:400", "SpecialElite:700")'),
  textColor: z.string().default('#1f2937').describe('Text color for evidence pieces'),
  
  // Hand cursor
  enableHandCursor: z.boolean().default(true).describe('Enable hand cursor movement simulation'),
  handCursorDuration: z.number().min(0.2).max(1.5).default(0.6).describe('Duration of hand cursor movements in seconds'),
  
  // Layout
  positioning: z.enum(['scattered', 'grid', 'clustered']).default('scattered').describe('Layout pattern for evidence pieces'),
  padding: z.number().min(20).max(100).default(40).describe('Padding from screen edges in pixels'),
});

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const captions = params.captions as TranscriptionSentence[];
  
  // Helper: Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
    const fontStyle: any = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2];
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    return { fontFamily, fontStyle };
  };
  
  const fontConfig = params.font ? parseFontString(params.font) : { fontFamily: 'CourierPrime', fontStyle: { fontWeight: 400 } };
  
  // Helper: Generate random rotation
  const getRandomRotation = () => {
    return (Math.random() - 0.5) * 2 * params.rotationRange;
  };
  
  // Helper: Generate random position
  const getRandomPosition = (index: number, total: number) => {
    const screenWidth = props.config?.width ?? 1920;
    const screenHeight = props.config?.height ?? 1080;
    const padding = params.padding;
    
    if (params.positioning === 'grid') {
      // Grid layout
      const cols = Math.ceil(Math.sqrt(total));
      const col = index % cols;
      const row = Math.floor(index / cols);
      const cellWidth = (screenWidth - padding * 2) / cols;
      const cellHeight = (screenHeight - padding * 2) / Math.ceil(total / cols);
      return {
        left: padding + col * cellWidth + cellWidth / 2,
        top: padding + row * cellHeight + cellHeight / 2,
      };
    } else if (params.positioning === 'clustered') {
      // Clustered around center
      const centerX = screenWidth / 2;
      const centerY = screenHeight / 2;
      const clusterRadius = Math.min(screenWidth, screenHeight) * 0.3;
      const angle = (index / total) * Math.PI * 2;
      const radius = clusterRadius * (0.5 + Math.random() * 0.5);
      return {
        left: centerX + Math.cos(angle) * radius,
        top: centerY + Math.sin(angle) * radius,
      };
    } else {
      // Scattered (random)
      return {
        left: padding + Math.random() * (screenWidth - padding * 2),
        top: padding + Math.random() * (screenHeight - padding * 2),
      };
    }
  };
  
  // Helper: Get evidence style
  const getEvidenceStyle = (type: string) => {
    switch (type) {
      case 'photo':
        return {
          backgroundColor: '#ffffff',
          border: '8px solid #f3f4f6',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1), 0 10px 15px rgba(0,0,0,0.1)',
        };
      case 'clipping':
        return {
          backgroundColor: '#fef3c7',
          border: 'none',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0.02) 1px, transparent 1px)',
          backgroundSize: '100% 1.2em',
        };
      case 'note':
        return {
          backgroundColor: '#fef9e7',
          border: 'none',
          boxShadow: '0 3px 8px rgba(0,0,0,0.08)',
          backgroundImage: 'repeating-linear-gradient(transparent, transparent 1.18em, rgba(0,0,0,0.1) 1.18em, rgba(0,0,0,0.1) 1.2em)',
        };
      case 'document':
        return {
          backgroundColor: '#ffffff',
          border: '1px solid #d1d5db',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        };
      default:
        return {
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        };
    }
  };
  
  // Helper: Get attachment HTML
  const getAttachmentHTML = (type: string) => {
    if (type === 'pin') {
      return `
        <div style="
          position: absolute;
          top: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 16px;
          height: 16px;
          background: radial-gradient(circle, #dc2626 30%, #7f1d1d 70%);
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3), inset 0 -1px 2px rgba(0,0,0,0.2);
          z-index: 10;
        "></div>
      `;
    } else if (type === 'tape') {
      return `
        <div style="
          position: absolute;
          top: -10px;
          left: 50%;
          transform: translateX(-50%) rotate(${(Math.random() - 0.5) * 10}deg);
          width: 80px;
          height: 20px;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(2px);
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
          border: 1px solid rgba(0,0,0,0.05);
          z-index: 10;
        "></div>
      `;
    } else if (type === 'magnet') {
      return `
        <div style="
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          width: 24px;
          height: 12px;
          background: linear-gradient(to bottom, #ef4444 0%, #ef4444 45%, #ffffff 45%, #ffffff 55%, #3b82f6 55%, #3b82f6 100%);
          border-radius: 2px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          z-index: 10;
        "></div>
      `;
    }
    return '';
  };
  
  // Helper: Get discovery animation
  const getDiscoveryAnimation = (method: string, wordId: string, wordStart: number) => {
    const duration = params.discoveryDuration;
    
    if (method === 'folder') {
      // Slide in from right with clip-path
      return [
        {
          id: `${wordId}-folder-slide`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: wordStart,
            duration: duration,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              { key: 'translateX', val: 200, prog: 0 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.3 },
            ],
          },
        },
      ];
    } else if (method === 'magnify') {
      // Scale from center with circular clip-path effect
      return [
        {
          id: `${wordId}-magnify-reveal`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: wordStart,
            duration: duration,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              { key: 'scale', val: 0.5, prog: 0 },
              { key: 'scale', val: 1.05, prog: 0.8 },
              { key: 'scale', val: 1, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
            ],
          },
        },
      ];
    } else if (method === 'uv') {
      // Fade in with hue-rotate filter (UV light reveal)
      return [
        {
          id: `${wordId}-uv-reveal`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: wordStart,
            duration: duration,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
              { key: 'filter', val: 'hue-rotate(180deg) brightness(0.5)', prog: 0 },
              { key: 'filter', val: 'hue-rotate(0deg) brightness(1)', prog: 1 },
            ],
          },
        },
      ];
    }
    
    return [];
  };
  
  // Helper: Add paper flutter effect
  const getPaperFlutterEffect = (wordId: string, wordStart: number, wordDuration: number) => {
    return {
      id: `${wordId}-flutter`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: wordStart + params.discoveryDuration,
        duration: wordDuration - params.discoveryDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'rotateY', val: 0, prog: 0 },
          { key: 'rotateY', val: 2, prog: 0.25 },
          { key: 'rotateY', val: 0, prog: 0.5 },
          { key: 'rotateY', val: -2, prog: 0.75 },
          { key: 'rotateY', val: 0, prog: 1 },
        ],
      },
    };
  };
  
  // Collect all words from captions
  const allWords: Array<{ text: string; start: number; duration: number; captionIndex: number; wordIndex: number }> = [];
  captions.forEach((caption, captionIndex) => {
    caption.words.forEach((word, wordIndex) => {
      allWords.push({
        text: word.text,
        start: word.absoluteStart,
        duration: word.duration,
        captionIndex,
        wordIndex,
      });
    });
  });
  
  // Create evidence pieces for each word
  const evidencePieces: RenderableComponentData[] = [];
  const connectionPoints: Array<{ id: string; x: number; y: number; captionIndex: number }> = [];
  
  allWords.forEach((word, index) => {
    const wordId = `evidence-word-${index}`;
    const position = getRandomPosition(index, allWords.length);
    const rotation = getRandomRotation();
    const zIndex = 20 + Math.floor(Math.random() * 30);
    
    // Random evidence type and attachment
    const evidenceType = params.evidenceTypes[Math.floor(Math.random() * params.evidenceTypes.length)];
    const attachmentType = params.attachmentTypes[Math.floor(Math.random() * params.attachmentTypes.length)];
    const discoveryMethod = params.discoveryMethods[Math.floor(Math.random() * params.discoveryMethods.length)];
    
    const evidenceStyle = getEvidenceStyle(evidenceType);
    const attachmentHTML = getAttachmentHTML(attachmentType);
    
    // Discovery animation
    const discoveryEffects = getDiscoveryAnimation(discoveryMethod, wordId, word.start);
    
    // Paper flutter effect
    const flutterEffect = getPaperFlutterEffect(wordId, word.start, word.duration);
    
    // Store connection point
    connectionPoints.push({
      id: wordId,
      x: position.left,
      y: position.top,
      captionIndex: word.captionIndex,
    });
    
    evidencePieces.push({
      id: wordId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          style: {
            position: 'absolute',
            left: `${position.left}px`,
            top: `${position.top}px`,
            transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
            zIndex: zIndex,
          },
        },
      },
      context: {
        timing: {
          start: word.start,
          duration: word.duration,
        },
      },
      effects: [...discoveryEffects, flutterEffect],
      childrenData: [
        // Attachment element
        {
          id: `${wordId}-attachment`,
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: attachmentHTML,
            style: {
              position: 'relative',
              width: '100%',
              pointerEvents: 'none',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: word.duration,
            },
          },
        },
        // Evidence card
        {
          id: `${wordId}-card`,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: word.text,
            className: 'px-4 py-3',
            style: {
              fontSize: params.fontSize,
              color: params.textColor,
              fontWeight: fontConfig.fontStyle.fontWeight || 400,
              fontStyle: fontConfig.fontStyle.fontStyle || 'normal',
              ...evidenceStyle,
              padding: '12px 16px',
              borderRadius: evidenceType === 'photo' ? '2px' : '0px',
              minWidth: '100px',
              maxWidth: '300px',
              wordBreak: 'break-word',
              whiteSpace: 'normal',
            },
            font: {
              family: fontConfig.fontFamily,
              weights: fontConfig.fontStyle.fontWeight ? [fontConfig.fontStyle.fontWeight.toString()] : ['400'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: word.duration,
            },
          },
        },
      ],
    } as RenderableComponentData);
  });
  
  // Create red string connections (SVG paths between words in same caption)
  const connectionsSVG: string[] = [];
  if (params.enableConnections) {
    const captionGroups = connectionPoints.reduce((acc, point) => {
      if (!acc[point.captionIndex]) acc[point.captionIndex] = [];
      acc[point.captionIndex].push(point);
      return acc;
    }, {} as Record<number, typeof connectionPoints>);
    
    Object.values(captionGroups).forEach((group) => {
      if (group.length < 2) return;
      
      // Connect each word to the next in the same caption
      for (let i = 0; i < group.length - 1; i++) {
        const from = group[i];
        const to = group[i + 1];
        
        // Create bezier curve path
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        const controlX1 = from.x + (midX - from.x) * 0.5 + (Math.random() - 0.5) * 50;
        const controlY1 = from.y + (midY - from.y) * 0.5 + (Math.random() - 0.5) * 50;
        const controlX2 = to.x + (midX - to.x) * 0.5 + (Math.random() - 0.5) * 50;
        const controlY2 = to.y + (midY - to.y) * 0.5 + (Math.random() - 0.5) * 50;
        
        connectionsSVG.push(
          `<path d="M ${from.x} ${from.y} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${to.x} ${to.y}" stroke="${params.connectionColor}" stroke-width="${params.connectionWidth}" fill="none" opacity="0.7" />`
        );
      }
    });
  }
  
  // Hand cursor animation (simulate placing evidence)
  const handCursorAnimations: RenderableComponentData[] = [];
  if (params.enableHandCursor && allWords.length > 0) {
    allWords.forEach((word, index) => {
      if (index === 0 || index % 3 === 0) {
        // Show hand cursor for every 3rd word
        const position = getRandomPosition(index, allWords.length);
        const handId = `hand-cursor-${index}`;
        
        handCursorAnimations.push({
          id: handId,
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="width: 40px; height: 40px; background: radial-gradient(circle, rgba(255,200,150,0.8) 20%, transparent 70%); border-radius: 50%; box-shadow: 0 0 10px rgba(255,200,150,0.6);"></div>`,
            style: {
              position: 'absolute',
              left: `${position.left}px`,
              top: `${position.top}px`,
              transform: 'translate(-50%, -50%)',
              zIndex: 50,
              pointerEvents: 'none',
            },
          },
          context: {
            timing: {
              start: word.start - params.handCursorDuration,
              duration: params.handCursorDuration + 0.3,
            },
          },
          effects: [
            {
              id: `${handId}-move`,
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: params.handCursorDuration,
                mode: 'provider',
                targetIds: [handId],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 0.2 },
                  { key: 'opacity', val: 1, prog: 0.8 },
                  { key: 'opacity', val: 0, prog: 1 },
                  { key: 'scale', val: 0.8, prog: 0 },
                  { key: 'scale', val: 1, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData);
      }
    });
  }
  
  // Red string connections SVG container
  const connectionsContainer: RenderableComponentData = {
    id: 'red-string-connections',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<svg class="absolute inset-0 w-full h-full pointer-events-none" style="z-index: 10;">${connectionsSVG.join('')}</svg>`,
      className: 'absolute inset-0',
      style: {
        zIndex: 10,
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: Math.max(...allWords.map(w => w.start + w.duration), 10),
      },
    },
  } as RenderableComponentData;
  
  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${params.trackId}-evidence-board-root`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative min-h-screen bg-gradient-to-br ${params.boardColor}`,
        style: {
          backgroundImage: `radial-gradient(circle, rgba(139, 90, 43, ${params.corkTextureIntensity}) 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: Math.max(...allWords.map(w => w.start + w.duration), 10),
      },
    },
    childrenData: [
      connectionsContainer,
      ...evidencePieces,
      ...handCursorAnimations,
    ],
  } as RenderableComponentData;
  
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
  id: 'evidence-board-mystery',
  title: 'Evidence Board Mystery Solver',
  description: 'A detective-style evidence board where words appear as pinned investigation items (photographs, clippings, notes) with red string connections. Features discovery animations (folder slides, magnifying glass reveals, UV light), push pins, and methodical hand movements.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typography', 'captions', 'detective', 'mystery', 'investigation', 'evidence', 'board', 'strings', 'discovery', 'animated'],
  dependencies: {},
  defaultInputParams: {
    trackId: 'evidence-board',
    captions: [],
    boardColor: 'from-gray-200 to-gray-300',
    corkTextureIntensity: 0.1,
    evidenceTypes: ['photo', 'clipping', 'note', 'document'],
    rotationRange: 15,
    attachmentTypes: ['pin', 'tape', 'magnet'],
    discoveryMethods: ['folder', 'magnify', 'uv'],
    discoveryDuration: 0.8,
    enableConnections: true,
    connectionColor: '#dc2626',
    connectionWidth: 2,
    fontSize: 24,
    font: 'CourierPrime:400',
    textColor: '#1f2937',
    enableHandCursor: true,
    handCursorDuration: 0.6,
    positioning: 'scattered',
    padding: 40,
  },
};

export const evidenceBoardMysteryPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};