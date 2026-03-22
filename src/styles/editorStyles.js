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
  font-family: var(--se-font-sans, system-ui, -apple-system, sans-serif);
  font-size: 15px;
  color: var(--se-color-text, #1a1a1a);
  background: var(--se-color-bg, #ffffff);
  border: 1px solid var(--se-color-border, #d0d7de);
  border-radius: 6px;
  overflow: hidden;
  box-sizing: border-box;
}

.se-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
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
}

.se-panel--code {
  border-right: 1px solid var(--se-color-border, #d0d7de);
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

.se-preview pre {
  background: var(--se-color-code-bg, #f6f8fa);
  border: 1px solid var(--se-color-border, #d0d7de);
  border-radius: 6px;
  padding: 12px 16px;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.5;
}

.se-preview code {
  font-family: var(--se-font-mono, "Fira Code", Consolas, monospace);
  font-size: 0.9em;
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
  background: #f0f7ff;
  color: #555;
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

.se-preview th { background: var(--se-color-code-bg, #f6f8fa); font-weight: 600; }
.se-preview tr:nth-child(even) { background: #f9fafb; }

.se-preview img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
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
  cursor: default;
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
  color: #6b7280;
  background: #f8fafc;
  border-bottom: 1px dashed var(--se-color-border, #d0d7de);
  padding: 6px 10px;
}

.se-mode-wysiwyg .se-panel--code,
.se-mode-wysiwyg .se-divider { display: none; }
.se-mode-wysiwyg .se-panel--preview { display: block; }
.se-mode-wysiwyg .se-wysiwyg-beta { display: block; }

/* ============================================================
   Dark mode (CSS-media-based; also activated by [data-theme="dark"])
   ============================================================ */
@media (prefers-color-scheme: dark) {
  .se-editor:not([data-theme="light"]) {
    --se-color-bg: #0d1117;
    --se-color-text: #e6edf3;
    --se-color-border: #30363d;
    --se-color-toolbar-bg: #161b22;
    --se-color-toolbar-hover: #21262d;
    --se-color-toolbar-active: #1c2e4a;
    --se-color-accent: #58a6ff;
    --se-color-code-bg: #161b22;
  }

  .se-editor:not([data-theme="light"]) .se-preview blockquote {
    background: #1c2e4a;
    color: #b0bac4;
  }

  .se-editor:not([data-theme="light"]) .se-preview tr:nth-child(even) {
    background: #0d1117;
  }
}

.se-editor[data-theme="dark"] {
  --se-color-bg: #0d1117;
  --se-color-text: #e6edf3;
  --se-color-border: #30363d;
  --se-color-toolbar-bg: #161b22;
  --se-color-toolbar-hover: #21262d;
  --se-color-toolbar-active: #1c2e4a;
  --se-color-accent: #58a6ff;
  --se-color-code-bg: #161b22;
}

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
  background: #fff;
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
  color: #1a1a1a;
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
  color: #444;
  font-weight: 500;
}

.se-dialog__input {
  padding: 6px 8px;
  border: 1px solid #d0d7de;
  border-radius: 5px;
  font-size: 14px;
  width: 100%;
  outline: none;
  transition: border-color .15s;
}

.se-dialog__input:focus {
  border-color: #3b82f6;
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
  transition: background .15s, border-color .15s;
}

.se-dialog__btn--cancel {
  background: #fff;
  border-color: #d0d7de;
  color: #444;
}
.se-dialog__btn--cancel:hover { background: #f3f4f6; }

.se-dialog__btn--ok {
  background: #3b82f6;
  color: #fff;
  border-color: #3b82f6;
}
.se-dialog__btn--ok:hover { background: #2563eb; border-color: #2563eb; }

/* ============================================================
   Stage 3: draw.io preview block
   ============================================================ */
.se-drawio {
  display: block;
  max-height: 460px;
  object-fit: contain;
  background: #fff;
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
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 18px 50px rgba(0,0,0,.35);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.se-diff__header,
.se-diff__footer {
  padding: 10px 14px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.se-diff__footer {
  border-bottom: none;
  border-top: 1px solid #e5e7eb;
  justify-content: flex-end;
  gap: 8px;
}

.se-diff__title { font-size: 15px; margin: 0; }
.se-diff__icon-btn { border: none; background: transparent; font-size: 22px; cursor: pointer; }

.se-diff__body {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  min-height: 0;
  overflow: hidden;
}

.se-diff__col { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.se-diff__col + .se-diff__col { border-left: 1px solid #e5e7eb; }
.se-diff__col-title { margin: 0; padding: 8px 10px; font-size: 12px; color: #6b7280; border-bottom: 1px solid #e5e7eb; }

.se-diff__pre {
  margin: 0;
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 12px;
  font-family: var(--se-font-mono, "Fira Code", Consolas, monospace);
  font-size: 12px;
  line-height: 1.5;
  white-space: pre;
}

.se-diff__pre--old { background: #fff7f7; }
.se-diff__pre--new { background: #f7fff8; }

.se-diff__hl {
  border-radius: 3px;
  padding: 0 1px;
}

.se-diff__hl--old {
  background: rgba(220, 38, 38, 0.22);
  outline: 1px solid rgba(220, 38, 38, 0.42);
}

.se-diff__hl--new {
  background: rgba(22, 163, 74, 0.2);
  outline: 1px solid rgba(22, 163, 74, 0.4);
}

.se-diff__cursor {
  display: inline-block;
  width: 2px;
  height: 1.15em;
  vertical-align: text-bottom;
  background: #2563eb;
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

.se-diff__btn--cancel { background: #fff; border-color: #d1d5db; }
.se-diff__btn--ok { background: #2563eb; color: #fff; border-color: #2563eb; }

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
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 18px 50px rgba(0,0,0,.4);
  display: flex;
  flex-direction: column;
}

.se-drawio-modal__header {
  padding: 10px 14px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.se-drawio-modal__title { margin: 0; font-size: 14px; }
.se-drawio-modal__close { border: none; background: transparent; font-size: 22px; cursor: pointer; }

.se-drawio-modal__frame-wrap { flex: 1; min-height: 0; }
.se-drawio-modal__frame { width: 100%; height: 100%; border: 0; }

@media (max-width: 900px) {
  .se-diff__body { grid-template-columns: 1fr; }
  .se-diff__col + .se-diff__col { border-left: none; border-top: 1px solid #e5e7eb; }
}
`;
