import { describe, expect, it } from 'vitest';
import { Parser } from '../../../src/core/Parser.js';

describe('Parser', () => {
  it('adds source-line mapping attributes for block elements', () => {
    const parser = new Parser();
    const { html } = parser.render('# Heading\n\nParagraph');

    expect(html).toContain('data-source-line="0"');
    expect(html).toContain('data-source-line-end="0"');
    expect(html).toContain('<p data-source-line="2" data-source-line-end="2">Paragraph</p>');
  });

  it('renders code block toolbar and per-line source spans', () => {
    const parser = new Parser();
    const markdown = '```js\nconst a = 1;\nconsole.log(a);\n```';
    const { html } = parser.render(markdown);

    expect(html).toContain('class="se-code-block__toolbar" data-source-line="0"');
    expect(html).toContain('class="se-code-block__lang-select"');
    expect(html).toContain('value="javascript" selected');
    expect(html).toContain('<span data-source-line="1">');
    expect(html).toContain('<span data-source-line="2">');
  });

  it('preserves markdown image src in a dedicated data attribute', () => {
    const parser = new Parser();
    const { html } = parser.render('![Alt](https://example.com/original.png)');

    expect(html).toContain('class="se-image"');
    expect(html).toContain('data-se-markdown-src="https://example.com/original.png"');
    expect(html).toContain('src="https://example.com/original.png"');
  });
});
