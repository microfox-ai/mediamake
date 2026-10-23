import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import dedent from 'dedent';
import { getDatabase } from '@/lib/mongodb';
import { MediaFile } from '@/app/types/media';
import { preset } from 'swr/_internal';
import {
  TEXT_ATOM_PRESET_ID,
  textOverlayToTextAtom,
} from '@/components/editor/presets/registry/general/text-overlay-to-text-atom';

const aiRouter = new AiRouter();

// Input schema for the musicStitch agent
const MusicStitchInputSchema = z.object({
  tags: z.array(z.string()).describe('Array of string tags'),
  images: z
    .array(z.string())
    .optional()
    .describe('Array of image URLs or paths'),
  videos: z
    .array(z.string())
    .optional()
    .describe('Array of video URLs or paths'),
  audio: z.string().optional().describe('Single audio URL or path'),
  model: z.string().optional().describe('Model to use'),
  shortsDuration: z
    .number()
    .optional()
    .describe('Duration of the shorts in seconds'),
  shortsCount: z.number().optional().describe('Number of shorts to generate'),
  watermark: z
    .string()
    .optional()
    .describe('Optional watermark text to display on the video'),
  quoteText: z
    .string()
    .optional()
    .describe('Optional quote text to overlay on the video'),
});

// Output schema for the agent
const MusicStitchOutputSchema = z.object({
  presetSets: z
    .array(
      z.object({
        presets: z.array(z.any()).describe('Array of presets in a set'),
      }),
    )
    .describe('Array of preset sets'),
});

export const musicStitchAgent = aiRouter
  .agent('/', async ctx => {
    try {
      ctx.response.writeMessageMetadata({
        loader: 'Processing music stitch...',
      });

      const clientId = ctx.request.clientId;
      const {
        tags,
        images,
        audio,
        videos,
        model,
        shortsCount,
        shortsDuration,
        watermark,
        quoteText,
      } = ctx.request.params;

      const selectedModel = google(model ?? 'gemini-2.5-pro');

      const db = await getDatabase();
      const collection = db.collection('mediaFiles');

      let selectedImages: MediaFile[] = [];
      let selectedVideos: MediaFile[] = [];
      let availableAudios: MediaFile[] = [];
      let selectedShortsCount =
        shortsCount ?? Math.floor(Math.random() * 10) + 3;
      let selectedShortsDuration =
        shortsDuration ?? Math.floor(Math.random() * 10) + 20;

      if (tags.length > 0) {
        const randomTag = tags[Math.floor(Math.random() * tags.length)];
        const files = (await collection
          .find(
            {
              tags: { $in: [randomTag] },
              clientId: clientId,
            },
            {
              projection: {
                _id: 1,
                tags: 1,
                contentType: 1,
                contentSource: 1,
                contentSourceUrl: 1,
                fileName: 1,
                fileSize: 1,
                filePath: 1,
                metadata: 1,
              },
            },
          )
          .sort({ createdAt: -1 })
          // .limit(50)
          .toArray()) as MediaFile[];

        const imagesFromTags = files
          .filter(file => file.contentType === 'image')
          .map(file => file);
        const videosFromTags = files
          .filter(file => file.contentType === 'video')
          .map(file => file);
        const audiosFromTags = files.filter(
          file => file.contentType === 'audio',
        );

        // Store all available audios for random selection
        availableAudios = audiosFromTags;

        // If no images provided, use all from tags
        if (!images || images.length === 0) {
          selectedImages = imagesFromTags;
        }

        // If no videos provided, use all from tags
        if (!videos || videos.length === 0) {
          selectedVideos = videosFromTags;
        }
      }

      // If images/videos are provided, use them
      if (images && images.length > 0) {
        selectedImages = images.map(
          (img: string) =>
            ({ filePath: img, contentType: 'image' }) as MediaFile,
        );
      }
      if (videos && videos.length > 0) {
        selectedVideos = videos.map(
          (vid: string) =>
            ({ filePath: vid, contentType: 'video' }) as MediaFile,
        );
      }

      if (selectedImages.length === 0 && selectedVideos.length === 0) {
        return {
          presetSets: [],
        };
      }

      // Generate multiple preset sets based on selectedShortsCount
      const generatedPresetSets = [];

      for (let i = 0; i < selectedShortsCount; i++) {
        // Shuffle all media to maximize differences between preset sets
        const shuffledImages = [...selectedImages].sort(
          () => Math.random() - 0.5,
        );
        const shuffledVideos = [...selectedVideos].sort(
          () => Math.random() - 0.5,
        );

        // Use all available media without clipping
        const currentMediaItems = [...shuffledImages, ...shuffledVideos];

        // Audio selection logic
        let currentAudio: MediaFile | undefined;
        let audioRandomStart = 0;

        if (audio && audio.trim() !== '') {
          // Use provided audio
          currentAudio = { filePath: audio, contentType: 'audio' } as MediaFile;
        } else {
          // Randomly select audio from available audios
          if (availableAudios.length > 0) {
            currentAudio =
              availableAudios[
                Math.floor(Math.random() * availableAudios.length)
              ];
          }
        }

        // Randomize audio start position
        if (currentAudio) {
          const audioLength = currentAudio?.metadata?.duration ?? 100;
          audioRandomStart = Math.floor(
            Math.random() * Math.max(0, audioLength - selectedShortsDuration),
          );
        }

        // Generate random background color for variety
        const backgroundColors = [
          '#3962B8',
          '#E74C3C',
          '#2ECC71',
          '#F39C12',
          '#9B59B6',
          '#1ABC9C',
          '#E67E22',
          '#34495E',
          '#8E44AD',
          '#16A085',
        ];
        const randomBackgroundColor =
          backgroundColors[Math.floor(Math.random() * backgroundColors.length)];

        // Randomize transition type and impact (only supported types)
        const transitionTypes = ['shake', 'smooth-blur'];
        const randomTransitionType =
          transitionTypes[Math.floor(Math.random() * transitionTypes.length)];
        const randomImpact = Math.floor(Math.random() * 3) + 1; // 1-3

        const presetSet = [
          {
            presetId: 'base-scene',
            presetType: 'full',
            presetInputData: {
              backgroundColor: randomBackgroundColor,
              fitDurationTo: 'audio-track',
              aspectRatio: '9:16',
              clip: {
                start: 0,
                duration: selectedShortsDuration,
              },
            },
            disabled: false,
          },
          {
            presetId: 'media-track',
            presetType: 'children',
            presetInputData: {
              mediaItems: [
                {
                  src: currentAudio?.filePath,
                  type: 'audio',
                  startOffset: audioRandomStart,
                },
              ],
              trackName: 'audio-track',
              trackType: 'sequence',
            },
            disabled: false,
          },
          {
            presetId: 'beatstitch',
            presetType: 'children',
            presetInputData: {
              minTimeDiff: 0.5,
              maxBeats: 0,
              audio: {
                src: currentAudio?.filePath,
                start: audioRandomStart,
                duration: selectedShortsDuration,
              },
              clips: currentMediaItems.map(item => ({
                src: item.filePath,
                type: item.contentType,
                fit: 'cover',
              })),
              isRepeatClips: true,
              transition: {
                type: randomTransitionType,
                impact: randomImpact,
              },
              hideBeatCount: true,
            },
            disabled: false,
          },
        ];

        // Add watermark preset if watermark text is provided
        if (watermark && watermark.trim() !== '') {
          presetSet.push({
            presetId: TEXT_ATOM_PRESET_ID,
            presetType: 'children',
            presetInputData: textOverlayToTextAtom({
              text: watermark.trim(),
              trackName: 'watermark',
              fontSize: 20,
              letterSpacing: 10,
              color: '#FFFFFF',
              position: {
                alignment: 'top-center',
              },
              style: {
                textShadow: ' ',
                textTransform: 'uppercase',
                padding: '10px 40px 10px 60px',
                backgroundColor: '#FFFFFF80',
                borderRadius: '0 0 40px 40px',
                textColor: '#000',
                backdropFilter: 'blur(10px)',
              },
              transitions: {
                fadeInTransition: 'opacity',
                fadeInDuration: 1,
                duration: shortsDuration,
              },
              fontFamily: 'Inter:500',
            }) as any,
            disabled: false,
          });
        }

        // Add centered quote overlay if quoteText is provided
        if (quoteText && quoteText.trim() !== '') {
          const quoteFonts = [
            'Bangers',
            'BebasNeue',
            'ProtestRevolution',
            'CeasarDressing',
            'Inter:900:Italic',
            'TradeWinds',
            'KaushanScript',
          ];
          const fadeInTransitions = [
            'scale-in',
            'blur-in',
            'scale-out',
            'opacity',
          ] as const;
          const randomFont =
            quoteFonts[Math.floor(Math.random() * quoteFonts.length)];
          const randomFadeIn =
            fadeInTransitions[
              Math.floor(Math.random() * fadeInTransitions.length)
            ];

          presetSet.push({
            presetId: TEXT_ATOM_PRESET_ID,
            presetType: 'children',
            presetInputData: textOverlayToTextAtom({
              text: quoteText.trim(),
              trackName: 'quote',
              fontSize: 200,
              color: '#FFFFFF',
              position: {
                alignment: 'center-center',
              },
              style: {
                textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                padding: '80px',
                otherProps: {
                  textAlign: 'center',
                  lineHeight: 1,
                },
              },
              opacity: 1,
              fontFamily: randomFont,
              transitions: {
                duration: selectedShortsDuration,
                startOffset: 5,
                fadeInTransition: randomFadeIn,
              },
            }) as any,
            disabled: false,
          });
        }

        generatedPresetSets.push({ presets: presetSet });
      }

      return {
        presetSets: generatedPresetSets, // Return array of preset sets (not flattened)
      };
    } catch (error) {
      console.error('Error in music stitch agent:', error);
      throw error;
    }
  })
  .actAsTool('/', {
    id: 'musicStitch',
    name: 'Music Stitch Agent',
    description:
      'Processes tags, images, and audio to create datamotion media objects',
    inputSchema: MusicStitchInputSchema,
    outputSchema: MusicStitchOutputSchema,
    metadata: {
      name: 'Music Stitch Agent',
      description:
        'Processes tags, images, and audio to create datamotion media objects',
      hideUI: false,
      customUI: true,
      customUIType: 'presets',
    },
  });
