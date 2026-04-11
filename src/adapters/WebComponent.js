import { EditorCore } from '../core/EditorCore.js';

/**
 * <smart-editor> Custom Element.
 *
 * Attributes (all optional):
 *   value   Initial markdown content
 *   mode    'split' | 'code' | 'preview' | 'wysiwyg'   (default: 'split')
 *   theme   'auto' or one of the built-in theme ids      (default: 'auto')
 *
 * DOM Events emitted:
 *   se-change           CustomEvent({ detail: { markdown, tokens, html } })
 *                       Emitted after debounced preview rendering completes.
 *   se-selection-change CustomEvent({ detail: selInfo })
 *   se-preview-click    CustomEvent({ detail: { element, lineRange } })
 *   se-compatibility-report        CustomEvent({ detail: report })
 *   se-compatibility-status-change CustomEvent({ detail: { status, report } })
 *   se-compatibility-fix-applied   CustomEvent({ detail: payload })
 *   se-preview-rules-changed        CustomEvent({ detail: payload })
 *   se-preview-rule-error           CustomEvent({ detail: { error, context } })
 *   se-preview-pipeline-finished    CustomEvent({ detail: payload })
 *   se-busy-change                 CustomEvent({ detail: busyState })
 *   se-ai-response                 CustomEvent({ detail: { result, request } })
 *   se-ai-error                    CustomEvent({ detail: { error, request } })
 *
 * All EditorCore public methods are proxied directly on the element.
 *
 * @example
 * <smart-editor value="# Hello" mode="split" style="height:500px"></smart-editor>
 * <script>
 *   document.querySelector('smart-editor').addEventListener('se-change', e => {
 *     console.log(e.detail.markdown);
 *   });
 * </script>
 */
export class SmartEditorElement extends HTMLElement {
  static get observedAttributes() {
    return ['value', 'mode', 'theme'];
  }

  connectedCallback() {
    if (this._editor) return;

    // Ensure the element has a height so CodeMirror renders correctly
    if (!this.style.height && !this.style.minHeight) {
      this.style.height = '500px';
    }
    this.style.display = 'block';

    this._editor = new EditorCore(this, {
      value: this.getAttribute('value') ?? '',
      mode:  this.getAttribute('mode')  ?? 'split',
      theme: this.getAttribute('theme') ?? 'auto',

      onPreviewRendered: (markdown, tokens, html) => {
        // Emit CustomEvent asynchronously to batch updates and reduce CPU load during rapid typing.
        // Event fires in next microtask, which allows multiple rapid renders to batch together.
        queueMicrotask(() => {
          this.dispatchEvent(new CustomEvent('se-change', {
            bubbles: true, composed: true,
            detail: { markdown, tokens, html },
          }));
        });
      },

      onSelectionChange: (selInfo) => {
        this.dispatchEvent(new CustomEvent('se-selection-change', {
          bubbles: true, composed: true,
          detail: selInfo,
        }));
      },

      onPreviewClick: (element, lineRange) => {
        this.dispatchEvent(new CustomEvent('se-preview-click', {
          bubbles: true, composed: true,
          detail: { element, lineRange },
        }));
      },

      onCompatibilityReport: (report) => {
        this.dispatchEvent(new CustomEvent('se-compatibility-report', {
          bubbles: true, composed: true,
          detail: report,
        }));
      },

      onCompatibilityStatusChange: (status, report) => {
        this.dispatchEvent(new CustomEvent('se-compatibility-status-change', {
          bubbles: true, composed: true,
          detail: { status, report },
        }));
      },

      onCompatibilityFixApplied: (payload) => {
        this.dispatchEvent(new CustomEvent('se-compatibility-fix-applied', {
          bubbles: true, composed: true,
          detail: payload,
        }));
      },

      onPreviewRulesChanged: (payload) => {
        this.dispatchEvent(new CustomEvent('se-preview-rules-changed', {
          bubbles: true, composed: true,
          detail: payload,
        }));
      },

      onPreviewRuleError: (error, context) => {
        this.dispatchEvent(new CustomEvent('se-preview-rule-error', {
          bubbles: true, composed: true,
          detail: {
            error: error instanceof Error ? error.message : String(error),
            context,
          },
        }));
      },

      onPreviewPipelineFinished: (payload) => {
        this.dispatchEvent(new CustomEvent('se-preview-pipeline-finished', {
          bubbles: true, composed: true,
          detail: payload,
        }));
      },

      onBusyChange: (busyState) => {
        this.dispatchEvent(new CustomEvent('se-busy-change', {
          bubbles: true, composed: true,
          detail: busyState,
        }));
      },

      onAIResponse: (result, request) => {
        this.dispatchEvent(new CustomEvent('se-ai-response', {
          bubbles: true, composed: true,
          detail: { result, request },
        }));
      },

      onAIError: (error, request) => {
        this.dispatchEvent(new CustomEvent('se-ai-error', {
          bubbles: true, composed: true,
          detail: {
            error: error instanceof Error ? error.message : String(error),
            request,
          },
        }));
      },
    });
  }

  disconnectedCallback() {
    this._editor?.destroy();
    this._editor = null;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._editor || oldVal === newVal) return;
    if (name === 'value') this._editor.setMarkdown(newVal, { undoable: false });
    if (name === 'mode')  this._editor.setMode(newVal);
    if (name === 'theme') this._editor.setTheme(newVal ?? 'auto');
  }

  // Proxy all public EditorCore methods onto the element itself
  getMarkdown()             { return this._editor?.getMarkdown(); }
  setMarkdown(md, opts)     { this._editor?.setMarkdown(md, opts); }
  getTokens()               { return this._editor?.getTokens(); }
  getPreview()              { return this._editor?.getPreview(); }
  getSelection()            { return this._editor?.getSelection(); }
  setSelection(f, t)        { this._editor?.setSelection(f, t); }
  insertText(text, pos)     { this._editor?.insertText(text, pos); }
  replaceSelection(text)    { this._editor?.replaceSelection(text); }
  registerAction(def)       { this._editor?.registerAction(def); }
  unregisterAction(id)      { this._editor?.unregisterAction(id); }
  runCommand(id, args)      { return this._editor?.runCommand(id, args); }
  openDrawioEditor(opts)     { return this._editor?.openDrawioEditor(opts); }
  proposeChange(md, opts)   { return this._editor?.proposeChange(md, opts); }
  getCompatibilityReport()  { return this._editor?.getCompatibilityReport(); }
  getCompatibilityStatus()  { return this._editor?.getCompatibilityStatus(); }
  isCompatibilityEnabled()  { return this._editor?.isCompatibilityEnabled(); }
  setCompatibilityEnabled(v) { return this._editor?.setCompatibilityEnabled(v); }
  setCompatibilityProfile(p) { return this._editor?.setCompatibilityProfile(p); }
  validateCompatibility(opts) { return this._editor?.validateCompatibility(opts); }
  proposeCompatibilityFix(issueId) { return this._editor?.proposeCompatibilityFix(issueId); }
  proposeAllCompatibilityFixes() { return this._editor?.proposeAllCompatibilityFixes(); }
  undo()                    { this._editor?.undo(); }
  redo()                    { this._editor?.redo(); }
  focus()                   { this._editor?.focus(); }
  setMode(mode)             { this._editor?.setMode(mode); }
  getMode()                 { return this._editor?.getMode(); }
  setTheme(theme)           { return this._editor?.setTheme(theme); }
  getTheme()                { return this._editor?.getTheme(); }
  getAvailableThemes()      { return this._editor?.getAvailableThemes(); }
  isBusy()                  { return this._editor?.isBusy(); }
  getBusyState()            { return this._editor?.getBusyState(); }
  beginBusyTask(opts)       { return this._editor?.beginBusyTask(opts); }
  updateBusyTask(token, patch) { return this._editor?.updateBusyTask(token, patch); }
  endBusyTask(token)        { return this._editor?.endBusyTask(token); }
  cancelBusyTask(token)     { return this._editor?.cancelBusyTask(token); }
  runWithBusy(task, opts)   { return this._editor?.runWithBusy(task, opts); }
  isAIAssistantEnabled()    { return this._editor?.isAIAssistantEnabled(); }
  isAIAssistantOpen()       { return this._editor?.isAIAssistantOpen(); }
  openAIAssistantPanel()    { return this._editor?.openAIAssistantPanel(); }
  closeAIAssistantPanel()   { return this._editor?.closeAIAssistantPanel(); }
  toggleAIAssistantPanel()  { return this._editor?.toggleAIAssistantPanel(); }
  setAIProvider(provider)   { return this._editor?.setAIProvider(provider); }
  getAIProvider()           { return this._editor?.getAIProvider(); }
  requestAIAssistant(request) { return this._editor?.requestAIAssistant(request); }
  get previewRules()          { return this._editor?.previewRules; }
  getPreviewRules()           { return this._editor?.getPreviewRules(); }
  getPreviewRuleById(id)      { return this._editor?.getPreviewRuleById(id); }
  registerPreviewRule(rule)   { return this._editor?.registerPreviewRule(rule); }
  registerPreviewRules(rules) { return this._editor?.registerPreviewRules(rules); }
  unregisterPreviewRule(id)   { return this._editor?.unregisterPreviewRule(id); }
  clearPreviewRules(phase)    { return this._editor?.clearPreviewRules(phase); }
  enablePreviewRule(id)       { return this._editor?.enablePreviewRule(id); }
  disablePreviewRule(id)      { return this._editor?.disablePreviewRule(id); }
  setPreviewRuleEnabled(id, enabled) { return this._editor?.setPreviewRuleEnabled(id, enabled); }
  updatePreviewRuleConfig(id, patch) { return this._editor?.updatePreviewRuleConfig(id, patch); }
  replacePreviewRules(input)  { return this._editor?.replacePreviewRules(input); }
  rebuildPreview(opts)        { return this._editor?.rebuildPreview(opts); }
  getPreviewRulesMetrics()    { return this._editor?.getPreviewRulesMetrics(); }
  destroy()                 { this._editor?.destroy(); this._editor = null; }
}

if (!customElements.get('smart-editor')) {
  customElements.define('smart-editor', SmartEditorElement);
}
