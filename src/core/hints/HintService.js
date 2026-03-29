/**
 * Hint selection service based on active context tags.
 */
export class HintService {
  /**
   * @param {import('./HintRegistry.js').HintRegistry} registry
   * @param {object} [config]
   */
  constructor(registry, config = {}) {
    this._registry = registry;
    this._config = _resolveHintConfig(config);
    this._listeners = new Set();
    this._contextTags = [];
    this._contextTimer = null;
    this._lastHintId = '';
  }

  /**
   * @param {(payload: object) => void} listener
   * @returns {() => void}
   */
  onChange(listener) {
    if (typeof listener !== 'function') return () => {};
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  /**
   * @param {object} patch
   */
  setConfig(patch = {}) {
    this._config = _resolveHintConfig({ ...this._config, ...patch });
  }

  /**
   * Track persistent context (e.g. current cursor/selection area).
   * @param {string[]} tags
   * @param {object} [meta]
   */
  setContext(tags, meta = {}) {
    this._contextTags = _normalizeTags(tags);
    if (meta.immediate === true || this._config.debounceMs === 0) {
      this._flushResolve({ ...meta, tags: this._contextTags });
      return;
    }

    clearTimeout(this._contextTimer);
    this._contextTimer = setTimeout(() => {
      this._contextTimer = null;
      this._flushResolve({ ...meta, tags: this._contextTags });
    }, this._config.debounceMs);
  }

  /**
   * Resolve and emit hint for a one-off trigger (toolbar, keyboard).
   * @param {string[]} tags
   * @param {object} [meta]
   */
  trigger(tags, meta = {}) {
    const triggerTags = _normalizeTags(tags);
    const finalTags = triggerTags.length ? triggerTags : this._contextTags;
    this._flushResolve({ ...meta, tags: finalTags });
  }

  /**
   * Hide currently visible hint.
   * @param {string} [reason='dismiss']
   */
  dismiss(reason = 'dismiss') {
    this._emit({ type: 'clear', reason });
  }

  destroy() {
    clearTimeout(this._contextTimer);
    this._contextTimer = null;
    this._listeners.clear();
  }

  _flushResolve(meta = {}) {
    if (this._config.enabled !== true) {
      this._emit({ type: 'clear', reason: 'disabled' });
      return;
    }

    const tags = _normalizeTags(meta.tags);
    const allHints = this._registry.getAll();
    const matches = _matchHints(allHints, tags);
    const hint = this._pickHint(matches, allHints);

    if (!hint) {
      this._emit({ type: 'clear', reason: 'no-match-none', tags });
      return;
    }

    this._lastHintId = hint.id;
    this._emit({
      type: 'show',
      hint,
      tags,
      source: typeof meta.source === 'string' ? meta.source : 'unknown',
      reason: matches.length ? 'match' : 'fallback-random',
    });
  }

  _pickHint(matches, allHints) {
    if (matches.length) {
      if (this._config.matchSelection === 'first') {
        return matches[0].hint;
      }
      return _pickRandom(matches.map((entry) => entry.hint), this._lastHintId);
    }

    if (this._config.noMatchFallback === 'none') return null;
    return _pickRandom(allHints, this._lastHintId);
  }

  _emit(payload) {
    this._listeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (error) {
        console.warn('[HintService] Listener failed:', error);
      }
    });
  }
}

function _resolveHintConfig(config) {
  return {
    enabled: config.enabled !== false,
    matchSelection: config.matchSelection === 'first' ? 'first' : 'random',
    noMatchFallback: config.noMatchFallback === 'none' ? 'none' : 'random',
    debounceMs: Number.isFinite(config.debounceMs) ? Math.max(0, config.debounceMs) : 800,
  };
}

function _matchHints(hints, tags) {
  if (!tags.length) return [];
  const tagSet = new Set(tags);

  return hints
    .map((hint) => {
      const matchedCount = hint.contexts.reduce((count, contextTag) => (
        count + (tagSet.has(contextTag) ? 1 : 0)
      ), 0);
      return { hint, matchedCount };
    })
    .filter((entry) => entry.matchedCount > 0)
    .sort((a, b) => {
      if (b.matchedCount !== a.matchedCount) return b.matchedCount - a.matchedCount;
      if (b.hint.priority !== a.hint.priority) return b.hint.priority - a.hint.priority;
      return a.hint.id.localeCompare(b.hint.id);
    });
}

function _pickRandom(items, lastHintId) {
  if (!Array.isArray(items) || !items.length) return null;
  if (items.length === 1) return items[0];

  const candidates = items.filter((hint) => hint.id !== lastHintId);
  const pool = candidates.length ? candidates : items;
  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0] ?? null;
}

function _normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return [...new Set(
    tags
      .filter((entry) => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter(Boolean),
  )];
}
