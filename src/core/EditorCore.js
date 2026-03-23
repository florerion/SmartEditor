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

const STYLE_TAG_ID = 'se-global-styles';

/**
 * Main orchestrator.
 *
 * Stage 3 additions:
 *  - `proposeChange` now opens accept/reject diff modal.
 *  - draw.io modal editor and preview click-to-edit flow.
 *  - `wysiwyg` mode is a beta view preset (preview-first layout).
 */
export class EditorCore {
  /**
   * @param {HTMLElement} element  Root container — must have an explicit height
   * @param {object}      [opts]
   * @param {string}      [opts.value='']
   * @param {string}      [opts.mode='split']       'split' | 'code' | 'preview' | 'wysiwyg'
  * @param {boolean}     [opts.scrollSync=true]    Keep code/preview vertical scroll synchronized in split mode
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
  * @param {string}      [opts.drawio.url]         Embed URL. Defaults to `./drawio/?embed=1&proto=json&spin=1&ui=min&libraries=1`
   *                                                (the self-hosted copy bundled in dist/drawio/).
  *                                                Pass `https://embed.diagrams.net/?embed=1&proto=json&spin=1&ui=min&libraries=1`
   *                                                to use the public hosted version instead.
  * @param {object}      [opts.toolbar]            Declarative toolbar config with explicit groups/items/dropdowns
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
    this._scrollSyncEnabled = opts.scrollSync !== false;
    this._scrollSyncSource = null;
    this._scrollSyncReleaseTimer = null;
    this._scrollSyncSuppressed = false;
    this._scrollSyncDebounceTimer = null;
    this._codeScrollRaf = null;
    this._previewScrollRaf = null;
    this._selectedPreviewImageEl = null;

    this._diffModal = new DiffModal();
    this._drawioModal = new DrawioModal({ url: opts.drawio?.url });

    this._injectStyles();
    this._buildDOM();
    this._buildCodePanel();
    this._buildPreviewPanel();
    this._buildToolbar();
    this._buildImageHandler();

    registerDefaultActions(this._toolbar);
    this.setToolbarConfig(opts.toolbar ?? null);

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

  /** @returns {object|null} */
  getToolbarConfig() { return this._toolbar.getConfig(); }

  /** @param {object|null} config */
  setToolbarConfig(config) {
    this._opts.toolbar = config ?? undefined;
    this._toolbar.setConfig(config ?? null);
  }

  /**
   * Update toolbar config with a mutator callback.
   *
   * @param {(config: object) => (object|void)} mutator
   * @returns {object} Applied toolbar config
   *
   * @example
   * editor.updateToolbarConfig((config) => {
   *   config.groups.push({ id: 'custom', order: 500, items: [] });
   * });
   *
   * @throws {Error} If `mutator` is not a function
   */
  updateToolbarConfig(mutator) {
    if (typeof mutator !== 'function') {
      throw new Error('[EditorCore] updateToolbarConfig requires a function mutator.');
    }

    const base = this.getToolbarConfig() ?? { groups: [] };
    const draft = _deepCloneToolbarConfig(base);
    const result = mutator(draft);
    const next = result && typeof result === 'object' ? result : draft;

    this.setToolbarConfig(next);
    return this.getToolbarConfig() ?? next;
  }

  /**
   * Insert or replace a toolbar group by id.
   *
   * @param {object} group
   * @param {string} group.id
   * @param {number} [group.order]
   * @param {Array} [group.items]
   * @returns {object} Applied toolbar config
   * @throws {Error} If group id is missing
   */
  upsertToolbarGroup(group) {
    if (!group || typeof group.id !== 'string' || !group.id.trim()) {
      throw new Error('[EditorCore] upsertToolbarGroup requires a non-empty group.id.');
    }

    return this.updateToolbarConfig((config) => {
      const groups = this._ensureToolbarGroupsArray(config);
      const idx = groups.findIndex((entry) => entry?.id === group.id);
      if (idx === -1) {
        groups.push({
          id: group.id,
          order: Number.isFinite(group.order) ? group.order : groups.length * 100,
          items: Array.isArray(group.items) ? [...group.items] : [],
        });
        return config;
      }

      const prev = groups[idx] ?? {};
      groups[idx] = {
        ...prev,
        ...group,
        id: group.id,
        items: Array.isArray(group.items) ? [...group.items] : (Array.isArray(prev.items) ? prev.items : []),
      };

      return config;
    });
  }

  /**
   * Remove a toolbar group by id.
   * @param {string} groupId
   * @returns {object} Applied toolbar config
   */
  removeToolbarGroup(groupId) {
    return this.updateToolbarConfig((config) => {
      const groups = this._ensureToolbarGroupsArray(config);
      config.groups = groups.filter((group) => group?.id !== groupId);
      return config;
    });
  }

  /**
   * Insert or replace an item in a toolbar group.
   *
   * @param {string} groupId
   * @param {object|string} item
   * @param {object} [position]
   * @param {string} [position.beforeId]
   * @param {string} [position.afterId]
   * @returns {object} Applied toolbar config
   */
  upsertToolbarItem(groupId, item, position = {}) {
    return this.updateToolbarConfig((config) => {
      const groups = this._ensureToolbarGroupsArray(config);
      const group = this._ensureToolbarGroup(groups, groupId);
      const items = Array.isArray(group.items) ? [...group.items] : [];

      const itemId = _getToolbarItemId(item);
      if (itemId) {
        const existingIdx = items.findIndex((entry) => _getToolbarItemId(entry) === itemId);
        if (existingIdx !== -1) items.splice(existingIdx, 1);
      }

      const insertIndex = _resolveInsertIndex(items, position.beforeId, position.afterId);
      items.splice(insertIndex, 0, item);
      group.items = items;

      return config;
    });
  }

  /**
   * Remove an item from a toolbar group.
   * @param {string} groupId
   * @param {string} itemId
   * @returns {object} Applied toolbar config
   */
  removeToolbarItem(groupId, itemId) {
    return this.updateToolbarConfig((config) => {
      const groups = this._ensureToolbarGroupsArray(config);
      const group = groups.find((entry) => entry?.id === groupId);
      if (!group || !Array.isArray(group.items)) return config;
      group.items = group.items.filter((entry) => _getToolbarItemId(entry) !== itemId);
      return config;
    });
  }

  /**
   * Insert or replace an item inside a dropdown.
   *
   * @param {string} groupId
   * @param {string} dropdownId
   * @param {object|string} item
   * @param {object} [position]
   * @param {string} [position.beforeId]
   * @param {string} [position.afterId]
   * @returns {object} Applied toolbar config
   */
  upsertDropdownItem(groupId, dropdownId, item, position = {}) {
    return this.updateToolbarConfig((config) => {
      const groups = this._ensureToolbarGroupsArray(config);
      const group = this._ensureToolbarGroup(groups, groupId);
      if (!Array.isArray(group.items)) group.items = [];

      const dropdown = group.items.find((entry) => _getToolbarItemId(entry) === dropdownId);
      if (!dropdown || !Array.isArray(dropdown.items)) {
        throw new Error(`[EditorCore] Dropdown "${dropdownId}" not found in group "${groupId}".`);
      }

      const dropdownItems = [...dropdown.items];
      const itemId = _getToolbarItemId(item);
      if (itemId) {
        const existingIdx = dropdownItems.findIndex((entry) => _getToolbarItemId(entry) === itemId);
        if (existingIdx !== -1) dropdownItems.splice(existingIdx, 1);
      }

      const insertIndex = _resolveInsertIndex(dropdownItems, position.beforeId, position.afterId);
      dropdownItems.splice(insertIndex, 0, item);
      dropdown.items = dropdownItems;

      return config;
    });
  }

  /**
   * Remove an item from a dropdown.
   * @param {string} groupId
   * @param {string} dropdownId
   * @param {string} itemId
   * @returns {object} Applied toolbar config
   */
  removeDropdownItem(groupId, dropdownId, itemId) {
    return this.updateToolbarConfig((config) => {
      const groups = this._ensureToolbarGroupsArray(config);
      const group = groups.find((entry) => entry?.id === groupId);
      if (!group || !Array.isArray(group.items)) return config;

      const dropdown = group.items.find((entry) => _getToolbarItemId(entry) === dropdownId);
      if (!dropdown || !Array.isArray(dropdown.items)) return config;

      dropdown.items = dropdown.items.filter((entry) => _getToolbarItemId(entry) !== itemId);
      return config;
    });
  }

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
   * Open draw.io editor and upsert a `![draw.io](image){xml}` line.
   *
   * @param {object} [opts]
   * @param {string} [opts.xml]   Initial XML (if omitted, uses block at cursor if present)
   * @param {number} [opts.line]  0-based source line to replace drawio block in place
   * @param {boolean} [opts.forceNew=false]  When true, always start with a blank diagram and insert a new block
   * @returns {Promise<boolean>} true when applied, false when canceled
   */
  async openDrawioEditor(opts = {}) {
    const line = Number.isInteger(opts.line) ? opts.line : this.getSelection().lineFrom;
    const forceNew = opts.forceNew === true;
    const lines = this.getMarkdown().split('\n');
    const block = forceNew ? null : this._findDrawioBlockAtLine(lines, line);
    const currentXml = typeof opts.xml === 'string'
      ? opts.xml
      : (forceNew ? '' : this._extractDrawioXml(block));

    const result = await this._drawioModal.open(currentXml);
    if (!result) return false;

    const resultXml = typeof result === 'string' ? result : result.xml;
    const resultImage = typeof result === 'string' ? '' : result.imageSrc;
    await this._upsertDrawioBlock(resultXml, resultImage, block);
    return true;
  }

  /**
   * Chatbot integration.
   * Shows diff modal and applies on confirmation.
   *
   * @param {string} newMarkdown
   * @param {object} [opts]
   * @param {'replace-all'|'replace-selection'|'insert-at-cursor'} [opts.mode='replace-all']
   * @returns {Promise<boolean>} true => applied, false => rejected
   *
   * @example
   * await editor.proposeChange('## Updated content', { mode: 'replace-selection' });
   *
   * @throws {Error} If `opts.mode` is not supported
   */
  async proposeChange(newMarkdown, opts = {}) {
    const current = this.getMarkdown();
    const selection = this.getSelection();
    const requestedMode = opts.mode ?? 'replace-all';
    const mode = requestedMode === 'replace-selection' && selection.from === selection.to
      ? 'insert-at-cursor'
      : requestedMode;

    if (!['replace-all', 'replace-selection', 'insert-at-cursor'].includes(mode)) {
      throw new Error(`[EditorCore] Unsupported proposeChange mode: ${mode}`);
    }

    const candidate = this._buildProposedDocument(current, newMarkdown, mode, selection);
    const accepted = await this._diffModal.open(current, candidate.nextDocument, {
      title: `Proposed Change (${mode})`,
      oldLabel: 'Current Document',
      newLabel: 'Proposed Document',
      oldHighlight: candidate.oldHighlight,
      newHighlight: candidate.newHighlight,
    });

    if (accepted) {
      if (mode === 'replace-all') {
        this.setMarkdown(newMarkdown);
      } else if (mode === 'replace-selection') {
        this.setSelection(selection.from, selection.to);
        this.replaceSelection(newMarkdown);
      } else {
        this.insertText(newMarkdown, selection.to);
      }
      return true;
    }
    return false;
  }

  _buildProposedDocument(current, nextChunk, mode, selection) {
    if (mode === 'replace-all') {
      return {
        nextDocument: nextChunk,
        oldHighlight: { from: 0, to: current.length },
        newHighlight: { from: 0, to: nextChunk.length },
      };
    }

    if (mode === 'replace-selection') {
      const nextDocument = `${current.slice(0, selection.from)}${nextChunk}${current.slice(selection.to)}`;
      return {
        nextDocument,
        oldHighlight: { from: selection.from, to: selection.to },
        newHighlight: { from: selection.from, to: selection.from + nextChunk.length },
      };
    }

    const insertAt = selection.to;
    const nextDocument = `${current.slice(0, insertAt)}${nextChunk}${current.slice(insertAt)}`;
    return {
      nextDocument,
      oldHighlight: { from: insertAt, to: insertAt, cursor: true },
      newHighlight: { from: insertAt, to: insertAt + nextChunk.length },
    };
  }

  /** Detach editor and clean up resources. */
  destroy() {
    clearTimeout(this._previewDebounce);
    clearTimeout(this._scrollSyncReleaseTimer);
    clearTimeout(this._scrollSyncDebounceTimer);
    cancelAnimationFrame(this._codeScrollRaf);
    cancelAnimationFrame(this._previewScrollRaf);
    this._codePanel.destroy();
    this._previewPanel.destroy();
    this._toolbar?.destroy();
    this._imageHandler?.destroy();
    this._imageResize?.destroy();
    this._diffModal.destroy();
    this._drawioModal.destroy();
    this._bus.destroy();
    this._cleanupDivider?.();
    this._previewPanelEl?.removeEventListener('click', this._boundPreviewAction);
    document.removeEventListener('keydown', this._boundPreviewDeleteKey, true);

    this._root.innerHTML = '';
    ['se-editor', 'se-mode-split', 'se-mode-code', 'se-mode-preview', 'se-mode-wysiwyg']
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
    this._root.classList.add('se-editor');
    if (this._opts.theme && this._opts.theme !== 'auto') {
      this._root.setAttribute('data-theme', this._opts.theme);
    }

    this._root.innerHTML = `
      <div class="se-layout">
        <div class="se-toolbar-container"></div>
        <div class="se-wysiwyg-beta">WYSIWYG beta: visual mode is preview-first in this build.</div>
        <div class="se-panels">
          <div class="se-panel se-panel--code"></div>
          <div class="se-divider" title="Drag to resize panels"></div>
          <div class="se-panel se-panel--preview"></div>
        </div>
      </div>
    `;

    this._toolbarContainer = this._root.querySelector('.se-toolbar-container');
    this._codePanelEl = this._root.querySelector('.se-panel--code');
    this._previewPanelEl = this._root.querySelector('.se-panel--preview');

    this._applyMode();
    this._setupDividerResize();
  }

  _buildCodePanel() {
    this._codePanel = new CodePanel(this._codePanelEl, {
      value: this._state.value,

      onChange: (value) => {
        this._state.setValue(value);
        this._schedulePreviewUpdate(value);
        this._suppressScrollSyncTemporarily();
        this._bus.emit('change', value);
        if (this._opts.onChange) {
          const { tokens, html } = this._parser.render(value);
          this._opts.onChange(value, tokens, html);
        }
      },

      onCursorMove: (line) => {
        if (
          this._mode === 'split'
          && !this._scrollSyncSuppressed
          && this._scrollSyncSource !== 'preview'
        ) {
          this._markScrollSyncSource('code');
          const viewportRatio = this._codePanel.getCursorViewportRatio();
          this._sync.codeLineToPreview(line, this._previewPanelEl, {
            behavior: 'smooth',
            targetViewportRatio: viewportRatio,
          });
        }
        this._toolbar.updateState();
      },

      onSelectionChange: (selInfo) => {
        this._toolbar.updateState();
        this._opts.onSelectionChange?.(selInfo);
      },

      onScroll: (topLine) => {
        this._handleCodePanelScroll(topLine);
      },
    });

    if (this._opts.onPaste) {
      this._codePanelEl.addEventListener('paste', this._opts.onPaste);
    }
  }

  _buildPreviewPanel() {
    this._previewPanel = new PreviewPanel(this._previewPanelEl, {
      onElementClick: ({ line, lineEnd, element, viewportRatio }) => {
        this._sync.highlightPreviewElement(element, this._previewPanelEl);
        this._markScrollSyncSource('preview');
        this._codePanel.scrollToLineAtRatio(line, viewportRatio, { behavior: 'smooth' });
        this._bus.emit('previewClick', { line, lineEnd, element });
        this._opts.onPreviewClick?.(element, { from: line, to: lineEnd });
      },
      onScroll: () => {
        this._handlePreviewPanelScroll();
      },
    });

    this._imageResize = new ImageResize(
      this._previewPanelEl,
      () => this._buildPublicAPI(),
    );

    this._boundPreviewAction = async (event) => {
      this._setSelectedPreviewImage(event.target.closest('img.se-image, img.se-drawio'));

      const trigger = event.target.closest('[data-se-drawio-open]');
      if (!trigger) return;

      event.preventDefault();
      event.stopPropagation();

      const xml = this._decodeDrawioPayload(trigger.getAttribute('data-drawio') ?? '');
      const line = parseInt(trigger.getAttribute('data-source-line') ?? '-1', 10);

      await this.openDrawioEditor({ xml, line: Number.isNaN(line) ? undefined : line });
    };

    this._boundPreviewDeleteKey = (event) => {
      if (!this._selectedPreviewImageEl) return;
      if (event.key !== 'Delete' && event.key !== 'Backspace') return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const deleted = this._deleteSelectedPreviewImageMarkdown();
      if (!deleted) return;

      event.preventDefault();
      event.stopPropagation();
      this._setSelectedPreviewImage(null);
    };

    this._previewPanelEl.addEventListener('click', this._boundPreviewAction);
    document.addEventListener('keydown', this._boundPreviewDeleteKey, true);
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
    this._setSelectedPreviewImage(null);
    this._previewPanel.render(html);
    this._renderMath();
    this._renderMermaid();
    this._imageResize?.attachHandlers();
  }

  _renderMath() {
    this._previewPanelEl.querySelectorAll('.se-math-inline').forEach(el => {
      const tex = decodeURIComponent(el.getAttribute('data-tex') ?? '');
      try {
        el.innerHTML = katex.renderToString(tex, { throwOnError: false, displayMode: false });
      } catch {
        el.textContent = tex;
      }
    });

    this._previewPanelEl.querySelectorAll('.se-math-block').forEach(el => {
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
      .querySelectorAll('.se-mermaid:not(.se-mermaid--rendered)')
      .forEach(async (el, idx) => {
        const code = decodeURIComponent(el.getAttribute('data-code') ?? '');
        try {
          const id = `se-mermaid-${Date.now()}-${idx}`;
          const { svg } = await mermaid.render(id, code);
          el.innerHTML = svg;
          el.classList.add('se-mermaid--rendered');
        } catch (e) {
          console.warn('[EditorCore] mermaid render error:', e);
        }
      });
  }

  // ============================================================
  // Private — draw.io markdown update
  // ============================================================

  async _upsertDrawioBlock(xml, imageSrc, existingBlock) {
    const normalizedXml = xml.trim();
    const safeImageSrc = imageSrc || existingBlock?.src || _defaultDrawioImage();
    const lineValue = this._buildDrawioMarkdownLine(safeImageSrc, normalizedXml);

    if (existingBlock) {
      const lines = this.getMarkdown().split('\n');
      const newLines = [...lines];
      newLines.splice(existingBlock.start, existingBlock.end - existingBlock.start + 1, lineValue);
      this.setMarkdown(newLines.join('\n'));
      this._codePanel.scrollToLine(existingBlock.start);
      return;
    }

    this.insertText(`\n${lineValue}\n`);
  }

  _findDrawioBlockAtLine(lines, line0) {
    for (let i = 0; i < lines.length; i++) {
      const parsed = this._parseDrawioImageLine(lines[i]);
      if (parsed && line0 === i) {
        return { start: i, end: i, payload: parsed.payload, src: parsed.src };
      }
    }
    return null;
  }

  _extractDrawioXml(block) {
    if (!block) return '';
    return this._decodeDrawioPayload(block.payload);
  }

  _buildDrawioMarkdownLine(imageSrc, xml) {
    return `![draw.io](${imageSrc}){${encodeURIComponent(xml)}}`;
  }

  _parseDrawioImageLine(line) {
    const match = line.trim().match(/^!\[draw\.io\]\((.*)\)\{([\s\S]*)\}$/);
    if (!match) return null;
    const src = match[1].trim();
    const payload = match[2].trim();
    if (!src || !payload) return null;
    return { src, payload };
  }

  _decodeDrawioPayload(payload) {
    try {
      return decodeURIComponent(payload);
    } catch {
      return payload;
    }
  }

  // ============================================================
  // Private — layout
  // ============================================================

  _applyMode() {
    ['split', 'code', 'preview', 'wysiwyg'].forEach(m =>
      this._root.classList.remove(`se-mode-${m}`),
    );
    this._root.classList.add(`se-mode-${this._mode}`);
    if (!this._isScrollSyncActive()) {
      this._scrollSyncSource = null;
    }
  }

  _isScrollSyncActive() {
    return this._scrollSyncEnabled && this._mode === 'split' && !this._scrollSyncSuppressed;
  }

  // Temporarily suppress scroll sync during active editing (debounce: 300ms after last change).
  _suppressScrollSyncTemporarily() {
    this._scrollSyncSuppressed = true;
    clearTimeout(this._scrollSyncDebounceTimer);
    this._scrollSyncDebounceTimer = setTimeout(() => {
      this._scrollSyncSuppressed = false;
    }, 300);
  }

  // Begin programmatic scroll lock and refresh its trailing timeout.
  _markScrollSyncSource(source) {
    this._scrollSyncSource = source;
    this._extendScrollLock();
  }

  // Extend (or start) the trailing-debounce lock: releases 150 ms after the
  // last echo scroll event, so it covers the full smooth-scroll animation.
  _extendScrollLock() {
    clearTimeout(this._scrollSyncReleaseTimer);
    this._scrollSyncReleaseTimer = setTimeout(() => {
      this._scrollSyncSource = null;
    }, 150);
  }

  _handleCodePanelScroll(topLine) {
    if (!this._isScrollSyncActive()) return;
    if (this._scrollSyncSource === 'preview') {
      // Echo from a preview-driven smooth scroll — keep the lock alive.
      this._extendScrollLock();
      return;
    }

    cancelAnimationFrame(this._codeScrollRaf);
    this._codeScrollRaf = requestAnimationFrame(() => {
      if (!this._isScrollSyncActive()) return;
      if (!Number.isFinite(topLine)) return;
      this._markScrollSyncSource('code');
      this._sync.scrollPreviewToLine(topLine, this._previewPanelEl, {
        behavior: 'smooth',
        targetViewportRatio: 0,
      });
    });
  }

  _handlePreviewPanelScroll() {
    if (!this._isScrollSyncActive()) return;
    if (this._scrollSyncSource === 'code') {
      // Echo from a code-driven smooth scroll — keep the lock alive.
      this._extendScrollLock();
      return;
    }

    cancelAnimationFrame(this._previewScrollRaf);
    this._previewScrollRaf = requestAnimationFrame(() => {
      if (!this._isScrollSyncActive()) return;
      const line = this._sync.getTopPreviewLine(this._previewPanelEl);
      if (!Number.isFinite(line)) return;
      this._markScrollSyncSource('preview');
      this._codePanel.scrollViewportToLine(line, { behavior: 'smooth' });
    });
  }

  _setupDividerResize() {
    const divider = this._root.querySelector('.se-divider');
    if (!divider) return;

    const panels = this._root.querySelector('.se-panels');
    let dragging = false;
    let startX = 0;
    let startWidth = 0;

    divider.addEventListener('mousedown', (e) => {
      dragging = true;
      startX = e.clientX;
      startWidth = this._codePanelEl.getBoundingClientRect().width;
      divider.classList.add('se-divider--dragging');
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
      divider.classList.remove('se-divider--dragging');
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
      registerAction: (def) => this.registerAction(def),
      unregisterAction: (id) => this.unregisterAction(id),
      getToolbarConfig: () => this.getToolbarConfig(),
      setToolbarConfig: (config) => this.setToolbarConfig(config),
      updateToolbarConfig: (mutator) => this.updateToolbarConfig(mutator),
      upsertToolbarGroup: (group) => this.upsertToolbarGroup(group),
      removeToolbarGroup: (groupId) => this.removeToolbarGroup(groupId),
      upsertToolbarItem: (groupId, item, position) => this.upsertToolbarItem(groupId, item, position),
      removeToolbarItem: (groupId, itemId) => this.removeToolbarItem(groupId, itemId),
      upsertDropdownItem: (groupId, dropdownId, item, position) => this.upsertDropdownItem(groupId, dropdownId, item, position),
      removeDropdownItem: (groupId, dropdownId, itemId) => this.removeDropdownItem(groupId, dropdownId, itemId),
      runCommand: (id, args) => this.runCommand(id, args),
      openDrawioEditor: (opts) => this.openDrawioEditor(opts),
      focus: () => this.focus(),
    };
  }

  _setSelectedPreviewImage(nextImage) {
    if (this._selectedPreviewImageEl === nextImage) return;
    this._selectedPreviewImageEl?.classList.remove('se-preview-image-selected');
    this._selectedPreviewImageEl = nextImage ?? null;
    this._selectedPreviewImageEl?.classList.add('se-preview-image-selected');
  }

  _deleteSelectedPreviewImageMarkdown() {
    const imageEl = this._selectedPreviewImageEl;
    if (!imageEl) return false;

    const sourceEl = imageEl.closest('[data-source-line]');
    const startLine = parseInt(sourceEl?.getAttribute('data-source-line') ?? '-1', 10);
    const endLineAttr = sourceEl?.getAttribute('data-source-line-end');
    const endLine = parseInt(endLineAttr ?? String(startLine), 10);
    if (!Number.isInteger(startLine) || !Number.isInteger(endLine) || startLine < 0 || endLine < startLine) {
      return false;
    }

    const markdown = this.getMarkdown();
    const lines = markdown.split('\n');
    if (!lines.length || startLine >= lines.length) return false;

    const clampedEnd = Math.min(endLine, lines.length - 1);
    const range = this._findImageTokenRangeInBlock(markdown, lines, startLine, clampedEnd, imageEl);
    if (!range) return false;

    this.setSelection(range.from, range.to);
    this.replaceSelection('');
    return true;
  }

  _findImageTokenRangeInBlock(markdown, lines, startLine, endLine, imageEl) {
    if (!Number.isInteger(startLine) || !Number.isInteger(endLine)) return null;
    if (startLine < 0 || endLine < startLine) return null;
    if (startLine >= lines.length || endLine >= lines.length) return null;

    const blockText = lines.slice(startLine, endLine + 1).join('\n');
    const src = imageEl.getAttribute('src') ?? '';
    if (!src) return null;

    const expectsDrawioSuffix = imageEl.classList.contains('se-drawio');
    const escapedSrc = _escapeRegExp(src);
    const tokenPattern = new RegExp(`!\\[[^\\]]*\\]\\(${escapedSrc}\\)(?:\\{[^}]*\\})?`, 'g');
    let match;

    while ((match = tokenPattern.exec(blockText)) !== null) {
      const token = match[0];
      const hasDrawioSuffix = /\{[^}]*\}$/.test(token);
      if (expectsDrawioSuffix && !hasDrawioSuffix) continue;

      const blockStart = this._getCharacterOffsetForLine(lines, startLine);
      let from = blockStart + match.index;
      let to = from + token.length;

      // Keep inline spacing natural after removing just one markdown image token.
      if (markdown[from - 1] === ' ' && markdown[to] === ' ') {
        to += 1;
      } else if (markdown[from - 1] === ' ' && (to >= markdown.length || markdown[to] === '\n')) {
        from -= 1;
      } else if (markdown[to] === ' ') {
        to += 1;
      }

      if (to < from) return null;
      return { from, to };
    }

    return null;
  }

  _getCharacterOffsetForLine(lines, lineIndex) {
    let offset = 0;
    for (let i = 0; i < lineIndex; i++) {
      offset += lines[i].length + 1;
    }
    return offset;
  }

  _ensureToolbarGroupsArray(config) {
    if (!config.groups) {
      config.groups = [];
      return config.groups;
    }

    if (Array.isArray(config.groups)) return config.groups;

    const groupsArray = Object.entries(config.groups).map(([key, group], index) => ({
      ...(group ?? {}),
      id: group?.id ?? key,
      order: Number.isFinite(group?.order) ? group.order : index * 100,
      items: Array.isArray(group?.items) ? [...group.items] : [],
    }));

    config.groups = groupsArray;
    return config.groups;
  }

  _ensureToolbarGroup(groups, groupId) {
    let group = groups.find((entry) => entry?.id === groupId);
    if (group) return group;

    group = {
      id: groupId,
      order: groups.length * 100,
      items: [],
    };
    groups.push(group);
    return group;
  }
}

function _deepCloneToolbarConfig(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => _deepCloneToolbarConfig(entry));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const out = {};
  Object.entries(value).forEach(([key, entry]) => {
    out[key] = _deepCloneToolbarConfig(entry);
  });
  return out;
}

function _getToolbarItemId(item) {
  if (typeof item === 'string') return item;
  if (!item || typeof item !== 'object') return null;
  return item.id ?? item.action ?? null;
}

function _resolveInsertIndex(items, beforeId, afterId) {
  if (beforeId) {
    const beforeIdx = items.findIndex((entry) => _getToolbarItemId(entry) === beforeId);
    if (beforeIdx !== -1) return beforeIdx;
  }

  if (afterId) {
    const afterIdx = items.findIndex((entry) => _getToolbarItemId(entry) === afterId);
    if (afterIdx !== -1) return afterIdx + 1;
  }

  return items.length;
}

function _escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function _defaultDrawioImage() {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="220" viewBox="0 0 640 220"><rect width="640" height="220" rx="16" fill="#eef6ff"/><rect x="24" y="24" width="592" height="172" rx="12" fill="#ffffff" stroke="#93c5fd"/><text x="320" y="118" text-anchor="middle" font-family="Arial" font-size="28" fill="#1d4ed8">draw.io diagram</text></svg>';
  const bytes = new TextEncoder().encode(svg);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}
