import { describe, expect, it } from 'vitest';
import { CodePanel } from '../../../src/ui/CodePanel.js';

function createCodePanel(value = '') {
  const host = document.createElement('div');
  host.style.height = '360px';
  host.style.width = '800px';
  document.body.appendChild(host);

  return new CodePanel(host, {
    value,
    onChange: () => {},
    onCursorMove: () => {},
    onSelectionChange: () => {},
    onScroll: () => {},
  });
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

function dispatchTab(panel, opts = {}) {
  panel.focus();
  panel._view.contentDOM.dispatchEvent(new KeyboardEvent('keydown', {
    key: 'Tab',
    shiftKey: opts.shiftKey === true,
    bubbles: true,
    cancelable: true,
  }));
}

describe('CodePanel ordered list indentation', () => {
  it('indents a single ordered-list line with four spaces and resets marker to 1', () => {
    const input = '1. item one\n2. item two\n3. item three';
    const panel = createCodePanel(input);
    const secondLine = getLineRange(input, 1);

    panel.setSelection(secondLine.from, secondLine.from);
    dispatchTab(panel);

    expect(panel.getValue()).toBe('1. item one\n    1. item two\n2. item three');

    panel.destroy();
  });

  it('renumbers following ordered-list lines after indenting a single line', () => {
    const input = [
      '1. parent',
      '2. child',
      '3. sibling',
      '    1. nested sibling',
      '4. tail',
    ].join('\n');
    const panel = createCodePanel(input);
    const secondLine = getLineRange(input, 1);

    panel.setSelection(secondLine.from, secondLine.from);
    dispatchTab(panel);

    expect(panel.getValue()).toBe([
      '1. parent',
      '    1. child',
      '2. sibling',
      '    1. nested sibling',
      '3. tail',
    ].join('\n'));

    panel.destroy();
  });

  it('outdents a single ordered-list line by four spaces and renumbers following lines', () => {
    const input = '1. parent\n    1. child\n2. sibling';
    const panel = createCodePanel(input);
    const secondLine = getLineRange(input, 1);

    panel.setSelection(secondLine.from, secondLine.from);
    dispatchTab(panel, { shiftKey: true });

    expect(panel.getValue()).toBe('1. parent\n2. child\n3. sibling');

    panel.destroy();
  });

  it('indents a multi-line ordered-list selection and preserves block selection', () => {
    const input = '1. a\n2. b\n3. c\n4. d';
    const panel = createCodePanel(input);
    const selection = getLineRange(input, 1, 2);

    panel.setSelection(selection.from, selection.to);
    dispatchTab(panel);

    expect(panel.getValue()).toBe('1. a\n    1. b\n    2. c\n2. d');
    expect(panel.getSelection().lineFrom).toBe(1);
    expect(panel.getSelection().lineTo).toBe(2);

    panel.destroy();
  });

  it('outdents a multi-line ordered-list selection and preserves block selection', () => {
    const input = '1. a\n    1. b\n    2. c\n2. d';
    const panel = createCodePanel(input);
    const selection = getLineRange(input, 1, 2);

    panel.setSelection(selection.from, selection.to);
    dispatchTab(panel, { shiftKey: true });

    expect(panel.getValue()).toBe('1. a\n2. b\n3. c\n4. d');
    expect(panel.getSelection().lineFrom).toBe(1);
    expect(panel.getSelection().lineTo).toBe(2);

    panel.destroy();
  });

  it('handles mixed bullet and ordered-list selections with type-specific indentation and renumbering', () => {
    const input = '- bullet\n1. first\n2. second\n3. third';
    const panel = createCodePanel(input);
    const selection = getLineRange(input, 0, 2);

    panel.setSelection(selection.to, selection.from);
    dispatchTab(panel);

    expect(panel.getValue()).toBe('  - bullet\n    1. first\n    2. second\n1. third');

    panel.destroy();
  });

  it('handles mixed selections with blank lines without falling back to default two-space indentation for ordered lists', () => {
    const input = '- bullet\n\n1. first\n2. second';
    const panel = createCodePanel(input);
    const selection = getLineRange(input, 0, 3);

    panel.setSelection(selection.to, selection.from);
    dispatchTab(panel);

    expect(panel.getValue()).toBe('  - bullet\n\n    1. first\n    2. second');

    panel.destroy();
  });
});