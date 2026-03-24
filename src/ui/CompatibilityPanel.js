/**
 * Compatibility status and fix actions panel.
 */
export class CompatibilityPanel {
  /**
   * @param {HTMLElement} container
   * @param {object} opts
   * @param {(issueId: string) => Promise<void>|void} [opts.onFixIssue]
   * @param {() => Promise<void>|void} [opts.onFixAll]
   * @param {() => Promise<void>|void} [opts.onEnable]
   * @param {(issueId: string) => void} [opts.onJumpIssue]
   */
  constructor(container, opts = {}) {
    this._container = container;
    this._onFixIssue = opts.onFixIssue ?? (() => {});
    this._onFixAll = opts.onFixAll ?? (() => {});
    this._onEnable = opts.onEnable ?? (() => {});
    this._onJumpIssue = opts.onJumpIssue ?? (() => {});
    this._busy = false;

    this._container.classList.add('se-compatibility');
    this._boundClick = this._handleClick.bind(this);
    this._container.addEventListener('click', this._boundClick);
  }

  /**
   * @param {object} payload
   * @param {boolean} payload.enabled
   * @param {string} payload.status
   * @param {object} payload.summary
   * @param {object[]} payload.issues
   * @param {boolean} [payload.busy=false]
   */
  render(payload) {
    const enabled = payload?.enabled === true;
    const status = typeof payload?.status === 'string' ? payload.status : 'disabled';
    const summary = payload?.summary ?? { total: 0, errors: 0, warnings: 0, fixable: 0 };
    const issues = Array.isArray(payload?.issues) ? payload.issues : [];
    this._busy = payload?.busy === true;

    if (!enabled) {
      this._container.innerHTML = `
        <div class="se-compatibility__row">
          <span class="se-compatibility__badge se-compatibility__badge--disabled">Disabled</span>
          <p class="se-compatibility__summary">Publishing compatibility checks are disabled.</p>
          <button type="button" class="se-compatibility__btn" data-se-compat-enable ${this._busy ? 'disabled' : ''}>Enable</button>
        </div>
      `;
      return;
    }

    const fixableIssues = issues.filter((issue) => issue.fixable);
    const firstFixable = fixableIssues[0] ?? null;
    const issueItems = issues
      .map((issue) => {
        const line = Number.isInteger(issue.lineFrom) ? issue.lineFrom + 1 : null;
        const lineSuffix = line != null ? ` (line ${line})` : '';
        const fixButton = issue.fixable
          ? `<button type="button" class="se-compatibility__issue-fix" data-se-compat-fix-issue="${_escapeAttr(issue.id)}" ${this._busy ? 'disabled' : ''}>Fix</button>`
          : '';

        return `
          <li class="se-compatibility__issue">
            <button type="button" class="se-compatibility__issue-link" data-se-compat-jump-issue="${_escapeAttr(issue.id)}">
              <span class="se-compatibility__issue-main">
                <span class="se-compatibility__issue-code">${_escapeHtml(issue.code ?? 'issue')}</span>
                <span class="se-compatibility__issue-text">${_escapeHtml(issue.message ?? 'Compatibility issue')}${lineSuffix}</span>
              </span>
            </button>
            ${fixButton}
          </li>
        `;
      })
      .join('');

    this._container.innerHTML = `
      <div class="se-compatibility__row">
        <span class="se-compatibility__badge se-compatibility__badge--${_statusClass(status)}">${_statusLabel(status)}</span>
        <p class="se-compatibility__summary">
          Issues: ${summary.total ?? 0} | Errors: ${summary.errors ?? 0} | Warnings: ${summary.warnings ?? 0}
        </p>
        <div class="se-compatibility__actions">
          <button type="button" class="se-compatibility__btn" data-se-compat-fix-first ${(!firstFixable || this._busy) ? 'disabled' : ''}>Fix first</button>
          <button type="button" class="se-compatibility__btn" data-se-compat-fix-all ${(summary.fixable <= 0 || this._busy) ? 'disabled' : ''}>Fix all</button>
        </div>
      </div>
      <ul class="se-compatibility__issues">${issueItems || '<li class="se-compatibility__issue se-compatibility__issue--empty">No compatibility issues detected.</li>'}</ul>
    `;
  }

  destroy() {
    this._container.removeEventListener('click', this._boundClick);
    this._container.innerHTML = '';
  }

  _handleClick(event) {
    const enableBtn = event.target.closest('[data-se-compat-enable]');
    if (enableBtn && !this._busy) {
      this._onEnable();
      return;
    }

    const fixAll = event.target.closest('[data-se-compat-fix-all]');
    if (fixAll && !this._busy) {
      this._onFixAll();
      return;
    }

    const fixFirst = event.target.closest('[data-se-compat-fix-first]');
    if (fixFirst && !this._busy) {
      const issueBtn = this._container.querySelector('[data-se-compat-fix-issue]');
      if (!issueBtn) return;
      const issueId = issueBtn.getAttribute('data-se-compat-fix-issue');
      if (issueId) this._onFixIssue(issueId);
      return;
    }

    const issueFixBtn = event.target.closest('[data-se-compat-fix-issue]');
    if (issueFixBtn && !this._busy) {
      const issueId = issueFixBtn.getAttribute('data-se-compat-fix-issue');
      if (issueId) this._onFixIssue(issueId);
      return;
    }

    const issueJumpBtn = event.target.closest('[data-se-compat-jump-issue]');
    if (issueJumpBtn) {
      const issueId = issueJumpBtn.getAttribute('data-se-compat-jump-issue');
      if (issueId) this._onJumpIssue(issueId);
    }
  }
}

function _statusLabel(status) {
  if (status === 'valid') return 'Valid';
  if (status === 'warning') return 'Warning';
  if (status === 'invalid') return 'Invalid';
  return 'Disabled';
}

function _statusClass(status) {
  if (status === 'valid') return 'valid';
  if (status === 'warning') return 'warning';
  if (status === 'invalid') return 'invalid';
  return 'disabled';
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
