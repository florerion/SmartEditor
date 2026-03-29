import { describe, expect, it } from 'vitest';
import { HintContextDetector } from '../../../../src/core/hints/HintContextDetector.js';

describe('HintContextDetector', () => {
  it('detects heading, blockquote and table contexts from current line', () => {
    const detector = new HintContextDetector();

    const headingTags = detector.contextFromSelection('# Heading', { lineFrom: 0, from: 2 });
    expect(headingTags).toContain('edit:heading');
    expect(headingTags).toContain('edit:h1');

    const quoteTags = detector.contextFromSelection('> Quoted text', { lineFrom: 0, from: 3 });
    expect(quoteTags).toContain('edit:blockquote');

    const tableTags = detector.contextFromSelection('| Col 1 | Col 2 |', { lineFrom: 0, from: 4 });
    expect(tableTags).toContain('edit:table');
    expect(tableTags).toContain('edit:table-row');
  });

  it('detects inline markdown contexts under cursor', () => {
    const detector = new HintContextDetector();

    const boldTags = detector.contextFromSelection('A **bold** value', { lineFrom: 0, from: 5 });
    expect(boldTags).toContain('edit:bold');

    const italicTags = detector.contextFromSelection('A *hint* value', { lineFrom: 0, from: 4 });
    expect(italicTags).toContain('edit:italic');

    const inlineCodeTags = detector.contextFromSelection('Run `npm test` now', { lineFrom: 0, from: 6 });
    expect(inlineCodeTags).toContain('edit:inline-code');
  });

  it('detects fenced code-block context for lines inside fence', () => {
    const detector = new HintContextDetector();
    const markdown = '```js\nconsole.log(1)\n```';
    const cursor = markdown.indexOf('console') + 3;

    const tags = detector.contextFromSelection(markdown, { lineFrom: 1, from: cursor });

    expect(tags).toContain('edit:code-block');
  });

  it('detects image and link construction contexts under cursor', () => {
    const detector = new HintContextDetector();

    const image = '![Alt text](https://example.com/image.png)';
    const imageAltTags = detector.contextFromSelection(image, { lineFrom: 0, from: 4 });
    expect(imageAltTags).toContain('edit:image-markdown');
    expect(imageAltTags).toContain('edit:image-alt');

    const link = '[Docs](https://example.com/docs)';
    const linkLabelTags = detector.contextFromSelection(link, { lineFrom: 0, from: 2 });
    expect(linkLabelTags).toContain('edit:link-markdown');
    expect(linkLabelTags).toContain('edit:link-label');

    const linkUrlTags = detector.contextFromSelection(link, { lineFrom: 0, from: 10 });
    expect(linkUrlTags).toContain('edit:link-markdown');
    expect(linkUrlTags).toContain('edit:link-url');
  });

  it('adds key contexts for list indentation shortcuts', () => {
    const detector = new HintContextDetector();

    const tags = detector.contextFromKey({ key: 'Tab', lineText: '- item' });

    expect(tags).toContain('key:tab');
    expect(tags).toContain('key:list-indent-ul');
    expect(tags).toContain('edit:list-item');
  });
});
