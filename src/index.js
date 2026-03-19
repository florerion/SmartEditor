/**
 * md-wysiwyg-editor — public entry point
 *
 * Exports:
 *  - createEditor(element, options)  Factory function (plain-JS path)
 *  - EditorCore                      Class for advanced usage
 *  - MdEditorElement                 <md-editor> Custom Element class
 *
 * The Web Component is registered as a side-effect of this import:
 *   customElements.define('md-editor', MdEditorElement)
 *
 * @module md-wysiwyg-editor
 */

export { EditorCore } from './core/EditorCore.js';
export { MdEditorElement } from './adapters/WebComponent.js';
import { EditorCore as _EditorCore } from './core/EditorCore.js';

/**
 * Create and mount an editor instance on a DOM element.
 *
 * @param {HTMLElement|string} element  DOM element or CSS selector string
 * @param {object}             [options]  See EditorCore constructor for full schema
 * @returns {import('./core/EditorCore').EditorCore}
 *
 * @example
 * import { createEditor } from 'md-wysiwyg-editor';
 *
 * const editor = createEditor('#my-editor', {
 *   value: '# Hello',
 *   onChange: (md) => console.log(md),
 * });
 *
 * @throws {Error} if the element cannot be found in the DOM
 */
export function createEditor(element, options = {}) {
  const el = typeof element === 'string'
    ? document.querySelector(element)
    : element;

  if (!el) throw new Error(`[md-editor] Element not found: ${element}`);

  return new _EditorCore(el, options);
}
