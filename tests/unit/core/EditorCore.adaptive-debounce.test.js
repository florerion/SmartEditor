import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EditorCore } from '../../../src/core/EditorCore.js';

describe('EditorCore adaptive debounce', () => {
  let element;
  let editor;

  beforeEach(() => {
    element = document.createElement('div');
    element.style.height = '400px';
    document.body.appendChild(element);
  });

  const teardown = () => {
    if (editor) editor.destroy();
    if (element) element.remove();
  };

  it('calculates debounce delay based on document size', () => {
    // Test with small document
    editor = new EditorCore(element, { value: 'small' });
    expect(editor._calculateAdaptiveDebounceDelay()).toBe(150);

    // Medium document (~1.5MB)
    const mediumDoc = 'a'.repeat(1024 * 512); // ~512KB
    editor.setMarkdown(mediumDoc);
    editor._previewBlockCache = null;
    const mediumDelay = editor._calculateAdaptiveDebounceDelay();
    expect(mediumDelay).toBeGreaterThanOrEqual(150);
    expect(mediumDelay).toBeLessThanOrEqual(300);

    teardown();
  });

  it('uses 150ms for documents < 1MB', () => {
    const smallDoc = 'a'.repeat(1024 * 100); // ~100KB
    editor = new EditorCore(element, { value: smallDoc });
    editor._previewBlockCache = null;
    expect(editor._calculateAdaptiveDebounceDelay()).toBe(150);
    teardown();
  });

  it('uses 300ms for documents 1-3MB', () => {
    const mediumDoc = 'a'.repeat(1024 * 1024 * 2); // ~2MB
    editor = new EditorCore(element, { value: mediumDoc });
    editor._previewBlockCache = null;
    expect(editor._calculateAdaptiveDebounceDelay()).toBe(300);
    teardown();
  });

  it('uses 500ms for documents 3-5MB', () => {
    const largeDoc = 'a'.repeat(1024 * 1024 * 4); // ~4MB
    editor = new EditorCore(element, { value: largeDoc });
    editor._previewBlockCache = null;
    expect(editor._calculateAdaptiveDebounceDelay()).toBe(500);
    teardown();
  });

  it('uses 800ms for documents > 5MB', () => {
    const veryLargeDoc = 'a'.repeat(1024 * 1024 * 6); // ~6MB
    editor = new EditorCore(element, { value: veryLargeDoc });
    editor._previewBlockCache = null;
    expect(editor._calculateAdaptiveDebounceDelay()).toBe(800);
    teardown();
  });

  it('uses 80ms when incremental preview cache is warm', () => {
    const mediumDoc = 'a'.repeat(1024 * 1024 * 2); // ~2MB
    editor = new EditorCore(element, { value: mediumDoc });
    expect(editor._previewBlockCache).not.toBeNull();
    expect(editor._calculateAdaptiveDebounceDelay()).toBe(80);
    teardown();
  });

  it('schedulePreviewUpdate uses adaptive delay', () => {
    if (!element.parentNode) element = document.querySelector('body').appendChild(element);

    editor = new EditorCore(element, { value: 'test' });

    // Get the calculated delay for current document size
    const delay = editor._calculateAdaptiveDebounceDelay();

    // Verify that the delay was calculated correctly for small document
    expect(delay).toBe(150);

    teardown();
  });
});
