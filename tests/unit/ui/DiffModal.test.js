import { afterEach, describe, expect, it, vi } from 'vitest';
import { DiffModal } from '../../../src/ui/DiffModal.js';

function setScrollableMetrics(element, metrics) {
  Object.defineProperty(element, 'clientHeight', { configurable: true, value: metrics.clientHeight ?? 0 });
  Object.defineProperty(element, 'scrollHeight', { configurable: true, value: metrics.scrollHeight ?? 0, writable: true });
  Object.defineProperty(element, 'clientWidth', { configurable: true, value: metrics.clientWidth ?? 0 });
  Object.defineProperty(element, 'scrollWidth', { configurable: true, value: metrics.scrollWidth ?? 0, writable: true });
  Object.defineProperty(element, 'scrollTop', { configurable: true, value: metrics.scrollTop ?? 0, writable: true });
  Object.defineProperty(element, 'scrollLeft', { configurable: true, value: metrics.scrollLeft ?? 0, writable: true });
}

describe('DiffModal', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('syncs both diff panes when one pane scrolls', () => {
    const modal = new DiffModal();
    modal.open('before', 'after', {
      oldHighlight: { from: 0, to: 1 },
      newHighlight: { from: 0, to: 1 },
    });

    const oldPre = document.querySelector('.se-diff__pre--old');
    const newPre = document.querySelector('.se-diff__pre--new');
    setScrollableMetrics(oldPre, {
      clientHeight: 100,
      scrollHeight: 500,
      clientWidth: 120,
      scrollWidth: 420,
      scrollTop: 120,
      scrollLeft: 45,
    });
    setScrollableMetrics(newPre, {
      clientHeight: 100,
      scrollHeight: 900,
      clientWidth: 120,
      scrollWidth: 720,
      scrollTop: 0,
      scrollLeft: 0,
    });

    oldPre.dispatchEvent(new Event('scroll'));

    expect(newPre.scrollTop).toBe(240);
    expect(newPre.scrollLeft).toBe(90);

    modal.destroy();
  });

  it('centers both panes on the first changed line when opened', () => {
    const frameQueue = [];
    vi.stubGlobal('requestAnimationFrame', (callback) => {
      frameQueue.push(callback);
      return frameQueue.length;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    const modal = new DiffModal();
    modal.open('a\nb\nc\nd\ne\nf', 'a\nb\nX\nd\ne\nf', {
      oldHighlight: { from: 4, to: 5 },
      newHighlight: { from: 4, to: 5 },
    });

    const oldPre = document.querySelector('.se-diff__pre--old');
    const newPre = document.querySelector('.se-diff__pre--new');
    const oldAnchor = oldPre.querySelector('.se-diff__anchor');
    const newAnchor = newPre.querySelector('.se-diff__anchor');

    setScrollableMetrics(oldPre, { clientHeight: 120, scrollHeight: 600, scrollTop: 0 });
    setScrollableMetrics(newPre, { clientHeight: 120, scrollHeight: 600, scrollTop: 0 });
    Object.defineProperty(oldAnchor, 'offsetTop', { configurable: true, value: 260 });
    Object.defineProperty(newAnchor, 'offsetTop', { configurable: true, value: 260 });
    Object.defineProperty(oldAnchor, 'offsetHeight', { configurable: true, value: 20 });
    Object.defineProperty(newAnchor, 'offsetHeight', { configurable: true, value: 20 });

    frameQueue.splice(0).forEach((callback) => callback());

    expect(oldPre.scrollTop).toBe(210);
    expect(newPre.scrollTop).toBe(210);

    modal.destroy();
  });
});