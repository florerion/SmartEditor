/**
 * Global loading overlay rendered above the editor layout.
 */
export class LoadingOverlay {
  /**
   * @param {HTMLElement} container
   * @param {object} [opts]
   * @param {(token?: string) => void} [opts.onCancel]
   * @param {number} [opts.showDelayMs=140]
   * @param {number} [opts.minVisibleMs=180]
   * @param {object} [opts.texts]
   * @param {string} [opts.texts.defaultLabel='Working...']
   * @param {string} [opts.texts.cancel='Cancel']
   */
  constructor(container, opts = {}) {
    this._container = container;
    this._onCancel = opts.onCancel ?? (() => {});
    this._showDelayMs = Number.isFinite(opts.showDelayMs) ? Math.max(0, opts.showDelayMs) : 140;
    this._minVisibleMs = Number.isFinite(opts.minVisibleMs) ? Math.max(0, opts.minVisibleMs) : 180;
    this._texts = {
      defaultLabel: _normalizeText(opts.texts?.defaultLabel, 'Working...'),
      cancel: _normalizeText(opts.texts?.cancel, 'Cancel'),
    };
    this._busy = false;
    this._visible = false;
    this._shownAt = 0;
    this._pendingPayload = null;
    this._showTimer = null;
    this._hideTimer = null;

    this._container.classList.add('se-loading-overlay');
    this._container.setAttribute('aria-hidden', 'true');
    this._boundClick = this._handleClick.bind(this);
    this._container.addEventListener('click', this._boundClick);
  }

  /**
   * @param {object} payload
   * @param {boolean} payload.busy
   * @param {string} payload.label
   * @param {string} [payload.detail]
   * @param {boolean} [payload.canCancel=false]
   * @param {string|null} [payload.cancelToken=null]
   */
  render(payload) {
    const busy = payload?.busy === true;
    const label = typeof payload?.label === 'string' && payload.label.trim()
      ? payload.label.trim()
      : this._texts.defaultLabel;
    const detail = typeof payload?.detail === 'string' ? payload.detail.trim() : '';
    const canCancel = payload?.canCancel === true;
    const cancelToken = typeof payload?.cancelToken === 'string' ? payload.cancelToken : '';
    const cancelLabel = _normalizeText(payload?.cancelLabel, this._texts.cancel);

    const normalizedPayload = {
      busy,
      label,
      detail,
      canCancel,
      cancelToken,
      cancelLabel,
    };

    this._busy = busy;

    if (!busy) {
      this._pendingPayload = null;
      clearTimeout(this._showTimer);
      this._showTimer = null;
      this._hideLater();
      return;
    }

    clearTimeout(this._hideTimer);
    this._hideTimer = null;

    if (this._visible) {
      this._paint(normalizedPayload);
      return;
    }

    this._pendingPayload = normalizedPayload;
    if (this._showTimer !== null) return;

    if (this._showDelayMs === 0) {
      this._showNow();
      return;
    }

    this._showTimer = setTimeout(() => {
      this._showTimer = null;
      if (!this._busy) return;
      this._showNow();
    }, this._showDelayMs);
  }

  _showNow() {
    const payload = this._pendingPayload;
    if (!payload || !this._busy) return;

    this._visible = true;
    this._shownAt = Date.now();
    this._container.setAttribute('aria-hidden', 'false');
    this._paint(payload);
  }

  _hideLater() {
    if (!this._visible) {
      this._container.innerHTML = '';
      this._container.setAttribute('aria-hidden', 'true');
      return;
    }

    clearTimeout(this._hideTimer);
    const elapsed = Date.now() - this._shownAt;
    const waitMs = Math.max(0, this._minVisibleMs - elapsed);

    this._hideTimer = setTimeout(() => {
      this._hideTimer = null;
      if (this._busy) return;
      this._visible = false;
      this._shownAt = 0;
      this._container.innerHTML = '';
      this._container.setAttribute('aria-hidden', 'true');
    }, waitMs);
  }

  _paint(payload) {
    this._container.innerHTML = `
      <div class="se-loading-overlay__card" role="status" aria-live="polite" aria-atomic="true">
        <div class="se-loading-overlay__spinner" aria-hidden="true"></div>
        <p class="se-loading-overlay__label">${_escapeHtml(payload.label)}</p>
        <p class="se-loading-overlay__detail">${payload.detail ? _escapeHtml(payload.detail) : ''}</p>
        <div class="se-loading-overlay__actions">
          <button
            type="button"
            class="se-loading-overlay__cancel"
            data-se-busy-cancel
            data-se-busy-token="${_escapeAttr(payload.cancelToken)}"
            ${payload.canCancel ? '' : 'hidden'}
          >
            ${_escapeHtml(payload.cancelLabel)}
          </button>
        </div>
      </div>
    `;
  }

  destroy() {
    clearTimeout(this._showTimer);
    clearTimeout(this._hideTimer);
    this._showTimer = null;
    this._hideTimer = null;
    this._pendingPayload = null;
    this._container.removeEventListener('click', this._boundClick);
    this._container.innerHTML = '';
    this._container.setAttribute('aria-hidden', 'true');
  }

  _handleClick(event) {
    const btn = event.target.closest('[data-se-busy-cancel]');
    if (!btn || !this._busy) return;

    const token = btn.getAttribute('data-se-busy-token') || undefined;
    this._onCancel(token);
  }
}

function _escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function _escapeAttr(value) {
  return _escapeHtml(value).replaceAll('"', '&quot;');
}

function _normalizeText(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim();
  return normalized || fallback;
}
