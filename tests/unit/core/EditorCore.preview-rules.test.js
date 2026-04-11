import { describe, expect, it, vi } from 'vitest';
import { EditorCore } from '../../../src/core/EditorCore.js';

function createEditor(value, opts = {}) {
  const host = document.createElement('div');
  host.style.height = '720px';
  document.body.appendChild(host);
  return new EditorCore(host, { value, ...opts });
}

describe('EditorCore preview rules rebuild behavior', () => {
  it('uses preview pixel anchor when rebuilding with preserveScroll', async () => {
    const editor = createEditor('{% include "snippets/demo.md" %}');
    const previewRoot = editor._previewPanel.getRoot();
    previewRoot.scrollTop = 180;

    const anchor = { line: 12, offsetPx: 24, viewportRatio: 0 };
    const captureSpy = vi
      .spyOn(editor, '_capturePreviewPixelAnchorForTopVisibleLine')
      .mockReturnValue(anchor);
    const beginSpy = vi.spyOn(editor, '_beginPreviewStabilityLock');

    await editor.rebuildPreview({ preserveScroll: true });

    expect(captureSpy).toHaveBeenCalledTimes(1);
    expect(beginSpy).toHaveBeenCalledWith(180, anchor);

    editor.destroy();
  });
});
