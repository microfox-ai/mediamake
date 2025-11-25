import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod';
import {
  getAudioMetadata,
  analyzeAudioContent,
  type AudioAnalysisOptions,
} from './audioAnalysisHelpers';

const aiRouter = new AiRouter();

// Input schema for the technical analysis agent
const AudioTechnicalAnalysisInputSchema = z.object({
  audioUrl: z.string().url().describe('Audio URL to analyze'),
  analysisOptions: z
    .object({
      extractWaveform: z
        .boolean()
        .default(true)
        .describe('Extract waveform data'),
      analyzeFrequency: z
        .boolean()
        .default(true)
        .describe('Analyze frequency content'),
      detectBeats: z.boolean().default(true).describe('Detect beats in audio'),
    })
    .optional()
    .describe('Options for technical audio analysis'),
});

// Output schema for the agent
const AudioTechnicalAnalysisOutputSchema = z.object({
  success: z.boolean().describe('Whether the operation was successful'),
  audioUrl: z.string().describe('Original audio URL'),
  metadata: z
    .object({
      duration: z.number().describe('Duration in seconds'),
      sampleRate: z.number().describe('Sample rate in Hz'),
      channels: z.number().describe('Number of audio channels'),
      bitRate: z.number().optional().describe('Bit rate'),
      format: z.string().optional().describe('Audio format'),
      codec: z.string().optional().describe('Audio codec'),
      fileSize: z.number().optional().describe('File size in bytes'),
    })
    .describe('Audio metadata'),
  technicalAnalysis: z
    .object({
      waveform: z
        .array(z.number())
        .optional()
        .describe('Waveform data for visualization'),
      frequencyData: z
        .array(z.number())
        .optional()
        .describe('Frequency analysis data'),
      beats: z
        .array(z.number())
        .optional()
        .describe('Beat detection timestamps'),
      analysis: z.string().describe('Technical analysis summary'),
    })
    .describe('Technical analysis results'),
  error: z.string().optional().describe('Error message if operation failed'),
});

export const audioTechnicalAnalysisAgent = aiRouter
  .agent('/', async ctx => {
    try {
      ctx.response.writeMessageMetadata({
        loader: 'Processing technical audio analysis...',
      });

      const { audioUrl, analysisOptions } = ctx.request.params;

      console.log(`🔬 Starting technical analysis for: ${audioUrl}`);

      // Step 1: Get audio metadata
      console.log('📊 Getting audio metadata...');
      const audioMetadata = await getAudioMetadata(audioUrl);
      console.log('📊 Audio metadata retrieved:', {
        duration: audioMetadata.duration,
        sampleRate: audioMetadata.sampleRate,
        channels: audioMetadata.channels,
        format: audioMetadata.format,
      });

      // Step 2: Perform technical analysis
      console.log('🔬 Performing technical audio analysis...');
      const technicalAnalysis = await analyzeAudioContent(
        audioUrl,
        analysisOptions || {
          extractWaveform: true,
          analyzeFrequency: true,
          detectBeats: true,
        },
      );

      console.log('🔬 Technical analysis completed:', {
        hasWaveform: !!technicalAnalysis.waveform,
        hasFrequencyData: !!technicalAnalysis.frequencyData,
        hasBeats: !!technicalAnalysis.beats,
        waveformLength: technicalAnalysis.waveform?.length || 0,
        frequencyDataLength: technicalAnalysis.frequencyData?.length || 0,
        beatsCount: technicalAnalysis.beats?.length || 0,
      });

      return {
        success: true,
        audioUrl,
        metadata: {
          duration: audioMetadata.duration,
          sampleRate: audioMetadata.sampleRate,
          channels: audioMetadata.channels,
          bitRate: audioMetadata.bitRate,
          format: audioMetadata.format,
          codec: audioMetadata.codec,
          fileSize: audioMetadata.fileSize,
        },
        technicalAnalysis: {
          waveform: technicalAnalysis.waveform,
          frequencyData: technicalAnalysis.frequencyData,
          beats: technicalAnalysis.beats,
          analysis: technicalAnalysis.analysis,
        },
      };
    } catch (error) {
      console.error('❌ Error in technical audio analysis:', error);
      return {
        success: false,
        audioUrl: ctx.request.params.audioUrl,
        metadata: {
          duration: 0,
          sampleRate: 0,
          channels: 0,
        },
        technicalAnalysis: {
          analysis: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        },
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  })
  .actAsTool('/', {
    id: 'audioTechnicalAnalysis',
    name: 'Audio Technical Analysis Agent',
    description:
      'Performs technical analysis on audio files (waveform, frequency, beats)',
    inputSchema: AudioTechnicalAnalysisInputSchema,
    outputSchema: AudioTechnicalAnalysisOutputSchema,
    metadata: {
      icon: '🎵',
      name: 'Audio Technical Analysis Agent',
      description:
        'Extracts technical audio data like waveform, frequency analysis, and beat detection',
      hideUI: false,
      customUI: true,
      customUIType: 'presets',
    },
  });
