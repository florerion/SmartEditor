import { EditorCore } from '../core/EditorCore.js';

/**
 * <smart-editor> Custom Element.
 *
 * Attributes (all optional):
 *   value   Initial markdown content
 *   mode    'split' | 'code' | 'preview' | 'wysiwyg'   (default: 'split')
 *   theme   'light' | 'dark' | 'auto'      (default: 'auto')
 *
 * DOM Events emitted:
 *   se-change           CustomEvent({ detail: { markdown, tokens, html } })
 *   se-selection-change CustomEvent({ detail: selInfo })
 *   se-preview-click    CustomEvent({ detail: { element, lineRange } })
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

      onChange: (markdown, tokens, html) => {
        this.dispatchEvent(new CustomEvent('se-change', {
          bubbles: true, composed: true,
          detail: { markdown, tokens, html },
        }));
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
    if (name === 'theme') this._editor.getMode && this._editor._root?.setAttribute('data-theme', newVal);
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
  undo()                    { this._editor?.undo(); }
  redo()                    { this._editor?.redo(); }
  focus()                   { this._editor?.focus(); }
  setMode(mode)             { this._editor?.setMode(mode); }
  getMode()                 { return this._editor?.getMode(); }
  destroy()                 { this._editor?.destroy(); this._editor = null; }
}

if (!customElements.get('smart-editor')) {
  customElements.define('smart-editor', SmartEditorElement);
}
