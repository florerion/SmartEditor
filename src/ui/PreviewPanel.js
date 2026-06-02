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

  _sanitize(html) {
    return DOMPurify.sanitize(html, {
      ADD_TAGS: ['pre', 'code', 'select', 'option', 'button', 'input', 'details', 'summary'],
      // Allow data-source-* attributes so sync continues to work after DOMPurify
      ADD_ATTR: [
        'data-source-line',
        'data-source-line-end',
        'data-se-markdown-src',
        'class',
        'style',
        'type',
        'checked',
        'target',
        'rel',
      ],
      ALLOW_DATA_ATTR: true,
    });
  }

  /**
   * Replace preview content with re-rendered HTML.
   * Scroll position is preserved across updates.
   * @param {string} html  raw HTML from markdown-it
   */
  render(html) {
    const clean = this._sanitize(html);

    const scrollTop = this._container.scrollTop;
    this._container.innerHTML = clean;
    this._container.scrollTop = scrollTop;

    return {
      changedRoots: [this._container],
      fullReplace: true,
    };
  }

  /**
   * Patch preview content using block wrappers to avoid full-root replacement.
   * @param {Array<{ html: string, reuse?: boolean, lineDelta?: number }>} blocks
   * @returns {{ changedRoots: HTMLElement[], fullReplace: boolean }}
   */
  renderBlocks(blocks) {
    const scrollTop = this._container.scrollTop;
    const wrappers = Array.from(this._container.querySelectorAll('[data-se-preview-block]'));
    const needsRebuild = wrappers.length !== blocks.length;

    if (needsRebuild) {
      this._container.innerHTML = '';
      const fragment = document.createDocumentFragment();
      const changedRoots = [];

      blocks.forEach((block, index) => {
        const wrapper = document.createElement('div');
        wrapper.setAttribute('data-se-preview-block', String(index));
        wrapper.innerHTML = this._sanitize(block.html);
        // On full wrapper rebuild we must use absolute line offsets,
        // because reused blocks carry relative deltas intended for in-place patching.
        const lineDelta = Number.isFinite(block.startLine) ? block.startLine : 0;
        if (lineDelta !== 0) {
          this._shiftSourceLineAttrsInNode(wrapper, lineDelta);
        }
        fragment.appendChild(wrapper);
        changedRoots.push(wrapper);
      });

      this._container.appendChild(fragment);
      this._container.scrollTop = scrollTop;
      return {
        changedRoots,
        fullReplace: true,
      };
    }

    const changedRoots = [];
    blocks.forEach((block, index) => {
      const wrapper = wrappers[index];
      if (!wrapper) return;

      if (block.reuse === true) {
        const lineDelta = Number.isFinite(block.lineDelta) ? block.lineDelta : 0;
        if (lineDelta !== 0) {
          this._shiftSourceLineAttrsInNode(wrapper, lineDelta);
        }
        return;
      }

      wrapper.innerHTML = this._sanitize(block.html);
      const lineDelta = Number.isFinite(block.lineDelta) ? block.lineDelta : 0;
      if (lineDelta !== 0) {
        this._shiftSourceLineAttrsInNode(wrapper, lineDelta);
      }
      changedRoots.push(wrapper);
    });

    this._container.scrollTop = scrollTop;
    return {
      changedRoots,
      fullReplace: false,
    };
  }

  _shiftSourceLineAttrsInNode(root, lineDelta) {
    const apply = (el) => {
      const line = el.getAttribute('data-source-line');
      if (line != null) {
        const next = Number.parseInt(line, 10);
        if (Number.isFinite(next)) {
          el.setAttribute('data-source-line', String(next + lineDelta));
        }
      }

      const lineEnd = el.getAttribute('data-source-line-end');
      if (lineEnd != null) {
        const next = Number.parseInt(lineEnd, 10);
        if (Number.isFinite(next)) {
          el.setAttribute('data-source-line-end', String(next + lineDelta));
        }
      }
    };

    apply(root);
    root.querySelectorAll('[data-source-line], [data-source-line-end]').forEach(apply);
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

    if (event.target.closest('input[data-se-task-checkbox]')) return;

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
