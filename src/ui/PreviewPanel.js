import DOMPurify from 'dompurify';

/**
 * Renders sanitised HTML into the preview pane and emits click events
 * carrying the source-line information for sync.
 */
export class PreviewPanel {
  /**
   * @param {HTMLElement} container
   * @param {object} opts
   * @param {Function} opts.onElementClick  ({ line, lineEnd, element }) => void
   * @param {Function} opts.onScroll        () => void
   */
  constructor(container, opts) {
    this._container = container;
    this._onElementClick = opts.onElementClick ?? (() => {});
    this._onScroll = opts.onScroll ?? (() => {});
    this._container.classList.add('mde-preview');
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
      ADD_TAGS: ['pre', 'code'],
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
      .querySelectorAll('.mde-sync-highlight')
      .forEach(el => el.classList.remove('mde-sync-highlight'));
  }

  destroy() {
    this._container.removeEventListener('click', this._boundClick);
    this._container.removeEventListener('scroll', this._boundScroll);
  }

  // ------ private ------

  _handleClick(event) {
    const el = event.target.closest('[data-source-line]');
    if (!el) return;
    const line = parseInt(el.getAttribute('data-source-line'), 10);
    const rawEnd = el.getAttribute('data-source-line-end');
    const lineEnd = rawEnd != null ? parseInt(rawEnd, 10) : line;
    this._onElementClick({ line, lineEnd, element: el });
  }

  _handleScroll() {
    this._onScroll();
  }
}
