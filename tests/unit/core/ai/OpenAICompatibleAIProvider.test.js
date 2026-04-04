import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAICompatibleAIProvider } from '../../../../src/core/ai/OpenAICompatibleAIProvider.js';

describe('OpenAICompatibleAIProvider', () => {
  let provider;

  beforeEach(() => {
    provider = new OpenAICompatibleAIProvider({
      apiKey: 'test-api-key',
      model: 'gpt-4o',
      temperature: 0.5,
    });
  });

  it('should throw when apiKey is missing', () => {
    expect(() => {
      new OpenAICompatibleAIProvider({ apiKey: '' });
    }).toThrow('[OpenAICompatibleAIProvider] apiKey is required.');
  });

  it('should initialize with custom URL', () => {
    const customProvider = new OpenAICompatibleAIProvider({
      apiKey: 'key',
      apiUrl: 'https://custom.api.com/chat',
    });
    expect(customProvider._apiUrl).toBe('https://custom.api.com/chat');
  });

  it('should normalize URL by removing trailing slash', () => {
    const customProvider = new OpenAICompatibleAIProvider({
      apiKey: 'key',
      apiUrl: 'https://custom.api.com/chat/',
    });
    expect(customProvider._apiUrl).toBe('https://custom.api.com/chat');
  });

  it('should build correct headers with Bearer token', () => {
    const headers = provider._buildHeaders();
    expect(headers['Authorization']).toBe('Bearer test-api-key');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('should include extra headers', () => {
    const customProvider = new OpenAICompatibleAIProvider({
      apiKey: 'key',
      extraHeaders: {
        'X-Custom-Header': 'custom-value',
      },
    });
    const headers = customProvider._buildHeaders();
    expect(headers['X-Custom-Header']).toBe('custom-value');
  });

  it('should normalize temperature to be within 0-2 range', () => {
    const coldProvider = new OpenAICompatibleAIProvider({
      apiKey: 'key',
      temperature: -5,
    });
    expect(coldProvider._temperature).toBe(0);

    const hotProvider = new OpenAICompatibleAIProvider({
      apiKey: 'key',
      temperature: 5,
    });
    expect(hotProvider._temperature).toBe(2);
  });

  it('should use default model when not specified', () => {
    const defaultProvider = new OpenAICompatibleAIProvider({
      apiKey: 'key',
    });
    expect(defaultProvider._model).toBe('gpt-4o');
  });

  it('should use default temperature of 0.2', () => {
    const defaultProvider = new OpenAICompatibleAIProvider({
      apiKey: 'key',
    });
    expect(defaultProvider._temperature).toBe(0.2);
  });

  // Mock-based send test
  it('should send request with correct payload structure', async () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Test response' } }],
      }),
    });

    const response = await provider.send({
      mode: 'chat',
      markdown: '# Test',
      selection: { text: 'Test' },
    });

    expect(response.text).toBe('Test response');
    expect(mockFetch).toHaveBeenCalled();

    const callArgs = mockFetch.mock.calls[0];
    const payload = JSON.parse(callArgs[1].body);

    expect(payload.model).toBe('gpt-4o');
    expect(payload.temperature).toBe(0.5);
    expect(Array.isArray(payload.messages)).toBe(true);
  });

  it('should handle JSON response format', async () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: '{"text":"Summary","suggestedMarkdown":"# Improved"}',
            },
          },
        ],
      }),
    });

    const response = await provider.send({
      mode: 'improve-selection',
      markdown: '# Test',
      selection: { text: 'Test' },
    });

    expect(response.text).toBe('Summary');
    expect(response.suggestedMarkdown).toBe('# Improved');
  });

  it('should handle API errors gracefully', async () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });

    await expect(
      provider.send({
        mode: 'chat',
        markdown: '# Test',
        selection: { text: 'Test' },
      })
    ).rejects.toThrow('[OpenAICompatibleAIProvider] Request failed (401)');
  });
});
