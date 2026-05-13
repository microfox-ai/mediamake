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
  /** Original hardcoded shortcut — used for display and reset. */
  defaultShortcut: string;
  defaultShortcutDisplay: string;
}

function h(
  id: string,
  label: string,
  shortcut: string,
  shortcutDisplay: string,
  description: string,
): WordHelper {
  return { id, label, shortcut, shortcutDisplay, description, defaultShortcut: shortcut, defaultShortcutDisplay: shortcutDisplay };
}

export const WORD_HELPERS: WordHelper[] = [
  h('synonyms',    'Synonyms',       'Alt-s', 'Alt+S', 'Words with the same or similar meaning'),
  h('rhymes',      'Rhymes',         'Alt-r', 'Alt+R', 'Words that rhyme'),
  h('antonyms',    'Antonyms',       'Alt-a', 'Alt+A', 'Words with the opposite meaning'),
  h('stronger',    'Stronger',       'Alt-w', 'Alt+W', 'More powerful or impactful alternatives'),
  h('simpler',     'Simpler',        'Alt-p', 'Alt+P', 'Plainer, more accessible alternatives'),
  h('formal',      'More Formal',    'Alt-f', 'Alt+F', 'Elevated register alternatives'),
  h('casual',      'More Casual',    'Alt-c', 'Alt+C', 'Conversational, informal alternatives'),
  h('descriptors', 'Descriptors',    'Alt-d', 'Alt+D', 'Adjectives and descriptive words'),
  h('related',     'Related Words',  'Alt-t', 'Alt+T', 'Semantically related words'),
  h('emotional',   'More Emotional', 'Alt-e', 'Alt+E', 'More evocative or emotionally charged alternatives'),
  h('metaphors',   'Metaphors',      'Alt-m', 'Alt+M', 'Figurative or metaphorical alternatives'),
  h('alliterative','Alliterative',   'Alt-i', 'Alt+I', 'Alternatives that start with the same sound'),
];
