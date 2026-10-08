import { Mark } from '@tiptap/core';

export const WordMark = Mark.create({
  name: 'word',

  // Exclusive so joining two lines cannot stretch one word's timing across the next.
  inclusive: false,

  addAttributes() {
    return {
      'data-absolute-start': { default: null },
      'data-absolute-end': { default: null },
      'data-confidence': { default: null },
      class: { default: 'word-highlight' },
      title: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[class*="word-highlight"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', HTMLAttributes, 0];
  },
});
