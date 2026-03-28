import { afterEach, vi } from 'vitest';

if (!globalThis.requestAnimationFrame) {
  globalThis.requestAnimationFrame = (callback) => setTimeout(() => callback(Date.now()), 16);
}

if (!globalThis.cancelAnimationFrame) {
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (!globalThis.MutationObserver) {
  globalThis.MutationObserver = class {
    observe() {}
    disconnect() {}
    takeRecords() { return []; }
  };
}

if (!globalThis.navigator) {
  globalThis.navigator = {};
}

if (!globalThis.navigator.clipboard) {
  globalThis.navigator.clipboard = {
    writeText: vi.fn(() => Promise.resolve()),
  };
}

if (globalThis.Range && !globalThis.Range.prototype.getClientRects) {
  globalThis.Range.prototype.getClientRects = function getClientRects() {
    return [];
  };
}

if (globalThis.Range && !globalThis.Range.prototype.getBoundingClientRect) {
  globalThis.Range.prototype.getBoundingClientRect = function getBoundingClientRect() {
    return {
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
      toJSON: () => ({}),
    };
  };
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.clearAllMocks();
});
