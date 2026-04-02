import { PromptRegistry } from './PromptRegistry.js';

const DEFAULT_BASE_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'qwen2.5:7b';

/**
 * Ollama provider for the editor AI assistant.
 */
export class OllamaAIProvider {
  /**
   * @param {object} [opts]
   * @param {string} [opts.baseUrl='http://localhost:11434']
   * @param {string} [opts.model='qwen2.5:7b']
   * @param {number} [opts.temperature=0.2]
   * @param {string} [opts.systemPrompt]
    * @param {import('./PromptRegistry.js').PromptRegistry} [opts.promptRegistry]
   */
  constructor(opts = {}) {
    this._baseUrl = _normalizeBaseUrl(opts.baseUrl ?? DEFAULT_BASE_URL);
    this._model = typeof opts.model === 'string' && opts.model.trim()
      ? opts.model.trim()
      : DEFAULT_MODEL;
    this._temperature = Number.isFinite(opts.temperature)
      ? Math.max(0, Math.min(2, opts.temperature))
      : 0.2;
    this._promptRegistry = opts.promptRegistry instanceof PromptRegistry
      ? opts.promptRegistry
      : new PromptRegistry({ systemPrompt: opts.systemPrompt });
  }

  /** @returns {Promise<boolean>} */
  async isAvailable() {
    const response = await fetch(`${this._baseUrl}/api/tags`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    return response.ok;
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
      stream: false,
      messages: promptPlan.messages,
      options: {
        temperature: this._temperature,
      },
    };

    if (wantsJson) payload.format = 'json';

    const response = await fetch(`${this._baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: opts.signal,
    });

    if (!response.ok) {
      const detail = await _safeText(response);
      throw new Error(`[OllamaAIProvider] Request failed (${response.status}): ${detail || response.statusText}`);
    }

    const data = await response.json();
    const content = String(data?.message?.content ?? '').trim();

    if (!wantsJson) {
      return {
        text: content,
        suggestedMarkdown: '',
      };
    }

    const parsed = _safeJson(content);
    if (!parsed || typeof parsed !== 'object') {
      return _fallbackStructured(promptPlan.mode, content);
    }

    return _normalizeStructured(promptPlan.mode, parsed, content);
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

function _normalizeBaseUrl(baseUrl) {
  const value = String(baseUrl ?? '').trim() || DEFAULT_BASE_URL;
  return value.endsWith('/') ? value.slice(0, -1) : value;
}
