/**
 * All editor CSS as a JS string.
 * Injected once into <head> by EditorCore (plain-JS path)
 * and into Shadow DOM by the Web Component adapter.
 */
export const EDITOR_STYLES = `
/* ============================================================
   Layout
   ============================================================ */
.mde-editor {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  font-family: var(--mde-font-sans, system-ui, -apple-system, sans-serif);
  font-size: 15px;
  color: var(--mde-color-text, #1a1a1a);
  background: var(--mde-color-bg, #ffffff);
  border: 1px solid var(--mde-color-border, #d0d7de);
  border-radius: 6px;
  overflow: hidden;
  box-sizing: border-box;
}

.mde-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

/* ============================================================
   Toolbar
   ============================================================ */
.mde-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
  padding: 4px 8px;
  background: var(--mde-color-toolbar-bg, #f6f8fa);
  border-bottom: 1px solid var(--mde-color-border, #d0d7de);
  user-select: none;
  flex-shrink: 0;
}

.mde-toolbar__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 2px 6px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--mde-color-text, #1a1a1a);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  transition: background 0.1s, border-color 0.1s;
}

.mde-toolbar__btn:hover {
  background: var(--mde-color-toolbar-hover, #e6ebf0);
  border-color: var(--mde-color-border, #d0d7de);
}

.mde-toolbar__btn--active,
.mde-toolbar__btn[aria-pressed="true"] {
  background: var(--mde-color-toolbar-active, #dbeafe);
  border-color: var(--mde-color-accent, #3b82f6);
  color: var(--mde-color-accent, #3b82f6);
}

.mde-toolbar__btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.mde-toolbar__btn svg {
  width: 16px;
  height: 16px;
  pointer-events: none;
  flex-shrink: 0;
}

.mde-toolbar__sep {
  display: inline-block;
  width: 1px;
  height: 20px;
  background: var(--mde-color-border, #d0d7de);
  margin: 0 4px;
  flex-shrink: 0;
}

/* ============================================================
   Panels
   ============================================================ */
.mde-panels {
  display: flex;
  flex: 1 1 0;
  overflow: hidden;
  min-height: 0;
}

.mde-panel {
  flex: 1 1 50%;
  overflow: auto;
  position: relative;
  min-width: 0;
}

.mde-panel--code {
  border-right: 1px solid var(--mde-color-border, #d0d7de);
}

/* Drag-handle divider */
.mde-divider {
  flex: 0 0 5px;
  width: 5px;
  cursor: col-resize;
  background: var(--mde-color-border, #d0d7de);
  transition: background 0.15s;
}

.mde-divider:hover,
.mde-divider.mde-divider--dragging {
  background: var(--mde-color-accent, #3b82f6);
}

/* ============================================================
   Preview typography
   ============================================================ */
.mde-preview {
  padding: 16px 24px;
  line-height: 1.75;
  word-break: break-word;
}

.mde-preview h1,
.mde-preview h2,
.mde-preview h3,
.mde-preview h4,
.mde-preview h5,
.mde-preview h6 {
  margin: 1.25em 0 0.5em;
  font-weight: 600;
  line-height: 1.3;
}

.mde-preview h1 {
  font-size: 2em;
  border-bottom: 1px solid var(--mde-color-border, #d0d7de);
  padding-bottom: 0.3em;
}

.mde-preview h2 {
  font-size: 1.5em;
  border-bottom: 1px solid var(--mde-color-border, #d0d7de);
  padding-bottom: 0.2em;
}

.mde-preview h3 { font-size: 1.25em; }
.mde-preview h4 { font-size: 1.1em; }

.mde-preview p { margin: 0.75em 0; }

.mde-preview pre {
  background: var(--mde-color-code-bg, #f6f8fa);
  border: 1px solid var(--mde-color-border, #d0d7de);
  border-radius: 6px;
  padding: 12px 16px;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.5;
}

.mde-preview code {
  font-family: var(--mde-font-mono, "Fira Code", Consolas, monospace);
  font-size: 0.9em;
}

.mde-preview :not(pre) > code {
  background: var(--mde-color-code-bg, #f0f0f0);
  padding: 0.15em 0.4em;
  border-radius: 3px;
}

.mde-preview blockquote {
  margin: 0.75em 0;
  padding: 0.5em 1em;
  border-left: 4px solid var(--mde-color-accent, #3b82f6);
  background: #f0f7ff;
  color: #555;
}

.mde-preview table {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
  font-size: 0.95em;
}

.mde-preview th,
.mde-preview td {
  border: 1px solid var(--mde-color-border, #d0d7de);
  padding: 6px 12px;
  text-align: left;
}

.mde-preview th { background: var(--mde-color-code-bg, #f6f8fa); font-weight: 600; }
.mde-preview tr:nth-child(even) { background: #f9fafb; }

.mde-preview img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
}

.mde-preview a {
  color: var(--mde-color-accent, #3b82f6);
  text-decoration: none;
}
.mde-preview a:hover { text-decoration: underline; }

.mde-preview ul,
.mde-preview ol { padding-left: 2em; margin: 0.5em 0; }
.mde-preview li { margin: 0.25em 0; }

.mde-preview hr {
  border: none;
  border-top: 1px solid var(--mde-color-border, #d0d7de);
  margin: 1.5em 0;
}

/* Task list */
.mde-preview input[type="checkbox"] {
  margin-right: 0.4em;
  cursor: default;
}

/* ============================================================
   Sync highlight
   ============================================================ */
.mde-sync-highlight {
  background: rgba(59, 130, 246, 0.12) !important;
  outline: 2px solid rgba(59, 130, 246, 0.45);
  outline-offset: 1px;
  border-radius: 2px;
  transition: background 0.2s, outline 0.2s;
}

/* ============================================================
   Mode visibility
   ============================================================ */
.mde-mode-code .mde-panel--preview,
.mde-mode-code .mde-divider { display: none; }

.mde-mode-preview .mde-panel--code,
.mde-mode-preview .mde-divider { display: none; }

.mde-mode-split .mde-panel--code,
.mde-mode-split .mde-panel--preview { display: block; }

.mde-wysiwyg-beta {
  display: none;
  font-size: 12px;
  line-height: 1.4;
  color: #6b7280;
  background: #f8fafc;
  border-bottom: 1px dashed var(--mde-color-border, #d0d7de);
  padding: 6px 10px;
}

.mde-mode-wysiwyg .mde-panel--code,
.mde-mode-wysiwyg .mde-divider { display: none; }
.mde-mode-wysiwyg .mde-panel--preview { display: block; }
.mde-mode-wysiwyg .mde-wysiwyg-beta { display: block; }

/* ============================================================
   Dark mode (CSS-media-based; also activated by [data-theme="dark"])
   ============================================================ */
@media (prefers-color-scheme: dark) {
  .mde-editor:not([data-theme="light"]) {
    --mde-color-bg: #0d1117;
    --mde-color-text: #e6edf3;
    --mde-color-border: #30363d;
    --mde-color-toolbar-bg: #161b22;
    --mde-color-toolbar-hover: #21262d;
    --mde-color-toolbar-active: #1c2e4a;
    --mde-color-accent: #58a6ff;
    --mde-color-code-bg: #161b22;
  }

  .mde-editor:not([data-theme="light"]) .mde-preview blockquote {
    background: #1c2e4a;
    color: #b0bac4;
  }

  .mde-editor:not([data-theme="light"]) .mde-preview tr:nth-child(even) {
    background: #0d1117;
  }
}

.mde-editor[data-theme="dark"] {
  --mde-color-bg: #0d1117;
  --mde-color-text: #e6edf3;
  --mde-color-border: #30363d;
  --mde-color-toolbar-bg: #161b22;
  --mde-color-toolbar-hover: #21262d;
  --mde-color-toolbar-active: #1c2e4a;
  --mde-color-accent: #58a6ff;
  --mde-color-code-bg: #161b22;
}

/* ============================================================
   Image resize handle
   ============================================================ */
.mde-img-resize-handle {
  position: fixed;
  width: 16px;
  height: 16px;
  background: var(--mde-color-accent, #3b82f6);
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
.mde-mermaid {
  background: var(--mde-color-code-bg, #f6f8fa);
  border: 1px solid var(--mde-color-border, #d0d7de);
  border-radius: 6px;
  padding: 12px;
  margin: 0.75em 0;
  overflow-x: auto;
  text-align: center;
}

.mde-mermaid__fallback {
  /* Shown when window.mermaid is not loaded */
  text-align: left;
  margin: 0;
  background: transparent;
  border: none;
  padding: 0;
}

.mde-mermaid svg {
  max-width: 100%;
  height: auto;
}

.mde-math-block {
  display: block;
  overflow-x: auto;
  padding: 0.5em 0;
  text-align: center;
  margin: 0.75em 0;
}

.mde-math-inline {
  display: inline;
}

/* ============================================================
   Table insert dialog
   ============================================================ */
.mde-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9998;
  animation: mde-fade-in 0.1s ease;
}

@keyframes mde-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.mde-dialog {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 30px rgba(0,0,0,.25);
  padding: 20px 24px;
  min-width: 260px;
  max-width: 340px;
  width: 100%;
}

.mde-dialog__title {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.mde-dialog__body {
  display: flex;
  gap: 14px;
  margin-bottom: 20px;
}

.mde-dialog__label {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: #444;
  font-weight: 500;
}

.mde-dialog__input {
  padding: 6px 8px;
  border: 1px solid #d0d7de;
  border-radius: 5px;
  font-size: 14px;
  width: 100%;
  outline: none;
  transition: border-color .15s;
}

.mde-dialog__input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59,130,246,.15);
}

.mde-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.mde-dialog__btn {
  padding: 6px 16px;
  border-radius: 5px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background .15s, border-color .15s;
}

.mde-dialog__btn--cancel {
  background: #fff;
  border-color: #d0d7de;
  color: #444;
}
.mde-dialog__btn--cancel:hover { background: #f3f4f6; }

.mde-dialog__btn--ok {
  background: #3b82f6;
  color: #fff;
  border-color: #3b82f6;
}
.mde-dialog__btn--ok:hover { background: #2563eb; border-color: #2563eb; }

/* ============================================================
   Stage 3: draw.io preview block
   ============================================================ */
.mde-drawio {
  border: 1px solid var(--mde-color-border, #d0d7de);
  border-radius: 8px;
  background: var(--mde-color-code-bg, #f8fafc);
  margin: 0.75em 0;
  overflow: hidden;
}

.mde-drawio__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--mde-color-border, #d0d7de);
  background: rgba(59,130,246,.06);
}

.mde-drawio__edit {
  border: 1px solid #3b82f6;
  background: #eff6ff;
  color: #1d4ed8;
  border-radius: 5px;
  font-size: 12px;
  padding: 3px 10px;
  cursor: pointer;
}

.mde-drawio__fallback {
  margin: 0;
  border: none;
  border-radius: 0;
  background: transparent;
}

/* ============================================================
   Stage 3: diff modal
   ============================================================ */
.mde-diff-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0,0,0,.45);
  display: flex;
  align-items: center;
  justify-content: center;
}

.mde-diff {
  width: min(1100px, 92vw);
  height: min(760px, 86vh);
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 18px 50px rgba(0,0,0,.35);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.mde-diff__header,
.mde-diff__footer {
  padding: 10px 14px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mde-diff__footer {
  border-bottom: none;
  border-top: 1px solid #e5e7eb;
  justify-content: flex-end;
  gap: 8px;
}

.mde-diff__title { font-size: 15px; margin: 0; }
.mde-diff__icon-btn { border: none; background: transparent; font-size: 22px; cursor: pointer; }

.mde-diff__body {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  min-height: 0;
}

.mde-diff__col { display: flex; flex-direction: column; min-width: 0; }
.mde-diff__col + .mde-diff__col { border-left: 1px solid #e5e7eb; }
.mde-diff__col-title { margin: 0; padding: 8px 10px; font-size: 12px; color: #6b7280; border-bottom: 1px solid #e5e7eb; }

.mde-diff__pre {
  margin: 0;
  flex: 1;
  overflow: auto;
  padding: 12px;
  font-family: var(--mde-font-mono, "Fira Code", Consolas, monospace);
  font-size: 12px;
  line-height: 1.5;
  white-space: pre;
}

.mde-diff__pre--old { background: #fff7f7; }
.mde-diff__pre--new { background: #f7fff8; }

.mde-diff__btn {
  border: 1px solid transparent;
  border-radius: 5px;
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
}

.mde-diff__btn--cancel { background: #fff; border-color: #d1d5db; }
.mde-diff__btn--ok { background: #2563eb; color: #fff; border-color: #2563eb; }

/* ============================================================
   Stage 3: draw.io modal
   ============================================================ */
.mde-drawio-overlay {
  position: fixed;
  inset: 0;
  z-index: 10001;
  background: rgba(0,0,0,.55);
  display: flex;
  align-items: center;
  justify-content: center;
}

.mde-drawio-modal {
  width: min(1280px, 95vw);
  height: min(860px, 92vh);
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 18px 50px rgba(0,0,0,.4);
  display: flex;
  flex-direction: column;
}

.mde-drawio-modal__header {
  padding: 10px 14px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mde-drawio-modal__title { margin: 0; font-size: 14px; }
.mde-drawio-modal__close { border: none; background: transparent; font-size: 22px; cursor: pointer; }

.mde-drawio-modal__frame-wrap { flex: 1; min-height: 0; }
.mde-drawio-modal__frame { width: 100%; height: 100%; border: 0; }

@media (max-width: 900px) {
  .mde-diff__body { grid-template-columns: 1fr; }
  .mde-diff__col + .mde-diff__col { border-left: none; border-top: 1px solid #e5e7eb; }
}
`;
