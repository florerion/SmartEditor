const DEFAULT_SYSTEM_PROMPT = 'You are a precise writing assistant for Markdown documents. Be concise and actionable.';

/**
 * Central registry for assistant prompt plans.
 *
 * A prompt plan consists of:
 * - `messages`: chat messages sent to the model
 * - `wantsJson`: whether response should be constrained to JSON
 */
export class PromptRegistry {
  /**
   * @param {object} [opts]
   * @param {string} [opts.systemPrompt]
   * @param {Record<string, object|Function>} [opts.modes]
   */
  constructor(opts = {}) {
    this._systemPrompt = _normalizeSystemPrompt(opts.systemPrompt);
    this._modes = new Map();

    Object.entries(_createDefaultModeDefinitions()).forEach(([mode, definition]) => {
      this.registerMode(mode, definition);
    });

    if (opts.modes && typeof opts.modes === 'object') {
      Object.entries(opts.modes).forEach(([mode, definition]) => {
        this.registerMode(mode, definition);
      });
    }
  }

  /**
   * @param {string} systemPrompt
   */
  setSystemPrompt(systemPrompt) {
    this._systemPrompt = _normalizeSystemPrompt(systemPrompt);
  }

  /** @returns {string} */
  getSystemPrompt() {
    return this._systemPrompt;
  }

  /**
   * Register or replace mode prompt behavior.
   *
   * `definition` can be:
   * - function(ctx) => string
   * - { wantsJson?: boolean, buildUserPrompt: (ctx) => string }
   *
   * @param {'review-document'|'improve-selection'|'rewrite-selection'|'chat'|string} mode
   * @param {object|Function} definition
   */
  registerMode(mode, definition) {
    const normalizedMode = _normalizeMode(mode);
    this._modes.set(normalizedMode, _resolveModeDefinition(definition, normalizedMode));
  }

  /**
   * @param {string} mode
   */
  unregisterMode(mode) {
    this._modes.delete(_normalizeMode(mode));
  }

  /**
   * @param {object} request
   * @param {'review-document'|'improve-selection'|'rewrite-selection'|'chat'} [request.mode]
   * @param {string} [request.markdown]
   * @param {{ text?: string }} [request.selection]
   * @param {string} [request.instruction]
   * @param {string} [request.language]
   * @returns {{ mode: string, wantsJson: boolean, messages: Array<{ role: string, content: string }> }}
   */
  buildPromptPlan(request = {}) {
    const normalized = _normalizeRequest(request);
    const modeDefinition = this._modes.get(normalized.mode) ?? this._modes.get('chat');

    const userPrompt = modeDefinition.buildUserPrompt({
      ...normalized,
      systemPrompt: this._systemPrompt,
    });

    return {
      mode: normalized.mode,
      wantsJson: modeDefinition.wantsJson === true,
      messages: [
        { role: 'system', content: this._systemPrompt },
        { role: 'user', content: String(userPrompt ?? '').trim() },
      ],
    };
  }
}

function _createDefaultModeDefinitions() {
  return {
    'review-document': {
      wantsJson: true,
      buildUserPrompt: (ctx) => `${_buildHeader(ctx)}\n\nReview the Markdown document for correctness, clarity and style.\nReturn strict JSON:\n{\n  "text": "short review in bullet points",\n  "suggestedMarkdown": "optional full improved markdown or empty string"\n}\n\nMarkdown:\n${ctx.markdown}`,
    },
    'improve-selection': {
      wantsJson: true,
      buildUserPrompt: (ctx) => `${_buildHeader(ctx)}\n\nImprove this Markdown selection while preserving meaning.\nReturn strict JSON:\n{\n  "text": "short explanation of changes",\n  "suggestedMarkdown": "improved selection only"\n}\n\nSelection:\n${ctx.selectionText}\n\nInstruction:\n${ctx.instruction || 'Improve style and fluency.'}`,
    },
    'rewrite-selection': {
      wantsJson: true,
      buildUserPrompt: (ctx) => `${_buildHeader(ctx)}\n\nRewrite this Markdown selection according to instruction.\nReturn strict JSON:\n{\n  "text": "short explanation of rewrite",\n  "suggestedMarkdown": "rewritten selection only"\n}\n\nSelection:\n${ctx.selectionText}\n\nInstruction:\n${ctx.instruction || 'Rewrite to be clearer and concise.'}`,
    },
    chat: {
      wantsJson: false,
      buildUserPrompt: (ctx) => `${_buildHeader(ctx)}\n\nUser instruction:\n${ctx.instruction || 'Help with this markdown.'}\n\nMarkdown context:\n${ctx.markdown}\n\nSelected fragment:\n${ctx.selectionText}`,
    },
  };
}

function _resolveModeDefinition(definition, mode) {
  if (typeof definition === 'function') {
    return {
      wantsJson: mode !== 'chat',
      buildUserPrompt: definition,
    };
  }

  if (!definition || typeof definition !== 'object' || typeof definition.buildUserPrompt !== 'function') {
    throw new Error(`[PromptRegistry] Invalid mode definition for "${mode}".`);
  }

  return {
    wantsJson: definition.wantsJson === true,
    buildUserPrompt: definition.buildUserPrompt,
  };
}

function _buildHeader(ctx) {
  return `Requested mode: ${ctx.mode}\nLanguage: ${ctx.language}`;
}

function _normalizeRequest(request) {
  return {
    mode: _normalizeMode(request.mode),
    markdown: String(request.markdown ?? ''),
    selectionText: String(request.selection?.text ?? ''),
    instruction: typeof request.instruction === 'string' ? request.instruction.trim() : '',
    language: typeof request.language === 'string' && request.language.trim()
      ? request.language.trim()
      : 'pl',
  };
}

function _normalizeMode(mode) {
  if (mode === 'review-document') return mode;
  if (mode === 'improve-selection') return mode;
  if (mode === 'rewrite-selection') return mode;
  if (mode === 'chat') return mode;
  return 'chat';
}

function _normalizeSystemPrompt(prompt) {
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return DEFAULT_SYSTEM_PROMPT;
  }

  return prompt.trim();
}
