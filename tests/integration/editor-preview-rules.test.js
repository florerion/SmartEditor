import { describe, expect, it, vi } from 'vitest';
import { EditorCore } from '../../src/core/EditorCore.js';
import {
  createIncludeDecorationRule,
  createIncludeSourceMapRule,
  createImageRelativeSrcPrefixRule,
  createMarkdownIncludeDirectiveRule,
} from '../../src/core/preview/rules.js';

function createEditor(value, opts = {}) {
  const host = document.createElement('div');
  host.style.height = '720px';
  document.body.appendChild(host);
  return new EditorCore(host, { value, ...opts });
}

describe('EditorCore preview rules', () => {
  it('prefixes relative image src in preview HTML phase', () => {
    const editor = createEditor('![img](/content/assets/image1.jpg)', {
      previewRules: {
        html: [
          createImageRelativeSrcPrefixRule({
            prefix: 'https://mycloudspace.org',
          }),
        ],
      },
    });

    expect(editor.getPreview()).toContain('https://mycloudspace.org/content/assets/image1.jpg');

    editor.destroy();
  });

  it('expands include directive in markdown phase using resolver', async () => {
    const sourceMap = {
      'snippets/snippet1.md': '## Included Title\n\nIncluded paragraph.',
    };

    const editor = createEditor('{% include "snippets/snippet1.md" %}', {
      previewRules: {
        includeResolver: async (path) => sourceMap[path] ?? '',
        markdown: [createMarkdownIncludeDirectiveRule()],
      },
    });

    await editor.rebuildPreview();
    expect(editor.getPreview()).toContain('Included Title');
    expect(editor.getPreview()).toContain('Included paragraph.');

    editor.destroy();
  });

  it('supports runtime rule registration', async () => {
    const editor = createEditor('![img](/content/assets/image1.jpg)');
    expect(editor.getPreview()).toContain('/content/assets/image1.jpg');

    editor.registerPreviewRule(createImageRelativeSrcPrefixRule({
      id: 'runtime-prefix',
      prefix: 'https://mycloudspace.org',
    }));

    await editor.rebuildPreview();
    expect(editor.getPreview()).toContain('https://mycloudspace.org/content/assets/image1.jpg');

    editor.destroy();
  });

  it('ignores stale async pipeline result when newer render wins', async () => {
    vi.useFakeTimers();

    const delayedRule = {
      id: 'delayed-md',
      phase: 'markdown',
      async: true,
      run: async (input) => new Promise((resolve) => {
        const wait = input === 'A' ? 70 : 0;
        setTimeout(() => resolve(`${input} done`), wait);
      }),
    };

    const editor = createEditor('A', {
      previewRules: {
        markdown: [delayedRule],
      },
    });

    editor.setMarkdown('A', { undoable: false });
    editor.setMarkdown('B', { undoable: false });

    await vi.runAllTimersAsync();
    const pendingRebuild = editor.rebuildPreview();
    await vi.runAllTimersAsync();
    await pendingRebuild;

    expect(editor.getPreview()).toContain('B done');
    expect(editor.getPreview()).not.toContain('A done');

    editor.destroy();
    vi.useRealTimers();
  });

  it('maps expanded include preview clicks back to include directive line', async () => {
    const markdown = '{% include "snippets/snippet1.md" %}';
    const sourceMap = {
      'snippets/snippet1.md': '## Included Title\n\nIncluded paragraph.',
    };
    const onPreviewClick = vi.fn();

    const editor = createEditor(markdown, {
      previewRules: {
        includeResolver: async (path) => sourceMap[path] ?? '',
        markdown: [
          createMarkdownIncludeDirectiveRule({ annotate: true }),
        ],
        html: [
          createIncludeSourceMapRule(),
        ],
      },
      onPreviewClick,
    });

    await editor.rebuildPreview();
    const expectedIncludeLine = editor.getMarkdown().slice(0, editor.getMarkdown().indexOf('{% include')).split('\n').length - 1;

    const includeHeading = editor._previewPanel
      .getRoot()
      .querySelector('h2');

    expect(includeHeading).toBeTruthy();
    includeHeading.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onPreviewClick).toHaveBeenCalledTimes(1);
    expect(onPreviewClick.mock.calls[0][1].from).toBe(expectedIncludeLine);

    editor.destroy();
  });

  it('decorates include content with collapsible wrapper', async () => {
    const sourceMap = {
      'snippets/snippet1.md': '## Included Title\n\nIncluded paragraph.',
    };

    const editor = createEditor('{% include "snippets/snippet1.md" %}', {
      previewRules: {
        includeResolver: async (path) => sourceMap[path] ?? '',
        markdown: [
          createMarkdownIncludeDirectiveRule({ annotate: true }),
        ],
        html: [
          createIncludeSourceMapRule(),
          createIncludeDecorationRule(),
        ],
      },
    });

    await editor.rebuildPreview();
    const previewRoot = editor._previewPanel.getRoot();

    const wrapper = previewRoot.querySelector('details.se-include-block');
    const summary = previewRoot.querySelector('.se-include-header');
    const heading = previewRoot.querySelector('h2');

    expect(wrapper).toBeTruthy();
    expect(summary).toBeTruthy();
    expect(heading).toBeTruthy();
    expect(summary.textContent).toContain('Included snippet');

    editor.destroy();
  });

  it('keeps downstream preview-to-code mapping after expanded include block', async () => {
    const sourceMap = {
      'snippets/snippet1.md': [
        '## Included Title',
        '',
        'Included paragraph line 1.',
        'Included paragraph line 2.',
      ].join('\n'),
    };
    const onPreviewClick = vi.fn();
    const markdown = [
      'Before include',
      '{% include "snippets/snippet1.md" %}',
      'After include first line',
      'After include second line',
    ].join('\n');

    const editor = createEditor(markdown, {
      previewRules: {
        includeResolver: async (path) => sourceMap[path] ?? '',
        markdown: [
          createMarkdownIncludeDirectiveRule({ annotate: true }),
        ],
        html: [
          createIncludeSourceMapRule(),
          createIncludeDecorationRule(),
        ],
      },
      onPreviewClick,
    });

    await editor.rebuildPreview();

    editor._codePanel._scroller.scrollTo = vi.fn();

    const previewRoot = editor._previewPanel.getRoot();
    const afterLine = Array.from(previewRoot.querySelectorAll('p')).find((el) =>
      (el.textContent ?? '').includes('After include first line'));

    expect(afterLine).toBeTruthy();

    afterLine.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onPreviewClick).toHaveBeenCalledTimes(1);
    expect(onPreviewClick.mock.calls[0][1].from).toBe(2);

    editor.destroy();
  });
});
