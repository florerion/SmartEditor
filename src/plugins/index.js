import { formattingActions } from './formatting.js';
import { blockActions } from './blocks.js';
import { listActions } from './lists.js';
import { linkActions } from './links.js';
import { tableAction, mermaidAction } from './tables.js';
import { drawioAction } from './drawio.js';

/**
 * Register all built-in toolbar actions on a Toolbar instance.
 * Note: asset upload action is registered separately by EditorCore after the
 * AssetUploadHandler is instantiated.
 * @param {import('../ui/Toolbar').Toolbar} toolbar
 */
export function registerDefaultActions(toolbar) {
  [
    ...formattingActions,
    ...blockActions,
    ...listActions,
    ...linkActions,
    tableAction,
    mermaidAction,
    drawioAction,
  ].forEach(action => toolbar.registerAction(action));
}
