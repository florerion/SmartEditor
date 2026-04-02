import { afterEach, describe, expect, it, vi } from 'vitest';
import { PromptRegistry } from '../../../../src/core/ai/PromptRegistry.js';
import { TokenAuthAIProvider } from '../../../../src/core/ai/TokenAuthAIProvider.js';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('TokenAuthAIProvider', () => {
  it('fetches token before send and injects Authorization header', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token-1', expires_in: 120 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ text: 'ok', suggestedMarkdown: '' }),
      });

    vi.stubGlobal('fetch', fetchMock);

    const provider = new TokenAuthAIProvider({
      tokenUrl: 'https://auth.example.com/token',
      sendUrl: 'https://api.example.com/chat',
      tokenBody: { client_id: 'demo' },
      model: 'demo-model',
    });

    const result = await provider.send({
      mode: 'chat',
      markdown: '# Demo',
      selection: { from: 0, to: 0, text: '', lineFrom: 0, lineTo: 0 },
      instruction: 'Say hi',
      language: 'pl',
    });

    expect(result.text).toBe('ok');

    const sendCall = fetchMock.mock.calls[1];
    expect(sendCall[0]).toBe('https://api.example.com/chat');
    expect(sendCall[1].headers.Authorization).toBe('Bearer token-1');
  });

  it('reuses cached token while still valid', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token-1', expires_in: 300 }),
      })
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ text: 'ok', suggestedMarkdown: '' }),
      });

    vi.stubGlobal('fetch', fetchMock);

    const provider = new TokenAuthAIProvider({
      tokenUrl: 'https://auth.example.com/token',
      sendUrl: 'https://api.example.com/chat',
      tokenBody: { client_id: 'demo' },
      model: 'demo-model',
      refreshSkewMs: 10_000,
    });

    const request = {
      mode: 'chat',
      markdown: '',
      selection: { from: 0, to: 0, text: '', lineFrom: 0, lineTo: 0 },
      instruction: 'hello',
      language: 'pl',
    };

    await provider.send(request);
    await provider.send(request);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toContain('/token');
    expect(fetchMock.mock.calls[1][0]).toContain('/chat');
    expect(fetchMock.mock.calls[2][0]).toContain('/chat');
  });

  it('refreshes token when close to expiry before send', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token-1', expires_in: 20 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ text: 'ok-1', suggestedMarkdown: '' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token-2', expires_in: 120 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ text: 'ok-2', suggestedMarkdown: '' }),
      });

    vi.stubGlobal('fetch', fetchMock);

    const provider = new TokenAuthAIProvider({
      tokenUrl: 'https://auth.example.com/token',
      sendUrl: 'https://api.example.com/chat',
      tokenBody: { client_id: 'demo' },
      model: 'demo-model',
      refreshSkewMs: 15_000,
    });

    const request = {
      mode: 'chat',
      markdown: '',
      selection: { from: 0, to: 0, text: '', lineFrom: 0, lineTo: 0 },
      instruction: 'hello',
      language: 'pl',
    };

    await provider.send(request);

    vi.advanceTimersByTime(6_000);
    await provider.send(request);

    expect(fetchMock).toHaveBeenCalledTimes(4);

    const firstSendHeaders = fetchMock.mock.calls[1][1].headers;
    const secondSendHeaders = fetchMock.mock.calls[3][1].headers;
    expect(firstSendHeaders.Authorization).toBe('Bearer token-1');
    expect(secondSendHeaders.Authorization).toBe('Bearer token-2');
  });

  it('uses PromptRegistry plan for default payload messages', async () => {
    const registry = new PromptRegistry();
    registry.registerMode('chat', {
      wantsJson: false,
      buildUserPrompt: () => 'CUSTOM REGISTRY PROMPT',
    });

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token-1', expires_in: 120 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ text: 'ok', suggestedMarkdown: '' }),
      });

    vi.stubGlobal('fetch', fetchMock);

    const provider = new TokenAuthAIProvider({
      tokenUrl: 'https://auth.example.com/token',
      sendUrl: 'https://api.example.com/chat',
      tokenBody: { client_id: 'demo' },
      promptRegistry: registry,
    });

    await provider.send({
      mode: 'chat',
      markdown: '',
      selection: { from: 0, to: 0, text: '', lineFrom: 0, lineTo: 0 },
      instruction: 'ignored',
      language: 'pl',
    });

    const sendCall = fetchMock.mock.calls[1];
    const body = JSON.parse(sendCall[1].body);
    expect(body.messages[1].content).toContain('CUSTOM REGISTRY PROMPT');
  });
});
