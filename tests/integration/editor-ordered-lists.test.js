import { describe, expect, it } from 'vitest';
import { EditorCore } from '../../src/core/EditorCore.js';

function createEditor(value, opts = {}) {
  const host = document.createElement('div');
  host.style.height = '720px';
  document.body.appendChild(host);
  return new EditorCore(host, { value, ...opts });
}

function getLineRange(value, startLine, endLine = startLine) {
  const lines = value.split('\n');
  let from = 0;
  for (let index = 0; index < startLine; index++) {
    from += lines[index].length + 1;
  }

  let to = from;
  for (let index = startLine; index <= endLine; index++) {
    to += lines[index].length;
    if (index < endLine) to += 1;
  }

  return { from, to };
}

function dispatchTab(editor, opts = {}) {
  editor._codePanel.focus();
  editor._codePanel._view.contentDOM.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'Tab',
    shiftKey: opts.shiftKey === true,
    bubbles: true,
    cancelable: true,
  }));
}

function waitForPreviewUpdate(delayMs = 180) {
  return new Promise(resolve => {
    setTimeout(resolve, delayMs);
  });
}

describe('EditorCore ordered list interactions', () => {
  it('renders a nested ordered list in preview after tabbing an ordered-list line', async () => {
    const input = '1. item one\n2. item two\n3. item three';
    const editor = createEditor(input, { mode: 'split' });
    const secondLine = getLineRange(input, 1);

    editor._codePanel.setSelection(secondLine.from, secondLine.from);
    dispatchTab(editor);
    await waitForPreviewUpdate();

    expect(editor.getMarkdown()).toBe('1. item one\n    1. item two\n2. item three');

    const previewRoot = editor._previewPanel.getRoot();
    const orderedLists = previewRoot.querySelectorAll('ol');
    const nestedList = previewRoot.querySelector('li ol');

    expect(orderedLists.length).toBe(2);
    expect(nestedList).toBeTruthy();
    expect(nestedList?.children).toHaveLength(1);

    editor.destroy();
  });

  it('renders mixed bullet and ordered-list selections with nested ordered preview structure', async () => {
    const input = '- bullet\n1. first\n2. second\n3. third';
    const editor = createEditor(input, { mode: 'split' });
    const selection = getLineRange(input, 0, 2);

    editor._codePanel.setSelection(selection.to, selection.from);
    dispatchTab(editor);
    await waitForPreviewUpdate();

    expect(editor.getMarkdown()).toBe('  - bullet\n    1. first\n    2. second\n1. third');

    const previewRoot = editor._previewPanel.getRoot();
    const bulletLists = previewRoot.querySelectorAll('ul');
    const orderedLists = previewRoot.querySelectorAll('ol');
    const nestedOrderedList = previewRoot.querySelector('ul li ol');

    expect(bulletLists.length).toBe(1);
    expect(nestedOrderedList).toBeTruthy();
    expect(nestedOrderedList?.children).toHaveLength(2);
    expect(orderedLists.length).toBe(2);
    expect(orderedLists[1]?.children).toHaveLength(1);

    editor.destroy();
  });
});