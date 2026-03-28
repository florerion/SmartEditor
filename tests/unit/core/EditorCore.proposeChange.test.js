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

    editor.setSelection(5, 5);
    const applied = await editor.proposeChange('!', { mode: 'replace-selection' });

    expect(applied).toBe(true);
    expect(editor.getMarkdown()).toBe('hello!');
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
});
