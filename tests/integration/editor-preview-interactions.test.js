import { describe, expect, it, vi } from 'vitest';
import { EditorCore } from '../../src/core/EditorCore.js';

function createEditor(value, opts = {}) {
  const host = document.createElement('div');
  host.style.height = '720px';
  document.body.appendChild(host);
  return new EditorCore(host, { value, ...opts });
}

describe('EditorCore preview interactions', () => {
  it('changes code fence language from preview toolbar select', () => {
    const editor = createEditor('```js\nconsole.log(1)\n```');
    const previewRoot = editor._previewPanel.getRoot();
    const select = previewRoot.querySelector('.se-code-block__lang-select');

    expect(select).toBeTruthy();

    select.value = 'python';
    select.dispatchEvent(new Event('change', { bubbles: true }));

    expect(editor.getMarkdown().split('\n')[0]).toBe('```python');

    editor.destroy();
  });

  it('calls clipboard API when preview code-block copy is clicked', async () => {
    const editor = createEditor('```js\nconsole.log(1)\n```');
    const clipboardSpy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();

    const btn = editor._previewPanel.getRoot().querySelector('.se-code-block__copy-btn');
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    await Promise.resolve();
    expect(clipboardSpy).toHaveBeenCalledWith('console.log(1)\n');

    editor.destroy();
  });

  it('enables scroll sync only for split mode when scrollSync is not disabled', () => {
    const splitEditor = createEditor('# One', { mode: 'split', scrollSync: true });
    expect(splitEditor._isScrollSyncActive()).toBe(true);

    splitEditor.setMode('code');
    expect(splitEditor._isScrollSyncActive()).toBe(false);
    splitEditor.destroy();

    const disabledEditor = createEditor('# Two', { mode: 'split', scrollSync: false });
    expect(disabledEditor._isScrollSyncActive()).toBe(false);
    disabledEditor.destroy();
  });
});
