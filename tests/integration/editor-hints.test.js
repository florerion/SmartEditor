import { describe, expect, it } from 'vitest';
import { EditorCore } from '../../src/core/EditorCore.js';

function createEditor(value, opts = {}) {
  const host = document.createElement('div');
  host.style.height = '720px';
  document.body.appendChild(host);
  return new EditorCore(host, { value, ...opts });
}

function getHintText(editor) {
  return editor._hintsBarEl.querySelector('.se-hints-bar__content')?.textContent?.trim() ?? '';
}

describe('EditorCore hints integration', () => {
  it('forces toolbar-triggered hint replacement even when a hint is already visible', async () => {
    const editor = createEditor('Initial', {
      hints: {
        enabled: true,
        debounceMs: 0,
        autoHideMs: 0,
        matchSelection: 'first',
        noMatchFallback: 'none',
        items: [
          { id: 'bold-hint', text: 'BOLD HINT', contexts: ['action:bold'], priority: 100 },
          { id: 'italic-hint', text: 'ITALIC HINT', contexts: ['action:italic'], priority: 100 },
        ],
      },
    });

    const boldBtn = editor._toolbarContainer.querySelector('[data-toolbar-item-id="bold"]');
    const italicBtn = editor._toolbarContainer.querySelector('[data-toolbar-item-id="italic"]');

    expect(boldBtn).toBeTruthy();
    expect(italicBtn).toBeTruthy();

    boldBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
    expect(getHintText(editor)).toBe('BOLD HINT');

    italicBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
    expect(getHintText(editor)).toBe('ITALIC HINT');

    editor.destroy();
  });

  it('keeps throttling for non-toolbar payloads while allowing toolbar force', () => {
    const editor = createEditor('Initial', { hints: { autoHideMs: 0 } });

    editor._hintsBar.show('Visible now');
    editor._applyHintPayload({ type: 'show', hint: { text: 'From keyboard' }, source: 'keyboard' });
    expect(getHintText(editor)).toBe('Visible now');

    editor._applyHintPayload({ type: 'show', hint: { text: 'From toolbar' }, source: 'toolbar' });
    expect(getHintText(editor)).toBe('From toolbar');

    editor.destroy();
  });
});
