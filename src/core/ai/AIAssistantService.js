/**
 * Lightweight orchestration layer for AI assistant requests.
 *
 * The service is provider-agnostic: any provider implementing
 * `isAvailable()` and `send(request, opts)` can be plugged in.
 */
export class AIAssistantService {
  /**
   * @param {object} opts
   * @param {{ isAvailable?: () => Promise<boolean>, send: (request: object, opts?: object) => Promise<object> }} opts.provider
   */
  constructor(opts = {}) {
    this.setProvider(opts.provider ?? null);
  }

  /**
   * @param {{ isAvailable?: () => Promise<boolean>, send: (request: object, opts?: object) => Promise<object> }|null} provider
   */
  setProvider(provider) {
    if (provider !== null && (typeof provider !== 'object' || typeof provider.send !== 'function')) {
      throw new Error('[AIAssistantService] Provider must expose send(request, opts).');
    }

    this._provider = provider;
  }

  /** @returns {object|null} */
  getProvider() {
    return this._provider;
  }

  /** @returns {Promise<boolean>} */
  async isAvailable() {
    if (!this._provider) return false;
    if (typeof this._provider.isAvailable !== 'function') return true;

    try {
      return await this._provider.isAvailable();
    } catch {
      return false;
    }
  }

  /**
   * @param {object} request
   * @param {'review-document'|'improve-selection'|'rewrite-selection'|'chat'} request.mode
   * @param {string} request.markdown
   * @param {{ from:number, to:number, text:string, lineFrom:number, lineTo:number }} request.selection
   * @param {string} [request.instruction]
   * @param {string} [request.language='pl']
   * @param {object} [opts]
   * @param {AbortSignal} [opts.signal]
   * @returns {Promise<{ text: string, suggestedMarkdown: string, mode: string }>} 
   */
  async execute(request, opts = {}) {
    if (!this._provider) {
      throw new Error('[AIAssistantService] AI provider is not configured.');
    }

    const normalized = _normalizeRequest(request);
    const rawResponse = await this._provider.send(normalized, { signal: opts.signal });

    const text = typeof rawResponse?.text === 'string'
      ? rawResponse.text.trim()
      : '';

    const suggestedMarkdown = typeof rawResponse?.suggestedMarkdown === 'string'
      ? rawResponse.suggestedMarkdown
      : '';

    return {
      mode: normalized.mode,
      text,
      suggestedMarkdown,
    };
  }
}

function _normalizeRequest(request) {
  const mode = _normalizeMode(request?.mode);

  return {
    mode,
    markdown: String(request?.markdown ?? ''),
    selection: {
      from: Number.isFinite(request?.selection?.from) ? request.selection.from : 0,
      to: Number.isFinite(request?.selection?.to) ? request.selection.to : 0,
      text: String(request?.selection?.text ?? ''),
      lineFrom: Number.isFinite(request?.selection?.lineFrom) ? request.selection.lineFrom : 0,
      lineTo: Number.isFinite(request?.selection?.lineTo) ? request.selection.lineTo : 0,
    },
    instruction: typeof request?.instruction === 'string' ? request.instruction.trim() : '',
    language: typeof request?.language === 'string' && request.language.trim()
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
