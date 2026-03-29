/**
 * Action registry and toolbar renderer.
 *
 * Supports either the legacy action-derived layout or a declarative toolbar
 * config with explicit groups, display modes, and dropdown menus.
 */
export class Toolbar {
  /**
   * @param {HTMLElement} container
   * @param {() => object} getEditorAPI  Lazy accessor — avoids circular dependency
   * @param {object} [opts]
   * @param {(actionId: string, args?: object) => void} [opts.onActionRun]
   */
  constructor(container, getEditorAPI, opts = {}) {
    this._container = container;
    this._getAPI = getEditorAPI;
    this._onActionRun = opts.onActionRun ?? (() => {});
    /** @type {Map<string, object>} */
    this._actions = new Map();
    this._layoutConfig = null;
    this._renderedEntries = [];
    this._dropdownEntries = [];
    this._openDropdownId = null;
    this._closeDropdownTimer = null;
    this._dropdownCloseDelay = 160;
    this._disabled = false;

    this._boundDocumentPointerDown = this._handleDocumentPointerDown.bind(this);
    this._boundDocumentKeydown = this._handleDocumentKeydown.bind(this);

    this._container.classList.add('se-toolbar');
    this._container.setAttribute('role', 'toolbar');

    document.addEventListener('pointerdown', this._boundDocumentPointerDown);
    document.addEventListener('keydown', this._boundDocumentKeydown);
  }

  /**
   * Register an action (toolbar button).
   *
   * @param {object}   def
   * @param {string}   def.id
   * @param {string}   [def.label]       Text label
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
    this._actions.set(def.id, { order: 50, group: 'default', ...def });
    this._render();
    this.updateState();
  }

  /**
   * Remove an action by id.
   * @param {string} id
   */
  unregisterAction(id) {
    this._actions.delete(id);
    this._render();
    this.updateState();
  }

  /**
   * Replace toolbar layout configuration.
   * @param {object|null|undefined} config
   */
  setConfig(config) {
    this._layoutConfig = config ?? null;
    this._closeDropdown();
    this._render();
    this.updateState();
  }

  /**
   * @returns {object|null}
   */
  getConfig() {
    return this._layoutConfig;
  }

  /**
   * Run an action programmatically (e.g. via keyboard shortcut).
   * @param {string} id
   * @param {object} [args]
   */
  async runAction(id, args) {
    const action = this._actions.get(id);
    if (!action) return;
    await this._executeEntry(action, args);
  }

  /**
   * Refresh the enabled/active visual state of all buttons.
   * Call after cursor movement or selection change.
   */
  updateState() {
    const state = this._buildState();

    this._renderedEntries.forEach((entry) => {
      const enabled = this._disabled
        ? false
        : (entry.definition.isEnabled ? entry.definition.isEnabled(state) : true);
      const active = entry.definition.isActive ? entry.definition.isActive(state) : false;

      entry.element.disabled = !enabled;
      entry.element.classList.toggle(entry.activeClass, active);

      if (entry.pressed) {
        entry.element.setAttribute('aria-pressed', String(active));
      }
      if (entry.current) {
        if (active) entry.element.setAttribute('aria-current', 'true');
        else entry.element.removeAttribute('aria-current');
      }

      entry.enabled = enabled;
      entry.active = active;
    });

    this._dropdownEntries.forEach((dropdown) => {
      const interactiveChildren = dropdown.entries.filter((entry) => !entry.element.hidden);
      const anyEnabled = interactiveChildren.some((entry) => entry.enabled !== false);

      dropdown.trigger.disabled = this._disabled || !anyEnabled;
      dropdown.trigger.setAttribute('aria-expanded', String(this._openDropdownId === dropdown.id));
    });
  }

  /**
   * Enable or disable all toolbar interactions.
   * @param {boolean} disabled
   */
  setDisabled(disabled) {
    const nextDisabled = disabled === true;
    if (nextDisabled === this._disabled) return;
    this._disabled = nextDisabled;
    if (nextDisabled) this._closeDropdown();
    this.updateState();
  }

  destroy() {
    this._cancelScheduledClose();
    this._closeDropdown();
    document.removeEventListener('pointerdown', this._boundDocumentPointerDown);
    document.removeEventListener('keydown', this._boundDocumentKeydown);
    this._container.innerHTML = '';
    this._renderedEntries = [];
    this._dropdownEntries = [];
  }

  // ------ private ------

  _render() {
    this._cancelScheduledClose();
    this._container.innerHTML = '';
    this._renderedEntries = [];
    this._dropdownEntries = [];

    const groups = this._resolveGroups();
    let appendedGroups = 0;

    groups.forEach((group, groupIndex) => {
      const groupEl = document.createElement('div');
      groupEl.className = 'se-toolbar__group';

      group.items.forEach((item, itemIndex) => {
        const element = this._createLayoutItem(item, `${group.id}:${item.id ?? itemIndex}`);
        if (element) groupEl.appendChild(element);
      });

      if (!groupEl.childElementCount) return;

      if (appendedGroups > 0 && groupIndex >= 0) {
        const sep = document.createElement('span');
        sep.className = 'se-toolbar__sep';
        sep.setAttribute('aria-hidden', 'true');
        this._container.appendChild(sep);
      }

      this._container.appendChild(groupEl);
      appendedGroups += 1;
    });
  }

  _resolveGroups() {
    if (!this._layoutConfig?.groups) {
      return this._buildDefaultGroups();
    }

    const groupsSource = Array.isArray(this._layoutConfig.groups)
      ? this._layoutConfig.groups.map((group, index) => [group?.id ?? `group-${index}`, group])
      : Object.entries(this._layoutConfig.groups);

    return groupsSource
      .map(([fallbackId, group], index) => this._normalizeGroup(group, fallbackId, index))
      .filter(Boolean)
      .sort((a, b) => a.order - b.order);
  }

  _buildDefaultGroups() {
    const groupedActions = new Map();

    [...this._actions.values()].forEach((action) => {
      const groupId = action.group ?? 'default';
      if (!groupedActions.has(groupId)) groupedActions.set(groupId, []);
      groupedActions.get(groupId).push(action);
    });

    const groups = [...groupedActions.entries()]
      .map(([groupId, actions], index) => ({
        id: groupId,
        order: Math.min(...actions.map((action) => action.order ?? 50), index * 100),
        items: actions
          .slice()
          .sort((a, b) => (a.order ?? 50) - (b.order ?? 50))
          .map((action) => ({ type: 'action', id: action.id, action: action.id })),
      }))
      .sort((a, b) => a.order - b.order);

    const themeSelectorGroup = this._buildThemeSelectorGroup();
    if (themeSelectorGroup) groups.push(themeSelectorGroup);

    return groups;
  }

  _buildThemeSelectorGroup() {
    const api = this._getAPI?.();
    if (!api || typeof api.getAvailableThemes !== 'function' || typeof api.setTheme !== 'function') {
      return null;
    }

    const availableThemes = api.getAvailableThemes();
    if (!Array.isArray(availableThemes) || !availableThemes.length) return null;

    const themeEntries = [
      {
        id: 'theme-auto',
        label: 'Auto',
        icon: this._buildAutoThemeIcon(),
        display: 'icon-label',
        run: (runtimeApi) => runtimeApi.setTheme('auto'),
        isActive: (state) => state.theme === 'auto',
      },
      ...availableThemes.map((theme) => ({
        id: `theme-${theme.id}`,
        label: theme.label ?? theme.id,
        title: theme.description ?? theme.label ?? theme.id,
        icon: this._buildThemeSwatchIcon(theme),
        display: 'icon-label',
        run: (runtimeApi) => runtimeApi.setTheme(theme.id),
        isActive: (state) => state.theme === theme.id,
      })),
    ];

    return {
      id: 'theme',
      order: 10_000,
      items: [
        {
          type: 'dropdown',
          id: 'theme-selector',
          label: 'Theme',
          title: 'Select editor theme',
          icon: this._buildThemeDropdownIcon(),
          display: 'icon-label',
          items: themeEntries,
        },
      ],
    };
  }

  _buildThemeDropdownIcon() {
    return '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 1a5 5 0 0 0 0 10c.7 0 1.2.57 1.2 1.27 0 .62-.42 1.15-1.02 1.27A6.5 6.5 0 1 1 14.5 8c0 .45-.37.82-.82.82H12.5a.7.7 0 0 0-.7.7c0 .7-.57 1.27-1.27 1.27H8.7a2 2 0 0 1-2-2C6.7 7.25 7.95 6 9.5 6h2.2a.7.7 0 0 0 .7-.7A4.4 4.4 0 0 0 8 1Zm-3 5.1a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm3.1-1A1 1 0 1 0 8.1 3a1 1 0 0 0 0 2.1Zm3 1A1 1 0 1 0 11.1 4a1 1 0 0 0 0 2.1Z"/></svg>';
  }

  _buildAutoThemeIcon() {
    return '<svg class="se-theme-auto-icon" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="#9ca3af"/><path d="M8 2a6 6 0 0 1 0 12Z" fill="#111827"/></svg>';
  }

  _buildThemeSwatchIcon(theme) {
    const swatch = theme?.swatch ?? {};
    const bg = swatch.bg ?? '#ffffff';
    const accent = swatch.accent ?? '#3b82f6';
    const border = swatch.border ?? '#d0d7de';

    return `<svg class="se-theme-swatch-icon" viewBox="0 0 16 16" aria-hidden="true"><rect x="1.2" y="1.2" width="13.6" height="13.6" rx="3" fill="${bg}" stroke="${border}" stroke-width="1.2"/><circle cx="11.5" cy="4.5" r="2.1" fill="${accent}"/></svg>`;
  }

  _normalizeGroup(group, fallbackId, index) {
    if (!group || !Array.isArray(group.items)) return null;
    const normalizedItems = group.items
      .map((item, itemIndex) => this._normalizeItem(item, `${fallbackId}:${itemIndex}`))
      .filter(Boolean);

    return {
      id: group.id ?? fallbackId,
      order: Number.isFinite(group.order) ? group.order : index * 100,
      items: normalizedItems,
    };
  }

  _normalizeItem(item, fallbackId) {
    if (typeof item === 'string') {
      return { type: 'action', id: item, action: item };
    }
    if (!item || typeof item !== 'object') return null;
    if (Array.isArray(item.items)) return { ...item, type: 'dropdown', id: item.id ?? fallbackId };
    if (typeof item.action === 'string') return { ...item, type: 'action', id: item.id ?? item.action };
    if (typeof item.run === 'function') return { ...item, type: 'item', id: item.id ?? fallbackId };
    return null;
  }

  _createLayoutItem(item, fallbackId) {
    if (item.type === 'dropdown') {
      return this._createDropdown(item, fallbackId);
    }

    const definition = this._resolveEntryDefinition(item, fallbackId);
    if (!definition) return null;
    return this._createInteractiveButton(definition, { menu: false });
  }

  _createDropdown(item, fallbackId) {
    const dropdownId = item.id ?? fallbackId;
    const label = item.label ?? item.title ?? dropdownId;
    const icon = item.icon;
    const display = item.display ?? this._inferDisplayMode({ icon, label });

    const wrapper = document.createElement('div');
    wrapper.className = 'se-toolbar__dropdown';
    wrapper.dataset.dropdownId = dropdownId;

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'se-toolbar__btn se-toolbar__btn--dropdown';
    trigger.dataset.dropdownTrigger = dropdownId;
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.title = item.title ?? label;
    trigger.setAttribute('aria-label', item.title ?? label);
    this._setButtonContent(trigger, { icon, label, display, fallbackText: label, chevron: true });

    const menu = document.createElement('div');
    menu.className = 'se-toolbar__menu';
    menu.setAttribute('role', 'menu');

    const entries = item.items
      .map((child, index) => this._normalizeItem(child, `${dropdownId}:${index}`))
      .map((child, index) => this._createDropdownEntry(child, `${dropdownId}:${index}`))
      .filter(Boolean);

    entries.forEach((entry) => menu.appendChild(entry.element));

    if (!entries.length) return null;

    wrapper.addEventListener('mouseenter', () => {
      this._cancelScheduledClose();
      this._openDropdown(dropdownId);
    });
    wrapper.addEventListener('mouseleave', () => {
      if (this._openDropdownId === dropdownId) this._scheduleCloseDropdown(dropdownId);
    });
    wrapper.addEventListener('focusin', () => {
      this._cancelScheduledClose();
      this._openDropdown(dropdownId);
    });
    wrapper.addEventListener('focusout', (event) => {
      if (!wrapper.contains(event.relatedTarget) && this._openDropdownId === dropdownId) {
        this._scheduleCloseDropdown(dropdownId);
      }
    });

    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      this._cancelScheduledClose();
      if (this._openDropdownId === dropdownId) this._closeDropdown(dropdownId);
      else this._openDropdown(dropdownId);
    });
    trigger.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this._openDropdown(dropdownId);
        entries[0]?.element.focus();
      }
    });

    wrapper.appendChild(trigger);
    wrapper.appendChild(menu);

    this._dropdownEntries.push({ id: dropdownId, wrapper, trigger, entries });
    return wrapper;
  }

  _createDropdownEntry(item, fallbackId) {
    if (!item || item.type === 'dropdown') {
      console.warn('[Toolbar] Nested dropdowns are not supported and were skipped.');
      return null;
    }

    const definition = this._resolveEntryDefinition(item, fallbackId);
    if (!definition) return null;

    const element = this._createInteractiveButton(definition, { menu: true });
    element.addEventListener('click', () => {
      this._closeDropdown();
    });

    return this._renderedEntries[this._renderedEntries.length - 1] ?? null;
  }

  _resolveEntryDefinition(item, fallbackId) {
    if (item.type === 'action') {
      const action = this._actions.get(item.action);
      if (!action) {
        console.warn(`[Toolbar] Action "${item.action}" not found in current toolbar config.`);
        return null;
      }

      return {
        id: item.id ?? action.id,
        label: item.label ?? action.label ?? action.title ?? action.id,
        icon: item.icon ?? action.icon,
        title: item.title ?? action.title ?? action.label ?? action.id,
        shortcut: item.shortcut ?? action.shortcut,
        display: item.display ?? this._inferDisplayMode({ icon: item.icon ?? action.icon, label: item.label ?? action.label }),
        run: action.run,
        isEnabled: action.isEnabled,
        isActive: action.isActive,
        args: item.args,
      };
    }

    return {
      id: item.id ?? fallbackId,
      label: item.label ?? item.title ?? fallbackId,
      icon: item.icon,
      title: item.title ?? item.label ?? item.id ?? fallbackId,
      shortcut: item.shortcut,
      display: item.display ?? this._inferDisplayMode(item),
      run: item.run,
      isEnabled: item.isEnabled,
      isActive: item.isActive,
      args: item.args,
    };
  }

  _createInteractiveButton(definition, { menu }) {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = menu ? 'se-toolbar__menu-item' : 'se-toolbar__btn';
    element.dataset.toolbarItemId = definition.id;

    const tooltip = [definition.title ?? definition.label ?? definition.id, definition.shortcut]
      .filter(Boolean)
      .join(' — ');
    element.title = tooltip;
    element.setAttribute('aria-label', definition.title ?? definition.label ?? definition.id);
    if (menu) {
      element.setAttribute('role', 'menuitem');
    } else {
      element.setAttribute('aria-pressed', 'false');
    }

    this._setButtonContent(element, {
      icon: definition.icon,
      label: definition.label,
      display: definition.display,
      fallbackText: definition.label ?? definition.id,
      chevron: false,
    });

    element.addEventListener('click', async () => {
      await this._executeEntry(definition, definition.args);
    });

    this._renderedEntries.push({
      element,
      definition,
      activeClass: menu ? 'se-toolbar__menu-item--active' : 'se-toolbar__btn--active',
      pressed: !menu,
      current: menu,
      enabled: true,
      active: false,
    });

    return element;
  }

  _setButtonContent(element, { icon, label, display, fallbackText, chevron }) {
    element.innerHTML = '';

    const mode = display ?? this._inferDisplayMode({ icon, label });
    const showIcon = icon && mode !== 'label';
    const showLabel = mode !== 'icon';

    if (showIcon) {
      const iconEl = document.createElement('span');
      iconEl.className = 'se-toolbar__icon';
      iconEl.setAttribute('aria-hidden', 'true');
      iconEl.innerHTML = icon;
      element.appendChild(iconEl);
    }

    if (showLabel || !showIcon) {
      const labelEl = document.createElement('span');
      labelEl.className = 'se-toolbar__label';
      labelEl.textContent = label ?? fallbackText;
      element.appendChild(labelEl);
    }

    if (chevron) {
      const chevronEl = document.createElement('span');
      chevronEl.className = 'se-toolbar__chevron';
      chevronEl.setAttribute('aria-hidden', 'true');
      chevronEl.textContent = '▾';
      element.appendChild(chevronEl);
    }
  }

  _inferDisplayMode(item) {
    if (item.display) return item.display;
    if (item.icon && item.label) return 'icon-label';
    if (item.icon) return 'icon';
    return 'label';
  }

  async _executeEntry(definition, args) {
    if (this._disabled) return;

    const api = this._getAPI();
    const state = this._buildState();
    if (definition.isEnabled && !definition.isEnabled(state)) return;

    try {
      await definition.run(api, state, args);
      this._onActionRun(definition.id, args);
    } catch (error) {
      console.error(`[Toolbar] Error in entry "${definition.id}":`, error);
    }

    this.updateState();
  }

  _openDropdown(id) {
    this._cancelScheduledClose();
    if (this._openDropdownId === id) {
      this._syncDropdownState();
      return;
    }

    this._openDropdownId = id;
    this._syncDropdownState();
  }

  _closeDropdown(id = this._openDropdownId) {
    this._cancelScheduledClose();
    if (!id) return;
    if (this._openDropdownId === id) {
      this._openDropdownId = null;
      this._syncDropdownState();
    }
  }

  _scheduleCloseDropdown(id = this._openDropdownId) {
    if (!id) return;
    this._cancelScheduledClose();
    this._closeDropdownTimer = setTimeout(() => {
      this._closeDropdownTimer = null;
      if (this._openDropdownId === id) this._closeDropdown(id);
    }, this._dropdownCloseDelay);
  }

  _cancelScheduledClose() {
    clearTimeout(this._closeDropdownTimer);
    this._closeDropdownTimer = null;
  }

  _syncDropdownState() {
    this._dropdownEntries.forEach((dropdown) => {
      const isOpen = dropdown.id === this._openDropdownId;
      dropdown.wrapper.classList.toggle('se-toolbar__dropdown--open', isOpen);
      dropdown.trigger.setAttribute('aria-expanded', String(isOpen));
    });
  }

  _handleDocumentPointerDown(event) {
    if (!this._openDropdownId) return;
    if (this._container.contains(event.target)) return;
    this._cancelScheduledClose();
    this._closeDropdown();
  }

  _handleDocumentKeydown(event) {
    if (event.key !== 'Escape' || !this._openDropdownId) return;
    this._cancelScheduledClose();
    this._closeDropdown();
  }

  _buildState() {
    const api = this._getAPI();
    if (!api) return {};

    const selection = api.getSelection();
    return {
      selection,
      markdown: api.getMarkdown(),
      cursorLine: selection?.lineFrom ?? 0,
      theme: typeof api.getTheme === 'function' ? api.getTheme() : 'auto',
    };
  }
}
