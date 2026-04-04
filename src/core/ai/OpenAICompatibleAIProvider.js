import { PromptRegistry } from './PromptRegistry.js';

const DEFAULT_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4o';

/**
 * OpenAI-compatible AI provider for the editor AI assistant.
 *
 * Works with:
 * - OpenAI API (https://api.openai.com/v1/chat/completions)
 * - Compatible services (Azure OpenAI, Ollama OpenAI-compatible endpoints, etc.)
 *
 * @example
 * const provider = new OpenAICompatibleAIProvider({
 *   apiUrl: 'https://api.openai.com/v1/chat/completions',
 *   apiKey: 'sk-...',
 *   model: 'gpt-4o',
 * });
 */
export class OpenAICompatibleAIProvider {
  /**
   * @param {object} [opts]
   * @param {string} [opts.apiUrl='https://api.openai.com/v1/chat/completions']
   * @param {string} opts.apiKey API key for authentication (required)
   * @param {string} [opts.model='gpt-4o'] Model identifier
   * @param {number} [opts.temperature=0.2] Sampling temperature
   * @param {string} [opts.systemPrompt] Optional system prompt
   * @param {import('./PromptRegistry.js').PromptRegistry} [opts.promptRegistry]
   * @param {Record<string,string>} [opts.extraHeaders] Additional HTTP headers
   * @throws {Error} When apiKey is missing
   */
  constructor(opts = {}) {
    if (!opts.apiKey || typeof opts.apiKey !== 'string' || !opts.apiKey.trim()) {
      throw new Error('[OpenAICompatibleAIProvider] apiKey is required.');
    }

    this._apiUrl = _normalizeUrl(opts.apiUrl ?? DEFAULT_API_URL);
    this._apiKey = opts.apiKey.trim();
    this._model = typeof opts.model === 'string' && opts.model.trim()
      ? opts.model.trim()
      : DEFAULT_MODEL;
    this._temperature = Number.isFinite(opts.temperature)
      ? Math.max(0, Math.min(2, opts.temperature))
      : 0.2;
    this._extraHeaders = { ...(opts.extraHeaders ?? {}) };
    this._promptRegistry = opts.promptRegistry instanceof PromptRegistry
      ? opts.promptRegistry
      : new PromptRegistry({ systemPrompt: opts.systemPrompt });
  }

  /** @returns {Promise<boolean>} */
  async isAvailable() {
    try {
      const response = await fetch(this._apiUrl, {
        method: 'POST',
        headers: this._buildHeaders(),
        body: JSON.stringify({
          model: this._model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        }),
      });

      if (response.ok) return true;

      // Some endpoints return 401 for API key validation but are reachable
      if (response.status === 401) return true;

      return false;
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
   * @returns {Promise<{ text: string, suggestedMarkdown: string }>}
   */
  async send(request, opts = {}) {
    const promptPlan = this._promptRegistry.buildPromptPlan(request);
    const wantsJson = promptPlan.wantsJson === true;

    const payload = {
      model: this._model,
      messages: promptPlan.messages,
      temperature: this._temperature,
    };

    if (wantsJson) {
      payload.response_format = { type: 'json_object' };
    }

    const response = await fetch(this._apiUrl, {
      method: 'POST',
      headers: this._buildHeaders(),
      body: JSON.stringify(payload),
      signal: opts.signal,
    });

    if (!response.ok) {
      const detail = await _safeText(response);
      throw new Error(`[OpenAICompatibleAIProvider] Request failed (${response.status}): ${detail || response.statusText}`);
    }

    const data = await response.json();
    const content = String(data?.choices?.[0]?.message?.content ?? '').trim();

    if (!wantsJson) {
      return {
        text: content,
        suggestedMarkdown: '',
      };
    }

    const parsed = _safeJson(content);
    if (!parsed || typeof parsed !== 'object') {
      return _fallbackStructured(request.mode, content);
    }

    return _normalizeStructured(request.mode, parsed, content);
  }

  _buildHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this._apiKey}`,
      ...this._extraHeaders,
    };
  }
}

function _normalizeStructured(mode, parsed, rawContent) {
  const text = typeof parsed.text === 'string' && parsed.text.trim()
    ? parsed.text.trim()
    : rawContent;

  if (mode === 'review-document') {
    return {
      text,
      suggestedMarkdown: typeof parsed.suggestedMarkdown === 'string'
        ? parsed.suggestedMarkdown
        : '',
    };
  }

  const suggestedMarkdown = typeof parsed.suggestedMarkdown === 'string' && parsed.suggestedMarkdown.trim()
    ? parsed.suggestedMarkdown
    : '';

  return {
    text,
    suggestedMarkdown: suggestedMarkdown || rawContent,
  };
}

function _fallbackStructured(mode, content) {
  if (mode === 'review-document') {
    return { text: content, suggestedMarkdown: '' };
  }

  return {
    text: 'Model returned non-JSON output. Using raw text as suggestion.',
    suggestedMarkdown: content,
  };
}

function _normalizeUrl(url) {
  const value = String(url ?? '').trim() || DEFAULT_API_URL;
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function _safeJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function _safeText(response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}
