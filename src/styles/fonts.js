/**
 * Central registry of built-in editor font presets.
 * Each preset defines sans-serif (for UI/preview text) and monospace (for code) fonts.
 * Note: Presets assume fonts are available in user CSS via @font-face or system defaults.
 *
 * @example
 * const fontNames = Object.keys(EDITOR_FONT_PRESETS);
 * console.log(fontNames); // ['system', 'roboto', 'opensans', ...]
 */
export const EDITOR_FONT_PRESETS = Object.freeze({
  system: Object.freeze({
    label: 'System',
    description: 'Default system fonts for maximum compatibility.',
    sans: 'system-ui, -apple-system, sans-serif',
    mono: 'Menlo, Consolas, monospace',
  }),
  roboto: Object.freeze({
    label: 'Roboto',
    description: 'Modern, clean sans-serif with excellent readability.',
    sans: 'Roboto, sans-serif',
    mono: '"Roboto Mono", monospace',
  }),
  opensans: Object.freeze({
    label: 'Open Sans',
    description: 'Open-source humanist sans-serif font family.',
    sans: '"Open Sans", sans-serif',
    mono: '"Source Code Pro", monospace',
  }),
  ubuntu: Object.freeze({
    label: 'Ubuntu',
    description: 'Ubuntu font family with excellent legibility.',
    sans: 'Ubuntu, sans-serif',
    mono: '"Ubuntu Mono", monospace',
  }),
  jetbrains: Object.freeze({
    label: 'JetBrains Mono',
    description: 'Professional monospace font with code-optimized design.',
    sans: 'sans-serif',
    mono: '"JetBrains Mono", monospace',
  }),
  inter: Object.freeze({
    label: 'Inter',
    description: 'Carefully crafted sans-serif typeface for computer screens.',
    sans: 'Inter, sans-serif',
    mono: '"Source Code Pro", monospace',
  }),
  firacode: Object.freeze({
    label: 'Fira Code',
    description: 'Monospace font with programming ligatures support.',
    sans: 'sans-serif',
    mono: '"Fira Code", monospace',
  }),
  sourcecodepro: Object.freeze({
    label: 'Source Code Pro',
    description: 'Clean monospace font by Adobe for source code.',
    sans: '"Source Sans Pro", sans-serif',
    mono: '"Source Code Pro", monospace',
  }),
  courier: Object.freeze({
    label: 'Courier',
    description: 'Classic monospace font, widely available.',
    sans: 'serif',
    mono: 'Courier, "Courier New", monospace',
  }),
  georgia: Object.freeze({
    label: 'Georgia',
    description: 'Serif font optimized for on-screen readability.',
    sans: 'Georgia, serif',
    mono: '"Source Code Pro", monospace',
  }),
  times: Object.freeze({
    label: 'Times',
    description: 'Classic serif font for traditional typographic style.',
    sans: '"Times New Roman", Times, serif',
    mono: 'Courier, "Courier New", monospace',
  }),
});

/**
 * Get built-in font preset metadata for UI selectors or settings screens.
 *
 * @returns {{
 *   id: string,
 *   label: string,
 *   description: string,
 *   sans: string,
 *   mono: string
 * }[]}
 *
 * @example
 * const fonts = getEditorFontList();
 * fonts.forEach((font) => console.log(font.id, font.label));
 */
export function getEditorFontList() {
  return Object.entries(EDITOR_FONT_PRESETS).map(([id, def]) => ({
    id,
    label: def.label,
    description: def.description,
    sans: def.sans,
    mono: def.mono,
  }));
}

/**
 * Check whether the provided font preset name is supported by the editor.
 *
 * @param {string} fontId
 * @returns {boolean}
 *
 * @example
 * if (isEditorFont('roboto')) {
 *   console.log('Font preset supported');
 * }
 */
export function isEditorFont(fontId) {
  return typeof fontId === 'string' && Object.prototype.hasOwnProperty.call(EDITOR_FONT_PRESETS, fontId);
}

/**
 * Create a custom font set from arbitrary sans and mono font names.
 * Use this when you want to reference custom fonts or @font-face definitions.
 *
 * @param {string} sans - Font family name for body/UI text (e.g., 'MyCompanyFont')
 * @param {string} mono - Font family name for code (e.g., 'MyMonoFont')
 * @returns {{ sans: string, mono: string }}
 *
 * @example
 * const customFont = createCustomFontSet('FontCompany', 'FontCompanyMono');
 * editor.setFont(customFont);
 */
export function createCustomFontSet(sans, mono) {
  return Object.freeze({
    sans: typeof sans === 'string' && sans.trim() ? sans : 'sans-serif',
    mono: typeof mono === 'string' && mono.trim() ? mono : 'monospace',
  });
}

/**
 * CSS for built-in font presets.
 * Generates data-font attribute selectors for each preset, setting --se-font-sans and --se-font-mono variables.
 *
 * @returns {string}
 *
 * @example
 * const css = buildEditorFontStyles();
 * console.log(css.includes('[data-font="roboto"]')); // true
 */
export function buildEditorFontStyles() {
  const fontBlocks = Object.entries(EDITOR_FONT_PRESETS)
    .map(([id, def]) => `.se-editor[data-font="${id}"] {\n  --se-font-sans: ${def.sans};\n  --se-font-mono: ${def.mono};\n}`)
    .join('\n\n');

  return fontBlocks;
}

/**
 * Normalize font configuration input.
 * Accepts a string (preset name) or an object ({ sans, mono }).
 * Returns a normalized { sans, mono } object.
 *
 * @param {string | { sans?: string, mono?: string } | null | undefined} fontInput
 * @returns {{ sans: string, mono: string }}
 *
 * @private
 * @internal
 *
 * @example
 * normalizeFontConfig('roboto'); // → { sans: 'Roboto, sans-serif', mono: '"Roboto Mono", monospace' }
 * normalizeFontConfig({ sans: 'MyFont', mono: 'MyMono' }); // → { sans: 'MyFont', mono: 'MyMono' }
 */
export function normalizeFontConfig(fontInput) {
  // No input → use system default
  if (!fontInput) {
    return EDITOR_FONT_PRESETS.system;
  }

  // String input → lookup preset or treat as custom preset ID
  if (typeof fontInput === 'string') {
    const preset = EDITOR_FONT_PRESETS[fontInput];
    if (preset) {
      return preset;
    }
    // Unknown preset → treat string as custom sans font with fallback mono
    return createCustomFontSet(fontInput, 'monospace');
  }

  // Object input → merge with defaults
  if (typeof fontInput === 'object' && fontInput !== null) {
    return createCustomFontSet(fontInput.sans || 'sans-serif', fontInput.mono || 'monospace');
  }

  // Fallback
  return EDITOR_FONT_PRESETS.system;
}
