import katex from 'katex';
import { EventBus } from './EventBus.js';
import { State } from './State.js';
import { Parser } from './Parser.js';
import { Sync } from './Sync.js';
import { CodePanel } from '../ui/CodePanel.js';
import { PreviewPanel } from '../ui/PreviewPanel.js';
import { Toolbar } from '../ui/Toolbar.js';
import { ImageResize } from '../ui/ImageResize.js';
import { DiffModal } from '../ui/DiffModal.js';
import { DrawioModal } from '../ui/DrawioModal.js';
import { EDITOR_STYLES } from '../styles/editorStyles.js';
import { registerDefaultActions } from '../plugins/index.js';
import { ImageUploadHandler, createImageUploadAction } from '../plugins/imageUpload.js';

const STYLE_TAG_ID = 'mde-global-styles';

/**
 * Main orchestrator.
 *
 * Stage 3 additions:
 *  - `proposeChange` now opens accept/reject diff modal.
 *  - draw.io modal editor and preview "Edit" flow for ```drawio fenced blocks.
 *  - `wysiwyg` mode is a beta view preset (preview-first layout).
 */
export class EditorCore {
  /**
   * @param {HTMLElement} element  Root container — must have an explicit height
   * @param {object}      [opts]
   * @param {string}      [opts.value='']
   * @param {string}      [opts.mode='split']       'split' | 'code' | 'preview' | 'wysiwyg'
   * @param {string}      [opts.theme='auto']       'light' | 'dark' | 'auto'
   * @param {object}      [opts.markdown]
   * @param {object}      [opts.markdown.options]   Passed to markdown-it constructor
   * @param {Array}       [opts.markdown.plugins]   [[fn, opts?], ...]
   * @param {object}      [opts.upload]
   * @param {string}      [opts.upload.endpoint]    POST endpoint returning { url }
   * @param {object}      [opts.upload.headers]     e.g. { Authorization: 'Bearer ...' }
   * @param {number}      [opts.upload.maxSize]     bytes, default 5 MB
   * @param {string[]}    [opts.upload.formats]     MIME types, default common images
   * @param {object}      [opts.drawio]
   * @param {string}      [opts.drawio.url]         Embed URL, default embed.diagrams.net
   * @param {Function}    [opts.onChange]           (markdown, tokens, html) => void
   * @param {Function}    [opts.onSelectionChange]  (selInfo) => void
   * @param {Function}    [opts.onPaste]            (clipboardEvent) => void
   * @param {Function}    [opts.onUploadStart]      (file) => void
   * @param {Function}    [opts.onUploadDone]       (file, url) => void
   * @param {Function}    [opts.onUploadError]      (file, error) => void
   * @param {Function}    [opts.onPreviewClick]     (element, lineRange) => void
   * @param {Function}    [opts.onCommand]          (commandId, args) => void
   */
  constructor(element, opts = {}) {
    this._root = element;
    this._opts = opts;
    this._bus = new EventBus();
    this._state = new State(opts.value ?? '');
    this._parser = new Parser({
      markdownIt: opts.markdown?.options ?? {},
      plugins: opts.markdown?.plugins ?? [],
    });
    this._sync = new Sync();
    this._previewDebounce = null;
    this._mode = opts.mode ?? 'split';

    this._diffModal = new DiffModal();
    this._drawioModal = new DrawioModal({ url: opts.drawio?.url });

    this._injectStyles();
    this._buildDOM();
    this._buildCodePanel();
    this._buildPreviewPanel();
    this._buildToolbar();
    this._buildImageHandler();

    registerDefaultActions(this._toolbar);

    // Initial render
    this._updatePreview(this._state.value);
  }

  // ============================================================
  // Public API
  // ============================================================

  /** @returns {string} */
  getMarkdown() { return this._state.value; }

  /**
   * Replace the entire document.
   * @param {string} markdown
   * @param {object} [opts]
   * @param {boolean} [opts.undoable=true]
   */
  setMarkdown(markdown, opts = {}) {
    const undoable = opts.undoable !== false;
    this._state.setValue(markdown, { undoable });
    this._codePanel.setValue(markdown, undoable);
    this._updatePreview(markdown);
  }

  /** @returns {object[]} Full markdown-it token array */
  getTokens() { return this._parser.render(this._state.value).tokens; }

  /** @returns {string} Current sanitised preview HTML */
  getPreview() { return this._previewPanel.getHTML(); }

  /** @returns {{ from:number, to:number, text:string, lineFrom:number, lineTo:number }} */
  getSelection() { return this._codePanel.getSelection(); }

  setSelection(from, to) { this._codePanel.setSelection(from, to); }

  /**
   * Insert text at cursor (or at explicit character offset).
   * @param {string} text
   * @param {number|null} [position]
   */
  insertText(text, position = null) { this._codePanel.insertText(text, position); }

  /** @param {string} text */
  replaceSelection(text) { this._codePanel.replaceSelection(text); }

  undo() { this._codePanel.undo(); }
  redo() { this._codePanel.redo(); }
  focus() { this._codePanel.focus(); }

  /**
   * @param {'split'|'code'|'preview'|'wysiwyg'} mode
   */
  setMode(mode) { this._mode = mode; this._applyMode(); }

  /** @returns {'split'|'code'|'preview'|'wysiwyg'} */
  getMode() { return this._mode; }

  /**
   * Register a custom toolbar action.
   * @param {object} def  See Toolbar.registerAction for schema.
   */
  registerAction(def) { this._toolbar.registerAction(def); }

  /** @param {string} id */
  unregisterAction(id) { this._toolbar.unregisterAction(id); }

  /**
   * Execute a registered action programmatically.
   * @param {string} id
   * @param {object} [args]
   */
  runCommand(id, args) {
    this._opts.onCommand?.(id, args);
    return this._toolbar.runAction(id, args);
  }

  /**
   * Open draw.io editor and upsert a ` ```drawio ` fenced block.
   *
   * @param {object} [opts]
   * @param {string} [opts.xml]   Initial XML (if omitted, uses block at cursor if present)
   * @param {number} [opts.line]  0-based source line to replace drawio block in place
   * @returns {Promise<boolean>} true when applied, false when canceled
   */
  async openDrawioEditor(opts = {}) {
    const line = Number.isInteger(opts.line) ? opts.line : this.getSelection().lineFrom;
    const lines = this.getMarkdown().split('\n');
    const block = this._findDrawioBlockAtLine(lines, line);
    const currentXml = typeof opts.xml === 'string'
      ? opts.xml
      : (block ? lines.slice(block.start + 1, block.end).join('\n') : '');

    const resultXml = await this._drawioModal.open(currentXml);
    if (!resultXml) return false;

    this._upsertDrawioBlock(resultXml, block);
    return true;
  }

  /**
   * Chatbot integration.
   * Shows diff modal and applies on confirmation.
   *
   * @param {string} newMarkdown
   * @returns {Promise<boolean>} true => applied, false => rejected
   */
  async proposeChange(newMarkdown) {
    const current = this.getMarkdown();
    const accepted = await this._diffModal.open(current, newMarkdown);
    if (accepted) {
      this.setMarkdown(newMarkdown);
      return true;
    }
    return false;
  }

  /** Detach editor and clean up resources. */
  destroy() {
    clearTimeout(this._previewDebounce);
    this._codePanel.destroy();
    this._previewPanel.destroy();
    this._imageHandler?.destroy();
    this._imageResize?.destroy();
    this._diffModal.destroy();
    this._drawioModal.destroy();
    this._bus.destroy();
    this._cleanupDivider?.();
    this._previewPanelEl?.removeEventListener('click', this._boundPreviewAction);

    this._root.innerHTML = '';
    ['mde-editor', 'mde-mode-split', 'mde-mode-code', 'mde-mode-preview', 'mde-mode-wysiwyg']
      .forEach(c => this._root.classList.remove(c));
  }

  // ============================================================
  // Private — setup
  // ============================================================

  _injectStyles() {
    if (document.getElementById(STYLE_TAG_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_TAG_ID;
    style.textContent = EDITOR_STYLES;
    document.head.appendChild(style);
  }

  _buildDOM() {
    this._root.classList.add('mde-editor');
    if (this._opts.theme && this._opts.theme !== 'auto') {
      this._root.setAttribute('data-theme', this._opts.theme);
    }

    this._root.innerHTML = `
      <div class="mde-layout">
        <div class="mde-toolbar-container"></div>
        <div class="mde-wysiwyg-beta">WYSIWYG beta: visual mode is preview-first in this build.</div>
        <div class="mde-panels">
          <div class="mde-panel mde-panel--code"></div>
          <div class="mde-divider" title="Drag to resize panels"></div>
          <div class="mde-panel mde-panel--preview"></div>
        </div>
      </div>
    `;

    this._toolbarContainer = this._root.querySelector('.mde-toolbar-container');
    this._codePanelEl = this._root.querySelector('.mde-panel--code');
    this._previewPanelEl = this._root.querySelector('.mde-panel--preview');

    this._applyMode();
    this._setupDividerResize();
  }

  _buildCodePanel() {
    this._codePanel = new CodePanel(this._codePanelEl, {
      value: this._state.value,

      onChange: (value) => {
        this._state.setValue(value);
        this._schedulePreviewUpdate(value);
        this._bus.emit('change', value);
        if (this._opts.onChange) {
          const { tokens, html } = this._parser.render(value);
          this._opts.onChange(value, tokens, html);
        }
      },

      onCursorMove: (line) => {
        this._sync.codeLineToPreview(line, this._previewPanelEl);
        this._toolbar.updateState();
      },

      onSelectionChange: (selInfo) => {
        this._toolbar.updateState();
        this._opts.onSelectionChange?.(selInfo);
      },
    });

    if (this._opts.onPaste) {
      this._codePanelEl.addEventListener('paste', this._opts.onPaste);
    }
  }

  _buildPreviewPanel() {
    this._previewPanel = new PreviewPanel(this._previewPanelEl, {
      onElementClick: ({ line, lineEnd, element }) => {
        this._codePanel.scrollToLine(line);
        this._bus.emit('previewClick', { line, lineEnd, element });
        this._opts.onPreviewClick?.(element, { from: line, to: lineEnd });
      },
    });

    this._imageResize = new ImageResize(
      this._previewPanelEl,
      () => this._buildPublicAPI(),
    );

    this._boundPreviewAction = async (event) => {
      const editBtn = event.target.closest('[data-mde-drawio-edit]');
      if (!editBtn) return;

      event.preventDefault();
      event.stopPropagation();

      const host = editBtn.closest('.mde-drawio');
      const xml = decodeURIComponent(host?.getAttribute('data-drawio') ?? '');
      const line = parseInt(host?.getAttribute('data-source-line') ?? '-1', 10);

      await this.openDrawioEditor({ xml, line: Number.isNaN(line) ? undefined : line });
    };

    this._previewPanelEl.addEventListener('click', this._boundPreviewAction);
  }

  _buildToolbar() {
    this._toolbar = new Toolbar(
      this._toolbarContainer,
      () => this._buildPublicAPI(),
    );
  }

  _buildImageHandler() {
    const uploadCallbacks = {
      onUploadStart: this._opts.onUploadStart,
      onUploadDone: this._opts.onUploadDone,
      onUploadError: this._opts.onUploadError,
    };

    this._imageHandler = new ImageUploadHandler(
      this._root,
      () => this._buildPublicAPI(),
      this._opts.upload ?? {},
      uploadCallbacks,
    );

    this._toolbar.registerAction(createImageUploadAction(this._imageHandler));
  }

  // ============================================================
  // Private — rendering
  // ============================================================

  _schedulePreviewUpdate(value) {
    clearTimeout(this._previewDebounce);
    this._previewDebounce = setTimeout(() => this._updatePreview(value), 150);
  }

  _updatePreview(markdown) {
    const { html } = this._parser.render(markdown);
    this._previewPanel.render(html);
    this._renderMath();
    this._renderMermaid();
    this._imageResize?.attachHandlers();
  }

  _renderMath() {
    this._previewPanelEl.querySelectorAll('.mde-math-inline').forEach(el => {
      const tex = decodeURIComponent(el.getAttribute('data-tex') ?? '');
      try {
        el.innerHTML = katex.renderToString(tex, { throwOnError: false, displayMode: false });
      } catch {
        el.textContent = tex;
      }
    });

    this._previewPanelEl.querySelectorAll('.mde-math-block').forEach(el => {
      const tex = decodeURIComponent(el.getAttribute('data-tex') ?? '');
      try {
        el.innerHTML = katex.renderToString(tex, { throwOnError: false, displayMode: true });
      } catch {
        el.textContent = tex;
      }
    });
  }

  _renderMermaid() {
    const mermaid = window.mermaid;
    if (!mermaid) return;

    this._previewPanelEl
      .querySelectorAll('.mde-mermaid:not(.mde-mermaid--rendered)')
      .forEach(async (el, idx) => {
        const code = decodeURIComponent(el.getAttribute('data-code') ?? '');
        try {
          const id = `mde-mermaid-${Date.now()}-${idx}`;
          const { svg } = await mermaid.render(id, code);
          el.innerHTML = svg;
          el.classList.add('mde-mermaid--rendered');
        } catch (e) {
          console.warn('[EditorCore] mermaid render error:', e);
        }
      });
  }

  // ============================================================
  // Private — draw.io markdown update
  // ============================================================

  _upsertDrawioBlock(xml, existingBlock) {
    const fenced = ['```drawio', xml.trim(), '```'].join('\n');

    if (existingBlock) {
      const lines = this.getMarkdown().split('\n');
      const newLines = [
        ...lines.slice(0, existingBlock.start),
        ...fenced.split('\n'),
        ...lines.slice(existingBlock.end + 1),
      ];
      this.setMarkdown(newLines.join('\n'));
      this._codePanel.scrollToLine(existingBlock.start);
      return;
    }

    this.insertText(`\n${fenced}\n`);
  }

  _findDrawioBlockAtLine(lines, line0) {
    for (let i = 0; i < lines.length; i++) {
      if (!/^```drawio\b/.test(lines[i].trim())) continue;

      let j = i + 1;
      while (j < lines.length && lines[j].trim() !== '```') j++;
      if (j >= lines.length) break;

      if (line0 >= i && line0 <= j) {
        return { start: i, end: j };
      }
      i = j;
    }
    return null;
  }

  // ============================================================
  // Private — layout
  // ============================================================

  _applyMode() {
    ['split', 'code', 'preview', 'wysiwyg'].forEach(m =>
      this._root.classList.remove(`mde-mode-${m}`),
    );
    this._root.classList.add(`mde-mode-${this._mode}`);
  }

  _setupDividerResize() {
    const divider = this._root.querySelector('.mde-divider');
    if (!divider) return;

    const panels = this._root.querySelector('.mde-panels');
    let dragging = false;
    let startX = 0;
    let startWidth = 0;

    divider.addEventListener('mousedown', (e) => {
      dragging = true;
      startX = e.clientX;
      startWidth = this._codePanelEl.getBoundingClientRect().width;
      divider.classList.add('mde-divider--dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    const onMove = (e) => {
      if (!dragging) return;
      const total = panels.getBoundingClientRect().width;
      const pct = Math.max(20, Math.min(80, ((startWidth + e.clientX - startX) / total) * 100));
      this._codePanelEl.style.flex = `0 0 ${pct}%`;
      this._previewPanelEl.style.flex = `0 0 ${100 - pct}%`;
    };

    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      divider.classList.remove('mde-divider--dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);

    this._cleanupDivider = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }

  // ============================================================
  // Private — API object for plugins
  // ============================================================

  _buildPublicAPI() {
    return {
      getMarkdown: () => this.getMarkdown(),
      setMarkdown: (md, opts) => this.setMarkdown(md, opts),
      getTokens: () => this.getTokens(),
      getPreview: () => this.getPreview(),
      getSelection: () => this.getSelection(),
      setSelection: (f, t) => this.setSelection(f, t),
      insertText: (text, pos) => this.insertText(text, pos),
      replaceSelection: (text) => this.replaceSelection(text),
      runCommand: (id, args) => this.runCommand(id, args),
      openDrawioEditor: (opts) => this.openDrawioEditor(opts),
      focus: () => this.focus(),
    };
  }
}
