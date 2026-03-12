import { ObjectId } from 'mongodb';

export interface Tag {
  _id?: ObjectId;
  id: string; // shortformcapless like hashtag
  displayName: string;
  clientId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// RAG Image Metadata type for AI analysis
export interface RagImageMetadata {
  indexingId?: string;
  src: string | null;
  responsiveImages: { url: string; size: string }[] | null;
  description: string | null;
  altText: string | null;
  imgPermalink: string | null;
  pagePermalink: string;
  width: number | null;
  height: number | null;
  palette?: string[] | null;
  dominantColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  aspectRatioType: string | null; // 4:3, 16:9, 1:1, etc.
  aspectRatio: number | null; // 4:3, 16:9, 1:1, etc.
  platform: string | null; // instagram, pinterest, etc.
  platformId: string | null; // instagram, pinterest, etc.
  platformUrl: string | null; // https://www.instagram.com, https://www.pinterest.com, etc.
  keywords: string[] | null;
  artStyle: string[] | null; // abstract, surrealism, etc.
  audienceKeywords: string[] | null; // abstract, surrealism, etc.
  mediaType: string | null; // image, video, etc.
  mimeType: string | null; // image/jpeg, image/png, video/mp4, etc.
  promptUsed?: string | null; // prompt used to generate the image
  userTags?: string[] | null; // tags used to generate the image
  segmentation?: {
    foreground: {
      url: string;
      width: number;
      height: number;
      content_type: string;
      file_name: string;
    };
    background: {
      url: string;
      width: number;
      height: number;
      content_type: string;
      file_name: string;
    };
    mask: {
      url: string;
      width: number;
      height: number;
      content_type: string;
      file_name: string;
    };
  };
}

// RAG Audio Metadata type for AI analysis
export interface RagAudioMetadata {
  indexingId?: string;
  src: string | null;
  description: string | null;
  title: string | null;
  creator: string | null;
  duration: number | null; // Duration in seconds
  sampleRate: number | null; // Sample rate in Hz
  channels: number | null; // Number of audio channels
  bitRate: number | null; // Bit rate
  format: string | null; // Audio format (mp3, wav, etc.)
  codec: string | null; // Audio codec
  fileSize: number | null; // File size in bytes
  originalUrl: string | null; // Original source URL
  mediaType: string | null; // image, video, etc.
  mimeType: string | null; // image/jpeg, image/png, video/mp4, etc.

  // AI Analysis Results
  analysis?: {
    analysis: string; // Detailed analysis of the audio content
    mood: string; // Overall mood or atmosphere
    genre: string; // Detected or likely genre
    keyElements: string[]; // Key audio elements and characteristics
    emotions: string[]; // Emotions conveyed by the audio
    technicalNotes: string; // Technical observations
  };

  // Technical Analysis Data
  technicalAnalysis?: {
    waveform?: number[]; // Waveform data for visualization
    frequencyData?: number[]; // Frequency analysis data
    beats?: number[]; // Beat detection timestamps
    analysis: string; // Technical analysis summary
  };

  // Audio Characteristics
  audioCharacteristics?: {
    tempo?: number; // BPM
    key?: string; // Musical key
    energy?: number; // Energy level (0-1)
    valence?: number; // Emotional valence (0-1)
    danceability?: number; // Danceability score (0-1)
    acousticness?: number; // Acousticness score (0-1)
    instrumentalness?: number; // Instrumentalness score (0-1)
    liveness?: number; // Liveness score (0-1)
    speechiness?: number; // Speechiness score (0-1)
  };

  // Platform and Source Information
  platform: string | null; // youtube, spotify, soundcloud, etc.
  platformId: string | null; // Platform-specific ID
  platformUrl: string | null; // Platform URL

  // Content Classification
  keywords: string[] | null;
  genreTags: string[] | null; // Genre-specific tags
  moodTags: string[] | null; // Mood-specific tags
  instrumentTags: string[] | null; // Instrument tags
  language?: string | null; // Detected language
  isInstrumental?: boolean; // Whether the audio is instrumental
  audienceKeywords: string[] | null; // abstract, surrealism, etc.

  // User and Context
  userTags?: string[] | null; // User-defined tags
  promptUsed?: string; // Prompt used to generate/analyze the audio
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MediaFile {
  _id?: ObjectId;
  tags: string[]; // Array of tag IDs
  clientId: string;
  projectId?: string; // Optional project for filtering
  /** Optional parent media reference for derived/split media */
  parentMediaId?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  contentType: 'video' | 'audio' | 'image' | 'document' | 'unknown';
  contentMimeType: string;
  contentSubType: string; // Changed from enum to string
  contentSource: string; // Changed from enum to string, default 'upload'
  contentSourceUrl?: string;
  metadata: RagImageMetadata | RagAudioMetadata | any; // AI analysis metadata or flexible metadata object
  fileName?: string;
  fileSize?: number;
  filePath?: string; // Path to the actual file
}

export interface CreateTagRequest {
  id: string;
  displayName: string;
  clientId?: string;
}

export interface CreateMediaFileRequest {
  tags: string[];
  clientId?: string;
  projectId?: string;
  parentMediaId?: string;
  contentType: 'video' | 'audio' | 'image' | 'document' | 'unknown';
  contentMimeType: string;
  contentSubType: string;
  contentSource: string;
  contentSourceUrl?: string;
  metadata?: any;
  fileName?: string;
  fileSize?: number;
  filePath?: string;
}

export interface UpdateMediaFileRequest {
  tags?: string[];
  contentType?: 'video' | 'audio' | 'image' | 'document' | 'unknown';
  contentMimeType?: string;
  contentSubType?: string;
  contentSource?: string;
  contentSourceUrl?: string;
  metadata?: any;
  fileName?: string;
  fileSize?: number;
  filePath?: string;
  parentMediaId?: string;
}
