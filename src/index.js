/**
 * smart-md-editor — public entry point
 *
 * Exports:
 *  - createEditor(element, options)  Factory function (plain-JS path)
 *  - EditorCore                      Class for advanced usage
 *  - SmartEditorElement              <smart-editor> Custom Element class
 *
 * The Web Component is registered as a side-effect of this import:
 *   customElements.define('smart-editor', SmartEditorElement)
 *
 * @module smart-md-editor
 */

export { EditorCore } from './core/EditorCore.js';
export { SmartEditorElement } from './adapters/WebComponent.js';
export { AIAssistantService } from './core/ai/AIAssistantService.js';
export { PromptRegistry } from './core/ai/PromptRegistry.js';
export { OllamaAIProvider } from './core/ai/OllamaAIProvider.js';
export { TokenAuthAIProvider } from './core/ai/TokenAuthAIProvider.js';
export { OpenAICompatibleAIProvider } from './core/ai/OpenAICompatibleAIProvider.js';
export { EDITOR_THEME_PRESETS, getEditorThemeList } from './styles/themes.js';
export {
  createMarkdownItCompatibilityProfile,
  createEleventyCompatibilityProfile,
} from './core/compat/CompatibilityProfiles.js';
import { EditorCore as _EditorCore } from './core/EditorCore.js';

/**
 * Create and mount an editor instance on a DOM element.
 *
 * @param {HTMLElement|string} element  DOM element or CSS selector string
 * @param {object}             [options]  See EditorCore constructor for full schema
 * @returns {import('./core/EditorCore').EditorCore}
 *
 * @example
 * import { createEditor } from 'smart-md-editor';
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

  if (!el) throw new Error(`[smart-editor] Element not found: ${element}`);

  return new _EditorCore(el, options);
}
