import { describe, expect, it } from 'vitest';
import { listActions } from '../../../src/plugins/lists.js';

function createApi(markdown, selection) {
  let currentMarkdown = markdown;
  let currentSelection = selection;
  let lastSetMarkdownOptions = null;

  return {
    getSelection() {
      return currentSelection;
    },
    getMarkdown() {
      return currentMarkdown;
    },
    setMarkdown(nextMarkdown, opts) {
      currentMarkdown = nextMarkdown;
      lastSetMarkdownOptions = opts;
    },
    setSelection(from, to) {
      currentSelection = { ...currentSelection, from, to };
    },
    readMarkdown() {
      return currentMarkdown;
    },
    readSelection() {
      return currentSelection;
    },
    readSetMarkdownOptions() {
      return lastSetMarkdownOptions;
    },
  };
}

describe('listActions ordered list', () => {
  it('numbers selected lines sequentially instead of repeating 1.', () => {
    const markdown = ['ijoijoi', 'ojoijo', 'oijoij', 'pokpok'].join('\n');
    const api = createApi(markdown, {
      from: 0,
      to: markdown.length,
      text: markdown,
      lineFrom: 0,
      lineTo: 3,
    });

    listActions.find((action) => action.id === 'ol').run(api);

    expect(api.readMarkdown()).toBe([
      '1. ijoijoi',
      '2. ojoijo',
      '3. oijoij',
      '4. pokpok',
    ].join('\n'));
    expect(api.readSelection()).toMatchObject({ from: 3, to: 3 });
    expect(api.readSetMarkdownOptions()).toEqual({ preservePreviewScroll: true });
  });

  it('keeps blank lines untouched while continuing numbering for non-empty lines', () => {
    const markdown = ['alpha', '', 'beta', 'gamma'].join('\n');
    const api = createApi(markdown, {
      from: 0,
      to: markdown.length,
      text: markdown,
      lineFrom: 0,
      lineTo: 3,
    });

    listActions.find((action) => action.id === 'ol').run(api);

    expect(api.readMarkdown()).toBe([
      '1. alpha',
      '',
      '2. beta',
      '3. gamma',
    ].join('\n'));
  });
});
