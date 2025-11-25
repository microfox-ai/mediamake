import { useMemo } from 'react';
import {
  useAudioData,
  visualizeAudioWaveform,
  visualizeAudio,
} from '@remotion/media-utils';
import { staticFile } from 'remotion';
import {
  findMatchingComponents,
  findMatchingComponentsByQuery,
  useComposition,
} from '../../../core';

// Hook configuration interface
export interface UseWaveformDataConfig {
  audioSrc: string;
  numberOfSamples: number;
  windowInSeconds: number;
  dataOffsetInSeconds?: number;
  normalize?: boolean;
  frame: number;
  fps: number;
  posterize?: number;
  // Frequency analysis options
  includeFrequencyData?: boolean;
  minDb?: number;
  maxDb?: number;
  // Smoothing control
  smoothNormalisation?: number; // 0 = no smoothing, 1 = default smoothing, >1 = more smoothing
}

// Hook return interface
export interface UseWaveformDataReturn {
  waveformData: number[] | null;
  frequencyData: number[] | null;
  amplitudes: number[] | null;
  audioData: any;
  isLoading: boolean;
  error: string | null;
  bass: number | null;
  bassValues?: number[] | null;
  mid: number | null;
  midValues?: number[] | null;
  treble: number | null;
  trebleValues?: number[] | null;
}

// Validate that numberOfSamples is a power of 2
const isValidPowerOfTwo = (num: number): boolean => {
  return num > 0 && (num & (num - 1)) === 0;
};

// Get the closest power of 2
const getClosestPowerOfTwo = (num: number): number => {
  if (num <= 0) return 32;

  let power = 1;
  while (power < num) {
    power *= 2;
  }

  // Return the closest power of 2
  const lower = power / 2;
  const upper = power;

  return Math.abs(num - lower) < Math.abs(num - upper) ? lower : upper;
};

export const useWaveformData = (
  config: UseWaveformDataConfig
): UseWaveformDataReturn => {
  const {
    audioSrc,
    numberOfSamples,
    windowInSeconds,
    dataOffsetInSeconds = 0,
    normalize = false,
    frame,
    fps,
    posterize,
    includeFrequencyData = false,
    minDb = -100,
    maxDb = -30,
    smoothNormalisation = 1,
  } = config;

  const { root } = useComposition();

  // Validate and adjust numberOfSamples
  const validatedNumberOfSamples = useMemo(() => {
    if (!isValidPowerOfTwo(numberOfSamples)) {
      console.warn(
        `numberOfSamples must be a power of 2. Adjusting ${numberOfSamples} to ${getClosestPowerOfTwo(numberOfSamples)}`
      );
      return getClosestPowerOfTwo(numberOfSamples);
    }
    return numberOfSamples;
  }, [numberOfSamples]);

  const { source, audioStartsFrom } = useMemo(() => {
    if (audioSrc.startsWith('http')) {
      return { source: audioSrc, audioStartsFrom: undefined };
    }
    if (audioSrc.startsWith('ref:')) {
      const matchingComponent = findMatchingComponents(root, [
        audioSrc.replace('ref:', ''),
      ]);
      if (matchingComponent.length > 0) {
        const firstMatchingComponent = matchingComponent[0];
        if (firstMatchingComponent.componentId === 'AudioAtom') {
          return {
            source: firstMatchingComponent.data.src,
            audioStartsFrom:
              firstMatchingComponent.data?.startFrom ?? undefined,
          };
        }
        if (
          firstMatchingComponent.type === 'layout' ||
          firstMatchingComponent.type === 'scene'
        ) {
          const audioComponents = findMatchingComponentsByQuery(
            firstMatchingComponent.childrenData,
            { componentId: 'AudioAtom' }
          );
          if (audioComponents.length > 0) {
            return {
              source: audioComponents[0].data.src,
              audioStartsFrom: audioComponents[0].data?.startFrom ?? undefined,
            };
          }
          // look for all child componenet that are of type audioAtom
          //return firstMatchingComponent.data.src;
        }
      }
    }
    return { source: staticFile(audioSrc), audioStartsFrom: undefined };
  }, [audioSrc]);

  // Get audio data
  const audioData = useAudioData(source);

  // Calculate adjusted frame for posterize effect
  const adjustedFrame = useMemo(() => {
    if (posterize && posterize > 1) {
      return Math.round(frame / posterize) * posterize;
    }
    let offset = 0;
    if (audioStartsFrom && audioStartsFrom != 0) {
      offset += Math.round(audioStartsFrom * fps);
    }
    if (dataOffsetInSeconds != 0) {
      offset += Math.round(dataOffsetInSeconds * fps);
    }
    return frame + offset;
  }, [frame, posterize, dataOffsetInSeconds, audioStartsFrom]);

  // Generate waveform data with frame-based smoothing
  const waveformData = useMemo(() => {
    if (!audioData) return null;

    try {
      // Sample multiple frames around the current frame for smoother transitions
      // This creates a natural smoothing effect by averaging nearby frames
      // smoothNormalisation: 0 = no smoothing, 1 = ±3 frames, 2 = ±6 frames, etc.
      const baseSmoothingFrames = 3;
      const smoothingFrames =
        smoothNormalisation > 0
          ? Math.floor(smoothNormalisation * baseSmoothingFrames)
          : 0; // 0 means no smoothing
      const samples: number[][] = [];

      // If smoothNormalisation is 0, skip smoothing and use single frame
      if (smoothingFrames === 0) {
        const waveform = visualizeAudioWaveform({
          fps,
          frame: adjustedFrame,
          audioData,
          numberOfSamples: validatedNumberOfSamples,
          windowInSeconds,
          dataOffsetInSeconds: 0,
          normalize,
        });
        return waveform;
      }

      for (let offset = -smoothingFrames; offset <= smoothingFrames; offset++) {
        const sampleFrame = adjustedFrame + offset;
        if (sampleFrame >= 0) {
          try {
            const waveform = visualizeAudioWaveform({
              fps,
              frame: sampleFrame,
              audioData,
              numberOfSamples: validatedNumberOfSamples,
              windowInSeconds,
              dataOffsetInSeconds: 0,
              normalize,
            });
            if (waveform && waveform.length > 0) {
              samples.push(waveform);
            }
          } catch (e) {
            // Skip invalid frames
          }
        }
      }

      if (samples.length === 0) {
        // Fallback to single frame if no samples collected
        const waveform = visualizeAudioWaveform({
          fps,
          frame: adjustedFrame,
          audioData,
          numberOfSamples: validatedNumberOfSamples,
          windowInSeconds,
          dataOffsetInSeconds: 0,
          normalize,
        });
        return waveform;
      }

      // Average all samples for smooth transition
      const averaged = new Array(validatedNumberOfSamples).fill(0);
      for (let i = 0; i < validatedNumberOfSamples; i++) {
        let sum = 0;
        let count = 0;
        for (const sample of samples) {
          if (sample[i] !== undefined) {
            sum += sample[i];
            count++;
          }
        }
        averaged[i] = count > 0 ? sum / count : 0;
      }

      return averaged;
    } catch (error) {
      console.error('Error generating waveform:', error);
      return null;
    }
  }, [
    audioData,
    adjustedFrame,
    fps,
    validatedNumberOfSamples,
    windowInSeconds,
    dataOffsetInSeconds,
    normalize,
    smoothNormalisation,
  ]);

  // Generate frequency data and amplitudes with frame-based smoothing
  const {
    frequencyData,
    amplitudes,
    bass,
    mid,
    treble,
    bassValues,
    midValues,
    trebleValues,
  } = useMemo(() => {
    if (!audioData || !includeFrequencyData) {
      //console.log('No audio data or frequency data requested');
      return {
        frequencyData: null,
        amplitudes: null,
        bass: null,
        mid: null,
        treble: null,
        bassValues: null,
        midValues: null,
        trebleValues: null,
      };
    }

    try {
      // Sample multiple frames around the current frame for smoother frequency data
      // smoothNormalisation: 0 = no smoothing, 1 = ±3 frames, 2 = ±6 frames, etc.
      const baseSmoothingFrames = 3;
      const smoothingFrames =
        smoothNormalisation > 0
          ? Math.floor(smoothNormalisation * baseSmoothingFrames)
          : 0; // 0 means no smoothing
      const frequencySamples: number[][] = [];

      // Average frequency samples for smooth transitions
      let frequencyData: number[];

      // If smoothNormalisation is 0, skip smoothing and use single frame
      if (smoothingFrames === 0) {
        frequencyData = visualizeAudio({
          fps,
          frame: adjustedFrame,
          audioData,
          numberOfSamples: validatedNumberOfSamples,
        });
      } else {
        for (
          let offset = -smoothingFrames;
          offset <= smoothingFrames;
          offset++
        ) {
          const sampleFrame = adjustedFrame + offset;
          if (sampleFrame >= 0) {
            try {
              const freqData = visualizeAudio({
                fps,
                frame: sampleFrame,
                audioData,
                numberOfSamples: validatedNumberOfSamples,
              });
              if (freqData && freqData.length > 0) {
                frequencySamples.push(freqData);
              }
            } catch (e) {
              // Skip invalid frames
            }
          }
        }

        // Average frequency samples for smooth transitions
        if (frequencySamples.length === 0) {
          // Fallback to single frame
          frequencyData = visualizeAudio({
            fps,
            frame: adjustedFrame,
            audioData,
            numberOfSamples: validatedNumberOfSamples,
          });
        } else {
          frequencyData = new Array(validatedNumberOfSamples).fill(0);
          for (let i = 0; i < validatedNumberOfSamples; i++) {
            let sum = 0;
            let count = 0;
            for (const sample of frequencySamples) {
              if (sample[i] !== undefined) {
                sum += sample[i];
                count++;
              }
            }
            frequencyData[i] = count > 0 ? sum / count : 0;
          }
        }
      }

      // Calculate frequency bands
      const { sampleRate } = audioData;
      const bassValues: number[] = [];
      const midValues: number[] = [];
      const trebleValues: number[] = [];

      for (let i = 0; i < frequencyData.length; i++) {
        const freq = (i * sampleRate) / (2 * frequencyData.length);
        const value = frequencyData[i];

        if (freq >= 0 && freq < 250) {
          bassValues.push(value * 2.5);
        } else if (freq >= 250 && freq < 4000) {
          midValues.push(value * 3);
          midValues.push(value * 4.5);
          midValues.push(value * 5);
        } else if (freq >= 4000 && freq < sampleRate / 2) {
          trebleValues.push(value * 30);
        }
      }

      // Averaging the frequency values within each band simplifies the data to a single,
      // representative number. This is useful for creating smoother and more stable visualizations
      // that react to the overall energy of a frequency range, rather than noisy, rapid fluctuations.
      const getAverage = (arr: number[]) =>
        arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

      const bass = getAverage(bassValues);
      const mid = getAverage(midValues);
      const treble = getAverage(trebleValues);

      // Convert frequency data to decibel-scaled amplitudes
      const amplitudes = frequencyData.map((value) => {
        // Convert to decibels (will be in the range `-Infinity` to `0`)
        const db = 20 * Math.log10(value);

        // Scale to fit between min and max
        const scaled = (db - minDb) / (maxDb - minDb);

        // Clamp to valid range [0, 1]
        return Math.max(0, Math.min(1, scaled));
      });

      return {
        frequencyData,
        amplitudes,
        bass,
        mid,
        treble,
        bassValues,
        midValues,
        trebleValues: trebleValues.reverse(),
      };
    } catch (error) {
      console.error('Error generating frequency data:', error);
      return {
        frequencyData: null,
        amplitudes: null,
        bass: null,
        mid: null,
        treble: null,
      };
    }
  }, [
    audioData,
    includeFrequencyData,
    adjustedFrame,
    fps,
    validatedNumberOfSamples,
    windowInSeconds,
    dataOffsetInSeconds,
    minDb,
    maxDb,
    smoothNormalisation,
  ]);

  // Determine loading and error states
  const isLoading = !audioData;
  const error =
    audioData === null && !isLoading ? 'Failed to load audio data' : null;

  return {
    waveformData,
    frequencyData,
    amplitudes,
    audioData,
    isLoading,
    error,
    bass,
    bassValues,
    mid,
    midValues,
    treble,
    trebleValues,
  };
};
