import { PromptRegistry } from './PromptRegistry.js';

const DEFAULT_REFRESH_SKEW_MS = 30_000;
const DEFAULT_TOKEN_LIFETIME_MS = 5 * 60_000;

/**
 * Generic token-authenticated AI provider.
 *
 * Flow:
 * 1. Fetch access token from a dedicated endpoint.
 * 2. Cache token with expiry metadata.
 * 3. Before every send, refresh when token is expired or close to expiry.
 *
 * @example
 * const provider = new TokenAuthAIProvider({
 *   tokenUrl: 'https://auth.example.com/token',
 *   sendUrl: 'https://api.example.com/v1/chat/completions',
 *   tokenBody: { client_id: 'demo', client_secret: 'secret' },
 *   model: 'example-model',
 * });
 */
export class TokenAuthAIProvider {
  /**
   * @param {object} opts
   * @param {string} opts.tokenUrl Token endpoint URL
   * @param {string} opts.sendUrl Inference endpoint URL
   * @param {string} [opts.tokenMethod='POST'] HTTP method for token request
   * @param {Record<string,string>} [opts.tokenHeaders] Extra headers for token request
   * @param {object|string|URLSearchParams|FormData} [opts.tokenBody] Token request body
   * @param {string} [opts.tokenField='access_token'] JSON path key for token value
   * @param {string} [opts.expiresInField='expires_in'] JSON path key for token ttl (seconds)
   * @param {string} [opts.expiresAtField='expires_at'] JSON path key for absolute token expiry
   * @param {number} [opts.refreshSkewMs=30000] Refresh threshold before real expiry
   * @param {string} [opts.authHeaderName='Authorization'] Header name used for access token
   * @param {string} [opts.authScheme='Bearer'] Auth scheme prefix; empty string means raw token
   * @param {string} [opts.sendMethod='POST'] HTTP method for inference request
   * @param {Record<string,string>} [opts.sendHeaders] Extra headers for inference request
   * @param {string} [opts.model='generic-model'] Model identifier in default payload builder
   * @param {number} [opts.temperature=0.2] Sampling temperature in default payload builder
   * @param {string} [opts.systemPrompt] Optional system prompt used by default payload builder
  * @param {import('./PromptRegistry.js').PromptRegistry} [opts.promptRegistry]
   * @param {(request: object, ctx: object) => object} [opts.buildSendPayload] Custom payload builder
   * @param {(data: object, request: object) => { text: string, suggestedMarkdown: string }} [opts.parseSendResponse] Custom response parser
   * @param {(data: object, ctx: object) => { token: string, expiresAtMs: number }} [opts.parseTokenResponse] Custom token parser
   * @throws {Error} When required URLs are missing
   */
  constructor(opts = {}) {
    this._tokenUrl = _requireUrl(opts.tokenUrl, 'tokenUrl');
    this._sendUrl = _requireUrl(opts.sendUrl, 'sendUrl');

    this._tokenMethod = _normalizeMethod(opts.tokenMethod ?? 'POST');
    this._tokenHeaders = { ...(opts.tokenHeaders ?? {}) };
    this._tokenBody = opts.tokenBody ?? null;
    this._tokenField = _normalizeFieldName(opts.tokenField, 'access_token');
    this._expiresInField = _normalizeFieldName(opts.expiresInField, 'expires_in');
    this._expiresAtField = _normalizeFieldName(opts.expiresAtField, 'expires_at');
    this._refreshSkewMs = Number.isFinite(opts.refreshSkewMs)
      ? Math.max(0, opts.refreshSkewMs)
      : DEFAULT_REFRESH_SKEW_MS;

    this._authHeaderName = _normalizeFieldName(opts.authHeaderName, 'Authorization');
    this._authScheme = typeof opts.authScheme === 'string' ? opts.authScheme.trim() : 'Bearer';

    this._sendMethod = _normalizeMethod(opts.sendMethod ?? 'POST');
    this._sendHeaders = {
      Accept: 'application/json',
      ...(opts.sendHeaders ?? {}),
    };

    this._model = typeof opts.model === 'string' && opts.model.trim()
      ? opts.model.trim()
      : 'generic-model';
    this._temperature = Number.isFinite(opts.temperature)
      ? Math.max(0, Math.min(2, opts.temperature))
      : 0.2;
    this._promptRegistry = opts.promptRegistry instanceof PromptRegistry
      ? opts.promptRegistry
      : new PromptRegistry({ systemPrompt: opts.systemPrompt });

    this._buildSendPayload = typeof opts.buildSendPayload === 'function'
      ? opts.buildSendPayload
      : _defaultBuildSendPayload;
    this._parseSendResponse = typeof opts.parseSendResponse === 'function'
      ? opts.parseSendResponse
      : _defaultParseSendResponse;
    this._parseTokenResponse = typeof opts.parseTokenResponse === 'function'
      ? opts.parseTokenResponse
      : (data, ctx) => _defaultParseTokenResponse(data, ctx, {
        tokenField: this._tokenField,
        expiresInField: this._expiresInField,
        expiresAtField: this._expiresAtField,
      });

    this._accessToken = '';
    this._tokenExpiresAtMs = 0;
  }

  /** @returns {Promise<boolean>} */
  async isAvailable() {
    try {
      await this._ensureFreshToken();
      return true;
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
    const token = await this._ensureFreshToken({ signal: opts.signal });
    const payload = this._buildSendPayload(request, {
      model: this._model,
      temperature: this._temperature,
      systemPrompt: this._promptRegistry.getSystemPrompt(),
      promptPlan,
    });

    const response = await this._sendWithToken(token, payload, opts.signal);

    if (response.status === 401 || response.status === 403) {
      // Token could have been revoked on server side; refresh once and retry.
      await this._refreshToken({ signal: opts.signal });
      const retried = await this._sendWithToken(this._accessToken, payload, opts.signal);
      return this._readSendResponse(retried, request);
    }

    return this._readSendResponse(response, request);
  }

  async _sendWithToken(token, payload, signal) {
    const headers = {
      ...this._sendHeaders,
      ..._jsonHeaderIfNeeded(payload),
      [this._authHeaderName]: _formatAuthHeaderValue(this._authScheme, token),
    };

    return fetch(this._sendUrl, {
      method: this._sendMethod,
      headers,
      body: _serializeRequestBody(payload),
      signal,
    });
  }

  async _readSendResponse(response, request) {
    if (!response.ok) {
      const detail = await _safeText(response);
      throw new Error(`[TokenAuthAIProvider] Request failed (${response.status}): ${detail || response.statusText}`);
    }

    const data = await response.json();
    return this._parseSendResponse(data, request);
  }

  async _ensureFreshToken(opts = {}) {
    if (this._hasFreshToken()) return this._accessToken;
    await this._refreshToken(opts);
    return this._accessToken;
  }

  _hasFreshToken(nowMs = Date.now()) {
    if (!this._accessToken) return false;
    return nowMs + this._refreshSkewMs < this._tokenExpiresAtMs;
  }

  async _refreshToken(opts = {}) {
    const tokenRequestPayload = _serializeTokenBody(this._tokenBody, this._tokenHeaders);

    const response = await fetch(this._tokenUrl, {
      method: this._tokenMethod,
      headers: {
        Accept: 'application/json',
        ...this._tokenHeaders,
        ...tokenRequestPayload.extraHeaders,
      },
      body: tokenRequestPayload.body,
      signal: opts.signal,
    });

    if (!response.ok) {
      const detail = await _safeText(response);
      throw new Error(`[TokenAuthAIProvider] Token request failed (${response.status}): ${detail || response.statusText}`);
    }

    const data = await response.json();
    const parsed = this._parseTokenResponse(data, {
      nowMs: Date.now(),
      defaultLifetimeMs: DEFAULT_TOKEN_LIFETIME_MS,
    });

    if (!parsed || typeof parsed.token !== 'string' || !parsed.token.trim()) {
      throw new Error('[TokenAuthAIProvider] Token parser returned an empty token.');
    }

    if (!Number.isFinite(parsed.expiresAtMs) || parsed.expiresAtMs <= Date.now()) {
      throw new Error('[TokenAuthAIProvider] Token parser returned invalid expiry timestamp.');
    }

    this._accessToken = parsed.token.trim();
    this._tokenExpiresAtMs = parsed.expiresAtMs;
  }
}

function _defaultBuildSendPayload(request, ctx) {
  const wantsJson = ctx.promptPlan?.wantsJson === true;
  const payload = {
    model: ctx.model,
    messages: ctx.promptPlan?.messages ?? [],
    temperature: ctx.temperature,
  };

  if (wantsJson) {
    payload.response_format = { type: 'json_object' };
  }

  return payload;
}

function _defaultParseSendResponse(data, request) {
  if (typeof data?.text === 'string') {
    return {
      text: data.text.trim(),
      suggestedMarkdown: typeof data?.suggestedMarkdown === 'string' ? data.suggestedMarkdown : '',
    };
  }

  const content = _extractContentString(data).trim();
  if (request.mode === 'chat') {
    return {
      text: content,
      suggestedMarkdown: '',
    };
  }

  const parsed = _safeJson(content);
  if (!parsed || typeof parsed !== 'object') {
    return {
      text: 'Model returned non-JSON output. Using raw text as suggestion.',
      suggestedMarkdown: content,
    };
  }

  const text = typeof parsed.text === 'string' && parsed.text.trim()
    ? parsed.text.trim()
    : content;

  if (request.mode === 'review-document') {
    return {
      text,
      suggestedMarkdown: typeof parsed.suggestedMarkdown === 'string'
        ? parsed.suggestedMarkdown
        : '',
    };
  }

  return {
    text,
    suggestedMarkdown: typeof parsed.suggestedMarkdown === 'string' && parsed.suggestedMarkdown.trim()
      ? parsed.suggestedMarkdown
      : content,
  };
}

function _defaultParseTokenResponse(data, ctx, fields) {
  const token = _readByKey(data, fields.tokenField);
  const expiresAtRaw = _readByKey(data, fields.expiresAtField);
  const expiresInRaw = _readByKey(data, fields.expiresInField);

  const expiresAtMs = _resolveExpiryTimestamp(expiresAtRaw, expiresInRaw, ctx.nowMs, ctx.defaultLifetimeMs);
  return {
    token: typeof token === 'string' ? token : String(token ?? ''),
    expiresAtMs,
  };
}

function _resolveExpiryTimestamp(expiresAtRaw, expiresInRaw, nowMs, defaultLifetimeMs) {
  if (Number.isFinite(expiresAtRaw)) {
    if (expiresAtRaw > 1e12) return Number(expiresAtRaw);
    if (expiresAtRaw > 1e9) return Number(expiresAtRaw * 1000);
  }

  if (typeof expiresAtRaw === 'string' && expiresAtRaw.trim()) {
    const asNumber = Number(expiresAtRaw);
    if (Number.isFinite(asNumber)) return _resolveExpiryTimestamp(asNumber, null, nowMs, defaultLifetimeMs);

    const asDate = Date.parse(expiresAtRaw);
    if (!Number.isNaN(asDate)) return asDate;
  }

  const seconds = Number(expiresInRaw);
  if (Number.isFinite(seconds) && seconds > 0) {
    return nowMs + (seconds * 1000);
  }

  return nowMs + defaultLifetimeMs;
}

function _extractContentString(data) {
  if (typeof data?.message?.content === 'string') return data.message.content;
  if (typeof data?.choices?.[0]?.message?.content === 'string') return data.choices[0].message.content;
  if (typeof data?.output_text === 'string') return data.output_text;
  return '';
}

function _serializeTokenBody(body, headers) {
  if (body == null) return { body: undefined, extraHeaders: {} };
  if (typeof body === 'string' || body instanceof URLSearchParams || body instanceof FormData) {
    return { body, extraHeaders: {} };
  }

  if (typeof body === 'object') {
    const hasContentType = Object.keys(headers ?? {}).some((key) => key.toLowerCase() === 'content-type');
    return {
      body: JSON.stringify(body),
      extraHeaders: hasContentType ? {} : { 'Content-Type': 'application/json' },
    };
  }

  return { body: String(body), extraHeaders: {} };
}

function _serializeRequestBody(payload) {
  if (payload == null) return undefined;
  if (typeof payload === 'string' || payload instanceof URLSearchParams || payload instanceof FormData) {
    return payload;
  }
  return JSON.stringify(payload);
}

function _jsonHeaderIfNeeded(payload) {
  if (payload == null || typeof payload === 'string' || payload instanceof URLSearchParams || payload instanceof FormData) {
    return {};
  }
  return { 'Content-Type': 'application/json' };
}

function _formatAuthHeaderValue(scheme, token) {
  if (!scheme) return token;
  return `${scheme} ${token}`;
}

function _requireUrl(value, fieldName) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`[TokenAuthAIProvider] Missing required ${fieldName}.`);
  }
  return value.trim();
}

function _normalizeMethod(value) {
  if (typeof value !== 'string' || !value.trim()) return 'POST';
  return value.trim().toUpperCase();
}

function _normalizeFieldName(value, fallback) {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  return value.trim();
}

function _readByKey(obj, key) {
  if (!obj || typeof obj !== 'object') return undefined;
  return obj[key];
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
