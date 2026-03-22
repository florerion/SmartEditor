/**
 * Simple accept/reject modal for chatbot-suggested markdown changes.
 * Shows old/new text side-by-side and resolves a Promise<boolean>.
 */
export class DiffModal {
  constructor() {
    this._overlay = null;
    this._resolver = null;
    this._boundKey = this._onKeydown.bind(this);
  }

  /**
   * Open modal.
   * @param {string} oldText
   * @param {string} newText
   * @param {object} [opts]
   * @param {string} [opts.title]
   * @param {string} [opts.oldLabel]
   * @param {string} [opts.newLabel]
   * @param {{ from:number, to:number, cursor?:boolean }} [opts.oldHighlight]
   * @param {{ from:number, to:number, cursor?:boolean }} [opts.newHighlight]
   * @returns {Promise<boolean>} true => accept, false => reject
   */
  open(oldText, newText, opts = {}) {
    this.close(false);

    const title = opts.title || 'Proposed Change';
    const oldLabel = opts.oldLabel || 'Current';
    const newLabel = opts.newLabel || 'Proposed';

    this._overlay = document.createElement('div');
    this._overlay.className = 'se-diff-overlay';
    this._overlay.innerHTML = `
      <div class="se-diff" role="dialog" aria-modal="true" aria-label="Proposed markdown change">
        <div class="se-diff__header">
          <h3 class="se-diff__title"></h3>
          <button type="button" class="se-diff__icon-btn" data-se-diff-cancel aria-label="Close">×</button>
        </div>
        <div class="se-diff__body">
          <div class="se-diff__col">
            <h4 class="se-diff__col-title"></h4>
            <pre class="se-diff__pre se-diff__pre--old"></pre>
          </div>
          <div class="se-diff__col">
            <h4 class="se-diff__col-title"></h4>
            <pre class="se-diff__pre se-diff__pre--new"></pre>
          </div>
        </div>
        <div class="se-diff__footer">
          <button type="button" class="se-diff__btn se-diff__btn--cancel" data-se-diff-cancel>Reject</button>
          <button type="button" class="se-diff__btn se-diff__btn--ok" data-se-diff-accept>Apply</button>
        </div>
      </div>
    `;

    this._overlay.querySelector('.se-diff__title').textContent = title;

    const titles = this._overlay.querySelectorAll('.se-diff__col-title');
    if (titles[0]) titles[0].textContent = oldLabel;
    if (titles[1]) titles[1].textContent = newLabel;

    const oldPre = this._overlay.querySelector('.se-diff__pre--old');
    const newPre = this._overlay.querySelector('.se-diff__pre--new');
    _renderHighlightedText(oldPre, oldText, opts.oldHighlight, 'se-diff__hl--old');
    _renderHighlightedText(newPre, newText, opts.newHighlight, 'se-diff__hl--new');

    this._overlay.addEventListener('click', (e) => {
      if (e.target === this._overlay) this.close(false);
      if (e.target.closest('[data-se-diff-cancel]')) this.close(false);
      if (e.target.closest('[data-se-diff-accept]')) this.close(true);
    });

    document.body.appendChild(this._overlay);
    document.addEventListener('keydown', this._boundKey);

    return new Promise(resolve => {
      this._resolver = resolve;
    });
  }

  /**
   * Close modal and resolve pending promise.
   * @param {boolean} accepted
   */
  close(accepted) {
    if (this._overlay) {
      this._overlay.remove();
      this._overlay = null;
      document.removeEventListener('keydown', this._boundKey);
    }

    if (this._resolver) {
      const resolve = this._resolver;
      this._resolver = null;
      resolve(accepted);
    }
  }

  destroy() {
    this.close(false);
  }

  _onKeydown(e) {
    if (e.key === 'Escape') this.close(false);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'enter') this.close(true);
  }
}

function _renderHighlightedText(container, text, highlight, className) {
  if (!container) return;

  const rawText = String(text ?? '');
  if (!highlight || typeof highlight.from !== 'number' || typeof highlight.to !== 'number') {
    container.innerHTML = _escapeHtml(rawText);
    return;
  }

  const len = rawText.length;
  const from = Math.max(0, Math.min(highlight.from, len));
  const to = Math.max(from, Math.min(highlight.to, len));

  if (from === to) {
    const marker = `<span class="se-diff__cursor" aria-hidden="true"></span>`;
    container.innerHTML = `${_escapeHtml(rawText.slice(0, from))}${marker}${_escapeHtml(rawText.slice(to))}`;
    return;
  }

  container.innerHTML = `${_escapeHtml(rawText.slice(0, from))}<span class="se-diff__hl ${className}">${_escapeHtml(rawText.slice(from, to))}</span>${_escapeHtml(rawText.slice(to))}`;
}

function _escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
