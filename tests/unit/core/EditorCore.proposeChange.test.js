import { describe, expect, it, vi } from 'vitest';
import { EditorCore } from '../../../src/core/EditorCore.js';

function createEditor(value, opts = {}) {
  const host = document.createElement('div');
  host.style.height = '720px';
  document.body.appendChild(host);
  return new EditorCore(host, { value, ...opts });
}

describe('EditorCore proposeChange and preview image delete', () => {
  it('replace-selection falls back to insert-at-cursor when selection is empty', async () => {
    const editor = createEditor('hello');
    const openSpy = vi.spyOn(editor._diffModal, 'open').mockResolvedValue(true);
    const revealSpy = vi.spyOn(editor._codePanel, 'revealPosition');

    editor.setSelection(5, 5);
    const applied = await editor.proposeChange('!', { mode: 'replace-selection' });

    expect(applied).toBe(true);
    expect(editor.getMarkdown()).toBe('hello!');
    expect(editor.getSelection()).toMatchObject({ from: 6, to: 6 });
    expect(revealSpy).toHaveBeenCalledWith(5, { y: 'center' });
    expect(openSpy).toHaveBeenCalledTimes(1);
    const opts = openSpy.mock.calls[0][2];
    expect(opts.title).toContain('insert-at-cursor');
    expect(opts.oldHighlight).toEqual({ from: 5, to: 5, cursor: true });

    editor.destroy();
  });

  it('replace-all computes focused changed-span highlights', async () => {
    const editor = createEditor('abcd');
    const openSpy = vi.spyOn(editor._diffModal, 'open').mockResolvedValue(false);

    const applied = await editor.proposeChange('abXd', { mode: 'replace-all' });

    expect(applied).toBe(false);
    const opts = openSpy.mock.calls[0][2];
    expect(opts.oldHighlight).toEqual({ from: 2, to: 3 });
    expect(opts.newHighlight).toEqual({ from: 2, to: 3 });

    editor.destroy();
  });

  it('replace-all moves selection to the end of the accepted change and reveals the last added line', async () => {
    const editor = createEditor('before');
    const revealSpy = vi.spyOn(editor._codePanel, 'revealPosition');
    const setMarkdownSpy = vi.spyOn(editor, 'setMarkdown');

    vi.spyOn(editor._diffModal, 'open').mockResolvedValue(true);

    const applied = await editor.proposeChange('before\nline 1\nline 2\n', { mode: 'replace-all' });

    expect(applied).toBe(true);
    expect(editor.getMarkdown()).toBe('before\nline 1\nline 2\n');
    expect(setMarkdownSpy).toHaveBeenCalledWith('before\nline 1\nline 2\n', { preservePreviewScroll: true });
    expect(editor.getSelection()).toMatchObject({ from: 21, to: 21, lineFrom: 3, lineTo: 3 });
    expect(revealSpy).toHaveBeenCalledWith(20, { y: 'center' });

    editor.destroy();
  });

  it('replace-selection reveals the last added line after accepting a multiline change', async () => {
    const editor = createEditor('alpha\nbeta\ngamma');
    const revealSpy = vi.spyOn(editor._codePanel, 'revealPosition');

    vi.spyOn(editor._diffModal, 'open').mockResolvedValue(true);

    editor.setSelection(6, 10);
    const applied = await editor.proposeChange('BETA\nOMEGA\n', { mode: 'replace-selection' });

    expect(applied).toBe(true);
    expect(editor.getMarkdown()).toBe('alpha\nBETA\nOMEGA\n\ngamma');
    expect(editor.getSelection()).toMatchObject({ from: 17, to: 17, lineFrom: 3, lineTo: 3 });
    expect(revealSpy).toHaveBeenCalledWith(16, { y: 'center' });

    editor.destroy();
  });

  it('throws for unsupported proposeChange mode', async () => {
    const editor = createEditor('text');

    await expect(editor.proposeChange('next', { mode: 'invalid' })).rejects.toThrow(
      'Unsupported proposeChange mode',
    );

    editor.destroy();
  });

  it('deletes full image markdown token when preview image is selected', () => {
    const editor = createEditor('before\n![Alt](https://example.com/image.png)\nafter');
    const img = editor._previewPanel.getRoot().querySelector('img.se-image');

    expect(img).toBeTruthy();

    editor._setSelectedPreviewImage(img);
    const deleted = editor._deleteSelectedPreviewImageMarkdown();

    expect(deleted).toBe(true);
    expect(editor.getMarkdown()).toBe('before\n\nafter');

    editor.destroy();
  });

  it('deletes full base64 image markdown token when preview image is selected', () => {
    const src = `data:image/png;base64,${'a'.repeat(40000)}`;
    const editor = createEditor(`before\n![Alt](${src})\nafter`);
    const img = editor._previewPanel.getRoot().querySelector('img.se-image');

    expect(img).toBeTruthy();

    editor._setSelectedPreviewImage(img);
    const event = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true });
    document.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(editor.getMarkdown()).toBe('before\n\nafter');

    editor.destroy();
  });
});
