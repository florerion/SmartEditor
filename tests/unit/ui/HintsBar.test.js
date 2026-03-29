import { describe, expect, it, vi } from 'vitest';
import { HintsBar } from '../../../src/ui/HintsBar.js';

function getHintText(container) {
  return container.querySelector('.se-hints-bar__content')?.textContent?.trim() ?? '';
}

describe('HintsBar', () => {
  it('throttles visible hints and applies last queued hint after timeout', () => {
    vi.useFakeTimers();

    const container = document.createElement('div');
    document.body.appendChild(container);
    const bar = new HintsBar(container, { autoHideMs: 30 });

    bar.show('First');
    bar.show('Second');
    bar.show('Third');

    expect(getHintText(container)).toBe('First');

    vi.advanceTimersByTime(31);

    expect(getHintText(container)).toBe('Third');

    bar.destroy();
    vi.useRealTimers();
  });

  it('forces replacement immediately when show is called with force=true', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const bar = new HintsBar(container, { autoHideMs: 1000 });

    bar.show('Old hint');
    bar.show('Queued hint');
    expect(getHintText(container)).toBe('Old hint');

    bar.show('Forced hint', { force: true });
    expect(getHintText(container)).toBe('Forced hint');

    bar.destroy();
  });

  it('maintains 10-item history and supports prev/next navigation', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const bar = new HintsBar(container, { autoHideMs: 0 });

    for (let i = 1; i <= 12; i += 1) {
      bar.show(`H${i}`, { force: true });
    }

    expect(bar._history).toHaveLength(10);
    expect(bar._history[0]).toBe('H3');
    expect(getHintText(container)).toBe('H12');

    container.querySelector('[data-se-hint-prev]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(getHintText(container)).toBe('H11');

    container.querySelector('[data-se-hint-next]').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(getHintText(container)).toBe('H12');

    bar.destroy();
  });
});
