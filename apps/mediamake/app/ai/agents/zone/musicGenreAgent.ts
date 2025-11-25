import { AiRouter } from '@microfox/ai-router';
import { z } from 'zod';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import dedent from 'dedent';

const aiRouter = new AiRouter();

// Genre lists for AI reference
const MAIN_GENRES = [
  'Afrobeat',
  'Afropop',
  'Alternative',
  'Big Band',
  'Blues',
  "Children's Music",
  'Christian/Gospel',
  'Classical',
  'Comedy',
  'Country',
  'Dance',
  'Electronic',
  'Fitness & Workout',
  'Folk',
  'French Pop',
  'German Folk',
  'German Pop',
  'Hip Hop/Rap',
  'Holiday',
  'J-Pop',
  'Jazz',
  'K-Pop',
  'Latin',
  'Latin Urban',
  'Metal',
  'New Age',
  'Pop',
  'Punk',
  'R&B/Soul',
  'Reggae',
  'Rock',
  'Singer/Songwriter',
  'Soundtrack',
  'Spoken Word',
  'Vocal',
  'World',
];

const ELECTRONIC_SUBGENRES = [
  'Big Room',
  'Breaks',
  'Chill Out',
  'Deep House',
  'Drum & Bass',
  'Dubstep',
  'Electro House',
  'Electronica / Downtempo',
  'Funk / Soul / Disco',
  'Glitch Hop',
  'Hard Dance',
  'Hardcore / Hard Techno',
  'Hip-Hop / R&B',
  'House',
  'Indie Dance / Nu Disco',
  'Minimal / Deep Tech',
  'Progressive House',
  'Psy-Trance',
  'Reggae / Dancehall / Dub',
  'Tech House',
  'Techno',
  'Trance',
];

const MAINGENRES = [
  {
    id: '58',
    genre: 'Afrobeat',
  },
  {
    id: '59',
    genre: 'Afropop',
  },
  {
    id: '1',
    genre: 'Alternative',
  },
  {
    id: '2',
    genre: 'Big Band',
  },
  {
    id: '3',
    genre: 'Blues',
  },
  {
    id: '4',
    genre: "Children's Music",
  },
  {
    id: '5',
    genre: 'Christian/Gospel',
  },
  {
    id: '33',
    genre: 'Classical',
  },
  {
    id: '6',
    genre: 'Comedy',
  },
  {
    id: '7',
    genre: 'Country',
  },
  {
    id: '8',
    genre: 'Dance',
  },
  {
    id: '9',
    genre: 'Electronic',
  },
  {
    id: '10',
    genre: 'Fitness & Workout',
  },
  {
    id: '11',
    genre: 'Folk',
  },
  {
    id: '12',
    genre: 'French Pop',
  },
  {
    id: '13',
    genre: 'German Folk',
  },
  {
    id: '14',
    genre: 'German Pop',
  },
  {
    id: '16',
    genre: 'Hip Hop/Rap',
  },
  {
    id: '17',
    genre: 'Holiday',
  },
  {
    id: '19',
    genre: 'J-Pop',
  },
  {
    id: '20',
    genre: 'Jazz',
  },
  {
    id: '21',
    genre: 'K-Pop',
  },
  {
    id: '22',
    genre: 'Latin',
  },
  {
    id: '56',
    genre: 'Latin Urban',
  },
  {
    id: '15',
    genre: 'Metal',
  },
  {
    id: '23',
    genre: 'New Age',
  },
  {
    id: '24',
    genre: 'Pop',
  },
  {
    id: '34',
    genre: 'Punk',
  },
  {
    id: '25',
    genre: 'R&B/Soul',
  },
  {
    id: '26',
    genre: 'Reggae',
  },
  {
    id: '27',
    genre: 'Rock',
  },
  {
    id: '28',
    genre: 'Singer/Songwriter',
  },
  {
    id: '29',
    genre: 'Soundtrack',
  },
  {
    id: '30',
    genre: 'Spoken Word',
  },
  {
    id: '31',
    genre: 'Vocal',
  },
  {
    id: '32',
    genre: 'World',
  },
];

const ELECTRONICGENRES = [
  {
    id: '57',
    genre: 'Big Room',
  },
  {
    id: '35',
    genre: 'Breaks',
  },
  {
    id: '36',
    genre: 'Chill Out',
  },
  {
    id: '55',
    genre: 'Deep House',
  },
  {
    id: '37',
    genre: 'Drum & Bass',
  },
  {
    id: '38',
    genre: 'Dubstep',
  },
  {
    id: '39',
    genre: 'Electro House',
  },
  {
    id: '40',
    genre: 'Electronica / Downtempo',
  },
  {
    id: '41',
    genre: 'Funk / Soul / Disco',
  },
  {
    id: '42',
    genre: 'Glitch Hop',
  },
  {
    id: '43',
    genre: 'Hard Dance',
  },
  {
    id: '44',
    genre: 'Hardcore / Hard Techno',
  },
  {
    id: '45',
    genre: 'Hip-Hop / R&B',
  },
  {
    id: '46',
    genre: 'House',
  },
  {
    id: '47',
    genre: 'Indie Dance / Nu Disco',
  },
  {
    id: '48',
    genre: 'Minimal / Deep Tech',
  },
  {
    id: '49',
    genre: 'Progressive House',
  },
  {
    id: '50',
    genre: 'Psy-Trance',
  },
  {
    id: '51',
    genre: 'Reggae / Dancehall / Dub',
  },
  {
    id: '52',
    genre: 'Tech House',
  },
  {
    id: '53',
    genre: 'Techno',
  },
  {
    id: '54',
    genre: 'Trance',
  },
];
// Preference set schema
const PreferenceSetSchema = z.object({
  mainGenre: z.string().describe('The main genre name'),
  subGenre: z
    .string()
    .describe(
      'The subgenre name (only for Electronic main genre, otherwise empty string)',
    ),
  reasoning: z
    .string()
    .describe(
      'Detailed reasoning for this genre selection based on the music description',
    ),
});

// Genre analysis response schema
const GenreAnalysisResponseSchema = z.object({
  preference1: PreferenceSetSchema,
  preference2: PreferenceSetSchema,
  preference3: PreferenceSetSchema,
});

export const musicGenreAgent = aiRouter
  .agent('/', async ctx => {
    try {
      ctx.response.writeMessageMetadata({
        loader: 'Analyzing music genre...',
      });

      const { musicDescription, model } = ctx.request.params;

      const selectedModel = google(model || 'gemini-2.5-pro');

      const result = await generateObject({
        model: selectedModel,
        system: dedent`
          You are a music genre classification expert. Analyze music descriptions and provide 3 different preference sets for genre classification.
          
          Available Main Genres: ${MAIN_GENRES.join(', ')}
          
          Electronic Subgenres (only use when mainGenre is "Electronic"): ${ELECTRONIC_SUBGENRES.join(', ')}
          
          Instructions:
          1. Provide 3 different preference sets based on the music description
          2. Each preference should have a different mainGenre
          3. Only use subGenre when mainGenre is "Electronic" - otherwise use empty string ""
          4. Provide detailed reasoning for each genre selection
          5. Consider different interpretations or aspects of the music description
          6. Use only the exact genre names from the provided lists
          7. Make the preferences diverse and well-reasoned
        `,
        prompt: dedent`
          Analyze this music description and provide 3 different genre preference sets:
          
          "${musicDescription}"
          
          Return your analysis with three preference sets, each containing mainGenre, subGenre, and reasoning.
        `,
        schema: GenreAnalysisResponseSchema,
        maxOutputTokens: 2000,
      });

      console.log('Genre Analysis Result USAGE', result.usage);

      return result.object;
    } catch (error) {
      console.error('Error analyzing music genre:', error);
      throw error;
    }
  })
  .actAsTool('/', {
    id: 'identifyMusicGenre',
    name: 'Identify Music Genre',
    description: 'Identifies the music genre based on the music description.',
    inputSchema: z.object({
      musicDescription: z
        .string()
        .describe('Description of the music to analyze'),
      model: z.string().optional().describe('AI model to use for generation'),
    }) as any,
    outputSchema: GenreAnalysisResponseSchema as any,
    metadata: {
      icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRTQaL6HQOX4bhpwA8KCfj-th4rxHnXfdggIg&s',
      title: 'Music Genre Analyzer',
      hideUI: false,
    },
  });
