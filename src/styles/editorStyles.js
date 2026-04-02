import { buildEditorThemeStyles } from './themes.js';

/**
 * All editor CSS as a JS string.
 * Injected once into <head> by EditorCore (plain-JS path)
 * and into Shadow DOM by the Web Component adapter.
 */
export const EDITOR_STYLES = `
/* ============================================================
   Layout
   ============================================================ */
.se-editor {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  color-scheme: var(--se-color-scheme, light);
  font-family: var(--se-font-sans, system-ui, -apple-system, sans-serif);
  font-size: 15px;
  color: var(--se-color-text, #1a1a1a);
  background: var(--se-color-bg, #ffffff);
  border: 1px solid var(--se-color-border, #d0d7de);
  border-radius: 6px;
  overflow: hidden;
  box-sizing: border-box;
  --se-color-scheme: light;
  --se-color-muted: #6b7280;
  --se-color-accent-strong: #2563eb;
  --se-color-surface: #ffffff;
  --se-color-surface-muted: #f3f4f6;
  --se-color-code-text: #24292f;
  --se-color-code-comment: #6e7781;
  --se-color-code-keyword: #cf222e;
  --se-color-code-string: #0a3069;
  --se-color-code-number: #0550ae;
  --se-color-code-title: #8250df;
  --se-color-code-function: #953800;
  --se-color-code-type: #953800;
  --se-color-code-literal: #0550ae;
  --se-color-input-bg: #ffffff;
  --se-color-scrollbar-thumb: #c4ccd5;
  --se-color-scrollbar-thumb-hover: #aeb8c2;
  --se-color-scrollbar-track: #eef1f4;
  --se-color-table-header-bg: var(--se-color-code-bg, #f6f8fa);
  --se-color-table-row-alt: #f9fafb;
  --se-color-blockquote-bg: #f0f7ff;
  --se-color-blockquote-text: #555555;
  --se-color-danger-soft: #fff7f7;
  --se-color-danger-outline: rgba(220, 38, 38, 0.42);
  --se-color-success-soft: #f7fff8;
  --se-color-success-outline: rgba(22, 163, 74, 0.4);
  --se-color-compat-valid-bg: #dcfce7;
  --se-color-compat-valid-text: #166534;
  --se-color-compat-valid-border: #86efac;
  --se-color-compat-warning-bg: #fef3c7;
  --se-color-compat-warning-text: #92400e;
  --se-color-compat-warning-border: #fcd34d;
  --se-color-compat-invalid-bg: #fee2e2;
  --se-color-compat-invalid-text: #991b1b;
  --se-color-compat-invalid-border: #fca5a5;
  --se-color-compat-disabled-bg: #e5e7eb;
  --se-color-compat-disabled-text: #374151;
  --se-color-compat-disabled-border: #d1d5db;
}

.se-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  position: relative;
}

.se-editor[aria-busy="true"] .se-panels,
.se-editor[aria-busy="true"] .se-toolbar-container,
.se-editor[aria-busy="true"] .se-compatibility-container,
.se-editor[aria-busy="true"] .se-hints-container,
.se-editor[aria-busy="true"] .se-divider {
  pointer-events: none;
}

.se-loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 10020;
  display: none;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,.45);
}

.se-editor[aria-busy="true"] .se-loading-overlay {
  display: flex;
}

.se-loading-overlay__card {
  min-width: min(360px, calc(100% - 28px));
  max-width: min(520px, calc(100% - 28px));
  background: var(--se-color-surface, #ffffff);
  border: 1px solid var(--se-color-border, #d0d7de);
  border-radius: 10px;
  box-shadow: 0 20px 44px rgba(0, 0, 0, 0.28);
  padding: 18px;
  display: grid;
  gap: 10px;
  justify-items: center;
  text-align: center;
}

.se-loading-overlay__spinner {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 3px solid color-mix(in srgb, var(--se-color-accent, #3b82f6) 22%, transparent);
  border-top-color: var(--se-color-accent, #3b82f6);
  animation: se-spin 0.75s linear infinite;
}

.se-loading-overlay__label {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--se-color-text, #1a1a1a);
}

.se-loading-overlay__detail {
  margin: 0;
  min-height: 1.2em;
  font-size: 12px;
  color: var(--se-color-muted, #6b7280);
}

.se-loading-overlay__actions {
  min-height: 30px;
}

.se-loading-overlay__cancel {
  border: 1px solid var(--se-color-border, #d0d7de);
  background: var(--se-color-surface, #ffffff);
  color: var(--se-color-text, #1a1a1a);
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.se-loading-overlay__cancel:hover {
  border-color: var(--se-color-accent, #3b82f6);
  background: color-mix(in srgb, var(--se-color-accent, #3b82f6) 10%, var(--se-color-surface, #ffffff));
}

/* Error flash state — visible without aria-busy on the editor */
.se-loading-overlay--flash {
  display: flex;
}

.se-loading-overlay__card--error {
  border-color: var(--se-color-danger-outline, rgba(220, 38, 38, 0.42));
  background: var(--se-color-danger-soft, #fff7f7);
}

.se-loading-overlay__error-icon {
  color: var(--se-color-compat-invalid-text, #991b1b);
}

.se-loading-overlay__dismiss {
  border: 1px solid var(--se-color-danger-outline, rgba(220, 38, 38, 0.42));
  background: var(--se-color-surface, #ffffff);
  color: var(--se-color-text, #1a1a1a);
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.se-loading-overlay__dismiss:hover {
  background: var(--se-color-danger-soft, #fff7f7);
}

@keyframes se-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ============================================================
   Toolbar
   ============================================================ */
.se-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
  padding: 4px 8px;
  background: var(--se-color-toolbar-bg, #f6f8fa);
  border-bottom: 1px solid var(--se-color-border, #d0d7de);
  user-select: none;
  flex-shrink: 0;
}

.se-compatibility-container--hidden {
  display: none;
}

.se-hints-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 6px 10px;
  border-top: 1px solid var(--se-color-border, #d0d7de);
  background: color-mix(in srgb, var(--se-color-surface, #ffffff) 88%, var(--se-color-toolbar-bg, #f6f8fa));
  font-size: 12px;
  color: var(--se-color-muted, #6b7280);
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.16s ease, transform 0.16s ease;
  will-change: opacity, transform;
}

.se-hints-bar.se-hints-bar--is-entering {
  opacity: 0;
  transform: translateY(2px);
}

.se-hints-bar.se-hints-bar--is-leaving {
  opacity: 1;
  transform: translateY(0);
}

.se-hints-bar__label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 38px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--se-color-accent-strong, #2563eb);
  background: color-mix(in srgb, var(--se-color-accent, #3b82f6) 15%, transparent);
}

.se-hints-bar__content {
  flex: 1;
}

.se-hints-bar__prev,
.se-hints-bar__next,
.se-hints-bar__dismiss {
  border: 1px solid var(--se-color-border, #d0d7de);
  background: var(--se-color-surface, #ffffff);
  color: var(--se-color-text, #1a1a1a);
  border-radius: 6px;
  min-width: 24px;
  height: 24px;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  padding: 0 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.se-hints-bar__prev:hover,
.se-hints-bar__next:hover,
.se-hints-bar__dismiss:hover {
  border-color: var(--se-color-accent, #3b82f6);
}

.se-hints-bar--ghost {
  opacity: 0.55;
  transition: opacity 0.15s ease;
}

.se-hints-bar--ghost:hover {
  opacity: 1;
}

.se-ai-assistant-container {
  border-top: 1px solid var(--se-color-border, #d0d7de);
  background: color-mix(in srgb, var(--se-color-surface, #ffffff) 94%, var(--se-color-toolbar-bg, #f6f8fa));
}

.se-ai-assistant {
  padding: 10px;
}

.se-ai-assistant__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.se-ai-assistant__title {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--se-color-text, #1a1a1a);
}

.se-ai-assistant__close {
  border: 1px solid var(--se-color-border, #d0d7de);
  background: var(--se-color-surface, #ffffff);
  color: var(--se-color-text, #1a1a1a);
  border-radius: 6px;
  width: 24px;
  height: 24px;
  cursor: pointer;
}

.se-ai-assistant__close:hover {
  border-color: var(--se-color-accent, #3b82f6);
}

.se-ai-assistant__form {
  display: grid;
  gap: 8px;
}

.se-ai-assistant__label {
  display: grid;
  gap: 4px;
  font-size: 12px;
  color: var(--se-color-muted, #6b7280);
}

.se-ai-assistant__mode,
.se-ai-assistant__instruction {
  width: 100%;
  border: 1px solid var(--se-color-border, #d0d7de);
  border-radius: 6px;
  padding: 8px;
  font-size: 13px;
  color: var(--se-color-text, #1a1a1a);
  background: var(--se-color-input-bg, #ffffff);
}

.se-ai-assistant__instruction {
  min-height: 80px;
  resize: vertical;
}

.se-ai-assistant__actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.se-ai-assistant__btn {
  border: 1px solid var(--se-color-border, #d0d7de);
  background: var(--se-color-surface, #ffffff);
  color: var(--se-color-text, #1a1a1a);
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.se-ai-assistant__btn:hover {
  border-color: var(--se-color-accent, #3b82f6);
}

.se-ai-assistant__btn:disabled {
  opacity: .6;
  cursor: not-allowed;
}

.se-ai-assistant__btn--primary {
  background: color-mix(in srgb, var(--se-color-accent, #3b82f6) 16%, var(--se-color-surface, #ffffff));
}

.se-ai-assistant__status {
  margin: 0;
  min-height: 1.2em;
  font-size: 12px;
  color: var(--se-color-muted, #6b7280);
}

.se-ai-assistant__result {
  margin: 0;
  border: 1px solid var(--se-color-border, #d0d7de);
  background: var(--se-color-code-bg, #f6f8fa);
  color: var(--se-color-text, #1a1a1a);
  border-radius: 8px;
  padding: 10px;
  max-height: 220px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
}

.se-compatibility {
  border-bottom: 1px solid var(--se-color-border, #d0d7de);
  background: color-mix(in srgb, var(--se-color-surface, #ffffff) 92%, var(--se-color-toolbar-bg, #f6f8fa));
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.se-compatibility__row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.se-compatibility__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 78px;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 11px;
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.se-compatibility__badge--valid {
  color: var(--se-color-compat-valid-text, #166534);
  background: var(--se-color-compat-valid-bg, #dcfce7);
  border-color: var(--se-color-compat-valid-border, #86efac);
}

.se-compatibility__badge--warning {
  color: var(--se-color-compat-warning-text, #92400e);
  background: var(--se-color-compat-warning-bg, #fef3c7);
  border-color: var(--se-color-compat-warning-border, #fcd34d);
}

.se-compatibility__badge--invalid {
  color: var(--se-color-compat-invalid-text, #991b1b);
  background: var(--se-color-compat-invalid-bg, #fee2e2);
  border-color: var(--se-color-compat-invalid-border, #fca5a5);
}

.se-compatibility__badge--disabled {
  color: var(--se-color-compat-disabled-text, #374151);
  background: var(--se-color-compat-disabled-bg, #e5e7eb);
  border-color: var(--se-color-compat-disabled-border, #d1d5db);
}

.se-compatibility__summary {
  margin: 0;
  font-size: 12px;
  color: var(--se-color-muted, #6b7280);
}

.se-compatibility__actions {
  display: inline-flex;
  gap: 6px;
  margin-left: auto;
}

.se-compatibility__btn,
.se-compatibility__issue-fix {
  border: 1px solid var(--se-color-border, #d0d7de);
  background: var(--se-color-surface, #ffffff);
  color: var(--se-color-text, #1a1a1a);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 12px;
  line-height: 1.2;
  font-weight: 600;
  cursor: pointer;
}

.se-compatibility__btn:hover,
.se-compatibility__issue-fix:hover {
  border-color: var(--se-color-accent, #3b82f6);
  background: color-mix(in srgb, var(--se-color-accent, #3b82f6) 10%, var(--se-color-surface, #ffffff));
}

.se-compatibility__btn:disabled,
.se-compatibility__issue-fix:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.se-compatibility__issues {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 4px;
  max-height: 112px;
  overflow-y: auto;
  padding-right: 2px;
  scrollbar-width: thin;
  scrollbar-color: var(--se-color-scrollbar-thumb, #c4ccd5) var(--se-color-scrollbar-track, #eef1f4);
}

.se-compatibility__issues::-webkit-scrollbar {
  width: 10px;
}

.se-compatibility__issues::-webkit-scrollbar-track {
  background: var(--se-color-scrollbar-track, #eef1f4);
  border-radius: 999px;
}

.se-compatibility__issues::-webkit-scrollbar-thumb {
  background: var(--se-color-scrollbar-thumb, #c4ccd5);
  border-radius: 999px;
  border: 2px solid var(--se-color-scrollbar-track, #eef1f4);
}

.se-compatibility__issues::-webkit-scrollbar-thumb:hover {
  background: var(--se-color-scrollbar-thumb-hover, #aeb8c2);
}

.se-compatibility__issue {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 6px;
  border-radius: 6px;
  background: var(--se-color-surface-muted, #f3f4f6);
}

.se-compatibility__issue-link {
  flex: 1 1 auto;
  min-width: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.se-compatibility__issue-link:hover .se-compatibility__issue-text,
.se-compatibility__issue-link:focus-visible .se-compatibility__issue-text {
  text-decoration: underline;
}

.se-compatibility__issue-link:focus-visible {
  outline: 2px solid var(--se-color-accent, #3b82f6);
  outline-offset: 2px;
  border-radius: 4px;
}

.se-compatibility__issue-main {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.se-compatibility__issue-code {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid var(--se-color-border, #d0d7de);
  background: color-mix(in srgb, var(--se-color-surface, #ffffff) 80%, var(--se-color-toolbar-bg, #f6f8fa));
  color: var(--se-color-muted, #6b7280);
  font-family: var(--se-font-mono, "Fira Code", Consolas, monospace);
  font-size: 10px;
  line-height: 1;
  padding: 3px 7px;
  white-space: nowrap;
}

.se-compatibility__issue-text {
  font-size: 12px;
  color: var(--se-color-text, #1a1a1a);
  line-height: 1.35;
}

.se-compatibility__issue--empty {
  justify-content: flex-start;
}

.se-toolbar__group {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  position: relative;
}

.se-toolbar__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 28px;
  height: 28px;
  padding: 2px 6px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--se-color-text, #1a1a1a);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  transition: background 0.1s, border-color 0.1s;
}

.se-toolbar__btn:hover {
  background: var(--se-color-toolbar-hover, #e6ebf0);
  border-color: var(--se-color-border, #d0d7de);
}

.se-toolbar__btn--active,
.se-toolbar__btn[aria-pressed="true"] {
  background: var(--se-color-toolbar-active, #dbeafe);
  border-color: var(--se-color-accent, #3b82f6);
  color: var(--se-color-accent, #3b82f6);
}

.se-toolbar__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.se-toolbar__btn svg,
.se-toolbar__menu-item svg {
  width: 16px;
  height: 16px;
  pointer-events: none;
  flex-shrink: 0;
}

.se-toolbar__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.se-theme-swatch-icon,
.se-theme-auto-icon {
  display: block;
  border-radius: 4px;
  border: 1px solid transparent;
  box-sizing: border-box;
}

.se-toolbar__menu-item--active .se-theme-swatch-icon,
.se-toolbar__menu-item[aria-current="true"] .se-theme-swatch-icon,
.se-toolbar__menu-item--active .se-theme-auto-icon,
.se-toolbar__menu-item[aria-current="true"] .se-theme-auto-icon,
.se-toolbar__btn--active .se-theme-swatch-icon,
.se-toolbar__btn--active .se-theme-auto-icon {
  border-color: var(--se-color-accent, #3b82f6);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--se-color-accent, #3b82f6) 30%, transparent);
}

.se-toolbar__label {
  white-space: nowrap;
}

.se-toolbar__chevron {
  font-size: 10px;
  line-height: 1;
  opacity: 0.7;
}

.se-toolbar__btn--dropdown {
  padding-right: 8px;
}

.se-toolbar__dropdown {
  position: relative;
}

/* Hover bridge between trigger and floating menu to prevent accidental close. */
.se-toolbar__dropdown::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  height: 14px;
  pointer-events: none;
}

.se-toolbar__dropdown:hover::after,
.se-toolbar__dropdown:focus-within::after,
.se-toolbar__dropdown--open::after {
  pointer-events: auto;
}

.se-toolbar__menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 20;
  min-width: 180px;
  display: none;
  flex-direction: column;
  gap: 2px;
  padding: 6px;
  background: var(--se-color-bg, #ffffff);
  border: 1px solid var(--se-color-border, #d0d7de);
  border-radius: 8px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.14);
}

.se-toolbar__dropdown:hover .se-toolbar__menu,
.se-toolbar__dropdown:focus-within .se-toolbar__menu,
.se-toolbar__dropdown--open .se-toolbar__menu {
  display: flex;
}

.se-toolbar__dropdown--open > .se-toolbar__btn--dropdown {
  background: var(--se-color-toolbar-active, #dbeafe);
  border-color: var(--se-color-accent, #3b82f6);
  color: var(--se-color-accent, #3b82f6);
}

.se-toolbar__menu-item {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  width: 100%;
  min-height: 30px;
  padding: 6px 8px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--se-color-text, #1a1a1a);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  transition: background 0.1s, border-color 0.1s;
}

.se-toolbar__menu-item:hover,
.se-toolbar__menu-item:focus-visible {
  background: var(--se-color-toolbar-hover, #e6ebf0);
  border-color: var(--se-color-border, #d0d7de);
  outline: none;
}

.se-toolbar__menu-item--active,
.se-toolbar__menu-item[aria-current="true"] {
  background: var(--se-color-toolbar-active, #dbeafe);
  border-color: var(--se-color-accent, #3b82f6);
  color: var(--se-color-accent, #3b82f6);
}

.se-toolbar__menu-item:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.se-toolbar__sep {
  display: inline-block;
  width: 1px;
  height: 20px;
  background: var(--se-color-border, #d0d7de);
  margin: 0 4px;
  flex-shrink: 0;
}

/* ============================================================
   Panels
   ============================================================ */
.se-panels {
  display: flex;
  flex: 1 1 0;
  overflow: hidden;
  min-height: 0;
}

.se-panel {
  flex: 1 1 50%;
  overflow: auto;
  position: relative;
  min-width: 0;
  scrollbar-width: thin;
  scrollbar-color: var(--se-color-scrollbar-thumb, #c4ccd5) var(--se-color-scrollbar-track, #eef1f4);
}

.se-panel::-webkit-scrollbar,
.se-editor .cm-scroller::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

.se-panel::-webkit-scrollbar-track,
.se-editor .cm-scroller::-webkit-scrollbar-track {
  background: var(--se-color-scrollbar-track, #eef1f4);
}

.se-panel::-webkit-scrollbar-thumb,
.se-editor .cm-scroller::-webkit-scrollbar-thumb {
  background: var(--se-color-scrollbar-thumb, #c4ccd5);
  border-radius: 999px;
  border: 3px solid var(--se-color-scrollbar-track, #eef1f4);
}

.se-panel::-webkit-scrollbar-thumb:hover,
.se-editor .cm-scroller::-webkit-scrollbar-thumb:hover {
  background: var(--se-color-scrollbar-thumb-hover, #aeb8c2);
}

.se-panel--code {
  border-right: 1px solid var(--se-color-border, #d0d7de);
}

.se-panel--preview {
  /* Prevent browser scroll anchoring from nudging preview on content re-render. */
  overflow-anchor: none;
}

/* Drag-handle divider */
.se-divider {
  flex: 0 0 5px;
  width: 5px;
  cursor: col-resize;
  background: var(--se-color-border, #d0d7de);
  transition: background 0.15s;
}

.se-divider:hover,
.se-divider.se-divider--dragging {
  background: var(--se-color-accent, #3b82f6);
}

/* ============================================================
   Preview typography
   ============================================================ */
.se-preview {
  padding: 16px 24px;
  line-height: 1.75;
  word-break: break-word;
}

.se-preview h1,
.se-preview h2,
.se-preview h3,
.se-preview h4,
.se-preview h5,
.se-preview h6 {
  margin: 1.25em 0 0.5em;
  font-weight: 600;
  line-height: 1.3;
}

.se-preview h1 {
  font-size: 2em;
  border-bottom: 1px solid var(--se-color-border, #d0d7de);
  padding-bottom: 0.3em;
}

.se-preview h2 {
  font-size: 1.5em;
  border-bottom: 1px solid var(--se-color-border, #d0d7de);
  padding-bottom: 0.2em;
}

.se-preview h3 { font-size: 1.25em; }
.se-preview h4 { font-size: 1.1em; }

.se-preview p { margin: 0.75em 0; }

.se-preview .se-code-block {
  position: relative;
  margin: 0.75em 0;
}

.se-preview .se-code-block__toolbar {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  display: flex;
  gap: 4px;
  align-items: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.14s ease;
}

.se-preview .se-code-block:hover .se-code-block__toolbar,
.se-preview .se-code-block:focus-within .se-code-block__toolbar {
  opacity: 1;
  pointer-events: auto;
}

.se-preview .se-code-block__lang-select {
  min-width: 132px;
  height: 26px;
  border-radius: 6px;
  border: 1px solid var(--se-color-border, #d0d7de);
  background: color-mix(in srgb, var(--se-color-surface, #ffffff) 92%, var(--se-color-code-bg, #f6f8fa));
  color: var(--se-color-text, #1a1a1a);
  font-size: 12px;
  font-family: var(--se-font-sans, system-ui, -apple-system, sans-serif);
  padding: 0 8px;
  cursor: pointer;
}

.se-preview .se-code-block__lang-select:focus-visible {
  outline: 2px solid var(--se-color-accent, #3b82f6);
  outline-offset: 1px;
}

.se-preview .se-code-block__copy-btn {
  width: 26px;
  height: 26px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid var(--se-color-border, #d0d7de);
  border-radius: 6px;
  background-color: color-mix(in srgb, var(--se-color-surface, #ffffff) 92%, var(--se-color-code-bg, #f6f8fa));
  color: var(--se-color-muted, #6b7280);
  cursor: pointer;
  transition: background-color 0.1s ease, color 0.1s ease;
}

.se-preview .se-code-block__copy-btn:hover {
  background-color: color-mix(in srgb, var(--se-color-surface, #ffffff) 80%, var(--se-color-code-bg, #f6f8fa));
  color: var(--se-color-text, #1a1a1a);
}

.se-preview .se-code-block__copy-btn::before {
  content: '';
  display: block;
  width: 13px;
  height: 13px;
  background-color: currentColor;
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect x='9' y='9' width='13' height='13' rx='2' fill='none' stroke='black' stroke-width='2'/%3E%3Cpath d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' fill='none' stroke='black' stroke-width='2'/%3E%3C/svg%3E");
  mask-repeat: no-repeat;
  mask-position: center;
  mask-size: contain;
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect x='9' y='9' width='13' height='13' rx='2' fill='none' stroke='black' stroke-width='2'/%3E%3Cpath d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' fill='none' stroke='black' stroke-width='2'/%3E%3C/svg%3E");
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-position: center;
  -webkit-mask-size: contain;
}

.se-preview .se-code-block__copy-btn.is-copied {
  color: var(--se-color-success, #16a34a);
}

.se-preview .se-code-block__copy-btn.is-copied::before {
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpolyline points='20 6 9 17 4 12' fill='none' stroke='black' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpolyline points='20 6 9 17 4 12' fill='none' stroke='black' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
}

.se-preview pre {
  background: var(--se-color-code-bg, #f6f8fa);
  color: var(--se-color-code-text, #24292f);
  border: 1px solid var(--se-color-border, #d0d7de);
  border-radius: 6px;
  margin: 0;
  padding: 40px 16px 12px;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.5;
}

@media (hover: none) {
  .se-preview .se-code-block__toolbar {
    opacity: 1;
    pointer-events: auto;
  }
}

.se-preview code {
  font-family: var(--se-font-mono, "Fira Code", Consolas, monospace);
  font-size: 0.9em;
}

.se-preview pre code.hljs {
  display: block;
  color: var(--se-color-code-text, #24292f);
  background: transparent;
}

.se-preview pre code.hljs > span[data-source-line] {
  display: block;
  min-height: 1.5em;
}

.se-preview pre code.hljs .hljs-comment,
.se-preview pre code.hljs .hljs-quote {
  color: var(--se-color-code-comment, #6e7781);
}

.se-preview pre code.hljs .hljs-keyword,
.se-preview pre code.hljs .hljs-selector-tag,
.se-preview pre code.hljs .hljs-doctag,
.se-preview pre code.hljs .hljs-meta .hljs-keyword {
  color: var(--se-color-code-keyword, #cf222e);
}

.se-preview pre code.hljs .hljs-string,
.se-preview pre code.hljs .hljs-regexp,
.se-preview pre code.hljs .hljs-meta .hljs-string {
  color: var(--se-color-code-string, #0a3069);
}

.se-preview pre code.hljs .hljs-number,
.se-preview pre code.hljs .hljs-literal,
.se-preview pre code.hljs .hljs-symbol {
  color: var(--se-color-code-number, #0550ae);
}

.se-preview pre code.hljs .hljs-title,
.se-preview pre code.hljs .hljs-section {
  color: var(--se-color-code-title, #8250df);
}

.se-preview pre code.hljs .hljs-function .hljs-title,
.se-preview pre code.hljs .hljs-title.function_,
.se-preview pre code.hljs .hljs-built_in {
  color: var(--se-color-code-function, #953800);
}

.se-preview pre code.hljs .hljs-type,
.se-preview pre code.hljs .hljs-class .hljs-title,
.se-preview pre code.hljs .hljs-title.class_ {
  color: var(--se-color-code-type, #953800);
}

.se-preview pre code.hljs .hljs-attr,
.se-preview pre code.hljs .hljs-attribute,
.se-preview pre code.hljs .hljs-property,
.se-preview pre code.hljs .hljs-variable,
.se-preview pre code.hljs .hljs-template-variable {
  color: var(--se-color-code-literal, #0550ae);
}

.se-preview pre code.hljs .hljs-subst,
.se-preview pre code.hljs .hljs-punctuation,
.se-preview pre code.hljs .hljs-operator {
  color: var(--se-color-code-text, #24292f);
}

.se-preview :not(pre) > code {
  background: var(--se-color-code-bg, #f0f0f0);
  padding: 0.15em 0.4em;
  border-radius: 3px;
}

.se-preview blockquote {
  margin: 0.75em 0;
  padding: 0.5em 1em;
  border-left: 4px solid var(--se-color-accent, #3b82f6);
  background: var(--se-color-blockquote-bg, #f0f7ff);
  color: var(--se-color-blockquote-text, #555555);
}

.se-preview table {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
  font-size: 0.95em;
}

.se-preview th,
.se-preview td {
  border: 1px solid var(--se-color-border, #d0d7de);
  padding: 6px 12px;
  text-align: left;
}

.se-preview th {
  background: var(--se-color-table-header-bg, var(--se-color-code-bg, #f6f8fa));
  font-weight: 600;
}

.se-preview tr:nth-child(even) {
  background: var(--se-color-table-row-alt, #f9fafb);
}

.se-preview img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
}

.se-preview img.se-preview-image-selected {
  outline: 2px solid var(--se-color-accent, #3b82f6);
  outline-offset: 2px;
}

.se-preview a {
  color: var(--se-color-accent, #3b82f6);
  text-decoration: none;
}

.se-preview a:hover { text-decoration: underline; }

.se-preview ul,
.se-preview ol { padding-left: 2em; margin: 0.5em 0; }

.se-preview li { margin: 0.25em 0; }

.se-preview hr {
  border: none;
  border-top: 1px solid var(--se-color-border, #d0d7de);
  margin: 1.5em 0;
}

/* Task list */
.se-preview input[type="checkbox"] {
  margin-right: 0.4em;
  cursor: pointer;
}

/* ============================================================
   Sync highlight
   ============================================================ */
.se-sync-highlight {
  background: rgba(59, 130, 246, 0.12) !important;
  outline: 2px solid rgba(59, 130, 246, 0.45);
  outline-offset: 1px;
  border-radius: 2px;
  transition: background 0.2s, outline 0.2s;
}

/* ============================================================
   Mode visibility
   ============================================================ */
.se-mode-code .se-panel--preview,
.se-mode-code .se-divider { display: none; }

.se-mode-preview .se-panel--code,
.se-mode-preview .se-divider { display: none; }

.se-mode-split .se-panel--code,
.se-mode-split .se-panel--preview { display: block; }

.se-wysiwyg-beta {
  display: none;
  font-size: 12px;
  line-height: 1.4;
  color: var(--se-color-muted, #6b7280);
  background: var(--se-color-surface-muted, #f8fafc);
  border-bottom: 1px dashed var(--se-color-border, #d0d7de);
  padding: 6px 10px;
}

.se-mode-wysiwyg .se-panel--code,
.se-mode-wysiwyg .se-divider { display: none; }

.se-mode-wysiwyg .se-panel--preview { display: block; }
.se-mode-wysiwyg .se-wysiwyg-beta { display: block; }

/* ============================================================
   Theme variants
   ============================================================ */
${buildEditorThemeStyles()}

/* ============================================================
   Image resize handle
   ============================================================ */
.se-img-resize-handle {
  position: fixed;
  width: 16px;
  height: 16px;
  background: var(--se-color-accent, #3b82f6);
  border: 2px solid #fff;
  border-radius: 3px;
  cursor: se-resize;
  z-index: 9999;
  box-shadow: 0 1px 4px rgba(0,0,0,.35);
  pointer-events: all;
}

/* ============================================================
   Mermaid and math blocks
   ============================================================ */
.se-mermaid {
  background: var(--se-color-code-bg, #f6f8fa);
  border: 1px solid var(--se-color-border, #d0d7de);
  border-radius: 6px;
  padding: 12px;
  margin: 0.75em 0;
  overflow-x: auto;
  text-align: center;
}

.se-mermaid__fallback {
  /* Shown when window.mermaid is not loaded */
  text-align: left;
  margin: 0;
  background: transparent;
  border: none;
  padding: 0;
}

.se-mermaid svg {
  max-width: 100%;
  height: auto;
}

.se-math-block {
  display: block;
  overflow-x: auto;
  padding: 0.5em 0;
  text-align: center;
  margin: 0.75em 0;
}

.se-math-inline {
  display: inline;
}

/* ============================================================
   Table insert dialog
   ============================================================ */
.se-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9998;
  animation: se-fade-in 0.1s ease;
}

@keyframes se-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.se-dialog {
  background: var(--se-color-surface, #ffffff);
  color: var(--se-color-text, #1a1a1a);
  border: 1px solid var(--se-color-border, #d0d7de);
  border-radius: 8px;
  box-shadow: 0 8px 30px rgba(0,0,0,.25);
  padding: 20px 24px;
  min-width: 260px;
  max-width: 340px;
  width: 100%;
}

.se-dialog__title {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: var(--se-color-text, #1a1a1a);
}

.se-dialog__body {
  display: flex;
  gap: 14px;
  margin-bottom: 20px;
}

.se-dialog__label {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: var(--se-color-text, #1a1a1a);
  font-weight: 500;
}

.se-dialog__input {
  padding: 6px 8px;
  color: var(--se-color-text, #1a1a1a);
  background: var(--se-color-input-bg, #ffffff);
  border: 1px solid var(--se-color-border, #d0d7de);
  border-radius: 5px;
  font-size: 14px;
  width: 100%;
  outline: none;
  transition: border-color 0.15s;
}

.se-dialog__input:focus {
  border-color: var(--se-color-accent, #3b82f6);
  box-shadow: 0 0 0 3px rgba(59,130,246,.15);
}

.se-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.se-dialog__btn {
  padding: 6px 16px;
  border-radius: 5px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 0.15s, border-color 0.15s;
}

.se-dialog__btn--cancel {
  background: var(--se-color-surface, #ffffff);
  border-color: var(--se-color-border, #d0d7de);
  color: var(--se-color-text, #1a1a1a);
}

.se-dialog__btn--cancel:hover {
  background: var(--se-color-surface-muted, #f3f4f6);
}

.se-dialog__btn--ok {
  background: var(--se-color-accent, #3b82f6);
  color: #fff;
  border-color: var(--se-color-accent, #3b82f6);
}

.se-dialog__btn--ok:hover {
  background: var(--se-color-accent-strong, #2563eb);
  border-color: var(--se-color-accent-strong, #2563eb);
}

/* ============================================================
   Stage 3: draw.io preview block
   ============================================================ */
.se-drawio {
  display: block;
  max-height: 460px;
  object-fit: contain;
  background: var(--se-color-surface, #ffffff);
  border-radius: 6px;
  margin: 0.75em 0;
  cursor: pointer;
}

/* ============================================================
   Stage 3: diff modal
   ============================================================ */
.se-diff-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0,0,0,.45);
  display: flex;
  align-items: center;
  justify-content: center;
}

.se-diff {
  width: min(1100px, 92vw);
  height: min(760px, 86vh);
  background: var(--se-color-surface, #ffffff);
  color: var(--se-color-text, #1a1a1a);
  border: 1px solid var(--se-color-border, #d0d7de);
  border-radius: 10px;
  box-shadow: 0 18px 50px rgba(0,0,0,.35);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.se-diff__header,
.se-diff__footer {
  padding: 10px 14px;
  border-bottom: 1px solid var(--se-color-border, #d0d7de);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.se-diff__footer {
  border-bottom: none;
  border-top: 1px solid var(--se-color-border, #d0d7de);
  justify-content: flex-end;
  gap: 8px;
}

.se-diff__title { font-size: 15px; margin: 0; }

.se-diff__icon-btn {
  border: none;
  background: transparent;
  color: var(--se-color-text, #1a1a1a);
  font-size: 22px;
  cursor: pointer;
}

.se-diff__body {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  min-height: 0;
  overflow: hidden;
}

.se-diff__col {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.se-diff__col + .se-diff__col {
  border-left: 1px solid var(--se-color-border, #d0d7de);
}

.se-diff__col-title {
  margin: 0;
  padding: 8px 10px;
  font-size: 12px;
  color: var(--se-color-muted, #6b7280);
  border-bottom: 1px solid var(--se-color-border, #d0d7de);
}

.se-diff__pre {
  margin: 0;
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 12px;
  color: var(--se-color-text, #1a1a1a);
  background: var(--se-color-code-bg, #f6f8fa);
  font-family: var(--se-font-mono, "Fira Code", Consolas, monospace);
  font-size: 12px;
  line-height: 1.5;
  white-space: pre;
}

.se-diff__pre--old,
.se-diff__pre--new {
  background: var(--se-color-code-bg, #f6f8fa);
}

.se-diff__hl {
  border-radius: 3px;
  padding: 0 1px;
}

.se-diff__hl--old {
  background: rgba(220, 38, 38, 0.22);
  outline: 1px solid var(--se-color-danger-outline, rgba(220, 38, 38, 0.42));
}

.se-diff__hl--new {
  background: rgba(22, 163, 74, 0.2);
  outline: 1px solid var(--se-color-success-outline, rgba(22, 163, 74, 0.4));
}

.se-diff__cursor {
  display: inline-block;
  width: 2px;
  height: 1.15em;
  vertical-align: text-bottom;
  background: var(--se-color-accent-strong, #2563eb);
  border-radius: 2px;
  margin: 0 1px;
}

.se-diff__btn {
  border: 1px solid transparent;
  border-radius: 5px;
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
}

.se-diff__btn--cancel {
  background: var(--se-color-surface, #ffffff);
  color: var(--se-color-text, #1a1a1a);
  border-color: var(--se-color-border, #d0d7de);
}

.se-diff__btn--ok {
  background: var(--se-color-accent-strong, #2563eb);
  color: #fff;
  border-color: var(--se-color-accent-strong, #2563eb);
}

/* ============================================================
   Stage 3: draw.io modal
   ============================================================ */
.se-drawio-overlay {
  position: fixed;
  inset: 0;
  z-index: 10001;
  background: rgba(0,0,0,.55);
  display: flex;
  align-items: center;
  justify-content: center;
}

.se-drawio-modal {
  width: min(1280px, 95vw);
  height: min(860px, 92vh);
  background: var(--se-color-surface, #ffffff);
  color: var(--se-color-text, #1a1a1a);
  border: 1px solid var(--se-color-border, #d0d7de);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 18px 50px rgba(0,0,0,.4);
  display: flex;
  flex-direction: column;
}

.se-drawio-modal__header {
  padding: 10px 14px;
  border-bottom: 1px solid var(--se-color-border, #d0d7de);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.se-drawio-modal__title { margin: 0; font-size: 14px; }

.se-drawio-modal__close {
  border: none;
  background: transparent;
  color: var(--se-color-text, #1a1a1a);
  font-size: 22px;
  cursor: pointer;
}

.se-drawio-modal__frame-wrap { flex: 1; min-height: 0; }
.se-drawio-modal__frame { width: 100%; height: 100%; border: 0; }

@media (max-width: 900px) {
  .se-diff__body { grid-template-columns: 1fr; }
  .se-diff__col + .se-diff__col { border-left: none; border-top: 1px solid var(--se-color-border, #d0d7de); }
}
`;