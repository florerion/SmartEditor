import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EditorCore } from '../../src/core/EditorCore.js';
import { SmartEditorElement } from '../../src/adapters/WebComponent.js';

describe('Font Configuration Integration', () => {
  let container;
  let editor;

  beforeEach(() => {
    container = document.createElement('div');
    container.style.height = '500px';
    document.body.appendChild(container);
  });

  afterEach(() => {
    editor?.destroy();
    container?.remove();
  });

  describe('EditorCore font initialization', () => {
    it('should initialize with default system font', () => {
      editor = new EditorCore(container, {});
      const font = editor.getFont();
      expect(font).toBe('system');
    });

    it('should initialize with preset font from opts.fonts', () => {
      editor = new EditorCore(container, { fonts: 'roboto' });
      const font = editor.getFont();
      expect(font).toBe('roboto');
    });

    it('should initialize with custom font object', () => {
      editor = new EditorCore(container, { fonts: { sans: 'MyFont', mono: 'MyMono' } });
      const font = editor.getFont();
      expect(font).toEqual({ sans: 'MyFont', mono: 'MyMono' });
    });

    it('should set data-font attribute on root element', () => {
      editor = new EditorCore(container, { fonts: 'roboto' });
      expect(container.getAttribute('data-font')).toBe('roboto');
    });

    it('should set custom data-font to "custom" for custom fonts', () => {
      editor = new EditorCore(container, { fonts: { sans: 'MyFont', mono: 'MyMono' } });
      expect(container.getAttribute('data-font')).toBe('custom');
    });
  });

  describe('setFont method', () => {
    beforeEach(() => {
      editor = new EditorCore(container, { fonts: 'system' });
    });

    it('should change font preset', () => {
      editor.setFont('opensans');
      expect(editor.getFont()).toBe('opensans');
      expect(container.getAttribute('data-font')).toBe('opensans');
    });

    it('should set CSS custom properties from preset', () => {
      editor.setFont('roboto');
      const style = container.style.getPropertyValue('--se-font-sans');
      expect(style).toContain('Roboto');
    });

    it('should accept custom font object', () => {
      editor.setFont({ sans: 'CustomFont', mono: 'CustomMono' });
      const font = editor.getFont();
      expect(font).toEqual({ sans: 'CustomFont', mono: 'CustomMono' });
      expect(container.getAttribute('data-font')).toBe('custom');
    });

    it('should set CSS custom properties from custom object', () => {
      editor.setFont({ sans: 'CustomFont', mono: 'CustomMono' });
      const sansStyle = container.style.getPropertyValue('--se-font-sans');
      const monoStyle = container.style.getPropertyValue('--se-font-mono');
      expect(sansStyle).toBe('CustomFont');
      expect(monoStyle).toBe('CustomMono');
    });

    it('should accept string as custom font name', () => {
      editor.setFont('UnknownPreset');
      const font = editor.getFont();
      expect(font.sans).toBe('UnknownPreset');
      expect(font.mono).toBe('monospace');
    });

    it('should merge partial object with defaults', () => {
      editor.setFont({ sans: 'OnlyFont' });
      const font = editor.getFont();
      expect(font.sans).toBe('OnlyFont');
      expect(font.mono).toBe('monospace');
    });

    it('should handle null/undefined by using system default', () => {
      editor.setFont(null);
      expect(editor.getFont()).toBe('system');

      editor.setFont(undefined);
      expect(editor.getFont()).toBe('system');
    });

    it('should return the font config', () => {
      const result = editor.setFont('ubuntu');
      expect(result).toBe('ubuntu');

      const result2 = editor.setFont({ sans: 'MyFont', mono: 'MyMono' });
      expect(result2).toEqual({ sans: 'MyFont', mono: 'MyMono' });
    });
  });

  describe('getFont method', () => {
    it('should return current preset name if active preset matches', () => {
      editor = new EditorCore(container, { fonts: 'opensans' });
      expect(editor.getFont()).toBe('opensans');
    });

    it('should return custom object if custom fonts were set', () => {
      editor = new EditorCore(container, { fonts: { sans: 'Custom', mono: 'CustomMono' } });
      const font = editor.getFont();
      expect(font).toEqual({ sans: 'Custom', mono: 'CustomMono' });
    });
  });

  describe('getAvailableFonts method', () => {
    beforeEach(() => {
      editor = new EditorCore(container, {});
    });

    it('should return array of font presets', () => {
      const fonts = editor.getAvailableFonts();
      expect(Array.isArray(fonts)).toBe(true);
      expect(fonts.length).toBeGreaterThan(0);
    });

    it('should include system preset', () => {
      const fonts = editor.getAvailableFonts();
      const systemFont = fonts.find((f) => f.id === 'system');
      expect(systemFont).toBeDefined();
      expect(systemFont.label).toBe('System');
    });

    it('each font should have required properties', () => {
      const fonts = editor.getAvailableFonts();
      fonts.forEach((font) => {
        expect(font.id).toBeDefined();
        expect(font.label).toBeDefined();
        expect(font.sans).toBeDefined();
        expect(font.mono).toBeDefined();
      });
    });
  });

  describe('CSS custom properties integration', () => {
    beforeEach(() => {
      editor = new EditorCore(container, {});
    });

    it('should set CSS variables on root element', () => {
      editor.setFont('roboto');
      const sansVar = container.style.getPropertyValue('--se-font-sans');
      const monoVar = container.style.getPropertyValue('--se-font-mono');
      expect(sansVar).toBeTruthy();
      expect(monoVar).toBeTruthy();
    });

    it('should preserve CSS variables when changing fonts', () => {
      editor.setFont('roboto');
      const robotoSans = container.style.getPropertyValue('--se-font-sans');
      editor.setFont('ubuntu');
      const ubuntuSans = container.style.getPropertyValue('--se-font-sans');
      expect(robotoSans).not.toBe(ubuntuSans);
    });

    it('should support CSS custom properties with fallbacks', () => {
      const computed = getComputedStyle(container);
      const fontFamily = computed.fontFamily;
      // Should have some computed font value
      expect(fontFamily).toBeTruthy();
    });
  });

  describe('Web Component font attribute', () => {
    let element;

    afterEach(() => {
      element?.remove();
      element?._editor?.destroy();
    });

    it('should register fonts as observed attribute', () => {
      expect(SmartEditorElement.observedAttributes).toContain('fonts');
    });

    it('should initialize Web Component with fonts attribute', async () => {
      element = document.createElement('smart-editor');
      element.setAttribute('fonts', 'roboto');
      element.style.height = '500px';
      document.body.appendChild(element);

      // Wait for connectedCallback
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(element.getFont()).toBe('roboto');
      expect(element.getAttribute('data-font')).toBe('roboto');
    });

    it('should default to system font if fonts attribute not set', async () => {
      element = document.createElement('smart-editor');
      element.style.height = '500px';
      document.body.appendChild(element);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(element.getFont()).toBe('system');
    });

    it('should proxy setFont method', async () => {
      element = document.createElement('smart-editor');
      element.style.height = '500px';
      document.body.appendChild(element);

      await new Promise((resolve) => setTimeout(resolve, 50));

      element.setFont('opensans');
      expect(element.getFont()).toBe('opensans');
    });

    it('should proxy getAvailableFonts method', async () => {
      element = document.createElement('smart-editor');
      element.style.height = '500px';
      document.body.appendChild(element);

      await new Promise((resolve) => setTimeout(resolve, 50));

      const fonts = element.getAvailableFonts();
      expect(Array.isArray(fonts)).toBe(true);
      expect(fonts.length).toBeGreaterThan(0);
    });

    it('should handle fonts attribute change', async () => {
      element = document.createElement('smart-editor');
      element.setAttribute('fonts', 'roboto');
      element.style.height = '500px';
      document.body.appendChild(element);

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(element.getFont()).toBe('roboto');

      element.setAttribute('fonts', 'ubuntu');
      expect(element.getFont()).toBe('ubuntu');
      expect(element.getAttribute('data-font')).toBe('ubuntu');
    });
  });

  describe('Edge cases', () => {
    beforeEach(() => {
      editor = new EditorCore(container, {});
    });

    it('should handle rapid font changes', () => {
      editor.setFont('roboto');
      editor.setFont('opensans');
      editor.setFont('ubuntu');
      expect(editor.getFont()).toBe('ubuntu');
    });

    it('should handle switching between presets and custom fonts', () => {
      editor.setFont('roboto');
      expect(editor.getFont()).toBe('roboto');

      editor.setFont({ sans: 'Custom', mono: 'CustomMono' });
      expect(editor.getFont()).toEqual({ sans: 'Custom', mono: 'CustomMono' });

      editor.setFont('opensans');
      expect(editor.getFont()).toBe('opensans');
    });

    it('should preserve editor functionality when changing fonts', () => {
      const markdown = '# Test\n\nHello world';
      editor.setMarkdown(markdown);
      editor.setFont('roboto');
      expect(editor.getMarkdown()).toBe(markdown);
    });
  });
});
