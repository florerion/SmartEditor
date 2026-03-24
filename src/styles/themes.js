const THEME_VAR_ORDER = [
  'color-scheme',
  'color-bg',
  'color-text',
  'color-muted',
  'color-border',
  'color-toolbar-bg',
  'color-toolbar-hover',
  'color-toolbar-active',
  'color-accent',
  'color-accent-strong',
  'color-code-bg',
  'color-surface',
  'color-surface-muted',
  'color-input-bg',
  'color-scrollbar-thumb',
  'color-scrollbar-thumb-hover',
  'color-scrollbar-track',
  'color-table-header-bg',
  'color-table-row-alt',
  'color-blockquote-bg',
  'color-blockquote-text',
  'color-danger-soft',
  'color-danger-outline',
  'color-success-soft',
  'color-success-outline',
  'color-compat-valid-bg',
  'color-compat-valid-text',
  'color-compat-valid-border',
  'color-compat-warning-bg',
  'color-compat-warning-text',
  'color-compat-warning-border',
  'color-compat-invalid-bg',
  'color-compat-invalid-text',
  'color-compat-invalid-border',
  'color-compat-disabled-bg',
  'color-compat-disabled-text',
  'color-compat-disabled-border',
];

/**
 * Central registry of built-in editor themes.
 * Add new themes here by providing metadata and token values.
 *
 * @example
 * const themeNames = Object.keys(EDITOR_THEME_PRESETS);
 * console.log(themeNames); // ['light', 'dark', 'sepia', 'midnight']
 */
export const EDITOR_THEME_PRESETS = Object.freeze({
  light: Object.freeze({
    label: 'Light',
    description: 'Neutral light theme for general editing.',
    scheme: 'light',
    colors: Object.freeze({
      'color-bg': '#ffffff',
      'color-text': '#1a1a1a',
      'color-muted': '#6b7280',
      'color-border': '#d0d7de',
      'color-toolbar-bg': '#f6f8fa',
      'color-toolbar-hover': '#e6ebf0',
      'color-toolbar-active': '#dbeafe',
      'color-accent': '#3b82f6',
      'color-accent-strong': '#2563eb',
      'color-code-bg': '#f6f8fa',
      'color-surface': '#ffffff',
      'color-surface-muted': '#f3f4f6',
      'color-input-bg': '#ffffff',
      'color-scrollbar-thumb': '#c4ccd5',
      'color-scrollbar-thumb-hover': '#aeb8c2',
      'color-scrollbar-track': '#eef1f4',
      'color-table-header-bg': '#f6f8fa',
      'color-table-row-alt': '#f9fafb',
      'color-blockquote-bg': '#f0f7ff',
      'color-blockquote-text': '#555555',
      'color-danger-soft': '#fff7f7',
      'color-danger-outline': 'rgba(220, 38, 38, 0.42)',
      'color-success-soft': '#f7fff8',
      'color-success-outline': 'rgba(22, 163, 74, 0.4)',
      'color-compat-valid-bg': '#dcfce7',
      'color-compat-valid-text': '#166534',
      'color-compat-valid-border': '#86efac',
      'color-compat-warning-bg': '#fef3c7',
      'color-compat-warning-text': '#92400e',
      'color-compat-warning-border': '#fcd34d',
      'color-compat-invalid-bg': '#fee2e2',
      'color-compat-invalid-text': '#991b1b',
      'color-compat-invalid-border': '#fca5a5',
      'color-compat-disabled-bg': '#e5e7eb',
      'color-compat-disabled-text': '#374151',
      'color-compat-disabled-border': '#d1d5db',
    }),
  }),
  dark: Object.freeze({
    label: 'Dark',
    description: 'Neutral dark theme matched to system dark palettes.',
    scheme: 'dark',
    colors: Object.freeze({
      'color-bg': '#0d1117',
      'color-text': '#e6edf3',
      'color-muted': '#8b949e',
      'color-border': '#30363d',
      'color-toolbar-bg': '#161b22',
      'color-toolbar-hover': '#21262d',
      'color-toolbar-active': '#1c2e4a',
      'color-accent': '#58a6ff',
      'color-accent-strong': '#2f81f7',
      'color-code-bg': '#161b22',
      'color-surface': '#161b22',
      'color-surface-muted': '#21262d',
      'color-input-bg': '#0d1117',
      'color-scrollbar-thumb': '#3b434d',
      'color-scrollbar-thumb-hover': '#4a5460',
      'color-scrollbar-track': '#0f141b',
      'color-table-header-bg': '#20262f',
      'color-table-row-alt': '#181d25',
      'color-blockquote-bg': '#1c2e4a',
      'color-blockquote-text': '#b0bac4',
      'color-danger-soft': '#2a1618',
      'color-danger-outline': 'rgba(248, 113, 113, 0.4)',
      'color-success-soft': '#13261a',
      'color-success-outline': 'rgba(74, 222, 128, 0.35)',
      'color-compat-valid-bg': '#163222',
      'color-compat-valid-text': '#7ee0a1',
      'color-compat-valid-border': '#25543a',
      'color-compat-warning-bg': '#35280f',
      'color-compat-warning-text': '#f7c56a',
      'color-compat-warning-border': '#6b4f1d',
      'color-compat-invalid-bg': '#34191d',
      'color-compat-invalid-text': '#ffb4b4',
      'color-compat-invalid-border': '#6a2a31',
      'color-compat-disabled-bg': '#20262d',
      'color-compat-disabled-text': '#c0c7d1',
      'color-compat-disabled-border': '#3c4652',
    }),
  }),
  sepia: Object.freeze({
    label: 'Sepia',
    description: 'Warm long-form reading theme with low eye strain.',
    scheme: 'light',
    colors: Object.freeze({
      'color-bg': '#f6efe3',
      'color-text': '#433422',
      'color-muted': '#7a6856',
      'color-border': '#d7c6ad',
      'color-toolbar-bg': '#efe4d1',
      'color-toolbar-hover': '#e5d7c0',
      'color-toolbar-active': '#ead7b2',
      'color-accent': '#b7791f',
      'color-accent-strong': '#975a16',
      'color-code-bg': '#efe7d8',
      'color-surface': '#fbf6ee',
      'color-surface-muted': '#f1e7d8',
      'color-input-bg': '#fffaf2',
      'color-scrollbar-thumb': '#c3af8f',
      'color-scrollbar-thumb-hover': '#af9876',
      'color-scrollbar-track': '#efe5d4',
      'color-table-header-bg': '#eadcc4',
      'color-table-row-alt': '#f2e8d8',
      'color-blockquote-bg': '#efe0c6',
      'color-blockquote-text': '#6b5337',
      'color-danger-soft': '#f8ebe5',
      'color-danger-outline': 'rgba(180, 83, 9, 0.34)',
      'color-success-soft': '#edf4e6',
      'color-success-outline': 'rgba(82, 120, 52, 0.32)',
      'color-compat-valid-bg': '#e5efdb',
      'color-compat-valid-text': '#4f6b34',
      'color-compat-valid-border': '#b9cf98',
      'color-compat-warning-bg': '#f3e4bf',
      'color-compat-warning-text': '#8a5a14',
      'color-compat-warning-border': '#d8b36f',
      'color-compat-invalid-bg': '#f4e1d7',
      'color-compat-invalid-text': '#9a4d2b',
      'color-compat-invalid-border': '#dfb49f',
      'color-compat-disabled-bg': '#e8ddcc',
      'color-compat-disabled-text': '#6e5d4b',
      'color-compat-disabled-border': '#d1bea0',
    }),
  }),
  midnight: Object.freeze({
    label: 'Midnight',
    description: 'Cool dark blue theme with higher contrast for coding.',
    scheme: 'dark',
    colors: Object.freeze({
      'color-bg': '#0b1220',
      'color-text': '#e5eefc',
      'color-muted': '#93a4bf',
      'color-border': '#22304a',
      'color-toolbar-bg': '#111a2d',
      'color-toolbar-hover': '#17243b',
      'color-toolbar-active': '#193457',
      'color-accent': '#7cc4ff',
      'color-accent-strong': '#38bdf8',
      'color-code-bg': '#111a2d',
      'color-surface': '#10192a',
      'color-surface-muted': '#162338',
      'color-input-bg': '#0b1220',
      'color-scrollbar-thumb': '#32445f',
      'color-scrollbar-thumb-hover': '#3f5779',
      'color-scrollbar-track': '#0a1322',
      'color-table-header-bg': '#162338',
      'color-table-row-alt': '#0f1a2d',
      'color-blockquote-bg': '#122745',
      'color-blockquote-text': '#b8c6da',
      'color-danger-soft': '#2a1624',
      'color-danger-outline': 'rgba(251, 113, 133, 0.34)',
      'color-success-soft': '#11261e',
      'color-success-outline': 'rgba(45, 212, 191, 0.34)',
      'color-compat-valid-bg': '#123126',
      'color-compat-valid-text': '#74e3c2',
      'color-compat-valid-border': '#1f5a49',
      'color-compat-warning-bg': '#33260f',
      'color-compat-warning-text': '#f3c87a',
      'color-compat-warning-border': '#71511b',
      'color-compat-invalid-bg': '#341824',
      'color-compat-invalid-text': '#ffb0c8',
      'color-compat-invalid-border': '#6d2a46',
      'color-compat-disabled-bg': '#162338',
      'color-compat-disabled-text': '#bfcee2',
      'color-compat-disabled-border': '#32445f',
    }),
  }),
  solarized: Object.freeze({
    label: 'Solarized',
    description: 'Classic Solarized-inspired theme for balanced contrast.',
    scheme: 'light',
    colors: Object.freeze({
      'color-bg': '#fdf6e3',
      'color-text': '#586e75',
      'color-muted': '#657b83',
      'color-border': '#d7c9a1',
      'color-toolbar-bg': '#eee8d5',
      'color-toolbar-hover': '#e4ddc8',
      'color-toolbar-active': '#e8dfc2',
      'color-accent': '#268bd2',
      'color-accent-strong': '#1f6fa8',
      'color-code-bg': '#f4edd8',
      'color-surface': '#fff9e8',
      'color-surface-muted': '#f2ead2',
      'color-input-bg': '#fffdf4',
      'color-scrollbar-thumb': '#b8aa83',
      'color-scrollbar-thumb-hover': '#a39370',
      'color-scrollbar-track': '#efe5cc',
      'color-table-header-bg': '#ebe2c9',
      'color-table-row-alt': '#f5edd8',
      'color-blockquote-bg': '#efe6cd',
      'color-blockquote-text': '#5f706d',
      'color-danger-soft': '#f9ece5',
      'color-danger-outline': 'rgba(181, 137, 0, 0.32)',
      'color-success-soft': '#edf5e7',
      'color-success-outline': 'rgba(133, 153, 0, 0.34)',
      'color-compat-valid-bg': '#e6f1dc',
      'color-compat-valid-text': '#667900',
      'color-compat-valid-border': '#b8c78b',
      'color-compat-warning-bg': '#f4e8bf',
      'color-compat-warning-text': '#9a6b00',
      'color-compat-warning-border': '#d9bf6b',
      'color-compat-invalid-bg': '#f6e3d7',
      'color-compat-invalid-text': '#a14f3b',
      'color-compat-invalid-border': '#ddbaa7',
      'color-compat-disabled-bg': '#ece3ca',
      'color-compat-disabled-text': '#6f7d80',
      'color-compat-disabled-border': '#d2c59d',
    }),
  }),
  nord: Object.freeze({
    label: 'Nord',
    description: 'Cool arctic palette inspired by Nord color scheme.',
    scheme: 'dark',
    colors: Object.freeze({
      'color-bg': '#2e3440',
      'color-text': '#e5e9f0',
      'color-muted': '#a8b1c1',
      'color-border': '#4c566a',
      'color-toolbar-bg': '#3b4252',
      'color-toolbar-hover': '#434c5e',
      'color-toolbar-active': '#35506f',
      'color-accent': '#88c0d0',
      'color-accent-strong': '#5e81ac',
      'color-code-bg': '#3b4252',
      'color-surface': '#3a404e',
      'color-surface-muted': '#434c5e',
      'color-input-bg': '#2e3440',
      'color-scrollbar-thumb': '#5f6b82',
      'color-scrollbar-thumb-hover': '#74819a',
      'color-scrollbar-track': '#2b303b',
      'color-table-header-bg': '#434c5e',
      'color-table-row-alt': '#343b48',
      'color-blockquote-bg': '#3a4a62',
      'color-blockquote-text': '#c6cfdd',
      'color-danger-soft': '#4a3037',
      'color-danger-outline': 'rgba(191, 97, 106, 0.42)',
      'color-success-soft': '#2f473a',
      'color-success-outline': 'rgba(163, 190, 140, 0.38)',
      'color-compat-valid-bg': '#2c4338',
      'color-compat-valid-text': '#b9d7b0',
      'color-compat-valid-border': '#56745f',
      'color-compat-warning-bg': '#4d4029',
      'color-compat-warning-text': '#e9c889',
      'color-compat-warning-border': '#8a7450',
      'color-compat-invalid-bg': '#51323a',
      'color-compat-invalid-text': '#e8b4bc',
      'color-compat-invalid-border': '#8e5b66',
      'color-compat-disabled-bg': '#434c5e',
      'color-compat-disabled-text': '#d8dee9',
      'color-compat-disabled-border': '#6a7488',
    }),
  }),
  'high-contrast': Object.freeze({
    label: 'High Contrast',
    description: 'Accessibility-focused theme with strong contrast and emphasis.',
    scheme: 'dark',
    colors: Object.freeze({
      'color-bg': '#000000',
      'color-text': '#ffffff',
      'color-muted': '#d1d5db',
      'color-border': '#f9fafb',
      'color-toolbar-bg': '#0a0a0a',
      'color-toolbar-hover': '#1f2937',
      'color-toolbar-active': '#1d4ed8',
      'color-accent': '#22d3ee',
      'color-accent-strong': '#06b6d4',
      'color-code-bg': '#111111',
      'color-surface': '#050505',
      'color-surface-muted': '#141414',
      'color-input-bg': '#000000',
      'color-scrollbar-thumb': '#f9fafb',
      'color-scrollbar-thumb-hover': '#e5e7eb',
      'color-scrollbar-track': '#1a1a1a',
      'color-table-header-bg': '#111827',
      'color-table-row-alt': '#0f172a',
      'color-blockquote-bg': '#111827',
      'color-blockquote-text': '#f9fafb',
      'color-danger-soft': '#3f1d1d',
      'color-danger-outline': 'rgba(254, 202, 202, 0.55)',
      'color-success-soft': '#1a2e1a',
      'color-success-outline': 'rgba(187, 247, 208, 0.55)',
      'color-compat-valid-bg': '#123012',
      'color-compat-valid-text': '#bbf7d0',
      'color-compat-valid-border': '#86efac',
      'color-compat-warning-bg': '#332701',
      'color-compat-warning-text': '#fde68a',
      'color-compat-warning-border': '#facc15',
      'color-compat-invalid-bg': '#3f1d1d',
      'color-compat-invalid-text': '#fecaca',
      'color-compat-invalid-border': '#f87171',
      'color-compat-disabled-bg': '#141414',
      'color-compat-disabled-text': '#e5e7eb',
      'color-compat-disabled-border': '#9ca3af',
    }),
  }),
});

/**
 * Get built-in theme metadata for UI selectors or settings screens.
 *
 * @returns {{
 *   id: string,
 *   label: string,
 *   description: string,
 *   scheme: string,
 *   swatch: { bg: string, accent: string, border: string, text: string }
 * }[]}
 *
 * @example
 * const themes = getEditorThemeList();
 * themes.forEach((theme) => console.log(theme.id, theme.label));
 */
export function getEditorThemeList() {
  return Object.entries(EDITOR_THEME_PRESETS).map(([id, def]) => ({
    id,
    label: def.label,
    description: def.description,
    scheme: def.scheme,
    swatch: {
      bg: def.colors['color-bg'],
      accent: def.colors['color-accent'],
      border: def.colors['color-border'],
      text: def.colors['color-text'],
    },
  }));
}

/**
 * Check whether the provided theme name is supported by the editor.
 *
 * @param {string} theme
 * @returns {boolean}
 *
 * @example
 * if (isEditorTheme('sepia')) {
 *   console.log('Theme supported');
 * }
 */
export function isEditorTheme(theme) {
  return typeof theme === 'string' && Object.prototype.hasOwnProperty.call(EDITOR_THEME_PRESETS, theme);
}

function _buildThemeVars(themeDef) {
  const lines = [`  --se-color-scheme: ${themeDef.scheme};`];

  THEME_VAR_ORDER.forEach((token) => {
    if (token === 'color-scheme') return;
    const value = themeDef.colors[token];
    if (value) lines.push(`  --se-${token}: ${value};`);
  });

  return lines.join('\n');
}

/**
 * CSS for built-in themes and automatic OS-based dark fallback.
 *
 * @returns {string}
 *
 * @example
 * const css = buildEditorThemeStyles();
 * console.log(css.includes('[data-theme="sepia"]')); // true
 */
export function buildEditorThemeStyles() {
  const themeBlocks = Object.entries(EDITOR_THEME_PRESETS)
    .map(([id, def]) => `.se-editor[data-theme="${id}"] {\n${_buildThemeVars(def)}\n}`)
    .join('\n\n');

  return `
@media (prefers-color-scheme: dark) {
  .se-editor:not([data-theme]) {
${_buildThemeVars(EDITOR_THEME_PRESETS.dark)}
  }
}

${themeBlocks}
`.trim();
}