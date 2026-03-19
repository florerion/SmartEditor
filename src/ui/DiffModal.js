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
   * @returns {Promise<boolean>} true => accept, false => reject
   */
  open(oldText, newText) {
    this.close(false);

    this._overlay = document.createElement('div');
    this._overlay.className = 'mde-diff-overlay';
    this._overlay.innerHTML = `
      <div class="mde-diff" role="dialog" aria-modal="true" aria-label="Proposed markdown change">
        <div class="mde-diff__header">
          <h3 class="mde-diff__title">Proposed Change</h3>
          <button type="button" class="mde-diff__icon-btn" data-mde-diff-cancel aria-label="Close">×</button>
        </div>
        <div class="mde-diff__body">
          <div class="mde-diff__col">
            <h4 class="mde-diff__col-title">Current</h4>
            <pre class="mde-diff__pre mde-diff__pre--old"></pre>
          </div>
          <div class="mde-diff__col">
            <h4 class="mde-diff__col-title">Proposed</h4>
            <pre class="mde-diff__pre mde-diff__pre--new"></pre>
          </div>
        </div>
        <div class="mde-diff__footer">
          <button type="button" class="mde-diff__btn mde-diff__btn--cancel" data-mde-diff-cancel>Reject</button>
          <button type="button" class="mde-diff__btn mde-diff__btn--ok" data-mde-diff-accept>Apply</button>
        </div>
      </div>
    `;

    this._overlay.querySelector('.mde-diff__pre--old').textContent = oldText;
    this._overlay.querySelector('.mde-diff__pre--new').textContent = newText;

    this._overlay.addEventListener('click', (e) => {
      if (e.target === this._overlay) this.close(false);
      if (e.target.closest('[data-mde-diff-cancel]')) this.close(false);
      if (e.target.closest('[data-mde-diff-accept]')) this.close(true);
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
