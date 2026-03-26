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
import { CompatibilityPanel } from '../ui/CompatibilityPanel.js';
import { LoadingOverlay } from '../ui/LoadingOverlay.js';
import { CompatibilityService } from './compat/CompatibilityService.js';
import { createEleventyCompatibilityProfile } from './compat/CompatibilityProfiles.js';
import { EDITOR_STYLES } from '../styles/editorStyles.js';
import { getEditorThemeList, isEditorTheme } from '../styles/themes.js';
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
  * @param {string}      [opts.theme='auto']       'auto' or one of the registered built-in theme ids
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
  * @param {object}      [opts.busy]
  * @param {number}      [opts.busy.showDelay=140] Delay before showing busy overlay (ms)
  * @param {number}      [opts.busy.minVisible=180] Minimum visible time once shown (ms)
  * @param {object}      [opts.busy.texts]
  * @param {string}      [opts.busy.texts.defaultLabel='Working...'] Default overlay label
  * @param {string}      [opts.busy.texts.cancel='Cancel'] Cancel button label
  * @param {object}      [opts.compatibility]
  * @param {boolean}     [opts.compatibility.enabled=false] Enable compatibility validation + fix proposals
  * @param {boolean}     [opts.compatibility.showPanel=false] Show compatibility status panel above panes
  * @param {number}      [opts.compatibility.debounce=500] Debounce for validation while typing
  * @param {boolean}     [opts.compatibility.showPreviewUsingProfile=false] Render preview using compatibility profile HTML
  * @param {object}      [opts.compatibility.markdownIt] markdown-it options for default Eleventy compatibility profile
  * @param {Array}       [opts.compatibility.plugins] markdown-it plugins for default Eleventy compatibility profile
  * @param {string[]}    [opts.compatibility.disableRules] markdown-it rules disabled in compatibility profile
  * @param {object}      [opts.compatibility.profile] Compatibility profile with render(markdown) method
  * @param {Array}       [opts.compatibility.rules] Validation/fix rule instances
   * @param {Function}    [opts.onChange]           (markdown, tokens, html) => void
   * @param {Function}    [opts.onSelectionChange]  (selInfo) => void
   * @param {Function}    [opts.onPaste]            (clipboardEvent) => void
   * @param {Function}    [opts.onUploadStart]      (file) => void
   * @param {Function}    [opts.onUploadDone]       (file, url) => void
   * @param {Function}    [opts.onUploadError]      (file, error) => void
   * @param {Function}    [opts.onPreviewClick]     (element, lineRange) => void
   * @param {Function}    [opts.onCommand]          (commandId, args) => void
  * @param {Function}    [opts.onCompatibilityReport]      (report) => void
  * @param {Function}    [opts.onCompatibilityStatusChange] (status, report) => void
  * @param {Function}    [opts.onCompatibilityFixApplied]   (detail) => void
  * @param {Function}    [opts.onBusyChange]                (busyState) => void
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
    this._compatibilityDebounce = null;
    this._mode = opts.mode ?? 'split';
    this._scrollSyncEnabled = opts.scrollSync !== false;
    this._scrollSyncSource = null;
    this._scrollSyncReleaseTimer = null;
    this._scrollSyncSuppressed = false;
    this._suspendCodeToPreviewSync = false;
    this._scrollSyncDebounceTimer = null;
    this._previewScrollUnlockTimer = null;
    this._codeScrollRaf = null;
    this._previewScrollRaf = null;
    this._pinPreviewScrollTop = null;
    this._pendingMermaidRenders = 0;
    this._pendingPreviewImageLoads = 0;
    this._previewRenderCycleId = 0;
    this._previewPinDeadline = 0;
    this._selectedPreviewImageEl = null;
    this._theme = 'auto';
    this._compatibilityEnabled = opts.compatibility?.enabled === true;
    this._compatibilityDebounceMs = Number.isFinite(opts.compatibility?.debounce)
      ? Math.max(0, opts.compatibility.debounce)
      : 500;
    this._compatibilityPreviewEnabled = opts.compatibility?.showPreviewUsingProfile === true;
    this._compatibilityStatus = 'disabled';
    this._compatibilityReport = _createDisabledCompatibilityReport();
    this._compatibilityShowPanel = opts.compatibility?.showPanel === true || this._compatibilityEnabled;
    this._compatibilityPanelBusy = false;
    this._busyConfig = _resolveBusyConfig(opts.busy);
    this._busyTexts = _resolveBusyTexts(opts.busy?.texts);
    this._busyTasks = new Map();
    this._busyTaskSeq = 0;
    this._busyState = _createIdleBusyState();

    const compatibilityProfile = opts.compatibility?.profile
      ?? createEleventyCompatibilityProfile({
        markdownIt: opts.compatibility?.markdownIt ?? opts.markdown?.options ?? {},
        plugins: opts.compatibility?.plugins ?? opts.markdown?.plugins ?? [],
        disableRules: opts.compatibility?.disableRules,
      });

    this._compatibilityService = new CompatibilityService({
      profile: compatibilityProfile,
      rules: opts.compatibility?.rules,
    });

    this._diffModal = new DiffModal();
    this._drawioModal = new DrawioModal({ url: opts.drawio?.url });

    this._injectStyles();
    this._buildDOM();
    this._buildCodePanel();
    this._buildPreviewPanel();
    this._buildToolbar();
    this._buildCompatibilityPanel();
    this._buildLoadingOverlay();
    this._buildImageHandler();

    registerDefaultActions(this._toolbar);
    this.setToolbarConfig(opts.toolbar ?? null);

    // Initial render
    this._updatePreview(this._state.value);
    if (this._compatibilityEnabled) {
      this.validateCompatibility({ force: true, emitStatusChange: false });
    }
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
    this._scheduleCompatibilityValidation();
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

  /** @returns {boolean} */
  isBusy() {
    return this._busyTasks.size > 0;
  }

  /** @returns {object} */
  getBusyState() {
    return { ...this._busyState };
  }

  /**
   * Begin a tracked busy task.
   *
   * @param {object} [opts]
   * @param {string} [opts.label='Working...']
   * @param {string} [opts.detail='']
   * @param {string} [opts.scope='global']
   * @param {boolean} [opts.lock=true]
   * @param {boolean} [opts.cancellable=true]
   * @returns {string} Busy token used by update/end/cancel methods.
   */
  beginBusyTask(opts = {}) {
    const token = `busy-${Date.now()}-${++this._busyTaskSeq}`;
    const canCancel = opts.cancellable !== false;

    this._busyTasks.set(token, {
      token,
      order: this._busyTaskSeq,
      label: _normalizeBusyLabel(opts.label, this._busyTexts.defaultLabel),
      detail: _normalizeBusyDetail(opts.detail),
      scope: typeof opts.scope === 'string' && opts.scope.trim() ? opts.scope.trim() : 'global',
      lock: opts.lock !== false,
      cancellable: canCancel,
      controller: canCancel ? new AbortController() : null,
    });

    this._recomputeBusyState();
    return token;
  }

  /**
   * Update message/details for a tracked busy task.
   * @param {string} token
   * @param {object} patch
   */
  updateBusyTask(token, patch = {}) {
    const task = this._busyTasks.get(token);
    if (!task) return;

    if (typeof patch.label === 'string' && patch.label.trim()) {
      task.label = patch.label.trim();
    }
    if (typeof patch.detail === 'string') {
      task.detail = patch.detail.trim();
    }

    this._recomputeBusyState();
  }

  /**
   * End a busy task.
   * @param {string} token
   */
  endBusyTask(token) {
    if (!this._busyTasks.has(token)) return;
    this._busyTasks.delete(token);
    this._recomputeBusyState();
  }

  /**
   * Cancel one busy task or all busy tasks.
   * @param {string} [token]
   */
  cancelBusyTask(token) {
    if (typeof token === 'string' && token) {
      const task = this._busyTasks.get(token);
      if (!task) return;
      task.controller?.abort('busy-task-cancelled');
      this._busyTasks.delete(token);
      this._recomputeBusyState();
      return;
    }

    this._busyTasks.forEach((task) => {
      task.controller?.abort('busy-task-cancelled');
    });
    this._busyTasks.clear();
    this._recomputeBusyState();
  }

  /**
   * Run async operation with tracked busy state.
   *
   * @param {(ctx: { token: string, signal: AbortSignal, update: Function }) => Promise<any>} task
   * @param {object} [opts]
   * @returns {Promise<any>}
   */
  async runWithBusy(task, opts = {}) {
    if (typeof task !== 'function') {
      throw new Error('[EditorCore] runWithBusy requires a function task.');
    }

    const token = this.beginBusyTask(opts);
    const taskMeta = this._busyTasks.get(token);
    const signal = taskMeta?.controller?.signal ?? new AbortController().signal;

    try {
      return await task({
        token,
        signal,
        update: (patch) => this.updateBusyTask(token, patch),
      });
    } finally {
      this.endBusyTask(token);
    }
  }

  /**
   * @param {'split'|'code'|'preview'|'wysiwyg'} mode
   */
  setMode(mode) { this._mode = mode; this._applyMode(); }

  /** @returns {'split'|'code'|'preview'|'wysiwyg'} */
  getMode() { return this._mode; }

  /** @returns {string} */
  getTheme() { return this._theme; }

  /** @returns {{ id: string, label: string, description: string, scheme: string }[]} */
  getAvailableThemes() { return getEditorThemeList(); }

  /**
   * @param {string} theme
   * @returns {string}
   * @throws {Error} If `theme` is not `auto` and is not a registered built-in theme
   */
  setTheme(theme = 'auto') {
    const normalized = typeof theme === 'string' && theme.trim() ? theme.trim() : 'auto';

    if (normalized !== 'auto' && !isEditorTheme(normalized)) {
      throw new Error(`[EditorCore] Unsupported theme: ${normalized}`);
    }

    this._theme = normalized;
    this._opts.theme = normalized;

    if (normalized === 'auto') {
      this._root.removeAttribute('data-theme');
    } else {
      this._root.setAttribute('data-theme', normalized);
    }

    return this._theme;
  }

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
    if (this._busyState.locked === true) return false;
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

  /** @returns {object} Latest compatibility report. */
  getCompatibilityReport() {
    return this._compatibilityReport;
  }

  /** @returns {'disabled'|'valid'|'warning'|'invalid'} */
  getCompatibilityStatus() {
    return this._compatibilityStatus;
  }

  /** @returns {boolean} */
  isCompatibilityEnabled() {
    return this._compatibilityEnabled;
  }

  /**
   * @param {boolean} enabled
   * @returns {object} Latest compatibility report
   */
  setCompatibilityEnabled(enabled) {
    this._compatibilityEnabled = enabled === true;
    if (!this._compatibilityEnabled) {
      const prevStatus = this._compatibilityStatus;
      this._compatibilityStatus = 'disabled';
      this._compatibilityReport = _createDisabledCompatibilityReport();
      this._opts.onCompatibilityReport?.(this._compatibilityReport);
      if (prevStatus !== 'disabled') {
        this._opts.onCompatibilityStatusChange?.('disabled', this._compatibilityReport);
      }
      this._renderCompatibilityPanel();
      return this._compatibilityReport;
    }

    return this.validateCompatibility({ force: true });
  }

  /**
   * @param {object} profile
   * @returns {object} Latest compatibility report
   */
  setCompatibilityProfile(profile) {
    this._compatibilityService.setProfile(profile);
    if (!this._compatibilityEnabled) return this._compatibilityReport;
    return this.validateCompatibility({ force: true });
  }

  /**
   * @param {object} [opts]
   * @param {boolean} [opts.force=false] Run even when compatibility mode is disabled
   * @param {boolean} [opts.emitStatusChange=true] Emit status-change callback when status changes
   * @returns {object}
   */
  validateCompatibility(opts = {}) {
    const force = opts.force === true;
    if (!force && !this._compatibilityEnabled) {
      return this._compatibilityReport;
    }

    const report = this._compatibilityService.validate(this.getMarkdown());
    this._setCompatibilityReport(report, { emitStatusChange: opts.emitStatusChange !== false });

    if (
      this._compatibilityPreviewEnabled
      && typeof report.previewHtml === 'string'
      && !report.renderError
    ) {
      this._setSelectedPreviewImage(null);
      this._previewPanel.render(report.previewHtml);
      this._imageResize?.attachHandlers();
    }

    return report;
  }

  /**
   * Propose and optionally apply a single compatibility fix.
   *
   * @param {string} issueId
   * @returns {Promise<boolean>} true when fix was applied
   */
  async proposeCompatibilityFix(issueId) {
    this._setCompatibilityPanelBusy(true);
    try {
      const report = this.validateCompatibility({ force: true });
      const issue = report.issues?.find((entry) => entry.id === issueId);
      if (!issue) {
        throw new Error(`[EditorCore] Compatibility issue not found: ${issueId}`);
      }
      if (!issue.fixable || !issue.fix?.nextMarkdown) {
        throw new Error(`[EditorCore] Compatibility issue is not fixable: ${issueId}`);
      }

      const accepted = await this.proposeChange(issue.fix.nextMarkdown, { mode: 'replace-all' });
      if (!accepted) return false;

      this._opts.onCompatibilityFixApplied?.({
        type: 'single',
        issueId,
        code: issue.code,
      });

      this.validateCompatibility({ force: true });
      return true;
    } finally {
      this._setCompatibilityPanelBusy(false);
    }
  }

  /**
   * Propose one combined fix for all fixable compatibility issues.
   * @returns {Promise<boolean>} true when fix was applied
   */
  async proposeAllCompatibilityFixes() {
    this._setCompatibilityPanelBusy(true);
    try {
      const fix = this._compatibilityService.buildBatchFix(this.getMarkdown());
      if (!fix?.nextMarkdown) return false;

      const accepted = await this.proposeChange(fix.nextMarkdown, { mode: 'replace-all' });
      if (!accepted) return false;

      this._opts.onCompatibilityFixApplied?.({
        type: 'batch',
        changeCount: fix.changeCount ?? 0,
      });

      this.validateCompatibility({ force: true });
      return true;
    } finally {
      this._setCompatibilityPanelBusy(false);
    }
  }

  _buildProposedDocument(current, nextChunk, mode, selection) {
    if (mode === 'replace-all') {
      const spans = _computeChangedSpans(current, nextChunk);
      return {
        nextDocument: nextChunk,
        oldHighlight: spans.oldHighlight,
        newHighlight: spans.newHighlight,
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
    clearTimeout(this._compatibilityDebounce);
    clearTimeout(this._scrollSyncReleaseTimer);
    this.cancelBusyTask();
    clearTimeout(this._scrollSyncDebounceTimer);
    clearTimeout(this._previewScrollUnlockTimer);
    cancelAnimationFrame(this._codeScrollRaf);
    cancelAnimationFrame(this._previewScrollRaf);
    this._codePanel.destroy();
    this._previewPanel.destroy();
    this._toolbar?.destroy();
    this._compatibilityPanel?.destroy();
    this._loadingOverlay?.destroy();
    this._imageHandler?.destroy();
    this._imageResize?.destroy();
    this._diffModal.destroy();
    this._drawioModal.destroy();
    this._bus.destroy();
    this._cleanupDivider?.();
    this._previewPanelEl?.removeEventListener('click', this._boundPreviewAction);
    this._previewPanelEl?.removeEventListener('change', this._boundPreviewLanguageChange);
    document.removeEventListener('keydown', this._boundPreviewDeleteKey, true);

    this._root.innerHTML = '';
    this._root.removeAttribute('data-theme');
    this._root.removeAttribute('aria-busy');
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
    this.setTheme(this._opts.theme ?? 'auto');

    this._root.innerHTML = `
      <div class="se-layout">
        <div class="se-toolbar-container"></div>
        <div class="se-compatibility-container"></div>
        <div class="se-wysiwyg-beta">WYSIWYG beta: visual mode is preview-first in this build.</div>
        <div class="se-panels">
          <div class="se-panel se-panel--code"></div>
          <div class="se-divider" title="Drag to resize panels"></div>
          <div class="se-panel se-panel--preview"></div>
        </div>
        <div class="se-loading-overlay" aria-hidden="true"></div>
      </div>
    `;

    this._toolbarContainer = this._root.querySelector('.se-toolbar-container');
    this._compatibilityPanelEl = this._root.querySelector('.se-compatibility-container');
    this._codePanelEl = this._root.querySelector('.se-panel--code');
    this._previewPanelEl = this._root.querySelector('.se-panel--preview');
    this._loadingOverlayEl = this._root.querySelector('.se-loading-overlay');

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
        this._scheduleCompatibilityValidation();
      },

      onCursorMove: (line) => {
        if (
          this._mode === 'split'
          && !this._suspendCodeToPreviewSync
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

    this._boundPreviewLanguageChange = (event) => {
      const select = event.target.closest('.se-code-block__lang-select');
      if (!select) return;

      const line = parseInt(select.getAttribute('data-source-line') ?? '-1', 10);
      const language = String(select.value || '').trim();
      if (!Number.isFinite(line) || !language) return;

      event.stopPropagation();
      // Prevent browser focus management on native select from nudging scroll.
      select.blur();
      this._setCodeFenceLanguage(line, language);
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
    this._previewPanelEl.addEventListener('change', this._boundPreviewLanguageChange);
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

  _buildCompatibilityPanel() {
    if (!this._compatibilityShowPanel || !this._compatibilityPanelEl) {
      this._compatibilityPanelEl?.classList.add('se-compatibility-container--hidden');
      return;
    }

    this._compatibilityPanel = new CompatibilityPanel(this._compatibilityPanelEl, {
      onFixIssue: async (issueId) => {
        try {
          await this.proposeCompatibilityFix(issueId);
        } catch (error) {
          console.warn('[EditorCore] Compatibility fix failed:', error);
          this._setCompatibilityPanelBusy(false);
        }
      },
      onFixAll: async () => {
        try {
          await this.proposeAllCompatibilityFixes();
        } catch (error) {
          console.warn('[EditorCore] Compatibility batch fix failed:', error);
          this._setCompatibilityPanelBusy(false);
        }
      },
      onEnable: () => {
        this.setCompatibilityEnabled(true);
      },
      onJumpIssue: (issueId) => {
        this._jumpToCompatibilityIssue(issueId);
      },
    });

    this._renderCompatibilityPanel();
  }

  _buildLoadingOverlay() {
    if (!this._loadingOverlayEl) return;

    this._loadingOverlay = new LoadingOverlay(this._loadingOverlayEl, {
      onCancel: (token) => this.cancelBusyTask(token),
      showDelayMs: this._busyConfig.showDelay,
      minVisibleMs: this._busyConfig.minVisible,
      texts: {
        defaultLabel: this._busyTexts.defaultLabel,
        cancel: this._busyTexts.cancel,
      },
    });

    this._applyBusyState();
  }

  _recomputeBusyState() {
    if (!this._busyTasks.size) {
      this._busyState = _createIdleBusyState();
      this._applyBusyState();
      return;
    }

    const tasks = [...this._busyTasks.values()].sort((a, b) => a.order - b.order);
    const activeTask = tasks[tasks.length - 1];
    const locked = tasks.some((task) => task.lock !== false);
    const cancellableTask = [...tasks].reverse().find((task) => task.cancellable && task.controller);

    this._busyState = {
      busy: true,
      count: tasks.length,
      label: activeTask?.label ?? this._busyTexts.defaultLabel,
      detail: activeTask?.detail ?? '',
      scope: activeTask?.scope ?? 'global',
      locked,
      canCancel: Boolean(cancellableTask),
      cancelToken: cancellableTask?.token ?? null,
    };

    this._applyBusyState();
  }

  _applyBusyState() {
    const state = this._busyState;
    const busy = state.busy === true;

    this._root.setAttribute('aria-busy', busy ? 'true' : 'false');
    this._toolbar?.setDisabled(state.locked === true);
    this._codePanel?.setEditable(!(state.locked === true));

    this._loadingOverlay?.render({
      busy,
      label: state.label,
      detail: state.detail,
      canCancel: state.canCancel,
      cancelToken: state.cancelToken,
    });

    this._opts.onBusyChange?.({ ...state });
  }

  // ============================================================
  // Private — rendering
  // ============================================================

  _schedulePreviewUpdate(value) {
    clearTimeout(this._previewDebounce);
    this._previewDebounce = setTimeout(() => this._updatePreview(value), 150);
  }

  _scheduleCompatibilityValidation() {
    if (!this._compatibilityEnabled) return;
    clearTimeout(this._compatibilityDebounce);
    this._compatibilityDebounce = setTimeout(() => {
      this.validateCompatibility({ force: true });
    }, this._compatibilityDebounceMs);
  }

  _updatePreview(markdown) {
    this._previewRenderCycleId += 1;
    const { html } = this._parser.render(markdown);
    this._setSelectedPreviewImage(null);
    this._previewPanel.render(html);
    this._renderMath();
    this._trackPendingPreviewImages(this._previewRenderCycleId);
    // Re-apply pinned scroll after synchronous post-processing.
    this._applyPinnedPreviewScroll();
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
    if (!mermaid) {
      this._pendingMermaidRenders = 0;
      return;
    }

    const targets = Array.from(this._previewPanelEl
      .querySelectorAll('.se-mermaid:not(.se-mermaid--rendered)'));
    this._pendingMermaidRenders = targets.length;
    if (!targets.length) return;

    targets.forEach(async (el, idx) => {
      const code = decodeURIComponent(el.getAttribute('data-code') ?? '');
      try {
        const id = `se-mermaid-${Date.now()}-${idx}`;
        const { svg } = await mermaid.render(id, code);
        el.innerHTML = svg;
        el.classList.add('se-mermaid--rendered');
      } catch (e) {
        console.warn('[EditorCore] mermaid render error:', e);
      } finally {
        this._pendingMermaidRenders = Math.max(0, this._pendingMermaidRenders - 1);
        // Mermaid output can change block height asynchronously.
        this._applyPinnedPreviewScroll();
      }
    });
  }

  _applyPinnedPreviewScroll() {
    if (this._pinPreviewScrollTop === null) return;
    this._previewPanel.getRoot().scrollTop = this._pinPreviewScrollTop;
  }

  _beginPreviewStabilityLock(scrollTop) {
    this._suspendCodeToPreviewSync = true;
    this._scrollSyncSuppressed = true;
    this._previewPanel.suspendScrollCallbacks();
    clearTimeout(this._scrollSyncDebounceTimer);
    clearTimeout(this._previewScrollUnlockTimer);

    this._pinPreviewScrollTop = scrollTop;
    this._previewPinDeadline = Date.now() + 1200;
  }

  _hasPendingPreviewAsyncWork() {
    return this._pendingMermaidRenders > 0 || this._pendingPreviewImageLoads > 0;
  }

  _finalizePreviewStabilityLock() {
    this._previewPanel.resumeScrollCallbacks();
    this._suspendCodeToPreviewSync = false;
    this._scrollSyncSuppressed = false;
    this._pinPreviewScrollTop = null;
    this._pendingPreviewImageLoads = 0;
    this._previewPinDeadline = 0;
    this._previewScrollUnlockTimer = null;
  }

  _schedulePreviewStabilityUnlock(initialDelayMs = 220) {
    cancelAnimationFrame(this._previewScrollRaf);

    const releasePreviewLock = () => {
      this._applyPinnedPreviewScroll();
      const withinDeadline = Date.now() < this._previewPinDeadline;
      if (this._hasPendingPreviewAsyncWork() && withinDeadline) {
        this._previewScrollUnlockTimer = setTimeout(releasePreviewLock, 90);
        return;
      }
      this._finalizePreviewStabilityLock();
    };

    this._previewScrollUnlockTimer = setTimeout(releasePreviewLock, initialDelayMs);
  }

  _trackPendingPreviewImages(renderCycleId) {
    const images = Array.from(this._previewPanelEl.querySelectorAll('img'));
    let pending = 0;

    images.forEach((img) => {
      // complete=true means load/error has already settled for this image.
      if (img.complete) return;
      pending += 1;

      const onSettled = () => {
        // Ignore stale events from a previous render cycle.
        if (renderCycleId !== this._previewRenderCycleId) return;
        this._pendingPreviewImageLoads = Math.max(0, this._pendingPreviewImageLoads - 1);
        this._applyPinnedPreviewScroll();
      };

      img.addEventListener('load', onSettled, { once: true });
      img.addEventListener('error', onSettled, { once: true });
    });

    this._pendingPreviewImageLoads = pending;
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
    if (this._suspendCodeToPreviewSync) return;
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
      getTheme: () => this.getTheme(),
      setTheme: (theme) => this.setTheme(theme),
      getAvailableThemes: () => this.getAvailableThemes(),
      isBusy: () => this.isBusy(),
      getBusyState: () => this.getBusyState(),
      beginBusyTask: (opts) => this.beginBusyTask(opts),
      updateBusyTask: (token, patch) => this.updateBusyTask(token, patch),
      endBusyTask: (token) => this.endBusyTask(token),
      cancelBusyTask: (token) => this.cancelBusyTask(token),
      runWithBusy: (task, opts) => this.runWithBusy(task, opts),
      openDrawioEditor: (opts) => this.openDrawioEditor(opts),
      getCompatibilityReport: () => this.getCompatibilityReport(),
      getCompatibilityStatus: () => this.getCompatibilityStatus(),
      isCompatibilityEnabled: () => this.isCompatibilityEnabled(),
      setCompatibilityEnabled: (enabled) => this.setCompatibilityEnabled(enabled),
      setCompatibilityProfile: (profile) => this.setCompatibilityProfile(profile),
      validateCompatibility: (opts) => this.validateCompatibility(opts),
      proposeCompatibilityFix: (issueId) => this.proposeCompatibilityFix(issueId),
      proposeAllCompatibilityFixes: () => this.proposeAllCompatibilityFixes(),
      focus: () => this.focus(),
    };
  }

  _setCompatibilityReport(report, opts = {}) {
    const prevStatus = this._compatibilityStatus;
    const nextStatus = report?.status ?? 'valid';

    this._compatibilityReport = report;
    this._compatibilityStatus = nextStatus;

    this._opts.onCompatibilityReport?.(report);
    if (opts.emitStatusChange !== false && prevStatus !== nextStatus) {
      this._opts.onCompatibilityStatusChange?.(nextStatus, report);
    }

    this._renderCompatibilityPanel();
  }

  _setCompatibilityPanelBusy(nextBusy) {
    this._compatibilityPanelBusy = nextBusy === true;
    this._renderCompatibilityPanel();
  }

  _renderCompatibilityPanel() {
    if (!this._compatibilityPanel) return;

    this._compatibilityPanel.render({
      enabled: this._compatibilityEnabled,
      status: this._compatibilityStatus,
      summary: this._compatibilityReport.summary,
      issues: this._compatibilityReport.issues,
      busy: this._compatibilityPanelBusy,
    });
  }

  _jumpToCompatibilityIssue(issueId) {
    const issue = this._compatibilityReport.issues?.find((entry) => entry.id === issueId);
    if (!issue) return;

    if (this._mode === 'preview' || this._mode === 'wysiwyg') {
      this.setMode('split');
    }

    if (Number.isInteger(issue.from) && Number.isInteger(issue.to)) {
      this.setSelection(issue.from, issue.to);
    }

    if (Number.isInteger(issue.lineFrom) && issue.lineFrom >= 0) {
      this._codePanel.scrollToLine(issue.lineFrom);
      return;
    }

    this.focus();
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

  _setCodeFenceLanguage(line0, language) {
    if (!Number.isFinite(line0) || line0 < 0) return false;

    const markdown = this.getMarkdown();
    const lines = markdown.split('\n');
    if (!lines.length || line0 >= lines.length) return false;

    const sourceLine = lines[line0];
    const fenceMatch = sourceLine.match(/^(\s*)(`{3,}|~{3,})([ \t]*)(.*)$/);
    if (!fenceMatch) return false;

    const nextInfo = _replaceFenceLanguage(fenceMatch[4], language);
    const nextLine = `${fenceMatch[1]}${fenceMatch[2]}${fenceMatch[3]}${nextInfo}`;
    if (nextLine === sourceLine) return true;

    const lineStart = this._getCharacterOffsetForLine(lines, line0);
    const lineEnd = lineStart + sourceLine.length;
    const previewRoot = this._previewPanel.getRoot();
    const previewScrollTop = previewRoot.scrollTop;

    this._beginPreviewStabilityLock(previewScrollTop);
    try {
      // Update only the opening fence line without moving editor selection/cursor.
      this._codePanel.replaceRange(lineStart, lineEnd, nextLine);
      previewRoot.scrollTop = previewScrollTop;
    } finally {
      this._schedulePreviewStabilityUnlock(220);
    }
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

function _replaceFenceLanguage(infoString, language) {
  const lang = String(language || '').trim();
  if (!lang) return String(infoString || '').trim();

  const info = String(infoString || '').trim();
  if (!info) return lang;

  const firstSpace = info.search(/\s/);
  if (firstSpace === -1) {
    return info.startsWith('{') ? `${lang} ${info}` : lang;
  }

  const firstToken = info.slice(0, firstSpace);
  const tail = info.slice(firstSpace + 1).trim();
  if (firstToken.startsWith('{')) {
    return `${lang} ${info}`;
  }

  return tail ? `${lang} ${tail}` : lang;
}

function _defaultDrawioImage() {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="220" viewBox="0 0 640 220"><rect width="640" height="220" rx="16" fill="#eef6ff"/><rect x="24" y="24" width="592" height="172" rx="12" fill="#ffffff" stroke="#93c5fd"/><text x="320" y="118" text-anchor="middle" font-family="Arial" font-size="28" fill="#1d4ed8">draw.io diagram</text></svg>';
  const bytes = new TextEncoder().encode(svg);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}

function _createDisabledCompatibilityReport() {
  return {
    profileId: 'disabled',
    profileLabel: 'Disabled',
    generatedAt: Date.now(),
    status: 'disabled',
    summary: { total: 0, errors: 0, warnings: 0, fixable: 0 },
    issues: [],
    previewHtml: '',
    renderError: null,
  };
}

function _createIdleBusyState() {
  return {
    busy: false,
    count: 0,
    label: '',
    detail: '',
    scope: 'global',
    locked: false,
    canCancel: false,
    cancelToken: null,
  };
}

function _resolveBusyConfig(value) {
  const showDelay = Number.isFinite(value?.showDelay)
    ? Math.max(0, value.showDelay)
    : 140;
  const minVisible = Number.isFinite(value?.minVisible)
    ? Math.max(0, value.minVisible)
    : 180;

  return { showDelay, minVisible };
}

function _resolveBusyTexts(value) {
  return {
    defaultLabel: _normalizeBusyLabel(value?.defaultLabel, 'Working...'),
    cancel: _normalizeBusyLabel(value?.cancel, 'Cancel'),
  };
}

function _normalizeBusyLabel(value, fallbackLabel = 'Working...') {
  if (typeof value !== 'string') return fallbackLabel;
  const normalized = value.trim();
  return normalized || fallbackLabel;
}

function _normalizeBusyDetail(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function _computeChangedSpans(oldText, newText) {
  const oldValue = String(oldText ?? '');
  const newValue = String(newText ?? '');
  const oldLen = oldValue.length;
  const newLen = newValue.length;

  let prefix = 0;
  const maxPrefix = Math.min(oldLen, newLen);
  while (prefix < maxPrefix && oldValue.charCodeAt(prefix) === newValue.charCodeAt(prefix)) {
    prefix += 1;
  }

  let suffix = 0;
  const maxSuffix = Math.min(oldLen - prefix, newLen - prefix);
  while (
    suffix < maxSuffix
    && oldValue.charCodeAt(oldLen - 1 - suffix) === newValue.charCodeAt(newLen - 1 - suffix)
  ) {
    suffix += 1;
  }

  const oldFrom = prefix;
  const oldTo = oldLen - suffix;
  const newFrom = prefix;
  const newTo = newLen - suffix;

  if (oldFrom === oldTo && newFrom === newTo) {
    return { oldHighlight: null, newHighlight: null };
  }

  return {
    oldHighlight: oldFrom === oldTo
      ? { from: oldFrom, to: oldTo, cursor: true }
      : { from: oldFrom, to: oldTo },
    newHighlight: newFrom === newTo
      ? { from: newFrom, to: newTo, cursor: true }
      : { from: newFrom, to: newTo },
  };
}
