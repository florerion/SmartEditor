import { describe, expect, it } from 'vitest';
import { CodePanel } from '../../../src/ui/CodePanel.js';

function createCodePanel(value = '') {
  const host = document.createElement('div');
  host.style.height = '360px';
  host.style.width = '800px';
  document.body.appendChild(host);

  const panel = new CodePanel(host, {
    value,
    onChange: () => {},
    onCursorMove: () => {},
    onSelectionChange: () => {},
    onScroll: () => {},
  });

  return panel;
}

describe('CodePanel', () => {
  it('setValue(value, undoable=false) does not add an undo history entry', () => {
    const panel = createCodePanel('alpha');
    panel.setValue('beta', false);

    panel.undo();
    expect(panel.getValue()).toBe('beta');

    panel.destroy();
  });

  it('replaceRange(from, to, text) does not force cursor move', () => {
    const panel = createCodePanel('abc\nxyz');
    panel.setSelection(0, 0);

    panel.replaceRange(4, 7, 'pqr');
    const selection = panel.getSelection();

    expect(selection.from).toBe(0);
    expect(selection.to).toBe(0);
    expect(panel.getValue()).toBe('abc\npqr');

    panel.destroy();
  });

});
