/**
 * wordHelpers.ts — shared config for all word-level AI helper agents.
 *
 * Each helper has:
 *  - id          : used as the `agent` param in POST /api/studio/chat/agent/editor/word
 *  - label       : displayed in the popup header and context menu
 *  - shortcut    : CodeMirror keymap format (Alt-<key>)
 *  - shortcutDisplay : human-readable label for UI
 *  - description : one-liner shown in the context menu
 */

export interface WordHelper {
  id: string;
  label: string;
  shortcut: string;
  shortcutDisplay: string;
  description: string;
}

export const WORD_HELPERS: WordHelper[] = [
  {
    id: 'synonyms',
    label: 'Synonyms',
    shortcut: 'Alt-s',
    shortcutDisplay: 'Alt+S',
    description: 'Words with the same or similar meaning',
  },
  {
    id: 'rhymes',
    label: 'Rhymes',
    shortcut: 'Alt-r',
    shortcutDisplay: 'Alt+R',
    description: 'Words that rhyme',
  },
  {
    id: 'antonyms',
    label: 'Antonyms',
    shortcut: 'Alt-a',
    shortcutDisplay: 'Alt+A',
    description: 'Words with the opposite meaning',
  },
  {
    id: 'stronger',
    label: 'Stronger',
    shortcut: 'Alt-w',
    shortcutDisplay: 'Alt+W',
    description: 'More powerful or impactful alternatives',
  },
  {
    id: 'simpler',
    label: 'Simpler',
    shortcut: 'Alt-p',
    shortcutDisplay: 'Alt+P',
    description: 'Plainer, more accessible alternatives',
  },
  {
    id: 'formal',
    label: 'More Formal',
    shortcut: 'Alt-f',
    shortcutDisplay: 'Alt+F',
    description: 'Elevated register alternatives',
  },
  {
    id: 'casual',
    label: 'More Casual',
    shortcut: 'Alt-c',
    shortcutDisplay: 'Alt+C',
    description: 'Conversational, informal alternatives',
  },
  {
    id: 'descriptors',
    label: 'Descriptors',
    shortcut: 'Alt-d',
    shortcutDisplay: 'Alt+D',
    description: 'Adjectives and descriptive words',
  },
  {
    id: 'related',
    label: 'Related Words',
    shortcut: 'Alt-t',
    shortcutDisplay: 'Alt+T',
    description: 'Semantically related words',
  },
  {
    id: 'emotional',
    label: 'More Emotional',
    shortcut: 'Alt-e',
    shortcutDisplay: 'Alt+E',
    description: 'More evocative or emotionally charged alternatives',
  },
  {
    id: 'metaphors',
    label: 'Metaphors',
    shortcut: 'Alt-m',
    shortcutDisplay: 'Alt+M',
    description: 'Figurative or metaphorical alternatives',
  },
  {
    id: 'alliterative',
    label: 'Alliterative',
    shortcut: 'Alt-i',
    shortcutDisplay: 'Alt+I',
    description: 'Alternatives that start with the same sound',
  },
];
