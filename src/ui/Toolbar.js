/**
 * Action registry and toolbar renderer.
 *
 * Actions are grouped and sorted by their `order` property.
 * A separator is rendered between adjacent groups.
 */
export class Toolbar {
  /**
   * @param {HTMLElement} container
   * @param {() => object} getEditorAPI  Lazy accessor — avoids circular dependency
   */
  constructor(container, getEditorAPI) {
    this._container = container;
    this._getAPI = getEditorAPI;
    /** @type {Map<string, object>} id → action definition */
    this._actions = new Map();
    /** @type {Map<string, string[]>} groupName → ordered list of action ids */
    this._groups = new Map();

    this._container.classList.add('mde-toolbar');
    this._container.setAttribute('role', 'toolbar');
  }

  /**
   * Register an action (toolbar button).
   *
   * @param {object}   def
   * @param {string}   def.id
   * @param {string}   [def.label]       Text label (used if no icon)
   * @param {string}   [def.icon]        SVG string / Unicode char
   * @param {string}   [def.title]       Tooltip text
   * @param {string}   [def.group]       Group name for visual grouping (default: 'default')
   * @param {number}   [def.order]       Sort order within group (default: 50)
   * @param {string}   [def.shortcut]    Displayed in tooltip, e.g. 'Ctrl+B'
   * @param {Function} [def.isEnabled]   (state) => boolean
   * @param {Function} [def.isActive]    (state) => boolean
   * @param {Function} def.run           async (api, state, args?) => void
   */
  registerAction(def) {
    if (this._actions.has(def.id)) {
      console.warn(`[Toolbar] Action "${def.id}" already registered — overwriting.`);
    }
    const action = { order: 50, group: 'default', ...def };
    this._actions.set(action.id, action);

    const groupId = action.group;
    if (!this._groups.has(groupId)) this._groups.set(groupId, []);
    const group = this._groups.get(groupId);
    if (!group.includes(action.id)) group.push(action.id);

    this._render();
  }

  /**
   * Remove an action by id.
   * @param {string} id
   */
  unregisterAction(id) {
    this._actions.delete(id);
    this._groups.forEach(ids => {
      const idx = ids.indexOf(id);
      if (idx !== -1) ids.splice(idx, 1);
    });
    this._render();
  }

  /**
   * Run an action programmatically (e.g. via keyboard shortcut).
   * @param {string} id
   * @param {object} [args]
   */
  async runAction(id, args) {
    const action = this._actions.get(id);
    if (!action) return;
    const api = this._getAPI();
    const state = this._buildState();
    if (action.isEnabled && !action.isEnabled(state)) return;
    await action.run(api, state, args);
  }

  /**
   * Refresh the enabled/active visual state of all buttons.
   * Call after cursor movement or selection change.
   */
  updateState() {
    const state = this._buildState();
    this._container.querySelectorAll('[data-action-id]').forEach(btn => {
      const action = this._actions.get(btn.dataset.actionId);
      if (!action) return;
      const enabled = action.isEnabled ? action.isEnabled(state) : true;
      const active = action.isActive ? action.isActive(state) : false;
      btn.disabled = !enabled;
      btn.classList.toggle('mde-toolbar__btn--active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  }

  // ------ private ------

  _render() {
    this._container.innerHTML = '';

    // Sort groups by the minimum order value among their actions
    const sortedGroups = [...this._groups.entries()]
      .filter(([, ids]) => ids.length > 0)
      .sort(([, aIds], [, bIds]) => {
        const aMin = Math.min(...aIds.map(id => this._actions.get(id)?.order ?? 50));
        const bMin = Math.min(...bIds.map(id => this._actions.get(id)?.order ?? 50));
        return aMin - bMin;
      });

    sortedGroups.forEach(([, ids], groupIndex) => {
      if (groupIndex > 0) {
        const sep = document.createElement('span');
        sep.className = 'mde-toolbar__sep';
        sep.setAttribute('aria-hidden', 'true');
        this._container.appendChild(sep);
      }

      const sortedIds = [...ids].sort(
        (a, b) => (this._actions.get(a)?.order ?? 50) - (this._actions.get(b)?.order ?? 50),
      );

      sortedIds.forEach(id => {
        const action = this._actions.get(id);
        if (action) this._container.appendChild(this._createButton(action));
      });
    });
  }

  _createButton(action) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mde-toolbar__btn';
    btn.dataset.actionId = action.id;

    const tooltip = [action.title ?? action.label ?? action.id, action.shortcut]
      .filter(Boolean).join(' — ');
    btn.title = tooltip;
    btn.setAttribute('aria-label', action.title ?? action.label ?? action.id);
    btn.setAttribute('aria-pressed', 'false');

    if (action.icon) {
      btn.innerHTML = action.icon;
    } else {
      btn.textContent = action.label ?? action.id;
    }

    btn.addEventListener('click', async () => {
      const api = this._getAPI();
      const state = this._buildState();
      try {
        await action.run(api, state);
      } catch (e) {
        console.error(`[Toolbar] Error in action "${action.id}":`, e);
      }
      this.updateState();
    });

    return btn;
  }

  _buildState() {
    const api = this._getAPI();
    if (!api) return {};
    return {
      selection: api.getSelection(),
      markdown: api.getMarkdown(),
      cursorLine: api.getSelection()?.lineFrom ?? 0,
    };
  }
}
