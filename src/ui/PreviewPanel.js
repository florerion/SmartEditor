import DOMPurify from 'dompurify';

/**
 * Renders sanitised HTML into the preview pane and emits click events
 * carrying the source-line information for sync.
 */
export class PreviewPanel {
  /**
   * @param {HTMLElement} container
   * @param {object} opts
    * @param {Function} opts.onElementClick  ({ line, lineEnd, element, viewportRatio }) => void
   * @param {Function} opts.onScroll        () => void
   */
  constructor(container, opts) {
    this._container = container;
    this._onElementClick = opts.onElementClick ?? (() => {});
    this._onScroll = opts.onScroll ?? (() => {});
    this._scrollCallbacksSuspended = 0;
    this._container.classList.add('se-preview');
    this._container.style.overflowAnchor = 'none';
    this._boundClick = this._handleClick.bind(this);
    this._boundScroll = this._handleScroll.bind(this);
    this._container.addEventListener('click', this._boundClick);
    this._container.addEventListener('scroll', this._boundScroll, { passive: true });
  }

  /** @returns {HTMLElement} */
  getRoot() {
    return this._container;
  }

  /** @returns {string} current sanitised HTML */
  getHTML() {
    return this._container.innerHTML;
  }

  /**
   * Replace preview content with re-rendered HTML.
   * Scroll position is preserved across updates.
   * @param {string} html  raw HTML from markdown-it
   */
  render(html) {
    const clean = DOMPurify.sanitize(html, {
      ADD_TAGS: ['pre', 'code', 'select', 'option', 'button'],
      // Allow data-source-* attributes so sync continues to work after DOMPurify
      ADD_ATTR: [
        'data-source-line',
        'data-source-line-end',
        'class',
        'style',
        'target',
        'rel',
      ],
      ALLOW_DATA_ATTR: true,
    });

    const scrollTop = this._container.scrollTop;
    this._container.innerHTML = clean;
    this._container.scrollTop = scrollTop;
  }

  /** Remove all active sync highlights. */
  clearHighlight() {
    this._container
      .querySelectorAll('.se-sync-highlight')
      .forEach(el => el.classList.remove('se-sync-highlight'));
  }

  /** Temporarily silence preview scroll callbacks. */
  suspendScrollCallbacks() {
    this._scrollCallbacksSuspended += 1;
  }

  /** Re-enable preview scroll callbacks after suspension. */
  resumeScrollCallbacks() {
    this._scrollCallbacksSuspended = Math.max(0, this._scrollCallbacksSuspended - 1);
  }

  destroy() {
    this._container.removeEventListener('click', this._boundClick);
    this._container.removeEventListener('scroll', this._boundScroll);
  }

  // ------ private ------

  _handleClick(event) {
    const copyBtn = event.target.closest('.se-code-block__copy-btn');
    if (copyBtn) {
      this._handleCopyClick(copyBtn);
      return;
    }

    if (event.target.closest('.se-code-block__lang-select')) return;

    const el = event.target.closest('[data-source-line]');
    if (!el) return;
    const rootRect = this._container.getBoundingClientRect();
    const viewportRatio = rootRect.height > 0
      ? Math.max(0, Math.min(1, (event.clientY - rootRect.top) / rootRect.height))
      : 0.5;
    const line = parseInt(el.getAttribute('data-source-line'), 10);
    const rawEnd = el.getAttribute('data-source-line-end');
    const lineEnd = rawEnd != null ? parseInt(rawEnd, 10) : line;
    this._onElementClick({ line, lineEnd, element: el, viewportRatio });
  }

  _handleCopyClick(btn) {
    const block = btn.closest('.se-code-block');
    if (!block) return;
    const codeEl = block.querySelector('code');
    if (!codeEl) return;

    const text = codeEl.textContent ?? '';
    navigator.clipboard.writeText(text).then(() => {
      btn.classList.add('is-copied');
      btn.title = 'Copied!';
      setTimeout(() => {
        btn.classList.remove('is-copied');
        btn.title = 'Copy';
      }, 1500);
    }).catch(() => {
      // Clipboard API unavailable (non-HTTPS or permission denied) — silently ignore
    });
  }

  _handleScroll() {
    if (this._scrollCallbacksSuspended > 0) return;
    if (this._container.querySelector('.se-code-block__lang-select:focus')) return;
    this._onScroll();
  }
}
