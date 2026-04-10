import { describe, it, expect, vi } from 'vitest';
import { EditorCore } from '../../../src/core/EditorCore.js';

function createEditor(value, opts = {}) {
  const host = document.createElement('div');
  host.style.height = '720px';
  document.body.appendChild(host);
  return new EditorCore(host, { value, ...opts });
}

describe('EditorCore incremental preview rendering', () => {
  it('re-renders only changed block for large safe markdown documents', () => {
    const hugePayload = `![img](data:image/png;base64,${'a'.repeat(62_000)})`;
    const initial = [
      '# Intro',
      '',
      hugePayload,
      '',
      'Tail paragraph',
    ].join('\n');

    const editor = createEditor(initial);
    const renderSpy = vi.spyOn(editor._parser, 'render');

    const next = initial.replace('Tail paragraph', 'Tail paragraph updated');
    editor.setMarkdown(next, { undoable: false });

    // For this update only one dirty block should be rendered.
    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(editor.getPreview()).toContain('Tail paragraph updated');

    editor.destroy();
  });

  it('falls back to full render for risky global markdown constructs', () => {
    const hugePayload = `![img](data:image/png;base64,${'b'.repeat(62_000)})`;
    const initial = [
      '# Intro',
      '',
      hugePayload,
      '',
      '[doc-ref]: https://example.com',
      '',
      'Using [doc-ref]',
    ].join('\n');

    const editor = createEditor(initial);
    expect(editor._previewBlockCache).toBeNull();

    const renderSpy = vi.spyOn(editor._parser, 'render');
    const next = initial.replace('Using [doc-ref]', 'Using [doc-ref] updated');
    editor.setMarkdown(next, { undoable: false });

    // Full render path calls parser once and keeps block cache disabled.
    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(editor._previewBlockCache).toBeNull();

    editor.destroy();
  });

  it('keeps source-line mapping correct after block count changes', () => {
    const hugePayload1 = `![img-1](data:image/png;base64,${'x'.repeat(62_000)})`;
    const hugePayload2 = `![img-2](data:image/png;base64,${'y'.repeat(62_000)})`;
    const initial = [
      '| col1 | col2 |',
      '| --- | --- |',
      '| a | b |',
      '',
      hugePayload1,
      '',
      'Paragraph below images',
    ].join('\n');

    const editor = createEditor(initial);

    const next = [
      '| col1 | col2 |',
      '| --- | --- |',
      '| a | b |',
      '',
      hugePayload1,
      '',
      hugePayload2,
      '',
      'Paragraph below images',
    ].join('\n');

    editor.setMarkdown(next, { undoable: false });

    const previewRoot = editor._previewPanel.getRoot();
    const paragraph = Array.from(previewRoot.querySelectorAll('p'))
      .find((el) => (el.textContent || '').includes('Paragraph below images'));

    expect(paragraph).toBeTruthy();
    expect(paragraph.getAttribute('data-source-line')).toBe('8');
    expect(paragraph.getAttribute('data-source-line-end')).toBe('8');

    const tableLastRowCell = previewRoot.querySelector('tbody tr:last-child td:first-child');
    expect(tableLastRowCell).toBeTruthy();
    expect(tableLastRowCell.getAttribute('data-source-line')).toBe('2');

    editor.destroy();
  });

  it('keeps source-line mapping stable across repeated image insertions', () => {
    const payload = (ch) => `![img-${ch}](data:image/png;base64,${ch.repeat(62_000)})`;
    const intro = [
      '| col1 | col2 |',
      '| --- | --- |',
      '| a | b |',
      '',
    ];

    const tail = [
      '',
      'Paragraph below images',
    ];

    const editor = createEditor([...intro, payload('x'), ...tail].join('\n'));

    const imageBlocks = [payload('x')];
    const expectedParagraphLine = (imageCount) => 2 + (imageCount * 2) + 2;

    for (let i = 1; i <= 5; i += 1) {
      imageBlocks.push(payload(String(i % 10)));
      const next = [
        ...intro,
        ...imageBlocks.flatMap((img, index) => (index === 0 ? [img] : ['', img])),
        ...tail,
      ].join('\n');

      editor.setMarkdown(next, { undoable: false });

      const previewRoot = editor._previewPanel.getRoot();
      const paragraph = Array.from(previewRoot.querySelectorAll('p'))
        .find((el) => (el.textContent || '').includes('Paragraph below images'));
      expect(paragraph).toBeTruthy();
      expect(paragraph.getAttribute('data-source-line')).toBe(String(expectedParagraphLine(imageBlocks.length)));

      const tableLastRowCell = previewRoot.querySelector('tbody tr:last-child td:first-child');
      expect(tableLastRowCell).toBeTruthy();
      expect(tableLastRowCell.getAttribute('data-source-line')).toBe('2');
    }

    editor.destroy();
  });
});
