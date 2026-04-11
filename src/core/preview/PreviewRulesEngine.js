/**
 * Preview rules engine executes user-provided transformations in two phases:
 * - markdown (before markdown-it render)
 * - html (after markdown-it render, before preview panel sanitization)
 */
export class PreviewRulesEngine {
  /**
   * @param {object} [opts]
   * @param {boolean} [opts.enabled=true]
   * @param {object} [opts.policy]
   * @param {Function} [opts.includeResolver]
   * @param {Function} [opts.onRuleError]
   * @param {Function} [opts.onRulesChanged]
   */
  constructor(opts = {}) {
    this._rulesById = new Map();
    this._enabled = opts.enabled !== false;
    this._policy = _normalizePolicy(opts.policy);
    this._includeResolver = typeof opts.includeResolver === 'function' ? opts.includeResolver : null;
    this._onRuleError = typeof opts.onRuleError === 'function' ? opts.onRuleError : null;
    this._onRulesChanged = typeof opts.onRulesChanged === 'function' ? opts.onRulesChanged : null;

    this._metrics = {
      totalRuns: 0,
      totalDurationMs: 0,
      byRule: {},
      lastRun: null,
    };
  }

  /** @returns {boolean} */
  isEnabled() {
    return this._enabled;
  }

  /**
   * @param {boolean} enabled
   * @returns {boolean}
   */
  setEnabled(enabled) {
    this._enabled = enabled !== false;
    this._emitRulesChanged({ type: 'engine-enabled', enabled: this._enabled });
    return this._enabled;
  }

  /** @returns {object} */
  getPolicy() {
    return _clone(this._policy);
  }

  /**
   * @param {object} patch
   * @returns {object}
   */
  updatePolicy(patch = {}) {
    this._policy = _normalizePolicy({ ...this._policy, ...patch });
    this._emitRulesChanged({ type: 'policy-updated', policy: this.getPolicy() });
    return this.getPolicy();
  }

  /**
   * @param {Function|null} resolver
   */
  setIncludeResolver(resolver) {
    this._includeResolver = typeof resolver === 'function' ? resolver : null;
    this._emitRulesChanged({ type: 'include-resolver-updated', hasResolver: Boolean(this._includeResolver) });
  }

  /**
   * @param {Function|null} handler
   */
  setRuleErrorHandler(handler) {
    this._onRuleError = typeof handler === 'function' ? handler : null;
  }

  /** @returns {Array<object>} */
  getAll() {
    return this._orderedRules().map((rule) => this._toPublicRule(rule));
  }

  /**
   * @param {string} id
   * @returns {object|null}
   */
  getById(id) {
    const rule = this._rulesById.get(id);
    return rule ? this._toPublicRule(rule) : null;
  }

  /**
   * @param {'markdown'|'html'} phase
   * @returns {boolean}
   */
  hasEnabledRules(phase) {
    return this._orderedRules().some((rule) => rule.phase === phase && rule.enabled === true);
  }

  /**
   * @param {'markdown'|'html'} phase
   * @returns {boolean}
   */
  hasAsyncRules(phase) {
    return this._orderedRules().some((rule) => rule.phase === phase && rule.enabled === true && rule.async === true);
  }

  /**
   * @param {object} rule
   */
  register(rule) {
    const normalized = _normalizeRule(rule);
    if (this._rulesById.has(normalized.id)) {
      throw new Error(`[PreviewRulesEngine] Duplicate rule id: ${normalized.id}`);
    }
    this._rulesById.set(normalized.id, normalized);
    this._emitRulesChanged({ type: 'registered', id: normalized.id, phase: normalized.phase });
  }

  /**
   * @param {Array<object>} rules
   */
  registerMany(rules) {
    const list = Array.isArray(rules) ? rules : [];
    list.forEach((rule) => this.register(rule));
  }

  /**
   * @param {string} id
   * @returns {boolean}
   */
  unregister(id) {
    const rule = this._rulesById.get(id);
    if (!rule) return false;

    this._rulesById.delete(id);
    try {
      rule.dispose?.();
    } catch (error) {
      this._emitRuleError(error, {
        id: rule.id,
        phase: rule.phase,
        stage: 'dispose',
      });
    }

    this._emitRulesChanged({ type: 'unregistered', id: rule.id, phase: rule.phase });
    return true;
  }

  /**
   * @param {'markdown'|'html'} [phase]
   */
  clear(phase) {
    const targets = this._orderedRules().filter((rule) => (phase ? rule.phase === phase : true));
    targets.forEach((rule) => this.unregister(rule.id));
    this._emitRulesChanged({ type: 'cleared', phase: phase ?? 'all' });
  }

  /**
   * @param {string} id
   * @param {boolean} enabled
   * @returns {boolean}
   */
  setEnabledById(id, enabled) {
    const rule = this._rulesById.get(id);
    if (!rule) return false;
    rule.enabled = enabled !== false;
    this._emitRulesChanged({ type: 'toggled', id: rule.id, enabled: rule.enabled });
    return true;
  }

  /**
   * @param {string} id
   * @returns {boolean}
   */
  enable(id) {
    return this.setEnabledById(id, true);
  }

  /**
   * @param {string} id
   * @returns {boolean}
   */
  disable(id) {
    return this.setEnabledById(id, false);
  }

  /**
   * @param {string} id
   * @param {object} patch
   * @returns {boolean}
   */
  updateConfig(id, patch = {}) {
    const rule = this._rulesById.get(id);
    if (!rule) return false;
    rule.config = { ...rule.config, ...patch };
    this._emitRulesChanged({ type: 'updated', id: rule.id });
    return true;
  }

  /**
   * @param {{ markdown?: object[], html?: object[] }} input
   */
  replaceAll(input = {}) {
    this.clear();
    this.registerMany(input.markdown ?? []);
    this.registerMany(input.html ?? []);
    this._emitRulesChanged({ type: 'replaced-all' });
  }

  /**
   * Execute one phase synchronously. Any async rule result is treated as failure and skipped.
   *
   * @param {'markdown'|'html'} phase
   * @param {string} input
   * @param {object} context
   * @returns {{ content: string, records: object[], touched: boolean }}
   */
  executePhaseSync(phase, input, context) {
    if (!this._enabled) {
      return { content: String(input ?? ''), records: [], touched: false };
    }

    const phaseRules = this._orderedRules().filter((rule) => rule.phase === phase && rule.enabled === true);
    if (!phaseRules.length) {
      return { content: String(input ?? ''), records: [], touched: false };
    }

    let content = String(input ?? '');
    const records = [];
    let haltPipeline = false;

    for (const rule of phaseRules) {
      const startedAt = Date.now();
      const snapshotBefore = content;
      const ruleContext = this._buildRuleContext(context, phase, rule);

      try {
        const matched = this._runSyncMatch(rule, content, ruleContext);
        if (!matched) {
          records.push(_createSkippedRecord(rule, startedAt));
          continue;
        }

        const output = this._runSyncTransform(rule, content, ruleContext);
        const normalized = _normalizeRuleOutput(output, content);
        content = normalized.content;

        const durationMs = Date.now() - startedAt;
        const touched = normalized.meta?.touched === true || content !== snapshotBefore;
        const record = {
          id: rule.id,
          phase: rule.phase,
          status: 'ok',
          durationMs,
          touched,
          notes: Array.isArray(normalized.meta?.notes) ? [...normalized.meta.notes] : [],
        };
        records.push(record);
        this._recordMetric(record);
      } catch (error) {
        const handled = this._handleExecutionError(error, rule, phase, context, Date.now() - startedAt, records);
        if (handled.stop) {
          haltPipeline = handled.failMode === 'stop-pipeline';
          break;
        }
      }
    }

    return {
      content,
      records,
      touched: records.some((record) => record.touched === true),
      haltPipeline,
    };
  }

  /**
   * Execute one phase asynchronously.
   *
   * @param {'markdown'|'html'} phase
   * @param {string} input
   * @param {object} context
   * @returns {Promise<{ content: string, records: object[], touched: boolean }>}
   */
  async executePhaseAsync(phase, input, context) {
    if (!this._enabled) {
      return { content: String(input ?? ''), records: [], touched: false };
    }

    const phaseRules = this._orderedRules().filter((rule) => rule.phase === phase && rule.enabled === true);
    if (!phaseRules.length) {
      return { content: String(input ?? ''), records: [], touched: false };
    }

    let content = String(input ?? '');
    const records = [];
    let haltPipeline = false;

    for (const rule of phaseRules) {
      if (context.signal?.aborted) {
        break;
      }

      const startedAt = Date.now();
      const snapshotBefore = content;
      const ruleContext = this._buildRuleContext(context, phase, rule);

      try {
        const matched = await this._runAsyncMatch(rule, content, ruleContext);
        if (!matched) {
          records.push(_createSkippedRecord(rule, startedAt));
          continue;
        }

        const output = await this._runAsyncTransform(rule, content, ruleContext);
        const normalized = _normalizeRuleOutput(output, content);
        content = normalized.content;

        const durationMs = Date.now() - startedAt;
        const touched = normalized.meta?.touched === true || content !== snapshotBefore;
        const record = {
          id: rule.id,
          phase: rule.phase,
          status: 'ok',
          durationMs,
          touched,
          notes: Array.isArray(normalized.meta?.notes) ? [...normalized.meta.notes] : [],
        };
        records.push(record);
        this._recordMetric(record);
      } catch (error) {
        const handled = this._handleExecutionError(error, rule, phase, context, Date.now() - startedAt, records);
        if (handled.stop) {
          haltPipeline = handled.failMode === 'stop-pipeline';
          break;
        }
      }
    }

    return {
      content,
      records,
      touched: records.some((record) => record.touched === true),
      haltPipeline,
    };
  }

  /** @returns {object} */
  getMetrics() {
    return _clone(this._metrics);
  }

  /** Clean up registered rules. */
  destroy() {
    this.clear();
  }

  _orderedRules() {
    return [...this._rulesById.values()]
      .sort((a, b) => {
        if (a.phase !== b.phase) return a.phase.localeCompare(b.phase);
        if (a.order !== b.order) return a.order - b.order;
        return a.id.localeCompare(b.id);
      });
  }

  _toPublicRule(rule) {
    return {
      id: rule.id,
      phase: rule.phase,
      order: rule.order,
      enabled: rule.enabled,
      async: rule.async,
      config: _clone(rule.config),
    };
  }

  _buildRuleContext(context, phase, rule) {
    const base = context ?? {};
    return {
      editorId: base.editorId ?? 'editor',
      renderVersion: base.renderVersion ?? 0,
      signal: base.signal ?? null,
      phase,
      now: Date.now(),
      doc: {
        markdown: String(base.markdown ?? ''),
        selection: base.selection ?? { from: 0, to: 0 },
      },
      config: _clone(rule.config),
      services: {
        includeResolver: this._includeResolver,
        logger: base.logger ?? null,
        cache: base.cache ?? null,
      },
      policy: this.getPolicy(),
    };
  }

  _runSyncMatch(rule, content, context) {
    if (typeof rule.match !== 'function') return true;
    const result = rule.match(content, context);
    if (_isPromiseLike(result)) {
      throw new Error(`[PreviewRulesEngine] Rule "${rule.id}" has async match in sync phase.`);
    }
    return result !== false;
  }

  _runSyncTransform(rule, content, context) {
    const output = rule.run(content, context);
    if (_isPromiseLike(output)) {
      throw new Error(`[PreviewRulesEngine] Rule "${rule.id}" has async run in sync phase.`);
    }
    return output;
  }

  async _runAsyncMatch(rule, content, context) {
    if (typeof rule.match !== 'function') return true;
    const result = rule.match(content, context);
    return (await result) !== false;
  }

  async _runAsyncTransform(rule, content, context) {
    const timeoutMs = this._policy?.runtime?.ruleTimeoutMs ?? 1200;
    const maybePromise = rule.run(content, context);
    if (!_isPromiseLike(maybePromise)) {
      return maybePromise;
    }

    const timeout = Number.isFinite(timeoutMs) && timeoutMs > 0
      ? _withTimeout(maybePromise, timeoutMs, `Rule "${rule.id}" timed out after ${timeoutMs} ms.`)
      : maybePromise;

    return timeout;
  }

  _handleExecutionError(error, rule, phase, context, durationMs, records) {
    const failMode = this._policy?.runtime?.failMode ?? 'continue';
    const record = {
      id: rule.id,
      phase,
      status: 'error',
      durationMs,
      touched: false,
      error: error instanceof Error ? error.message : String(error),
    };
    records.push(record);
    this._recordMetric(record);
    this._emitRuleError(error, {
      id: rule.id,
      phase,
      renderVersion: context?.renderVersion ?? 0,
      stage: 'run',
    });

    if (failMode === 'stop-phase' || failMode === 'stop-pipeline') {
      return { stop: true, failMode };
    }
    return { stop: false, failMode };
  }

  _recordMetric(record) {
    this._metrics.totalRuns += 1;
    this._metrics.totalDurationMs += record.durationMs;

    if (!this._metrics.byRule[record.id]) {
      this._metrics.byRule[record.id] = {
        runs: 0,
        errors: 0,
        touchedRuns: 0,
        totalDurationMs: 0,
      };
    }

    const metric = this._metrics.byRule[record.id];
    metric.runs += 1;
    metric.totalDurationMs += record.durationMs;
    if (record.status === 'error') metric.errors += 1;
    if (record.touched === true) metric.touchedRuns += 1;
    this._metrics.lastRun = {
      id: record.id,
      phase: record.phase,
      status: record.status,
      durationMs: record.durationMs,
      touched: record.touched === true,
      at: Date.now(),
    };
  }

  _emitRuleError(error, context) {
    this._onRuleError?.(error, context);
  }

  _emitRulesChanged(detail) {
    this._onRulesChanged?.(detail);
  }
}

function _normalizeRule(rule) {
  if (!rule || typeof rule !== 'object') {
    throw new Error('[PreviewRulesEngine] Rule must be an object.');
  }

  if (typeof rule.id !== 'string' || !rule.id.trim()) {
    throw new Error('[PreviewRulesEngine] Rule id must be a non-empty string.');
  }

  if (!VALID_PHASES.has(rule.phase)) {
    throw new Error(`[PreviewRulesEngine] Unsupported rule phase: ${rule.phase}`);
  }

  if (typeof rule.run !== 'function') {
    throw new Error(`[PreviewRulesEngine] Rule "${rule.id}" must define run(input, ctx).`);
  }

  const normalizedOrder = Number.isFinite(rule.order)
    ? Number(rule.order)
    : 100;

  const inferredAsync = rule.run?.constructor?.name === 'AsyncFunction'
    || rule.match?.constructor?.name === 'AsyncFunction';

  return {
    id: rule.id.trim(),
    phase: rule.phase,
    order: normalizedOrder,
    enabled: rule.enabled !== false,
    async: rule.async === true || inferredAsync,
    match: typeof rule.match === 'function' ? rule.match : null,
    run: rule.run,
    dispose: typeof rule.dispose === 'function' ? rule.dispose : null,
    config: _clone(rule.config ?? {}),
  };
}

function _normalizeRuleOutput(output, fallbackInput) {
  if (typeof output === 'string') {
    return {
      content: output,
      meta: { touched: output !== fallbackInput },
    };
  }

  if (!output || typeof output !== 'object') {
    return {
      content: String(fallbackInput ?? ''),
      meta: { touched: false },
    };
  }

  return {
    content: typeof output.content === 'string'
      ? output.content
      : String(fallbackInput ?? ''),
    meta: output.meta ?? {},
  };
}

function _createSkippedRecord(rule, startedAt) {
  return {
    id: rule.id,
    phase: rule.phase,
    status: 'skipped',
    durationMs: Date.now() - startedAt,
    touched: false,
  };
}

function _normalizePolicy(policy = {}) {
  const runtime = policy.runtime ?? {};
  const failMode = VALID_FAIL_MODES.has(runtime.failMode)
    ? runtime.failMode
    : 'continue';

  const ruleTimeoutMs = Number.isFinite(runtime.ruleTimeoutMs)
    ? Math.max(0, runtime.ruleTimeoutMs)
    : 1200;

  const include = policy.include ?? {};
  const maxDepth = Number.isFinite(include.maxDepth)
    ? Math.max(0, include.maxDepth)
    : 5;

  const allowPaths = Array.isArray(include.allowPaths)
    ? include.allowPaths.filter((entry) => typeof entry === 'string' && entry.trim())
    : [];

  return {
    include: {
      maxDepth,
      allowPaths,
      denyOutsideWorkspace: include.denyOutsideWorkspace !== false,
    },
    runtime: {
      ruleTimeoutMs,
      failMode,
    },
  };
}

function _withTimeout(promise, timeoutMs, message) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    Promise.resolve(promise)
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

function _isPromiseLike(value) {
  return Boolean(value) && typeof value.then === 'function';
}

function _clone(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => _clone(entry));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const out = {};
  Object.entries(value).forEach(([key, entry]) => {
    out[key] = _clone(entry);
  });
  return out;
}

const VALID_PHASES = new Set(['markdown', 'html']);
const VALID_FAIL_MODES = new Set(['continue', 'stop-phase', 'stop-pipeline']);
