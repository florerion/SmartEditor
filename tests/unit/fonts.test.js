import { describe, it, expect } from 'vitest';
import {
  EDITOR_FONT_PRESETS,
  getEditorFontList,
  isEditorFont,
  createCustomFontSet,
  buildEditorFontStyles,
  normalizeFontConfig,
} from '../../src/styles/fonts.js';

describe('fonts.js', () => {
  describe('EDITOR_FONT_PRESETS', () => {
    it('should contain system preset', () => {
      expect(EDITOR_FONT_PRESETS.system).toBeDefined();
      expect(EDITOR_FONT_PRESETS.system.sans).toBeDefined();
      expect(EDITOR_FONT_PRESETS.system.mono).toBeDefined();
      expect(EDITOR_FONT_PRESETS.system.label).toBe('System');
    });

    it('should contain roboto preset', () => {
      expect(EDITOR_FONT_PRESETS.roboto).toBeDefined();
      expect(EDITOR_FONT_PRESETS.roboto.label).toBe('Roboto');
      expect(EDITOR_FONT_PRESETS.roboto.sans).toContain('Roboto');
      expect(EDITOR_FONT_PRESETS.roboto.mono).toBeDefined();
    });

    it('should be frozen (immutable)', () => {
      expect(() => {
        EDITOR_FONT_PRESETS.system = null;
      }).toThrow();
    });

    it('each preset should be frozen', () => {
      Object.values(EDITOR_FONT_PRESETS).forEach((preset) => {
        expect(() => {
          preset.label = 'Modified';
        }).toThrow();
      });
    });

    it('should have at least 6 presets', () => {
      const presetNames = Object.keys(EDITOR_FONT_PRESETS);
      expect(presetNames.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('getEditorFontList', () => {
    it('should return array of font preset metadata', () => {
      const fonts = getEditorFontList();
      expect(Array.isArray(fonts)).toBe(true);
      expect(fonts.length).toBeGreaterThan(0);
    });

    it('should include id, label, description, sans, and mono in each entry', () => {
      const fonts = getEditorFontList();
      fonts.forEach((font) => {
        expect(font.id).toBeDefined();
        expect(typeof font.id).toBe('string');
        expect(font.label).toBeDefined();
        expect(typeof font.label).toBe('string');
        expect(font.description).toBeDefined();
        expect(typeof font.description).toBe('string');
        expect(font.sans).toBeDefined();
        expect(typeof font.sans).toBe('string');
        expect(font.mono).toBeDefined();
        expect(typeof font.mono).toBe('string');
      });
    });

    it('should include system preset in the list', () => {
      const fonts = getEditorFontList();
      const systemFont = fonts.find((f) => f.id === 'system');
      expect(systemFont).toBeDefined();
      expect(systemFont.label).toBe('System');
    });
  });

  describe('isEditorFont', () => {
    it('should return true for known preset names', () => {
      expect(isEditorFont('system')).toBe(true);
      expect(isEditorFont('roboto')).toBe(true);
      expect(isEditorFont('opensans')).toBe(true);
    });

    it('should return false for unknown names', () => {
      expect(isEditorFont('invalid')).toBe(false);
      expect(isEditorFont('fakeFont')).toBe(false);
    });

    it('should return false for non-string input', () => {
      expect(isEditorFont(null)).toBe(false);
      expect(isEditorFont(undefined)).toBe(false);
      expect(isEditorFont(123)).toBe(false);
      expect(isEditorFont({})).toBe(false);
    });
  });

  describe('createCustomFontSet', () => {
    it('should create a custom font set with sans and mono', () => {
      const custom = createCustomFontSet('MyFont', 'MyMono');
      expect(custom.sans).toBe('MyFont');
      expect(custom.mono).toBe('MyMono');
    });

    it('should use fallbacks for missing values', () => {
      const custom1 = createCustomFontSet(null, 'MyMono');
      expect(custom1.sans).toBe('sans-serif');
      expect(custom1.mono).toBe('MyMono');

      const custom2 = createCustomFontSet('MyFont', null);
      expect(custom2.sans).toBe('MyFont');
      expect(custom2.mono).toBe('monospace');
    });

    it('should return a frozen object', () => {
      const custom = createCustomFontSet('MyFont', 'MyMono');
      expect(() => {
        custom.sans = 'Modified';
      }).toThrow();
    });

    it('should handle empty strings', () => {
      const custom = createCustomFontSet('', '');
      expect(custom.sans).toBe('sans-serif');
      expect(custom.mono).toBe('monospace');
    });
  });

  describe('buildEditorFontStyles', () => {
    it('should return CSS string', () => {
      const css = buildEditorFontStyles();
      expect(typeof css).toBe('string');
      expect(css.length).toBeGreaterThan(0);
    });

    it('should include CSS rules for each preset', () => {
      const css = buildEditorFontStyles();
      expect(css).toContain('[data-font="system"]');
      expect(css).toContain('[data-font="roboto"]');
      expect(css).toContain('[data-font="opensans"]');
    });

    it('should set --se-font-sans and --se-font-mono CSS variables', () => {
      const css = buildEditorFontStyles();
      expect(css).toContain('--se-font-sans:');
      expect(css).toContain('--se-font-mono:');
    });

    it('should have closing braces for each rule', () => {
      const css = buildEditorFontStyles();
      const openBraces = (css.match(/{/g) || []).length;
      const closeBraces = (css.match(/}/g) || []).length;
      expect(openBraces).toBe(closeBraces);
    });

    it('should be valid CSS (basic syntax check)', () => {
      const css = buildEditorFontStyles();
      // Basic check: should not start/end with nonsense
      expect(css).toMatch(/^\./);
      expect(css).toMatch(/}\s*$/);
    });
  });

  describe('normalizeFontConfig', () => {
    it('should return system preset for null/undefined input', () => {
      const config1 = normalizeFontConfig(null);
      expect(config1).toEqual(EDITOR_FONT_PRESETS.system);

      const config2 = normalizeFontConfig(undefined);
      expect(config2).toEqual(EDITOR_FONT_PRESETS.system);
    });

    it('should return preset for known string name', () => {
      const config = normalizeFontConfig('roboto');
      expect(config.sans).toContain('Roboto');
      expect(config).toEqual(EDITOR_FONT_PRESETS.roboto);
    });

    it('should treat unknown string as custom sans font', () => {
      const config = normalizeFontConfig('UnknownFont');
      expect(config.sans).toBe('UnknownFont');
      expect(config.mono).toBe('monospace');
    });

    it('should merge object input with defaults', () => {
      const config = normalizeFontConfig({ sans: 'MyFont' });
      expect(config.sans).toBe('MyFont');
      expect(config.mono).toBe('monospace');

      const config2 = normalizeFontConfig({ mono: 'MyMono' });
      expect(config2.sans).toBe('sans-serif');
      expect(config2.mono).toBe('MyMono');
    });

    it('should handle object with both sans and mono', () => {
      const config = normalizeFontConfig({ sans: 'MyFont', mono: 'MyMono' });
      expect(config.sans).toBe('MyFont');
      expect(config.mono).toBe('MyMono');
    });

    it('should handle empty object', () => {
      const config = normalizeFontConfig({});
      expect(config.sans).toBe('sans-serif');
      expect(config.mono).toBe('monospace');
    });

    it('should return system preset for invalid input types', () => {
      const config1 = normalizeFontConfig(123);
      expect(config1).toEqual(EDITOR_FONT_PRESETS.system);

      const config2 = normalizeFontConfig(true);
      expect(config2).toEqual(EDITOR_FONT_PRESETS.system);
    });
  });
});
