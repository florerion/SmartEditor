import { createEleventyCompatibilityProfile } from './CompatibilityProfiles.js';
import { TableCompatibilityRule } from './rules/TableCompatibilityRule.js';

/**
 * Validates markdown against a publishing compatibility profile.
 */
export class CompatibilityService {
  /**
   * @param {object} [opts]
   * @param {{ id: string, label: string, render: (markdown: string) => { html: string, tokens?: object[] } }} [opts.profile]
   * @param {Array<{ id?: string, validate: (markdown: string) => { issues: object[] }, buildDocumentFix?: (markdown: string) => { changed: boolean, nextMarkdown: string, changes: object[] } }>} [opts.rules]
   */
  constructor(opts = {}) {
    this._profile = opts.profile ?? createEleventyCompatibilityProfile();
    this._rules = Array.isArray(opts.rules) && opts.rules.length
      ? opts.rules
      : [new TableCompatibilityRule()];
  }

  /**
   * @param {string} markdown
   * @returns {object}
   */
  validate(markdown) {
    const source = String(markdown ?? '');
    const rendered = this._safeRender(source);
    const issues = [];

    this._rules.forEach((rule, idx) => {
      const result = rule.validate(source) ?? { issues: [] };
      const ruleIssues = Array.isArray(result.issues) ? result.issues : [];

      ruleIssues.forEach((issue, issueIdx) => {
        issues.push({
          ...issue,
          id: issue.id ?? `${rule.id ?? `rule-${idx + 1}`}-${issueIdx + 1}`,
        });
      });
    });

    const summary = {
      total: issues.length,
      errors: issues.filter((issue) => issue.severity === 'error').length,
      warnings: issues.filter((issue) => issue.severity === 'warning').length,
      fixable: issues.filter((issue) => issue.fixable).length,
    };

    const status = summary.errors > 0
      ? 'invalid'
      : summary.warnings > 0
        ? 'warning'
        : 'valid';

    return {
      profileId: this._profile.id,
      profileLabel: this._profile.label,
      generatedAt: Date.now(),
      status,
      summary,
      issues,
      previewHtml: rendered.html,
      renderError: rendered.error,
    };
  }

  /**
   * @param {string} markdown
   * @returns {object|null}
   */
  buildBatchFix(markdown) {
    const source = String(markdown ?? '');
    let nextMarkdown = source;
    let changed = false;
    let changeCount = 0;

    this._rules.forEach((rule) => {
      if (typeof rule.buildDocumentFix !== 'function') return;
      const result = rule.buildDocumentFix(nextMarkdown);
      if (!result?.changed) return;
      nextMarkdown = result.nextMarkdown;
      changed = true;
      changeCount += Array.isArray(result.changes) ? result.changes.length : 1;
    });

    if (!changed) return null;

    return {
      id: 'fix-compatibility-batch',
      label: 'Fix all compatible issues',
      description: 'Normalizes detected markdown compatibility issues.',
      nextMarkdown,
      highlightOld: { from: 0, to: source.length },
      highlightNew: { from: 0, to: nextMarkdown.length },
      changeCount,
    };
  }

  /**
   * @param {{ id: string, label: string, render: (markdown: string) => { html: string, tokens?: object[] } }} profile
   */
  setProfile(profile) {
    if (!profile || typeof profile.render !== 'function') {
      throw new Error('[CompatibilityService] setProfile requires a profile with render(markdown).');
    }
    this._profile = profile;
  }

  /**
   * @returns {{ id: string, label: string, render: (markdown: string) => { html: string, tokens?: object[] } }}
   */
  getProfile() {
    return this._profile;
  }

  _safeRender(markdown) {
    try {
      return { html: this._profile.render(markdown).html ?? '', error: null };
    } catch (error) {
      return {
        html: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
