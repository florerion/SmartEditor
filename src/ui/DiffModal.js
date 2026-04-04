/**
 * Simple accept/reject modal for chatbot-suggested markdown changes.
 * Shows old/new text side-by-side and resolves a Promise<boolean>.
 */
export class DiffModal {
  constructor() {
    this._overlay = null;
    this._resolver = null;
    this._oldPre = null;
    this._newPre = null;
    this._scrollSyncLocked = false;
    this._initialScrollFrame = 0;
    this._boundKey = this._onKeydown.bind(this);
    this._boundOldScroll = () => this._syncScroll(this._oldPre, this._newPre);
    this._boundNewScroll = () => this._syncScroll(this._newPre, this._oldPre);
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
    const oldRender = _renderHighlightedText(oldPre, oldText, opts.oldHighlight, 'se-diff__hl--old');
    const newRender = _renderHighlightedText(newPre, newText, opts.newHighlight, 'se-diff__hl--new');
    this._oldPre = oldPre;
    this._newPre = newPre;

    this._attachScrollSync();

    this._overlay.addEventListener('click', (e) => {
      if (e.target === this._overlay) this.close(false);
      if (e.target.closest('[data-se-diff-cancel]')) this.close(false);
      if (e.target.closest('[data-se-diff-accept]')) this.close(true);
    });

    document.body.appendChild(this._overlay);
    document.addEventListener('keydown', this._boundKey);
    this._scheduleInitialScroll(oldRender.anchor, newRender.anchor);

    return new Promise(resolve => {
      this._resolver = resolve;
    });
  }

  /**
   * Close modal and resolve pending promise.
   * @param {boolean} accepted
   */
  close(accepted) {
    this._cancelInitialScroll();
    this._detachScrollSync();
    if (this._overlay) {
      this._overlay.remove();
      this._overlay = null;
      document.removeEventListener('keydown', this._boundKey);
    }

    this._oldPre = null;
    this._newPre = null;

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

  _attachScrollSync() {
    if (!this._oldPre || !this._newPre) return;
    this._oldPre.addEventListener('scroll', this._boundOldScroll, { passive: true });
    this._newPre.addEventListener('scroll', this._boundNewScroll, { passive: true });
  }

  _detachScrollSync() {
    this._oldPre?.removeEventListener('scroll', this._boundOldScroll);
    this._newPre?.removeEventListener('scroll', this._boundNewScroll);
  }

  _syncScroll(source, target) {
    if (!source || !target || this._scrollSyncLocked) return;

    this._scrollSyncLocked = true;
    try {
      _syncScrollAxis(source, target, 'Top', 'Height', 'clientHeight');
      _syncScrollAxis(source, target, 'Left', 'Width', 'clientWidth');
    } finally {
      this._scrollSyncLocked = false;
    }
  }

  _scheduleInitialScroll(oldAnchor, newAnchor) {
    this._cancelInitialScroll();
    const run = () => {
      this._initialScrollFrame = 0;
      this._scrollPanelsToFirstChange(oldAnchor, newAnchor);
    };

    if (typeof requestAnimationFrame === 'function') {
      this._initialScrollFrame = requestAnimationFrame(run);
      return;
    }

    run();
  }

  _cancelInitialScroll() {
    if (this._initialScrollFrame && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this._initialScrollFrame);
    }
    this._initialScrollFrame = 0;
  }

  _scrollPanelsToFirstChange(oldAnchor, newAnchor) {
    const didScrollOld = _centerAnchorInContainer(this._oldPre, oldAnchor);
    const didScrollNew = _centerAnchorInContainer(this._newPre, newAnchor);

    if (didScrollOld && !didScrollNew) {
      this._syncScroll(this._oldPre, this._newPre);
    } else if (didScrollNew && !didScrollOld) {
      this._syncScroll(this._newPre, this._oldPre);
    }
  }
}

function _renderHighlightedText(container, text, highlight, className) {
  if (!container) return { anchor: null };

  const rawText = String(text ?? '');
  if (!highlight || typeof highlight.from !== 'number' || typeof highlight.to !== 'number') {
    container.innerHTML = _escapeHtml(rawText);
    return { anchor: null };
  }

  const len = rawText.length;
  const from = Math.max(0, Math.min(highlight.from, len));
  const to = Math.max(from, Math.min(highlight.to, len));
  const anchor = '<span class="se-diff__anchor" aria-hidden="true"></span>';

  if (from === to) {
    const marker = `<span class="se-diff__cursor" aria-hidden="true"></span>`;
    container.innerHTML = `${_escapeHtml(rawText.slice(0, from))}${anchor}${marker}${_escapeHtml(rawText.slice(to))}`;
    return { anchor: container.querySelector('.se-diff__anchor') };
  }

  container.innerHTML = `${_escapeHtml(rawText.slice(0, from))}${anchor}<span class="se-diff__hl ${className}">${_escapeHtml(rawText.slice(from, to))}</span>${_escapeHtml(rawText.slice(to))}`;
  return { anchor: container.querySelector('.se-diff__anchor') };
}

function _centerAnchorInContainer(container, anchor) {
  if (!container || !anchor) return false;

  const viewport = container.clientHeight || 0;
  const scrollMax = Math.max(0, (container.scrollHeight || 0) - viewport);
  const anchorHeight = anchor.offsetHeight || 1;
  const nextTop = Math.max(
    0,
    Math.min(scrollMax, (anchor.offsetTop || 0) - (viewport / 2) + (anchorHeight / 2)),
  );

  container.scrollTop = nextTop;
  return true;
}

function _syncScrollAxis(source, target, axis, dimension, clientDimension) {
  const sourceMax = Math.max(0, (source[`scroll${dimension}`] || 0) - (source[clientDimension] || 0));
  const targetMax = Math.max(0, (target[`scroll${dimension}`] || 0) - (target[clientDimension] || 0));
  const ratio = sourceMax > 0 ? source[`scroll${axis}`] / sourceMax : 0;
  target[`scroll${axis}`] = targetMax > 0 ? ratio * targetMax : 0;
}

function _escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
