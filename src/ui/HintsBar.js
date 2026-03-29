const HISTORY_CAPACITY = 10;

/**
 * Bottom status hint bar with throttling, history navigation, and ghost state.
 *
 * States:
 *   hidden  — bar not visible, history is empty
 *   ghost   — bar visible with only the ‹ button; history exists but no live hint
 *   live    — bar visible with live hint text + auto-hide timer
 *   browsing — bar visible with a past history entry + auto-hide timer
 *
 * Throttling: a new hint queued while one is already visible waits until the
 * current one is dismissed or auto-hides (last queued hint wins).
 */
export class HintsBar {
  /**
   * @param {HTMLElement} container
   * @param {object} [opts]
   * @param {number} [opts.autoHideMs=5000]  0 to disable auto-hide
   * @param {boolean} [opts.dismissible=true]
   * @param {(reason: string) => void} [opts.onDismiss]
   */
  constructor(container, opts = {}) {
    this._container = container;
    this._autoHideMs = Number.isFinite(opts.autoHideMs) ? Math.max(0, opts.autoHideMs) : 5000;
    this._dismissible = opts.dismissible !== false;
    this._onDismiss = opts.onDismiss ?? (() => {});
    this._hideTimer = null;

    // Throttle: last pending hint waiting to be shown once current slot is free.
    this._pendingText = null;

    // Ring buffer of the last HISTORY_CAPACITY displayed hint texts (most recent last).
    this._history = [];
    // Index into _history while browsing; -1 = live tip (not browsing).
    this._historyIndex = -1;
    // True when bar is visible in ghost mode (only ‹ button, no hint text).
    this._isGhost = false;

    this._container.classList.add('se-hints-bar');
    this._container.setAttribute('aria-live', 'polite');
    this._container.setAttribute('aria-atomic', 'true');
    this._container.setAttribute('aria-hidden', 'true');
    this._container.hidden = true;

    this._boundClick = this._handleClick.bind(this);
    this._container.addEventListener('click', this._boundClick);
  }

  /**
   * @param {object} opts
   * @param {number} [opts.autoHideMs]
   * @param {boolean} [opts.dismissible]
   */
  setConfig(opts = {}) {
    if (Number.isFinite(opts.autoHideMs)) {
      this._autoHideMs = Math.max(0, opts.autoHideMs);
    }
    if (typeof opts.dismissible === 'boolean') {
      this._dismissible = opts.dismissible;
    }
  }

  /**
   * Show a hint. If another hint is currently visible, the new text is queued
   * and shown as soon as the current one is dismissed or auto-hides.
   * Multiple calls while throttling is active keep only the latest text.
   * @param {string} text
   * @param {object} [opts]
   * @param {boolean} [opts.force=false] Replace current hint immediately
   */
  show(text, opts = {}) {
    if (typeof text !== 'string' || !text.trim()) return;
    const normalized = text.trim();
    const force = opts?.force === true;

    if (force) {
      // Force mode is used for explicit user clicks (toolbar actions).
      // The requested hint should win immediately over the currently visible one.
      this._showNow(normalized);
      return;
    }

    // Ghost state: swap straight to a live hint (no throttle needed).
    if (this._isGhost) {
      this._showNow(normalized);
      return;
    }

    // Throttle: live or browsing hint is visible — queue and wait.
    if (!this._container.hidden) {
      this._pendingText = normalized;
      return;
    }

    this._showNow(normalized);
  }

  /**
   * @param {string} [reason='clear']
   */
  clear(reason = 'clear') {
    clearTimeout(this._hideTimer);
    this._hideTimer = null;
    this._pendingText = null;
    this._historyIndex = -1;
    this._isGhost = false;
    this._container.classList.remove('se-hints-bar--ghost');
    this._container.classList.remove('se-hints-bar--is-entering');
    this._container.classList.remove('se-hints-bar--is-leaving');
    this._container.innerHTML = '';
    this._container.hidden = true;
    this._container.setAttribute('aria-hidden', 'true');
    if (reason === 'dismiss' || reason === 'timeout') {
      this._onDismiss(reason);
    }
  }

  destroy() {
    clearTimeout(this._hideTimer);
    this._hideTimer = null;
    this._container.removeEventListener('click', this._boundClick);
    this._container.classList.remove('se-hints-bar--ghost');
    this._container.classList.remove('se-hints-bar--is-entering');
    this._container.classList.remove('se-hints-bar--is-leaving');
    this._container.innerHTML = '';
    this._container.hidden = true;
  }

  // ---- private ----

  _showNow(text) {
    clearTimeout(this._hideTimer);
    this._hideTimer = null;
    this._historyIndex = -1;
    this._isGhost = false;
    this._pendingText = null;

    _pushHistory(this._history, text);
    this._paint(text);
    this._startAutoHide();
  }

  _showHistoryEntry(index) {
    if (index < 0 || index >= this._history.length) return;
    clearTimeout(this._hideTimer);
    this._hideTimer = null;
    this._historyIndex = index;
    this._isGhost = false;
    this._paint(this._history[index]);
    // Auto-hide history entries the same as live hints.
    this._startAutoHide();
  }

  _startAutoHide() {
    if (this._autoHideMs > 0) {
      this._hideTimer = setTimeout(() => {
        this._hideTimer = null;
        this._onSlotFree('timeout');
      }, this._autoHideMs);
    }
  }

  /**
   * Enter ghost state: bar stays visible showing only the ‹ button.
   * Allows the user to recall any previous hint at any time.
   */
  _enterGhost() {
    clearTimeout(this._hideTimer);
    this._hideTimer = null;
    this._historyIndex = -1;
    this._isGhost = true;
    this._container.classList.add('se-hints-bar--ghost');
    this._container.classList.remove('se-hints-bar--is-leaving');
    this._container.hidden = false;
    this._container.setAttribute('aria-hidden', 'true');
    this._container.innerHTML = `
      <span class="se-hints-bar__label" aria-hidden="true">Hint</span>
      <button
        type="button"
        class="se-hints-bar__prev"
        data-se-hint-prev
        aria-label="Show previous hint"
        title="Show previous hint"
      >&#8249;</button>
    `;
    this._animateIn();
  }

  _paint(text) {
    const hasPrev = this._historyIndex === -1
      ? this._history.length > 1
      : this._historyIndex > 0;
    const hasNext = this._historyIndex !== -1 && this._historyIndex < this._history.length - 1;

    this._isGhost = false;
    this._container.classList.remove('se-hints-bar--ghost');
    this._container.classList.remove('se-hints-bar--is-leaving');
    this._container.hidden = false;
    this._container.setAttribute('aria-hidden', 'false');
    this._container.innerHTML = `
      <span class="se-hints-bar__label" aria-hidden="true">Hint</span>
      <button
        type="button"
        class="se-hints-bar__prev"
        data-se-hint-prev
        aria-label="Previous hint"
        title="Previous hint"
        ${hasPrev ? '' : 'style="display:none"'}
      >&#8249;</button>
      <button
        type="button"
        class="se-hints-bar__next"
        data-se-hint-next
        aria-label="Next hint"
        title="Next hint"
        ${hasNext ? '' : 'style="display:none"'}
      >&#8250;</button>
      <button
        type="button"
        class="se-hints-bar__dismiss"
        data-se-hint-dismiss
        aria-label="Dismiss hint"
        title="Dismiss hint"
      >&#215;</button>
      <span class="se-hints-bar__content">${_escapeHtml(text)}</span>
    `;
    this._animateIn();
  }

  _onSlotFree(reason) {
    this._historyIndex = -1;
    this._isGhost = false;

    if (reason === 'dismiss' || reason === 'timeout') {
      this._onDismiss(reason);
    }

    if (this._pendingText) {
      const next = this._pendingText;
      this._pendingText = null;
      this._showNow(next);
    } else if (this._history.length > 0) {
      // Stay visible in ghost mode so the user can recall past hints.
      this._enterGhost();
    } else {
      this._container.classList.remove('se-hints-bar--ghost');
      this._container.classList.remove('se-hints-bar--is-entering');
      this._container.classList.remove('se-hints-bar--is-leaving');
      this._container.innerHTML = '';
      this._container.hidden = true;
      this._container.setAttribute('aria-hidden', 'true');
    }
  }

  _animateIn() {
    this._container.classList.remove('se-hints-bar--is-leaving');
    this._container.classList.add('se-hints-bar--is-entering');
    requestAnimationFrame(() => {
      this._container.classList.remove('se-hints-bar--is-entering');
    });
  }

  _handleClick(event) {
    if (event.target.closest('[data-se-hint-dismiss]')) {
      event.preventDefault();
      // Explicit dismiss: also discard the pending queue.
      this._pendingText = null;
      this._onSlotFree('dismiss');
      return;
    }

    if (event.target.closest('[data-se-hint-prev]')) {
      event.preventDefault();
      if (this._isGhost) {
        // From ghost state: recall the most recent history entry.
        this._showHistoryEntry(this._history.length - 1);
      } else {
        const currentIndex = this._historyIndex === -1
          ? this._history.length - 1
          : this._historyIndex;
        this._showHistoryEntry(currentIndex - 1);
      }
      return;
    }

    if (event.target.closest('[data-se-hint-next]')) {
      event.preventDefault();
      if (this._historyIndex !== -1 && this._historyIndex < this._history.length - 1) {
        this._showHistoryEntry(this._historyIndex + 1);
      }
    }
  }
}

/**
 * Append text to the history array (max HISTORY_CAPACITY entries).
 * Duplicate of the last entry is skipped.
 * @param {string[]} history  mutable array
 * @param {string} text
 */
function _pushHistory(history, text) {
  if (history.at(-1) === text) return; // skip exact duplicate of most recent
  history.push(text);
  if (history.length > HISTORY_CAPACITY) {
    history.shift();
  }
}

function _escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
